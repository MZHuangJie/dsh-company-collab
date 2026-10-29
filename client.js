window.__ModuleLoader__.load({
  id: '@local/dsh-company-collab',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PKG = '@local/dsh-company-collab';
    const NS = 'companyCollab';
    const PANEL_ID = 'company-collab-panel';
    const TAB_ID = '@local/dsh-company-collab/tab';
    const TAB_KIND = 'company-collab';
    const API = '/company-collab/api';

    /** Shared per-activation state; both surfaces render from the same store. */
    const shared = { ctx: null, store: null, t: null, lastSessionId: '' };

    // ---------------------------------------------------------------- locale

    const zh = {
      'panel.title': '企业协作',
      'panel.subtitle': '公司项目协同工作模式',
      'accounts.title': '公司与服务器',
      'accounts.saved': '已保存的公司',
      'accounts.empty': '还没有保存其他公司；可以在下面登录或创建。',
      'accounts.current': '当前',
      'accounts.add': '添加公司',
      'accounts.login': '登录已有公司',
      'accounts.create': '创建新公司',
      'accounts.server': '服务器地址',
      'accounts.companyId': '公司 ID',
      'accounts.companyName': '公司名称',
      'accounts.person': '你的姓名',
      'accounts.accessCode': '访问码',
      'accounts.loginAction': '登录并切换',
      'accounts.createAction': '创建并切换',
      'accounts.required': '请填写必填项',
      'setup.title': '连接你自己的公司服务器',
      'setup.desc': '企业协作使用你自行运行的服务器保存公司、员工账号、群组与 Git 仓库。插件自带一个轻量服务器，复制命令即可在本机或局域网启动。',
      'setup.server': '服务器地址',
      'setup.serverPlaceholder': 'http://127.0.0.1:8477',
      'setup.connect': '连接',
      'setup.connectHint': '地址可以是本机、局域网内另一台电脑，或你自己的公网服务器。',
      'setup.command': '服务器启动命令',
      'setup.copy': '复制命令',
      'setup.tabCreate': '创建公司',
      'setup.tabJoin': '加入已有公司',
      'setup.company': '公司名称',
      'setup.companyPlaceholder': '例如：示例科技',
      'setup.name': '你的姓名',
      'setup.namePlaceholder': '例如：张明',
      'setup.create': '创建公司并加入',
      'setup.companyId': '公司 ID',
      'setup.companyIdPlaceholder': '管理员提供，例如 co_1a2b3c4d5e6f',
      'setup.code': '访问码',
      'setup.codePlaceholder': '6 位访问码',
      'setup.join': '加入',
      'setup.login': '登录',
      'setup.adminHint': '创建公司后你就是管理员；同事在各自电脑上搜索公司名称加入即可，不需要访问码。',
      'setup.ready': '服务器已连接',
      'setup.notReady': '尚未连接服务器',
      'setup.tabSearch': '搜索公司加入',
      'setup.tabCode': '访问码登录',
      'setup.searchPlaceholder': '输入公司名称或 ID',
      'setup.searchAction': '搜索',
      'setup.searchHint': '输入公司名称搜索，找到后点「加入」；你的 DSH 账号会自动成为员工账号。',
      'setup.searchEmpty': '没有找到匹配的公司，检查名称或让管理员确认服务器地址。',
      'setup.memberCount': '{count} 位员工',
      'setup.account': 'DSH 账号',
      'setup.accountHint': '加入时自动使用这个身份，无需访问码。',
      'setup.accountLocal': '未登录 DSH 账号，将使用本机用户名；可以在 DSH 里登录后再试。',
      'setup.codeHint': '旧账号或没有 DSH 账号时，用管理员给的访问码登录。',
      'state.ok': '已连接',
      'state.idle': '待连接',
      'state.error': '连接异常',
      'action.sync': '同步',
      'action.syncing': '同步中…',
      'action.save': '保存',
      'action.delete': '删除',
      'action.settings': '设置',
      'action.send': '发送',
      'action.copy': '复制',
      'action.copied': '已复制',
      'action.cancel': '取消',
      'action.create': '创建',
      'action.add': '添加',
      'action.remove': '移除',
      'action.close': '关闭',
      'action.refresh': '刷新',
      'action.handToAi': '交给 AI',
      'action.copyPrompt': '复制指令',
      'action.openPanel': '打开协作面板',
      'action.logout': '退出公司',
      'action.retry': '重试',
      'groups.title': '群组',
      'groups.new': '新建',
      'groups.empty': '还没有群组',
      'groups.emptyHint': '新建群组，邀请同事，AI 会自动加入。',
      'groups.members': '{count} 人',
      'groups.unread': '{count} 条未读',
      'groups.aiIn': 'AI 已加入',
      'groups.workspace': '共享工作区',
      'contacts.title': '通讯录',
      'contacts.directory': '公司成员',
      'contacts.empty': '通讯录还是空的',
      'contacts.emptyHint': '切到「公司成员」把同事加进通讯录，建群时就能一键邀请。',
      'contacts.search': '搜索群组或同事',
      'contacts.none': '没有匹配项',
      'contacts.addDone': '已加入通讯录',
      'people.ai': 'AI',
      'chat.empty': '选择一个群组开始协作',
      'chat.emptyDesc': '左侧选择群组，或新建一个群组并把同事与 AI 拉进来。',
      'chat.placeholder': '在「{group}」里说点什么…（默认发给 AI，Enter 发送）',
      'chat.placeholderAi': '在「{group}」里说点什么…（发给 AI，Enter 发送）',
      'chat.placeholderPeople': '在「{group}」里说点什么…（发给同事，@AI 可询问）',
      'chat.toAi': 'AI',
      'chat.toPeople': '同事',
      'chat.replyModeHint': '切换对话对象；输入 @ 时以 @ 为准',
      'chat.fileTooLarge': '文件超过 10MB：{name}',
      'chat.delete': '删除群组',
      'chat.deleteConfirm': '删除群组「{name}」？群聊历史、任务和服务端 Git 仓库会一起删除，且不可恢复。',
      'chat.deleted': '群组已删除',
      'chat.taskToggle': '作为 AI 任务发送',
      'chat.taskHint': '勾选后作为本机 AI 任务执行（改代码/测试/合并）；直接 @AI 是群聊对话。',
      'chat.noMessages': '还没有消息，先说点什么吧。',
      'run.running': '正在处理',
      'run.finished': '已完成，过程已折叠',
      'run.finishedShort': '已完成',
      'run.used': '用时 {duration}',
      'run.exploring': '正在深度探索中',
      'run.stop': '停止',
      'run.stopping': '正在停止…',
      'run.steps': '步',
      'run.failed': '失败',
      'run.tool.bash': '运行命令',
      'run.tool.read': '读取文件',
      'run.tool.edit': '编辑文件',
      'run.tool.write': '写入文件',
      'run.tool.glob': '查找文件',
      'run.tool.grep': '搜索内容',
      'run.tool.webSearch': '联网搜索',
      'run.tool.default': '工具调用',
      'run.executed': '执行了命令',
      'run.executing': '正在运行命令',
      'run.ai': 'AI 助理',
      'approval.title': 'AI 请求执行「{tool}」',
      'approval.allow': '允许',
      'approval.deny': '拒绝',
      'approval.pending': '等待审批',
      'approval.approved': '已允许',
      'approval.rejected': '已拒绝',
      'approval.expired': '已超时',
      'task.title': 'AI 任务',
      'task.empty': '暂无待处理的 AI 任务',
      'task.by': '{name} 指派',
      'task.handed': '已交给当前对话的 AI',
      'task.handHint': 'AI 会在提出者本机的 Git 仓库执行，不需要手动交给会话。',
      'task.autoHint': 'AI 助理会自动回复',
      'repo.button': '仓库',
      'repo.buttonHint': '绑定或同步这个群的本地 Git 仓库',
      'repo.bound': '已绑定本地仓库',
      'repo.imported': '本地仓库已导入并绑定',
      'repo.importFailed': '群已创建，但本地目录导入失败：{message}。可在群标题栏点仓库按钮重试。',
      'repo.cloned': '已克隆到本地',
      'repo.pulled': '已 git pull',
      'repo.pullConfirm': '本地仓库：{path}\n\n确定执行 git pull --ff-only 吗？',
      'task.copiedPrompt': '任务指令已复制，粘贴到对话即可',
      'task.badge': 'AI 任务',
      'task.openHint': 'AI 会在提出者本机执行',
      'workspace.title': 'AI 工作区',
      'workspace.sync': '立即同步',
      'workspace.never': '尚未同步',
      'workspace.lastSync': '最近同步 {time}',
      'workspace.empty': '工作区还是空的，AI 产出的文件会出现在这里。',
      'workspace.error': '同步提示：{message}',
      'workspace.folder': '所有成员电脑上的同一份工作区会保持同步。',
      'status.synced': '已同步',
      'status.pending': '待上传',
      'status.pulling': '待更新',
      'status.local': '仅本机',
      'status.remote': '仅服务器',
      'settings.title': '设置',
      'settings.server': '服务器',
      'settings.identity': '身份',
      'settings.company': '公司',
      'settings.employee': '员工',
      'settings.rename': '改名',
      'settings.renamePlaceholder': '新的显示名',
      'settings.renameHint': '显示名会同步给公司成员；消息里的历史署名也会跟着变。',
      'settings.aiName': 'AI 助理名称',
      'settings.aiNamePlaceholder': '新的 AI 助理名称',
      'settings.aiNameHint': '任何员工都可以修改；历史消息署名会跟着更新。',
      'settings.aiNameSaved': 'AI 助理名称已更新',
      'settings.role': '角色',
      'settings.accessCode': '管理员访问码',
      'settings.accessCodeHint': '同事加入公司时需要：公司 ID + 姓名 + 访问码。请通过可信渠道分享。',
      'settings.employeeName': '同事姓名',
      'settings.employeeRole': '职位（可选）',
      'settings.createEmployee': '为同事创建账号',
      'settings.newCode': '账号已创建，访问码',
      'settings.newCodeHint': '只显示这一次，请立即分享给同事。',
      'settings.logout': '退出公司',
      'settings.logoutHint': '退出只清除本机登录状态，不会删除服务器上的任何数据。',
      'settings.serverHint': '修改地址后需要重新登录。',
      'settings.workspace': 'AI 工作区目录',
      'settings.workspacePick': '选择目录',
      'settings.workspaceHint': '可选空文件夹，或含 .git 的 Git 仓库目录；.git 与 .gitignore 中列出的文件不会同步。切换不复制旧目录内容。',
      'settings.workspaceSaved': '工作区目录已更新',
      'settings.workspaceDefaultHint': '当前使用默认目录',
      'settings.workspaceDefault': '使用默认',
      'settings.members': '成员与设备',
      'settings.membersHint': '同事在自己电脑上搜索公司名称加入；换电脑时在这里重置对方的设备绑定。',
      'settings.me': '我',
      'settings.linked': '已绑定设备',
      'settings.unlinked': '未绑定',
      'settings.reset': '重置设备',
      'settings.resetDone': '已重置设备绑定',
      'settings.resetConfirm': '重置「{name}」的设备绑定？对方需要重新搜索公司加入。',
      'settings.account': 'DSH 账号',
      'notice.pickerUnavailable': '当前环境不支持目录选择，请手动填写路径。',
      'tab.title': '协作',
      'tab.guideTitle': '企业协作',
      'tab.guideDesc': '群组消息、AI 任务与 Git 仓库',
      'tab.offline': '尚未连接公司服务器',
      'tab.connect': '去连接',
      'tab.groups': '群组',
      'tab.tasks': 'AI 任务',
      'tab.noGroup': '还没有群组',
      'tab.openPanel': '打开协作面板',
      'tab.workspace': '工作区',
      'notice.error': '操作失败：{message}',
      'notice.synced': '工作区已同步',
      'notice.sent': '已发送',
      'notice.sentToAi': '已发送，并自动交给当前会话的 AI',
      'notice.sentNoSession': '已发送；在右侧「协作」栏打开一次后，后续消息可自动交给 AI',
      'jobs.needSession': '收到 AI 任务，但当前没有可用的 DSH 会话；请先打开一个对话再试。',
      'jobs.repoMissing': '本地还没有绑定该群的 Git 仓库，任务已退回。',
      'jobs.sessionMissing': '当前 DSH 会话不可用，任务已标记失败。',
      'notice.settingsSaved': '设置已保存',
      'notice.clipboardFailed': '无法访问剪贴板',
      'modal.group.title': '新建群组',
      'modal.group.name': '群组名称',
      'knowledge.title': 'RAG 知识库',
      'knowledge.button': '知识库',
      'knowledge.hint': '上传 txt / md / csv / json / html / docx / xlsx / pdf；文档存服务端，群聊 @AI 时自动检索并引用。',
      'knowledge.scopeGroup': '本群',
      'knowledge.scopeCompany': '全公司',
      'knowledge.chunks': '片段',
      'knowledge.superseded': '已被新版本替代',
      'knowledge.empty': '还没有知识文档',
      'knowledge.upload': '上传文档',
      'knowledge.reindex': '重建索引',
      'knowledge.reindexed': '知识库索引已重建',
      'knowledge.tooLarge': '文件超过 10MB',
      'knowledge.deleteConfirm': '删除知识文档「{name}」？',
      'knowledge.version': '版本（可选）',
      'knowledge.authorityNormal': '普通',
      'knowledge.authorityDepartment': '部门',
      'knowledge.authorityOfficial': '公司正式',
      'knowledge.metaHint': '生效日期/权威级用于冲突排序',
      'knowledge.entities': '实体与别名',
      'knowledge.noAlias': '暂无别名',
      'knowledge.noEntity': '还没有识别到实体',
      'knowledge.aliasPlaceholder': '别名，如 张主管',
      'knowledge.canonicalPlaceholder': '实体名，如 张三',
      'knowledge.linkAlias': '关联别名',
      'knowledge.aliasHint': '别名用于把不同文档里的称呼归到同一实体；没有依据时模型应说明不确定。',
      'modal.group.repoMode': 'Git 仓库',
      'modal.group.repoNew': '新建远程仓库',
      'modal.group.repoLocal': '使用本地目录',
      'modal.group.visibility': '仓库可见性',
      'modal.group.private': 'Private（仅群成员）',
      'modal.group.public': 'Public（可公开 clone）',
      'modal.group.visibilityHint': 'Public 仓库允许匿名只读 clone；写入仍需群成员 Git Token。',
      'modal.group.branch': '默认分支',
      'modal.group.gitignore': '.gitignore 模板',
      'modal.group.none': '不生成',
      'modal.group.description': '仓库说明',
      'modal.group.descriptionPlaceholder': '可选，写入 README',
      'modal.group.initReadme': '初始化 README',
      'modal.group.localPath': '本地目录',
      'modal.group.localPlaceholder': '选择空目录或不存在路径，将 clone 群仓库',
      'modal.group.localHint': '选择本地空目录/新路径，创建群后自动 clone；已有仓库需先手动绑定。',
      'modal.group.localRequired': '请选择本地目录',
      'repo.choose': '选择',
      'modal.group.placeholder': '例如：官网改版',
      'modal.group.members': '邀请同事',
      'modal.group.aiNote': 'AI 助理会自动加入新群组，并获得这个群组的共享工作区。',
      'modal.group.submit': '创建群组',
      'modal.group.emptyPeople': '还没有可邀请的同事，先去通讯录添加。',
      'loading': '加载中…',
      'error.backend': '无法连接插件后端：{message}',
      'role.admin': '管理员',
      'role.member': '成员',
      'role.ai': 'AI 助理',
    };

    const en = {
      'panel.title': 'Company Collaboration',
      'panel.subtitle': 'Team work mode for company projects',
      'accounts.title': 'Companies and servers',
      'accounts.saved': 'Saved companies',
      'accounts.empty': 'No other companies saved yet; log in or create one below.',
      'accounts.current': 'Current',
      'accounts.add': 'Add company',
      'accounts.login': 'Log in to existing',
      'accounts.create': 'Create company',
      'accounts.server': 'Server URL',
      'accounts.companyId': 'Company ID',
      'accounts.companyName': 'Company name',
      'accounts.person': 'Your name',
      'accounts.accessCode': 'Access code',
      'accounts.loginAction': 'Log in and switch',
      'accounts.createAction': 'Create and switch',
      'accounts.required': 'Fill the required fields',
      'setup.title': 'Connect your own company server',
      'setup.desc': 'Company collaboration keeps companies, employee accounts, groups and workspace files on a server you run yourself. This plugin ships a small server you can start on this machine or your LAN.',
      'setup.server': 'Server address',
      'setup.serverPlaceholder': 'http://127.0.0.1:8477',
      'setup.connect': 'Connect',
      'setup.connectHint': 'Use this machine, another computer on your LAN, or your own public server.',
      'setup.command': 'Server start command',
      'setup.copy': 'Copy command',
      'setup.tabCreate': 'Create a company',
      'setup.tabJoin': 'Join an existing company',
      'setup.company': 'Company name',
      'setup.companyPlaceholder': 'e.g. Example Labs',
      'setup.name': 'Your name',
      'setup.namePlaceholder': 'e.g. Alex',
      'setup.create': 'Create and join',
      'setup.companyId': 'Company ID',
      'setup.companyIdPlaceholder': 'Provided by your admin, e.g. co_1a2b3c4d5e6f',
      'setup.code': 'Access code',
      'setup.codePlaceholder': '6-character access code',
      'setup.join': 'Join',
      'setup.login': 'Sign in',
      'setup.adminHint': 'After creating the company you are the admin; colleagues just search the company name on their own machines and join — no access code needed.',
      'setup.ready': 'Server connected',
      'setup.notReady': 'Server not connected yet',
      'setup.tabSearch': 'Search & join',
      'setup.tabCode': 'Access code',
      'setup.searchPlaceholder': 'Company name or ID',
      'setup.searchAction': 'Search',
      'setup.searchHint': 'Search by company name, then press Join. Your DSH account becomes the employee account automatically.',
      'setup.searchEmpty': 'No matching company. Check the name or ask your admin for the server address.',
      'setup.memberCount': '{count} employees',
      'setup.account': 'DSH account',
      'setup.accountHint': 'This identity is used automatically when joining; no access code is needed.',
      'setup.accountLocal': 'No DSH account signed in; the local username is used. Sign in to DSH and try again.',
      'setup.codeHint': 'For legacy accounts or colleagues without a DSH account, sign in with an access code.',
      'state.ok': 'Connected',
      'state.idle': 'Not connected',
      'state.error': 'Connection problem',
      'action.sync': 'Sync',
      'action.syncing': 'Syncing…',
      'action.save': 'Save',
      'action.delete': 'Delete',
      'action.settings': 'Settings',
      'action.send': 'Send',
      'action.copy': 'Copy',
      'action.copied': 'Copied',
      'action.cancel': 'Cancel',
      'action.create': 'Create',
      'action.add': 'Add',
      'action.remove': 'Remove',
      'action.close': 'Close',
      'action.refresh': 'Refresh',
      'action.handToAi': 'Hand to AI',
      'action.copyPrompt': 'Copy prompt',
      'action.openPanel': 'Open collaboration panel',
      'action.logout': 'Leave company',
      'action.retry': 'Retry',
      'groups.title': 'Groups',
      'groups.new': 'New',
      'groups.empty': 'No groups yet',
      'groups.emptyHint': 'Create a group, invite colleagues, and the AI joins automatically.',
      'groups.members': '{count} members',
      'groups.unread': '{count} unread',
      'groups.aiIn': 'AI joined',
      'groups.workspace': 'Shared workspace',
      'contacts.title': 'Contacts',
      'contacts.directory': 'Directory',
      'contacts.empty': 'No contacts yet',
      'contacts.emptyHint': 'Switch to Directory to add colleagues, then invite them to groups in one click.',
      'contacts.search': 'Search groups or people',
      'contacts.none': 'No matches',
      'contacts.addDone': 'Added to contacts',
      'people.ai': 'AI',
      'chat.empty': 'Pick a group to start collaborating',
      'chat.emptyDesc': 'Choose a group on the left, or create one with colleagues and the AI.',
      'chat.placeholder': 'Message #{group} (sent to AI by default, Enter to send)',
      'chat.placeholderAi': 'Message #{group} (to AI, Enter to send)',
      'chat.placeholderPeople': 'Message #{group} (to colleagues, @AI to ask)',
      'chat.toAi': 'AI',
      'chat.toPeople': 'Colleagues',
      'chat.replyModeHint': 'Switch recipient; @ mentions override this',
      'chat.fileTooLarge': 'File exceeds 10MB: {name}',
      'chat.delete': 'Delete group',
      'chat.deleteConfirm': 'Delete group "{name}"? Its chat history, tasks, and the server Git repository will be removed permanently.',
      'chat.deleted': 'Group deleted',
      'chat.taskToggle': 'Send as AI task',
      'chat.taskHint': 'Check to run as a local AI task (code/test/merge); a plain @AI message is chat.',
      'chat.noMessages': 'No messages yet — say hello.',
      'run.running': 'Working',
      'run.finished': 'Done — process collapsed',
      'run.finishedShort': 'Done',
      'run.used': '{duration}',
      'run.exploring': 'Deep diving',
      'run.stop': 'Stop',
      'run.stopping': 'Stopping…',
      'run.steps': 'steps',
      'run.failed': 'Failed',
      'run.tool.bash': 'Run command',
      'run.tool.read': 'Read file',
      'run.tool.edit': 'Edit file',
      'run.tool.write': 'Write file',
      'run.tool.glob': 'Find files',
      'run.tool.grep': 'Search content',
      'run.tool.webSearch': 'Web search',
      'run.tool.default': 'Tool call',
      'run.executed': 'Executed commands',
      'run.executing': 'Running commands',
      'run.ai': 'AI assistant',
      'approval.title': 'AI requests to run "{tool}"',
      'approval.allow': 'Allow',
      'approval.deny': 'Deny',
      'approval.pending': 'Waiting for approval',
      'approval.approved': 'Approved',
      'approval.rejected': 'Denied',
      'approval.expired': 'Expired',
      'task.title': 'AI tasks',
      'task.empty': 'No pending AI tasks',
      'task.by': 'assigned by {name}',
      'task.handed': 'Handed to the current conversation',
      'task.handHint': 'The AI runs in the requester’s local Git repository; no manual handoff needed.',
      'task.autoHint': 'The AI replies automatically',
      'repo.button': 'Repo',
      'repo.buttonHint': 'Bind or sync this group’s local Git repository',
      'repo.bound': 'Local repository bound',
      'repo.imported': 'Local repository imported and bound',
      'repo.importFailed': 'Group created, but importing the local repository failed: {message}. Retry from the repository button in the group header.',
      'repo.cloned': 'Repository cloned',
      'repo.pulled': 'git pull done',
      'repo.pullConfirm': 'Local repository: {path}\n\nRun git pull --ff-only?',
      'task.copiedPrompt': 'Prompt copied — paste it into a conversation',
      'task.badge': 'AI task',
      'task.openHint': 'Runs on the requester’s machine',
      'workspace.title': 'AI workspace',
      'workspace.sync': 'Sync now',
      'workspace.never': 'Never synced',
      'workspace.lastSync': 'Last sync {time}',
      'workspace.empty': 'The workspace is empty; files produced by the AI will appear here.',
      'workspace.error': 'Sync note: {message}',
      'workspace.folder': 'The same workspace stays in sync on every member computer.',
      'status.synced': 'Synced',
      'status.pending': 'To upload',
      'status.pulling': 'To update',
      'status.local': 'Local only',
      'status.remote': 'Server only',
      'settings.title': 'Settings',
      'settings.server': 'Server',
      'settings.identity': 'Identity',
      'settings.company': 'Company',
      'settings.employee': 'Employee',
      'settings.rename': 'Rename',
      'settings.renamePlaceholder': 'New display name',
      'settings.renameHint': 'The display name is shared with company members; message bylines update too.',
      'settings.aiName': 'AI assistant name',
      'settings.aiNamePlaceholder': 'New AI assistant name',
      'settings.aiNameHint': 'Any employee can change it; historical message bylines update too.',
      'settings.aiNameSaved': 'AI assistant name updated',
      'settings.role': 'Role',
      'settings.accessCode': 'Admin access code',
      'settings.accessCodeHint': 'Colleagues join with company ID + name + access code. Share it over a trusted channel.',
      'settings.employeeName': 'Colleague name',
      'settings.employeeRole': 'Role (optional)',
      'settings.createEmployee': 'Create employee account',
      'settings.newCode': 'Account created. Access code',
      'settings.newCodeHint': 'Shown once — share it now.',
      'settings.logout': 'Leave company',
      'settings.logoutHint': 'This only clears the local login; no server data is deleted.',
      'settings.serverHint': 'Changing the address requires signing in again.',
      'settings.workspace': 'AI workspace folder',
      'settings.workspacePick': 'Choose folder',
      'settings.workspaceHint': 'Pick an empty folder, or a Git repository folder with .git. .git and files listed in .gitignore are never synced; switching copies nothing.',
      'settings.workspaceSaved': 'Workspace folder updated',
      'settings.workspaceDefaultHint': 'Using the default folder',
      'settings.workspaceDefault': 'Use default',
      'settings.members': 'Members & devices',
      'settings.membersHint': 'Colleagues join by searching the company on their own machine; reset a member’s device binding here when they switch computers.',
      'settings.me': 'me',
      'settings.linked': 'device linked',
      'settings.unlinked': 'not linked',
      'settings.reset': 'Reset device',
      'settings.resetDone': 'Device binding reset',
      'settings.resetConfirm': 'Reset the device binding for {name}? They will need to search and join again.',
      'settings.account': 'DSH account',
      'notice.pickerUnavailable': 'Folder picking is unavailable here; type the path manually.',
      'tab.title': 'Collaboration',
      'tab.guideTitle': 'Company Collaboration',
      'tab.guideDesc': 'Group messages, AI tasks and Git repositories',
      'tab.offline': 'Company server not connected',
      'tab.connect': 'Connect',
      'tab.groups': 'Groups',
      'tab.tasks': 'AI tasks',
      'tab.noGroup': 'No groups yet',
      'tab.openPanel': 'Open collaboration panel',
      'tab.workspace': 'Workspace',
      'notice.error': 'Something went wrong: {message}',
      'notice.synced': 'Workspace synced',
      'notice.sent': 'Sent',
      'notice.sentToAi': 'Sent and handed to the current conversation AI',
      'notice.sentNoSession': 'Sent; open the right Collaboration tab once to auto-hand later messages to the AI',
      'jobs.needSession': 'An AI job arrived, but no DSH session is available; open a conversation first.',
      'jobs.repoMissing': 'This group has no bound local Git repository; the job was returned.',
      'jobs.sessionMissing': 'The DSH session is unavailable; the job was marked failed.',
      'notice.settingsSaved': 'Settings saved',
      'notice.clipboardFailed': 'Clipboard unavailable',
      'modal.group.title': 'New group',
      'modal.group.name': 'Group name',
      'knowledge.title': 'RAG knowledge base',
      'knowledge.button': 'Knowledge',
      'knowledge.hint': 'Upload txt / md / csv / json / html / docx / xlsx / pdf. Files live on the server and are retrieved automatically when someone @AI in the group.',
      'knowledge.scopeGroup': 'This group',
      'knowledge.scopeCompany': 'Whole company',
      'knowledge.chunks': 'chunks',
      'knowledge.superseded': 'superseded',
      'knowledge.empty': 'No knowledge documents yet',
      'knowledge.upload': 'Upload',
      'knowledge.reindex': 'Reindex',
      'knowledge.reindexed': 'Knowledge index rebuilt',
      'knowledge.tooLarge': 'File exceeds 10MB',
      'knowledge.deleteConfirm': 'Delete knowledge document "{name}"?',
      'knowledge.version': 'Version (optional)',
      'knowledge.authorityNormal': 'Normal',
      'knowledge.authorityDepartment': 'Department',
      'knowledge.authorityOfficial': 'Official',
      'knowledge.metaHint': 'Effective date / authority drive conflict ordering',
      'knowledge.entities': 'Entities and aliases',
      'knowledge.noAlias': 'No aliases',
      'knowledge.noEntity': 'No entities detected yet',
      'knowledge.aliasPlaceholder': 'Alias, e.g. Manager Zhang',
      'knowledge.canonicalPlaceholder': 'Canonical name, e.g. Zhang San',
      'knowledge.linkAlias': 'Link alias',
      'knowledge.aliasHint': 'Aliases map names across documents to one entity; without evidence the model must say it is uncertain.',
      'modal.group.repoMode': 'Git repository',
      'modal.group.repoNew': 'Create remote repo',
      'modal.group.repoLocal': 'Use local directory',
      'modal.group.visibility': 'Visibility',
      'modal.group.private': 'Private (members only)',
      'modal.group.public': 'Public (anonymous clone)',
      'modal.group.visibilityHint': 'Public allows anonymous read-only clone; writes still require a member Git token.',
      'modal.group.branch': 'Default branch',
      'modal.group.gitignore': '.gitignore template',
      'modal.group.none': 'None',
      'modal.group.description': 'Repository description',
      'modal.group.descriptionPlaceholder': 'Optional, written to README',
      'modal.group.initReadme': 'Initialize README',
      'modal.group.localPath': 'Local directory',
      'modal.group.localPlaceholder': 'Empty or new path to clone the group repo into',
      'modal.group.localHint': 'Pick an empty/new path; the group repo is cloned after creation. Existing repos must be bound manually.',
      'modal.group.localRequired': 'Choose a local directory',
      'repo.choose': 'Choose',
      'modal.group.placeholder': 'e.g. Website redesign',
      'modal.group.members': 'Invite colleagues',
      'modal.group.aiNote': 'The AI assistant joins automatically and gets this group’s shared workspace.',
      'modal.group.submit': 'Create group',
      'modal.group.emptyPeople': 'No colleagues to invite yet — add some to Contacts first.',
      'loading': 'Loading…',
      'error.backend': 'Plugin backend unreachable: {message}',
      'role.admin': 'Admin',
      'role.member': 'Member',
      'role.ai': 'AI assistant',
    };

    // ---------------------------------------------------------------- styles

    const CSS = `
.dcc-page{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;container-type:inline-size;overflow:hidden}
.dcc-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;height:54px;padding:0 16px 0 18px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base)}
.dcc-brand{display:flex;align-items:center;gap:10px;min-width:0}
.dcc-brandTile{width:30px;height:30px;flex:none;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary))}
.dcc-brandText{min-width:0;display:flex;flex-direction:column}
.dcc-title{font-size:14px;font-weight:600;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcc-sub{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcc-headActions{display:flex;align-items:center;gap:8px;flex:none}
.dcc-pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;background:var(--dsw-alias-bg-layer-1)}
.dcc-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none}
.dcc-dot[data-state=ok]{background:var(--dsw-alias-state-success-primary)}
.dcc-dot[data-state=error]{background:var(--dsw-alias-state-error-primary)}
.dcc-dot[data-state=busy]{background:var(--dsw-alias-state-warn-primary);animation:dcc-pulse 1.2s ease-in-out infinite}
@keyframes dcc-pulse{50%{opacity:.35}}
.dcc-btn{height:28px;padding:0 11px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background .12s,border-color .12s}
.dcc-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-btn[data-primary]{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));border-color:transparent;color:var(--dsw-alias-label-primary-foreground);font-weight:500}
.dcc-btn[data-primary]:hover{background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary)))}
.dcc-btn[data-quiet]{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.dcc-btn[data-quiet]:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dcc-btn:disabled{opacity:.5;cursor:default}
.dcc-iconBtn{width:28px;height:28px;padding:0;border-radius:8px;border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.dcc-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dcc-miniBtn{height:22px;padding:0 7px;border-radius:6px;border:.5px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.dcc-miniBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dcc-miniBtn:disabled{opacity:.5;cursor:default}
.dcc-columns{flex:1;min-height:0;display:grid;grid-template-columns:224px minmax(0,1fr) 272px;overflow:hidden}
.dcc-rail{min-height:0;display:flex;flex-direction:column;border-right:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dcc-search{flex:none;display:flex;align-items:center;gap:6px;margin:10px;padding:0 8px;height:28px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-tertiary)}
.dcc-search input{flex:1;min-width:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.dcc-search input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dcc-railScroll{flex:1;min-height:0;overflow-y:auto;padding:0 8px 16px}
.dcc-railSection{display:flex;flex-direction:column;gap:2px;padding-bottom:10px}
.dcc-railHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 4px 4px;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:500;letter-spacing:.03em}
.dcc-row{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;min-width:0}
.dcc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-row[data-active]{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2)}
.dcc-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dcc-rowName{display:flex;align-items:center;gap:6px;min-width:0}
.dcc-rowName span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-rowSub{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-unread{flex:none;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground);font-size:10px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
.dcc-avatar{width:24px;height:24px;flex:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-primary);font-size:10.5px;font-weight:600;letter-spacing:.02em;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2));overflow:hidden}
.dcc-avatar[data-ai]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent);color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent)}
.dcc-avatarSm{width:20px;height:20px;font-size:9.5px}
.dcc-aiTag{flex:none;font-size:9px;font-weight:600;letter-spacing:.04em;padding:1px 5px;border-radius:999px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent)}
.dcc-chat{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);overflow:hidden}
.dcc-chatHead{flex:none;display:flex;flex-direction:column;gap:6px;padding:10px 16px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1)}
.dcc-chatTitleRow{display:flex;align-items:baseline;gap:8px;min-width:0}
.dcc-chatTitle{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-chatMeta{font-size:11px;color:var(--dsw-alias-label-tertiary);flex:none}
.dcc-chatFolder{font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsh-font-family-code,ui-monospace,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.dcc-memberChips{display:flex;flex-wrap:wrap;gap:5px;max-height:50px;overflow-y:auto}
.dcc-chip{display:inline-flex;align-items:center;gap:4px;height:21px;padding:0 7px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:10.5px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcc-messages{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 8px;display:flex;flex-direction:column;gap:14px}
.dcc-msg{display:flex;gap:10px;min-width:0;padding:2px 0}
.dcc-msgBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.dcc-msgHead{display:flex;align-items:center;gap:7px;min-width:0}
.dcc-msgName{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-msgTime{font-size:10.5px;color:var(--dsw-alias-label-tertiary);flex:none;font-variant-numeric:tabular-nums}
.dcc-msgText{font-size:13px;line-height:1.7;white-space:normal;word-break:break-word;color:var(--dsw-alias-label-primary)}
.dcc-md{display:flex;flex-direction:column;gap:7px;min-width:0}
.dcc-mdP{margin:0;white-space:pre-wrap;line-height:1.7}
.dcc-md h1,.dcc-md h2,.dcc-md h3,.dcc-md h4,.dcc-md h5,.dcc-md h6{margin:2px 0 0;line-height:1.35;font-weight:600;color:var(--dsw-alias-label-primary)}
.dcc-md h1{font-size:18px}.dcc-md h2{font-size:16px}.dcc-md h3{font-size:14px}.dcc-md h4,.dcc-md h5,.dcc-md h6{font-size:13px}
.dcc-mdList{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:3px;color:var(--dsw-alias-label-primary)}
.dcc-mdCode{padding:1px 5px;border-radius:5px;background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1));border:.5px solid var(--dsw-alias-border-l1);font-family:var(--dsw-font-markdown-code-block-small,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11.5px}
.dcc-mdPre{margin:0;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1));overflow:auto;font-family:var(--dsw-font-markdown-code-block-small,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.dcc-mdLang{margin-bottom:6px;color:var(--dsw-alias-label-tertiary);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
.dcc-mdTableWrap{overflow:auto;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md)}
.dcc-mdTable{border-collapse:collapse;width:100%;font-size:12px;line-height:1.5}
.dcc-mdTable th,.dcc-mdTable td{padding:7px 10px;border-bottom:.5px solid var(--dsw-alias-border-l1);text-align:left;vertical-align:top}
.dcc-mdTable th{background:var(--dsw-alias-bg-layer-1);font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dcc-mdTable tr:last-child td{border-bottom:0}
.dcc-mdQuote{margin:0;padding-left:10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}
.dcc-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.dcc-md a:hover{text-decoration:underline}
.dcc-md hr{border:0;border-top:.5px solid var(--dsw-alias-border-l1);margin:4px 0;width:100%}
.dcc-msgSystem{align-self:center;max-width:88%;text-align:center;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-radius:8px;padding:4px 10px}
.dcc-run{border:0;border-radius:0;background:transparent;overflow:visible}
.dcc-runHead{display:flex;align-items:center;gap:6px;min-height:26px;padding:0 2px;font-size:11px;color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none}
.dcc-runHead:hover{background:transparent;color:var(--dsw-alias-label-primary)}
.dcc-runChevron{font-size:10px;color:var(--dsw-alias-label-tertiary);width:10px}
.dcc-runMark{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary));background:color-mix(in srgb,var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary)) 12%,transparent)}
.dcc-runLabel{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dcc-runMeta{font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dcc-runCount{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dcc-runDuration{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dcc-conv{display:flex;flex-direction:column;gap:18px;min-width:0}
.dcc-turn{display:flex;flex-direction:column;gap:8px;min-width:0}
.dcc-live{display:flex;flex-direction:column;gap:10px}
.dcc-liveAnswer{display:flex;flex-direction:column;gap:4px;padding-left:0}
.dcc-approval{display:flex;flex-direction:column;gap:7px;padding:9px 10px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 38%,var(--dsw-alias-border-l1));border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 7%,var(--dsw-alias-bg-layer-1))}
.dcc-approvalHead{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dcc-approvalStatus{margin-left:auto;font-size:10px;font-weight:500;color:var(--dsw-alias-state-warn-primary)}
.dcc-approval[data-status="approved"] .dcc-approvalStatus{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}
.dcc-approval[data-status="rejected"] .dcc-approvalStatus,.dcc-approval[data-status="expired"] .dcc-approvalStatus{color:var(--dsw-alias-label-tertiary)}
.dcc-approvalReason{font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);max-height:130px;overflow:auto}
.dcc-approvalActions{display:flex;gap:8px}
.dcc-approvalBanner{flex:none;display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,var(--dsw-alias-bg-layer-1))}
.dcc-approvalBannerText{flex:none;font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dcc-approvalBannerReason{min-width:0;flex:1;font-size:10px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-runBody{display:flex;flex-direction:column;gap:2px;padding:2px 2px 4px;border-top:0}
.dcc-runItem{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
.dcc-runItem[data-strong]{color:var(--dsw-alias-label-primary)}
.dcc-step{display:flex;gap:8px;padding:7px 0;border-top:.5px solid color-mix(in srgb,var(--dsw-alias-border-l1) 45%,transparent)}
.dcc-step:first-child{border-top:0}
.dcc-stepIcon{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);background:transparent}
.dcc-step[data-type="thought"] .dcc-stepIcon{color:var(--dsw-alias-brand-primary)}
.dcc-step[data-type="tool"] .dcc-stepIcon{color:var(--dsw-alias-label-tertiary)}
.dcc-step[data-type="thought"] .dcc-stepBody{border-left:2px solid var(--dsw-alias-border-l1);padding-left:8px}
.dcc-step[data-type="thought"] .dcc-stepTitle{font-weight:400;color:var(--dsw-alias-label-secondary)}
.dcc-step[data-type="thought"] .dcc-stepDetail{background:transparent;border:0;border-radius:0;padding:0;max-height:240px;font-family:inherit;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-tertiary)}
.dcc-step[data-status="completed"] .dcc-stepIcon{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary))}
.dcc-step[data-status="failed"] .dcc-stepIcon{color:var(--dsw-alias-state-warn-primary)}
.dcc-stepBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.dcc-stepHead{display:flex;align-items:baseline;gap:7px;min-width:0}
.dcc-stepHead[role=button]{cursor:pointer}
.dcc-stepChevron{flex:none;font-size:9px;color:var(--dsw-alias-label-tertiary);width:9px}
.dcc-stepSummary{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px}
.dcc-stepTitle{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-stepStatus{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dcc-stepStatus[data-failed]{color:var(--dsw-alias-state-warn-primary)}
.dcc-stepDetail,.dcc-stepResult{font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-markdown-code-block-small,ui-monospace,SFMono-Regular,Menlo,monospace);max-height:170px;overflow:auto;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1))}
.dcc-stepResult{padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-secondary)}
.dcc-taskChip{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;margin-top:2px;font-size:10px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent);border-radius:999px;padding:1px 6px}
.dcc-taskStrip{flex:none;display:flex;align-items:center;gap:8px;padding:7px 16px;border-top:.5px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,var(--dsw-alias-bg-base));overflow-x:auto}
.dcc-taskStripLabel{font-size:11px;color:var(--dsw-alias-brand-primary);font-weight:600;flex:none}
.dcc-taskStripChip{flex:none;max-width:280px;display:inline-flex;align-items:center;gap:5px;height:23px;padding:0 8px;border-radius:999px;border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcc-taskStripChip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}
.dcc-workingBar{flex:none;display:flex;align-items:center;gap:7px;padding:4px 18px 0;font-size:11px;color:var(--dsw-alias-brand-primary)}
.dcc-workingPulse{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dcc-pulse 1.4s ease-in-out infinite}
.dcc-workingTime{margin-left:auto;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dcc-stopBtn{display:inline-flex;align-items:center;gap:4px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;height:22px;padding:0 8px;font:inherit;font-size:11px;cursor:pointer}
.dcc-stopBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-stopBtn:disabled{opacity:.6;cursor:default}
@keyframes dcc-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
.dcc-composer{flex:none;padding:10px 16px 16px;display:flex;flex-direction:column;gap:6px}
.dcc-composerBox{position:relative;display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:9px 10px 7px;transition:border-color .12s}
.dcc-composerBox:focus-within{border-color:var(--dsw-alias-border-l2);box-shadow:none;outline:none}
.dcc-composerBox textarea:focus,.dcc-composerBox textarea:focus-visible{outline:none!important;box-shadow:none!important;border:0!important}
.dcc-composerBox textarea{width:100%;box-sizing:border-box;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55;resize:none;outline:none;max-height:140px;padding:2px 2px 4px}
.dcc-composerBox textarea::placeholder{color:var(--dsw-alias-label-tertiary)}
.dcc-composerDragging{outline:1px dashed var(--dsw-alias-brand-primary);outline-offset:-4px}
.dcc-attachList{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 6px}
.dcc-attachChip{display:inline-flex;align-items:center;gap:5px;max-width:220px;padding:3px 5px;border:.5px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary)}
.dcc-attachThumb{width:28px;height:28px;object-fit:cover;border-radius:5px}
.dcc-attachName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-attachRemove{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.dcc-msgAttachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.dcc-msgImageLink{display:block;max-width:280px}
.dcc-msgImage{display:block;max-width:280px;max-height:220px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);object-fit:contain}
.dcc-msgFile{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:.5px solid var(--dsw-alias-border-l1);border-radius:7px;color:var(--dsw-alias-label-secondary);font-size:11px;text-decoration:none;background:var(--dsw-alias-bg-layer-1)}
.dcc-composerRow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dcc-replyToggle{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.dcc-replyToggle[data-mode=ai]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.dcc-replyToggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-taskToggle{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.dcc-taskToggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-taskToggle[data-on]{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dcc-sendBtn{height:28px;min-width:62px;border-radius:999px}
.dcc-cursor{display:inline-block;width:2px;height:13px;margin-left:2px;vertical-align:-2px;background:var(--dsw-alias-brand-primary);animation:dcc-blink 1s steps(2,end) infinite}
@keyframes dcc-blink{50%{opacity:0}}
.dcc-mentionMenu{position:absolute;left:8px;right:8px;bottom:calc(100% + 6px);z-index:30;max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 32px rgba(0,0,0,.28)}
.dcc-mentionItem{width:100%;display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dcc-mentionItem:hover,.dcc-mentionItem[data-active]{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-mentionAvatar{flex:none;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-2));border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent)}
.dcc-mentionName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-mentionMeta{margin-left:auto;flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dcc-side{min-height:0;overflow-y:auto;border-left:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);padding:12px;display:flex;flex-direction:column;gap:10px}
.dcc-card{border:.5px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-base);padding:11px;display:flex;flex-direction:column;gap:8px}
.dcc-cardHead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dcc-cardTitle{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.dcc-mono{font-family:var(--dsh-font-family-code,ui-monospace,monospace);font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all;line-height:1.45}
.dcc-note{font-size:10.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary);margin:0}
.dcc-syncLine{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dcc-fileList{display:flex;flex-direction:column;gap:1px;max-height:230px;overflow-y:auto;margin:0 -3px}
.dcc-fileRow{display:flex;align-items:center;gap:6px;padding:4px 5px;border-radius:6px;font-size:11px;min-width:0}
.dcc-fileRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-filePath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);direction:rtl;text-align:left}
.dcc-fileSize{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dcc-fileDot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}
.dcc-fileDot[data-status=synced]{background:var(--dsw-alias-state-success-primary)}
.dcc-fileDot[data-status=pending]{background:var(--dsw-alias-state-warn-primary)}
.dcc-fileDot[data-status=pulling]{background:var(--dsw-alias-brand-primary)}
.dcc-fileDot[data-status=local]{background:var(--dsw-alias-state-warn-primary)}
.dcc-fileDot[data-status=remote]{background:var(--dsw-alias-brand-primary)}
.dcc-taskItem{display:flex;flex-direction:column;gap:3px;padding:7px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.dcc-taskMeta{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--dsw-alias-label-tertiary);min-width:0;overflow:hidden}
.dcc-taskMeta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-taskText{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;word-break:break-word}
.dcc-taskActions{display:flex;gap:6px;justify-content:flex-end}
.dcc-resultList{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto}
.dcc-resultRow{display:flex;align-items:center;gap:10px;padding:8px 9px;border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base)}
.dcc-resultMain{flex:1;min-width:0}
.dcc-resultName{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-accountRow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.dcc-accountMain{flex:1;min-width:0}
.dcc-accountName{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-memberRow{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:6px}
.dcc-memberRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-memberMain{flex:1;min-width:0}
.dcc-memberName{font-size:12px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-errorText{white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.5;color:var(--dsw-alias-state-error-primary);margin:0;padding:12px;border:.5px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);overflow:auto}
.dcc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:100%;padding:32px 24px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.dcc-emptyIcon{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}
.dcc-emptyTitle{font-size:13px;color:var(--dsw-alias-label-secondary);font-weight:500}
.dcc-emptyDesc{font-size:11.5px;max-width:320px;line-height:1.6}
.dcc-setup{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:38px 24px 48px}
.dcc-setupCard{width:100%;max-width:600px;display:flex;flex-direction:column;gap:14px}
.dcc-setupTitle{font-size:20px;font-weight:600;letter-spacing:.01em;margin:0}
.dcc-setupDesc{font-size:12.5px;line-height:1.75;color:var(--dsw-alias-label-secondary);margin:0}
.dcc-setupBox{border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:16px;display:flex;flex-direction:column;gap:10px}
.dcc-label{font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.dcc-input{width:100%;box-sizing:border-box;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
.dcc-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dcc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dcc-field{display:flex;flex-direction:column;gap:5px}
.dcc-accountList{display:flex;flex-direction:column;gap:5px;max-height:190px;overflow-y:auto}
.dcc-accountItem{display:flex;align-items:center;gap:8px;text-align:left;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:7px 8px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dcc-accountItem[data-active]{border-color:var(--dsw-alias-brand-primary)}
.dcc-accountMain{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.dcc-accountName{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-accountBadge{font-size:10px;color:var(--dsw-alias-brand-primary);flex:none}
.dcc-inline{display:flex;gap:8px;align-items:flex-end}
.dcc-segment{display:inline-flex;align-self:flex-start;gap:2px;padding:2px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.dcc-segment button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer}
.dcc-segment button[data-on]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.dcc-inline > .dcc-field{flex:1;min-width:0}
.dcc-seg{display:flex;gap:2px;padding:2px;background:var(--dsw-alias-bg-layer-2);border-radius:9px}
.dcc-seg button{flex:1;height:26px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dcc-seg button:hover{color:var(--dsw-alias-label-primary)}
.dcc-seg button[data-active]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-brand-primary);font-weight:500;box-shadow:0 0 0 .5px var(--dsw-alias-border-l2) inset}
.dcc-codeBox{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);font-family:var(--dsh-font-family-code,ui-monospace,monospace);font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all;line-height:1.5}
.dcc-codeBox .dcc-btn{align-self:flex-start;flex:none}
.dcc-error{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);border-radius:8px;padding:8px 10px;white-space:pre-wrap}
.dcc-hintRow{display:flex;align-items:flex-start;gap:6px;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary)}
.dcc-modalBackdrop{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:24px}
.dcc-modal{width:min(560px,100%);max-height:min(640px,calc(100vh - 48px));display:flex;flex-direction:column;border-radius:14px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);box-shadow:0 24px 70px rgba(0,0,0,.32);overflow:hidden}
.dcc-modalHead{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1)}
.dcc-modalTitle{font-size:14px;font-weight:600}
.dcc-modalBody{flex:1;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.dcc-modalFoot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}
.dcc-checkList{display:flex;flex-direction:column;gap:2px;max-height:220px;overflow-y:auto;border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;padding:4px}
.dcc-checkRow{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:12px}
.dcc-checkRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcc-checkRow input{accent-color:var(--dsw-alias-brand-primary);margin:0}
.dcc-checkRow .dcc-grow{flex:1;min-width:0}
.dcc-checkName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-knowledgeList{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;padding:6px}
.dcc-knowledgeItem{display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:7px;background:var(--dsw-alias-bg-layer-1)}
.dcc-knowledgeMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dcc-knowledgeName{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-checkRole{font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dcc-banner{flex:none;display:flex;align-items:center;gap:8px;padding:7px 16px;font-size:11.5px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,var(--dsw-alias-bg-base));border-bottom:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 25%,transparent)}
.dcc-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:70;max-width:min(520px,90vw);padding:8px 14px;border-radius:999px;font-size:12px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);box-shadow:0 10px 30px rgba(0,0,0,.24);color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:7px;animation:dcc-toast-in .18s ease-out}
.dcc-toast[data-kind=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent)}
.dcc-toastInline{position:static;left:auto;bottom:auto;transform:none;max-width:none;border-radius:8px;box-shadow:none;animation:none;margin-top:2px}
@keyframes dcc-toast-in{from{opacity:0;transform:translate(-50%,6px)}}
.dcc-tab{height:100%;min-height:0;display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;container-type:inline-size}
.dcc-tabHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 0}
.dcc-tabTitle{font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;min-width:0}
.dcc-tabTitle span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcc-tabMeta{font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-top:1px}
.dcc-tabSection{display:flex;flex-direction:column;gap:6px}
.dcc-tabSectionHead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-weight:500;letter-spacing:.03em}
.dcc-tabGroup{display:flex;flex-direction:column;gap:2px}
.dcc-tabMsg{display:flex;gap:6px;font-size:11.5px;line-height:1.5;min-width:0}
.dcc-tabMsgName{flex:none;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-weight:500}
.dcc-tabMsgText{flex:1;min-width:0;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.dcc-tabFoot{display:flex;gap:6px;flex-wrap:wrap;padding-top:2px}
.dcc-tab .dcc-card{background:var(--dsw-alias-bg-layer-1)}
.dcc-tab .dcc-taskItem{background:var(--dsw-alias-bg-base)}
@container (max-width: 880px){.dcc-columns{grid-template-columns:200px minmax(0,1fr)}.dcc-side{display:none}}
@container (max-width: 640px){.dcc-columns{grid-template-columns:minmax(0,1fr)}.dcc-rail{display:none}}
.dcc-page :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dcc-scrollThin{scrollbar-width:thin}
`;

    function installStyles() {
      const element = document.createElement('style');
      element.dataset.plugin = PKG;
      element.textContent = CSS;
      document.head.appendChild(element);
      return () => element.remove();
    }

    // ---------------------------------------------------------------- helpers

    const cx = (...names) => names.filter(Boolean).join(' ');

    function hashHue(text) {
      let hash = 0;
      const value = String(text || '');
      for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 360;
      }
      return hash;
    }

    function renderInline(text, keyPrefix) {
      const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))/g;
      const nodes = [];
      let last = 0;
      let match;
      let index = 0;
      while ((match = pattern.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const token = match[0];
        const key = `${keyPrefix}-${index++}`;
        if (token.startsWith('`')) nodes.push(h('code', { key, className: 'dcc-mdCode' }, token.slice(1, -1)));
        else if (token.startsWith('**') || token.startsWith('__')) nodes.push(h('strong', { key }, token.slice(2, -2)));
        else if (token.startsWith('~~')) nodes.push(h('del', { key }, token.slice(2, -2)));
        else if (token.startsWith('*')) nodes.push(h('em', { key }, token.slice(1, -1)));
        else {
          const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
          if (link) nodes.push(h('a', { key, href: link[2], target: '_blank', rel: 'noreferrer noopener' }, link[1]));
          else nodes.push(token);
        }
        last = match.index + token.length;
      }
      if (last < text.length) nodes.push(text.slice(last));
      return nodes;
    }

    function MarkdownText({ text }) {
      const source = String(text || '').replace(/\r\n?/g, '\n');
      const lines = source.split('\n');
      const blocks = [];
      let index = 0;
      let key = 0;
      const nextKey = (name) => `${name}-${key++}`;
      const isTableLine = (line) => /^\s*\|.*\|\s*$/.test(line);
      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          continue;
        }
        if (line.trim().startsWith('```')) {
          const language = line.trim().slice(3).trim();
          const code = [];
          index += 1;
          while (index < lines.length && !lines[index].trim().startsWith('```')) {
            code.push(lines[index]);
            index += 1;
          }
          index += 1;
          blocks.push(
            h(
              'pre',
              { key: nextKey('pre'), className: 'dcc-mdPre' },
              language ? h('div', { className: 'dcc-mdLang' }, language) : null,
              h('code', null, code.join('\n')),
            ),
          );
          continue;
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading) {
          blocks.push(h(`h${Math.min(6, heading[1].length)}`, { key: nextKey('h') }, renderInline(heading[2], `h${key}`)));
          index += 1;
          continue;
        }
        if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
          blocks.push(h('hr', { key: nextKey('hr') }));
          index += 1;
          continue;
        }
        if (isTableLine(line)) {
          const rows = [];
          while (index < lines.length && isTableLine(lines[index])) {
            rows.push(lines[index]);
            index += 1;
          }
          const cells = rows.map((row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()));
          const body = cells.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
          if (body.length) {
            blocks.push(
              h(
                'div',
                { key: nextKey('tableWrap'), className: 'dcc-mdTableWrap' },
                h(
                  'table',
                  { className: 'dcc-mdTable' },
                  h('thead', null, h('tr', null, body[0].map((cell, cellIndex) => h('th', { key: `th-${cellIndex}` }, renderInline(cell, `th-${cellIndex}`))))),
                  h(
                    'tbody',
                    null,
                    body.slice(1).map((row, rowIndex) =>
                      h('tr', { key: `tr-${rowIndex}` }, row.map((cell, cellIndex) => h('td', { key: `td-${cellIndex}` }, renderInline(cell, `td-${rowIndex}-${cellIndex}`)))),
                    ),
                  ),
                ),
              ),
            );
          }
          continue;
        }
        const unordered = /^\s*[-*+]\s+(.*)$/;
        const ordered = /^\s*\d+\.\s+(.*)$/;
        if (unordered.test(line) || ordered.test(line)) {
          const isOrdered = ordered.test(line);
          const pattern = isOrdered ? ordered : unordered;
          const items = [];
          while (index < lines.length && pattern.test(lines[index])) {
            items.push(pattern.exec(lines[index])[1]);
            index += 1;
          }
          blocks.push(
            h(
              isOrdered ? 'ol' : 'ul',
              { key: nextKey('list'), className: 'dcc-mdList' },
              items.map((item, itemIndex) => h('li', { key: `li-${itemIndex}` }, renderInline(item, `li-${key}-${itemIndex}`))),
            ),
          );
          continue;
        }
        if (/^\s*>\s?/.test(line)) {
          const quote = [];
          while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
            quote.push(lines[index].replace(/^\s*>\s?/, ''));
            index += 1;
          }
          blocks.push(h('blockquote', { key: nextKey('quote'), className: 'dcc-mdQuote' }, renderInline(quote.join('\n'), `quote-${key}`)));
          continue;
        }
        const paragraph = [];
        while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|```|[-*+]\s|\d+\.\s|>\s?)/.test(lines[index]) && !isTableLine(lines[index])) {
          paragraph.push(lines[index]);
          index += 1;
        }
        if (!paragraph.length) {
          paragraph.push(line);
          index += 1;
        }
        blocks.push(h('p', { key: nextKey('p'), className: 'dcc-mdP' }, renderInline(paragraph.join('\n'), `p-${key}`)));
      }
      return h('div', { className: 'dcc-md' }, blocks);
    }

    function formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const pad = (value) => String(value).padStart(2, '0');
      const sameDay = new Date().toDateString() === date.toDateString();
      if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function fileSize(bytes) {
      const size = Number(bytes) || 0;
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
      return `${(size / 1024 / 1024).toFixed(1)} MB`;
    }

    function initialOf(name) {
      const text = String(name || '').trim();
      return text ? text.slice(0, 1).toUpperCase() : '?';
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext !== false) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        /* fall through to the textarea fallback */
      }
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        return copied;
      } catch {
        return false;
      }
    }

    // ---------------------------------------------------------------- icons

    const ICONS = {
      company: [
        ['path', { d: 'M4 20V6.5A1.5 1.5 0 0 1 5.5 5h6A1.5 1.5 0 0 1 13 6.5V20' }],
        ['path', { d: 'M13 10h5.5A1.5 1.5 0 0 1 20 11.5V20' }],
        ['path', { d: 'M3 20h18' }],
        ['path', { d: 'M7 9h3M7 13h3M7 17h3M16 14h1M16 17h1' }],
      ],
      chat: [['path', { d: 'M20 12.5a6.5 6.5 0 0 1-6.5 6.5H9l-4 3v-4.2A6.5 6.5 0 0 1 4 12.5 6.5 6.5 0 0 1 10.5 6h3A6.5 6.5 0 0 1 20 12.5Z' }]],
      users: [
        ['circle', { cx: 9, cy: 8, r: 3.2 }],
        ['path', { d: 'M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5' }],
        ['path', { d: 'M16 5.2a3.2 3.2 0 0 1 0 6.1' }],
        ['path', { d: 'M18 14.7c1.6.7 2.5 2.1 2.5 4.1' }],
      ],
      folder: [['path', { d: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.2h8A1.5 1.5 0 0 1 20.5 9.7v7.8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z' }]],
      sync: [
        ['path', { d: 'M20 11.5a8 8 0 0 0-14-4.7L4 8.7' }],
        ['path', { d: 'M4 4.5v4.2h4.2' }],
        ['path', { d: 'M4 12.5a8 8 0 0 0 14 4.7l2-1.9' }],
        ['path', { d: 'M20 19.5v-4.2h-4.2' }],
      ],
      plus: [['path', { d: 'M12 5v14M5 12h14' }]],
      close: [['path', { d: 'm6 6 12 12M18 6 6 18' }]],
      check: [['path', { d: 'm4.5 12.5 5 5L20 7' }]],
      copy: [
        ['rect', { x: 8.5, y: 8.5, width: 11.5, height: 11.5, rx: 2.2 }],
        ['path', { d: 'M15.5 6.2A2.2 2.2 0 0 0 13.3 4H6.2A2.2 2.2 0 0 0 4 6.2v7.1a2.2 2.2 0 0 0 2.2 2.2' }],
      ],
      send: [
        ['path', { d: 'm4.5 12 15-7-4.4 15-3.6-6.2Z' }],
        ['path', { d: 'm11.5 13.8 8-8.8' }],
      ],
      sparkle: [
        ['path', { d: 'm12 3.5 1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9Z' }],
        ['path', { d: 'M18.5 16.5 19.2 18l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z' }],
      ],
      gear: [
        ['circle', { cx: 12, cy: 12, r: 3 }],
        ['path', { d: 'M19.4 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z' }],
      ],
      search: [
        ['circle', { cx: 10.5, cy: 10.5, r: 6 }],
        ['path', { d: 'm15.2 15.2 4.3 4.3' }],
      ],
      logout: [
        ['path', { d: 'M9.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5' }],
        ['path', { d: 'm15 8 4 4-4 4' }],
        ['path', { d: 'M19 12H9.5' }],
      ],
      retry: [
        ['path', { d: 'M4 11a8 8 0 1 1 2.3 6.4' }],
        ['path', { d: 'M4 4.5v5h5' }],
      ],
      lock: [
        ['rect', { x: 4.5, y: 10, width: 15, height: 10, rx: 2.4 }],
        ['path', { d: 'M8 10V7.5a4 4 0 0 1 8 0V10' }],
      ],
      book: [
        ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z' }],
        ['path', { d: 'M4 18.5A2.5 2.5 0 0 1 6.5 16H20' }],
        ['path', { d: 'M8 7h8M8 10h6' }],
      ],
    };

    function Icon({ name, size = 16 }) {
      const shapes = ICONS[name] || ICONS.chat;
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: 'false',
        },
        shapes.map(([tag, props], index) => h(tag, { key: index, ...props })),
      );
    }

    function Avatar({ name, ai, small }) {
      return h(
        'span',
        { className: cx('dcc-avatar', small && 'dcc-avatarSm'), 'data-ai': ai ? '' : undefined, 'aria-hidden': true },
        ai ? h(Icon, { name: 'sparkle', size: small ? 12 : 14 }) : initialOf(name),
      );
    }

    function StatusDot({ state }) {
      return h('span', { className: 'dcc-dot', 'data-state': state || undefined, 'aria-hidden': true });
    }

    function AiTag({ t }) {
      return h('span', { className: 'dcc-aiTag' }, t('people.ai'));
    }

    // ---------------------------------------------------------------- store

    function createStore(api) {
      let snapshot = {
        ready: false,
        busy: false,
        data: null,
        error: '',
        notice: null,
        selectedGroup: '',
        messages: {},
      };
      const listeners = new Set();
      const readMarks = new Map();
      let timer = null;
      let noticeTimer = null;

      const publish = (patch) => {
        snapshot = { ...snapshot, ...patch };
        for (const listener of listeners) {
          try {
            listener();
          } catch (error) {
            console.warn('[company-collab] listener failed', error);
          }
        }
      };

      const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };

      const getSnapshot = () => snapshot;

      const notify = (kind, text) => {
        publish({ notice: { kind, text, at: Date.now() } });
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => publish({ notice: null }), 5000);
      };

      async function request(method, path, body) {
        let response;
        try {
          response = await fetch(`${API}${path}`, {
            method,
            headers: body === undefined ? {} : { 'content-type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
          });
        } catch (error) {
          throw new Error(api.t('error.backend', { message: String(error && error.message ? error.message : error) }));
        }
        let json = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }
        if (!response.ok || !json || json.ok === false) {
          const message = (json && json.error) || `HTTP ${response.status}`;
          throw new Error(String(message));
        }
        return json;
      }

      async function refresh() {
        try {
          const json = await request('GET', '/state');
          publish({ ready: true, data: json, error: '' });
          return json;
        } catch (error) {
          publish({ ready: true, error: String(error.message || error) });
          return null;
        }
      }

      async function act(path, body) {
        publish({ busy: true });
        try {
          const json = await request('POST', path, body);
          if (json.state) publish({ data: json.state, error: '' });
          else await refresh();
          return json;
        } finally {
          publish({ busy: false });
        }
      }

      function mergeMessages(previous, incoming) {
        if (!incoming.length) return previous;
        const seen = new Set(previous.map((entry) => entry.id));
        const merged = previous.slice();
        for (const message of incoming) {
          if (!seen.has(message.id)) {
            seen.add(message.id);
            merged.push(message);
          }
        }
        merged.sort((left, right) => left.seq - right.seq);
        return merged;
      }

      async function loadMessages(groupId, reset) {
        const current = snapshot.messages[groupId] ?? { items: [], seq: 0, loading: false, error: '' };
        if (!reset && current.loading) return;
        if (reset) {
          publish({ messages: { ...snapshot.messages, [groupId]: { items: [], seq: 0, loading: true, error: '' } } });
        }
        try {
          const json = await request(
            'GET',
            `/messages?groupId=${encodeURIComponent(groupId)}&since=${reset ? 0 : current.seq}`,
          );
          const items = reset ? json.messages ?? [] : mergeMessages(current.items, json.messages ?? []);
          publish({
            messages: {
              ...snapshot.messages,
              [groupId]: { items, seq: Number(json.seq) || 0, loading: false, error: '' },
            },
          });
          const seq = Number(json.seq) || 0;
          if (seq > 0 && readMarks.get(groupId) !== seq) {
            readMarks.set(groupId, seq);
            request('POST', '/messages/read', { groupId, seq }).catch(() => {});
            const data = snapshot.data;
            if (data) {
              const groups = (data.groups ?? []).map((entry) =>
                entry.id === groupId ? { ...entry, unread: 0 } : entry,
              );
              publish({ data: { ...data, groups } });
            }
          }
        } catch (error) {
          publish({
            messages: {
              ...snapshot.messages,
              [groupId]: { ...current, loading: false, error: String(error.message || error) },
            },
          });
        }
      }

      function tick() {
        if (typeof document !== 'undefined' && document.hidden) return;
        refresh();
        const groupId = snapshot.selectedGroup;
        if (groupId) loadMessages(groupId, false);
      }

      function start() {
        refresh();
        const onVisible = () => {
          if (!document.hidden) tick();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
          clearTimeout(noticeTimer);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('focus', onVisible);
        };
      }

      return {
        getSnapshot,
        subscribe,
        refresh,
        notify,
        start,
        mergeMessage(groupId, message) {
          const current = snapshot.messages[groupId] ?? { items: [], seq: 0, loading: false, error: '' };
          const items = current.items.slice();
          const index = items.findIndex((entry) => entry.id === message.id);
          if (index >= 0) items[index] = message;
          else items.push(message);
          items.sort((a, b) => (a.seq || 0) - (b.seq || 0));
          publish({
            messages: {
              ...snapshot.messages,
              [groupId]: { ...current, items, seq: Math.max(current.seq || 0, message.seq || 0) },
            },
          });
        },
        configureServer: (serverUrl) => act('/settings', { serverUrl }),
        createCompany: (companyName, employeeName) => act('/setup/company', { companyName, employeeName }),
        switchAccount: async (key) => {
          const result = await act('/accounts/switch', { key });
          publish({ selectedGroup: '', messages: {}, live: null });
          return result;
        },
        loginOnServer: async (serverUrl, companyId, employeeName, accessCode) => {
          const result = await act('/accounts/login', { serverUrl, companyId, employeeName, accessCode });
          publish({ selectedGroup: '', messages: {}, live: null });
          return result;
        },
        createCompanyOnServer: async (serverUrl, companyName, employeeName) => {
          const result = await act('/accounts/create', { serverUrl, companyName, employeeName });
          publish({ selectedGroup: '', messages: {}, live: null });
          return result;
        },
        login: (companyId, employeeName, accessCode) => act('/setup/login', { companyId, employeeName, accessCode }),
        joinCompany: (companyId) => act('/companies/join', { companyId }),
        searchCompanies: async (query) => {
          const json = await request('GET', `/companies?q=${encodeURIComponent(query || '')}`);
          return json.items ?? [];
        },
        resetEmployee: (employeeId) => act('/employees/reset', { employeeId }),
        renameSelf: (name) => act('/me/rename', { name }),
        renameAi: (name) => act('/ai/rename', { name }),
        deleteGroup: (groupId) => act('/groups/delete', { groupId }),
        heartbeat: () => request('POST', '/me/heartbeat', {}),
        aiJobs: async () => {
          const json = await request('GET', '/ai/jobs');
          return json.items ?? [];
        },
        claimJob: (jobId) => request('POST', '/ai/jobs/claim', { jobId }),
        completeJob: (jobId, note) => request('POST', '/ai/jobs/complete', { jobId, note }),
        failJob: (jobId, error) => request('POST', '/ai/jobs/fail', { jobId, error }),
        repoStatus: async (groupId) => {
          const json = await request('GET', `/git/status?groupId=${encodeURIComponent(groupId)}`);
          return json.status;
        },
        bindRepo: (groupId, localPath) => act('/git/bind', { groupId, path: localPath }),
        pullRepo: (groupId) => act('/git/pull', { groupId }),
        logout: () => act('/setup/logout', {}),
        createEmployee: (name, role) => act('/employees', { name, role }),
        addContact: (employeeId) => act('/contacts', { employeeId }),
        removeContact: (employeeId) => act('/contacts', { employeeId, remove: true }),
        createGroup: (name, memberIds, repo) => act('/groups', { name, memberIds, repo }),
        knowledge: async (groupId) => {
          const json = await request('GET', `/knowledge?groupId=${encodeURIComponent(groupId || '')}`);
          return json.items ?? [];
        },
        uploadKnowledge: (groupId, name, dataBase64, mime, meta = {}) =>
          request('POST', '/knowledge', { groupId, name, dataBase64, mime, ...meta }),
        deleteKnowledge: (docId) => request('POST', '/knowledge/delete', { docId }),
        knowledgeEntities: async () => {
          const json = await request('GET', '/knowledge/entities');
          return json.items ?? [];
        },
        addKnowledgeAlias: (alias, canonical) => request('POST', '/knowledge/alias', { alias, canonical }),
        reindexKnowledge: () => request('POST', '/knowledge/reindex', {}),
        searchKnowledge: async (query, groupId) => {
          const json = await request('POST', '/knowledge/search', { query, groupId });
          return json.items ?? [];
        },
        async openGroup(groupId) {
          publish({ selectedGroup: groupId });
          const existing = snapshot.messages[groupId];
          await loadMessages(groupId, !existing || !existing.items.length);
        },
        send: async (groupId, text, options = false) => {
          const payload = typeof options === 'object' && options ? options : { task: Boolean(options) };
          const result = await act('/messages', { groupId, text, ...payload });
          await loadMessages(groupId, true);
          return result;
        },
        uploadAttachment: (groupId, name, dataBase64, mime) =>
          act('/attachments', { groupId, name, dataBase64, mime }).then((json) => json.attachment),
        attachmentUrl: (groupId, attachmentId) =>
          `/company-collab/api/attachment?groupId=${encodeURIComponent(groupId)}&id=${encodeURIComponent(attachmentId)}`,
        cancelAi: (groupId) => act('/ai/cancel', { groupId }),
        claimTask: (taskId) => act('/tasks/claim', { taskId }),
        completeTask: (taskId, note) => act('/tasks/complete', { taskId, note, asAi: true }),
        refreshMessages: (groupId, reset) => loadMessages(groupId, reset),
      };
    }

    function useStore() {
      const store = shared.store;
      return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    }

    // ---------------------------------------------------------------- shared pieces

    function Notice({ t, notice, inline }) {
      if (!notice) return null;
      return h(
        'div',
        { className: cx('dcc-toast', inline && 'dcc-toastInline'), 'data-kind': notice.kind, role: 'status' },
        notice.kind === 'error' ? h(Icon, { name: 'close', size: 13 }) : h(Icon, { name: 'check', size: 13 }),
        h('span', {}, notice.text),
      );
    }

    function ErrorLine({ text }) {
      if (!text) return null;
      return h('div', { className: 'dcc-error' }, text);
    }

    function Modal({ t, title, children, footer, onClose }) {
      const ref = React.useRef(null);
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        };
        document.addEventListener('keydown', onKey, true);
        const focusable = ref.current?.querySelector('input, textarea') ?? ref.current?.querySelector('button');
        focusable?.focus?.();
        return () => document.removeEventListener('keydown', onKey, true);
      }, [onClose]);
      return h(
        'div',
        {
          className: 'dcc-modalBackdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose();
          },
        },
        h(
          'div',
          { className: 'dcc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, ref },
          h(
            'div',
            { className: 'dcc-modalHead' },
            h('div', { className: 'dcc-modalTitle' }, title),
            h(
              'button',
              { type: 'button', className: 'dcc-iconBtn', 'aria-label': t('action.close'), onClick: onClose },
              h(Icon, { name: 'close', size: 15 }),
            ),
          ),
          h('div', { className: 'dcc-modalBody' }, children),
          footer ? h('div', { className: 'dcc-modalFoot' }, footer) : null,
        ),
      );
    }

    function buildTaskPrompt(data, task) {
      return [
        '【企业协作任务】',
        `公司「${data.identity?.company?.name ?? ''}」的群组「${task.groupName}」里，${task.createdByName} 指派了一个 AI 任务：`,
        '"""',
        task.text,
        '"""',
        '请按以下步骤处理：',
        `1. 先调用 company_hub 工具 action=messages、group="${task.groupName}" 查看群上下文；`,
        '2. 在该群已绑定的本地 Git 仓库中修改文件并运行测试；',
        '3. 用分支提交、测试通过后合并回 main 并 push，然后删除分支；',
        `4. 用 action=send、group="${task.groupName}" 把结论发回群聊；`,
        `5. 用 action=task_done、task="${task.id}"、text="完成说明" 标记任务完成。`,
      ].join('\n');
    }

    // ---------------------------------------------------------------- setup screen

    function SetupScreen({ t, snap }) {
      const store = shared.store;
      const data = snap.data ?? {};
      const account = data.account;
      const [url, setUrl] = React.useState(data.serverUrl || 'http://127.0.0.1:8477');
      const [mode, setMode] = React.useState('search');
      const [query, setQuery] = React.useState('');
      const [results, setResults] = React.useState(null);
      const [searching, setSearching] = React.useState(false);
      const [companyName, setCompanyName] = React.useState('');
      const [personName, setPersonName] = React.useState(account?.name || '');
      const [companyId, setCompanyId] = React.useState('');
      const [accessCode, setAccessCode] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [copied, setCopied] = React.useState(false);

      const connection = data.connection ?? { status: 'idle' };
      const connected = Boolean(data.serverUrl) && connection.status !== 'error';
      const command = data.serverScript?.command ?? '';

      const run = async (operation) => {
        setError('');
        setBusy(true);
        try {
          await operation();
        } catch (failure) {
          setError(String(failure.message || failure));
          store.refresh();
        } finally {
          setBusy(false);
        }
      };

      const onConnect = () =>
        run(async () => {
          await store.configureServer(url);
          store.notify('ok', t('setup.ready'));
        });

      const onSearch = () =>
        run(async () => {
          if (!data.serverUrl) await store.configureServer(url);
          setSearching(true);
          try {
            setResults(await store.searchCompanies(query));
          } finally {
            setSearching(false);
          }
        });

      const onJoin = (id) =>
        run(async () => {
          if (!data.serverUrl) await store.configureServer(url);
          await store.joinCompany(id);
        });

      const onCreate = () =>
        run(async () => {
          if (!data.serverUrl) await store.configureServer(url);
          await store.createCompany(companyName, personName || account?.name || '');
        });

      const onLogin = () =>
        run(async () => {
          if (!data.serverUrl) await store.configureServer(url);
          await store.login(companyId, personName || account?.name || '', accessCode);
        });

      return h(
        'div',
        { className: 'dcc-setup' },
        h(
          'div',
          { className: 'dcc-setupCard' },
          h('h1', { className: 'dcc-setupTitle' }, t('setup.title')),
          h('p', { className: 'dcc-setupDesc' }, t('setup.desc')),

          h(
            'div',
            { className: 'dcc-setupBox' },
            h(
              'div',
              { className: 'dcc-cardHead' },
              h('div', { className: 'dcc-cardTitle' }, h(Icon, { name: 'company', size: 14 }), t('setup.command')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dcc-miniBtn',
                  disabled: !command,
                  onClick: async () => {
                    const ok = await copyText(command);
                    setCopied(ok);
                    if (ok) store.notify('ok', t('action.copied'));
                  },
                },
                h(Icon, { name: copied ? 'check' : 'copy', size: 13 }),
                copied ? t('action.copied') : t('setup.copy'),
              ),
            ),
            h('div', { className: 'dcc-codeBox' }, command || t('loading')),
            h('p', { className: 'dcc-note' }, t('setup.connectHint')),
          ),

          h(
            'div',
            { className: 'dcc-setupBox' },
            h(
              'div',
              { className: 'dcc-cardHead' },
              h('div', { className: 'dcc-cardTitle' }, h(Icon, { name: 'sparkle', size: 14 }), t('setup.server')),
              h(
                'span',
                { className: 'dcc-pill' },
                h(StatusDot, {
                  state: connection.status === 'ok' ? 'ok' : connection.status === 'error' ? 'error' : undefined,
                }),
                connection.status === 'ok' ? t('state.ok') : connection.status === 'error' ? t('state.error') : t('state.idle'),
              ),
            ),
            h(
              'label',
              { className: 'dcc-field' },
              h('span', { className: 'dcc-label' }, t('setup.server')),
              h(
                'div',
                { className: 'dcc-inline' },
                h('input', {
                  className: 'dcc-input',
                  value: url,
                  spellCheck: false,
                  placeholder: t('setup.serverPlaceholder'),
                  onChange: (event) => setUrl(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') onConnect();
                  },
                }),
                h(
                  'button',
                  { type: 'button', className: 'dcc-btn', disabled: busy, onClick: onConnect, style: { flex: 'none' } },
                  busy ? t('loading') : t('setup.connect'),
                ),
              ),
            ),
            connection.status === 'error' ? h(ErrorLine, { text: connection.message }) : null,

            connected
              ? h(
                  React.Fragment,
                  null,
                  h(
                    'div',
                    { className: 'dcc-accountRow' },
                    h(Icon, { name: 'users', size: 15 }),
                    h(
                      'div',
                      { className: 'dcc-accountMain' },
                      h('div', { className: 'dcc-accountName' }, `${t('setup.account')}：${account?.name || t('loading')}`),
                      h(
                        'div',
                        { className: 'dcc-note' },
                        account?.source === 'dsh' ? t('setup.accountHint') : t('setup.accountLocal'),
                      ),
                    ),
                    account?.source === 'dsh' ? h('span', { className: 'dcc-aiTag' }, 'DSH') : null,
                  ),
                  h(
                    'div',
                    { className: 'dcc-seg', role: 'tablist' },
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        'data-active': mode === 'search' ? '' : undefined,
                        onClick: () => setMode('search'),
                      },
                      t('setup.tabSearch'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        'data-active': mode === 'create' ? '' : undefined,
                        onClick: () => setMode('create'),
                      },
                      t('setup.tabCreate'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        'data-active': mode === 'code' ? '' : undefined,
                        onClick: () => setMode('code'),
                      },
                      t('setup.tabCode'),
                    ),
                  ),
                  mode === 'search'
                    ? h(
                        React.Fragment,
                        null,
                        h(
                          'div',
                          { className: 'dcc-inline' },
                          h('input', {
                            className: 'dcc-input',
                            value: query,
                            spellCheck: false,
                            placeholder: t('setup.searchPlaceholder'),
                            onChange: (event) => setQuery(event.target.value),
                            onKeyDown: (event) => {
                              if (event.key === 'Enter' && query.trim()) onSearch();
                            },
                          }),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dcc-btn',
                              'data-primary': '',
                              style: { flex: 'none' },
                              disabled: busy || searching || !query.trim(),
                              onClick: onSearch,
                            },
                            searching ? t('loading') : t('setup.searchAction'),
                          ),
                        ),
                        results === null
                          ? h('p', { className: 'dcc-note' }, t('setup.searchHint'))
                          : results.length
                            ? h(
                                'div',
                                { className: 'dcc-resultList' },
                                results.map((item) =>
                                  h(
                                    'div',
                                    { key: item.id, className: 'dcc-resultRow' },
                                    h(
                                      'div',
                                      { className: 'dcc-resultMain' },
                                      h('div', { className: 'dcc-resultName' }, item.name),
                                      h(
                                        'div',
                                        { className: 'dcc-note' },
                                        `${item.id} · ${t('setup.memberCount', { count: item.memberCount })}`,
                                      ),
                                    ),
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'dcc-btn',
                                        'data-primary': '',
                                        disabled: busy,
                                        onClick: () => onJoin(item.id),
                                      },
                                      t('setup.join'),
                                    ),
                                  ),
                                ),
                              )
                            : h('p', { className: 'dcc-note' }, t('setup.searchEmpty')),
                      )
                    : mode === 'create'
                      ? h(
                          React.Fragment,
                          null,
                          h(
                            'label',
                            { className: 'dcc-field' },
                            h('span', { className: 'dcc-label' }, t('setup.company')),
                            h('input', {
                              className: 'dcc-input',
                              value: companyName,
                              placeholder: t('setup.companyPlaceholder'),
                              onChange: (event) => setCompanyName(event.target.value),
                            }),
                          ),
                          h(
                            'label',
                            { className: 'dcc-field' },
                            h('span', { className: 'dcc-label' }, t('setup.name')),
                            h('input', {
                              className: 'dcc-input',
                              value: personName,
                              placeholder: account?.name || t('setup.namePlaceholder'),
                              onChange: (event) => setPersonName(event.target.value),
                              onKeyDown: (event) => {
                                if (event.key === 'Enter') onCreate();
                              },
                            }),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dcc-btn',
                              'data-primary': '',
                              disabled: busy || !companyName.trim(),
                              onClick: onCreate,
                            },
                            t('setup.create'),
                          ),
                          h('div', { className: 'dcc-hintRow' }, h(Icon, { name: 'lock', size: 13 }), h('span', {}, t('setup.adminHint'))),
                        )
                      : h(
                          React.Fragment,
                          null,
                          h(
                            'label',
                            { className: 'dcc-field' },
                            h('span', { className: 'dcc-label' }, t('setup.companyId')),
                            h('input', {
                              className: 'dcc-input',
                              value: companyId,
                              placeholder: t('setup.companyIdPlaceholder'),
                              spellCheck: false,
                              onChange: (event) => setCompanyId(event.target.value),
                            }),
                          ),
                          h(
                            'label',
                            { className: 'dcc-field' },
                            h('span', { className: 'dcc-label' }, t('setup.name')),
                            h('input', {
                              className: 'dcc-input',
                              value: personName,
                              placeholder: account?.name || t('setup.namePlaceholder'),
                              onChange: (event) => setPersonName(event.target.value),
                            }),
                          ),
                          h(
                            'label',
                            { className: 'dcc-field' },
                            h('span', { className: 'dcc-label' }, t('setup.code')),
                            h('input', {
                              className: 'dcc-input',
                              value: accessCode,
                              placeholder: t('setup.codePlaceholder'),
                              spellCheck: false,
                              onChange: (event) => setAccessCode(event.target.value.toUpperCase()),
                              onKeyDown: (event) => {
                                if (event.key === 'Enter') onLogin();
                              },
                            }),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dcc-btn',
                              'data-primary': '',
                              disabled: busy || !companyId.trim() || !personName.trim() || !accessCode.trim(),
                              onClick: onLogin,
                            },
                            t('setup.join'),
                          ),
                          h('p', { className: 'dcc-note' }, t('setup.codeHint')),
                        ),
                )
              : h('p', { className: 'dcc-note' }, t('setup.notReady')),
            error ? h(ErrorLine, { text: error }) : null,
          ),
          h(Notice, { t, notice: snap.notice }),
        ),
      );
    }

    // ---------------------------------------------------------------- group dialog

    function GroupDialog({ t, snap, onClose }) {
      const store = shared.store;
      const data = snap.data;
      const me = data.identity?.employee;
      const people = (data.directory ?? []).filter((entry) => entry.id !== me?.id && !entry.isAi);
      const contactIds = new Set((data.contacts ?? []).map((entry) => entry.id));
      const [name, setName] = React.useState('');
      const [repoMode, setRepoMode] = React.useState('new');
      const [visibility, setVisibility] = React.useState('private');
      const [branch, setBranch] = React.useState('main');
      const [description, setDescription] = React.useState('');
      const [gitignore, setGitignore] = React.useState('node');
      const [initReadme, setInitReadme] = React.useState(true);
      const [localPath, setLocalPath] = React.useState('');
      const [selected, setSelected] = React.useState(
        () => new Set(people.filter((entry) => contactIds.has(entry.id)).map((entry) => entry.id)),
      );
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const toggle = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
      };

      const submit = async () => {
        setError('');
        if (repoMode === 'local' && !localPath.trim()) {
          setError(t('modal.group.localRequired'));
          return;
        }
        setBusy(true);
        let pendingGroupId = '';
        try {
          const repo =
            repoMode === 'new'
              ? { mode: 'new', defaultBranch: branch.trim() || 'main', description: description.trim(), gitignore, initReadme, visibility }
              : { mode: 'local', initReadme: false, gitignore: 'none', visibility };
          const result = await store.createGroup(name, [...selected], repo);
          const groupId = result.group?.id;
          pendingGroupId = groupId || '';
          if (repoMode === 'local' && groupId && localPath.trim()) {
            await store.bindRepo(groupId, localPath.trim());
          }
          onClose();
          if (groupId) await store.openGroup(groupId);
        } catch (failure) {
          if (pendingGroupId) {
            store.notify('error', t('repo.importFailed', { message: String(failure.message || failure) }));
            onClose();
            await store.openGroup(pendingGroupId);
          } else {
            setError(String(failure.message || failure));
          }
        } finally {
          setBusy(false);
        }
      };

      const pickLocalDirectory = async () => {
        try {
          const picker = shared.ctx?.get?.('uiWorkspace');
          if (!picker || typeof picker.pickDirectory !== 'function') {
            setError(t('notice.pickerUnavailable'));
            return;
          }
          const picked = await picker.pickDirectory();
          if (picked) setLocalPath(picked);
        } catch (failure) {
          setError(String(failure.message || failure));
        }
      };

      return h(
        Modal,
        {
          t,
          title: t('modal.group.title'),
          onClose,
          footer: [
            h(
              'button',
              { key: 'cancel', type: 'button', className: 'dcc-btn', 'data-quiet': '', onClick: onClose },
              t('action.cancel'),
            ),
            h(
              'button',
              {
                key: 'create',
                type: 'button',
                className: 'dcc-btn',
                'data-primary': '',
                disabled: busy || !name.trim(),
                onClick: submit,
              },
              busy ? t('loading') : t('modal.group.submit'),
            ),
          ],
        },
        h(
          'label',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('modal.group.name')),
          h('input', {
            className: 'dcc-input',
            value: name,
            placeholder: t('modal.group.placeholder'),
            onChange: (event) => setName(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && name.trim() && !busy) submit();
            },
          }),
        ),
        h(
          'div',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('modal.group.repoMode')),
          h(
            'div',
            { className: 'dcc-segment' },
            h(
              'button',
              { type: 'button', 'data-on': repoMode === 'new' ? '' : undefined, onClick: () => setRepoMode('new') },
              t('modal.group.repoNew'),
            ),
            h(
              'button',
              { type: 'button', 'data-on': repoMode === 'local' ? '' : undefined, onClick: () => setRepoMode('local') },
              t('modal.group.repoLocal'),
            ),
          ),
        ),
        repoMode === 'new'
          ? h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dcc-field' },
                h('span', { className: 'dcc-label' }, t('modal.group.visibility')),
                h(
                  'div',
                  { className: 'dcc-segment' },
                  h(
                    'button',
                    { type: 'button', 'data-on': visibility === 'private' ? '' : undefined, onClick: () => setVisibility('private') },
                    t('modal.group.private'),
                  ),
                  h(
                    'button',
                    { type: 'button', 'data-on': visibility === 'public' ? '' : undefined, onClick: () => setVisibility('public') },
                    t('modal.group.public'),
                  ),
                ),
                h('p', { className: 'dcc-note' }, t('modal.group.visibilityHint')),
              ),
              h(
                'div',
                { className: 'dcc-inline' },
                h(
                  'label',
                  { className: 'dcc-field', style: { flex: 1 } },
                  h('span', { className: 'dcc-label' }, t('modal.group.branch')),
                  h('input', {
                    className: 'dcc-input',
                    value: branch,
                    placeholder: 'main',
                    onChange: (event) => setBranch(event.target.value),
                  }),
                ),
                h(
                  'label',
                  { className: 'dcc-field', style: { flex: 1 } },
                  h('span', { className: 'dcc-label' }, t('modal.group.gitignore')),
                  h(
                    'select',
                    { className: 'dcc-input', value: gitignore, onChange: (event) => setGitignore(event.target.value) },
                    h('option', { value: 'node' }, 'Node'),
                    h('option', { value: 'python' }, 'Python'),
                    h('option', { value: 'none' }, t('modal.group.none')),
                  ),
                ),
              ),
              h(
                'label',
                { className: 'dcc-field' },
                h('span', { className: 'dcc-label' }, t('modal.group.description')),
                h('input', {
                  className: 'dcc-input',
                  value: description,
                  placeholder: t('modal.group.descriptionPlaceholder'),
                  onChange: (event) => setDescription(event.target.value),
                }),
              ),
              h(
                'label',
                { className: 'dcc-checkRow', style: { paddingLeft: 0 } },
                h('input', { type: 'checkbox', checked: initReadme, onChange: () => setInitReadme(!initReadme) }),
                h('span', null, t('modal.group.initReadme')),
              ),
            )
          : h(
              'label',
              { className: 'dcc-field' },
              h('span', { className: 'dcc-label' }, t('modal.group.localPath')),
              h(
                'div',
                { className: 'dcc-inline' },
                h('input', {
                  className: 'dcc-input',
                  value: localPath,
                  placeholder: t('modal.group.localPlaceholder'),
                  onChange: (event) => setLocalPath(event.target.value),
                }),
                h(
                  'button',
                  { type: 'button', className: 'dcc-btn', style: { flex: 'none' }, onClick: pickLocalDirectory },
                  h(Icon, { name: 'folder', size: 13 }),
                  t('repo.choose'),
                ),
              ),
              h('p', { className: 'dcc-note' }, t('modal.group.localHint')),
            ),
        h(
          'div',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('modal.group.members')),
          people.length
            ? h(
                'div',
                { className: 'dcc-checkList' },
                people.map((person) =>
                  h(
                    'label',
                    { key: person.id, className: 'dcc-checkRow' },
                    h('input', {
                      type: 'checkbox',
                      checked: selected.has(person.id),
                      onChange: () => toggle(person.id),
                    }),
                    h(Avatar, { name: person.name, small: true }),
                    h(
                      'span',
                      { className: 'dcc-grow' },
                      h('div', { className: 'dcc-checkName' }, person.name),
                      h('div', { className: 'dcc-checkRole' }, person.role || t('role.member')),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'dcc-note' }, t('modal.group.emptyPeople')),
        ),
        h('div', { className: 'dcc-hintRow' }, h(Icon, { name: 'sparkle', size: 13 }), h('span', {}, t('modal.group.aiNote'))),
        error ? h(ErrorLine, { text: error }) : null,
      );
    }

    // ---------------------------------------------------------------- settings dialog

    function SettingsDialog({ t, snap, onClose }) {
      const store = shared.store;
      const ctx = shared.ctx;
      const data = snap.data;
      const identity = data.identity;
      const isAdmin = Boolean(data.access);
      const me = identity?.employee;
      const [url, setUrl] = React.useState(data.serverUrl || '');
      const [renameValue, setRenameValue] = React.useState(me?.name || '');
      const aiMember = (data.directory ?? []).find((entry) => entry.isAi);
      const [aiNameValue, setAiNameValue] = React.useState(aiMember?.name || 'AI 助理');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const run = async (operation) => {
        setError('');
        setBusy(true);
        try {
          await operation();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      const resetMember = (member) => {
        if (!window.confirm(t('settings.resetConfirm', { name: member.name }))) return;
        run(async () => {
          await store.resetEmployee(member.id);
          store.notify('ok', t('settings.resetDone'));
        });
      };

      const members = (data.directory ?? []).filter((entry) => !entry.isAi);

      return h(
        Modal,
        {
          t,
          title: t('settings.title'),
          onClose,
          footer: [
            h(
              'button',
              {
                key: 'logout',
                type: 'button',
                className: 'dcc-btn',
                'data-quiet': '',
                onClick: () =>
                  run(async () => {
                    await store.logout();
                    onClose();
                  }),
              },
              h(Icon, { name: 'logout', size: 14 }),
              t('action.logout'),
            ),
            h('button', { key: 'close', type: 'button', className: 'dcc-btn', onClick: onClose }, t('action.close')),
          ],
        },
        h(
          'div',
          { className: 'dcc-card' },
          h('div', { className: 'dcc-cardTitle' }, t('settings.identity')),
          h('div', { className: 'dcc-mono' }, `${t('settings.company')}：${identity?.company?.name ?? '—'}`),
          h(
            'div',
            { className: 'dcc-mono' },
            `${t('settings.employee')}：${identity?.employee?.name ?? '—'}（${identity?.employee?.role ?? '—'}）`,
          ),
          h(
            'div',
            { className: 'dcc-inline', style: { marginTop: '8px' } },
            h('input', {
              className: 'dcc-input',
              value: renameValue,
              placeholder: t('settings.renamePlaceholder'),
              onChange: (event) => setRenameValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && renameValue.trim() && renameValue.trim() !== me?.name) {
                  run(async () => {
                    await store.renameSelf(renameValue.trim());
                    store.notify('ok', t('settings.renameSaved'));
                  });
                }
              },
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-btn',
                style: { flex: 'none' },
                disabled: busy || !renameValue.trim() || renameValue.trim() === me?.name,
                onClick: () =>
                  run(async () => {
                    await store.renameSelf(renameValue.trim());
                    store.notify('ok', t('settings.renameSaved'));
                  }),
              },
              t('settings.rename'),
            ),
          ),
          h('p', { className: 'dcc-note' }, t('settings.renameHint')),
          h('div', { className: 'dcc-mono', style: { marginTop: '10px' } }, `${t('settings.aiName')}：${aiMember?.name ?? 'AI 助理'}`),
          h(
            'div',
            { className: 'dcc-inline', style: { marginTop: '6px' } },
            h('input', {
              className: 'dcc-input',
              value: aiNameValue,
              placeholder: t('settings.aiNamePlaceholder'),
              onChange: (event) => setAiNameValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && aiNameValue.trim() && aiNameValue.trim() !== aiMember?.name) {
                  run(async () => {
                    await store.renameAi(aiNameValue.trim());
                    store.notify('ok', t('settings.aiNameSaved'));
                  });
                }
              },
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-btn',
                style: { flex: 'none' },
                disabled: busy || !aiNameValue.trim() || aiNameValue.trim() === aiMember?.name,
                onClick: () =>
                  run(async () => {
                    await store.renameAi(aiNameValue.trim());
                    store.notify('ok', t('settings.aiNameSaved'));
                  }),
              },
              t('action.save'),
            ),
          ),
          h('p', { className: 'dcc-note' }, t('settings.aiNameHint')),
          data.account
            ? h(
                'div',
                { className: 'dcc-mono' },
                `${t('settings.account')}：${data.account.name}${data.account.source === 'dsh' ? '（DSH）' : ''}`,
              )
            : null,
          identity?.accessCode
            ? h(
                React.Fragment,
                null,
                h('div', { className: 'dcc-mono' }, `${t('settings.accessCode')}：${identity.accessCode}`),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dcc-miniBtn',
                    onClick: async () => {
                      const ok = await copyText(identity.accessCode);
                      store.notify(ok ? 'ok' : 'error', ok ? t('action.copied') : t('notice.clipboardFailed'));
                    },
                  },
                  h(Icon, { name: 'copy', size: 12 }),
                  t('action.copy'),
                ),
              )
            : null,
        ),
        h(
          'div',
          { className: 'dcc-card' },
          h('div', { className: 'dcc-cardTitle' }, t('settings.server')),
          h(
            'div',
            { className: 'dcc-inline' },
            h('input', {
              className: 'dcc-input',
              value: url,
              spellCheck: false,
              onChange: (event) => setUrl(event.target.value),
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-btn',
                style: { flex: 'none' },
                disabled: busy || !url.trim() || url === data.serverUrl,
                onClick: () =>
                  run(async () => {
                    await store.configureServer(url);
                    store.notify('ok', t('notice.settingsSaved'));
                  }),
              },
              t('action.save'),
            ),
          ),
          h('p', { className: 'dcc-note' }, t('settings.serverHint')),
          error ? h(ErrorLine, { text: error }) : null,
        ),
        isAdmin
          ? h(
              'div',
              { className: 'dcc-card' },
              h('div', { className: 'dcc-cardTitle' }, h(Icon, { name: 'users', size: 14 }), t('settings.members')),
              h('p', { className: 'dcc-note' }, t('settings.membersHint')),
              members.length
                ? members.map((member) =>
                    h(
                      'div',
                      { key: member.id, className: 'dcc-memberRow' },
                      h(Avatar, { name: member.name, small: true }),
                      h(
                        'div',
                        { className: 'dcc-memberMain' },
                        h(
                          'div',
                          { className: 'dcc-memberName' },
                          member.name,
                          member.id === me?.id ? `（${t('settings.me')}）` : '',
                        ),
                        h(
                          'div',
                          { className: 'dcc-note' },
                          `${member.role || t('role.member')} · ${member.linked ? t('settings.linked') : t('settings.unlinked')}`,
                        ),
                      ),
                      isAdmin && member.id !== me?.id
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'dcc-miniBtn',
                              disabled: busy,
                              onClick: () => resetMember(member),
                            },
                            t('settings.reset'),
                          )
                        : null,
                    ),
                  )
                : h('p', { className: 'dcc-note' }, t('loading')),
            )
          : null,
        h('p', { className: 'dcc-note' }, t('settings.logoutHint')),
      );
    }

    function Rail({ t, snap, query, setQuery, onNewGroup, onSettings }) {
      const store = shared.store;
      const data = snap.data;
      const [peopleTab, setPeopleTab] = React.useState('contacts');
      const me = data.identity?.employee;
      const needle = query.trim().toLowerCase();
      const groups = (data.groups ?? []).filter((group) => !needle || group.name.toLowerCase().includes(needle));
      const contacts = (data.contacts ?? []).filter((person) => !needle || person.name.toLowerCase().includes(needle));
      const directory = (data.directory ?? [])
        .filter((person) => person.id !== me?.id)
        .filter((person) => !needle || person.name.toLowerCase().includes(needle));
      const contactIds = new Set((data.contacts ?? []).map((person) => person.id));
      const selected = snap.selectedGroup;

      const after = (promise, key) =>
        promise
          .then(() => store.notify('ok', t(key)))
          .catch((failure) => store.notify('error', String(failure.message || failure)));

      return h(
        'aside',
        { className: 'dcc-rail' },
        h(
          'div',
          { className: 'dcc-search' },
          h(Icon, { name: 'search', size: 14 }),
          h('input', {
            value: query,
            placeholder: t('contacts.search'),
            'aria-label': t('contacts.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
        ),
        h(
          'div',
          { className: 'dcc-railScroll dcc-scrollThin' },
          h(
            'div',
            { className: 'dcc-railSection' },
            h(
              'div',
              { className: 'dcc-railHead' },
              h('span', {}, t('groups.title')),
              h(
                'button',
                { type: 'button', className: 'dcc-miniBtn', onClick: onNewGroup },
                h(Icon, { name: 'plus', size: 13 }),
                t('groups.new'),
              ),
            ),
            groups.length
              ? groups.map((group) =>
                  h(
                    'button',
                    {
                      key: group.id,
                      type: 'button',
                      className: 'dcc-row',
                      'data-active': selected === group.id ? '' : undefined,
                      onClick: () => store.openGroup(group.id),
                    },
                    h(
                      'span',
                      { className: 'dcc-rowMain' },
                      h('span', { className: 'dcc-rowName' }, h('span', {}, group.name), group.hasAi ? h(AiTag, { t }) : null),
                      h(
                        'span',
                        { className: 'dcc-rowSub' },
                        group.lastMessage
                          ? `${group.lastMessage.authorIsAi ? 'AI' : group.lastMessage.authorName}：${group.lastMessage.text}`
                          : t('groups.emptyHint'),
                      ),
                    ),
                    group.unread ? h('span', { className: 'dcc-unread' }, group.unread > 99 ? '99+' : group.unread) : null,
                  ),
                )
              : h('div', { className: 'dcc-note', style: { padding: '4px 6px' } }, t('groups.empty')),
          ),
          h(
            'div',
            { className: 'dcc-railSection' },
            h(
              'div',
              { className: 'dcc-railHead' },
              h('span', {}, t('contacts.title')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dcc-miniBtn',
                  onClick: () => setPeopleTab(peopleTab === 'contacts' ? 'directory' : 'contacts'),
                },
                peopleTab === 'contacts' ? t('contacts.directory') : t('contacts.title'),
              ),
            ),
            peopleTab === 'contacts'
              ? contacts.length
                ? contacts.map((person) =>
                    h(
                      'div',
                      { key: person.id, className: 'dcc-row' },
                      h(Avatar, { name: person.name, ai: person.isAi, small: true }),
                      h(
                        'span',
                        { className: 'dcc-rowMain' },
                        h('span', { className: 'dcc-rowName' }, h('span', {}, person.name)),
                        h('span', { className: 'dcc-rowSub' }, person.role || t('role.member')),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dcc-iconBtn',
                          title: t('action.remove'),
                          'aria-label': t('action.remove'),
                          style: { width: 22, height: 22 },
                          onClick: () => after(store.removeContact(person.id), 'action.remove'),
                        },
                        h(Icon, { name: 'close', size: 12 }),
                      ),
                    ),
                  )
                : h('div', { className: 'dcc-note', style: { padding: '4px 6px' } }, t('contacts.empty'))
              : directory.length
                ? directory.map((person) =>
                    h(
                      'div',
                      { key: person.id, className: 'dcc-row' },
                      h(Avatar, { name: person.name, ai: person.isAi, small: true }),
                      h(
                        'span',
                        { className: 'dcc-rowMain' },
                        h('span', { className: 'dcc-rowName' }, h('span', {}, person.name), person.isAi ? h(AiTag, { t }) : null),
                        h('span', { className: 'dcc-rowSub' }, person.role || t('role.member')),
                      ),
                      contactIds.has(person.id) || person.isAi
                        ? null
                        : h(
                            'button',
                            {
                              type: 'button',
                              className: 'dcc-iconBtn',
                              title: t('action.add'),
                              'aria-label': t('action.add'),
                              style: { width: 22, height: 22 },
                              onClick: () => after(store.addContact(person.id), 'contacts.addDone'),
                            },
                            h(Icon, { name: 'plus', size: 12 }),
                          ),
                    ),
                  )
                : h('div', { className: 'dcc-note', style: { padding: '4px 6px' } }, t('contacts.none')),
          ),
          h(
            'button',
            { type: 'button', className: 'dcc-row', onClick: onSettings, style: { marginTop: 4 } },
            h(Icon, { name: 'gear', size: 15 }),
            h(
              'span',
              { className: 'dcc-rowMain' },
              h('span', { className: 'dcc-rowName' }, h('span', {}, t('action.settings'))),
            ),
          ),
        ),
      );
    }

    // ---------------------------------------------------------------- chat pane

    function ApprovalCard({ t, message, onDecide }) {
      const approval = message.approval;
      const pending = approval.status === 'pending';
      const statusText =
        approval.status === 'approved'
          ? t('approval.approved')
          : approval.status === 'rejected'
            ? t('approval.rejected')
            : approval.status === 'expired'
              ? t('approval.expired')
              : t('approval.pending');
      return h(
        'div',
        { className: 'dcc-approval', 'data-status': approval.status },
        h(
          'div',
          { className: 'dcc-approvalHead' },
          h(Icon, { name: 'gear', size: 14 }),
          h('span', {}, t('approval.title', { tool: approval.toolName || t('run.tool.default') })),
          h('span', { className: 'dcc-approvalStatus' }, statusText),
        ),
        approval.reason ? h('div', { className: 'dcc-approvalReason' }, approval.reason) : null,
        pending
          ? h(
              'div',
              { className: 'dcc-approvalActions' },
              h(
                'button',
                { type: 'button', className: 'dcc-btn', onClick: () => onDecide(approval.shortId, true) },
                h(Icon, { name: 'check', size: 12 }),
                t('approval.allow'),
              ),
              h(
                'button',
                { type: 'button', className: 'dcc-btn', onClick: () => onDecide(approval.shortId, false) },
                h(Icon, { name: 'close', size: 12 }),
                t('approval.deny'),
              ),
            )
          : null,
      );
    }

    function MessageRow({ t, message, onDecide }) {
      if (message.approval) return h(ApprovalCard, { t, message, onDecide });
      if (message.kind === 'system') {
        return h('div', { className: 'dcc-msgSystem' }, message.text);
      }
      if (message.kind === 'activity') {
        return h('div', { className: 'dcc-runItem' }, message.text);
      }
      return h(
        'div',
        { className: 'dcc-msg' },
        h(Avatar, { name: message.authorName, ai: message.authorIsAi }),
        h(
          'div',
          { className: 'dcc-msgBody' },
          h(
            'div',
            { className: 'dcc-msgHead' },
            h('span', { className: 'dcc-msgName' }, message.authorName),
            message.authorIsAi ? h(AiTag, { t }) : null,
            h('span', { className: 'dcc-msgTime' }, formatTime(message.createdAt)),
          ),
          h('div', { className: 'dcc-msgText' }, h(MarkdownText, { text: message.text })),
          message.attachments?.length
            ? h(
                'div',
                { className: 'dcc-msgAttachments' },
                message.attachments.map((item) =>
                  /^image\//i.test(item.mime || '')
                    ? h('a', {
                        key: item.id,
                        className: 'dcc-msgImageLink',
                        href: shared.store.attachmentUrl(message.groupId, item.id),
                        target: '_blank',
                        rel: 'noreferrer',
                      }, h('img', {
                        className: 'dcc-msgImage',
                        src: shared.store.attachmentUrl(message.groupId, item.id),
                        alt: item.name,
                      }))
                    : h(
                        'a',
                        {
                          key: item.id,
                          className: 'dcc-msgFile',
                          href: shared.store.attachmentUrl(message.groupId, item.id),
                          target: '_blank',
                          rel: 'noreferrer',
                        },
                        h(Icon, { name: 'folder', size: 13 }),
                        h('span', null, item.name),
                      ),
                ),
              )
            : null,
        ),
      );
    }

    const RUN_ICONS = { thought: 'sparkle', tool: 'gear', plan: 'folder', status: 'check' };
    const TOOL_TITLES = {
      bash: ['run.tool.bash', '运行命令'],
      read: ['run.tool.read', '读取文件'],
      edit: ['run.tool.edit', '编辑文件'],
      write: ['run.tool.write', '写入文件'],
      glob: ['run.tool.glob', '查找文件'],
      grep: ['run.tool.grep', '搜索内容'],
      web_search: ['run.tool.webSearch', '联网搜索'],
    };

    function toolTitle(t, step) {
      const key = String(step.title || '').toLowerCase();
      const mapped = TOOL_TITLES[key];
      if (mapped) return t(mapped[0], undefined, mapped[1]);
      return step.title || t('run.tool.default', undefined, '工具调用');
    }

    function formatDuration(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '';
      const seconds = ms / 1000;
      if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
      return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
    }

    function WorkingStatus({ t, startedAt, onStop }) {
      const [now, setNow] = React.useState(Date.now());
      const [stopping, setStopping] = React.useState(false);
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
      }, []);
      const stop = async () => {
        if (!onStop || stopping) return;
        setStopping(true);
        try {
          await onStop();
        } finally {
          setStopping(false);
        }
      };
      return h(
        'div',
        { className: 'dcc-workingBar' },
        h('span', { className: 'dcc-workingPulse' }),
        h('span', { className: 'dcc-workingLabel' }, t('run.exploring')),
        h('span', { className: 'dcc-workingTime' }, formatDuration(now - startedAt)),
        onStop
          ? h(
              'button',
              { type: 'button', className: 'dcc-stopBtn', disabled: stopping, onClick: stop },
              h(Icon, { name: 'close', size: 11 }),
              stopping ? t('run.stopping') : t('run.stop'),
            )
          : null,
      );
    }

    function RunStep({ t, step }) {
      const [open, setOpen] = React.useState(false);
      const isTool = step.type === 'tool';
      const canFold = Boolean(step.detail || step.result);
      const detailText = String(step.detail || '').trim();
      const summary = isTool
        ? String(step.description || detailText.split(/\r?\n/)[0] || '').replace(/\s+/g, ' ').slice(0, 160)
        : detailText.split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 120) || '';
      const toggle = () => {
        if (canFold) setOpen((value) => !value);
      };
      return h(
        'div',
        {
          className: 'dcc-step',
          'data-type': step.type || 'status',
          'data-status': step.status || 'done',
        },
        h(
          'span',
          { className: 'dcc-stepIcon' },
          h(Icon, { name: RUN_ICONS[step.type] || 'sparkle', size: 13 }),
        ),
        h(
          'div',
          { className: 'dcc-stepBody' },
          h(
            'div',
            {
              className: 'dcc-stepHead',
              role: canFold ? 'button' : undefined,
              tabIndex: canFold ? 0 : undefined,
              'aria-expanded': canFold ? (open ? 'true' : 'false') : undefined,
              onClick: canFold ? toggle : undefined,
              onKeyDown: canFold
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle();
                    }
                  }
                : undefined,
            },
            canFold ? h('span', { className: 'dcc-stepChevron' }, open ? '▾' : '▸') : null,
            h('span', { className: 'dcc-stepTitle' }, isTool ? toolTitle(t, step) : step.title || '过程'),
            summary ? h('span', { className: 'dcc-stepSummary' }, `· ${summary}`) : null,
            step.status === 'running'
              ? h('span', { className: 'dcc-stepStatus' }, t('run.running'))
              : step.status === 'failed'
                ? h('span', { className: 'dcc-stepStatus', 'data-failed': '' }, t('run.failed'))
                : null,
          ),
          open
            ? h(
                React.Fragment,
                null,
                step.detail ? h('div', { className: 'dcc-stepDetail' }, step.detail) : null,
                step.result ? h('div', { className: 'dcc-stepResult' }, step.result) : null,
              )
            : null,
        ),
      );
    }

    function RunActivity({ t, messages, finished, finishedAt }) {
      const [open, setOpen] = React.useState(true);
      const steps = buildRunSteps(messages);
      const count = steps.length;
      const toolCount = steps.filter((step) => step.type === 'tool').length;
      const startedAt = messages[0]?.createdAt;
      const duration = finished && finishedAt && startedAt ? formatDuration(finishedAt - startedAt) : '';
      return h(
        'div',
        { className: 'dcc-run' },
        h(
          'div',
          {
            className: 'dcc-runHead',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': open ? 'true' : 'false',
            onClick: () => setOpen((value) => !value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setOpen((value) => !value);
              }
            },
          },
          h('span', { className: 'dcc-runChevron' }, open ? '▾' : '▸'),
          h(
            'span',
            { className: 'dcc-runLabel' },
            finished ? (toolCount ? t('run.executed') : t('run.finishedShort')) : toolCount ? t('run.executing') : t('run.running'),
          ),
        ),
        open
          ? h(
              'div',
              { className: 'dcc-runBody' },
              steps.map((step) => h(RunStep, { key: step.id, t, step })),
            )
          : null,
      );
    }

    function ConversationView({ t, items, onDecide }) {
      const rows = buildChatRows(items);
      return h(
        'div',
        { className: 'dcc-conv' },
        rows.map((row) =>
          row.type === 'activity'
            ? h(
                'div',
                { key: `run-${row.runId || row.items[0].id}`, className: 'dcc-turn' },
                h(RunActivity, {
                  t,
                  messages: row.items,
                  finished: row.finished,
                  finishedAt: row.finishedAt,
                }),
                row.finalMessage
                  ? h(MessageRow, { key: row.finalMessage.id, t, message: row.finalMessage, onDecide })
                  : null,
              )
            : h(MessageRow, { key: row.message.id, t, message: row.message, onDecide }),
        ),
      );
    }

    function buildRunSteps(messages) {
      const steps = [];
      const tools = new Map();
      for (const message of messages) {
        const activity = message.activity;
        if (!activity) {
          if (message.text) steps.push({ id: message.id, type: 'status', title: '过程', detail: message.text, status: 'done' });
          continue;
        }
        if (activity.type === 'tool' && activity.toolCallId && tools.has(activity.toolCallId)) {
          const step = tools.get(activity.toolCallId);
          if (activity.title) step.title = activity.title;
          if (activity.description) step.description = activity.description;
          if (activity.detail) step.result = activity.detail;
          if (activity.status) step.status = activity.status;
          continue;
        }
        const step = { ...activity, id: message.id };
        steps.push(step);
        if (activity.type === 'tool' && activity.toolCallId) tools.set(activity.toolCallId, step);
      }
      return steps;
    }

    function buildChatRows(items) {
      const rows = [];
      for (const message of items) {
        if (message.kind === 'activity') {
          const last = rows[rows.length - 1];
          if (last?.type === 'activity' && last.runId === message.runId) last.items.push(message);
          else rows.push({ type: 'activity', runId: message.runId ?? '', items: [message] });
          continue;
        }
        const last = rows[rows.length - 1];
        if (message.runId && last?.type === 'activity' && last.runId === message.runId) {
          last.finalMessage = message;
          last.finished = true;
          last.finishedAt = message.createdAt;
          continue;
        }
        rows.push({ type: 'message', message });
      }
      return rows;
    }

    function LiveRun({ t, live }) {
      const messages = (live.activities ?? []).map((activity, index) => ({
        id: `live-activity-${index}`,
        kind: 'activity',
        runId: live.runId,
        activity,
        createdAt: live.startedAt ?? Date.now(),
      }));
      if (live.thought) {
        messages.unshift({
          id: 'live-thought',
          kind: 'activity',
          runId: live.runId,
          activity: { type: 'thought', title: '思考', detail: live.thought, status: 'running' },
          createdAt: live.startedAt ?? Date.now(),
        });
      }
      return h(
        'div',
        { className: 'dcc-live' },
        messages.length ? h(RunActivity, { t, messages, finished: false }) : null,
        live.answer
          ? h(
              'div',
              { className: 'dcc-liveAnswer' },
              h('div', { className: 'dcc-msgHead' }, h('span', { className: 'dcc-msgName' }, t('run.ai')), h(AiTag, { t })),
              h('div', { className: 'dcc-msgText' }, h(MarkdownText, { text: live.answer }), h('span', { className: 'dcc-cursor' })),
            )
          : null,
      );
    }

    function KnowledgeDialog({ t, snap, group, onClose }) {
      const store = shared.store;
      const [items, setItems] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [busy, setBusy] = React.useState(false);
      const [scope, setScope] = React.useState('group');
      const [version, setVersion] = React.useState('');
      const [effectiveAt, setEffectiveAt] = React.useState('');
      const [authority, setAuthority] = React.useState('normal');
      const [entities, setEntities] = React.useState([]);
      const [alias, setAlias] = React.useState('');
      const [canonical, setCanonical] = React.useState('');
      const [error, setError] = React.useState('');
      const fileInput = React.useRef(null);

      const load = async () => {
        try {
          setItems(await store.knowledge(group.id));
          setEntities(await store.knowledgeEntities());
          setError('');
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setLoading(false);
        }
      };

      React.useEffect(() => {
        load();
      }, [group.id]);

      const upload = async (file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          setError(t('knowledge.tooLarge'));
          return;
        }
        setBusy(true);
        setError('');
        try {
          const dataBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          await store.uploadKnowledge(scope === 'group' ? group.id : null, file.name, dataBase64, file.type, {
            version,
            effectiveAt: effectiveAt ? Date.parse(`${effectiveAt}T00:00:00`) : null,
            authority,
          });
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
          if (fileInput.current) fileInput.current.value = '';
        }
      };

      const remove = async (doc) => {
        if (!window.confirm(t('knowledge.deleteConfirm', { name: doc.name }))) return;
        setBusy(true);
        try {
          await store.deleteKnowledge(doc.id);
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      const reindex = async () => {
        setBusy(true);
        setError('');
        try {
          await store.reindexKnowledge();
          await load();
          store.notify('ok', t('knowledge.reindexed'));
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      const linkAlias = async () => {        if (!alias.trim() || !canonical.trim()) return;
        setBusy(true);
        setError('');
        try {
          await store.addKnowledgeAlias(alias.trim(), canonical.trim());
          setAlias('');
          setCanonical('');
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      return h(
        Modal,
        {
          t,
          title: t('knowledge.title'),
          onClose,
          footer: [h('button', { key: 'close', type: 'button', className: 'dcc-btn', onClick: onClose }, t('action.close'))],
        },
        h('p', { className: 'dcc-note' }, t('knowledge.hint')),
        h(
          'div',
          { className: 'dcc-inline', style: { alignItems: 'center' } },
          h(
            'select',
            { className: 'dcc-input', value: scope, onChange: (event) => setScope(event.target.value), style: { width: 140 } },
            h('option', { value: 'group' }, t('knowledge.scopeGroup')),
            h('option', { value: 'company' }, t('knowledge.scopeCompany')),
          ),
          h('input', {
            ref: fileInput,
            type: 'file',
            accept: '.txt,.md,.markdown,.csv,.json,.html,.htm,.docx,.xlsx,.xlsm,.pdf',
            style: { display: 'none' },
            onChange: (event) => upload(event.target.files?.[0]),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'dcc-btn',
              'data-primary': '',
              disabled: busy,
              onClick: () => fileInput.current?.click(),
            },
            h(Icon, { name: 'plus', size: 13 }),
            busy ? t('loading') : t('knowledge.upload'),
          ),
          h(
            'button',
            { type: 'button', className: 'dcc-btn', disabled: busy, onClick: reindex },
            h(Icon, { name: 'sync', size: 13 }),
            t('knowledge.reindex'),
          ),
        ),
        h(
          'div',
          { className: 'dcc-inline', style: { alignItems: 'center' } },
          h('input', {
            className: 'dcc-input',
            value: version,
            placeholder: t('knowledge.version'),
            onChange: (event) => setVersion(event.target.value),
            style: { width: 100 },
          }),
          h('input', {
            className: 'dcc-input',
            type: 'date',
            value: effectiveAt,
            onChange: (event) => setEffectiveAt(event.target.value),
            style: { width: 145 },
          }),
          h(
            'select',
            { className: 'dcc-input', value: authority, onChange: (event) => setAuthority(event.target.value), style: { width: 150 } },
            h('option', { value: 'normal' }, t('knowledge.authorityNormal')),
            h('option', { value: 'department' }, t('knowledge.authorityDepartment')),
            h('option', { value: 'official' }, t('knowledge.authorityOfficial')),
          ),
          h('span', { className: 'dcc-note' }, t('knowledge.metaHint')),
        ),
        error ? h(ErrorLine, { text: error }) : null,
        h(
          'div',
          { className: 'dcc-knowledgeList' },
          loading
            ? h('div', { className: 'dcc-note' }, t('loading'))
            : items.length
              ? items.map((doc) =>
                  h(
                    'div',
                    { key: doc.id, className: 'dcc-knowledgeItem' },
                    h(
                      'div',
                      { className: 'dcc-knowledgeMain' },
                      h('div', { className: 'dcc-knowledgeName' }, doc.name),
                      h(
                        'div',
                        { className: 'dcc-note' },
                        `${doc.groupId ? t('knowledge.scopeGroup') : t('knowledge.scopeCompany')} · ${Math.ceil((doc.size || 0) / 1024)} KB · ${doc.chunks || 0} ${t('knowledge.chunks')}${doc.supersededBy ? ` · ${t('knowledge.superseded')}` : ''}`,
                      ),
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'dcc-miniBtn', disabled: busy, onClick: () => remove(doc) },
                      t('action.delete'),
                    ),
                  ),
                )
              : h('div', { className: 'dcc-note' }, t('knowledge.empty')),
        ),
        h(
          'div',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('knowledge.entities')),
          h(
            'div',
            { className: 'dcc-knowledgeList' },
            entities.length
              ? entities.slice(0, 30).map((entity) =>
                  h(
                    'div',
                    { key: entity.id, className: 'dcc-knowledgeItem' },
                    h(
                      'div',
                      { className: 'dcc-knowledgeMain' },
                      h('div', { className: 'dcc-knowledgeName' }, entity.name),
                      h('div', { className: 'dcc-note' }, entity.aliases?.length ? `别名：${entity.aliases.join('、')}` : t('knowledge.noAlias')),
                    ),
                  ),
                )
              : h('div', { className: 'dcc-note' }, t('knowledge.noEntity')),
          ),
          h(
            'div',
            { className: 'dcc-inline', style: { alignItems: 'center' } },
            h('input', {
              className: 'dcc-input',
              value: alias,
              placeholder: t('knowledge.aliasPlaceholder'),
              onChange: (event) => setAlias(event.target.value),
              style: { flex: 1 },
            }),
            h('span', { className: 'dcc-note' }, '→'),
            h('input', {
              className: 'dcc-input',
              value: canonical,
              placeholder: t('knowledge.canonicalPlaceholder'),
              onChange: (event) => setCanonical(event.target.value),
              style: { flex: 1 },
            }),
            h(
              'button',
              { type: 'button', className: 'dcc-btn', disabled: busy || !alias.trim() || !canonical.trim(), onClick: linkAlias },
              t('knowledge.linkAlias'),
            ),
          ),
          h('p', { className: 'dcc-note' }, t('knowledge.aliasHint')),
        ),
      );
    }

    function AccountDialog({ t, snap, onClose }) {
      const store = shared.store;
      const data = snap.data ?? {};
      const accounts = data.accounts ?? [];
      const activeAccount = data.activeAccount ?? '';
      const [mode, setMode] = React.useState('login');
      const [serverUrl, setServerUrl] = React.useState('');
      const [companyId, setCompanyId] = React.useState('');
      const [companyName, setCompanyName] = React.useState('');
      const [employeeName, setEmployeeName] = React.useState(data.identity?.employee?.name ?? '');
      const [accessCode, setAccessCode] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');

      const switchTo = async (key) => {
        setBusy(true);
        setError('');
        try {
          await store.switchAccount(key);
          onClose();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      const submit = async () => {
        setBusy(true);
        setError('');
        try {
          if (mode === 'create') {
            if (!serverUrl.trim() || !companyName.trim() || !employeeName.trim()) throw new Error(t('accounts.required'));
            await store.createCompanyOnServer(serverUrl.trim(), companyName.trim(), employeeName.trim());
          } else {
            if (!serverUrl.trim() || !companyId.trim() || !employeeName.trim() || !accessCode.trim()) throw new Error(t('accounts.required'));
            await store.loginOnServer(serverUrl.trim(), companyId.trim(), employeeName.trim(), accessCode.trim());
          }
          onClose();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy(false);
        }
      };

      return h(
        Modal,
        {
          t,
          title: t('accounts.title'),
          onClose,
          footer: [h('button', { key: 'close', type: 'button', className: 'dcc-btn', onClick: onClose }, t('action.close'))],
        },
        h(
          'div',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('accounts.saved')),
          accounts.length
            ? h(
                'div',
                { className: 'dcc-accountList' },
                accounts.map((account) =>
                  h(
                    'button',
                    {
                      key: account.key,
                      type: 'button',
                      className: 'dcc-accountItem',
                      'data-active': account.key === activeAccount ? '' : undefined,
                      disabled: busy,
                      onClick: () => switchTo(account.key),
                    },
                    h(Icon, { name: 'company', size: 14 }),
                    h(
                      'span',
                      { className: 'dcc-accountMain' },
                      h('span', { className: 'dcc-accountName' }, account.companyName || account.companyId),
                      h('span', { className: 'dcc-note' }, `${account.serverUrl} · ${account.employeeName || ''}`),
                    ),
                    account.key === activeAccount ? h('span', { className: 'dcc-accountBadge' }, t('accounts.current')) : null,
                  ),
                ),
              )
            : h('div', { className: 'dcc-note' }, t('accounts.empty')),
        ),
        h(
          'div',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('accounts.add')),
          h(
            'div',
            { className: 'dcc-segment' },
            h(
              'button',
              { type: 'button', 'data-on': mode === 'login' ? '' : undefined, onClick: () => setMode('login') },
              t('accounts.login'),
            ),
            h(
              'button',
              { type: 'button', 'data-on': mode === 'create' ? '' : undefined, onClick: () => setMode('create') },
              t('accounts.create'),
            ),
          ),
        ),
        h(
          'label',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('accounts.server')),
          h('input', {
            className: 'dcc-input',
            value: serverUrl,
            placeholder: 'https://dsh.example.com',
            onChange: (event) => setServerUrl(event.target.value),
          }),
        ),
        mode === 'create'
          ? h(
              'label',
              { className: 'dcc-field' },
              h('span', { className: 'dcc-label' }, t('accounts.companyName')),
              h('input', { className: 'dcc-input', value: companyName, onChange: (event) => setCompanyName(event.target.value) }),
            )
          : h(
              'label',
              { className: 'dcc-field' },
              h('span', { className: 'dcc-label' }, t('accounts.companyId')),
              h('input', { className: 'dcc-input', value: companyId, onChange: (event) => setCompanyId(event.target.value) }),
            ),
        h(
          'label',
          { className: 'dcc-field' },
          h('span', { className: 'dcc-label' }, t('accounts.person')),
          h('input', { className: 'dcc-input', value: employeeName, onChange: (event) => setEmployeeName(event.target.value) }),
        ),
        mode === 'login'
          ? h(
              'label',
              { className: 'dcc-field' },
              h('span', { className: 'dcc-label' }, t('accounts.accessCode')),
              h('input', {
                className: 'dcc-input',
                value: accessCode,
                onChange: (event) => setAccessCode(event.target.value.toUpperCase()),
              }),
            )
          : null,
        error ? h(ErrorLine, { text: error }) : null,
        h(
          'button',
          { type: 'button', className: 'dcc-btn', 'data-primary': '', disabled: busy, onClick: submit },
          busy ? t('loading') : mode === 'create' ? t('accounts.createAction') : t('accounts.loginAction'),
        ),
      );
    }

    function ChatPane({ t, snap, onNewGroup }) {
      const store = shared.store;
      const data = snap.data;
      const groupId = snap.selectedGroup;
      const group = (data.groups ?? []).find((entry) => entry.id === groupId);
      const bucket = snap.messages[groupId] ?? { items: [], loading: false, error: '' };
      const [draft, setDraft] = React.useState('');
      const [sending, setSending] = React.useState(false);
      const [attachments, setAttachments] = React.useState([]);
      const [replyMode, setReplyMode] = React.useState('ai');
      const [uploading, setUploading] = React.useState(false);
      const [dragging, setDragging] = React.useState(false);
      const [mention, setMention] = React.useState(null);
      const [live, setLive] = React.useState(null);
      const [showKnowledge, setShowKnowledge] = React.useState(false);
      const scroller = React.useRef(null);
      const textarea = React.useRef(null);

      React.useEffect(() => {
        if (!groupId) return undefined;
        let stopped = false;
        let retry = null;
        const controller = new AbortController();
        const applyRun = (event) => {
          setLive((previous) => {
            if (event.kind === 'start') return { runId: event.runId, thought: '', answer: '', activities: [], startedAt: Date.now() };
            if (!previous || previous.runId !== event.runId) return previous;
            if (event.kind === 'thought_delta') return { ...previous, thought: `${previous.thought}${event.text || ''}` };
            if (event.kind === 'answer_delta') return { ...previous, answer: `${previous.answer}${event.text || ''}` };
            if (event.kind === 'activity' && event.activity) {
              const activities = previous.activities.slice();
              const index = event.activity.toolCallId
                ? activities.findIndex((entry) => entry.toolCallId === event.activity.toolCallId)
                : -1;
              if (index >= 0) activities[index] = { ...activities[index], ...event.activity };
              else activities.push(event.activity);
              return { ...previous, activities };
            }
            if (event.kind === 'done') return null;
            return previous;
          });
        };
        const connect = async () => {
          try {
            const response = await fetch(`${API}/groups/${encodeURIComponent(groupId)}/events`, {
              headers: { accept: 'text/event-stream' },
              signal: controller.signal,
            });
            if (!response.ok || !response.body) throw new Error(`events ${response.status}`);
            store.refreshMessages(groupId, true).catch(() => {});
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
              const { done, value } = await reader.read();
              if (done || stopped) break;
              buffer += decoder.decode(value, { stream: true });
              let boundary;
              while ((boundary = buffer.indexOf('\n\n')) >= 0) {
                const block = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                let eventName = 'message';
                const dataLines = [];
                for (const line of block.split('\n')) {
                  if (line.startsWith('event:')) eventName = line.slice(6).trim();
                  else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
                }
                if (!dataLines.length) continue;
                let payload;
                try {
                  payload = JSON.parse(dataLines.join('\n'));
                } catch {
                  continue;
                }
                if (eventName === 'run') {
                  applyRun(payload);
                  if (payload.kind === 'done') store.refreshMessages(groupId, true).catch(() => {});
                } else if (eventName === 'message' && payload.message) {
                  store.mergeMessage(groupId, payload.message);
                } else if (eventName === 'approval') {
                  store.refreshMessages(groupId, true).catch(() => {});
                }
              }
            }
          } catch (error) {
            if (stopped || controller.signal.aborted) return;
          }
          if (!stopped) retry = setTimeout(connect, 2000);
        };
        connect();
        return () => {
          stopped = true;
          if (retry) clearTimeout(retry);
          controller.abort();
          setLive(null);
        };
      }, [groupId]);

      const mentionCandidates = React.useMemo(() => {
        const members = group?.members ?? [];
        const query = String(mention?.query ?? '').trim().toLowerCase();
        return members
          .filter((member) => !query || member.name.toLowerCase().includes(query) || member.id.toLowerCase().includes(query))
          .slice(0, 8);
      }, [group?.id, group?.members, mention?.query]);
      const mentionIndex = mention ? Math.min(Number(mention.index) || 0, Math.max(0, mentionCandidates.length - 1)) : 0;

      React.useEffect(() => {
        if (!scroller.current) return;
        const element = scroller.current;
        const frame = requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
        return () => cancelAnimationFrame(frame);
      }, [bucket.items.length, groupId, live?.answer?.length, live?.thought?.length, live?.activities?.length]);

      React.useEffect(() => {
        setDraft('');
        setAttachments([]);
        setReplyMode('ai');
      }, [groupId]);

      React.useEffect(() => {
        if (!textarea.current) return;
        textarea.current.style.height = 'auto';
        textarea.current.style.height = `${Math.min(140, textarea.current.scrollHeight)}px`;
      }, [draft]);

      if (!group) {
        return h(
          'section',
          { className: 'dcc-chat' },
          h(
            'div',
            { className: 'dcc-empty' },
            h('span', { className: 'dcc-emptyIcon' }, h(Icon, { name: 'users', size: 22 })),
            h('div', { className: 'dcc-emptyTitle' }, t('chat.empty')),
            h('div', { className: 'dcc-emptyDesc' }, t('chat.emptyDesc')),
            h(
              'button',
              { type: 'button', className: 'dcc-btn', 'data-primary': '', onClick: onNewGroup },
              h(Icon, { name: 'plus', size: 14 }),
              t('groups.new'),
            ),
          ),
        );
      }

      const addFiles = async (fileList) => {
        const files = [...(fileList ?? [])].filter(Boolean);
        if (!files.length) return;
        setUploading(true);
        try {
          for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
              store.notify('error', t('chat.fileTooLarge', { name: file.name }));
              continue;
            }
            const dataBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });
            const attachment = await store.uploadAttachment(group.id, file.name || '图片', dataBase64, file.type || 'application/octet-stream');
            setAttachments((current) => [...current, attachment]);
          }
        } catch (failure) {
          store.notify('error', t('notice.error', { message: String(failure.message || failure) }));
        } finally {
          setUploading(false);
        }
      };

      const removeAttachment = (id) => {
        setAttachments((current) => current.filter((item) => item.id !== id));
      };

      const send = async () => {
        const text = draft.trim();
        if ((!text && !attachments.length) || sending || uploading) return;
        setSending(true);
        setMention(null);
        try {
          await store.send(group.id, text, { attachmentIds: attachments.map((item) => item.id), toAi: replyMode === 'ai' });
          setDraft('');
          setAttachments([]);
        } catch (failure) {
          store.notify('error', t('notice.error', { message: String(failure.message || failure) }));
        } finally {
          setSending(false);
        }
      };

      const decideApproval = async (shortId, allow) => {
        try {
          await store.send(groupId, `${allow ? '允许' : '拒绝'} ${shortId}`, false);
        } catch (error) {
          store.notify('error', t('notice.error', { message: String(error.message || error) }));
        }
      };

      const updateMention = (value, caret) => {
        const before = value.slice(0, caret);
        const at = before.lastIndexOf('@');
        if (at < 0) {
          setMention(null);
          return;
        }
        const query = before.slice(at + 1);
        if (/[\s@]/.test(query) || query.length > 24) {
          setMention(null);
          return;
        }
        setMention({ start: at, end: caret, query, index: 0 });
      };

      const chooseMention = (member) => {
        if (!mention || !member) return;
        const inserted = `@${member.name} `;
        const next = draft.slice(0, mention.start) + inserted + draft.slice(mention.end);
        const caret = mention.start + inserted.length;
        setDraft(next);
        setMention(null);
        requestAnimationFrame(() => {
          const element = textarea.current;
          if (!element) return;
          element.focus();
          element.setSelectionRange(caret, caret);
        });
      };

      const pendingApprovals = bucket.items.filter((message) => message.approval?.status === 'pending');
      const firstApproval = pendingApprovals[0]?.approval;

      return h(
        'section',
        { className: 'dcc-chat' },
        h(
          'div',
          { className: 'dcc-chatHead' },
          h(
            'div',
            { className: 'dcc-chatTitleRow' },
            h('span', { className: 'dcc-chatTitle' }, group.name),
            h('span', { className: 'dcc-chatMeta' }, t('groups.members', { count: group.members.length })),
            group.unread ? h('span', { className: 'dcc-chatMeta' }, t('groups.unread', { count: group.unread })) : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-miniBtn',
                title: t('knowledge.title'),
                onClick: () => setShowKnowledge(true),
              },
              h(Icon, { name: 'book', size: 12 }),
              t('knowledge.button'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-miniBtn',
                title: t('repo.buttonHint'),
                onClick: async () => {
                  try {
                    const status = await store.repoStatus(group.id);
                    if (status?.bound) {
                      if (!window.confirm(t('repo.pullConfirm', { path: status.localPath }))) return;
                      await store.pullRepo(group.id);
                      store.notify('ok', t('repo.pulled'));
                      return;
                    }
                    const picker = shared.ctx?.get?.('uiWorkspace');
                    if (!picker || typeof picker.pickDirectory !== 'function') throw new Error(t('notice.pickerUnavailable'));
                    const picked = await picker.pickDirectory();
                    if (!picked) return;
                    const result = await store.bindRepo(group.id, picked);
                    store.notify(
                      'ok',
                      result.action === 'cloned'
                        ? t('repo.cloned')
                        : result.action === 'imported'
                          ? t('repo.imported')
                          : t('repo.bound'),
                    );
                  } catch (failure) {
                    store.notify('error', t('notice.error', { message: String(failure.message || failure) }));
                  }
                },
              },
              h(Icon, { name: 'folder', size: 12 }),
              t('repo.button'),
            ),
            data.access?.admin
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dcc-miniBtn',
                    style: { marginLeft: 'auto' },
                    title: t('chat.delete'),
                    onClick: () => {
                      if (!window.confirm(t('chat.deleteConfirm', { name: group.name }))) return;
                      store
                        .deleteGroup(group.id)
                        .then(() => store.notify('ok', t('chat.deleted')))
                        .catch((failure) => store.notify('error', String(failure.message || failure)));
                    },
                  },
                  h(Icon, { name: 'close', size: 12 }),
                  t('chat.delete'),
                )
              : null,
          ),
          h(
            'div',
            { className: 'dcc-memberChips' },
            group.members.map((member) =>
              h(
                'span',
                { key: member.id, className: 'dcc-chip', title: member.role || '' },
                h(Avatar, { name: member.name, ai: member.isAi, small: true }),
                member.name,
                member.isAi ? h(AiTag, { t }) : null,
              ),
            ),
          ),
        ),
        firstApproval
          ? h(
              'div',
              { className: 'dcc-approvalBanner' },
              h('span', { className: 'dcc-approvalBannerText' }, t('approval.title', { tool: firstApproval.toolName || t('run.tool.default') })),
              firstApproval.reason ? h('span', { className: 'dcc-approvalBannerReason' }, firstApproval.reason) : null,
              h(
                'button',
                { type: 'button', className: 'dcc-btn', 'data-primary': '', onClick: () => decideApproval(firstApproval.shortId, true) },
                t('approval.allow'),
              ),
              h(
                'button',
                { type: 'button', className: 'dcc-btn', onClick: () => decideApproval(firstApproval.shortId, false) },
                t('approval.deny'),
              ),
            )
          : null,
        h(
          'div',
          { className: 'dcc-messages dcc-scrollThin', ref: scroller },
          bucket.error ? h(ErrorLine, { text: bucket.error }) : null,
          bucket.items.length || live
            ? h(React.Fragment, null, h(ConversationView, { t, items: bucket.items, onDecide: decideApproval }), live ? h(LiveRun, { t, live }) : null)
            : h(
                'div',
                { className: 'dcc-empty', style: { height: 'auto', paddingTop: 40 } },
                h('div', { className: 'dcc-emptyDesc' }, t('chat.noMessages')),
              ),
        ),
        live ? h(WorkingStatus, { t, startedAt: live.startedAt, onStop: () => store.cancelAi(group.id) }) : null,
        h(
          'div',
          {
            className: 'dcc-composer',
            onDragOver: (event) => {
              event.preventDefault();
              setDragging(true);
            },
            onDragLeave: () => setDragging(false),
            onDrop: (event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer?.files);
            },
          },
          h(
            'div',
            { className: cx('dcc-composerBox', dragging && 'dcc-composerDragging') },
            attachments.length
              ? h(
                  'div',
                  { className: 'dcc-attachList' },
                  attachments.map((item) =>
                    h(
                      'div',
                      { key: item.id, className: 'dcc-attachChip' },
                      /^image\//i.test(item.mime || '')
                        ? h('img', {
                            className: 'dcc-attachThumb',
                            src: store.attachmentUrl(group.id, item.id),
                            alt: item.name,
                          })
                        : h(Icon, { name: 'folder', size: 13 }),
                      h('span', { className: 'dcc-attachName' }, item.name),
                      h(
                        'button',
                        { type: 'button', className: 'dcc-attachRemove', title: t('action.delete'), onClick: () => removeAttachment(item.id) },
                        '×',
                      ),
                    ),
                  ),
                )
              : null,
            h('textarea', {
              ref: textarea,
              rows: 1,
              value: draft,
              placeholder: t(replyMode === 'ai' ? 'chat.placeholderAi' : 'chat.placeholderPeople', { group: group.name }),
              onPaste: (event) => {
                const files = [...(event.clipboardData?.items ?? [])]
                  .filter((item) => item.kind === 'file')
                  .map((item) => item.getAsFile())
                  .filter(Boolean);
                if (files.length) {
                  event.preventDefault();
                  addFiles(files);
                }
              },
              onChange: (event) => {
                const value = event.target.value;
                setDraft(value);
                updateMention(value, event.target.selectionStart ?? value.length);
              },
              onBlur: () => setTimeout(() => setMention(null), 150),
              onKeyDown: (event) => {
                const composing = event.nativeEvent.isComposing;
                if (mention && mentionCandidates.length) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    const next = (mentionIndex + delta + mentionCandidates.length) % mentionCandidates.length;
                    setMention({ ...mention, index: next });
                    return;
                  }
                  if ((event.key === 'Enter' || event.key === 'Tab') && !composing && !event.shiftKey) {
                    event.preventDefault();
                    chooseMention(mentionCandidates[mentionIndex]);
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setMention(null);
                    return;
                  }
                }
                if (event.key === 'Enter' && !event.shiftKey && !composing) {
                  event.preventDefault();
                  send();
                }
              },
            }),
            mention && mentionCandidates.length
              ? h(
                  'div',
                  { className: 'dcc-mentionMenu', onMouseDown: (event) => event.preventDefault() },
                  mentionCandidates.map((member, index) =>
                    h(
                      'button',
                      {
                        key: member.id,
                        type: 'button',
                        className: 'dcc-mentionItem',
                        'data-active': index === mentionIndex ? '' : undefined,
                        onMouseDown: (event) => event.preventDefault(),
                        onClick: () => chooseMention(member),
                      },
                      h('span', { className: 'dcc-mentionAvatar' }, String(member.name || '?').slice(0, 1)),
                      h('span', { className: 'dcc-mentionName' }, member.name),
                      member.isAi ? h(AiTag, { t }) : null,
                      h('span', { className: 'dcc-mentionMeta' }, member.id.slice(-6)),
                    ),
                  ),
                )
              : null,
              h(
                'div',
                { className: 'dcc-composerRow' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dcc-replyToggle',
                    'data-mode': replyMode,
                    title: t('chat.replyModeHint'),
                    onClick: () => setReplyMode((value) => (value === 'ai' ? 'people' : 'ai')),
                  },
                  h(Icon, { name: replyMode === 'ai' ? 'sparkle' : 'users', size: 12 }),
                  t(replyMode === 'ai' ? 'chat.toAi' : 'chat.toPeople'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dcc-btn dcc-sendBtn',
                    'data-primary': '',
                    style: { marginLeft: 'auto' },
                    disabled: (!draft.trim() && !attachments.length) || sending || uploading,
                    onClick: send,
                  },
                h(Icon, { name: 'send', size: 14 }),
                t('action.send'),
              ),
            ),
          ),
        ),
        showKnowledge ? h(KnowledgeDialog, { t, snap, group, onClose: () => setShowKnowledge(false) }) : null,
      );
    }

    // ---------------------------------------------------------------- side pane

    function TasksCard({ t, snap }) {
      const store = shared.store;
      const data = snap.data;
      const tasks = data.tasks ?? [];
      return h(
        'div',
        { className: 'dcc-card' },
        h(
          'div',
          { className: 'dcc-cardHead' },
          h('div', { className: 'dcc-cardTitle' }, h(Icon, { name: 'sparkle', size: 14 }), t('task.title')),
          tasks.length ? h('span', { className: 'dcc-unread' }, tasks.length) : null,
        ),
        tasks.length
          ? tasks.map((task) =>
              h(
                'div',
                { key: task.id, className: 'dcc-taskItem' },
                h(
                  'div',
                  { className: 'dcc-taskMeta' },
                  h('span', {}, task.groupName),
                  h('span', {}, '·'),
                  h('span', {}, t('task.by', { name: task.createdByName })),
                ),
                h('div', { className: 'dcc-taskText' }, task.text),
                h(
                  'div',
                  { className: 'dcc-taskActions' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dcc-miniBtn',
                      onClick: async () => {
                        const ok = await copyText(buildTaskPrompt(data, task));
                        store.notify(ok ? 'ok' : 'error', ok ? t('task.copiedPrompt') : t('notice.clipboardFailed'));
                      },
                    },
                    h(Icon, { name: 'copy', size: 12 }),
                    t('action.copyPrompt'),
                  ),
                ),
              ),
            )
          : h('p', { className: 'dcc-note' }, t('task.empty')),
        tasks.length ? h('p', { className: 'dcc-note' }, t('task.handHint')) : null,
      );
    }

    // ---------------------------------------------------------------- page

    function HubPage({ t }) {
      const snap = useStore();
      const store = shared.store;
      const [query, setQuery] = React.useState('');
      const [showGroup, setShowGroup] = React.useState(false);
      const [showSettings, setShowSettings] = React.useState(false);
      const [showAccounts, setShowAccounts] = React.useState(false);

      const data = snap.data;
      const identity = data?.identity;

      React.useEffect(() => {
        if (!identity) return undefined;
        let stopped = false;
        const beat = () => {
          if (stopped) return;
          store.heartbeat().catch(() => {});
        };
        beat();
        const timer = setInterval(beat, 20_000);
        return () => {
          stopped = true;
          clearInterval(timer);
        };
      }, [identity?.employee?.id]);

      React.useEffect(() => {
        if (!identity) return undefined;
        let busy = false;
        let stopped = false;
        const inFlight = shared.aiJobsInFlight ?? (shared.aiJobsInFlight = new Set());
        const tick = async () => {
          if (busy || stopped) return;
          busy = true;
          try {
            const jobs = await store.aiJobs();
            for (const job of jobs) {
              if (job.status !== 'pending' || inFlight.has(job.id)) continue;
              const sessionId = shared.lastSessionId;
              if (!sessionId) {
                store.notify('error', t('jobs.needSession'));
                break;
              }
              let status = null;
              try {
                status = await store.repoStatus(job.groupId);
              } catch {
                status = null;
              }
              if (!status || !status.bound) {
                await store.failJob(job.id, t('jobs.repoMissing')).catch(() => {});
                continue;
              }
              inFlight.add(job.id);
              try {
                await store.claimJob(job.id);
                const conversation = shared.ctx?.sessions?.scope?.(sessionId)?.get?.('conversation');
                if (!conversation || typeof conversation.send !== 'function') {
                  await store.failJob(job.id, t('jobs.sessionMissing')).catch(() => {});
                  continue;
                }
                const prompt = [
                  '【企业协作·AI 任务】',
                  `任务 ${job.taskId}，群「${job.groupName}」，分支 ${job.branch}。`,
                  `本地仓库：${status.localPath}`,
                  `任务内容：${job.text}`,
                  '',
                  '请在本地仓库完成：',
                  `1. git pull --ff-only，然后 git checkout -b ${job.branch}；`,
                  '2. 按任务修改文件并运行测试；',
                  '3. commit；push origin 当前分支；',
                  '4. 切回 main，git pull --ff-only，merge 该分支并再跑测试；',
                  '5. push main；删除本地和远程的该分支；',
                  `6. 用 company_hub send 在「${job.groupName}」汇报；调用 company_hub job_complete，jobId=${job.id}；有 taskId 时再 task_done。`,
                ].join('\n');
                await conversation.send(prompt);
              } catch (failure) {
                await store.failJob(job.id, String(failure.message || failure)).catch(() => {});
              } finally {
                inFlight.delete(job.id);
              }
            }
          } catch {
            // Keep polling; transient network errors should not break the loop.
          } finally {
            busy = false;
          }
        };
        tick();
        const timer = setInterval(tick, 5_000);
        return () => {
          stopped = true;
          clearInterval(timer);
        };
      }, [identity?.employee?.id]);

      if (!snap.ready) {
        return h('div', { className: 'dcc-page' }, h('div', { className: 'dcc-empty' }, t('loading')));
      }

      if (!identity) {
        return h(
          'div',
          { className: 'dcc-page' },
          h(SetupScreen, { t, snap }),
          snap.error ? h(ErrorLine, { text: t('error.backend', { message: snap.error }) }) : null,
          h(Notice, { t, notice: snap.notice }),
        );
      }

      const connectionState = snap.error
        ? 'error'
        : data.connection?.status === 'ok'
          ? 'ok'
          : data.connection?.status === 'error'
            ? 'error'
            : undefined;

      return h(
        'div',
        { className: 'dcc-page' },
        h(
          'header',
          { className: 'dcc-head' },
          h(
            'div',
            { className: 'dcc-brand' },
            h('span', { className: 'dcc-brandTile' }, h(Icon, { name: 'company', size: 17 })),
            h(
              'div',
              { className: 'dcc-brandText' },
              h('div', { className: 'dcc-title' }, t('panel.title')),
              h(
                'div',
                { className: 'dcc-sub' },
                `${identity.company?.name ?? ''} · ${identity.employee?.name ?? ''}${data.aiMember ? ` · ${data.aiMember.name}` : ''}`,
              ),
            ),
          ),
          h(
            'div',
            { className: 'dcc-headActions' },
            h(
              'span',
              { className: 'dcc-pill', title: data.serverUrl },
              h(StatusDot, { state: connectionState }),
              data.connection?.status === 'ok' ? t('state.ok') : snap.error ? t('state.error') : t('state.idle'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-iconBtn',
                'aria-label': t('accounts.title'),
                title: t('accounts.title'),
                onClick: () => setShowAccounts(true),
              },
              h(Icon, { name: 'company', size: 16 }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-iconBtn',
                'aria-label': t('action.settings'),
                title: t('action.settings'),
                onClick: () => setShowSettings(true),
              },
              h(Icon, { name: 'gear', size: 16 }),
            ),
          ),
        ),
        snap.error
          ? h(
              'div',
              { className: 'dcc-banner' },
              h('span', { style: { flex: 1 } }, snap.error),
              h('button', { type: 'button', className: 'dcc-miniBtn', onClick: () => store.refresh() }, t('action.retry')),
            )
          : null,
        h(
          'div',
          { className: 'dcc-columns' },
          h(Rail, {
            t,
            snap,
            query,
            setQuery,
            onNewGroup: () => setShowGroup(true),
            onSettings: () => setShowSettings(true),
          }),
          h(ChatPane, { t, snap, onNewGroup: () => setShowGroup(true) }),
        ),
        showGroup ? h(GroupDialog, { t, snap, onClose: () => setShowGroup(false) }) : null,
        showSettings ? h(SettingsDialog, { t, snap, onClose: () => setShowSettings(false) }) : null,
        showAccounts ? h(AccountDialog, { t, snap, onClose: () => setShowAccounts(false) }) : null,
        h(Notice, { t, notice: snap.notice }),
      );
    }

    // ---------------------------------------------------------------- right sidebar tab

    function SessionTracker({ sessionId }) {
      React.useEffect(() => {
        if (sessionId) shared.lastSessionId = String(sessionId);
      }, [sessionId]);
      return null;
    }

    function CollabTab({ t, sessionId }) {
      const snap = useStore();
      const store = shared.store;
      const ctx = shared.ctx;
      const data = snap.data;
      React.useEffect(() => {
        if (sessionId) shared.lastSessionId = String(sessionId);
      }, [sessionId]);
      const identity = data?.identity;
      const [openGroupId, setOpenGroupId] = React.useState('');
      const tabGroups = data?.groups ?? [];
      const tabActiveGroupId = openGroupId || tabGroups[0]?.id || '';

      React.useEffect(() => {
        if (tabActiveGroupId && !snap.messages[tabActiveGroupId]) store.refreshMessages(tabActiveGroupId, true);
      }, [tabActiveGroupId]);

      if (!snap.ready) return h('div', { className: 'dcc-tab' }, h('div', { className: 'dcc-note' }, t('loading')));

      if (!identity) {
        return h(
          'div',
          { className: 'dcc-tab' },
          h(
            'div',
            { className: 'dcc-tabHead' },
            h('div', { className: 'dcc-tabTitle' }, h(Icon, { name: 'company', size: 16 }), h('span', {}, t('tab.title'))),
          ),
          h(
            'div',
            { className: 'dcc-card' },
            h('p', { className: 'dcc-note' }, t('tab.offline')),
            h(
              'button',
              {
                type: 'button',
                className: 'dcc-btn',
                'data-primary': '',
                onClick: () => {
                  try {
                    ctx.layout.selectPanel(PANEL_ID);
                  } catch (error) {
                    store.notify('error', String(error.message || error));
                  }
                },
              },
              h(Icon, { name: 'company', size: 14 }),
              t('tab.connect'),
            ),
          ),
          h(Notice, { t, notice: snap.notice, inline: true }),
        );
      }

      const groups = data.groups ?? [];
      const tasks = data.tasks ?? [];
      const activeGroup = groups.find((entry) => entry.id === tabActiveGroupId);
      const bucket = snap.messages[tabActiveGroupId] ?? { items: [], loading: false };
      const recent = bucket.items.filter((message) => message.kind !== 'system' && message.kind !== 'activity').slice(-6);

      return h(
        'div',
        { className: 'dcc-tab' },
        h(
          'div',
          { className: 'dcc-tabHead' },
          h(
            'div',
            { style: { minWidth: 0 } },
            h(
              'div',
              { className: 'dcc-tabTitle' },
              h(Icon, { name: 'users', size: 16 }),
              h('span', {}, identity.company?.name ?? t('tab.title')),
            ),
            h('div', { className: 'dcc-tabMeta' }, `${identity.employee?.name ?? ''} · ${t('tab.title')}`),
          ),
          h(StatusDot, {
            state: data.connection?.status === 'ok' ? 'ok' : data.connection?.status === 'error' ? 'error' : undefined,
          }),
        ),

        h(
          'div',
          { className: 'dcc-tabSection' },
          h(
            'div',
            { className: 'dcc-tabSectionHead' },
            h('span', {}, t('tab.groups')),
            h('span', {}, String(groups.length)),
          ),
          groups.length
            ? h(
                'div',
                { className: 'dcc-tabGroup' },
                groups.slice(0, 12).map((group) =>
                  h(
                    'button',
                    {
                      key: group.id,
                      type: 'button',
                      className: 'dcc-row',
                      'data-active': group.id === tabActiveGroupId ? '' : undefined,
                      onClick: () => setOpenGroupId(group.id),
                    },
                    h(Avatar, { name: group.name, small: true }),
                    h(
                      'span',
                      { className: 'dcc-rowMain' },
                      h('span', { className: 'dcc-rowName' }, h('span', {}, group.name), group.hasAi ? h(AiTag, { t }) : null),
                      h('span', { className: 'dcc-rowSub' }, t('groups.members', { count: group.members.length })),
                    ),
                    group.unread ? h('span', { className: 'dcc-unread' }, group.unread > 99 ? '99+' : group.unread) : null,
                  ),
                ),
              )
            : h('div', { className: 'dcc-note' }, t('tab.noGroup')),
        ),

        activeGroup
          ? h(
              'div',
              { className: 'dcc-card' },
              h(
                'div',
                { className: 'dcc-cardHead' },
                h('div', { className: 'dcc-cardTitle' }, activeGroup.name),
                h('span', { className: 'dcc-note' }, t('groups.members', { count: activeGroup.members.length })),
              ),
              h(
                'div',
                { className: 'dcc-tabGroup' },
                recent.length
                  ? recent.map((message) =>
                      h(
                        'div',
                        { key: message.id, className: 'dcc-tabMsg' },
                        h('span', { className: 'dcc-tabMsgName' }, message.authorIsAi ? 'AI' : message.authorName),
                        h('span', { className: 'dcc-tabMsgText' }, message.text),
                      ),
                    )
                  : h('div', { className: 'dcc-note' }, t('chat.noMessages')),
              ),
            )
          : null,


        h(
          'div',
          { className: 'dcc-tabFoot' },
          h(
            'button',
            {
              type: 'button',
              className: 'dcc-btn',
              style: { flex: 1 },
              onClick: () => {
                try {
                  ctx.layout.selectPanel(PANEL_ID);
                } catch (error) {
                  store.notify('error', String(error.message || error));
                }
              },
            },
            h(Icon, { name: 'company', size: 14 }),
            t('tab.openPanel'),
          ),
        ),
        h(Notice, { t, notice: snap.notice, inline: true }),
      );
    }

    // ---------------------------------------------------------------- plugin

    class PluginErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error, info) {
        console.error('[company-collab] render failed', error, info);
      }
      render() {
        if (this.state.error) {
          return h(
            'div',
            { className: 'dcc-page' },
            h('div', { className: 'dcc-empty' }, '企业协作界面渲染失败'),
            h('pre', { className: 'dcc-errorText' }, String(this.state.error?.stack || this.state.error)),
          );
        }
        return this.props.children;
      }
    }

    function guard(Component) {
      return function Guarded(props) {
        return h(PluginErrorBoundary, null, h(Component, props));
      };
    }

    const SafeHubPage = guard(HubPage);
    const SafeCollabTab = guard(CollabTab);

    function CompanyGlyph({ size = 18 }) {
      return h(Icon, { name: 'company', size });
    }

    function apply(ctx) {
      shared.ctx = ctx;
      shared.t = ctx.locale.bind(NS);

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'company-collab: dictionaries');
      ctx.effect(() => installStyles(), 'company-collab: styles');

      const store = createStore({ t: shared.t });
      shared.store = store;
      ctx.effect(() => store.start(), 'company-collab: polling');

      ctx.effect(
        () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 12,
              label: () => shared.t('panel.title'),
              locale: NS,
            },
            CompanyGlyph,
          ),
        'company-collab: sidebar icon',
      );

      ctx.effect(
        () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            SafeHubPage,
          ),
        'company-collab: main panel',      );

      ctx.effect(
        () =>
          ctx.slots.inject('conversation.session.header.actions', () =>
            ctx.slots.register(
              {
                name: 'conversation.session.header.actions',
                id: 'company-collab-session-tracker',
                order: 90,
                locale: NS,
              },
              SessionTracker,
            ),
          ),
        'company-collab: remember the active session for local AI jobs',
      );

      const tabs = ctx.get('sidebarRightTabs');
      if (tabs && typeof tabs.register === 'function') {
        ctx.effect(
          () =>
            tabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              priority: 'extension',
              title: () => shared.t('tab.title'),
              guide: [
                {
                  id: 'company-collab',
                  order: 40,
                  title: () => shared.t('tab.guideTitle'),
                  description: () => shared.t('tab.guideDesc'),
                  icon: CompanyGlyph,
                },
              ],
            }),
          'company-collab: right tab type',
        );
        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.right.pane.tab',
                  key: TAB_ID,
                  locale: NS,
                },
                SafeCollabTab,
              ),
            ),
          'company-collab: right tab body',
        );
      } else {
        console.warn('[company-collab] sidebarRightTabs service unavailable; right sidebar tab was not registered');
      }
    }

    return {
      name: 'company-collab',
      inject: ['slots', 'locale', 'layout', 'sessions', 'sidebarRightTabs'],
      apply,
    };
  },
});
