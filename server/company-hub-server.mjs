#!/usr/bin/env node
/**
 * Company Hub —— 企业协作插件的自托管服务器。
 *
 * 这是你自己的服务器：数据全部保存在本机目录里，不依赖任何第三方服务。
 * 启动：
 *   node company-hub-server.mjs --port 8477 --data ./company-hub-data
 * 局域网 / 公网：
 *   node company-hub-server.mjs --port 8477 --host 0.0.0.0 --data D:\company-hub-data
 *
 * HTTP 协议（全部 JSON，除文件下载）：
 *   GET  /health
 *   POST /api/companies                         {companyName, employeeName} -> 创建公司与管理员账号
 *   POST /api/auth/login                        {companyId, employeeName, accessCode} -> 登录
 *   GET  /api/me
 *   GET  /api/state                             公司、成员、通讯录、群组、任务、工作区清单
 *   POST /api/employees                         {name, role} -> 创建员工账号（返回一次性访问码）
 *   GET  /api/directory?q=
 *   POST /api/contacts                          {employeeId}
 *   DELETE /api/contacts?employeeId=
 *   POST /api/groups                            {name, memberIds[]} -> AI 成员自动加入
 *   GET  /api/groups/:id/messages?since=&limit=
 *   POST /api/groups/:id/messages               {text, task?}
 *   POST /api/groups/:id/read                    {seq}
 *   GET  /api/tasks?status=
 *   POST /api/tasks/:id/claim
 *   POST /api/tasks/:id/complete                {note?}
 *
 * 认证：Authorization: Bearer <token>。令牌由登录返回，存在服务器数据里。
 * 说明：访问码用于演示/内网协作，是轻量账号体系，不是企业级身份认证。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const VERSION = '1.0.0';
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT = 4000;

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const out = { port: 8477, host: '127.0.0.1', data: path.resolve('company-hub-data') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === '--port' && value) out.port = Number(value);
    else if (arg === '--host' && value) out.host = value;
    else if (arg === '--data' && value) out.data = path.resolve(value);
    else if (arg === '--help' || arg === '-h') {
      console.log('用法: node company-hub-server.mjs [--port 8477] [--host 127.0.0.1] [--data ./company-hub-data]');
      process.exit(0);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const DATA_DIR = args.data;
const DB_PATH = path.join(DATA_DIR, 'db.json');
const GIT_ROOT = path.resolve(process.env.COMPANY_GIT_ROOT || path.join(DATA_DIR, 'git'));

// ---------------------------------------------------------------- utilities

const now = () => Date.now();
const ONLINE_WINDOW_MS = 90_000;
const employeeOnline = (employee) => Boolean(employee?.lastSeenAt && now() - employee.lastSeenAt < ONLINE_WINDOW_MS);
const randomId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
const randomToken = () => crypto.randomBytes(24).toString('hex');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ACCESS_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const newAccessCode = () => {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += ACCESS_ALPHABET[crypto.randomInt(ACCESS_ALPHABET.length)];
  return code;
};
const hashAccessCode = (employeeId, code) => sha256(`company-hub:${employeeId}:${code}`);
const newDeviceSecret = () => crypto.randomBytes(24).toString('hex');
const hashDeviceSecret = (employeeId, secret) => sha256(`company-hub:dev:${employeeId}:${secret}`);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (message) => new HttpError(400, message);
const forbidden = (message) => new HttpError(403, message);
const notFound = (message) => new HttpError(404, message);

function str(value, label, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') throw bad(`${label} 必须是字符串`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw bad(`${label} 长度需在 ${min}-${max} 个字符之间`);
  return text;
}

function cleanFileName(name) {
  const text = String(name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 60);
  return text || 'group';
}

function safeRelative(input) {
  const text = String(input || '').replace(/\\/g, '/');
  if (!text || text.length > 400) throw bad('文件路径无效');
  if (/^[a-zA-Z]:/.test(text) || text.startsWith('/')) throw bad('文件路径必须是相对路径');
  const parts = text.split('/');
  for (const part of parts) {
    if (!part || part === '.' || part === '..') throw bad('文件路径无效');
  }
  return parts.join('/');
}

// ---------------------------------------------------------------- database

function emptyDb() {
  return {
    version: 1,
    companies: [],
    employees: [],
    sessions: [],
    contacts: [],
    groups: [],
    messages: [],
    tasks: [],
    reads: [],
    aiJobs: [],
  };
}

class Database {
  constructor(file) {
    this.file = file;
    this.data = emptyDb();
    this.writeChain = Promise.resolve();
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { ...emptyDb(), ...parsed };
      for (const key of Object.keys(emptyDb())) {
        if (!Array.isArray(this.data[key])) this.data[key] = [];
      }    } catch (error) {
      if (error.code !== 'ENOENT') console.warn(`[company-hub] 数据库读取失败，将以空库启动：${error.message}`);
      this.data = emptyDb();
    }
  }

  /** Persist after every mutation; writes are serialized and atomic. */
  save() {
    this.writeChain = this.writeChain.then(async () => {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(temp, JSON.stringify(this.data, null, 2), 'utf8');
      await fs.promises.rename(temp, this.file);
    });
    this.writeChain.catch((error) => console.error('[company-hub] 数据保存失败', error));
    return this.writeChain;
  }

  company(id) {
    return this.data.companies.find((entry) => entry.id === id);
  }

  employee(id) {
    return this.data.employees.find((entry) => entry.id === id);
  }

  companyEmployees(companyId) {
    return this.data.employees.filter((entry) => entry.companyId === companyId);
  }

  group(id) {
    return this.data.groups.find((entry) => entry.id === id);
  }

  companyGroups(companyId) {
    return this.data.groups.filter((entry) => entry.companyId === companyId);
  }

  aiMember(companyId) {
    return this.companyEmployees(companyId).find((entry) => entry.isAi);
  }

  session(token) {
    const found = this.data.sessions.find((entry) => entry.token === token);
    return found;
  }

  issueSession(employeeId) {
    const token = randomToken();
    this.data.sessions = this.data.sessions.filter((entry) => entry.employeeId !== employeeId || entry.token === token);
    this.data.sessions.push({ token, employeeId, createdAt: now() });
    // Keep the newest 20 devices per employee.
    const mine = this.data.sessions.filter((entry) => entry.employeeId === employeeId);
    if (mine.length > 20) {
      const drop = new Set(mine.sort((a, b) => a.createdAt - b.createdAt).slice(0, mine.length - 20).map((e) => e.token));
      this.data.sessions = this.data.sessions.filter((entry) => !drop.has(entry.token));
    }
    return token;
  }

  readMark(employeeId, groupId) {
    return this.data.reads.find((entry) => entry.employeeId === employeeId && entry.groupId === groupId)?.seq ?? 0;
  }

  setRead(employeeId, groupId, seq) {
    const found = this.data.reads.find((entry) => entry.employeeId === employeeId && entry.groupId === groupId);
    if (found) found.seq = Math.max(found.seq, seq);
    else this.data.reads.push({ employeeId, groupId, seq });
  }

  groupMessages(groupId) {
    return this.data.messages.filter((entry) => entry.groupId === groupId).sort((a, b) => a.seq - b.seq);
  }
}

