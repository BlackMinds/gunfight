# Vercel + Neon 云存档部署检查表

> 适用范围：账号注册/登录、JWT、云存档、服务端活动、可信赛季、排行榜与一次性排位行动。本文只记录部署步骤和验收门槛，不记录任何真实连接串、密码、Token、票据正文、存档 payload 或密钥。

## 1. 当前状态

| 项目 | 状态 | 证据或阻断 |
| --- | --- | --- |
| API、迁移、本地事务与客户端并发模拟 | 已通过（本地） | `npm test`：28 个文件、161 条用例 |
| 类型与 Vercel 产物 | 已通过（本地） | `npx vue-tsc --noEmit`、Vercel preset `npm run build` |
| Preview 环境联调 | 待授权 | 需要 Vercel 项目与独立 Neon Preview 数据库/分支权限 |
| Production 环境联调 | 待授权 | 需要 Vercel Production 与 Neon 生产分支权限 |

在拿到线上授权前，只能宣布“本地与模拟验收通过”，不能宣布云存档或可信排行已完成 Preview／Production 验收。

## 2. 部署前检查

- [ ] `main` 指向已批准提交，工作区无未提交密钥或本地环境文件。
- [ ] `npm test`、`npx vue-tsc --noEmit`、`npm run build` 全部通过。
- [ ] `.env.example` 仅保留占位值；`.env`、`.env.local` 和 Vercel 拉取的环境文件均不提交。
- [ ] Preview 与 Production 使用不同的 Neon 分支或数据库，禁止预览部署写入生产存档。
- [ ] 确认 `nuxt.config.ts` 使用 `nitro.preset = 'vercel'`，构建命令为 `npm run build`。
- [ ] 确认没有正式线上玩家；按当前默认规则所有账号从服务端排位进度 `0` 开始。若发现正式玩家数据，停止迁移并改走逐账号批准方案。
- [ ] 记录部署前 Neon 恢复点、健康 Vercel 部署 ID、五张业务表行数和迁移执行人；记录不得包含用户名、Token、票据或 payload 正文。

## 3. Neon 检查

- [ ] 建立专用数据库和应用角色，不复用个人管理员账号。
- [ ] 运行时 `DATABASE_URL` 使用 Neon 控制台生成的 pooled 连接串；主机名应包含 `-pooler`，并保留 TLS 参数。
- [ ] 不把连接串粘贴到文档、Issue、聊天、截图、构建日志或 Git 历史。
- [ ] 首次部署或正式升级前使用 Neon SQL Editor／受控直连执行 `server/database/migrations/20260726_trusted_ranked_up.sql`；全新空库可先用 `server/database/schema.sql`，但仍要确认迁移版本标记存在。
- [ ] 确认业务表完整：`gunfight_users`、`gunfight_cloud_saves`、`gunfight_season_scores`、`gunfight_ranked_progress`、`gunfight_ranked_runs`；迁移账本 `gunfight_schema_migrations` 也必须存在。
- [ ] 核对外键均指向 `gunfight_users(id)` 且使用 `ON DELETE CASCADE`；核对赛季四项排名索引、单账号单 active 票据唯一索引和已完成票据查询索引。
- [ ] 迁移后 `gunfight_users` 与 `gunfight_cloud_saves` 行数／修订不变；`gunfight_ranked_progress` 每个账号恰有一行且 `highest_stage = 0`；上线前测试用 `gunfight_season_scores` 与 `gunfight_ranked_runs` 已清空。
- [ ] 立即重跑同一迁移，确认版本标记使它成为无数据变更操作，不会清空重跑前插入的验证成绩。
- [ ] 应用角色具备五张业务表所需的 `SELECT / INSERT / UPDATE / DELETE` 权限和序列／schema 使用权限；正式迁移使用独立受控角色，不依赖 Serverless 应用首次建表。
- [ ] 在 Neon Monitoring 中观察连接数、查询延迟和错误；Serverless 并发下不得持续逼近连接上限。
- [ ] 为生产分支确认恢复/备份策略，并记录负责人和恢复演练时间。

