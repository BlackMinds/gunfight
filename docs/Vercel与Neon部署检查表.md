# Vercel + Neon 云存档部署检查表

> 适用范围：账号注册/登录、JWT、云存档读取与写入。本文只记录部署步骤和验收门槛，不记录任何真实连接串、密码、Token 或密钥。

## 1. 当前状态

| 项目 | 状态 | 证据或阻断 |
| --- | --- | --- |
| API、本地事务与客户端并发模拟 | 已通过 | `npm test`：22 个文件、116 条用例 |
| 类型与 Vercel 产物 | 已通过 | `npx vue-tsc --noEmit`、`npm run build` |
| Preview 环境联调 | 待授权 | 需要 Vercel 项目与独立 Neon Preview 数据库/分支权限 |
| Production 环境联调 | 待授权 | 需要 Vercel Production 与 Neon 生产分支权限 |

在拿到线上授权前，只能宣布“本地与模拟验收通过”，不能宣布云存档已完成线上生产验收。

## 2. 部署前检查

- [ ] `main` 指向已批准提交，工作区无未提交密钥或本地环境文件。
- [ ] `npm test`、`npx vue-tsc --noEmit`、`npm run build` 全部通过。
- [ ] `.env.example` 仅保留占位值；`.env`、`.env.local` 和 Vercel 拉取的环境文件均不提交。
- [ ] Preview 与 Production 使用不同的 Neon 分支或数据库，禁止预览部署写入生产存档。
- [ ] 确认 `nuxt.config.ts` 使用 `nitro.preset = 'vercel'`，构建命令为 `npm run build`。

## 3. Neon 检查

- [ ] 建立专用数据库和应用角色，不复用个人管理员账号。
- [ ] 运行时 `DATABASE_URL` 使用 Neon 控制台生成的 pooled 连接串；主机名应包含 `-pooler`，并保留 TLS 参数。
- [ ] 不把连接串粘贴到文档、Issue、聊天、截图、构建日志或 Git 历史。
- [ ] 首次部署前使用 Neon SQL Editor 或受控管理连接执行 `server/database/schema.sql`；随后确认 `gunfight_users` 与 `gunfight_cloud_saves` 已存在。
- [ ] 表已预建时，应用角色至少具备两张表所需的 `SELECT / INSERT / UPDATE` 权限；初始化器会先探测表并跳过 DDL。若依赖应用首次自动建表，还必须显式确认其 schema 建表权限。
- [ ] 在 Neon Monitoring 中观察连接数、查询延迟和错误；Serverless 并发下不得持续逼近连接上限。
- [ ] 为生产分支确认恢复/备份策略，并记录负责人和恢复演练时间。

Neon 官方说明 pooled 连接通过带 `-pooler` 的连接串接入 PgBouncer，适合 Serverless 的大量短连接；管理或迁移操作优先使用直接连接。参考：[连接池](https://neon.com/docs/connect/connection-pooling)、[手动连接 Vercel](https://neon.com/docs/guides/vercel-manual)。

## 4. Vercel 检查

- [ ] 在 Project Settings → Environment Variables 中分别配置 Preview 与 Production，不在仓库中填写真实值。
- [ ] 必需变量只有：`DATABASE_URL`、`NUXT_JWT_SECRET`。
- [ ] `NUXT_JWT_SECRET` 使用密码学安全随机值，长度至少 32 个字符；Preview 与 Production 使用不同值。
- [ ] 环境变量新增或轮换后创建新部署；旧部署不会自动获得新值。
- [ ] 构建日志显示 Nuxt/Nitro Vercel 构建成功，产物包含四个 API 路由：注册、登录、云存档 GET、云存档 PUT。
- [ ] Functions 日志不得出现数据库连接串、主机、SQL 错误详情、密码、JWT 或完整存档 payload。
- [ ] 记录最近一个可回滚的健康部署；密钥轮换后确认旧密钥签发的 JWT 按预期失效并要求重新登录。

Vercel 官方说明 Nuxt 可直接部署，`nuxt build` 是默认构建路径；环境变量只对后续新部署生效。参考：[Nuxt on Vercel](https://vercel.com/docs/frameworks/full-stack/nuxt)、[Environment variables](https://vercel.com/docs/environment-variables)。

## 5. Preview 线上验收

所有测试账号都使用一次性名称，不使用真实玩家账号；HTTP 响应和日志只记录状态码与业务错误，不复制 JWT 或存档正文。

- [ ] 首次无表环境可以初始化；若首次连接被临时中断，恢复后下一次请求可以重试，而不是持续 503。
- [ ] 合法注册返回 2xx；两个并发相同用户名注册恰好一个成功，另一个稳定返回 409。
- [ ] 合法登录返回 2xx；错误密码返回 401；缺失、篡改或过期 JWT 返回 401。
- [ ] 新账号读取返回 `revision: 0`、`payload: null`。
- [ ] 首次写入以 `baseRevision: 0` 成功并返回修订 1；再次读取内容与修订一致。
- [ ] 两个浏览器从同一修订分叉：先写入者成功，后写入者收到冲突且云端有效存档未被覆盖。
- [ ] 客户端连续触发两次保存时请求串行，第二次使用第一次响应的新修订号。
- [ ] 缺失/小数/负数 `baseRevision`、数组 payload、错误核心字段返回 400；UTF-8 编码超过 1 MB 返回 413。
- [ ] 在 Preview 临时使用不可用数据库配置并重新部署时，账号与存档 API 返回稳定 503，响应不包含 PostgreSQL 内部信息；恢复配置并再次部署后服务恢复。
- [ ] 冲突选择“保留本地”和“采用云端”各完成一次；失败或冲突期间都不覆盖已有有效存档。

## 6. Production 放行门槛

- [ ] Preview 全部验收项通过，且没有未解释的 Vercel Function 或 Neon 错误日志。
- [ ] Production 使用独立 Neon 生产分支、生产应用角色和生产 JWT 密钥。
- [ ] 用生产域名完成一次“注册 → 登录 → 首次读取 → 保存 → 刷新后读取”的最小闭环。
- [ ] 用两个会话完成一次真实修订冲突，确认后写者不会覆盖先写者。
- [ ] 确认桌面与移动端退出登录后本地存档仍可用，重新登录只在明确选择后应用冲突版本。
- [ ] 记录部署 ID、Neon 分支、验收时间、执行人和回滚目标；记录中不得包含任何密钥或 payload。
- [ ] 观察至少一个约定窗口内的 401/409/413/503 比例、函数延迟与数据库连接数，再由项目负责人签字放行。

未满足以上线上门槛时，发布说明必须保留“Vercel + Neon 线上验收待授权/待执行”。