const db = new Database(DB_PATH);

// ---------------------------------------------------------------- domain helpers

function publicEmployee(entry) {
  return {
    id: entry.id,
    name: entry.name,
    role: entry.role,
    isAi: Boolean(entry.isAi),
    companyId: entry.companyId,
    linked: Boolean(entry.externalId),
    createdAt: entry.createdAt,
  };
}

function publicCompany(entry) {
  return { id: entry.id, name: entry.name, createdAt: entry.createdAt };
}

function memberName(id) {
  const entry = db.employee(id);
  return entry ? entry.name : '未知成员';
}

function messageView(message) {
  const author = db.employee(message.authorId);
  return {
    id: message.id,
    groupId: message.groupId,
    seq: message.seq,
    text: message.text,
    authorId: message.authorId,
    authorName: author?.name ?? '未知成员',
    authorIsAi: Boolean(author?.isAi),
    kind: message.kind,
    taskId: message.taskId ?? null,
    createdAt: message.createdAt,
  };
}

const CHAT_QUEUES = new Map();

function chatAiConfig() {
  return {
    apiKey: String(process.env.DEEPSEEK_API_KEY || ''),
    baseUrl: String(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: String(process.env.DEEPSEEK_MODEL || 'deepseek-flash'),
  };
}

function scheduleChatReply(company, group, trigger) {
  const config = chatAiConfig();
  if (!config.apiKey) {
    postSystemMessage(company, group, '服务端 AI 未配置 DEEPSEEK_API_KEY，暂时无法回复；代码任务仍可勾选任务发送到本机执行。');
    return;
  }
  const previous = CHAT_QUEUES.get(group.id) ?? Promise.resolve();
  const next = previous
    .then(() => replyInChat(company, group, trigger, config))
    .catch((error) => console.error('[company-hub] 群聊 AI 回复失败', error))
    .finally(() => {
      if (CHAT_QUEUES.get(group.id) === next) CHAT_QUEUES.delete(group.id);
    });
  CHAT_QUEUES.set(group.id, next);
}

function postSystemMessage(company, group, text) {
  if (!db.group(group.id)) return;
  db.data.messages.push({
    id: randomId('msg'),
    companyId: company.id,
    groupId: group.id,
    seq: ++group.seq,
    text,
    authorId: db.aiMember(company.id)?.id ?? company.id,
    kind: 'system',
    createdAt: now(),
  });
  db.save().catch((error) => console.error('[company-hub] 系统消息保存失败', error));
}

async function replyInChat(company, group, trigger, config) {
  if (!db.group(group.id)) return;
  const history = db.data.messages
    .filter((entry) => entry.groupId === group.id && (entry.kind === 'text' || entry.kind === 'task'))
    .slice(-40);
  const members = db
    .companyEmployees(company.id)
    .filter((entry) => !entry.isAi)
    .map((entry) => entry.name)
    .join('、');
  const messages = [
    {
      role: 'system',
      content: [
        `你是「${company.name}」企业群「${group.name}」里的 AI 助理，群成员：${members || '成员'}。`,
        '这是普通群聊，不是代码任务。请结合整个群聊历史，直接、简洁地用中文回答成员的问题。',
        '不要在回复中声称自己修改了文件、执行了命令或创建了分支；需要改代码时，提醒成员勾选「作为 AI 任务发送」交给本机执行。',
        '不要编造没有发生的事。',
      ].join('\n'),
    },
  ];
  for (const entry of history) {
    const author = db.employee(entry.authorId);
    messages.push({
      role: author?.isAi ? 'assistant' : 'user',
      content: author?.isAi ? entry.text : `${author?.name ?? '成员'}：${entry.text}`,
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let content = '';
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages, temperature: 0.7, max_tokens: 1200, stream: false }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}: ${text.slice(0, 240)}`);
    const data = JSON.parse(text);
    content = String(data?.choices?.[0]?.message?.content ?? '').trim();
  } finally {
    clearTimeout(timer);
  }
  if (!content || !db.group(group.id)) return;
  db.data.messages.push({
    id: randomId('msg'),
    companyId: company.id,
    groupId: group.id,
    seq: ++group.seq,
    text: content,
    authorId: db.aiMember(company.id)?.id ?? trigger.authorId,
    kind: 'text',
    createdAt: now(),
  });
  await db.save();
}

function expireOfflineJobs() {
  let changed = false;
  for (const job of db.data.aiJobs) {
    if (job.status !== 'pending') continue;
    const employee = db.employee(job.employeeId);
    if (employee && employeeOnline(employee)) continue;
    job.status = 'cancelled';
    job.cancelledAt = now();
    const task = db.data.tasks.find((entry) => entry.id === job.taskId);
    if (task && task.status !== 'done') {
      task.status = 'done';
      task.completedAt = now();
      task.cancelled = true;
      task.completionNote = '提出者离线，AI 任务已取消';
    }
    const group = db.group(job.groupId);
    if (group && !job.cancelMessageSent) {
      job.cancelMessageSent = true;
      db.data.messages.push({
        id: randomId('msg'),
        companyId: job.companyId,
        groupId: job.groupId,
        seq: ++group.seq,
        text: `提出者离线，AI 任务 #${job.taskId.slice(-6)} 已取消。`,
        authorId: db.aiMember(job.companyId)?.id ?? job.employeeId,
        kind: 'system',
        jobId: job.id,
        createdAt: now(),
      });
    }
    changed = true;
  }
  if (changed) db.save().catch((error) => console.error('[company-hub] 取消离线任务失败', error));
  return changed;
}

