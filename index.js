/**
 * 企业协作 · Host 半部
 *
 * 职责：
 *  1. 保存本机的公司身份、服务器地址与同步游标（$DSH_HOME/storages/company-collab）；
 *  2. 通过 HTTP 与「用户自托管的 company-hub 服务器」通信（账号、通讯录、群组、任务）；
 *  3. AI 工作区同步：把本机工作区目录与服务器清单对齐（新增/修改/冲突）；
 *  4. 提供给 Web 界面的同源 JSON 接口（/company-collab/api/*）；
 *  5. 注册 agent 工具 company_hub，让 DSH 里的 AI 以「AI 同事」身份读群、回群、写工作区。
 *
 * 服务器由用户自行提供并运行：server/company-hub-server.mjs。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const inject = ['webServer', 'tools', 'systemPrompt'];

const ROUTE_PREFIX = '/company-collab/api';

const dshHome = () => process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const dataDir = () => path.join(dshHome(), 'storages', 'company-collab');
const statePath = () => path.join(dataDir(), 'state.json');

/** Resolve the signed-in DSH account, falling back to the OS user when unavailable. */
async function resolveAccountIdentity(ctx) {  const account = ctx?.get?.('deepseekAccount');
  const clientVersion = process.env.DSH_CLIENT_VERSION || '';
  let profileState = 'unavailable';
  if (account && typeof account.getProfile === 'function' && clientVersion) {
    try {
      const result = await account.getProfile({
        version: clientVersion,
        locale: 'zh',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });
      const profile = result && result.status === 'ready' ? result.value : null;
      if (profile && profile.id) {
        return {
          externalId: `dsh:${profile.id}`,
          name: profile.name || profile.contact || '成员',
          contact: profile.contact || '',
          source: 'dsh',
          profileState: 'ok',
        };
      }
      profileState = result === null ? 'signed-out' : `status:${result?.status ?? 'unknown'}`;
    } catch (error) {
      profileState = `error:${textOf(error).slice(0, 80)}`;
    }
  }
  let username = 'member';
  try {
    username = os.userInfo().username || username;
  } catch {
    /* keep the generic name */
  }
  return { externalId: `local:${username}`, name: username, contact: '', source: 'local', profileState };
}

const now = () => Date.now();
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const textOf = (error) => (error instanceof Error ? error.message : String(error));

class HubError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------- local state

function defaultState() {
  return {
    version: 2,
    serverUrl: '',
    identity: null,
    deviceSecrets: {},
    gitToken: '',
    groupRepos: {},
    accounts: [],
    activeAccount: '',
  };
}

function loadState() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      deviceSecrets: parsed.deviceSecrets && typeof parsed.deviceSecrets === 'object' ? parsed.deviceSecrets : {},
      gitToken: typeof parsed.gitToken === 'string' ? parsed.gitToken : '',
      groupRepos: parsed.groupRepos && typeof parsed.groupRepos === 'object' ? parsed.groupRepos : {},
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.filter((entry) => entry && entry.identity && entry.serverUrl) : [],
      activeAccount: typeof parsed.activeAccount === 'string' ? parsed.activeAccount : '',
    };
  } catch {
    return defaultState();
  }
}

function saveState(next) {
  const file = statePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temp, file);
}

// ---------------------------------------------------------------- engine

