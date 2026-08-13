# Teams 发布指南

## 三种方案，按推荐程度排序

---

## 方案 A：静态托管 + Teams 网站标签页（推荐）

最简单直接，不需要 SharePoint 管理权限。

### 第 1 步：托管网页

**选项 1：GitHub Pages（免费）**
1. 创建 GitHub 仓库，上传 `index.html`、`app.js`、`styles.css`
2. Settings → Pages → Source: main branch → Save
3. 等待 1-2 分钟，获得 URL：`https://你的用户名.github.io/仓库名/`

**选项 2：Azure Static Web Apps（免费）**
1. Azure Portal → 创建 Static Web App
2. 连接 GitHub 仓库或直接上传
3. 获得 URL：`https://xxx.azurestaticapps.net`

**选项 3：公司内部服务器**
1. 把 3 个文件放到 IIS / Nginx 的 web 目录
2. 确保内网可访问：`http://internal-server/pm/index.html`

### 第 2 步：Teams 添加标签页

1. 打开 Teams，进入目标团队频道
2. 频道顶部 → **+** 添加标签页
3. 搜索 **"网站"**（Website）
4. 粘贴上面的 URL → 保存

---

## 方案 B：Teams 自定义应用包（正式部署）

适合需要让全员自己安装的场景。

### 第 1 步：托管网页（同方案 A）

### 第 2 步：生成应用包

1. 准备两个图标（已提供模板）：
   - `color.png`：192×192 彩色图标
   - `outline.png`：32×32 透明背景线条图标
2. 编辑 `manifest.json`：
   - 把 `contentUrl` 和 `websiteUrl` 改成你的实际托管 URL
   - 把 `validDomains` 改成你的域名
   - `id` 生成新 GUID（可用 PowerShell `[guid]::NewGuid()`）
3. 把 `manifest.json` + `color.png` + `outline.png` 打成 zip 包

### 第 3 步：上传到 Teams

**个人测试：**
1. Teams → 应用 → 管理你的应用 → 上传应用 → 上传自定义应用
2. 选择 zip 文件 → 添加

**组织部署（需管理员）：**
1. Teams Admin Center → Teams apps → Manage → Upload
2. 审批通过后全员可见

---

## 方案 C：SharePoint 嵌入（有 SP 环境时）

### 第 1 步：上传文件到 SharePoint

1. SharePoint 文档库 → 新建文件夹 `pm-system`
2. 上传 `index.html`、`app.js`、`styles.css`
3. 右键 `index.html` → 获取链接 → 确保"任何人都可查看"

### 第 2 步：创建 SharePoint 页面嵌入

直接打开 SP 上的 HTML 会触发下载而非渲染，需嵌入：

1. SharePoint → 新建页面 → 空白页
2. 添加 **"嵌入"Web 部件**
3. 粘贴 index.html 的链接
4. 发布页面

### 第 3 步：Teams 添加标签页

1. Teams 频道 → **+** 添加标签页
2. 选择 **"SharePoint"**
3. 选择刚才创建的页面 → 保存

---

## 注意事项

1. **localStorage 隔离**：每个用户的浏览器各自独立存储，数据不同步
   - 如果需要多人共享数据，必须加后端（WebSocket + 数据库）
   - 当前离线版适合每人各自管理自己的项目数据

2. **Teams iframe 限制**：
   - Teams 用 iframe 加载标签页，需确保域名在 `validDomains` 中
   - 某些弹窗（alert）可能在 Teams 中表现不同

3. **字体加速**：
   - Google Fonts 在国内可能加载慢
   - 优化版已将字体改为本地方案，不影响功能

4. **HTTPS 要求**：
   - Teams 要求 contentUrl 必须是 HTTPS
   - GitHub Pages 和 Azure 默认 HTTPS，公司内部需配置证书