function gitTokenHash(employeeId, token) {
  return sha256(`company-hub:git:${employeeId}:${token}`);
}

function groupRepoRelative(companyId, groupId) {
  return `${companyId}/${groupId}.git`;
}

function groupRepoPath(relative) {
  const root = path.resolve(GIT_ROOT);
  const resolved = path.resolve(root, ...String(relative).split('/'));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw bad('仓库路径越界');
  return resolved;
}

function initGroupRepo(companyId, groupId, groupName) {
  fs.mkdirSync(GIT_ROOT, { recursive: true });
  const relative = groupRepoRelative(companyId, groupId);
  const repoDir = groupRepoPath(relative);
  if (fs.existsSync(repoDir)) return relative;
  fs.mkdirSync(repoDir, { recursive: true });
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'AI 助理',
    GIT_AUTHOR_EMAIL: 'ai@company-hub',
    GIT_COMMITTER_NAME: 'AI 助理',
    GIT_COMMITTER_EMAIL: 'ai@company-hub',
  };
  const run = (args, cwd) => spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  let result = run(['init', '--bare', '--initial-branch=main', repoDir]);
  if (result.status !== 0) throw new Error(result.stderr || 'git init 失败');
  const seed = fs.mkdtempSync(path.join(GIT_ROOT, '.seed-'));
  try {
    result = run(['init', '--initial-branch=main'], seed);
    if (result.status !== 0) throw new Error(result.stderr || 'git seed init 失败');
    fs.writeFileSync(
      path.join(seed, 'README.md'),
      `# ${groupName}\n\n这是「${groupName}」群的共享 Git 仓库。\n\n- 每位成员自行 clone 到本地目录；\n- AI 修改会在分支上测试后合并到 main；\n- 其他成员同步只需 git pull。\n`,
      'utf8',
    );
    fs.writeFileSync(path.join(seed, '.gitignore'), 'node_modules/\n.DS_Store\nThumbs.db\n', 'utf8');
    run(['add', '.'], seed);
    result = run(['commit', '-m', '初始化群仓库'], seed);
    if (result.status !== 0) throw new Error(result.stderr || 'git seed commit 失败');
    run(['remote', 'add', 'origin', repoDir], seed);
    result = run(['push', 'origin', 'main'], seed);
    if (result.status !== 0) throw new Error(result.stderr || 'git seed push 失败');
  } finally {
    fs.rmSync(seed, { recursive: true, force: true });
  }
  return relative;
}

function removeGroupRepo(group) {
  if (!group?.repoPath) return;
  try {
    fs.rmSync(groupRepoPath(group.repoPath), { recursive: true, force: true });
  } catch (error) {
    console.warn('[company-hub] 删除群仓库失败', error);
  }
}

function parseBasicAuth(req) {
  const header = req.headers.authorization ?? '';
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/.exec(header);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const index = decoded.indexOf(':');
  if (index < 0) return null;
  return { username: decoded.slice(0, index), password: decoded.slice(index + 1) };
}

function serveGit(req, res, url) {
  const credentials = parseBasicAuth(req);
  const employee = credentials ? db.employee(credentials.username) : null;
  if (!employee || !employee.gitTokenHash || employee.gitTokenHash !== gitTokenHash(employee.id, credentials.password)) {
    res.writeHead(401, { 'www-authenticate': 'Basic realm="company-git"' });
    res.end('authentication required');
    return;
  }
  const relative = url.pathname.slice('/git/'.length);
  const parts = relative.split('/');
  const companyId = parts[0];
  const repoName = parts[1];
  if (!companyId || !repoName) {
    res.writeHead(404);
    res.end('repository not found');
    return;
  }
  const groupId = repoName.replace(/\.git$/, '');
  const group = db.data.groups.find((entry) => entry.id === groupId && entry.companyId === companyId);
  if (!group || !group.memberIds.includes(employee.id)) {
    res.writeHead(403);
    res.end('not a group member');
    return;
  }
  const repoRelative = group.repoPath || groupRepoRelative(companyId, groupId);
  const repoDir = groupRepoPath(repoRelative);
  if (!fs.existsSync(repoDir)) {
    res.writeHead(404);
    res.end('repository not found');
    return;
  }
  const env = {
    ...process.env,
    GIT_PROJECT_ROOT: GIT_ROOT,
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: `/${relative}`,
    REQUEST_METHOD: req.method,
    QUERY_STRING: url.search ? url.search.slice(1) : '',
    CONTENT_TYPE: req.headers['content-type'] ?? '',
    CONTENT_LENGTH: req.headers['content-length'] ?? '',
    REMOTE_USER: employee.id,
    REMOTE_ADDR: req.socket.remoteAddress ?? '',
    GIT_PROTOCOL: req.headers['git-protocol'] ?? '',
  };
  const child = spawn('git', ['http-backend'], { env });
  const chunks = [];
  let size = 0;
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    size += chunk.length;
    if (size > 256 * 1024 * 1024) {
      child.kill();
      return;
    }
    chunks.push(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 4000) stderr = stderr.slice(-4000);
  });
  child.on('close', () => {
    if (res.writableEnded) return;
    const buffer = Buffer.concat(chunks);
    const crlf = buffer.indexOf('\r\n\r\n');
    const lf = buffer.indexOf('\n\n');
    const split = crlf >= 0 ? crlf : lf;
    if (split < 0) {
      res.writeHead(500);
      res.end('git backend failed');
      return;
    }
    const separatorLength = buffer[split] === 13 ? 4 : 2;
    const headers = {};
    let status = 200;
    for (const line of buffer.slice(0, split).toString('utf8').split(/\r?\n/)) {
      const index = line.indexOf(':');
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key.toLowerCase() === 'status') status = Number(value.split(' ')[0]) || 200;
      else headers[key] = value;
    }
    res.writeHead(status, headers);
    res.end(buffer.slice(split + separatorLength));
  });
  req.pipe(child.stdin);
}