class CompanyHub {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = loadState();
    this.account = null;
    this.remote = null;
    this.remoteAt = 0;
    this.connection = { status: 'idle', message: '', checkedAt: 0 };
    this.serverInfo = null;
    this.linkAttempted = '';
    if (this.state.identity && this.state.serverUrl && !this.state.activeAccount) {
      this.saveCurrentAccount();
    }
  }

  async refreshAccount(force = false) {
    if (!force && this.account && now() - this.account.at < 60_000) return this.account;
    const identity = await resolveAccountIdentity(this.ctx);
    this.account = { ...identity, at: now() };
    return this.account;
  }

  // ---- settings

  get configured() {
    return Boolean(this.state.serverUrl && this.state.identity);
  }

  async configure(serverUrl) {
    const trimmed = String(serverUrl || '').trim().replace(/\/+$/, '');
    if (!trimmed) throw new HubError('请填写服务器地址，例如 http://127.0.0.1:8477');
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      throw new HubError('服务器地址格式不正确');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new HubError('服务器地址需以 http:// 或 https:// 开头');
    if (this.state.serverUrl && this.state.serverUrl !== trimmed && this.state.identity) {
      // A different server means a different company; keeping the old login would mix data.
      this.saveCurrentAccount();
      this.state.identity = null;
      this.state.gitToken = '';
      this.state.groupRepos = {};
      this.state.deviceSecrets = {};
      this.remote = null;
      this.remoteAt = 0;
    }
    this.state.serverUrl = trimmed;
    saveState(this.state);
    try {
      this.serverInfo = await this.fetchJson('GET', '/health', undefined, false);
      this.connection = { status: 'ok', message: '已连接', checkedAt: now() };
    } catch (error) {
      this.connection = { status: 'error', message: `无法连接服务器：${textOf(error)}`, checkedAt: now() };
      throw new HubError(this.connection.message);
    }
    return this.snapshot();
  }

  async fetchJson(method, apiPath, body, auth = true, timeoutMs = 10_000) {
    const base = this.state.serverUrl;
    if (!base) throw new HubError('尚未配置服务器');
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth) {
      if (!this.state.identity) throw new HubError('尚未登录公司账号');
      headers.authorization = `Bearer ${this.state.identity.token}`;
    }
    let response;
    try {
      response = await fetch(`${base}${apiPath}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.connection = { status: 'error', message: `服务器无响应：${textOf(error)}`, checkedAt: now() };
      throw new HubError(this.connection.message);
    }
    const raw = await response.text();
    let json;
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      throw new HubError(`服务器返回了无法解析的数据（HTTP ${response.status}）`, response.status);
    }
    if (!response.ok || json.ok === false) {
      const message = json?.error?.message ?? `请求失败（HTTP ${response.status}）`;
      if (response.status === 401 && auth) {
        this.connection = { status: 'error', message: '登录状态已失效，请重新登录', checkedAt: now() };
      } else {
        this.connection = { status: 'error', message, checkedAt: now() };
      }
      throw new HubError(message, response.status);
    }
    this.connection = { status: 'ok', message: '', checkedAt: now() };
    return json;
  }

  async pipeEvents(groupId, req, res) {
    const base = this.state.serverUrl;
    if (!base) throw new HubError('尚未配置服务器');
    if (!this.state.identity) throw new HubError('尚未登录公司账号');
    const controller = new AbortController();
    const abort = () => controller.abort();
    req.on('close', abort);
    let response;
    try {
      response = await fetch(`${base}/api/groups/${encodeURIComponent(groupId)}/events`, {
        headers: { accept: 'text/event-stream', authorization: `Bearer ${this.state.identity.token}` },
        signal: controller.signal,
      });
    } catch (error) {
      req.off('close', abort);
      throw new HubError(`事件流连接失败：${textOf(error)}`);
    }
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      req.off('close', abort);
      throw new HubError(`事件流失败（HTTP ${response.status}）${text ? `：${text.slice(0, 200)}` : ''}`, response.status);
    }
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) await new Promise((resolve) => res.once('drain', resolve));
        if (res.writableEnded) break;
      }
    } finally {
      req.off('close', abort);
      reader.cancel().catch(() => {});
      if (!res.writableEnded) res.end();
    }
  }

  // ---- account

  accountKey(serverUrl = this.state.serverUrl, identity = this.state.identity) {
    if (!serverUrl || !identity?.company?.id) return '';
    return `${String(serverUrl).replace(/\/+$/, '')}|${identity.company.id}`;
  }

  saveCurrentAccount() {
    const key = this.accountKey();
    if (!key) return;
    const entry = {
      key,
      serverUrl: this.state.serverUrl,
      identity: this.state.identity,
      gitToken: this.state.gitToken || '',
      groupRepos: this.state.groupRepos || {},
      deviceSecrets: this.state.deviceSecrets || {},
    };
    const accounts = Array.isArray(this.state.accounts) ? this.state.accounts : [];
    this.state.accounts = [...accounts.filter((item) => item.key !== key), entry];
    this.state.activeAccount = key;
    saveState(this.state);
  }

  persistCurrentAccount() {
    this.saveCurrentAccount();
  }

  async switchAccount(key) {
    if (!key) throw new HubError('请选择公司');
    const target = (this.state.accounts || []).find((entry) => entry.key === key);
    if (!target) throw new HubError('找不到这个公司配置');
    this.saveCurrentAccount();
    this.state.serverUrl = target.serverUrl;
    this.state.identity = target.identity;
    this.state.gitToken = target.gitToken || '';
    this.state.groupRepos = target.groupRepos || {};
    this.state.deviceSecrets = target.deviceSecrets || {};
    this.state.activeAccount = key;
    this.remote = null;
    this.remoteAt = 0;
    this.serverInfo = null;
    this.connection = { status: 'idle', message: '', checkedAt: 0 };
    saveState(this.state);
    try {
      this.serverInfo = await this.fetchJson('GET', '/health', undefined, false);
      this.connection = { status: 'ok', message: '已连接', checkedAt: now() };
    } catch (error) {
      this.connection = { status: 'error', message: String(error.message || error), checkedAt: now() };
    }
    await this.refresh(true).catch(() => {});
    this.persistCurrentAccount();
    return this.snapshot();
  }

  async loginOnServer(serverUrl, companyId, employeeName, accessCode) {
    const previous = this.state.activeAccount;
    this.saveCurrentAccount();
    try {
      await this.configure(serverUrl);
      this.state.gitToken = '';
      this.state.groupRepos = {};
      this.state.deviceSecrets = {};
      await this.login(companyId, employeeName, accessCode);
      this.persistCurrentAccount();
      return this.snapshot();
    } catch (error) {
      if (previous && (this.state.accounts || []).some((entry) => entry.key === previous)) {
        await this.switchAccount(previous).catch(() => {});
      }
      throw error;
    }
  }

  async createCompanyOnServer(serverUrl, companyName, employeeName) {
    const previous = this.state.activeAccount;
    this.saveCurrentAccount();
    try {
      await this.configure(serverUrl);
      this.state.gitToken = '';
      this.state.groupRepos = {};
      this.state.deviceSecrets = {};
      await this.createCompany(companyName, employeeName);
      this.persistCurrentAccount();
      return this.snapshot();
    } catch (error) {
      if (previous && (this.state.accounts || []).some((entry) => entry.key === previous)) {
        await this.switchAccount(previous).catch(() => {});
      }
      throw error;
    }
  }

  async createCompany(companyName, employeeName) {
    if (!this.state.serverUrl) throw new HubError('请先填写并连接服务器地址');
    const name = String(companyName || '').trim();
    const person = String(employeeName || '').trim();
    if (!name) throw new HubError('请填写公司名称');
    if (!person) throw new HubError('请填写你的姓名');
    const account = await this.refreshAccount(true);
    const result = await this.fetchJson(
      'POST',
      '/api/companies',
      { companyName: name, employeeName: person, externalId: account.externalId, contact: account.contact },
      false,
    );
    this.state.identity = {
      company: result.company,
      employee: result.employee,
      token: result.token,
      accessCode: result.accessCode,
    };
    if (result.deviceSecret) {
      this.state.deviceSecrets = { ...(this.state.deviceSecrets || {}), [result.company.id]: result.deviceSecret };
    }
    saveState(this.state);
    await this.refresh(true).catch(() => {});
    this.persistCurrentAccount();
    return this.snapshot();
  }

  async searchCompanies(query) {
    if (!this.state.serverUrl) throw new HubError('请先填写并连接服务器地址');
    const result = await this.fetchJson('GET', `/api/companies?q=${encodeURIComponent(query || '')}`, undefined, false);
    return result.items ?? [];
  }

  async joinCompany(companyId) {
    if (!this.state.serverUrl) throw new HubError('请先填写并连接服务器地址');
    const id = String(companyId || '').trim();
    if (!id) throw new HubError('请选择要加入的公司');
    const account = await this.refreshAccount(true);
    const deviceSecret = this.state.deviceSecrets?.[id] ?? '';
    const result = await this.fetchJson(
      'POST',
      `/api/companies/${encodeURIComponent(id)}/join`,
      { externalId: account.externalId, name: account.name, contact: account.contact, deviceSecret },
      false,
    );
    if (result.deviceSecret) {
      this.state.deviceSecrets = { ...(this.state.deviceSecrets || {}), [result.company.id]: result.deviceSecret };
    }
    this.state.identity = { company: result.company, employee: result.employee, token: result.token };
    saveState(this.state);
    await this.refresh(true).catch(() => {});
    this.persistCurrentAccount();
    return this.snapshot();
  }

  async resetEmployee(employeeId) {
    const result = await this.fetchJson('POST', `/api/employees/${encodeURIComponent(employeeId)}/reset-device`, {});
    await this.refresh(true);
    return { employee: result.employee, state: this.snapshot() };
  }

  async renameSelf(name) {
    const value = String(name || '').trim();
    if (!value) throw new HubError('请填写显示名');
    const result = await this.fetchJson('POST', '/api/me/rename', { name: value });
    await this.refresh(true);
    this.persistCurrentAccount();
    return { employee: result.employee, state: this.snapshot() };
  }

  async renameAi(name) {
    const value = String(name || '').trim();
    if (!value) throw new HubError('请填写 AI 助理名称');
    const result = await this.fetchJson('POST', '/api/ai/rename', { name: value });
    await this.refresh(true);
    return { employee: result.employee, state: this.snapshot() };
  }

  async deleteGroup(groupId) {
    const id = String(groupId || '').trim();
    if (!id) throw new HubError('请选择要删除的群组');
    await this.fetchJson('DELETE', `/api/groups/${encodeURIComponent(id)}`);
    if (this.state.groupRepos) delete this.state.groupRepos[id];
    saveState(this.state);
    await this.refresh(true);
    return this.snapshot();
  }

  async heartbeat() {
    if (!this.state.identity || !this.state.serverUrl) return;
    await this.fetchJson('POST', '/api/me/heartbeat', {});
  }

  groupById(groupId) {
    return (this.remote?.groups ?? []).find((entry) => entry.id === groupId) ?? null;
  }

  async ensureGitToken(force = false) {
    if (!this.state.identity) throw new HubError('尚未加入公司');
    if (this.state.gitToken && !force) return this.state.gitToken;
    const result = await this.fetchJson('POST', '/api/me/git-token', {});
    this.state.gitToken = result.token;
    saveState(this.state);
    return result.token;
  }

  gitAuthArgs() {
    const username = this.state.identity?.employee?.id;
    if (!username || !this.state.gitToken) throw new HubError('Git 凭据尚未就绪');
    const basic = Buffer.from(`${username}:${this.state.gitToken}`, 'utf8').toString('base64');
    return ['-c', `http.extraHeader=Authorization: Basic ${basic}`];
  }

  groupRepoUrl(group) {
    if (!group?.repoPath) throw new HubError('该群还没有 Git 仓库');
    return `${this.state.serverUrl}/git/${group.repoPath}`;
  }

  async runGit(args, cwd) {
    const finalArgs = [...this.gitAuthArgs(), ...args];
    try {
      const result = await execFileAsync('git', finalArgs, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      const detail = String(error.stderr || error.stdout || error.message || '').trim();
      throw new HubError(detail ? `Git 操作失败：${detail.slice(0, 500)}` : 'Git 操作失败');
    }
  }

  async configureRepoAuth(target) {
    if (!this.state.serverUrl || !this.state.identity || !this.state.gitToken) return;
    const server = new URL(this.state.serverUrl);
    const username = this.state.identity.employee?.id;
    const credentialBase = `${server.protocol}//${encodeURIComponent(username)}:${encodeURIComponent(this.state.gitToken)}@${server.host}/`;
    await execFileAsync(
      'git',
      ['config', '--local', `url.${credentialBase}.insteadOf`, `${server.origin}/`],
      { cwd: target, encoding: 'utf8' },
    );
  }

  async setGroupRepoHead(groupId, branch) {
    return this.fetchJson('POST', `/api/groups/${encodeURIComponent(groupId)}/repo-head`, { branch }, true, 30_000);
  }

  async bindGroupRepo(groupId, localPath) {
    const group = this.groupById(groupId);
    if (!group) throw new HubError('群组不存在，请先刷新');
    if (!group.repoPath) throw new HubError('该群还没有 Git 仓库，请重新创建群组');
    await this.ensureGitToken(true);
    const target = path.resolve(String(localPath || '').trim());
    if (!target) throw new HubError('请选择本地目录');
    const repoUrl = this.groupRepoUrl(group);
    if (fs.existsSync(target)) {
      const entries = fs.readdirSync(target);
      if (entries.length === 0) {
        fs.rmdirSync(target);
      } else if (!fs.existsSync(path.join(target, '.git'))) {
        throw new HubError('选择的目录不是 Git 仓库；请选择空目录、不存在目录，或该群已有的 Git 仓库');
      } else {
        let url = '';
        try {
          const origin = await this.runGit(['remote', 'get-url', 'origin'], target);
          url = String(origin.stdout || '').trim();
        } catch {
          url = '';
        }
        if (!url.endsWith(`/git/${group.repoPath}`)) {
          const remoteRefs = await this.runGit(['ls-remote', repoUrl], target);
          if (String(remoteRefs.stdout || '').trim()) {
            throw new HubError('目标群仓库已经有内容，不能导入这个本地仓库；请选择空目录或新建仓库');
          }
          const branchResult = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD'], target);
          const branch = String(branchResult.stdout || '').trim();
          if (!branch || branch === 'HEAD') throw new HubError('本地仓库处于 detached HEAD，请先切到具体分支');
          const remotes = String((await this.runGit(['remote'], target)).stdout || '').split(/\s+/).filter(Boolean);
          if (remotes.includes('company-hub')) {
            await this.runGit(['remote', 'set-url', 'company-hub', repoUrl], target);
          } else {
            await this.runGit(['remote', 'add', 'company-hub', repoUrl], target);
          }
          await this.runGit(['push', repoUrl, `HEAD:refs/heads/${branch}`], target);
          try {
            await this.runGit(['fetch', 'company-hub'], target);
            await this.runGit(['branch', `--set-upstream-to=company-hub/${branch}`, branch], target);
          } catch {
            // Upstream is a convenience; the import itself already succeeded.
          }
          await this.setGroupRepoHead(group.id, branch);
          this.state.groupRepos[group.id] = target;
          saveState(this.state);
          await this.configureRepoAuth(target);
          return { path: target, action: 'imported', branch };
        }
        this.state.groupRepos[group.id] = target;
        saveState(this.state);
        await this.configureRepoAuth(target);
        return { path: target, action: 'bound' };
      }
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await this.runGit(['clone', repoUrl, target], path.dirname(target));
    this.state.groupRepos[group.id] = target;
    saveState(this.state);
    await this.configureRepoAuth(target);
    return { path: target, action: 'cloned' };
  }

  async pullGroupRepo(groupId) {
    const group = this.groupById(groupId);
    if (!group) throw new HubError('群组不存在');
    const target = this.state.groupRepos[group.id];
    if (!target || !fs.existsSync(target)) throw new HubError('还没有绑定本地仓库');
    await this.ensureGitToken();
    const result = await this.runGit(['pull', '--ff-only'], target);
    return { path: target, output: String(result.stdout || '').trim() };
  }

  async groupRepoStatus(groupId) {
    const group = this.groupById(groupId);
    if (!group) return null;
    const target = this.state.groupRepos[group.id] ?? '';
    if (!target || !fs.existsSync(target)) {
      return { groupId: group.id, repoPath: group.repoPath ?? null, localPath: target, bound: false };
    }
    let branch = '';
    let dirty = false;
    let ahead = 0;
    let behind = 0;
    try {
      branch = String((await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD'], target)).stdout).trim();
      const status = await this.runGit(['status', '--porcelain'], target);
      dirty = Boolean(String(status.stdout).trim());
      const counts = await this.runGit(['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], target);
      const [behindText, aheadText] = String(counts.stdout).trim().split(/\s+/);
      behind = Number(behindText) || 0;
      ahead = Number(aheadText) || 0;
    } catch {
      // A repo without an upstream still counts as bound.
    }
    return { groupId: group.id, repoPath: group.repoPath ?? null, localPath: target, bound: true, branch, dirty, ahead, behind };
  }

  async aiJobs() {
    const result = await this.fetchJson('GET', '/api/ai/jobs');
    return result.items ?? [];
  }

  async claimAiJob(jobId) {
    const result = await this.fetchJson('POST', `/api/ai/jobs/${encodeURIComponent(jobId)}/claim`, {});
    return result.job;
  }

  async completeAiJob(jobId, note) {
    const result = await this.fetchJson('POST', `/api/ai/jobs/${encodeURIComponent(jobId)}/complete`, { note: String(note ?? '') });
    return result.job;
  }

  async failAiJob(jobId, error) {
    const result = await this.fetchJson('POST', `/api/ai/jobs/${encodeURIComponent(jobId)}/fail`, { error: String(error ?? '') });
    return result.job;
  }

  async login(companyId, employeeName, accessCode) {
    if (!this.state.serverUrl) throw new HubError('请先填写并连接服务器地址');
    const result = await this.fetchJson(
      'POST',
      '/api/auth/login',
      {
        companyId: String(companyId || '').trim(),
        employeeName: String(employeeName || '').trim(),
        accessCode: String(accessCode || '').trim().toUpperCase(),
      },
      false,
    );
    this.state.identity = { company: result.company, employee: result.employee, token: result.token };
    saveState(this.state);
    await this.refresh(true).catch(() => {});
    this.persistCurrentAccount();
    return this.snapshot();
  }

  logout() {
    this.state.identity = null;
    this.state.gitToken = '';
    this.remote = null;
    this.remoteAt = 0;
    saveState(this.state);
    return this.snapshot();
  }

  async createEmployee(name, role) {
    const result = await this.fetchJson('POST', '/api/employees', { name, role });
    await this.refresh(true);
    return { accessCode: result.accessCode, employee: result.employee, state: this.snapshot() };
  }

  // ---- company data

  async refresh(force = false) {
    if (!this.configured) return null;
    if (!force && this.remote && now() - this.remoteAt < 2000) return this.remote;
    const state = await this.fetchJson('GET', '/api/state');
    this.remote = state;
    this.remoteAt = now();
    await this.maybeLinkAccount(state).catch(() => {});
    return state;
  }

  /** Bind the signed-in DSH account to a legacy employee row that has no device link yet. */
  async maybeLinkAccount(remote) {
    const employee = remote?.employee;
    if (!employee || employee.linked) return;
    if (!this.account || this.account.source !== 'dsh') return;
    if (this.linkAttempted === employee.id) return;
    this.linkAttempted = employee.id;
    try {
      const result = await this.fetchJson('POST', '/api/me/link', {
        externalId: this.account.externalId,
        contact: this.account.contact,
      });
      if (result.employee) {
        this.remote.employee = result.employee;
        if (this.state.identity) this.state.identity.employee = result.employee;
      }
      const companyId = this.remote?.company?.id;
      if (result.deviceSecret && companyId) {
        this.state.deviceSecrets = { ...(this.state.deviceSecrets || {}), [companyId]: result.deviceSecret };
      }
      saveState(this.state);
    } catch {
      /* already bound to somebody else or offline: keep the current account usable */
    }
  }

  async addContact(employeeId) {
    await this.fetchJson('POST', '/api/contacts', { employeeId });
    await this.refresh(true);
    return this.snapshot();
  }

  async removeContact(employeeId) {
    await this.fetchJson('DELETE', `/api/contacts?employeeId=${encodeURIComponent(employeeId)}`);
    await this.refresh(true);
    return this.snapshot();
  }

  async listDirectory(query) {
    const result = await this.fetchJson('GET', `/api/directory?q=${encodeURIComponent(query || '')}`);
    return result.items;
  }

  async createGroup(name, memberIds, repo) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new HubError('请填写群组名称');
    const result = await this.fetchJson('POST', '/api/groups', { name: trimmed, memberIds: memberIds ?? [], repo: repo ?? {} });
    await this.refresh(true);
    return { group: result.group, state: this.snapshot() };
  }

  async messages(groupId, since = 0) {
    const result = await this.fetchJson(
      'GET',
      `/api/groups/${encodeURIComponent(groupId)}/messages?since=${Number(since) || 0}&limit=100`,
    );
    return result;
  }

  async knowledge(groupId) {
    const result = await this.fetchJson('GET', `/api/knowledge?groupId=${encodeURIComponent(groupId || '')}`);
    return result.items ?? [];
  }

  async uploadKnowledge(groupId, name, dataBase64, mime, meta = {}) {
    const result = await this.fetchJson('POST', '/api/knowledge', {
      name,
      dataBase64,
      mime,
      groupId: groupId || null,
      version: meta.version || '',
      effectiveAt: meta.effectiveAt || null,
      authority: meta.authority || 'normal',
    }, true, 120_000);
    return result.doc;
  }

  async reindexKnowledge() {
    return this.fetchJson('POST', '/api/knowledge/reindex', {}, true, 300_000);
  }

  async knowledgeEntities() {
    const result = await this.fetchJson('GET', '/api/knowledge/entities');
    return result.items ?? [];
  }

  async addKnowledgeAlias(alias, canonical) {
    const result = await this.fetchJson('POST', '/api/knowledge/entities/alias', { alias, canonical });
    return result.entity;
  }

  async deleteKnowledge(docId) {
    await this.fetchJson('DELETE', `/api/knowledge/${encodeURIComponent(docId)}`);
    return { removed: true };
  }

  async searchKnowledge(query, groupId) {
    const result = await this.fetchJson('POST', '/api/knowledge/search', { query, groupId: groupId || null });
    return result.items ?? [];
  }

  async uploadAttachment(groupId, name, dataBase64, mime) {
    const result = await this.fetchJson(
      'POST',
      `/api/groups/${encodeURIComponent(groupId)}/attachments`,
      { name, dataBase64, mime },
      true,
      120_000,
    );
    return result.attachment;
  }

  async attachmentResponse(groupId, attachmentId, res) {
    await this.ensureGitToken();
    const response = await fetch(
      `${this.state.serverUrl}/api/groups/${encodeURIComponent(groupId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { headers: { authorization: `Bearer ${this.state.identity.token}` } },
    );
    if (!response.ok) throw new HubError(`附件读取失败：HTTP ${response.status}`);
    res.writeHead(response.status, {
      'content-type': response.headers.get('content-type') || 'application/octet-stream',
      'content-length': response.headers.get('content-length') || '',
      'cache-control': 'private, max-age=3600',
    });
    for await (const chunk of response.body) res.write(chunk);
    res.end();
  }


  async sendMessage(groupId, text, options = {}) {
    const body = { text: String(text || '').trim(), task: options.task === true };
    if (options.asAi === true) body.asAi = true;
    if (typeof options.toAi === 'boolean') body.toAi = options.toAi;
    if (Array.isArray(options.attachmentIds) && options.attachmentIds.length) body.attachmentIds = options.attachmentIds;
    const result = await this.fetchJson('POST', `/api/groups/${encodeURIComponent(groupId)}/messages`, body);
    await this.refresh(true);
    return { message: result.message, task: result.task, state: this.snapshot() };
  }

  async cancelAi(groupId) {
    return this.fetchJson('POST', `/api/groups/${encodeURIComponent(groupId)}/ai/cancel`, {});
  }

  async markRead(groupId, seq) {
    await this.fetchJson('POST', `/api/groups/${encodeURIComponent(groupId)}/read`, { seq: Number(seq) || 0 });
    if (this.remote) {
      const group = this.remote.groups?.find((entry) => entry.id === groupId);
      if (group) group.unread = 0;
    }
    return {};
  }

  async claimTask(taskId) {
    await this.fetchJson('POST', `/api/tasks/${encodeURIComponent(taskId)}/claim`, {});
    await this.refresh(true);
    return this.snapshot();
  }

  async completeTask(taskId, note, asAi = true) {
    await this.fetchJson('POST', `/api/tasks/${encodeURIComponent(taskId)}/complete`, {
      note: note || '',
      asAi: asAi === true,
    });
    await this.refresh(true);
    return this.snapshot();
  }

  // ---- snapshot for the UI and prompt

  snapshot() {
    const remote = this.remote ?? {};
    return {
      ok: true,
      serverUrl: this.state.serverUrl,
      connection: this.connection,
      server: this.serverInfo ?? null,
      identity: this.state.identity
        ? {
            company: this.state.identity.company,
            employee: this.state.identity.employee,
            accessCode: this.state.identity.accessCode ?? null,
          }
        : null,
      aiMember: remote.aiMember ?? null,
      contacts: remote.contacts ?? [],
      directory: remote.directory ?? [],
      groups: remote.groups ?? [],
      tasks: remote.tasks ?? [],
      account: this.account
        ? {
            name: this.account.name,
            contact: this.account.contact,
            source: this.account.source,
          }
        : null,
      serverScript: serverScriptInfo(),
      activeAccount: this.state.activeAccount || '',
      accounts: (this.state.accounts || []).map((entry) => ({
        key: entry.key,
        serverUrl: entry.serverUrl,
        companyId: entry.identity?.company?.id ?? '',
        companyName: entry.identity?.company?.name ?? '',
        employeeName: entry.identity?.employee?.name ?? '',
      })),
      access: { admin: this.state.identity?.employee?.role === 'admin' },
    };
  }
}

let hub = null;

// ---------------------------------------------------------------- server script helper

function serverScriptInfo() {
  const file = new URL('./server/company-hub-server.mjs', import.meta.url);
  let scriptPath = '';
  try {
    scriptPath = file.pathname && process.platform === 'win32'
      ? decodeURIComponent(file.pathname).replace(/^\//, '').replace(/\//g, '\\')
      : decodeURIComponent(file.pathname);
  } catch {
    scriptPath = '';
  }
  return {
    path: scriptPath,
    command: scriptPath
      ? `node "${scriptPath}" --port 8477 --data "${path.join(os.homedir(), 'company-hub-data')}"`
      : '',
    defaultUrl: 'http://127.0.0.1:8477',
  };
}

// ---------------------------------------------------------------- HTTP routes

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readBody(req, maxBytes = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HubError('请求体过大');
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) ?? {};
  } catch {
    throw new HubError('请求体不是合法 JSON');
  }
}

function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const action = url.pathname.slice(ROUTE_PREFIX.length).replace(/^\/+/, '');
  const method = req.method ?? 'GET';
  const run = async () => {
    const body = method === 'POST' ? await readBody(req, action === 'knowledge' || action === 'attachments' ? 20 * 1024 * 1024 : 2 * 1024 * 1024) : {};
    if (!hub) throw new HubError('插件尚未就绪');
    const eventsMatch = method === 'GET' ? /^groups\/([a-z0-9_]+)\/events$/.exec(action) : null;
    if (eventsMatch) {
      await hub.pipeEvents(eventsMatch[1], req, res);
      return;
    }
    switch (`${method} ${action}`) {
      case 'GET state':
        await hub.refreshAccount(false).catch(() => {});
        if (hub.configured) await hub.refresh(false).catch(() => {});
        return hub.snapshot();
      case 'GET companies':
        return { ok: true, items: await hub.searchCompanies(url.searchParams.get('q') ?? '') };
      case 'POST companies/join':
        return hub.joinCompany(body.companyId).then((state) => ({ ok: true, state }));
      case 'POST employees/reset':
        return hub.resetEmployee(body.employeeId).then((result) => ({ ok: true, ...result }));
      case 'POST me/rename':
        return hub.renameSelf(body.name).then((result) => ({ ok: true, ...result }));
      case 'POST ai/rename':
        return hub.renameAi(body.name).then((result) => ({ ok: true, ...result }));
      case 'POST groups/delete':
        return hub.deleteGroup(body.groupId).then((state) => ({ ok: true, state }));
      case 'POST git/bind':
        return hub.bindGroupRepo(body.groupId, body.path).then((result) => ({ ok: true, ...result, state: hub.snapshot() }));
      case 'POST git/pull':
        return hub.pullGroupRepo(body.groupId).then((result) => ({ ok: true, ...result }));
      case 'GET git/status':
        return hub.groupRepoStatus(String(url.searchParams.get('groupId') ?? '')).then((status) => ({ ok: true, status }));
      case 'GET ai/jobs':
        return hub.aiJobs().then((items) => ({ ok: true, items }));
      case 'POST ai/jobs/claim':
        return hub.claimAiJob(body.jobId).then((job) => ({ ok: true, job }));
      case 'POST ai/jobs/complete':
        return hub.completeAiJob(body.jobId, body.note).then((job) => ({ ok: true, job }));
      case 'POST ai/jobs/fail':
        return hub.failAiJob(body.jobId, body.error).then((job) => ({ ok: true, job }));
      case 'POST me/heartbeat':
        return hub.heartbeat().then(() => ({ ok: true }));
      case 'GET messages': {
        const groupId = url.searchParams.get('groupId') ?? '';
        const since = Number(url.searchParams.get('since') ?? '0') || 0;
        const result = await hub.messages(groupId, since);
        return { ok: true, ...result };
      }
      case 'GET knowledge': {
        const groupId = url.searchParams.get('groupId') ?? '';
        return { ok: true, items: await hub.knowledge(groupId) };
      }
      case 'POST knowledge': {
        const doc = await hub.uploadKnowledge(body.groupId, body.name, body.dataBase64, body.mime, {
          version: body.version,
          effectiveAt: body.effectiveAt,
          authority: body.authority,
        });
        return { ok: true, doc };
      }
      case 'GET knowledge/entities':
        return { ok: true, items: await hub.knowledgeEntities() };
      case 'POST knowledge/alias':
        return hub.addKnowledgeAlias(body.alias, body.canonical).then((entity) => ({ ok: true, entity }));
      case 'POST knowledge/reindex':
        return hub.reindexKnowledge();
      case 'POST knowledge/delete':
        return hub.deleteKnowledge(body.docId);
      case 'POST knowledge/search':
        return { ok: true, items: await hub.searchKnowledge(body.query, body.groupId) };
      case 'GET directory':
        return { ok: true, items: await hub.listDirectory(url.searchParams.get('q') ?? '') };
      case 'POST settings': {
        if (typeof body.serverUrl === 'string' && body.serverUrl.trim()) {
          await hub.configure(body.serverUrl);
        }
        return { ok: true, state: hub.snapshot() };
      }
      case 'POST setup/company':
        return hub.createCompany(body.companyName, body.employeeName).then((state) => ({ ok: true, state }));
      case 'POST setup/login':
        return hub.login(body.companyId, body.employeeName, body.accessCode).then((state) => ({ ok: true, state }));
      case 'POST setup/logout':
        return { ok: true, state: hub.logout() };
      case 'POST accounts/switch':
        return hub.switchAccount(body.key).then((state) => ({ ok: true, state }));
      case 'POST accounts/login':
        return hub
          .loginOnServer(body.serverUrl, body.companyId, body.employeeName, body.accessCode)
          .then((state) => ({ ok: true, state }));
      case 'POST accounts/create':
        return hub
          .createCompanyOnServer(body.serverUrl, body.companyName, body.employeeName)
          .then((state) => ({ ok: true, state }));
      case 'POST employees': {
        const result = await hub.createEmployee(body.name, body.role);
        return { ok: true, ...result };
      }
      case 'POST contacts':
        return body.remove
          ? hub.removeContact(body.employeeId).then((state) => ({ ok: true, state }))
          : hub.addContact(body.employeeId).then((state) => ({ ok: true, state }));
      case 'POST groups':
        return hub.createGroup(body.name, body.memberIds, body.repo).then((result) => ({ ok: true, ...result }));
      case 'POST messages':
        return hub
          .sendMessage(body.groupId, body.text, { task: body.task, asAi: body.asAi, toAi: body.toAi, attachmentIds: body.attachmentIds })
          .then((result) => ({ ok: true, ...result }));
      case 'POST attachments': {
        const attachment = await hub.uploadAttachment(body.groupId, body.name, body.dataBase64, body.mime);
        return { ok: true, attachment };
      }
      case 'POST ai/cancel':
        return hub.cancelAi(body.groupId).then((result) => ({ ok: true, ...result }));
      case 'GET attachment':
        await hub.attachmentResponse(url.searchParams.get('groupId') ?? '', url.searchParams.get('id') ?? '', res);
        return {};
      case 'POST messages/read':
        return { ok: true, ...(await hub.markRead(body.groupId, body.seq)) };
      case 'POST tasks/claim':
        return hub.claimTask(body.taskId).then((state) => ({ ok: true, state }));
      case 'POST tasks/complete':
        return hub.completeTask(body.taskId, body.note, body.asAi).then((state) => ({ ok: true, state }));
      default:
        throw new HubError(`未知接口：${method} ${action}`, 404);
    }
  };
  run()
    .then((payload) => {
      if (res.headersSent || res.writableEnded) return;
      sendJson(res, 200, payload);
    })
    .catch((error) => {
      if (res.headersSent || res.writableEnded) {
        if (!res.writableEnded) res.end();
        return;
      }
      const status = error instanceof HubError ? error.status || 400 : 500;
      console.error('[company-collab] 接口失败', error);
      sendJson(res, status, { ok: false, error: textOf(error) });
    });
}

// ---------------------------------------------------------------- agent tool

const ACTIONS = [
  'status',
  'groups',
  'messages',
  'send',
  'tasks',
  'task_done',
  'sync',
  'contacts',
  'directory',
  'add_contact',
  'create_group',
  'job_list',
  'job_complete',
  'job_fail',
];

const TOOL_DESCRIPTION = [
  '企业协作（company_hub）：在用户自托管的企业协作服务器上，以「AI 同事」身份参与公司群组。',
  '可用 action：',
  'status=查看公司/身份/服务器/工作区状态；',
  'groups=列出我能看到的群组和未读数；',
  'messages=读取群消息（group 传群组名或 id，可选 limit）；',
  'send=在群里发言，默认以 AI 身份发送（group、text，可选 asAi=false 以本人身份发；task=true 会生成 AI 任务）；',
  'tasks=列出待处理的 AI 任务；',
  'task_done=标记任务完成并把 text 作为完成说明发回群（task 传任务 id 或后 6 位）；',
  'contacts=通讯录；directory=按名字搜索公司成员（query）；add_contact=加同事进通讯录（employee 传 id 或完整姓名）；',
  'create_group=建群（name，members 为 id/姓名数组；AI 会被自动加入）；',
  'job_list=列出本机待处理的 AI 任务；job_complete=完成 AI 任务（jobId、text）；job_fail=标记 AI 任务失败（jobId、text）。',
  '群文件通过每群独立的 Git 仓库同步；AI 任务在本机仓库执行后 push，其他成员 git pull。',
].join('\n');

function describeStatus(state) {
  const lines = [
    `公司：${state.identity?.company?.name ?? '未加入'}`,
    `身份：${state.identity?.employee?.name ?? '未登录'}${state.identity?.employee?.role ? `（${state.identity.employee.role}）` : ''}`,
    `服务器：${state.serverUrl || '未配置'}（${state.connection?.status === 'ok' ? '已连接' : state.connection?.message || '未连接'}）`,
    `群组：${(state.groups ?? []).length} 个，待处理 AI 任务 ${(state.tasks ?? []).length} 条`,
  ];
  return lines.join('\n');
}

function resolveGroup(state, query) {
  const groups = state.groups ?? [];
  const needle = String(query || '').trim();
  if (!needle) throw new HubError('请用 group 参数指定群组（名称或 id）');
  const exact = groups.find((entry) => entry.id === needle || entry.name === needle);
  if (exact) return exact;
  const fuzzy = groups.find((entry) => entry.name.includes(needle) || entry.id.endsWith(needle));
  if (fuzzy) return fuzzy;
  throw new HubError(`找不到群组「${needle}」。可用群组：${groups.map((entry) => entry.name).join('、') || '（无）'}`);
}

function resolveEmployee(state, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) throw new HubError('请用 employee 参数指定同事（姓名或 id）');
  const people = state.directory ?? [];
  const exact = people.find((entry) => entry.id === needle || entry.name.toLowerCase() === needle);
  if (exact) return exact;
  const fuzzy = people.find((entry) => entry.name.toLowerCase().includes(needle) || entry.id.endsWith(needle));
  if (fuzzy) return fuzzy;
  throw new HubError(`找不到同事「${query}」。通讯录里可用 directory 查看全部成员。`);
}

async function runToolAction(args) {
  if (!hub) return { ok: false, message: '企业协作插件尚未就绪。' };
  if (hub.state.identity) await hub.refresh(true).catch(() => {});
  const state = hub.snapshot();
  if (args.action !== 'status' && !state.identity) {
    return { ok: false, message: '尚未加入公司。请让用户在左侧栏「企业协作」面板里连接服务器并登录。' };
  }
  switch (args.action) {
    case 'status':
      return { ok: true, message: describeStatus(state) };
    case 'groups': {
      if (!state.groups.length) return { ok: true, message: '当前没有群组。' };
      const lines = state.groups.map(
        (entry) => `- ${entry.name}（${entry.id}）成员 ${entry.members.length} 人${entry.unread ? `，${entry.unread} 条未读` : ''}`,
      );
      return { ok: true, message: lines.join('\n') };
    }
    case 'messages': {
      const group = resolveGroup(state, args.group);
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      const result = await hub.messages(group.id, 0);
      const slice = result.messages.slice(-limit);
      const lines = slice.map(
        (entry) => `[#${entry.seq}] ${entry.authorName}${entry.authorIsAi ? '（AI）' : ''}：${entry.text}`,
      );
      return { ok: true, message: `群组「${group.name}」最近 ${slice.length} 条消息：\n${lines.join('\n')}` };
    }
    case 'send': {
      const group = resolveGroup(state, args.group);
      const text = String(args.text || '').trim();
      if (!text) throw new HubError('请提供 text');
      const result = await hub.sendMessage(group.id, text, {
        asAi: args.asAi !== false,
        task: args.task === true,
      });
      return {
        ok: true,
        message: `已发送到「${group.name}」。${result.task ? `并生成任务 #${result.task.id.slice(-6)}。` : ''}`,
      };
    }
    case 'tasks': {
      if (!state.tasks.length) return { ok: true, message: '没有待处理的 AI 任务。' };
      const lines = state.tasks.map(
        (task) => `- #${task.id.slice(-6)}（${task.id}）${task.groupName}｜${task.createdByName}：${task.text}`,
      );
      return { ok: true, message: lines.join('\n') };
    }
    case 'task_done': {
      const needle = String(args.task || '').trim();
      if (!needle) throw new HubError('请用 task 参数指定任务 id');
      const task = (state.tasks ?? []).find((entry) => entry.id === needle || entry.id.endsWith(needle));
      if (!task) throw new HubError(`找不到任务「${needle}」`);
      await hub.completeTask(task.id, args.text || '任务已完成。', true);
      return { ok: true, message: `任务 #${task.id.slice(-6)} 已完成。` };
    }
    case 'job_list': {
      const jobs = await hub.aiJobs();
      return { ok: true, message: jobs.length ? jobs.map((job) => `${job.id}｜${job.groupName}｜${job.status}｜${job.text.slice(0, 60)}`).join('\n') : '没有待处理的 AI 任务。' };
    }
    case 'job_complete': {
      const jobId = String(args.jobId || args.job || '').trim();
      if (!jobId) throw new HubError('请用 jobId 参数指定 AI 任务');
      await hub.completeAiJob(jobId, args.text || '本机 AI 已处理');
      return { ok: true, message: `AI 任务 ${jobId} 已完成。` };
    }
    case 'job_fail': {
      const jobId = String(args.jobId || args.job || '').trim();
      if (!jobId) throw new HubError('请用 jobId 参数指定 AI 任务');
      await hub.failAiJob(jobId, args.text || '本机 AI 执行失败');
      return { ok: true, message: `AI 任务 ${jobId} 已标记失败。` };
    }
    case 'contacts': {
      const contacts = state.contacts ?? [];
      if (!contacts.length) return { ok: true, message: '通讯录还是空的。' };
      return { ok: true, message: contacts.map((entry) => `- ${entry.name}（${entry.id}）${entry.role || ''}`).join('\n') };
    }
    case 'directory': {
      const items = await hub.listDirectory(args.query ?? '');
      return {
        ok: true,
        message: items.length
          ? items.map((entry) => `- ${entry.name}（${entry.id}）${entry.role || ''}${entry.isAi ? '｜AI' : ''}`).join('\n')
          : '没有找到匹配的成员。',
      };
    }
    case 'add_contact': {
      const target = resolveEmployee(state, args.employee);
      await hub.addContact(target.id);
      return { ok: true, message: `已把 ${target.name} 加入通讯录。` };
    }
    case 'create_group': {
      const name = String(args.group || args.name || '').trim();
      if (!name) throw new HubError('请用 group 参数给出群组名称');
      const ids = [];
      for (const member of Array.isArray(args.members) ? args.members : []) {
        try {
          ids.push(resolveEmployee(state, member).id);
        } catch {
          // Unknown names are reported collectively below instead of aborting the group.
        }
      }
      const result = await hub.createGroup(name, ids);
      return {
        ok: true,
        message: `群组「${name}」已创建，AI 已自动加入，共 ${result.group.memberIds.length} 位成员；成员需绑定本地 Git 仓库。`,
      };
    }
    default:
      return { ok: false, message: `未知 action「${args.action}」，可用：${ACTIONS.join('、')}` };
  }
}

function registerTool(ctx) {
  return ctx.tools.register({
    name: 'company_hub',
    description: TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ACTIONS,
          description: '要执行的操作。',
        },
        group: { type: 'string', description: '群组名称或 id；create_group 时作为群名。' },
        text: { type: 'string', description: '消息内容 / 完成说明。' },
        task: { type: 'string', description: 'task_done 的任务 id 或后 6 位。' },
        jobId: { type: 'string', description: 'job_complete / job_fail 的 AI 任务 id。' },
        employee: { type: 'string', description: '同事姓名或 id（add_contact）。' },
        members: { type: 'array', items: { type: 'string' }, description: 'create_group 的成员姓名或 id。' },
        query: { type: 'string', description: 'directory 的搜索词。' },
        limit: { type: 'integer', description: 'messages 返回条数（默认 20，最多 50）。' },
        asAi: { type: 'boolean', description: 'send 是否以 AI 身份发送（默认 true）。' },
      },
      required: ['action'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
        },
        required: ['ok', 'message'],
      },
      render: (args, value) => [{ type: 'text', text: value.message }],
    },
    async execute(args) {
      try {
        return await runToolAction(args);
      } catch (error) {
        return { ok: false, message: textOf(error) };
      }
    },
  });
}

