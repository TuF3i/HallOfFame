# 部署指南

## 依赖服务

HallOfFame 运行时需要以下外部服务：

| 服务 | 必需 | 默认地址 | 说明 |
|------|------|----------|------|
| Etcd | 是 | localhost:2379 | 配置中心，存放 `/halloffame/config` |
| PostgreSQL | 是 | localhost:5432 | 用户数据 |
| Redis | 是 | localhost:6379 | 缓存 + Bot 消息队列 |
| MongoDB | 是 | localhost:27017 | 金句（Quotes）存储 |
| MinIO | 是 | localhost:80 | 附件图片存储 |
| LLM API | 否 | — | AI 分析（未配则跳过 Consumer） |

## 配置管理

所有配置存储在 Etcd 的 `/halloffame/config` 键中。

### 配置格式（写入 Etcd）

```json
{
  "hertzConf": {
    "listenAddr": "0.0.0.0",
    "webApiListerPort": 8080,
    "botApiListenPort": 9090
  },
  "redisConf": {
    "addr": "localhost",
    "port": 6379,
    "password": ""
  },
  "mongoDBConf": {
    "addr": "localhost",
    "port": 27017,
    "database": "halloffame",
    "username": "mongodb",
    "password": "mongodb"
  },
  "postgreSQLConf": {
    "addr": "localhost",
    "port": 5432,
    "database": "halloffame",
    "username": "halloffame",
    "password": "halloffame"
  },
  "minioConf": {
    "addr": "localhost",
    "port": 80,
    "username": "admin",
    "password": "",
    "bucket": "halloffame"
  },
  "llmConf": {
    "provider": "openai",
    "apiKey": "sk-your-api-key",
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "batchSize": 300,
    "maxResults": 15
  }
}
```

写入 Etcd：
```bash
etcdctl put /halloffame/config '{"hertzConf":{...}}'
```

### 支持的多模型 Provider

| provider | 说明 | 要求 |
|----------|------|------|
| `openai` | OpenAI 及兼容接口 | 设置 baseURL（如 DeepSeek `https://api.deepseek.com/v1`、Qwen、Ollama 等）|
| `ark` | 火山引擎 Ark | 只需设置 apiKey + model，无需 baseURL |

未配置 LLM 或创建 ChatModel 失败时，Consumer 自动跳过，不影响主服务运行。

## 初始化步骤

### 1. 启动依赖服务

```bash
# PostgreSQL
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Redis
docker run -d --name redis -p 6379:6379 redis:7

# MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# MinIO
docker run -d --name minio -p 80:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"

# Etcd
docker run -d --name etcd -p 2379:2379 bitnami/etcd:3

# 写入配置到 Etcd
etcdctl put /halloffame/config "$(cat config/config.json)"
```

### 2. 初始化 PostgreSQL 数据库

用超级用户创建数据库和用户：

```bash
psql -U postgres -f sql/init_db.sql
```

### 3. 构建

```bash
go build -o halloffame ./cmd/server
```

### 4. 运行

```bash
# 设置 Etcd 地址（默认 localhost:2379）
$env:ETCD_ADDR="localhost"
$env:ETCD_PORT="2379"

# 启动服务
./halloffame server

# 或在开发环境直接
go run ./cmd/server server
```

### 5. 初始化数据表与存储桶

```bash
# 初始化 PostgreSQL 表
./halloffame init db

# 初始化 MinIO 存储桶
./halloffame init minio
```

## 端口说明

| 端口 | 用途 | 鉴权 |
|------|------|------|
| 8080 | Web API（用户/管理接口） | JWT + Admin |
| 9090 | Bot API（消息采集） | 无 |
