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
import readline from 'node:readline';
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
const KNOWLEDGE_ROOT = path.resolve(process.env.COMPANY_KNOWLEDGE_ROOT || path.join(DATA_DIR, 'knowledge'));
const KNOWLEDGE_MAX_BYTES = 10 * 1024 * 1024;
const EMBEDDING_URL = String(process.env.EMBEDDING_URL || '').trim();
const EMBEDDING_MODEL = String(process.env.EMBEDDING_MODEL || 'BAAI/bge-small-zh-v1.5');
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 512) || 512;

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
    approvals: [],
    knowledgeDocs: [],
    knowledgeEntities: [],
    knowledgeRelations: [],
    knowledgeVectors: [],
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

function approvalView(approval) {
  return {
    id: approval.id,
    shortId: String(approval.id || '').slice(-6),
    status: approval.status || 'unknown',
    toolName: approval.toolName || '',
    reason: approval.reason || '',
    requestedBy: approval.requestedBy || '',
    expiresAt: approval.expiresAt || 0,
  };
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
    runId: message.runId ?? null,
    approvalId: message.approvalId ?? null,
    activity: message.activity ?? null,
    approval: message.approvalId
      ? approvalView(db.data.approvals.find((entry) => entry.id === message.approvalId) ?? { id: message.approvalId })
      : null,
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

function dshHostEnabled() {
  return process.env.DSH_HOST_ENABLED === '1';
}

function dshHostWorkspace(company, group) {
  const root = path.resolve(process.env.DSH_HOST_WORKSPACE_ROOT || '/var/lib/dsh-host/workspaces');
  const target = path.join(root, company.id, group.id);
  fs.mkdirSync(target, { recursive: true });
  if (!fs.existsSync(path.join(target, '.git')) && group.repoPath) {
    const repo = groupRepoPath(group.repoPath);
    if (fs.existsSync(repo)) {
      const result = spawnSync('git', ['clone', repo, target], { encoding: 'utf8' });
      if (result.status !== 0) console.warn('[company-hub] DSH host clone 失败', result.stderr?.slice(0, 500));
    }
  }
  return target;
}

function dshHostPrompt(company, group) {
  const history = db.data.messages
    .filter((entry) => entry.groupId === group.id && (entry.kind === 'text' || entry.kind === 'task'))
    .slice(-30)
    .map((entry) => {
      const author = db.employee(entry.authorId);
      return `${author?.isAi ? 'AI 助理' : author?.name ?? '成员'}：${entry.text}`;
    })
    .join('\n');
  const members = db
    .companyEmployees(company.id)
    .filter((entry) => !entry.isAi)
    .map((entry) => entry.name)
    .join('、');
  return [
    `你是「${company.name}」企业群「${group.name}」的 AI 助理，群成员：${members || '成员'}。`,
    '你运行在公司服务器的 DSH 主机上，拥有完整 DSH 工具（文件、shell、Git、测试等）。',
    '这是群聊，不是代码任务：直接回答成员的问题；需要时可以使用工具检查当前 Git 仓库。',
    '如果执行敏感操作需要审批，DSH 会向群聊发起审批；请等待审批结果。',
    '最终只输出要发到群里的回复正文，不要输出工具日志、思考过程或 Markdown 代码围栏以外的系统信息。',
    '',
    '最近群聊：',
    history || '（暂无）',
  ].join('\n');
}

async function replyWithDshHost(company, group, trigger) {
  const workspace = dshHostWorkspace(company, group);
  const prompt = dshHostPrompt(company, group);
  const cli = process.env.DSH_HOST_BIN || '/opt/dsh-host/node_modules/@deepseek-ai/dsh/lib/bin.js';
  const home = process.env.DSH_HOST_HOME || '/var/lib/dsh-host/home';
  if (!fs.existsSync(cli)) throw new Error(`DSH host CLI 不存在：${cli}`);
  const env = {
    ...process.env,
    DSH_HOME: home,
    DSH_PERMISSION_MODE: process.env.DSH_HOST_PERMISSION_MODE || 'workspace-write',
    COMPANY_HOST_TOKEN: String(process.env.COMPANY_HOST_TOKEN || ''),
    COMPANY_HOST_URL: String(process.env.COMPANY_HOST_URL || 'http://127.0.0.1:8477'),
    COMPANY_ID: company.id,
    GROUP_ID: group.id,
    REQUESTED_BY: trigger.authorId,
  };
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--profile', 'headless', prompt], {
      cwd: workspace,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('DSH host 执行超时'));
    }, Number(process.env.DSH_HOST_TIMEOUT_MS || 150_000));
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`DSH host 退出码 ${code}：${stderr.slice(-500)}`));
    });
  });
  if (!output || !db.group(group.id)) return;
  db.data.messages.push({
    id: randomId('msg'),
    companyId: company.id,
    groupId: group.id,
    seq: ++group.seq,
    text: output,
    authorId: db.aiMember(company.id)?.id ?? trigger.authorId,
    kind: 'text',
    createdAt: now(),
  });
  await db.save();
}


function scheduleChatReply(company, group, trigger) {
  const config = chatAiConfig();
  if (!config.apiKey) {
    postSystemMessage(company, group, '服务端 AI 未配置 DEEPSEEK_API_KEY，暂时无法回复；代码任务仍可勾选任务发送到本机执行。');
    return;
  }
  const previous = CHAT_QUEUES.get(group.id) ?? Promise.resolve();
  const useAcp = process.env.DSH_HOST_MODE === 'acp';
  const next = previous
    .then(() => {
      if (useAcp) return acpHostFor(company, group).prompt(trigger.text, trigger);
      return dshHostEnabled() ? replyWithDshHost(company, group, trigger) : replyInChat(company, group, trigger, config);
    })
    .catch((error) => {
      console.error('[company-hub] 群聊 AI 回复失败', error);
      postSystemMessage(company, group, `AI 回复失败：${String(error.message || error).slice(0, 200)}`);
    })
    .finally(() => {
      if (CHAT_QUEUES.get(group.id) === next) CHAT_QUEUES.delete(group.id);
    });
  CHAT_QUEUES.set(group.id, next);
}

const GROUP_STREAMS = new Map();

function broadcastGroupEvent(groupId, type, payload) {
  const clients = GROUP_STREAMS.get(groupId);
  if (!clients?.size) return;
  const body = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(body);
    } catch {
      clients.delete(res);
    }
  }
}

function serveGroupEvents(req, res, url) {
  const auth = authenticate(req);
  const match = /^\/api\/groups\/([a-z0-9_]+)\/events$/.exec(url.pathname);
  const group = match ? db.group(match[1]) : null;
  if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) {
    throw notFound('群组不存在');
  }
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write(`retry: 2000\nevent: hello\ndata: ${JSON.stringify({ groupId: group.id, seq: group.seq })}\n\n`);
  let clients = GROUP_STREAMS.get(group.id);
  if (!clients) {
    clients = new Set();
    GROUP_STREAMS.set(group.id, clients);
  }
  clients.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);
  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(res);
    if (!clients.size && GROUP_STREAMS.get(group.id) === clients) GROUP_STREAMS.delete(group.id);
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
}

const KNOWLEDGE_TEXT_CACHE = new Map();
const KNOWLEDGE_STOPWORDS = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'what', 'how', 'why', 'are', 'was', 'were', '的', '了', '是', '在', '和', '与', '及', '或', '一个', '可以', '如何', '什么', '为什么', '请问']);

