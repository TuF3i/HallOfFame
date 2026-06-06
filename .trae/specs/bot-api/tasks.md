# Tasks

- [ ] Task 1: 扩展 RedisKeygen 和 Cache 层
  - 1a: `pkg/redisKeygen/keygen.go` — 新增 `GetBotMessageQueueKey() string`
  - 1b: `internal/cache/handler.go` — 新增 `PushMessage(ctx, msg string) error`，调用 `LPUSH` 到 bot queue
  - 编译验证: `go build ./pkg/redisKeygen/ ./internal/cache/`

- [ ] Task 2: 创建 Bot Handler
  - `internal/handler/bot/handler.go` — `BotHandler` 结构体（依赖 `*cache.Cache`），含 `Upload` 方法
  - 从 request body 读取 JSON，反序列化，补充 `timestamp` 字段
  - 序列化为字符串，调用 `PushMessage` 推入 Redis List
  - 编译验证: `go build ./internal/handler/bot/`

- [ ] Task 3: 创建 Bot 路由
  - `internal/router/bot_router.go` — `RegisterBotRoutes(h, cacheClient, botHandler)`，注册 `POST /api/bot/upload`
  - 编译验证: `go build ./internal/router/`

- [ ] Task 4: 更新 Engine — 在 Start 中启动 Bot Server
  - `internal/engine/client.go` — Start 方法中新增 Bot Hertz Server 的创建和启动
  - 监听 `cfg.HertzConf.ListenAddr:cfg.HertzConf.BotApiListenPort`
  - 调用 `bot_router.RegisterBotRoutes`
  - 与主 Server 共享生命周期（goroutine 启动，等待 ctx.Done）
  - 编译验证: `go build ./internal/engine/`

- [ ] Task 5: 更新 main.go
  - 创建 `BotHandler` 并传递给 Engine
  - 编译验证: `go build ./...`

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 2]
- [Task 4] 依赖 [Task 3]
- [Task 5] 依赖 [Task 4]