function employeeGitToken(employee) {
  const token = crypto.randomBytes(24).toString('hex');
  employee.gitTokenHash = gitTokenHash(employee.id, token);
  return token;
}
// ---------------------------------------------------------------- HTTP plumbing

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendOk(res, value = {}) {
  sendJson(res, 200, { ok: true, ...value });
}

function sendError(res, error) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : String(error);
  if (status >= 500) console.error('[company-hub] 请求失败', error);
  sendJson(res, status, { ok: false, error: { status, message } });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '请求体过大');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value;
  } catch {
    throw bad('请求体不是合法的 JSON 对象');
  }
}

function authenticate(req) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+([a-f0-9]{48})$/i.exec(header);
  if (!match) throw new HttpError(401, '缺少访问令牌');
  const session = db.session(match[1]);
  if (!session) throw new HttpError(401, '访问令牌已失效，请重新登录');
  const employee = db.employee(session.employeeId);
  if (!employee) throw new HttpError(401, '账号不存在');
  const company = db.company(employee.companyId);
  if (!company) throw new HttpError(401, '公司不存在');
  return { token: match[1], employee, company };
}

function stateView(auth) {
  const { employee, company } = auth;
  const ai = db.aiMember(company.id);
  const contacts = db.data.contacts
    .filter((entry) => entry.ownerId === employee.id)
    .map((entry) => db.employee(entry.employeeId))
    .filter(Boolean)
    .map(publicEmployee);
  const groups = db
    .companyGroups(company.id)
    .filter((group) => group.memberIds.includes(employee.id))
    .map((group) => {
      const messages = db.groupMessages(group.id);
      const last = messages[messages.length - 1];
      const readSeq = db.readMark(employee.id, group.id);
      const unread = messages.filter((entry) => entry.seq > readSeq && entry.authorId !== employee.id).length;
      return {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        memberIds: group.memberIds,
        members: group.memberIds.map((id) => {
          const member = db.employee(id);
          return member ? publicEmployee(member) : { id, name: '未知成员', role: '', isAi: false };
        }),
        lastMessage: last ? messageView(last) : null,
        repoPath: group.repoPath ?? null,
        unread,
        hasAi: Boolean(ai && group.memberIds.includes(ai.id)),
      };
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt) - (a.lastMessage?.createdAt ?? a.createdAt));
  const tasks = db.data.tasks
    .filter((task) => task.companyId === company.id && task.status !== 'done')
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((task) => {
      const group = db.group(task.groupId);
      return {
        id: task.id,
        groupId: task.groupId,
        groupName: group?.name ?? '未知群组',
        text: task.text,
        status: task.status,
        createdAt: task.createdAt,
        createdBy: task.createdBy,
        createdByName: memberName(task.createdBy),
        assigneeId: task.assigneeId ?? null,
      };
    });
  const directory = db.companyEmployees(company.id).map(publicEmployee);
  return {
    company: publicCompany(company),
    employee: publicEmployee(employee),
    aiMember: ai ? publicEmployee(ai) : null,
    contacts,
    directory,
    groups,
    tasks,
    server: { name: 'company-hub', version: VERSION, time: now() },
  };
}

// ---------------------------------------------------------------- routes

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route('GET', /^\/health$/, async () => ({
  ok: true,
  name: 'company-hub',
  version: VERSION,
  companies: db.data.companies.length,
}));

route('POST', /^\/api\/companies$/, async (req) => {
  const body = await readJsonBody(req);
  const companyName = str(body.companyName, '公司名称', { max: 60 });
  const employeeName = str(body.employeeName, '你的姓名', { max: 40 });
  const externalId = typeof body.externalId === 'string' && body.externalId.trim() ? str(body.externalId, '账号标识', { max: 200 }) : null;
  const contact = typeof body.contact === 'string' && body.contact.trim() ? str(body.contact, '联系方式', { max: 120 }) : '';
  if (db.data.companies.some((entry) => entry.name.toLowerCase() === companyName.toLowerCase())) {
    throw bad('同名公司已存在，请换一个名称');
  }
  const company = { id: randomId('co'), name: companyName, createdAt: now() };
  db.data.companies.push(company);
  const employee = {
    id: randomId('emp'),
    companyId: company.id,
    name: employeeName,
    role: 'admin',
    isAi: false,
    externalId,
    contact,
    createdAt: now(),
  };
  db.data.employees.push(employee);
  const ai = {
    id: randomId('ai'),
    companyId: company.id,
    name: 'AI 助理',
    role: 'ai',
    isAi: true,
    createdAt: now(),
  };
  db.data.employees.push(ai);
  const accessCode = newAccessCode();
  employee.accessCodeHash = hashAccessCode(employee.id, accessCode);
  ai.accessCodeHash = 'locked';
  const deviceSecret = newDeviceSecret();
  employee.deviceSecretHash = hashDeviceSecret(employee.id, deviceSecret);
  const token = db.issueSession(employee.id);
  await db.save();
  return {
    company: publicCompany(company),
    employee: publicEmployee(employee),
    aiMember: publicEmployee(ai),
    accessCode,
    deviceSecret,
    token,
  };
});