function knowledgeExt(filePath, name) {
  const ext = path.extname(name || filePath).toLowerCase();
  if (['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yml', '.yaml'].includes(ext)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  if (ext === '.html' || ext === '.htm') {
    return fs
      .readFileSync(filePath, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  if (ext === '.docx') {
    const result = spawnSync('unzip', ['-p', filePath, 'word/document.xml'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (result.status !== 0) throw bad('无法读取 DOCX 文件');
    return result.stdout
      .replace(/<w:tab[^>]*\/>/gi, '\t')
      .replace(/<\/w:p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  if (ext === '.pdf') {
    const script = [
      'import sys',
      'from pypdf import PdfReader',
      'r=PdfReader(sys.argv[1])',
      'print("\\n\\n".join((p.extract_text() or "") for p in r.pages))',
    ].join('\n');
    const result = spawnSync('python3', ['-c', script, filePath], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0) throw bad(`无法解析 PDF：${String(result.stderr || '').slice(0, 200)}`);
    return result.stdout;
  }
  throw bad('暂不支持该文件类型；支持 txt / md / csv / json / html / docx / pdf');
}

function knowledgeChunks(text) {
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 300_000);
  if (!normalized) return [];
  const chunks = [];
  let position = 0;
  while (position < normalized.length && chunks.length < 600) {
    let end = Math.min(normalized.length, position + 1200);
    if (end < normalized.length) {
      const newline = normalized.lastIndexOf('\n', end);
      if (newline > position + 500) end = newline;
    }
    const value = normalized.slice(position, end).trim();
    if (value) chunks.push(value);
    if (end >= normalized.length) break;
    position = Math.max(position + 1, end - 160);
  }
  return chunks;
}

function knowledgeTokens(text) {
  const tokens = [];
  const matches = String(text || '').toLowerCase().match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]+/g) || [];
  for (const match of matches) {
    if (/^[a-z0-9_]+$/.test(match)) {
      if (!KNOWLEDGE_STOPWORDS.has(match)) tokens.push(match);
      continue;
    }
    if (match.length === 1) tokens.push(match);
    for (let index = 0; index < match.length - 1; index += 1) {
      const bigram = match.slice(index, index + 2);
      if (!KNOWLEDGE_STOPWORDS.has(bigram)) tokens.push(bigram);
    }
  }
  return tokens;
}

function knowledgeTextFor(doc) {
  if (KNOWLEDGE_TEXT_CACHE.has(doc.id)) return KNOWLEDGE_TEXT_CACHE.get(doc.id);
  try {
    const text = fs.readFileSync(doc.textPath, 'utf8');
    KNOWLEDGE_TEXT_CACHE.set(doc.id, text);
    return text;
  } catch {
    return '';
  }
}

function knowledgeDocs(companyId, groupId) {
  return (db.data.knowledgeDocs ?? []).filter(
    (doc) => doc.companyId === companyId && !doc.supersededBy && (doc.groupId === null || doc.groupId === groupId),
  );
}

function knowledgeEntityName(value) {
  let clean = String(value || '').trim().replace(/[，。；：、,.;:!?！？\s]+$/g, '');
  for (let index = 0; index < 3; index += 1) {
    clean = clean.replace(/(?:的|直接|工作|向|对)$/, '').trim();
  }
  return clean.slice(0, 40);
}

function knowledgeFindEntity(companyId, name) {
  return (db.data.knowledgeEntities ?? []).find(
    (entity) => entity.companyId === companyId && (entity.name === name || entity.aliases.includes(name)),
  );
}

function knowledgeUpsertEntity(companyId, name, type = 'person') {
  const clean = knowledgeEntityName(name);
  if (!clean || clean.length < 2) return null;
  const existing = knowledgeFindEntity(companyId, clean);
  if (existing) {
    if (!existing.aliases.includes(clean) && existing.name !== clean) existing.aliases.push(clean);
    return existing;
  }
  const entity = {
    id: randomId('ent'),
    companyId,
    name: clean,
    type,
    aliases: [],
    createdAt: now(),
  };
  db.data.knowledgeEntities.push(entity);
  return entity;
}

function knowledgeMergeEntities(companyId, entity, other) {
  if (!entity || !other || entity.id === other.id) return;
  for (const name of [other.name, ...(other.aliases ?? [])]) {
    if (name !== entity.name && !entity.aliases.includes(name)) entity.aliases.push(name);
  }
  for (const relation of db.data.knowledgeRelations ?? []) {
    if (relation.subjectId === other.id) relation.subjectId = entity.id;
    if (relation.objectId === other.id) relation.objectId = entity.id;
  }
  db.data.knowledgeEntities = db.data.knowledgeEntities.filter((entry) => entry.id !== other.id);
}

function knowledgeNormalizePredicate(value) {
  const text = String(value || '').trim().slice(0, 40);
  if (/汇报|报告/.test(text)) return '汇报对象';
  if (/上司|上级|领导|老板|主管/.test(text)) return '上级';
  if (/负责|管理/.test(text)) return '负责';
  if (/合作|伙伴/.test(text)) return '合作';
  return text;
}

function knowledgeAddEntity(companyId, name, type, aliases = []) {
  const entity = knowledgeUpsertEntity(companyId, name, type);
  if (!entity) return null;
  for (const alias of aliases) {
    const clean = knowledgeEntityName(alias);
    if (!clean || clean === entity.name) continue;
    const other = knowledgeFindEntity(companyId, clean);
    if (other && other.id !== entity.id) knowledgeMergeEntities(companyId, entity, other);
    if (!entity.aliases.includes(clean)) entity.aliases.push(clean);
  }
  return entity;
}

function knowledgeAddRelation(companyId, docId, subjectName, predicate, objectName) {
  const subject = knowledgeAddEntity(companyId, subjectName);
  const object = knowledgeAddEntity(companyId, objectName);
  if (!subject || !object || subject.id === object.id) return;
  const normalized = knowledgeNormalizePredicate(predicate);
  if (!normalized) return;
  const exists = (db.data.knowledgeRelations ?? []).some(
    (relation) =>
      relation.docId === docId &&
      relation.subjectId === subject.id &&
      relation.predicate === normalized &&
      relation.objectId === object.id,
  );
  if (exists) return;
  db.data.knowledgeRelations.push({
    id: randomId('rel'),
    companyId,
    docId,
    subjectId: subject.id,
    predicate: normalized,
    objectId: object.id,
    createdAt: now(),
  });
}

async function enrichKnowledgeGraphWithLlm(company, doc, text) {
  const config = chatAiConfig();
  if (!config.apiKey) return;
  const prompt = [
    '你是知识图谱抽取器。只抽取文中明确出现的人、组织、项目，以及文中明确陈述的关系；不要推测。',
    '别名只在文中明确写出（如“张三（张主管）”“张主管，别名张三”）时才填。',
    '输出严格 JSON：{"entities":[{"name":"","type":"person|org|project","aliases":[]}],"relations":[{"subject":"","predicate":"","object":""}]}',
    '没有明确关系就返回空数组。只输出 JSON。',
    '',
    String(text || '').slice(0, 12000),
  ].join('\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1200,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return;
    const data = await response.json();
    let content = String(data?.choices?.[0]?.message?.content ?? '').trim();
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(content);
    for (const entity of Array.isArray(parsed.entities) ? parsed.entities.slice(0, 40) : []) {
      knowledgeAddEntity(company.id, entity?.name, entity?.type === 'org' || entity?.type === 'project' ? entity.type : 'person', Array.isArray(entity?.aliases) ? entity.aliases : []);
    }
    for (const relation of Array.isArray(parsed.relations) ? parsed.relations.slice(0, 60) : []) {
      const subject = knowledgeEntityName(relation?.subject);
      const object = knowledgeEntityName(relation?.object);
      const predicate = String(relation?.predicate || '').trim().slice(0, 40);
      if (subject && object && predicate) knowledgeAddRelation(company.id, doc.id, subject, predicate, object);
    }
  } catch (error) {
    console.warn('[company-hub] LLM 知识图谱抽取失败，保留规则结果', String(error.message || error));
  } finally {
    clearTimeout(timer);
  }
}

function knowledgeExtractGraph(companyId, doc, text) {
  db.data.knowledgeRelations = (db.data.knowledgeRelations ?? []).filter((relation) => relation.docId !== doc.id);
  const add = (subjectName, predicate, objectName) => {
    knowledgeAddRelation(companyId, doc.id, subjectName, predicate, objectName);
  };
  const source = String(text || '').slice(0, 300_000);
  let match;
  const superior = /([\u4e00-\u9fffA-Za-z0-9]{2,20}?)(?:的)?(?:上司|老板|领导|上级|主管|负责人)(?:是|为|：|:)\s*([\u4e00-\u9fffA-Za-z0-9]{2,20})/g;
  while ((match = superior.exec(source))) add(match[1], '上级', match[2]);
  const reports = /([\u4e00-\u9fffA-Za-z0-9]{2,20}?)向([\u4e00-\u9fffA-Za-z0-9]{2,20}?)(?:直接)?(?:汇报|报告)/g;
  while ((match = reports.exec(source))) add(match[1], '汇报对象', match[2]);
  const alias = /([\u4e00-\u9fffA-Za-z0-9]{2,20})(?:[（(，,])(?:别名|又称|简称)[：:]?\s*([\u4e00-\u9fffA-Za-z0-9]{2,20})/g;
  while ((match = alias.exec(source))) {
    const entity = knowledgeUpsertEntity(companyId, match[1]);
    const other = knowledgeEntityName(match[2]);
    if (entity && other && other !== entity.name && !entity.aliases.includes(other)) entity.aliases.push(other);
  }
}

function knowledgeQueryAliases(companyId, query) {
  const found = new Set();
  for (const entity of db.data.knowledgeEntities ?? []) {
    if (entity.companyId !== companyId) continue;
    const names = [entity.name, ...(entity.aliases ?? [])];
    if (names.some((name) => name && String(query).includes(name))) {
      for (const name of names) found.add(name);
    }
  }
  return [...found];
}

function knowledgeCharBigrams(text) {
  const clean = String(text || '').toLowerCase().replace(/\s+/g, '');
  const grams = new Set();
  for (let index = 0; index < clean.length - 1; index += 1) grams.add(clean.slice(index, index + 2));
  return grams;
}

function knowledgeOverlap(left, right) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return shared / Math.sqrt(left.size * right.size);
}

function knowledgeDocTime(doc) {
  const value = Number(doc.effectiveAt) || Number(doc.createdAt) || 0;
  return value;
}

async function embedKnowledgeTexts(texts) {
  if (!EMBEDDING_URL || !Array.isArray(texts) || !texts.length) return null;
  const output = [];
  for (let offset = 0; offset < texts.length; offset += 16) {
    const batch = texts.slice(offset, offset + 16);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(EMBEDDING_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texts: batch }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`embedding HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.vectors) || data.vectors.length !== batch.length) throw new Error('embedding vector count mismatch');
      output.push(...data.vectors);
    } catch (error) {
      console.warn('[company-hub] embedding 调用失败，回退 BM25', String(error.message || error));
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return output;
}

function normalizeVector(vector) {
  const values = Array.isArray(vector) ? vector.map(Number) : [];
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / norm);
}

function cosineSimilarity(left, right) {
  let score = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) score += left[index] * right[index];
  return score;
}

async function indexKnowledgeDoc(doc) {
  db.data.knowledgeVectors = (db.data.knowledgeVectors ?? []).filter((entry) => entry.docId !== doc.id);
  if (!EMBEDDING_URL) return 0;
  const chunks = knowledgeChunks(knowledgeTextFor(doc));
  if (!chunks.length) return 0;
  const vectors = await embedKnowledgeTexts(chunks);
  if (!vectors) return 0;
  vectors.forEach((vector, index) => {
    db.data.knowledgeVectors.push({
      docId: doc.id,
      chunkIndex: index,
      model: EMBEDDING_MODEL,
      dim: vector.length,
      vector: normalizeVector(vector),
    });
  });
  return vectors.length;
}

async function searchKnowledgeVector(companyId, groupId, query, limit = 20) {
  if (!EMBEDDING_URL) return [];
  const docs = knowledgeDocs(companyId, groupId);
  if (!docs.length) return [];
  const vectors = (db.data.knowledgeVectors ?? []).filter((entry) => docs.some((doc) => doc.id === entry.docId));
  if (!vectors.length) return [];
  const embedded = await embedKnowledgeTexts([query]);
  if (!embedded?.length) return [];
  const queryVector = normalizeVector(embedded[0]);
  const docMap = new Map(docs.map((doc) => [doc.id, doc]));
  return vectors
    .map((entry) => ({
      doc: docMap.get(entry.docId),
      chunkIndex: entry.chunkIndex,
      score: cosineSimilarity(queryVector, entry.vector),
    }))
    .filter((entry) => entry.doc)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(50, limit)))
    .map((entry) => ({
      docId: entry.doc.id,
      docName: entry.doc.name,
      chunkIndex: entry.chunkIndex,
      text: knowledgeChunks(knowledgeTextFor(entry.doc))[entry.chunkIndex] || '',
      version: entry.doc.version || '',
      effectiveAt: entry.doc.effectiveAt || null,
      authority: entry.doc.authority || 'normal',
      score: Number(entry.score.toFixed(3)),
    }));
}

async function searchKnowledge(companyId, groupId, query, limit = 5) {
  const bm25 = searchKnowledgeBm25(companyId, groupId, query, 20);
  const aliases = knowledgeQueryAliases(companyId, query);
  const vectorQuery = [query, ...aliases].join(' ');
  const vector = await searchKnowledgeVector(companyId, groupId, vectorQuery, 20);
  if (!vector.length) return bm25.slice(0, limit);
  const fused = new Map();
  const add = (hit, rank) => {
    const key = `${hit.docId}:${hit.chunkIndex}`;
    const existing = fused.get(key) ?? { ...hit, score: 0 };
    existing.score += 1 / (60 + rank);
    if (hit.text) existing.text = hit.text;
    fused.set(key, existing);
  };
  bm25.forEach((hit, index) => add(hit, index + 1));
  vector.forEach((hit, index) => add(hit, index + 1));
  return [...fused.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((hit) => ({ ...hit, score: Number(hit.score.toFixed(4)) }));
}

function searchKnowledgeBm25(companyId, groupId, query, limit = 5) {
  const aliases = knowledgeQueryAliases(companyId, query);
  const expandedQuery = [query, ...aliases].join(' ');
  const queryTokens = [...new Set(knowledgeTokens(expandedQuery))];
  if (!queryTokens.length) return [];
  const queryGrams = knowledgeCharBigrams(query);
  const records = [];
  for (const doc of knowledgeDocs(companyId, groupId)) {
    if (Number(doc.effectiveAt) > now() + 60_000) continue;
    const chunks = knowledgeChunks(knowledgeTextFor(doc));
    chunks.forEach((text, index) => {
      const tokens = knowledgeTokens(text);
      const counts = new Map();
      for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
      records.push({ doc, index, text, tokens, counts, nameTokens: new Set(knowledgeTokens(doc.name)), grams: knowledgeCharBigrams(text) });
    });
  }
  if (!records.length) return [];
  const average = records.reduce((sum, record) => sum + record.tokens.length, 0) / records.length || 1;
  const documentFrequency = new Map();
  for (const token of queryTokens) {
    let count = 0;
    for (const record of records) if (record.counts.has(token)) count += 1;
    documentFrequency.set(token, count);
  }
  const k1 = 1.4;
  const b = 0.72;
  const scored = records.map((record) => {
    let score = 0;
    for (const token of queryTokens) {
      const frequency = record.counts.get(token) || 0;
      if (!frequency) continue;
      const df = documentFrequency.get(token) || 0;
      const idf = Math.log(1 + (records.length - df + 0.5) / (df + 0.5));
      score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * record.tokens.length) / average)));
      if (record.nameTokens.has(token)) score += 1.2;
    }
    score += 3 * knowledgeOverlap(queryGrams, record.grams);
    if (record.doc.authority === 'official') score += 1.2;
    else if (record.doc.authority === 'department') score += 0.6;
    const age = Math.max(0, now() - knowledgeDocTime(record.doc));
    score += Math.max(0, 0.8 - age / (1000 * 60 * 60 * 24 * 365));
    return { ...record, score };
  });
  return scored
    .filter((record) => record.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(12, limit)))
    .map((record) => ({
      docId: record.doc.id,
      docName: record.doc.name,
      chunkIndex: record.index,
      text: record.text.slice(0, 1800),
      score: Number(record.score.toFixed(3)),
      version: record.doc.version || '',
      effectiveAt: record.doc.effectiveAt || null,
      authority: record.doc.authority || 'normal',
    }));
}

async function knowledgePrompt(company, group, query) {
  const hits = await searchKnowledge(company.id, group.id, query, 5);
  if (!hits.length) return '';
  const body = hits
    .map((hit, index) => {
      const meta = [
        hit.version ? `版本 ${hit.version}` : '',
        hit.effectiveAt ? `生效 ${new Date(hit.effectiveAt).toISOString().slice(0, 10)}` : '',
        hit.authority === 'official' ? '权威：公司正式' : hit.authority === 'department' ? '权威：部门' : '',
      ].filter(Boolean).join('；');
      return `[资料 ${index + 1}] 来源：${hit.docName}${meta ? `（${meta}）` : ''}（片段 ${hit.chunkIndex + 1}）\n${hit.text}`;
    })
    .join('\n\n---\n\n');
  const aliases = knowledgeQueryAliases(company.id, query);
  const entityLines = [];
  for (const entity of db.data.knowledgeEntities ?? []) {
    if (entity.companyId !== company.id) continue;
    if (!aliases.includes(entity.name) && !aliases.some((alias) => entity.aliases.includes(alias))) continue;
    const relations = (db.data.knowledgeRelations ?? [])
      .filter((relation) => relation.companyId === company.id && (relation.subjectId === entity.id || relation.objectId === entity.id))
      .slice(0, 8)
      .map((relation) => {
        const subject = db.data.knowledgeEntities.find((entry) => entry.id === relation.subjectId);
        const object = db.data.knowledgeEntities.find((entry) => entry.id === relation.objectId);
        return subject && object ? `${subject.name} ${relation.predicate} ${object.name}` : '';
      })
      .filter(Boolean);
    entityLines.push(`实体：${entity.name}${entity.aliases.length ? `（别名：${entity.aliases.join('、')}）` : ''}${relations.length ? `\n关系：${relations.join('；')}` : ''}`);
  }
  return [
    '以下是从公司知识库检索到的资料。回答时优先使用这些资料；资料不足时明确说明，不要编造。',
    '若不同资料版本冲突，按生效时间/权威级别说明冲突，不要强行合并。',
    '引用资料时在句末标注来源文件名；只有资料明确说明同一实体时才合并称呼，否则说明“可能是同一人，需确认”。',
    entityLines.length ? `\n【实体关系】\n${entityLines.join('\n')}` : '',
    '',
    body.slice(0, 7000),
  ].filter(Boolean).join('\n');
}

function saveKnowledgeDoc(company, auth, groupId, name, buffer, mime, meta = {}) {
  if (buffer.length > KNOWLEDGE_MAX_BYTES) throw bad('文件超过 10MB 限制');
  const ext = path.extname(name).toLowerCase();
  const id = randomId('doc');
  const dir = path.join(KNOWLEDGE_ROOT, company.id);
  fs.mkdirSync(dir, { recursive: true });
  const rawPath = path.join(dir, `${id}${ext || '.bin'}`);
  const textPath = path.join(dir, `${id}.txt`);
  fs.writeFileSync(rawPath, buffer);
  let text;
  try {
    text = knowledgeExt(rawPath, name);
  } catch (error) {
    fs.rmSync(rawPath, { force: true });
    throw error;
  }
  if (!String(text || '').trim()) {
    fs.rmSync(rawPath, { force: true });
    throw bad('没有从文件中提取到文本');
  }
  fs.writeFileSync(textPath, String(text).slice(0, 1_000_000), 'utf8');
  const effectiveAt = Number(meta.effectiveAt) > 0 ? Number(meta.effectiveAt) : now();
  const authority = ['official', 'department', 'personal'].includes(meta.authority) ? meta.authority : 'normal';
  const doc = {
    id,
    companyId: company.id,
    groupId: groupId || null,
    name: cleanFileName(name) || `知识文档${ext}`,
    mime: String(mime || '').slice(0, 120),
    size: buffer.length,
    createdBy: auth.employee.id,
    createdAt: now(),
    version: String(meta.version || '').trim().slice(0, 40),
    effectiveAt,
    authority,
    rawPath,
    textPath,
    chunks: knowledgeChunks(text).length,
  };
  db.data.knowledgeDocs.push(doc);
  KNOWLEDGE_TEXT_CACHE.delete(doc.id);
  knowledgeExtractGraph(company.id, doc, text);
  return doc;
}

function knowledgeDocView(doc) {
  return {
    id: doc.id,
    groupId: doc.groupId,
    name: doc.name,
    mime: doc.mime,
    size: doc.size,
    chunks: doc.chunks,
    version: doc.version || '',
    effectiveAt: doc.effectiveAt || null,
    authority: doc.authority || 'normal',
    supersedes: doc.supersedes || null,
    supersededBy: doc.supersededBy || null,
    createdAt: doc.createdAt,
    createdByName: memberName(doc.createdBy),
  };
}

function postSystemMessage(company, group, text, options = {}) {
  if (!db.group(group.id)) return;
  const message = {
    id: randomId('msg'),
    companyId: company.id,
    groupId: group.id,
    seq: ++group.seq,
    text,
    authorId: db.aiMember(company.id)?.id ?? company.id,
    kind: options.kind || 'system',
    runId: options.runId,
    activity: options.activity,
    createdAt: now(),
  };
  db.data.messages.push(message);
  if (message.kind !== 'activity') {
    broadcastGroupEvent(group.id, 'message', { message: messageView(message) });
  }
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
        '回答时优先使用系统提供的知识库检索资料，并标注来源文件名；资料不足时明确说明。',
        '不要编造没有发生的事。',
        await knowledgePrompt(company, group, trigger.text),
      ].filter(Boolean).join('\n'),
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

function hostTokenOk(req) {
  const expected = String(process.env.COMPANY_HOST_TOKEN || '');
  if (!expected) return false;
  return req.headers['x-company-host-token'] === expected;
}

function approvalShort(id) {
  return String(id).slice(-6);
}

function expireApproval(approval) {
  if (approval.status === 'pending' && now() > approval.expiresAt) {
    approval.status = 'expired';
    approval.decidedAt = now();
    return true;
  }
  return false;
}

function approvalSystemMessage(company, group, approval, text) {
  if (!db.group(group.id)) return;
  const message = {
    id: randomId('msg'),
    companyId: company.id,
    groupId: group.id,
    seq: ++group.seq,
    text,
    authorId: db.aiMember(company.id)?.id ?? approval.requestedBy,
    kind: 'system',
    approvalId: approval.id,
    createdAt: now(),
  };
  db.data.messages.push(message);
  broadcastGroupEvent(group.id, 'message', { message: messageView(message) });
}

function announceApproval(company, group, approval) {
  const reason = approval.reason ? `：${approval.reason}` : '';
  approvalSystemMessage(
    company,
    group,
    approval,
    `⚠️ AI 主机请求执行「${approval.toolName}」${reason}\n审批编号 ${approvalShort(approval.id)}；点击下方按钮，或由管理员/提出者回复「允许 ${approvalShort(approval.id)}」/「拒绝 ${approvalShort(approval.id)}」，5 分钟后自动拒绝。`,
  );
}

function decideApproval(approval, employee, decision) {
  if (!approval || approval.status !== 'pending') return null;
  if (expireApproval(approval)) return approval;
  const group = db.group(approval.groupId);
  if (!group) return null;
  const allowed = employee.role === 'admin' || employee.id === approval.requestedBy;
  if (!allowed) throw forbidden('只有管理员或任务提出者可以审批');
  approval.status = decision === 'allow' ? 'approved' : 'rejected';
  approval.decidedBy = employee.id;
  approval.decidedAt = now();
  announceDecision(group, approval, employee);
  broadcastGroupEvent(group.id, 'approval', { approval: approvalView(approval) });
  return approval;
}

function announceDecision(group, approval, employee) {
  const company = db.company(approval.companyId);
  if (!company) return;
  approvalSystemMessage(
    company,
    group,
    approval,
    `审批 ${approvalShort(approval.id)} ${approval.status === 'approved' ? '已允许' : '已拒绝'}（${employee.name}）。`,
  );
}

function expirePendingApprovals() {
  let changed = false;
  for (const approval of db.data.approvals) {
    if (approval.status !== 'pending') continue;
    if (!expireApproval(approval)) continue;
    const group = db.group(approval.groupId);
    const company = db.company(approval.companyId);
    if (group && company) {
      approvalSystemMessage(company, group, approval, `审批 ${approvalShort(approval.id)} 超时，已自动拒绝。`);
      broadcastGroupEvent(group.id, 'approval', { approval: approvalView(approval) });
    }
    changed = true;
  }
  if (changed) db.save().catch((error) => console.error('[company-hub] 审批超时保存失败', error));
}

function createApprovalRecord(company, group, requesterRef, toolName, reason, callId) {
  const requester = typeof requesterRef === 'string' ? db.employee(requesterRef) : requesterRef;
  const approval = {
    id: randomId('apr'),
    companyId: company.id,
    groupId: group.id,
    requestedBy: requester?.id ?? '',
    toolName: String(toolName || '工具调用').slice(0, 120),
    reason: String(reason || '').slice(0, 500),
    callId: String(callId || '').slice(0, 120),
    status: 'pending',
    createdAt: now(),
    expiresAt: now() + 300_000,
  };
  db.data.approvals.push(approval);
  announceApproval(company, group, approval);
  db.save().catch((error) => console.error('[company-hub] 审批保存失败', error));
  return approval;
}

function waitApprovalDecision(approval) {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      expireApproval(approval);
      if (approval.status !== 'pending' || Date.now() - started > 305_000) {
        clearInterval(timer);
        resolve(approval.status === 'approved' ? 'allowed-once' : 'rejected');
      }
    }, 500);
  });
}

function clip(value, max = 500) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

class AcpConnection {
  constructor(child, handlers) {
    this.child = child;
    this.handlers = handlers;
    this.pending = new Map();
    this.nextId = 1;
    this.closed = false;
    const lines = readline.createInterface({ input: child.stdout });
    lines.on('line', (line) => this.onLine(line));
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.trim()) console.log('[company-hub] ACP:', text.trim().slice(0, 500));
    });
    child.on('exit', (code, signal) => {
      this.closed = true;
      for (const pending of this.pending.values()) pending.reject(new Error(`ACP 退出 ${code ?? signal}`));
      this.pending.clear();
      this.handlers.onExit?.(code, signal);
    });
  }

  send(message) {
    if (this.closed) throw new Error('ACP 连接已关闭');
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params, timeoutMs = 30_000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = timeoutMs
        ? setTimeout(() => {
            this.pending.delete(id);
            reject(new Error(`ACP ${method} 超时`));
          }, timeoutMs)
        : null;
      this.pending.set(id, {
        resolve: (value) => {
          if (timer) clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          if (timer) clearTimeout(timer);
          reject(error);
        },
      });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  async onLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.method && message.id !== undefined) {
      try {
        const result = await this.handlers.onRequest(message.method, message.params);
        this.send({ jsonrpc: '2.0', id: message.id, result: result ?? {} });
      } catch (error) {
        this.send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: String(error.message || error) } });
      }
      return;
    }
    if (message.method) {
      if (message.method === 'session/update') this.handlers.onUpdate(message.params);
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || 'ACP 错误'));
    else pending.resolve(message.result);
  }
}

const ACP_HOSTS = new Map();

class AcpHost {
  constructor(company, group) {
    this.company = company;
    this.group = group;
    this.connection = null;
    this.sessionId = null;
    this.queue = Promise.resolve();
    this.runState = null;
  }

  async ensure() {
    if (this.connection && !this.connection.closed && this.sessionId) return this.connection;
    const workspace = dshHostWorkspace(this.company, this.group);
    const cli = process.env.DSH_HOST_BIN || '/opt/dsh-host/node_modules/@deepseek-ai/dsh/lib/bin.js';
    const home = process.env.DSH_HOST_HOME || '/var/lib/dsh-host/home';
    if (!fs.existsSync(cli)) throw new Error(`DSH host CLI 不存在：${cli}`);
    const child = spawn(process.execPath, [cli, '--profile', 'acp'], {
      cwd: workspace,
      env: {
        ...process.env,
        DSH_HOME: home,
        DSH_PERMISSION_MODE: process.env.DSH_HOST_PERMISSION_MODE || 'workspace-write',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.connection = new AcpConnection(child, {
      onUpdate: (params) => this.onUpdate(params),
      onRequest: (method, params) => this.onRequest(method, params),
      onExit: () => {
        this.connection = null;
        this.sessionId = null;
      },
    });
    await this.connection.request('initialize', {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } },
    });
    const session = await this.connection.request('session/new', { cwd: workspace, mcpServers: [] });
    this.sessionId = session.sessionId;
    await this.applyReasoning(session.configOptions).catch((error) => {
      console.log('[company-hub] ACP 设置 reasoning_effort 失败', String(error.message || error));
    });
    return this.connection;
  }

  async applyReasoning(configs) {
    const option = (Array.isArray(configs) ? configs : []).find(
      (entry) => entry?.type === 'select' && /reason/i.test(`${entry.id} ${entry.name}`),
    );
    if (!option) return;
    const values = Array.isArray(option.options)
      ? option.options.flatMap((item) => (Array.isArray(item?.options) ? item.options : [item]))
      : [];
    const preferred =
      values.find((item) => /^(high|max)$/i.test(String(item?.value))) ??
      values.find((item) => /medium/i.test(String(item?.value)));
    if (!preferred || preferred.value === option.currentValue) return;
    await this.connection.request('session/set_config_option', {
      sessionId: this.sessionId,
      configId: option.id,
      value: preferred.value,
    });
  }

  prompt(text, trigger) {
    this.queue = this.queue
      .then(() => this.run(text, trigger))
      .catch((error) => {
        console.error('[company-hub] ACP prompt 失败', error);
        postSystemMessage(this.company, this.group, `AI 执行失败：${clip(String(error.message || error), 300)}`);
      });
    return this.queue;
  }

  async run(text, trigger) {
    const connection = await this.ensure();
    this.runState = { runId: randomId('run'), thought: '', answer: '', triggeredBy: trigger.authorId, tools: new Map() };
    broadcastGroupEvent(this.group.id, 'run', { runId: this.runState.runId, kind: 'start' });
    const members = db
      .companyEmployees(this.company.id)
      .filter((entry) => !entry.isAi)
      .map((entry) => entry.name)
      .join('、');
    const prompt = [
      `（群聊：公司「${this.company.name}」/ 群「${this.group.name}」；成员：${members || '成员'}；发送者：${db.employee(trigger.authorId)?.name ?? '成员'}）`,
      '你是这个群的 AI 助理，运行在服务器 DSH 主机，拥有完整工具。直接回答；需要改文件/命令就执行，敏感操作会请求群审批。',
      '',
      await knowledgePrompt(this.company, this.group, text),
      '',
      text,
    ].filter(Boolean).join('\n');
    await connection.request('session/prompt', {
      sessionId: this.sessionId,
      prompt: [{ type: 'text', text: prompt }],
    }, 0);
    const state = this.runState;
    this.runState = null;
    if (!state || !db.group(this.group.id)) return;
    const answer = state.answer.trim() || '（AI 没有返回文本内容）';
    const finalMessage = {
      id: randomId('msg'),
      companyId: this.company.id,
      groupId: this.group.id,
      seq: ++this.group.seq,
      text: answer,
      authorId: db.aiMember(this.company.id)?.id ?? trigger.authorId,
      kind: 'text',
      runId: state.runId,
      createdAt: now(),
    };
    db.data.messages.push(finalMessage);
    await db.save();
    broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'done' });
    broadcastGroupEvent(this.group.id, 'message', { message: messageView(finalMessage) });
  }

  onUpdate(params) {
    const update = params?.update;
    const state = this.runState;
    if (!update || !state) return;
    if (update.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') {
      state.answer += update.content.text;
      broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'answer_delta', text: update.content.text });
      return;
    }
    if (update.sessionUpdate === 'agent_thought_chunk' && update.content?.type === 'text') {
      broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'thought_delta', text: update.content.text });
      if (!state.thought) {
        postSystemMessage(this.company, this.group, '💭 思考', {
          kind: 'activity',
          runId: state.runId,
          activity: { type: 'thought', title: '思考', detail: clip(update.content.text, 300), status: 'running' },
        });
      }
      state.thought += update.content.text;
      if (state.thought.length > 20_000) state.thought = state.thought.slice(-20_000);
      return;
    }
    if (update.sessionUpdate === 'tool_call') {
      const title = update.title || update.name || '工具调用';
      state.tools.set(update.toolCallId, { title, rawInput: update.rawInput });
      const toolActivity = {
        type: 'tool',
        title: clip(title, 200),
        detail: update.rawInput === undefined ? '' : clip(update.rawInput, 400),
        status: 'running',
        toolCallId: update.toolCallId,
      };
      postSystemMessage(this.company, this.group, `🔧 ${clip(title, 200)}`, {
        kind: 'activity',
        runId: state.runId,
        activity: toolActivity,
      });
      broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'activity', activity: toolActivity });
      return;
    }
    if (update.sessionUpdate === 'tool_call_update' && (update.status === 'completed' || update.status === 'failed')) {
      const resultText = Array.isArray(update.content)
        ? update.content.map((item) => (item.type === 'content' && item.content?.type === 'text' ? item.content.text : '')).filter(Boolean).join('\n')
        : '';
      const title = update.title || state.tools.get(update.toolCallId)?.title || update.toolCallId || '工具调用';
      const toolResult = {
        type: 'tool',
        title: clip(title, 200),
        detail: clip(resultText, 600),
        status: update.status === 'completed' ? 'completed' : 'failed',
        toolCallId: update.toolCallId,
      };
      postSystemMessage(this.company, this.group, `${update.status === 'completed' ? '✅' : '⚠️'} ${clip(title, 200)}`, {
        kind: 'activity',
        runId: state.runId,
        activity: toolResult,
      });
      broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'activity', activity: toolResult });
      return;
    }
    if (update.sessionUpdate === 'plan' && Array.isArray(update.entries)) {
      const lines = update.entries.map((entry) => `- [${entry.status}] ${entry.content}`).join('\n');
      if (lines) {
        const planActivity = { type: 'plan', title: '计划', detail: clip(lines, 800), status: 'done' };
        postSystemMessage(this.company, this.group, '📋 计划', {
          kind: 'activity',
          runId: state.runId,
          activity: planActivity,
        });
        broadcastGroupEvent(this.group.id, 'run', { runId: state.runId, kind: 'activity', activity: planActivity });
      }
    }
  }

  async onRequest(method, params) {
    if (method !== 'session/request_permission') throw new Error(`不支持的 ACP 请求：${method}`);
    const state = this.runState;
    if (!state) return { outcome: { outcome: 'cancelled' } };
    const tool = params?.toolCall ?? {};
    const known = state.tools.get(tool.toolCallId) ?? {};
    const title = tool.title || tool.name || known.title || tool.rawInput?.description || '工具调用';
    const reasonSource = tool.rawInput ?? known.rawInput;
    const reason = reasonSource === undefined ? '' : clip(reasonSource, 500);
    const approval = createApprovalRecord(this.company, this.group, state.triggeredBy, title, reason, tool.toolCallId);
    const outcome = await waitApprovalDecision(approval);
    await db.save().catch(() => {});
    const options = Array.isArray(params?.options) ? params.options : [];
    if (outcome !== 'allowed-once') {
      const reject = options.find((option) => option.kind === 'reject_once' || option.kind === 'reject_always') ?? options.at(-1);
      if (reject) return { outcome: { outcome: 'selected', optionId: reject.optionId } };
      return { outcome: { outcome: 'cancelled' } };
    }
    const allow = options.find((option) => option.kind === 'allow_once' || option.kind === 'allow_always') ?? options[0];
    if (!allow) return { outcome: { outcome: 'cancelled' } };
    return { outcome: { outcome: 'selected', optionId: allow.optionId } };
  }
}

function acpHostFor(company, group) {
  let host = ACP_HOSTS.get(group.id);
  if (!host) {
    host = new AcpHost(company, group);
    ACP_HOSTS.set(group.id, host);
  }
  return host;
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

function initGroupRepo(companyId, groupId, groupName, options = {}) {
  fs.mkdirSync(GIT_ROOT, { recursive: true });
  const relative = groupRepoRelative(companyId, groupId);
  const repoDir = groupRepoPath(relative);
  if (fs.existsSync(repoDir)) return relative;
  const branch = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(String(options.defaultBranch || '').trim())
    ? String(options.defaultBranch).trim()
    : 'main';
  const description = String(options.description || '').trim().slice(0, 300);
  const readme = options.initReadme !== false;
  const ignoreTemplate = ['node', 'python', 'none'].includes(options.gitignore) ? options.gitignore : 'node';
  fs.mkdirSync(repoDir, { recursive: true });
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'AI 助理',
    GIT_AUTHOR_EMAIL: 'ai@company-hub',
    GIT_COMMITTER_NAME: 'AI 助理',
    GIT_COMMITTER_EMAIL: 'ai@company-hub',
  };
  const run = (args, cwd) => spawnSync('git', args, { cwd, env, encoding: 'utf8' });
  let result = run(['init', '--bare', `--initial-branch=${branch}`, repoDir]);
  if (result.status !== 0) throw new Error(result.stderr || 'git init 失败');
  if (!readme && ignoreTemplate === 'none') return relative;
  const seed = fs.mkdtempSync(path.join(GIT_ROOT, '.seed-'));
  try {
    result = run(['init', `--initial-branch=${branch}`], seed);
    if (result.status !== 0) throw new Error(result.stderr || 'git seed init 失败');
    if (readme) {
      fs.writeFileSync(
        path.join(seed, 'README.md'),
        `# ${groupName}\n\n${description || `这是「${groupName}」群的共享 Git 仓库。`}\n\n- 每位成员自行 clone 到本地目录；\n- AI 修改会在分支上测试后合并到 ${branch}；\n- 其他成员同步只需 git pull。\n`,
        'utf8',
      );
    }
    if (ignoreTemplate === 'python') {
      fs.writeFileSync(path.join(seed, '.gitignore'), '__pycache__/\n*.py[cod]\n.venv/\n.env\n.DS_Store\n', 'utf8');
    } else if (ignoreTemplate === 'node') {
      fs.writeFileSync(path.join(seed, '.gitignore'), 'node_modules/\ndist/\n.DS_Store\nThumbs.db\n.env\n', 'utf8');
    }
    run(['add', '.'], seed);
    result = run(['commit', '-m', '初始化群仓库'], seed);
    if (result.status !== 0) throw new Error(result.stderr || 'git seed commit 失败');
    run(['remote', 'add', 'origin', repoDir], seed);
    result = run(['push', 'origin', branch], seed);
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
  if (!group) {
    res.writeHead(404);
    res.end('repository not found');
    return;
  }
  const service = url.searchParams.get('service') || (relative.endsWith('/git-receive-pack') ? 'git-receive-pack' : relative.endsWith('/git-upload-pack') ? 'git-upload-pack' : '');
  const writing = service === 'git-receive-pack';
  const publicRead = !writing && group.visibility === 'public';
  const credentials = parseBasicAuth(req);
  const employee = credentials ? db.employee(credentials.username) : null;
  const validToken = Boolean(employee && employee.gitTokenHash && employee.gitTokenHash === gitTokenHash(employee.id, credentials.password));
  if (writing || !publicRead) {
    if (!validToken) {
      res.writeHead(401, { 'www-authenticate': 'Basic realm="company-git"' });
      res.end('authentication required');
      return;
    }
    if (!group.memberIds.includes(employee.id)) {
      res.writeHead(403);
      res.end('not a group member');
      return;
    }
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
    REMOTE_USER: validToken ? employee.id : 'anonymous',
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
        visibility: group.visibility === 'public' ? 'public' : 'private',
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

route('POST', /^\/api\/host\/approvals$/, async (req) => {
  if (!hostTokenOk(req)) throw forbidden('Host token 无效');
  const body = await readJsonBody(req);
  const company = db.company(str(body.companyId, 'companyId', { max: 80 }));
  if (!company) throw notFound('公司不存在');
  const group = db.group(str(body.groupId, 'groupId', { max: 80 }));
  if (!group || group.companyId !== company.id) throw notFound('群组不存在');
  const requester = db.employee(str(body.requestedBy, 'requestedBy', { max: 80 }));
  if (!requester || !group.memberIds.includes(requester.id)) throw bad('提出者不是群成员');
  const toolName = str(body.toolName || '工具调用', 'toolName', { max: 120 });
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
  const approval = {
    id: randomId('apr'),
    companyId: company.id,
    groupId: group.id,
    requestedBy: requester.id,
    toolName,
    reason,
    callId: typeof body.callId === 'string' ? body.callId.slice(0, 120) : '',
    status: 'pending',
    createdAt: now(),
    expiresAt: now() + 300_000,
  };
  db.data.approvals.push(approval);
  announceApproval(company, group, approval);
  await db.save();
  return {
    id: approval.id,
    status: approval.status,
    expiresAt: approval.expiresAt,
  };
});

route('GET', /^\/api\/host\/approvals\/([a-z0-9_]+)$/, async (req) => {
  if (!hostTokenOk(req)) throw forbidden('Host token 无效');
  const id = /^\/api\/host\/approvals\/([a-z0-9_]+)$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)[1];
  const approval = db.data.approvals.find((entry) => entry.id === id);
  if (!approval) throw notFound('审批不存在');
  if (expireApproval(approval)) await db.save();
  return { id: approval.id, status: approval.status, expiresAt: approval.expiresAt };
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

route('POST', /^\/api\/ai\/rename$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const name = str(body.name, 'AI 助理名称', { max: 40 });
  const ai = db.aiMember(auth.company.id);
  if (!ai) throw notFound('AI 助理不存在');
  const clash = db
    .companyEmployees(auth.company.id)
    .some((entry) => entry.id !== ai.id && entry.name === name);
  if (clash) throw bad('公司里已有同名成员，换一个名字');
  ai.name = name;
  await db.save();
  return { employee: publicEmployee(ai) };
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

route('GET', /^\/api\/knowledge$/, async (req) => {
  const auth = authenticate(req);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const groupId = url.searchParams.get('groupId') || null;
  if (groupId) {
    const group = db.group(groupId);
    if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) throw notFound('群组不存在');
  }
  const items = db
    .data.knowledgeDocs
    .filter((doc) => doc.companyId === auth.company.id && (groupId ? doc.groupId === null || doc.groupId === groupId : doc.groupId === null))
    .sort((left, right) => right.createdAt - left.createdAt)
    .map(knowledgeDocView);
  return { items };
});

route('POST', /^\/api\/knowledge$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const name = str(body.name, '文件名', { max: 160 });
  const groupId = body.groupId ? String(body.groupId) : null;
  if (groupId) {
    const group = db.group(groupId);
    if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) throw notFound('群组不存在');
  }
  const raw = typeof body.dataBase64 === 'string' ? body.dataBase64 : '';
  if (!raw) throw bad('缺少文件内容');
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) throw bad('文件为空');
  const existing = db.data.knowledgeDocs.find(
    (entry) =>
      entry.companyId === auth.company.id &&
      entry.groupId === groupId &&
      entry.name === cleanFileName(name) &&
      !entry.supersededBy,
  );
  const doc = saveKnowledgeDoc(auth.company, auth, groupId, name, buffer, body.mime, {
    version: body.version,
    effectiveAt: body.effectiveAt,
    authority: body.authority,
  });
  if (existing && existing.id !== doc.id) {
    doc.supersedes = existing.id;
    existing.supersededBy = doc.id;
  }
  await db.save();
  await enrichKnowledgeGraphWithLlm(auth.company, doc, knowledgeTextFor(doc));
  await indexKnowledgeDoc(doc);
  await db.save();
  return { doc: knowledgeDocView(doc) };
});

route('DELETE', /^\/api\/knowledge\/([a-z0-9_]+)$/, async (req) => {
  const auth = authenticate(req);
  const match = /^\/api\/knowledge\/([a-z0-9_]+)$/.exec(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  const doc = db.data.knowledgeDocs.find((entry) => entry.id === match[1] && entry.companyId === auth.company.id);
  if (!doc) throw notFound('知识文档不存在');
  db.data.knowledgeDocs = db.data.knowledgeDocs.filter((entry) => entry.id !== doc.id);
  db.data.knowledgeVectors = (db.data.knowledgeVectors ?? []).filter((entry) => entry.docId !== doc.id);
  db.data.knowledgeRelations = (db.data.knowledgeRelations ?? []).filter((relation) => relation.docId !== doc.id);
  const activeRelations = new Set(
    (db.data.knowledgeRelations ?? []).flatMap((relation) => [relation.subjectId, relation.objectId]),
  );
  db.data.knowledgeEntities = (db.data.knowledgeEntities ?? []).filter(
    (entity) => activeRelations.has(entity.id) || (entity.aliases ?? []).length > 0,
  );
  KNOWLEDGE_TEXT_CACHE.delete(doc.id);
  for (const file of [doc.rawPath, doc.textPath]) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // ignore
    }
  }
  await db.save();
  return { removed: true };
});

route('GET', /^\/api\/knowledge\/entities$/, async (req) => {
  const auth = authenticate(req);
  const items = (db.data.knowledgeEntities ?? [])
    .filter((entity) => entity.companyId === auth.company.id)
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      aliases: entity.aliases ?? [],
      type: entity.type,
      relations: (db.data.knowledgeRelations ?? [])
        .filter((relation) => relation.companyId === auth.company.id && (relation.subjectId === entity.id || relation.objectId === entity.id))
        .slice(0, 20)
        .map((relation) => {
          const subject = db.data.knowledgeEntities.find((entry) => entry.id === relation.subjectId);
          const object = db.data.knowledgeEntities.find((entry) => entry.id === relation.objectId);
          return subject && object ? { subject: subject.name, predicate: relation.predicate, object: object.name } : null;
        })
        .filter(Boolean),
    }));
  return { items };
});

