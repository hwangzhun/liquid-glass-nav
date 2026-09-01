# Liquid Glass Nav

一个支持云端同步和 AI 信息整理的私人网址导航站。界面参考 Apple 产品页的视觉语言，以白色与浅灰画布、克制的系统蓝、液态玻璃导航层和宽松排版构建，同时保留完整的暗色主题与移动端体验。

项目使用 React、TypeScript、Vite 和 Tailwind CSS 构建前端，通过 Cloudflare Pages Functions 提供登录、网站管理、网站图标发现和 AI 信息整理接口，并使用 Cloudflare D1 持久化网站数据。

## 功能与特性

- Apple 风格平面界面，支持亮色和暗色主题
- 响应式布局，适配桌面端和移动端
- 网站搜索、分类筛选、收藏，以及舒适、紧凑、小型和 Mini 四种入口视图
- 新增、编辑、删除和拖拽排序网站
- 自定义分类、分类图标和显示顺序
- 自定义背景颜色、背景图片、模糊度、亮度和对比度
- 自动发现 favicon、Apple Touch Icon 和 Web App Manifest 图标，也可上传自定义图片
- 支持调整网站图标的缩放比例、底色和颜色预设
- AI 自动生成网站名称、简介、分类和标签
- 支持公开只读浏览，使用单一密码进入管理模式，登录状态通过 `HttpOnly` Cookie 保存 30 天
- D1 云端存储，浏览器 `localStorage` 作为缓存和离线降级
- 首次部署默认为空数据，由用户自行创建分类和入口

## 设计与性能

当前界面规范记录在 [`DESIGN.md`](DESIGN.md)。重构只调整视觉表现，没有改变侧栏、顶部栏、Hero、搜索、入口网格、设置抽屉和编辑弹窗的页面结构与交互流程。

当前材质和动效约定：

- 暗色侧栏、搜索框和设置抽屉使用半透明背景、边缘高光与 `backdrop-filter`，保留液态玻璃层次
- 打开设置时，主工作区通过遮罩产生模糊效果；抽屉使用独立的玻璃材质和缓入缓出动画
- 入口卡片使用轻量渐变材质，不对每张卡片单独启用模糊，避免入口较多时影响滚动性能
- 入口网格使用错峰淡入和轻微状态过渡；控件统一使用缓入缓出，支持 `prefers-reduced-motion`
- 亮模式入口 Hover 使用 DESIGN.md 定义的 `#e8e8ed` Hover Wash；系统蓝仅用于主要操作按钮
- 保留 `content-visibility`，减少屏幕外卡片的绘制工作
- 为网站图标启用延迟加载和异步解码
- 在编辑模式中使用透明度区分层级，不再模糊整个页面

## 更新日志

### 2026-08-31 V1.1.2

- 恢复暗色侧栏、搜索框和设置抽屉的液态玻璃材质
- 打开设置时恢复主界面模糊遮罩，并补齐抽屉关闭动画
- 统一入口卡片、按钮、筛选控件和面板的缓入缓出过渡
- 恢复入口卡片错峰淡入动画，同时保留减少动态效果的无障碍支持
- 按 `DESIGN.md` 将亮模式入口 Hover 调整为 `#e8e8ed` Hover Wash，避免使用额外蓝色装饰


### 2026-08-24 V1.0.6

- 优化 iOS 26 全面屏与 PWA 模式，适配顶部状态栏、底部安全区、动态可视高度及横屏布局
- 重构移动端弹窗与分类侧栏的尺寸和层级表现，完善展开动画、背景材质与页面遮罩
- 编辑模式调整为接近 iOS 主屏幕的交互：入口轻微晃动，轻点打开编辑页，拖动排序
- 删除入口改为悬浮于卡片最上层的红色圆形 × 按钮，不再挤压图标和卡片内容
- 编辑入口页面新增 AI 识别，可根据当前网址更新名称、简介、分类和标签
- Icon 底色直接作用于入口的 `.site-icon` 容器，新增 12 色预设、自定义颜色与随机换色
- 优化 Icon 配色选择器的移动端布局，桌面单排显示，手机端自动排列为两排
- 统一入口卡片底部信息布局，标签与分类保持同一行并在左右两端对齐

### 2026-08-23 V1.0.5

- 完善移动端的表现

### 2026-08-23 V1.0.4

- 支持未登录只读浏览，登录后进行管理
- 修复不同设备之间入口数据不一致的问题
- 分类、收藏和界面偏好支持通过 Cloudflare D1 同步

### 2026-08-20 V1.0.2

- 设置新增“入口模块大小”：舒适、紧凑、小图标。

### 2026-08-20 V1.0.2

- 全局字体切换为 SF Pro SC，通过 jsDelivr 加载 SF Pro Webfont，并保留苹方、微软雅黑和系统字体回退
- 重整全局字号层级，将过小的辅助文字提升到更易读的尺寸，统一正文、标签、标题和展示字号变量
- 设置新增入口模块大小选项，支持舒适、紧凑和小图标三种模式；小图标模式仅显示图标、标题和分类

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
  state.ts              D1 分类、收藏与界面偏好同步
  analyze-site.ts       AI 网站信息分析
  site-icons.ts         网站 favicon、Touch Icon 与 Manifest 图标发现
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

### 更换网站 Logo 与生成缩略图

项目根目录的 `logo.svg` 是网站标志的源文件。替换该文件后，在项目根目录运行：

```powershell
Copy-Item -LiteralPath ".\logo.svg" -Destination ".\client\public\logo.svg" -Force

node -e "const sharp=require('sharp'); Promise.all([sharp('logo.svg').resize(512,512).png().toFile('client/public/logo-512.png'), sharp('logo.svg').resize(180,180).png().toFile('client/public/apple-touch-icon.png')]).catch(error=>{console.error(error);process.exit(1)})"
```

该命令会更新：

- `client/public/logo.svg`：侧栏 Logo 和浏览器 favicon
- `client/public/logo-512.png`：Open Graph 与 Twitter 分享缩略图
- `client/public/apple-touch-icon.png`：iOS 主屏幕图标

源 SVG 建议保持 1:1 画布。生成命令使用项目依赖中的 Sharp；如果提示找不到模块，请先运行 `npm install`。

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
      "migrations_dir": "./migrations",
    },
  ],
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

`sites` 表以 `workspace_id` 和 `id` 作为联合主键。私人站点使用由登录会话保护的固定工作区 `private-default`，因此通过同一站点密码登录的设备会读取同一份数据。升级后首次读取为空时，旧版匿名工作区中的入口会自动合并到该主工作区。

D1 保存：

- 网站名称、URL 和简介
- 分类与分类标签
- 图标地址、缩放比例、底色与图标样式
- 网站标签
- 推荐状态和排序顺序
- 自定义分类与分类顺序
- 收藏
- 主题、背景和布局偏好

浏览器 `localStorage` 仅作为缓存和离线降级。清除某台设备的浏览器数据不会改变 D1 主数据；重新登录后会再次从云端加载。部署此版本前必须按顺序应用现有迁移，包括 `0005_shared_workspace_state.sql` 和 `0006_site_icon_appearance.sql`。

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
