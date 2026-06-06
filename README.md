# HallOfFame

名人堂 — 一个 QQ 群聊天记录管理与恶搞分析平台。从 QQ 群采集聊天消息，通过 AI 大语言模型分析"性压抑度"（恶搞指标），提供 Web 管理面板进行查看和管理。

## 功能

- **消息采集** — QQ Bot 通过独立端口 9090 非阻塞上传消息到 Redis 队列
- **AI 分析** — 后台 Consumer 每 10s 检查队列，满 300 条或每天 00:00 触发 LLM 分析，提取 0-15 条高性压抑值发言
- **多模型** — 支持 OpenAI 兼容接口（DeepSeek/Qwen/Ollama）及火山引擎 Ark
- **金句管理** — 发言列表、发言者聚合、精华标记、附件图片上传
- **用户系统** — JWT 认证 + 角色管理（user/admin/banned）

## 快速开始

### 依赖服务

PostgreSQL + Redis + MongoDB + MinIO + Etcd，详见 [docs/deploy.md](docs/deploy.md)。

### 初始化

```bash
# 1. 初始化 PostgreSQL 数据库和用户
psql -U postgres -f sql/init_db.sql

# 2. 写入配置到 Etcd
etcdctl put /halloffame/config "$(cat config/config.json)"

# 3. 初始化数据表
go run ./cmd/server init db

# 4. 初始化 MinIO 存储桶
go run ./cmd/server init minio
```

### 运行

```bash
$env:ETCD_ADDR="localhost"
$env:ETCD_PORT="2379"
go run ./cmd/server server
```

## 命令

| 命令 | 说明 |
|------|------|
| `halloffame server` | 启动 HTTP 服务（Web API :8080 + Bot API :9090）|
| `halloffame init db` | 初始化 PostgreSQL 表 |
| `halloffame init minio` | 初始化 MinIO 存储桶 |

## 端口

| 端口 | 用途 | 鉴权 |
|------|------|------|
| 8080 | Web API（用户/管理接口） | JWT + Admin |
| 9090 | Bot API（消息采集） | 无 |

## 技术栈

Go + CloudWeGo Hertz + Eino + PostgreSQL + MongoDB + Redis + MinIO + Etcd

## 文档

- [部署指南](docs/deploy.md) — 依赖服务、配置、初始化、启动
- [API 文档](docs/api.md) — 所有接口说明
- [OpenAPI 规范](api/openapi.yaml) — 可直接导入 APIfox

## 项目结构

```
cmd/server/     — 程序入口（cobra）
config/         — 配置结构体 + etcd 加载
inferstructure/ — 基础设施客户端（PG/Redis/Mongo/MinIO/Etcd）
internal/
  models/       — 数据模型
  dao/          — 数据访问层
  cache/        — Redis 缓存层
  storage/      — MinIO 文件存储
  handler/      — HTTP handler（auth/admin/quote/bot）
  middleware/   — JWT + Admin 鉴权
  router/       — 路由注册
  engine/       — Hertz Server 启动
  llm/          — Eino ChatModel 工厂
  consumer/     — 后台 AI 分析协程
pkg/            — JWT / Redis Key / 常量
sql/            — PostgreSQL 初始化脚本
docs/           — 项目文档
api/            — OpenAPI 规范
```