route('POST', /^\/api\/knowledge\/entities\/alias$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const alias = str(body.alias, '别名', { max: 40 });
  const canonical = str(body.canonical, '实体名', { max: 40 });
  if (alias === canonical) throw bad('别名和实体名不能相同');
  const entity = knowledgeUpsertEntity(auth.company.id, canonical);
  const other = knowledgeFindEntity(auth.company.id, alias);
  if (other && other.id !== entity.id) {
    for (const name of [other.name, ...(other.aliases ?? [])]) {
      if (name !== entity.name && !entity.aliases.includes(name)) entity.aliases.push(name);
    }
    for (const relation of db.data.knowledgeRelations ?? []) {
      if (relation.subjectId === other.id) relation.subjectId = entity.id;
      if (relation.objectId === other.id) relation.objectId = entity.id;
    }
    db.data.knowledgeEntities = db.data.knowledgeEntities.filter((entry) => entry.id !== other.id);
  }
  if (!entity.aliases.includes(alias)) entity.aliases.push(alias);
  await db.save();
  return { entity: { id: entity.id, name: entity.name, aliases: entity.aliases } };
});

route('POST', /^\/api\/knowledge\/reindex$/, async (req) => {
  const auth = authenticate(req);
  const docs = (db.data.knowledgeDocs ?? []).filter((doc) => doc.companyId === auth.company.id && !doc.supersededBy);
  for (const doc of docs) {
    const text = knowledgeTextFor(doc);
    knowledgeExtractGraph(auth.company.id, doc, text);
    await enrichKnowledgeGraphWithLlm(auth.company, doc, text);
    await indexKnowledgeDoc(doc);
  }
  await db.save();
  return { indexed: docs.length, entities: (db.data.knowledgeEntities ?? []).filter((entity) => entity.companyId === auth.company.id).length };
});

