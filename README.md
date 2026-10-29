# dsh-company-collab

DSH 的「公司项目专用工作模式」：公司、员工账号、通讯录、群聊、AI 同事，以及**每个群一个 Git 仓库**的本地协作方式。

- **左侧栏**：企业协作主面板（联系人、群组、群聊、AI 任务、仓库绑定）。
- **右侧栏**：协作标签页，查看群消息、AI 任务和仓库状态。
- **AI 是群成员**：建群时自动加入。
  - 直接 `@AI` 是**群聊对话**：配置服务器 DSH 主机后，由服务器上的完整 DSH 执行（文件、shell、Git、测试、MCP）；未配置时退回服务端聊天 API；
  - 勾选「作为 AI 任务发送」才是**本机任务**，由提出者电脑上的 DSH AI 修改本地 Git 仓库、运行测试并 push。
- **谁提出，谁的本机执行**：任务派给提出者本人，其他成员 `git pull` 获取结果。
- **服务端两种角色**：DSH 主机 / 聊天 AI + 账号/群聊/任务队列/每群 Git 裸仓库。

## 安装

要求：DSH 桌面端、Node.js 24+、Git。

在 DSH 的插件管理安装入口填入：

```text
github:MZHuangJie/dsh-company-collab
```

安装后按 DSH 提示启用插件并刷新页面。

> 目前包名保留为 `@local/dsh-company-collab`，GitHub 安装可直接使用上面的 spec。

## 启动自己的协作服务器

服务器脚本随插件提供，只依赖 Node.js 与 Git：

```powershell
$env:DEEPSEEK_API_KEY="sk-..."
node "<插件目录>\server\company-hub-server.mjs" --port 8477 --data "$env:USERPROFILE\company-hub-data"
```

`DEEPSEEK_API_KEY` 只用于服务端群聊 AI 回复；未配置时 @AI 会提示无法回复，勾选任务的本地执行不受影响。可选 `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`（默认 `https://api.deepseek.com`、`deepseek-flash`）。

局域网内其他同事可连：

```powershell
node "<插件目录>\server\company-hub-server.mjs" --port 8477 --host 0.0.0.0 --data "D:\company-hub-data"
```

- 默认监听 `127.0.0.1:8477`；对外部署请放在 HTTPS 反向代理后。
- 数据目录包含 `db.json` 和默认的 `git/` 仓库根；可用 `COMPANY_GIT_ROOT` 指定单独的仓库根目录。
- Git 仓库通过 HTTPS 的 `/git/` 路径访问，反向代理需要允许较大的请求体（push）：

```nginx
location /git/ {
    proxy_pass http://127.0.0.1:8477;
    proxy_http_version 1.1;
    proxy_request_buffering off;
    proxy_buffering off;
    client_max_body_size 200m;
}
```

## 服务器 DSH 主机（完整 DSH 能力）

要让群聊像 DSH 会话一样持续执行、显示思考与工具调用，在服务器安装 DSH CLI，并使用 ACP 持久会话模式：

```bash
npm install @deepseek-ai/dsh@0.2.1-rc.4
# 以运行 Hub 的用户初始化 ACP profile
DSH_HOME=/var/lib/dsh-host/home dsh --profile acp
```

Hub 环境变量：

```bash
DSH_HOST_ENABLED=1
DSH_HOST_MODE=acp
DSH_HOST_BIN=/opt/dsh-host/node_modules/@deepseek-ai/dsh/lib/bin.js
DSH_HOST_HOME=/var/lib/dsh-host/home
DSH_HOST_WORKSPACE_ROOT=/var/lib/dsh-host/workspaces
DSH_HOST_PERMISSION_MODE=workspace-write
DEEPSEEK_API_KEY=sk-...
```

- 每个群一个持久 ACP 会话，跨消息保留上下文；创建会话时尝试把 `reasoning_effort` 设为 high，让模型输出思考步骤；
- 群里显示 `💭 正在思考`、`🔧 工具调用`、`✅ 工具结果` 和最终回复；
- 这些过程消息会合并成一张「处理过程」卡片，按 DSH 风格显示思考/工具/结果步骤，最终回复出现后自动折叠，可点开查看；
- 危险操作由 ACP 权限请求转成群审批：

```text
允许 <审批编号>
拒绝 <审批编号>
```

120 秒未处理自动拒绝。

