# HallOfFame

> 名人堂 — QQ 群聊天记录管理与恶搞分析平台

![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker&logoColor=white)
![Hertz](https://img.shields.io/badge/CloudWeGo-Hertz-FE8A00?logo=apache&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)

从 QQ 群采集聊天消息，通过 AI 大语言模型分析"性压抑度"（恶搞指标），提供 Web 管理面板进行查看和管理。

---

## 📑 目录

- [✨ 功能](#-功能)
- [🏗️ 技术栈](#️-技术栈)
- [🚀 快速开始](#-快速开始)
- [⚡ 命令](#-命令)
- [🔌 端口](#-端口)
- [📂 项目结构](#-项目结构)
- [📖 文档](#-文档)

---

## ✨ 功能

- **消息采集** — QQ Bot 通过独立端口 9090 非阻塞上传消息到 Redis 队列
- **AI 分析** — 后台 Consumer 每 10s 检查队列，满 300 条或每天 00:00 触发 LLM 分析，提取 0-15 条高性压抑值发言
- **多模型** — 支持 OpenAI 兼容接口（DeepSeek/Qwen/Ollama）及火山引擎 Ark
- **金句管理** — 发言列表、发言者聚合、精华标记、附件图片上传
- **用户系统** — JWT 认证 + 角色管理（user/admin/banned）

---

## 🏗️ 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 语言 | Go 1.25 | 后端开发语言 |
| HTTP 框架 | CloudWeGo Hertz v0.10 | Web API + Bot API 双端口服务 |
| CLI 框架 | spf13/cobra | 命令行工具 |
| AI 框架 | CloudWeGo Eino v0.9 | LLM 调用抽象，支持多 provider |
| 数据库 | PostgreSQL (GORM) + MongoDB | 用户数据 + 金句存储 |
| 缓存/队列 | Redis | 缓存 + Bot 消息队列 |
| 对象存储 | MinIO | 附件图片存储 |
| 配置中心 | Etcd | 配置管理 |
| 前端 | React 19 + TypeScript + Vite | Web 管理面板 |

---

## 🚀 快速开始

### 📦 依赖服务

PostgreSQL + Redis + MongoDB + MinIO + Etcd，详见 [docs/deploy.md](docs/deploy.md)。

### 🔧 初始化

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

### ▶️ 运行

```bash
$env:ETCD_ADDR="localhost"
$env:ETCD_PORT="2379"
go run ./cmd/server server
```

---

## ⚡ 命令

| 命令 | 说明 |
|------|------|
| `halloffame server` | 启动 HTTP 服务（Web API :8080 + Bot API :9090）|
| `halloffame init db` | 初始化 PostgreSQL 表 |
| `halloffame init minio` | 初始化 MinIO 存储桶 |

---

## 🔌 端口

| 端口 | 用途 | 鉴权 |
|------|------|------|
| 8080 | Web API（用户/管理接口） | JWT + Admin |
| 9090 | Bot API（消息采集） | 无 |

---

## 📂 项目结构

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

---

## 📖 文档

- [部署指南](docs/deploy.md) — 依赖服务、配置、初始化、启动
- [API 文档](docs/api.md) — 所有接口说明
- [OpenAPI 规范](api/openapi.yaml) — 可直接导入 APIfox

---

## 📄 License

[MIT](LICENSE) © [TuF3i](https://github.com/TuF3i)
