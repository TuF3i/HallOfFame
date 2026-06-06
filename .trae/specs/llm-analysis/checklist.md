## Config
- [x] config.go 新增 `LLMConf` 结构体（Provider, APIKey, BaseURL, Model, BatchSize, MaxResults）
- [x] config.json 新增 `llmConf` 配置段

## Cache
- [x] `QueueLen()` — LLEN bot:message_queue
- [x] `PopAllMessages()` — LRANGE + DEL 取出全部并清空
- [x] `ResetQueue()` — DEL

## LLM
- [x] `internal/llm/llm.go` — `NewChatModel(cfg)` 工厂函数
- [x] openai provider 走 OpenAI 兼容适配器
- [x] ark provider 走 Volcengine Ark 适配器
- [x] 返回统一的 `ChatModel` 接口

## Consumer
- [x] `internal/consumer/consumer.go` — `Start(ctx, cache, dao, chatModel, cfg)` 启动 goroutine
- [x] 每 10s 轮询队列长度
- [x] 队列 >= batchSize(300) 时触发
- [x] 每天 00:00 时触发
- [x] 调用 LLM Generate 分析消息
- [x] 解析 LLM 返回的 JSON
- [x] 将高性压抑值发言写入 MongoDB
- [x] 日志记录处理结果

## Engine
- [x] Start 中启动 Consumer goroutine

## 编译验证
- [x] `go build ./...` 编译通过
