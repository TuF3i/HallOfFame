# QQ Bot 消息采集 API Spec

## Why
为 QQ 机器人插件提供一个高并发的消息上传通道，将 QQ 群发言通过 Redis List 缓冲后异步落库，不与主 Web API 共享端口和鉴权逻辑。

## What Changes

- **新端口**: HertzConf 中的 `BotApiListenPort`（9090），启动一个独立的 Hertz 无鉴权 HTTP 服务
- **Redis List**: 用 `LPUSH` 将消息推入 `bot:message_queue` 列表，后续消费者 `BRPOP` 批量落 MongoDB
- **新 Handler**: `internal/handler/bot/` — 单个非阻塞上传接口
- **新路由**: `internal/router/bot_router.go` — Bot 路由注册
- **扩展 Cache**: `internal/cache/handler.go` — 新增 `PushMessage` 操作 Redis List
- **扩展 KeyGen**: `pkg/redisKeygen/keygen.go` — 新增 `GetBotMessageQueueKey`
- **扩展 Engine**: `internal/engine/client.go` — 在 Start 中同时启动 Bot Server

## Impact
- Affected specs: QQ Bot 消息采集
- Affected code: 新增 `internal/handler/bot/`、`internal/router/bot_router.go`；修改 `internal/cache/handler.go`、`pkg/redisKeygen/keygen.go`、`internal/engine/client.go`

## ADDED Requirements

### 架构设计
```
QQ Bot Plugin → POST /api/bot/upload → Redis LPUSH(bot:message_queue, JSON)
                                              ↓ (异步 consumer)
                                          MongoDB quotes collection
```

- Bot 端口独立，不共享 JWT / Admin 鉴权
- 消息先入 Redis 队列再异步落库，上传接口毫秒级返回
- 高并发下可丢消息（不保证一致性）

### Requirement: 非阻塞上传消息
`POST /api/bot/upload` (无鉴权)

#### 请求格式 (JSON body)
```json
{
    "qqgroup": "群号",
    "qqnumber": "发言者QQ号",
    "speaker": "发言者昵称",
    "content": "消息内容",
    "avatar": "头像URL(可选)"
}
```

#### Scenario: 上传成功
- **WHEN** Bot 插件发送 JSON 请求
- **THEN** 将消息 JSON 序列化后 `LPUSH` 到 Redis List `bot:message_queue`，立即返回 `{ "code": 10200, "msg": "ok", "data": null }`
- **THEN** HTTP 状态码 200

#### Scenario: 请求体解析失败
- **WHEN** 请求 JSON 格式错误
- **THEN** 返回 `{ "code": 40000, "msg": "invalid json body", "data": null }`

### Requirement: Redis List 消息队列

- Key: `bot:message_queue`
- 操作: 上传时 `LPUSH`，消费者 `BRPOP`（阻塞式右弹出）
- 消息格式 (JSON): `{ qqgroup: string, qqnumber: string, speaker: string, content: string, avatar: string, timestamp: int64 }`

### Requirement: 独立 Bot HTTP Server

- 监听地址: `cfg.HertzConf.ListenAddr:cfg.HertzConf.BotApiListenPort`（默认 `0.0.0.0:9090`）
- 与主 Web API 共享同一个配置和 Redis 连接
- 主进程退出时自动关闭
- 仅注册 Bot 路由，不注册其他路由和中间件

## MODIFIED Requirements
无

## REMOVED Requirements
无
