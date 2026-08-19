# Liquid Glass Nav

一个带有 Liquid Glass 视觉效果的私人网址导航站。项目使用 React、TypeScript、Vite 和 Tailwind CSS 构建前端，通过 Cloudflare Pages Functions 提供登录、网站管理和 AI 信息整理接口，并使用 Cloudflare D1 持久化网站数据。

## 功能与特性

- Liquid Glass 风格界面，支持亮色和暗色主题
- 响应式布局，适配桌面端和移动端
- 网站搜索、分类筛选、收藏和紧凑视图
- 新增、编辑、删除和拖拽排序网站
- 自定义分类、分类图标和显示顺序
- 自定义背景颜色、背景图片、模糊度、亮度和对比度
- 自动读取网站 favicon，也可上传自定义图标
- AI 自动生成网站名称、简介、分类和标签
- 单密码登录保护，登录状态通过 `HttpOnly` Cookie 保存 30 天
- D1 云端存储，浏览器 `localStorage` 作为缓存和离线降级
- 首次部署默认为空数据，由用户自行创建分类和入口

## 更新日志

### 2026-08-20 V1.0.1

- 入口编辑模式新增删除功能
- 分类管理隐藏系统默认分类
- 移除示例入口与预置普通分类
- D1 支持自定义分类

## 技术栈

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1
- Wrangler 4

## 项目结构

```text
client/                 React 前端
functions/api/          Cloudflare Pages Functions API
  auth.ts               登录、会话检查和退出
  sites.ts              D1 网站读取与写入
  analyze-site.ts       AI 网站信息分析
migrations/             D1 数据库迁移
shared/                 前后端共享逻辑
dist/public/            Pages 构建输出目录
wrangler.jsonc          Cloudflare Pages 与 D1 配置
```

## 本地开发

### 环境要求

- Node.js 22 或更高版本
- npm
- Cloudflare 账号

安装依赖：

```bash
npm install
```

复制环境变量示例：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`：

```dotenv
NAV_PASSWORD=your-local-password

# 以下为可选配置；不配置时使用本地规则分析网站
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

启动开发服务器：

```bash
npm run dev
```

默认地址为 <http://localhost:3000>。本地未设置 `NAV_PASSWORD` 时，开发密码为 `tidal`。

类型检查与构建：

```bash
npm run check
npm run build:pages
```

Pages 前端产物会生成在 `dist/public`。

## 部署到 Cloudflare Pages

> 本项目使用 `functions/` 目录中的 Pages Functions。请创建 **Pages 项目**，不要在 Workers Builds 中创建普通 Worker 项目。

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

### 2. 创建 Pages 项目

推荐在 Cloudflare Dashboard 中操作：

1. 进入 **Workers & Pages**。
2. 选择 **Create application → Pages → Connect to Git**。
3. 连接本项目所在的 GitHub 或 GitLab 仓库。
4. 设置生产分支，例如 `main`。
5. 填写以下构建配置：

```text
Framework preset: None
Build command: npm run build:pages
Build output directory: dist/public
Root directory: /
```

Pages Git 集成会在构建后自动发布，因此传统 Pages 配置页面通常不需要填写额外的部署命令。

如果你所在的页面强制要求填写“部署命令”，很可能创建的是 Workers Builds 项目，而不是 Pages 项目。Pages 的手动发布命令是：

```bash
npx wrangler pages deploy dist/public --project-name liquid-glass-nav
```

该命令要求 Cloudflare 账号中已经存在同名 Pages 项目。也可以先通过命令创建：

```bash
npx wrangler pages project create liquid-glass-nav
```

### 3. 配置生产环境 Secret

在 Pages 项目中进入 **Settings → Variables and Secrets**，至少添加：

```text
NAV_PASSWORD=你的私人登录密码
```

`NAV_PASSWORD` 必须配置为 Secret。生产环境没有默认密码；缺少该变量时登录接口会返回 503。

如需启用 AI 网站分析，再添加：