route('POST', /^\/api\/knowledge\/search$/, async (req) => {
  const auth = authenticate(req);
  const body = await readJsonBody(req);
  const query = str(body.query, '检索词', { max: 1000 });
  const groupId = body.groupId ? String(body.groupId) : null;
  if (groupId) {
    const group = db.group(groupId);
    if (!group || group.companyId !== auth.company.id || !group.memberIds.includes(auth.employee.id)) throw notFound('群组不存在');
  }
  return { items: await searchKnowledge(auth.company.id, groupId, query, Number(body.limit) || 5) };
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
    visibility: body.repo?.visibility === 'public' ? 'public' : 'private',
  };
  group.repoPath = initGroupRepo(auth.company.id, group.id, name, body.repo && typeof body.repo === 'object' ? body.repo : {});
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
  db.data.approvals = db.data.approvals.filter((entry) => entry.groupId !== groupId);
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
  const aiName = String(ai?.name || '').trim();
  const nameMention = Boolean(aiName && (text.includes(`@${aiName}`) || text.includes(`@ ${aiName}`)));
  const mentioned = author.isAi === false && (nameMention || /@\s*ai\b|@\s*AI\b|@\s*Ai\b|AI\s*助理/i.test(text));
  const approvalMatch = author.isAi === false ? /^\s*(允许|批准|拒绝|approve|reject)\s+([a-z0-9]{6})\s*$/i.exec(text) : null;
  if (approvalMatch) {
    const approval = db.data.approvals
      .filter((entry) => entry.groupId === group.id && entry.id.endsWith(approvalMatch[2]))
      .at(-1);
    if (!approval) throw notFound('找不到这个审批');
    if (expireApproval(approval)) {
      await db.save();
      return { approval: { id: approval.id, status: approval.status } };
    }
    const decision = /^(允许|批准|approve)$/i.test(approvalMatch[1]) ? 'allow' : 'deny';
    decideApproval(approval, auth.employee, decision);
    await db.save();
    return { approval: { id: approval.id, status: approval.status } };
  }
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
  await db.save();
  broadcastGroupEvent(group.id, 'message', { message: messageView(message) });
  if (mentioned) {
    scheduleChatReply(auth.company, group, message);
  }
  return { message: messageView(message) };
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


// ---------------------------------------------------------------- server

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  if (pathname.startsWith('/git/')) {
    serveGit(req, res, url);
    return;
  }
  if (req.method === 'GET' && /^\/api\/groups\/[a-z0-9_]+\/events$/.test(pathname)) {
    try {
      serveGroupEvents(req, res, url);
    } catch (error) {
      if (!res.headersSent) sendError(res, error);
      else res.end();
    }
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
        pathname.startsWith('/api/host/') ||
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
setInterval(expirePendingApprovals, 10_000).unref();

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
