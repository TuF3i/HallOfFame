# Tasks
- [ ] Task 1: 更新 Config — 添加 LLMConf 配置
  - `config/config.go` — 新增 `LLMConf` 结构体（Provider, APIKey, BaseURL, Model, BatchSize, MaxResults）
  - `config/config.json` — 添加对应的 `llmConf` 配置段
  - 编译验证: `go build ./config/`

- [ ] Task 2: 扩展 Cache 层 — Redis 队列操作
  - `internal/cache/handler.go` — 新增 `QueueLen()`、`PopAllMessages()`、`ResetQueue()`
  - 编译验证: `go build ./internal/cache/`

- [ ] Task 3: 创建 LLM 层 — Eino ChatModel 工厂
  - `internal/llm/llm.go` — `NewChatModel(cfg)` 根据 provider 创建 Eino ChatModel
  - 安装 Eino: `go get github.com/cloudwego/eino`
  - 编译验证: `go build ./internal/llm/`

- [ ] Task 4: 创建 Consumer — 后台轮询协程
  - `internal/consumer/consumer.go` — `Start(ctx, cache, dao, llm, cfg)` 启动后台协程
  - 每 10s 检查队列长度，300 条或午夜触发
  - 调用 LLM 分析，解析结果，写入 MongoDB
  - 编译验证: `go build ./internal/consumer/`

- [ ] Task 5: 更新 Engine — 在 Start 中启动 Consumer
  - `internal/engine/client.go` — Start 增加 Consumer 启动
  - 编译验证: `go build ./internal/engine/`

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 无依赖，可并行
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 1], [Task 2], [Task 3]
- [Task 5] 依赖 [Task 4]