route('GET', /^\/api\/companies$/, async (req) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const query = (url.searchParams.get('q') ?? '').trim();
  if (!query) return { items: [] };
  const needle = query.toLowerCase();
  const items = db.data.companies
    .filter((entry) => entry.name.toLowerCase().includes(needle) || entry.id === query)
    .slice(0, 20)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      createdAt: entry.createdAt,
      memberCount: db.companyEmployees(entry.id).filter((member) => !member.isAi).length,
    }));
  return { items };
});

route('POST', /^\/api\/companies\/([a-z0-9_]+)\/join$/, async (req) => {
  const match = /^\/api\/companies\/([a-z0-9_]+)\/join$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const company = db.company(match[1]);
  if (!company) throw notFound('公司不存在');
  const body = await readJsonBody(req);
  const externalId = str(body.externalId, '账号标识', { max: 200 });
  const name = typeof body.name === 'string' && body.name.trim() ? str(body.name, '姓名', { max: 40 }) : '成员';
  const contact = typeof body.contact === 'string' ? str(body.contact, '联系方式', { max: 120 }) : '';
  const suppliedSecret = typeof body.deviceSecret === 'string' ? body.deviceSecret : '';
  const ai = db.aiMember(company.id);
  const existing = db.companyEmployees(company.id).find((entry) => entry.externalId === externalId && !entry.isAi);
  if (existing) {
    if (suppliedSecret && existing.deviceSecretHash === hashDeviceSecret(existing.id, suppliedSecret)) {
      const token = db.issueSession(existing.id);
      await db.save();
      return {
        company: publicCompany(company),
        employee: publicEmployee(existing),
        aiMember: ai ? publicEmployee(ai) : null,
        token,
      };
    }
    if (!existing.deviceSecretHash) {
      // An admin cleared the binding: the next join claims the same account instead of duplicating it.
      const deviceSecret = newDeviceSecret();
      existing.deviceSecretHash = hashDeviceSecret(existing.id, deviceSecret);
      if (name && name !== '成员') existing.name = name;
      const token = db.issueSession(existing.id);
      await db.save();
      return {
        company: publicCompany(company),
        employee: publicEmployee(existing),
        aiMember: ai ? publicEmployee(ai) : null,
        token,
        deviceSecret,
      };
    }
    throw new HttpError(409, '这个 DSH 账号已经加入该公司，请使用原来的电脑；或请管理员在面板「设置 → 成员设备」里重置绑定后再加入');
  }
  const employee = {
    id: randomId('emp'),
    companyId: company.id,
    name,
    role: 'member',
    isAi: false,
    externalId,
    contact,
    createdAt: now(),
  };
  const deviceSecret = newDeviceSecret();
  employee.deviceSecretHash = hashDeviceSecret(employee.id, deviceSecret);
  db.data.employees.push(employee);
  const token = db.issueSession(employee.id);
  await db.save();
  return {
    company: publicCompany(company),
    employee: publicEmployee(employee),
    aiMember: ai ? publicEmployee(ai) : null,
    token,
    deviceSecret,
  };
});

route('POST', /^\/api\/employees\/([a-z0-9_]+)\/reset-device$/, async (req, res, auth) => {
  if (!auth || auth.employee.role !== 'admin') throw forbidden('只有管理员可以重置成员设备绑定');
  const match = /^\/api\/employees\/([a-z0-9_]+)\/reset-device$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const employee = db.employee(match[1]);
  if (!employee || employee.companyId !== auth.company.id) throw notFound('员工不存在');
  if (employee.isAi) throw bad('AI 助理没有设备绑定');
  employee.deviceSecretHash = null;
  db.data.sessions = db.data.sessions.filter((entry) => entry.employeeId !== employee.id);
  await db.save();
  return { employee: publicEmployee(employee) };
});

route('POST', /^\/api\/auth\/login$/, async (req) => {
  const body = await readJsonBody(req);
  const companyId = str(body.companyId, '公司 ID', { max: 80 });
  const employeeName = str(body.employeeName, '姓名', { max: 40 });
  const accessCode = str(body.accessCode, '访问码', { max: 20 }).toUpperCase();
  const company = db.company(companyId);
  if (!company) throw notFound('公司不存在，请核对公司 ID');
  const employee = db.companyEmployees(company.id).find((entry) => entry.name === employeeName && !entry.isAi);
  if (!employee) throw notFound('这家公司里没有这个姓名，请核对或让管理员添加账号');
  if (!employee.accessCodeHash || employee.accessCodeHash !== hashAccessCode(employee.id, accessCode)) {
    throw forbidden('访问码不正确');
  }
  const token = db.issueSession(employee.id);
  await db.save();
  const ai = db.aiMember(company.id);
  return {
    company: publicCompany(company),
    employee: publicEmployee(employee),
    aiMember: ai ? publicEmployee(ai) : null,
    token,
  };
});

route('GET', /^\/api\/me$/, async (req, res) => {
  const auth = authenticate(req);
  return { company: publicCompany(auth.company), employee: publicEmployee(auth.employee) };
});

route('GET', /^\/api\/state$/, async (req) => stateView(authenticate(req)));

route('POST', /^\/api\/me\/heartbeat$/, async (req) => {
  const auth = authenticate(req);
  auth.employee.lastSeenAt = now();
  await db.save();
  return { online: true, at: auth.employee.lastSeenAt };
});

