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

- D1 是入口、分类、收藏与界面偏好的主存储。
- 通过有效站点密码登录的设备统一使用 `private-default` 工作区。
- 升级后首次读取为空时，旧版匿名工作区入口会自动合并到主工作区。
- `localStorage` 仅保留为本地缓存和离线降级。
- 部署前需要运行远端迁移，确保 `nav_state` 表已创建。
- D1 读取接口公开；D1 写入、删除和 AI 接口需要有效登录 Cookie。