Neon 官方说明 pooled 连接通过带 `-pooler` 的连接串接入 PgBouncer，适合 Serverless 的大量短连接；管理或迁移操作优先使用直接连接。参考：[连接池](https://neon.com/docs/connect/connection-pooling)、[手动连接 Vercel](https://neon.com/docs/guides/vercel-manual)。

## 4. Vercel 检查

- [ ] 在 Project Settings → Environment Variables 中分别配置 Preview 与 Production，不在仓库中填写真实值。
- [ ] 必需变量只有：`DATABASE_URL`、`NUXT_JWT_SECRET`。
- [ ] `NUXT_JWT_SECRET` 使用密码学安全随机值，长度至少 32 个字符；Preview 与 Production 使用不同值。
- [ ] 环境变量新增或轮换后创建新部署；旧部署不会自动获得新值。
- [ ] 构建日志显示 Nuxt/Nitro Vercel 构建成功，产物包含全部九个 API：注册 POST、登录 POST、云存档 GET／PUT、活动 GET、赛季成绩 POST、排行榜 GET、排位开票 POST、排位结算 POST。
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
- [ ] 执行正式迁移后，旧测试账号的云存档仍可读写，但首次排位只能从服务端第 `1` 关开始；修改云存档 `highestCleared` 或本地赛季分数不能跳过服务端连续进度。
- [ ] 登录玩家点击部署时，开票响应前保持在基地并禁用重复部署；开票成功后才进入战斗，HUD 显示已取得服务端票据。
- [ ] 临时让排位开票返回 401／409／503，各完成一局降级验证：游戏可继续，HUD 明确显示“本地行动，不计入排行榜”，该局不得出现在榜单。
- [ ] 两个并发开票请求均不产生 503；最终只有后签发票据为 active，先签发票据结算返回 409，后签发票据可结算。
- [ ] 同一票据连续提交两次时恰好一次成功；使用另一账号提交票据稳定返回 409，进度、成绩和 active 票据状态不被越权修改。
- [ ] 在赛季／活动边界前签发票据并于边界后结算：结果只写票据所属旧赛季，活动加成按签发时 `activity_id` 计算；边界后新票据写入新赛季。
- [ ] 在排位原子结算期间模拟数据库连接中断，确认完成记录、连续进度与赛季成绩没有部分写入；恢复数据库后同一未消费且未过期票据可重试。
- [ ] 执行 `server/database/migrations/20260726_trusted_ranked_rollback.sql`，确认所有 active 票据变为 expired，五张业务表及已完成成绩保留；上一健康 Vercel 部署仍可完成账号与云存档最小闭环。
- [ ] 从部署前 Neon 恢复点建立独立恢复分支，核对五张业务表后切换 Preview 连接并重做登录、云存档读取和本地行动；不在原分支直接删表。

## 6. Production 放行门槛

- [ ] Preview 全部验收项通过，且没有未解释的 Vercel Function 或 Neon 错误日志。
- [ ] Production 使用独立 Neon 生产分支、生产应用角色和生产 JWT 密钥。
- [ ] 用生产域名完成一次“注册 → 登录 → 首次读取 → 保存 → 刷新后读取”的最小闭环。
- [ ] 用两个会话完成一次真实修订冲突，确认后写者不会覆盖先写者。
- [ ] 用两个账号完成一次真实排位开票、结算、重复／跨账号拒绝和 Top 50／本人名次读取，确认 Function 日志没有 SQL、JWT、票据或 payload 泄露。
- [ ] 选择一个非赛季边界时段验证活动加成；赛季边界用 Preview 演练证据和 Production 配置审计放行，不修改 Production 系统时间。
- [ ] 确认桌面与移动端未登录时都不能进入 `/game`，退出账号立即返回登录入口；重新登录后只从该账号云存档恢复进度。
- [ ] 记录部署 ID、Neon 分支、迁移版本、五表核对摘要、验收时间、执行人和回滚目标；记录中不得包含任何密钥、票据或 payload。
- [ ] 观察至少一个约定窗口内的 401/409/413/503 比例、函数延迟与数据库连接数，再由项目负责人签字放行。

未满足以上线上门槛时，发布说明必须保留“Vercel + Neon 线上验收待授权/待执行”。
