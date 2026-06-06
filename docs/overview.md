# HallOfFame — 项目概述

## 项目定位

HallOfFame（名人堂）是一个 QQ 群聊天记录管理与恶搞分析平台。它从 QQ 群采集聊天消息，通过 AI 大语言模型分析"性压抑度"（恶搞指标），并提供 Web 管理面板进行查看和管理。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 语言 | Go 1.25 | 后端开发语言 |
| HTTP 框架 | CloudWeGo Hertz v0.10 | Web API + Bot API 双端口服务 |
| CLI 框架 | spf13/cobra | 命令行工具（server / init db / init minio） |
| AI 框架 | CloudWeGo Eino v0.9 | LLM 调用抽象，支持多 provider |
| PostgreSQL | GORM v1.31 + pgx v5 | 用户数据存储 |
| MongoDB | mongo-go-driver v1.17 | 金句（Quotes）存储 |
| Redis | go-redis v9 | 缓存 + Bot 消息队列 |
| MinIO | minio-go v7 | 附件图片存储 |
| Etcd | etcd/client v3 | 配置中心 |
| JWT | golang-jwt v5 | 用户认证 |

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    HallOfFame                            │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │ Web API      │   │ Bot API      │   │ Consumer     │ │
│  │ :8080        │   │ :9090        │   │ (goroutine)  │ │
│  │ JWT + Admin  │   │ 无鉴权       │   │ 10s轮询      │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                   │          │
│         ▼                  ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Eino ChatModel (LLM)                   │    │
│  │  OpenAI / DeepSeek / Qwen / Ollama / Ark         │    │
│  └──────────────────────────────────────────────────┘    │
│         │                  │                   │          │
│         ▼                  ▼                   ▼          │
│  ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐    │
│  │ PostgreSQL  │   │   MongoDB   │   │   Redis     │    │
│  │ (用户)      │   │  (金句)     │   │ (缓存/队列) │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐                                         │
│  │   MinIO     │                                         │
│  │ (附件图片)  │                                         │
│  └─────────────┘                                         │
│                                                          │
│  Config ← Etcd (/halloffame/config)                      │
└─────────────────────────────────────────────────────────┘
```

## 代码结构

```
cmd/
  server/main.go     — 程序入口（cobra）
  root.go            — 根命令 + 从 etcd 加载配置
  server.go          — HallOfFame server 命令
  init.go            — HallOfFame init db / init minio
  minio.go           — MinIO 初始化辅助

config/
  config.go          — 配置结构体定义
  etcd_loader.go     — 从 etcd 加载配置
  config.json        — 本地配置模板（etcd 中存放的格式）

inferstructure/
  postgres/          — PostgreSQL 客户端
  redis/             — Redis 客户端
  mongodb/           — MongoDB 客户端
  minio/             — MinIO 客户端
  etcd/              — Etcd 客户端

internal/
  models/            — 数据模型
  dto/               — 响应结构体 + 错误码
  dao/               — 数据访问层
  cache/             — 缓存层（Redis 操作）
  storage/           — 文件存储层（MinIO 操作）
  handler/
    auth/            — 注册/登录/刷新 JWT
    admin/           — 用户管理（改角色/删除）
    quote/           — 金句管理（CRUD + 精华）
    bot/             — QQ Bot 消息上传
  middleware/        — JWT 鉴权 + Admin 鉴权
  router/            — 路由注册
  engine/            — Hertz Server 启动 + Consumer 启动
  llm/               — Eino ChatModel 工厂
  consumer/          — 后台 AI 分析协程

pkg/
  jwt/               — JWT 生成与解析
  redisKeygen/       — Redis Key 生成
  consts/            — 常量

sql/
  init_db.sql        — PostgreSQL 数据库/用户初始化

docs/
  overview.md        — 本文
  deploy.md          — 部署指南
  api.md             — API 接口文档
```