route('GET', /^\/api\/ai\/jobs$/, async (req) => {
  const auth = authenticate(req);
  expireOfflineJobs();
  const items = db.data.aiJobs
    .filter((job) => job.employeeId === auth.employee.id)
    .filter((job) => job.status === 'pending' || job.status === 'running')
    .map((job) => {
      const group = db.group(job.groupId);
      return {
        id: job.id,
        taskId: job.taskId,
        groupId: job.groupId,
        groupName: group?.name ?? '',
        repoPath: group?.repoPath ?? null,
        text: job.text,
        branch: job.branch,
        status: job.status,
        createdAt: job.createdAt,
      };
    });
  return { items };
});

route('POST', /^\/api\/ai\/jobs\/([a-z0-9_]+)\/claim$/, async (req) => {
  const auth = authenticate(req);
  const jobId = /^\/api\/ai\/jobs\/([a-z0-9_]+)\/claim$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const job = db.data.aiJobs.find((entry) => entry.id === jobId && entry.employeeId === auth.employee.id);
  if (!job) throw notFound('AI 任务不存在');
  if (job.status === 'cancelled' || job.status === 'done' || job.status === 'failed') throw bad('AI 任务已结束');
  job.status = 'running';
  job.claimedAt = now();
  await db.save();
  return { job: { id: job.id, status: job.status, branch: job.branch } };
});

route('POST', /^\/api\/ai\/jobs\/([a-z0-9_]+)\/complete$/, async (req) => {
  const auth = authenticate(req);
  const jobId = /^\/api\/ai\/jobs\/([a-z0-9_]+)\/complete$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const job = db.data.aiJobs.find((entry) => entry.id === jobId && entry.employeeId === auth.employee.id);
  if (!job) throw notFound('AI 任务不存在');
  const body = await readJsonBody(req);
  job.status = 'done';
  job.completedAt = now();
  job.note = typeof body.note === 'string' ? body.note.slice(0, 500) : '';
  const task = db.data.tasks.find((entry) => entry.id === job.taskId);
  if (task && task.status !== 'done') {
    task.status = 'done';
    task.completedAt = now();
    task.completedBy = auth.employee.id;
    task.completionNote = job.note || '本机 AI 已处理';
  }
  await db.save();
  return { job: { id: job.id, status: job.status } };
});

route('POST', /^\/api\/ai\/jobs\/([a-z0-9_]+)\/fail$/, async (req) => {
  const auth = authenticate(req);
  const jobId = /^\/api\/ai\/jobs\/([a-z0-9_]+)\/fail$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const job = db.data.aiJobs.find((entry) => entry.id === jobId && entry.employeeId === auth.employee.id);
  if (!job) throw notFound('AI 任务不存在');
  const body = await readJsonBody(req);
  const error = typeof body.error === 'string' ? body.error.slice(0, 300) : '未知错误';
  job.status = 'failed';
  job.completedAt = now();
  job.error = error;
  const task = db.data.tasks.find((entry) => entry.id === job.taskId);
  if (task && task.status !== 'done') {
    task.status = 'done';
    task.completedAt = now();
    task.completionNote = `本机 AI 失败：${error}`;
  }
  const group = db.group(job.groupId);
  if (group) {
    db.data.messages.push({
      id: randomId('msg'),
      companyId: job.companyId,
      groupId: job.groupId,
      seq: ++group.seq,
      text: `AI 任务 #${job.taskId.slice(-6)} 在本机执行失败：${error}`,
      authorId: db.aiMember(job.companyId)?.id ?? auth.employee.id,
      kind: 'system',
      jobId: job.id,
      createdAt: now(),
    });
  }
  await db.save();
  return { job: { id: job.id, status: job.status } };
});

route('POST', /^\/api\/me\/link$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const externalId = str(body.externalId, '账号标识', { max: 200 });
  const contact = typeof body.contact === 'string' ? str(body.contact, '联系方式', { max: 120 }) : '';
  if (auth.employee.externalId && auth.employee.externalId !== externalId) {
    throw new HttpError(409, '当前员工账号已绑定其他 DSH 账号，请联系管理员在「设置 → 成员设备」里重置');
  }
  const taken = db
    .companyEmployees(auth.company.id)
    .some((entry) => entry.id !== auth.employee.id && entry.externalId === externalId);
  if (taken) throw new HttpError(409, '这个 DSH 账号已被公司里的其他员工绑定');
  auth.employee.externalId = externalId;
  auth.employee.contact = contact || auth.employee.contact || '';
  let deviceSecret;
  if (!auth.employee.deviceSecretHash) {
    deviceSecret = newDeviceSecret();
    auth.employee.deviceSecretHash = hashDeviceSecret(auth.employee.id, deviceSecret);
  }
  await db.save();
  return { employee: publicEmployee(auth.employee), deviceSecret };
});

route('POST', /^\/api\/me\/rename$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const name = str(body.name, '显示名', { max: 40 });
  const clash = db
    .companyEmployees(auth.company.id)
    .some((entry) => entry.id !== auth.employee.id && entry.name === name);
  if (clash) throw bad('公司里已有同名成员，换一个名字');
  auth.employee.name = name;
  await db.save();
  return { employee: publicEmployee(auth.employee) };
});

route('POST', /^\/api\/me\/git-token$/, async (req) => {
  const auth = authenticate(req);
  const token = employeeGitToken(auth.employee);
  await db.save();
  return { username: auth.employee.id, token };
});

route('POST', /^\/api\/employees$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const name = str(body.name, '员工姓名', { max: 40 });
  const role = typeof body.role === 'string' && body.role.trim() ? str(body.role, '职位', { max: 30 }) : 'member';
  if (db.companyEmployees(auth.company.id).some((entry) => entry.name === name)) {
    throw bad('这家公司里已有同名账号');
  }
  const employee = {
    id: randomId('emp'),
    companyId: auth.company.id,
    name,
    role,
    isAi: false,
    createdAt: now(),
  };
  const accessCode = newAccessCode();
  employee.accessCodeHash = hashAccessCode(employee.id, accessCode);
  db.data.employees.push(employee);
  await db.save();
  return { employee: publicEmployee(employee), accessCode };
});

