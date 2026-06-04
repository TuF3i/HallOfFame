# HallOfFame 名人堂 — 部署与使用文档

## 目录

1. [项目概述](#1-项目概述)
2. [快速开始（Docker Compose）](#2-快速开始docker-compose)
3. [手动部署](#3-手动部署)
4. [配置说明](#4-配置说明)
5. [API 概览](#5-api-概览)
6. [退化策略](#6-退化策略)
7. [GitHub OAuth 配置](#7-github-oauth-配置)
8. [QQ Bot 集成](#8-qq-bot-集成)
9. [常见问题](#9-常见问题)

---

## 1. 项目概述

HallOfFame（名人堂）是一个用于展示 QQ 群精彩言论的 Web 应用。

### 技术栈

| 组件 | 技术 |
|------|------|
| HTTP 框架 | Hertz (Go) |
| 言论存储 | MongoDB |
| 用户/日志存储 | PostgreSQL 或 SQLite |
| 缓存 | Redis 或 内存 |
| 对象存储 | MinIO 或 本地文件系统 |
| 前端 | React + TypeScript |
| 部署 | Docker Compose |

### 架构

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ 浏览器   │───▶│ 主 API 服务  │───▶│ 用户服务      │───▶│ PSQL/SQLite│
│(:5173)  │    │(:8888)       │    │              │    └──────────┘
└─────────┘    ├──────────────┤    ├──────────────┤    ┌──────────┐
               │ JWT 中间件    │    │ 言论服务      │───▶│ MongoDB  │
               └──────────────┘    │              │    └──────────┘
                                   ├──────────────┤    ┌──────────┐
┌─────────┐    ┌──────────────┐    │ 管理后台      │───▶│ PSQL     │
│ QQ Bot  │───▶│ Bot API 服务  │    └──────────────┘    └──────────┘
│(:8889)  │    │(无鉴权)       │
└─────────┘    └──────────────┘
```

---

## 2. 快速开始（Docker Compose）

### 前提条件

- Docker 和 Docker Compose
- GitHub OAuth App (可选，但推荐)

### 步骤

```bash
# 1. 进入部署目录
cd deployments/docker-compose

# 2. （可选）配置 GitHub OAuth
# 创建 .env 文件
echo "GITHUB_CLIENT_ID=your_client_id" >> .env
echo "GITHUB_CLIENT_SECRET=your_client_secret" >> .env
echo "JWT_SECRET=your-secret-key-change-me" >> .env

# 3. 一键启动
docker compose up -d

# 4. 检查状态
docker compose ps

# 5. 访问
# 前端: http://localhost:5173
# API:  http://localhost:8888
# Bot:  http://localhost:8889
```

### 启动的服务

| 服务 | 端口 | 说明 |
|------|------|------|
| halloffame | 8888, 8889 | 后端 API + Bot API |
| mongo | 27017 | 言论数据库 |
| postgres | 5432 | 用户数据 |
| redis | 6379 | Token 缓存 |
| minio | 9000, 9001 | 图片存储 |

### 停止

```bash
docker compose down
# 如需同时删除数据卷:
docker compose down -v
```

---

## 3. 手动部署

### 3.1 前提条件

- Go 1.25+
- Node.js 20+
- MongoDB 7+
- （可选）PostgreSQL 16+
- （可选）Redis 7+
- （可选）MinIO

### 3.2 本地调试（Minimal 模式）

仅需要 MongoDB，其余组件使用退化策略。

```powershell
# 使用调试脚本（推荐）
.\test\start-debug.ps1

# 或者手动操作:
# 1. 确保 MongoDB 运行在 localhost:27017
# 2. 启动后端
$env:DB_DRIVER="sqlite"
$env:STORAGE_DRIVER="local"
$env:LOCAL_DATA_DIR=".\data"
go run ./cmd/halloffame/ -a

# 3. 另一个终端: 启动前端
cd web
npm install
npm run dev
```

### 3.3 本地调试（Full 模式）

```powershell
.\test\start-debug.ps1 -Mode full
```

### 3.4 生产构建

```bash
# 编译后端
CGO_ENABLED=0 go build -o halloffame ./cmd/halloffame/

# 构建前端
cd web
npm ci
npm run build

# 运行
./halloffame server   # 仅主 API
./halloffame bot      # 仅 Bot API
./halloffame -a       # 同时运行两者
```

---

## 4. 配置说明

所有配置通过**环境变量**注入，无配置文件耦合。

### 核心配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | `8888` | 主 API 端口 |
| `BOT_PORT` | `8889` | Bot API 端口 |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB 连接地址 |
| `MONGO_DB` | `halloffame` | MongoDB 数据库名 |
| `DB_DRIVER` | `sqlite` | 关系型数据库驱动 (`postgres` / `sqlite`) |
| `JWT_SECRET` | `default-secret...` | JWT 签名密钥 (生产环境请修改) |

### PostgreSQL 配置（DB_DRIVER=postgres 时）

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `POSTGRES_HOST` | `localhost` | 主机 |
| `POSTGRES_PORT` | `5432` | 端口 |
| `POSTGRES_USER` | `postgres` | 用户名 |
| `POSTGRES_PASSWORD` | `postgres` | 密码 |
| `POSTGRES_DB` | `halloffame` | 数据库名 |
| `POSTGRES_SSLMODE` | `disable` | SSL 模式 |

### PostgreSQL 初始化

首次使用 PostgreSQL 时需要手动创建数据库和用户（如果已有则跳过）：

```bash
# 通过 Docker 启动 PostgreSQL（如果没有现成的）
docker run -d \
  --name halloffame-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=halloffame \
  -p 5432:5432 \
  postgres:16-alpine

# 或连接已有 PostgreSQL 实例手动创建数据库
psql -h localhost -U postgres -c "CREATE DATABASE halloffame;"
psql -h localhost -U postgres -c "CREATE USER halloffame WITH PASSWORD 'halloffame';"
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE halloffame TO halloffame;"
```

启动后端后，GORM 的 `AutoMigrate` 会自动建表，无需手动执行 SQL。

### SQLite 配置（DB_DRIVER=sqlite 时）

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `SQLITE_PATH` | `/app/data/halloffame.db` | 数据库文件路径 |

### Redis 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `REDIS_ADDR` | `""` | 留空则使用内存存储 |
| `REDIS_PASSWORD` | `""` | 密码 |
| `REDIS_DB` | `0` | 数据库编号 |

### MinIO / 本地存储

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `STORAGE_DRIVER` | `local` | 存储驱动 (`minio` / `local`) |
| `MINIO_ENDPOINT` | `""` | MinIO 地址 |
| `MINIO_ACCESS_KEY` | `""` | 访问密钥 |
| `MINIO_SECRET_KEY` | `""` | 秘密密钥 |
| `MINIO_BUCKET` | `halloffame` | 存储桶 |
| `LOCAL_DATA_DIR` | `/app/data` | 本地存储目录 |

### GitHub OAuth

| 环境变量 | 说明 |
|----------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `GITHUB_REDIRECT_URL` | 回调地址 (默认: `http://localhost:8888/api/v1/auth/github/callback`) |

### Bot API

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `BOT_API_TOKEN` | `""` | Bot 接口鉴权 Token（空则不校验） |

---

## 5. API 概览

完整接口定义请参考 [api/openapi.yaml](../api/openapi.yaml)。

### 认证

```
GET  /api/v1/auth/github/login     → 跳转 GitHub OAuth
GET  /api/v1/auth/github/callback  → 回调，返回 JWT
POST /api/v1/auth/refresh          → 刷新 Token
```

### 言论 (需登录)

```
GET    /api/v1/quotes              → 列表 (支持过滤)
GET    /api/v1/quotes/:id          → 详情
POST   /api/v1/quotes              → 添加
PUT    /api/v1/quotes/:id          → 编辑
DELETE /api/v1/quotes/:id          → 删除
PUT    /api/v1/quotes/:id/feature  → 设置精华
POST   /api/v1/quotes/:id/images   → 上传图片
GET    /api/v1/groups              → QQ 群列表
```

### 管理员 (需 admin 角色)

```
GET    /api/v1/admin/users              → 用户列表
PUT    /api/v1/admin/users/:id/role     → 修改角色
GET    /api/v1/admin/whitelist          → 白名单
POST   /api/v1/admin/whitelist          → 添加白名单
DELETE /api/v1/admin/whitelist/:id      → 移除白名单
GET    /api/v1/admin/login-logs         → 登录日志
```

### Bot 接口 (无鉴权, 端口 8889)

```
POST   /api/v1/bot/quotes             → 添加言论
POST   /api/v1/bot/quotes/:id/images  → 上传图片
GET    /api/v1/bot/groups             → 群列表
```

### 用户

```
GET    /api/v1/user/profile           → 个人信息
```

### 认证方式

所有需要鉴权的接口使用 `Authorization: Bearer <token>` 头部。

---

## 6. 退化策略

系统设计了对不稳定基础设施的**自动降级能力**：

| 组件 | 不可用时 | 说明 |
|------|---------|------|
| **MongoDB** | ❌ 启动失败 | **必须配置**，系统核心数据库 |
| **PostgreSQL** | ✅ 自动使用 SQLite | 用户/日志数据无损降级 |
| **Redis** | ✅ 自动使用内存 | `sync.Map` 存储，重启后 Token 失效 |
| **MinIO** | ✅ 自动使用本地目录 | 图片存入 `LOCAL_DATA_DIR/uploads` |

当 `DB_DRIVER=sqlite` 或 PostgreSQL 连接失败时，系统使用 SQLite。
当 `REDIS_ADDR=""` 或 Redis 连接失败时，系统使用内存存储。
当 `STORAGE_DRIVER=local` 或 MinIO 连接失败时，系统使用本地文件存储。

---

## 7. GitHub OAuth 配置

### 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **New OAuth App**
3. 填写：
   - **Application name**: `HallOfFame`
   - **Homepage URL**: `http://localhost:8888`
   - **Authorization callback URL**: `http://localhost:8888/api/v1/auth/github/callback`
4. 创建后复制 **Client ID** 和 **Client Secret**
5. 设置环境变量启动即可

### 角色说明

| 角色 | 权限 |
|------|------|
| `owner` | 最高权限，系统初始化时手动设置 |
| `admin` | 管理后台、管理用户和言论 |
| `user` | 默认角色，可添加/编辑自己的言论 |
| `banned` | 被禁止登录 |

> **首个用户**: 系统启动后，第一个通过 GitHub 登录的用户会被创建为 `user` 角色。需要手动在数据库中将其设置为 `owner` 才能使用管理后台。

---

## 8. QQ Bot 集成

系统在独立端口 (`BOT_PORT`, 默认 8889) 暴露无鉴权 API，专供 QQ Bot 调用。

### 请求示例

```bash
# 添加言论
curl -X POST http://localhost:8889/api/v1/bot/quotes \
  -H "Content-Type: application/json" \
  -d '{"qq_group":"技术交流群","speaker":"张三","content":"这段代码写得真不错！"}'

# 上传图片
curl -X POST http://localhost:8889/api/v1/bot/quotes/<quote_id>/images \
  -F "image=@screenshot.png"

# 获取群列表
curl http://localhost:8889/api/v1/bot/groups
```

### 安全建议

- 设置 `BOT_API_TOKEN` 环境变量，在 Bot 请求时通过 Header 或 Query 传递校验
- 或在网络安全层面限制 Bot API 端口仅允许内网访问

---

## 9. 常见问题

### Q: 启动后访问 API 返回 404？

确认启动了正确的服务。主 API 在端口 `8888`，Bot API 在端口 `8889`。

### Q: MongoDB 连接失败？

确保 MongoDB 已运行且连接地址正确。Minimal 模式下只需要 MongoDB。

### Q: 登录后提示"not in whitelist"？

白名单开启后，只有被添加到白名单的 GitHub 用户可以登录。通过管理员后台添加白名单，或暂时清空白名单表。

### Q: 如何创建管理员？

登录后，在数据库中手动修改 `users` 表的 role 字段为 `owner`：

```sql
-- PostgreSQL
UPDATE users SET role = 'owner' WHERE github_id = 'your_github_node_id';

-- SQLite
UPDATE users SET role = 'owner' WHERE github_id = 'your_github_node_id';
```

或者通过 MongoDB 的调试方式直接调用管理 API（需要调整代码中的权限校验）。

### Q: 如何重置所有数据？

```bash
# Docker 部署时
docker compose down -v
docker compose up -d

# 手动部署时
rm -rf data/
```

### Q: 前端页面空白？

1. 检查浏览器控制台是否有网络错误
2. 确保后端 API 正在运行
3. 如果使用 Vite 开发服务器，确保已配置 proxy:

```typescript
// web/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
})
```

### Q: 图片上传后无法显示？

- 本地存储模式: 确认 `LOCAL_DATA_DIR` 目录存在且后端有写入权限
- MinIO 模式: 确认 MinIO 的 bucket 已创建且后端可访问
- Docker 部署时: 确认 volume 挂载正确
