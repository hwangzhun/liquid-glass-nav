# Cloudflare Pages + D1 部署

## 1. 登录并创建 D1

```bash
pnpm exec wrangler login
pnpm d1:create
```

复制命令返回的 `database_id`，替换 `wrangler.jsonc` 中的
`REPLACE_WITH_D1_DATABASE_ID`。

## 2. 创建数据表

```bash
pnpm d1:migrate
```

迁移文件位于 `migrations/`。

## 3. 配置私人登录密码

在 Cloudflare Dashboard 的 Workers & Pages 项目设置中添加 Secret：

- `NAV_PASSWORD`：你的单一站点密码

登录成功后浏览器会保存 30 天的 `HttpOnly` Cookie。修改 `NAV_PASSWORD`
会立即让已有登录状态失效。本地 `pnpm dev` 未配置该变量时，测试密码为
`tidal`；生产环境没有默认密码。

## 4. 配置 AI 密钥

在 Cloudflare Dashboard 的 Workers & Pages 项目设置中添加 Secret：

- `AI_API_KEY`

可选变量：

- `AI_BASE_URL`，默认 `https://api.openai.com/v1`
- `AI_MODEL`，默认 `gpt-4.1-mini`

不要使用 `VITE_AI_API_KEY`，否则密钥会进入浏览器构建产物。

## 5. 部署

```bash
pnpm deploy:pages
```

Pages 输出目录是 `dist/public`，D1 绑定名必须保持为 `NAV_DB`。

## 数据策略

- D1 是网站与标签的主存储。
- `localStorage` 保留为本地缓存和离线降级。
- 每个浏览器首次访问会创建匿名 `tidal-workspace-id`。
- 第一次连接空的 D1 workspace 时，会把浏览器现有网站批量迁移到 D1。
- 收藏和界面偏好目前仍保存在浏览器本地。
- D1 与 AI 接口需要有效登录 Cookie；静态前端由登录页遮挡。
