## RedisKeygen & Cache
- [x] `GetBotMessageQueueKey()` 返回 `"bot:message_queue"`
- [x] `PushMessage(ctx, msg)` 调用 `LPUSH` 到 bot queue

## Bot Handler
- [x] `BotHandler` 结构体及构造函数（依赖 Cache）
- [x] `Upload` 方法 — POST /api/bot/upload
- [x] 解析请求 JSON，补充 timestamp
- [x] 序列化后 LPUSH 到 Redis List
- [x] 成功返回 200（code:10200），解析失败返回 200（code:40000）

## Bot Router
- [x] `RegisterBotRoutes` 注册 `POST /api/bot/upload`

## Engine
- [x] Start 中启动第二个 Hertz Server 监听 BotApiListenPort
- [x] Bot Server 使用 goroutine 启动，共享生命周期

## main.go
- [x] 创建 BotHandler 并传递

## 编译验证
- [x] `go build ./...` 编译通过