route('GET', /^\/api\/directory$/, async (req) => {
  const auth = authenticate(req);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const items = db
    .companyEmployees(auth.company.id)
    .filter((entry) => entry.id !== auth.employee.id)
    .filter((entry) => (query ? entry.name.toLowerCase().includes(query) : true))
    .map(publicEmployee);
  return { items };
});

route('POST', /^\/api\/contacts$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const employeeId = str(body.employeeId, '同事 ID', { max: 80 });
  const target = db.employee(employeeId);
  if (!target || target.companyId !== auth.company.id) throw notFound('找不到这位同事');
  if (target.id === auth.employee.id) throw bad('不能把自己加进通讯录');
  if (!db.data.contacts.some((entry) => entry.ownerId === auth.employee.id && entry.employeeId === target.id)) {
    db.data.contacts.push({ ownerId: auth.employee.id, employeeId: target.id, createdAt: now() });
    await db.save();
  }
  return { contact: publicEmployee(target) };
});

route('DELETE', /^\/api\/contacts$/, async (req) => {
  const auth = authenticate(req);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const employeeId = url.searchParams.get('employeeId') ?? '';
  const before = db.data.contacts.length;
  db.data.contacts = db.data.contacts.filter(
    (entry) => !(entry.ownerId === auth.employee.id && entry.employeeId === employeeId),
  );
  if (db.data.contacts.length !== before) await db.save();
  return {};
});

route('POST', /^\/api\/groups$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const name = str(body.name, '群组名称', { max: 60 });
  const requested = Array.isArray(body.memberIds) ? body.memberIds.filter((id) => typeof id === 'string') : [];
  const ai = db.aiMember(auth.company.id);
  const members = [auth.employee.id, ...requested];
  if (ai) members.push(ai.id);
  const memberIds = [...new Set(members)].filter((id) => {
    const entry = db.employee(id);
    return entry && entry.companyId === auth.company.id;
  });
  if (new Set(memberIds).size < 2) throw bad('群组至少需要一个成员');
  const group = {
    id: randomId('grp'),
    companyId: auth.company.id,
    name,
    memberIds,
    createdBy: auth.employee.id,
    createdAt: now(),
    seq: 0,
  };
  group.repoPath = initGroupRepo(auth.company.id, group.id, name);
  db.data.groups.push(group);
  db.data.messages.push({
    id: randomId('msg'),
    companyId: auth.company.id,
    groupId: group.id,
    seq: ++group.seq,
    text: `群组「${name}」已创建，AI 助理已自动加入。Git 仓库已就绪，成员需在本地绑定该群的仓库目录。`,
    authorId: ai ? ai.id : auth.employee.id,
    kind: 'system',
    createdAt: now(),
  });
  await db.save();
  return {
    group: {
      id: group.id,
      name: group.name,
      memberIds: group.memberIds,
      repoPath: group.repoPath,
    },
  };
});

route('DELETE', /^\/api\/groups\/([a-z0-9_]+)$/, async (req) => {
  const auth = authenticate(req);
  if (auth.employee.role !== 'admin') throw forbidden('只有管理员可以删除群组');
  const groupId = /^\/api\/groups\/([a-z0-9_]+)$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const group = db.group(groupId);
  if (!group || group.companyId !== auth.company.id) throw notFound('群组不存在');
  removeGroupRepo(group);
  db.data.groups = db.data.groups.filter((entry) => entry.id !== groupId);
  db.data.messages = db.data.messages.filter((entry) => entry.groupId !== groupId);
  db.data.tasks = db.data.tasks.filter((entry) => entry.groupId !== groupId);
  db.data.reads = db.data.reads.filter((entry) => entry.groupId !== groupId);
  await db.save();
  return { removed: true };
});

route('GET', /^\/api\/groups\/([a-z0-9_]+)\/messages$/, async (req) => {
  const auth = authenticate(req);
  const groupId = /^\/api\/groups\/([a-z0-9_]+)\/messages$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const group = db.group(groupId);
  if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) {
    throw notFound('群组不存在');
  }
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const since = Number(url.searchParams.get('since') ?? '0') || 0;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100));
  const all = db.groupMessages(group.id);
  const slice = all.filter((entry) => entry.seq > since).slice(-limit);
  return {
    messages: slice.map(messageView),
    seq: group.seq,
    total: all.length,
  };
});

route('POST', /^\/api\/groups\/([a-z0-9_]+)\/messages$/, async (req) => {
  const auth = authenticate(req);
  const match = /^\/api\/groups\/([a-z0-9_]+)\/messages$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const group = db.group(match[1]);
  if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) {
    throw notFound('群组不存在');
  }
  const body = await readJsonBody(req);
  const text = str(body.text, '消息内容', { max: MAX_TEXT });
  const asAi = body.asAi === true;
  const ai = db.aiMember(auth.company.id);
  const author = asAi && ai ? ai : auth.employee;
  const wantsTask = body.task === true && author.isAi === false;
  const mentioned = author.isAi === false && /@\s*ai\b|@\s*AI\b|@\s*Ai\b|AI\s*助理/i.test(text);
  const message = {
    id: randomId('msg'),
    companyId: auth.company.id,
    groupId: group.id,
    seq: ++group.seq,
    text,
    authorId: author.id,
    kind: 'text',
    createdAt: now(),
  };
  db.data.messages.push(message);
  let task = null;
  let job = null;
  if (wantsTask) {
    if (!employeeOnline(auth.employee)) {
      db.data.messages.push({
        id: randomId('msg'),
        companyId: auth.company.id,
        groupId: group.id,
        seq: ++group.seq,
        text: `提出者「${auth.employee.name}」当前不在线，AI 任务已取消：${text.slice(0, 80)}`,
        authorId: ai ? ai.id : auth.employee.id,
        kind: 'system',
        createdAt: now(),
      });
    } else {
      task = {
        id: randomId('task'),
        companyId: auth.company.id,
        groupId: group.id,
        messageId: message.id,
        text,
        status: 'pending',
        createdBy: auth.employee.id,
        createdAt: now(),
        assigneeId: auth.employee.id,
      };
      job = {
        id: randomId('job'),
        companyId: auth.company.id,
        groupId: group.id,
        taskId: task.id,
        employeeId: auth.employee.id,
        text,
        branch: `ai/${task.id.slice(-6)}`,
        status: 'pending',
        createdAt: now(),
      };
      task.jobId = job.id;
      message.kind = 'task';
      message.taskId = task.id;
      db.data.tasks.push(task);
      db.data.aiJobs.push(job);
      db.data.messages.push({
        id: randomId('msg'),
        companyId: auth.company.id,
        groupId: group.id,
        seq: ++group.seq,
        text: `已生成 AI 任务 #${task.id.slice(-6)}：${text.slice(0, 80)}（等待提出者电脑上的 AI 处理）`,
        authorId: ai ? ai.id : auth.employee.id,
        kind: 'system',
        taskId: task.id,
        jobId: job.id,
        createdAt: now(),
      });
    }
  }
  await db.save();
  if (mentioned && !wantsTask) {
    scheduleChatReply(auth.company, group, message);
  }
  return {
    message: messageView(message),
    task: task ? { id: task.id, status: task.status } : null,
    job: job ? { id: job.id, status: job.status } : null,
  };
});

