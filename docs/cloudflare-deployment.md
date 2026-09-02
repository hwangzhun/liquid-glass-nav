# 使用一键脚本部署到 Cloudflare

本指南说明如何通过 `npm run deploy:cloudflare` 将 Liquid Glass Nav 部署到 Cloudflare Pages。该脚本会同时处理 Cloudflare Pages、Pages Functions 和 Cloudflare D1 的首次配置与后续发布。

## 部署前置条件

在运行脚本前，请确认以下条件已满足：

- 已安装 **Node.js 22 或更高版本**，并可在终端运行 `node` 与 `npm`。
- 已在项目根目录安装依赖：`npm install`。这会安装脚本使用的本地 Wrangler。
- 拥有一个 Cloudflare 账号，并已在终端登录：

  ```bash
  npx wrangler login
  ```

- 当前 Cloudflare 账号或 API Token 具有以下权限：
  - Cloudflare Pages：读取项目、创建项目与部署
  - Cloudflare D1：读取数据库、创建数据库与执行迁移
  - Pages Secrets：创建或更新生产环境变量
- 可以使用交互式终端输入生产密码。脚本会隐藏输入内容，因此不适合直接在没有 TTY 的 CI 环境中运行。
- 已确认 `wrangler.jsonc` 中的项目名称与数据库名称符合预期。首次部署时，若当前账号无法访问配置中的 D1 UUID，脚本会在 **APAC** 创建同名数据库，并把新的 UUID 写入该文件。

准备以下信息：

| 配置 | 是否必填 | 用途 |
| --- | --- | --- |
| `NAV_PASSWORD` | 是 | 管理模式登录密码；生产环境必须配置。 |
| `AI_API_KEY` | 否 | 启用 AI 网站信息分析。 |
| `AI_BASE_URL` | 否 | OpenAI 兼容接口地址；默认 `https://api.openai.com/v1`。 |
| `AI_MODEL` | 否 | AI 模型名；默认 `gpt-4.1-mini`。 |

> 不要使用 `VITE_AI_API_KEY`。这类变量会进入前端构建产物，导致密钥暴露。

## 首次部署

在项目根目录运行：

```bash
npm install
npx wrangler login
npm run deploy:cloudflare
```

脚本依次完成：

1. 检查 Node.js、npm、本地 Wrangler 和 Cloudflare 登录状态。
2. 运行 TypeScript 类型检查，并构建 `dist/public`。
3. 查找 `wrangler.jsonc` 中配置的 D1：可访问则复用；不可访问则在 APAC 新建数据库并更新 `database_id`。
4. 查找同名 Pages 项目；不存在时创建，并以 `main` 作为生产分支。
5. 隐藏输入 `NAV_PASSWORD`，并可选择配置 AI 变量；所有值使用 Cloudflare Pages Secret 上传，不会写入 `.env` 或显示在日志中。
6. 对远端 D1 应用 `migrations/` 中尚未执行的迁移。
7. 将 `dist/public` 连同根目录的 `functions/` 发布到 Cloudflare Pages。

成功后，终端会输出默认地址：

```text
https://<Pages 项目名>.pages.dev
```

首次运行新建 D1 时，请检查并提交 `wrangler.jsonc` 的 `database_id` 修改。这样，后续部署会继续使用同一份线上数据。

## 后续发布

代码修改后，仍然运行同一条命令：

```bash
npm run deploy:cloudflare
```

脚本会复用已有 Pages 项目和当前账号可访问的 D1 数据库，只应用新增迁移并重新发布。再次输入 `NAV_PASSWORD` 会更新同名的 Pages Secret；如果不需要改动 AI 设置，在提示处直接按回车或输入 `N` 即可。

## 部署后的检查

- 打开脚本输出的 `*.pages.dev` 地址，确认首页可加载。
- 使用 `NAV_PASSWORD` 进入管理模式，新增一个入口并刷新页面，确认数据能从 D1 读取。
- 如果启用了 AI，编辑任意入口并运行 AI 分析，确认接口返回正常。
- 若配置了自定义域名，请在 Cloudflare Pages 项目中完成域名绑定与 DNS 验证；该脚本不修改域名或 DNS。

## 常见问题

### 提示尚未登录 Cloudflare

重新执行：

```bash
npx wrangler login
```

登录完成后再运行部署脚本。

### 提示无法读取 Pages 或 D1 列表

检查登录的 Cloudflare 账号或 API Token 是否具有 Pages、D1 的读取和写入权限。脚本会在无法确认资源状态时停止，避免误创建或误发布。

### 登录接口返回 503

通常是 `NAV_PASSWORD` 未成功写入 Pages Secret。重新运行 `npm run deploy:cloudflare`，并在提示时输入非空密码；随后完成发布。

### 页面可打开，但 `/api/*` 返回 404

确认部署的是 **Cloudflare Pages** 项目。根目录的 `functions/` 会随 Pages 部署自动作为 Pages Functions 生效；普通 Worker 项目不会按此方式处理。

### D1 报 `no such table`

确认部署脚本完整运行至“应用远端 D1 迁移”。如果中途失败，修复问题后再次运行脚本；迁移命令会安全地跳过已应用的迁移。

## 安全与数据说明

- 脚本不会读取、创建或覆盖 `.env` 文件。
- `NAV_PASSWORD` 和可选 AI 配置通过标准输入传给 Wrangler，不会主动打印。
- 脚本不会删除 D1 数据库、Pages 项目或现有数据。
- 新建数据库会修改仓库跟踪的 `wrangler.jsonc`；请在核对 UUID 后提交该改动，或根据团队的配置管理方式妥善保存它。