```text
AI_API_KEY=你的 API Key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

`AI_API_KEY` 应配置为 Secret。不要使用 `VITE_AI_API_KEY`，否则密钥会被打包到浏览器代码中。`AI_BASE_URL` 可指向兼容 OpenAI Chat Completions API 的服务。

## 配置 Cloudflare D1

### 1. 创建数据库

```bash
npx wrangler d1 create liquid-glass-nav-db
```

命令会返回数据库 ID。把 `wrangler.jsonc` 中的 D1 配置更新为实际值：

```jsonc
{
  "d1_databases": [
    {
      "binding": "NAV_DB",
      "database_name": "liquid-glass-nav-db",
      "database_id": "替换为实际数据库 ID",
      "migrations_dir": "./migrations"
    }
  ]
}
```

`NAV_DB` 是代码使用的绑定名，不要改成 `DB`，除非同时修改 `functions/_types.ts` 和所有 `context.env.NAV_DB` 引用。

### 2. 应用数据库迁移

将现有迁移应用到线上 D1：

```bash
npx wrangler d1 migrations apply liquid-glass-nav-db --remote
```

迁移会创建 `sites` 表、排序字段及相关索引。验证线上表：

```bash
npx wrangler d1 execute liquid-glass-nav-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
npx wrangler d1 execute liquid-glass-nav-db --remote --command "PRAGMA table_info(sites);"
```

不要遗漏 `--remote`；否则迁移只会写入本地模拟数据库，线上仍会提示 `no such table: sites`。

### 3. 将 D1 绑定到 Pages

在 Cloudflare Dashboard 中：

1. 打开对应的 Pages 项目。
2. 进入 **Settings → Bindings**。
3. 选择 **Add binding → D1 database**。
4. Variable name 填写 `NAV_DB`。
5. 选择刚创建的 `liquid-glass-nav-db`。
6. 分别检查 Production 和 Preview 环境。
7. 保存后重新部署项目。

绑定名称必须与代码中的 `context.env.NAV_DB` 完全一致。

### 4. 本地测试 Pages Functions 和 D1

先构建前端：

```bash
npm run build:pages
```

再启动 Pages 本地运行环境：

```bash
npx wrangler pages dev dist/public
```

Wrangler 默认使用本地 D1 数据。初始化本地数据库：

```bash
npx wrangler d1 migrations apply liquid-glass-nav-db --local
```

## 数据说明

`sites` 表以 `workspace_id` 和 `id` 作为联合主键。每个浏览器会在本地生成一个匿名 workspace ID，并通过 `x-workspace-id` 请求头读写自己的导航数据。

D1 保存：

- 网站名称、URL 和简介
- 分类与分类标签
- 图标与图标样式
- 网站标签
- 推荐状态和排序顺序

目前收藏、主题、背景和部分界面偏好仍保存在浏览器 `localStorage` 中。清除浏览器站点数据会生成新的 workspace ID，因此可能看不到旧 workspace 下的网站记录。

## 常用命令

```bash
npm run dev              # 启动 Vite 开发服务器
npm run check            # TypeScript 类型检查
npm run build:pages      # 构建 Cloudflare Pages 产物
npm run preview          # 预览静态构建
npx wrangler pages dev dist/public
npx wrangler pages deploy dist/public --project-name liquid-glass-nav
npx wrangler d1 migrations apply liquid-glass-nav-db --remote
```

## 常见问题

### `D1_ERROR: no such table: sites`

线上数据库尚未执行迁移：

```bash
npx wrangler d1 migrations apply liquid-glass-nav-db --remote
```

### `The Pages project "liquid-glass-nav" does not exist`

当前账号中不存在这个 Pages 项目，或者创建的是 Worker 项目。确认 Wrangler 登录的 Cloudflare 账号正确，并在 Dashboard 中创建 Pages 项目后再部署。

### Cloudflare 自动使用 pnpm

Cloudflare 会根据锁文件选择包管理器。如果项目使用 npm，应提交 `package-lock.json`，并移除 `pnpm-lock.yaml`、`yarn.lock` 等其他包管理器锁文件。

### 登录接口返回 503

生产环境没有配置 `NAV_PASSWORD`。在 Pages 的 Variables and Secrets 中添加该 Secret，然后重新部署。

### 页面可打开，但 `/api/*` 返回 404

确认项目类型为 Cloudflare Pages，并且仓库根目录下的 `functions/` 目录参与了部署。静态资源输出目录应为 `dist/public`，而不是 `dist`。

## License

[MIT](LICENSE)