route('POST', /^\/api\/groups\/([a-z0-9_]+)\/read$/, async (req) => {
  const auth = authenticate(req);
  const match = /^\/api\/groups\/([a-z0-9_]+)\/read$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const group = db.group(match[1]);
  if (!group || group.companyId !== auth.company.id) throw notFound('群组不存在');
  const body = await readJsonBody(req);
  const seq = Math.max(0, Math.min(group.seq, Number(body.seq) || 0));
  db.setRead(auth.employee.id, group.id, seq);
  await db.save();
  return {};
});

route('GET', /^\/api\/tasks$/, async (req) => {
  const auth = authenticate(req);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const status = url.searchParams.get('status');
  const items = db.data.tasks
    .filter((task) => task.companyId === auth.company.id)
    .filter((task) => (status ? task.status === status : task.status !== 'done'))
    .map((task) => ({
      ...task,
      groupName: db.group(task.groupId)?.name ?? '未知群组',
      createdByName: memberName(task.createdBy),
    }));
  return { items };
});

route('POST', /^\/api\/tasks\/([a-z0-9_]+)\/claim$/, async (req) => {
  const auth = authenticate(req);
  const match = /^\/api\/tasks\/([a-z0-9_]+)\/claim$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const task = db.data.tasks.find((entry) => entry.id === match[1]);
  if (!task || task.companyId !== auth.company.id) throw notFound('任务不存在');
  task.assigneeId = auth.employee.id;
  task.status = 'claimed';
  task.claimedAt = now();
  await db.save();
  return { task: { id: task.id, status: task.status, assigneeId: task.assigneeId } };
});

route('POST', /^\/api\/tasks\/([a-z0-9_]+)\/complete$/, async (req) => {
  const auth = authenticate(req);
  const match = /^\/api\/tasks\/([a-z0-9_]+)\/complete$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const task = db.data.tasks.find((entry) => entry.id === match[1]);
  if (!task || task.companyId !== auth.company.id) throw notFound('任务不存在');
  const body = await readJsonBody(req);
  const note = typeof body.note === 'string' && body.note.trim() ? str(body.note, '完成说明', { max: MAX_TEXT }) : '';
  const asAi = body.asAi === true && db.aiMember(auth.company.id) !== undefined;
  const group = db.group(task.groupId);
  task.status = 'done';
  task.completedAt = now();
  task.completedBy = auth.employee.id;
  if (note && group) {
    db.data.messages.push({
      id: randomId('msg'),
      companyId: auth.company.id,
      groupId: group.id,
      seq: ++group.seq,
      text: note,
      authorId: asAi ? db.aiMember(auth.company.id).id : auth.employee.id,
      kind: 'text',
      taskId: task.id,
      createdAt: now(),
    });
  }
  await db.save();
  return { task: { id: task.id, status: task.status } };
});

// ---------------------------------------------------------------- server

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  if (pathname.startsWith('/git/')) {
    serveGit(req, res, url);
    return;
  }
  try {
    for (const entry of routes) {
      if (entry.method !== req.method) continue;
      const match = entry.pattern.exec(pathname);
      if (!match) continue;
      let auth = null;
      const publicOnboarding =
        pathname === '/api/companies' ||
        pathname === '/api/auth/login' ||
        /^\/api\/companies\/[a-z0-9_]+\/join$/.test(pathname);
      if (pathname.startsWith('/api/') && !publicOnboarding) {
        auth = authenticate(req);
      }
      const result = await entry.handler(req, res, auth);
      if (res.writableEnded) return;
      sendOk(res, result ?? {});
      return;
    }
    sendJson(res, 404, { ok: false, error: { status: 404, message: '接口不存在' } });
  } catch (error) {
    if (!res.writableEnded) sendError(res, error);
  }
});

setInterval(expireOfflineJobs, 30_000).unref();

server.listen(args.port, args.host, () => {
  const displayHost = args.host === '0.0.0.0' ? '127.0.0.1' : args.host;
  console.log(`[company-hub] 企业协作服务器 v${VERSION} 已启动`);  console.log(`[company-hub] 地址：http://${displayHost}:${args.port}`);
  console.log(`[company-hub] 数据目录：${DATA_DIR}`);
  if (args.host === '0.0.0.0') {
    console.log('[company-hub] 已监听所有网卡，同事们可用 http://<本机局域网 IP>:' + args.port + ' 连接');
  }
});

const shutdown = () => {
  console.log('\n[company-hub] 正在关闭…');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