> 旧的一次性 headless 模式仍保留（`DSH_HOST_MODE=headless` + `server/host-approval` 插件），ACP 模式不需要该插件。

## 第一次使用

1. 打开左侧栏「企业协作」，填服务器地址（本机默认 `http://127.0.0.1:8477`）并连接。
2. 插件自动识别当前 **DSH 登录账号**作为员工身份；创建公司，或搜索公司名加入。
3. 新建群组：服务端会初始化该群的 Git 裸仓库。
4. 进群后点标题栏「仓库」：
   - 选择空目录/不存在的目录 → 自动 `git clone`；
   - 选择已有 Git 仓库 → 校验 `origin` 是否指向该群仓库；
   - 已绑定后点「仓库」执行 `git pull --ff-only`。
5. 在群里和 AI 协作：
   - 输入 `@` 会弹出群成员列表，输入名字可过滤，↑/↓ 选择、Enter/Tab 确认；
   - 直接 `@AI 助理 ...` 是**群聊对话**：由服务器 DSH 主机执行（完整工具）或退回服务端聊天 API，不创建任务；
   - 危险操作会发审批消息，管理员/提出者回复「允许 <编号>」或「拒绝 <编号>」；
   - 勾选「作为 AI 任务发送」才是**本机任务**：服务端创建任务并派给提出者；
   - 提出者打开着「企业协作」面板、且有可用 DSH 会话时，本机 AI 会认领并在本地仓库执行；
   - AI 应建 `ai/<task>` 分支、改文件、测试、commit/push、合并 main、push、删除分支，然后回群汇报并标记任务完成；
   - 其他成员只需在自己的绑定目录 `git pull`。
6. 提出者 90 秒无心跳时，任务自动取消并在群里提示。

## 数据与安全

- 本机状态：`$DSH_HOME/storages/company-collab/state.json`（服务器地址、登录令牌、Git Token、群组本地目录映射）。
- 服务端数据：`<--data>/db.json`、`<--data>/git/<companyId>/<groupId>.git`。
- DSH 主机数据：`DSH_HOST_HOME`（profile/会话）与 `DSH_HOST_WORKSPACE_ROOT`（每群服务器 checkout）。
- 审批记录存在 `db.json`，批准/拒绝/超时都会在群里留系统消息。
- 每位员工有独立 Git Token，服务端只保存 hash；clone/pull/push 通过 HTTPS Basic Auth。
- 本机仓库使用本地 `url.<...>.insteadOf` 写入认证信息，因此 **Token 会明文存在本地 `.git/config`**；请勿把该仓库目录公开或打包分享。
- 删除群组：删除群聊历史、任务、服务端 Git 仓库和本机映射；**不会自动删除你选择的本地仓库目录**。
- 服务端账号体系是「DSH 账号 + 设备密钥 + 访问码兜底」，适合公司内部/小团队，不是企业级 SSO。

## AI 工具（company_hub）

| action | 作用 |
| --- | --- |
| `status` | 公司、身份、服务器、群组/任务概览 |
| `groups` / `messages` | 群组列表、读群消息 |
| `send` | 在群里发言（默认 AI 身份；`asAi=false` 以本人身份） |
| `tasks` / `task_done` | 查看、完成 AI 任务 |
| `contacts` / `directory` / `add_contact` | 通讯录与公司成员 |
| `create_group` | 建群（AI 自动加入） |
| `job_list` / `job_complete` / `job_fail` | 查看、完成或失败本机 AI 任务 |

## 当前限制

- 员工侧目前只 `pull`，不提供 push/提交 UI；只有本机 AI 会推送。
- 消息约 5 秒轮询，不是实时推送。
- 本地 AI 执行依赖提出者开着「企业协作」面板和 DSH 会话；离线任务会取消。
- 删除群组不会删除员工本地 clone，也不会向其他人传播本地目录删除。
- 仓库不做 LFS/大文件优化；大仓库请自行控制体积。

## 开发

- `index.js`：DSH Host 插件（Git 绑定、任务轮询、本机会话注入、`company_hub` 工具）。
- `client.js`：DSH Web 客户端（左/右栏 UI）。
- `server/company-hub-server.mjs`：自托管 Hub（账号、群聊、任务、Git Smart HTTP）。
- `cordis.patch.yml`：DSH bundle 补丁。

许可证：MIT。
