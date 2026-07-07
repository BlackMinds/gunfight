# 技术架构文档

## 1. 技术栈

### 1.1 前端

- Nuxt 3
- Vue 3
- TypeScript
- Pinia

### 1.2 后端

- Nuxt Nitro Server API
- JWT
- bcryptjs

### 1.3 数据库

- PostgreSQL
- `pg`
- `@neondatabase/serverless`

### 1.4 测试

- Vitest
- happy-dom

### 1.5 构建部署

- `nuxt build`
- Nitro preset: `vercel`
- 渲染模式：`ssr: false`
- 运行形态：SPA 客户端渲染 + Nitro API

## 2. 架构目标

项目采用 Nuxt 3 单体仓库结构。前端页面、游戏逻辑、状态管理、Server API 和数据库访问都放在同一个 Nuxt 项目中。

目标：

- 前端游戏体验保持流畅
- 账号、存档、装备、关卡进度通过后端 API 持久化
- 核心数值公式前后端共享或保持一致
- 先满足 MVP，后续方便扩展排行榜、活动、副本和赛季

## 3. 渲染模式

项目配置为：

```ts
export default defineNuxtConfig({
  ssr: false,
  nitro: {
    preset: 'vercel'
  }
})
```

含义：

- 页面在浏览器端渲染
- 游戏 Canvas 或 DOM 游戏界面完全运行在客户端
- Nitro Server API 仍然可用，用于鉴权、存档、数据库读写
- 部署目标为 Vercel

## 4. 推荐目录结构

```txt
.
├── app.vue
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── assets/
│   └── styles/
├── components/
│   ├── game/
│   └── ui/
├── composables/
│   ├── useGameLoop.ts
│   ├── useKeyboard.ts
│   └── useAuth.ts
├── layouts/
├── pages/
│   ├── index.vue
│   ├── login.vue
│   ├── register.vue
│   └── game.vue
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.ts
│   │   │   ├── register.post.ts
│   │   │   └── me.get.ts
│   │   ├── save/
│   │   │   ├── get.get.ts
│   │   │   └── update.post.ts
│   │   ├── equipment/
│   │   │   ├── list.get.ts
│   │   │   └── equip.post.ts
│   │   └── stage/
│   │       └── complete.post.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── queries/
│   └── utils/
│       ├── auth.ts
│       ├── password.ts
│       └── validation.ts
├── shared/
│   ├── game/
│   │   ├── formulas.ts
│   │   ├── weapons.ts
│   │   ├── attachments.ts
│   │   └── enemies.ts
│   └── types/
├── stores/
│   ├── auth.ts
│   ├── game.ts
│   ├── player.ts
│   └── inventory.ts
└── tests/
    ├── unit/
    └── setup.ts
```

## 5. 前端模块设计

### 5.1 页面

| 页面 | 作用 |
| --- | --- |
| `/` | 入口页或主菜单 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/game` | 游戏主界面 |

### 5.2 游戏渲染

MVP 推荐使用 Canvas 2D。

原因：

- 敌人、子弹、掉落物数量较多时性能更稳定
- 游戏对象坐标、碰撞、摄像机更容易控制
- 后续可以扩展特效、弹幕、屏幕震动

### 5.3 游戏循环

游戏循环由 `requestAnimationFrame` 驱动。

核心步骤：

```ts
function tick(now: number) {
  const delta = Math.min((now - lastTime) / 1000, 0.05)

  updateInput(delta)
  updatePlayer(delta)
  updateEnemies(delta)
  updateBullets(delta)
  updateCollisions(delta)
  updateDrops(delta)
  render()

  lastTime = now
  requestAnimationFrame(tick)
}
```

### 5.4 状态拆分

Pinia store 建议拆分：

| Store | 职责 |
| --- | --- |
| `auth` | 登录状态、Token、当前用户 |
| `player` | 玩家等级、属性、关卡进度 |
| `inventory` | 武器、配件、材料 |
| `game` | 当前战斗状态、局内数据 |

高频战斗对象不建议全部放进 Pinia。

建议：

- 玩家长期属性放 Pinia
- 当前战斗中的敌人、子弹、特效放普通 TypeScript 类或响应式浅引用
- 每帧大量变化的数据避免深层响应式

## 6. 后端 API 设计

### 6.1 鉴权接口

#### 注册

`POST /api/auth/register`

请求：

```json
{
  "email": "player@example.com",
  "password": "123456",
  "nickname": "Player"
}
```

响应：

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "player@example.com",
    "nickname": "Player"
  }
}
```

#### 登录

`POST /api/auth/login`

请求：

```json
{
  "email": "player@example.com",
  "password": "123456"
}
```