// ---------------------------------------------------------------- prompt context

function promptContextText() {
  if (!hub || !hub.state.identity) return '';
  const company = hub.state.identity.company?.name ?? '';
  const employee = hub.state.identity.employee?.name ?? '';
  const groups = hub.remote?.groups ?? [];
  const tasks = hub.remote?.tasks ?? [];
  const lines = [
    '## 企业协作模式',
    `你正以 AI 同事的身份在 DSH 里协作：公司「${company}」，当前员工「${employee}」。`,
  ];
  if (groups.length) {
    lines.push(
      `可见群组：${groups
        .slice(0, 8)
        .map((entry) => `${entry.name}${entry.unread ? `（${entry.unread} 条未读）` : ''}`)
        .join('、')}`,
    );
  }
  if (tasks.length) lines.push(`待处理 AI 任务 ${tasks.length} 条，用 company_hub 工具的任务操作查看与处理。`);
  lines.push('当用户要求与同事沟通、查看群消息或处理群任务时，使用 company_hub 工具。');
  lines.push('每个群有独立 Git 仓库：先绑定本地目录，再在该目录执行 AI 任务；改完测试后分支合并并 push。');
  return lines.join('\n');
}

// ---------------------------------------------------------------- apply

export function apply(ctx) {
  hub = new CompanyHub(ctx);
  hub.refreshAccount(true).catch(() => {});

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PREFIX,
        handler: (req, res) => handleApi(req, res),
      }),
    'company-collab: API routes',
  );

  ctx.effect(() => registerTool(ctx), 'company-collab: company_hub tool');
  ctx.effect(
    () => ctx.systemPrompt.context({ name: 'company-collab', order: 130, text: () => promptContextText() }),
    'company-collab: prompt context',
  );

  // Warm the cache once so status/prompt have data without a UI click.
  if (hub.configured) hub.refresh(true).catch(() => {});

  ctx.logger?.info?.('[company-collab] 企业协作插件已加载');
}