响应：

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "player@example.com",
    "nickname": "Player"
  }
}
```

#### 当前用户

`GET /api/auth/me`

Header：

```txt
Authorization: Bearer jwt_token
```

### 6.2 存档接口

#### 获取存档

`GET /api/save/get`

返回：

```json
{
  "stage": 1,
  "gold": 0,
  "playerLevel": 1,
  "playerExp": 0,
  "equippedWeaponId": "weapon_id",
  "equippedAttachmentIds": []
}
```

#### 更新存档

`POST /api/save/update`

用于保存玩家当前进度、金币、经验、背包变化。

### 6.3 关卡完成接口

`POST /api/stage/complete`

请求：

```json
{
  "stage": 10,
  "durationMs": 132000,
  "kills": 88,
  "bossKilled": true
}
```

后端校验：

- 用户是否登录
- 提交关卡是否合理
- 是否允许推进到下一关
- 奖励是否由后端计算

奖励建议由后端计算，避免客户端直接提交金币数量。

## 7. 数据库设计

### 7.1 users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nickname text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 7.2 player_saves

```sql
create table player_saves (
  user_id uuid primary key references users(id) on delete cascade,
  stage integer not null default 1,
  gold bigint not null default 0,
  player_level integer not null default 1,
  player_exp bigint not null default 0,
  talent_points integer not null default 0,
  equipped_weapon_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 7.3 weapons

```sql
create table weapons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  weapon_key text not null,
  rarity text not null,
  level integer not null default 1,
  exp bigint not null default 0,
  affixes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

### 7.4 attachments

```sql
create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  attachment_key text not null,
  slot text not null,
  rarity text not null,
  level integer not null default 1,
  affixes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

### 7.5 equipped_attachments

```sql
create table equipped_attachments (
  user_id uuid not null references users(id) on delete cascade,
  weapon_id uuid not null references weapons(id) on delete cascade,
  attachment_id uuid not null references attachments(id) on delete cascade,
  slot text not null,
  primary key (user_id, weapon_id, slot)
);
```

### 7.6 stage_records

```sql
create table stage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stage integer not null,
  duration_ms integer not null,
  kills integer not null,
  boss_killed boolean not null default false,
  created_at timestamptz not null default now()
);
```

## 8. 数据库连接策略

项目依赖同时包含 `pg` 和 `@neondatabase/serverless`。

建议：

- 本地开发优先使用 `pg`
- Vercel + Neon 部署使用 `@neondatabase/serverless`
- 通过统一的 `server/db/client.ts` 屏蔽差异

环境变量：

```txt
DATABASE_URL=postgres://...
JWT_SECRET=...
```

连接封装示例方向：

```ts
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  // 根据运行环境选择 pg 或 neon client
}
```

## 9. 鉴权设计

### 9.1 密码

- 使用 `bcryptjs` 哈希密码
- 注册时保存 `password_hash`
- 登录时使用 `bcrypt.compare` 验证

### 9.2 JWT

Token 内容建议：

```ts
type JwtPayload = {
  userId: string
  email: string
}
```

Token 过期时间：

- MVP 可以设置为 7 天
- 后续加入 refresh token

### 9.3 服务端鉴权工具

建议提供：

```ts
getAuthUser(event)
requireAuth(event)
```

所有需要用户身份的 API 都调用 `requireAuth(event)`。

## 10. 游戏数值共享

关卡公式、武器配置、配件配置建议放在 `shared/game`。

示例：

```txt
shared/game/formulas.ts
shared/game/weapons.ts
shared/game/attachments.ts
shared/game/enemies.ts
```

好处：

- 前端可以用于展示预测数值
- 后端可以用于结算奖励和校验关卡
- 减少前后端公式不一致

## 11. 安全策略

### 11.1 客户端不可信

客户端可以负责战斗表现，但核心奖励必须由后端计算。

客户端提交：

- 关卡
- 击杀数
- 战斗时长
- 是否击败 Boss

后端计算：

- 金币奖励
- 经验奖励
- 掉落物
- 是否解锁下一关

### 11.2 基础反作弊

MVP 可做简单校验：

- 通关时间不能过短
- 击杀数不能超过理论上限太多
- 关卡不能跳跃过大
- 奖励不接受客户端直接传入

后续可加入：

- 战斗摘要校验
- 随机种子回放
- 服务端模拟关键结果

## 12. 测试策略

### 12.1 单元测试

使用 Vitest 测试：

- 难度公式
- 奖励公式
- 武器配置
- 配件效果计算
- JWT 工具函数
- 密码哈希验证

### 12.2 组件测试

使用 happy-dom 测试：

- 登录表单
- 背包列表
- 装备切换
- 关卡结算面板

### 12.3 推荐测试目录

```txt
tests/
├── unit/
│   ├── formulas.test.ts
│   ├── rewards.test.ts
│   └── auth.test.ts
└── setup.ts
```

## 13. 部署

### 13.1 构建命令

```bash
nuxt build
```

### 13.2 Vercel 配置

Nitro preset：

```ts
nitro: {
  preset: 'vercel'
}
```

### 13.3 环境变量

Vercel 需要配置：

```txt
DATABASE_URL
JWT_SECRET
```

## 14. MVP 技术里程碑

### 14.1 第一阶段：项目基础

- Nuxt 3 项目初始化
- TypeScript 配置
- Pinia 接入
- Vitest 配置
- 基础页面和布局

### 14.2 第二阶段：游戏原型

- Canvas 游戏区域
- 玩家移动
- 怪物追击
- 自动射击
- 子弹碰撞
- 关卡推进

### 14.3 第三阶段：账号和存档

- 注册
- 登录
- JWT 鉴权
- PostgreSQL 连接
- 存档读取和保存

### 14.4 第四阶段：装备和配件

- 武器表
- 配件表
- 装备切换
- 基础词条计算

### 14.5 第五阶段：测试和部署

- 数值公式测试
- API 测试
- 构建检查
- Vercel 部署

