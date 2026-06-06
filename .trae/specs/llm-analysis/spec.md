# AI 性压抑分析功能 Spec

> **性压抑**（性压抑度）是本项目的恶搞核心概念——通过 LLM 分析 QQ 群聊天消息，
> 识别出"最性压抑"的发言，存入数据库作为一个娱乐性指标。

## Why
为 QQ Bot 采集的消息提供自动化 AI 分析能力，使用字节跳动 Eino 框架接入多种大模型，
在消息队列积压到 300 条或每天零点时触发分析，提取 0-15 条高性压抑值的发言写入数据库。

## What Changes

- **Config**: 新增 `LLMConf` 配置段（provider, apiKey, baseURL, model, batchSize, maxResults）
- **LLM 层**: `internal/llm/` — 基于 Eino 的 ChatModel 工厂，支持多 provider
- **Consumer**: `internal/consumer/` — 后台协程，定时检查 Redis 队列 + 零点触发
- **Cache 扩展**: `internal/cache/handler.go` — 新增 `PopAllMessages` / `QueueLen`
- **Engine**: 在 Start 中启动 Consumer
- **DAO**: 已有 `AddQuote` 方法可直接复用

## Impact
- Affected specs: 消息采集 → AI 分析 → 落库
- Affected code: 新增 `internal/llm/`、`internal/consumer/`；修改 `config/config.go`、`config/config.json`、`internal/cache/handler.go`、`internal/engine/client.go`

## ADDED Requirements

### 配置变更

新增 `LLMConf` 结构体和对应的 JSON 配置段：

```json
{
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

Provider 支持值：
- `openai` — OpenAI 及兼容接口（DeepSeek、Qwen、Ollama 等，通过 baseURL 切换）
- `ark` — 火山引擎 Ark

### Requirement: Eino ChatModel 工厂

`internal/llm/llm.go` — 根据配置创建 Eino ChatModel：

- `NewChatModel(cfg *config.LLMConf) ( ChatModel, error )`
- 使用 `github.com/cloudwego/eino` 的 ChatModel 接口
- `openai` provider: 使用 OpenAI 兼容适配器，通过 baseURL 接入不同模型
- `ark` provider: 使用 Ark 适配器
- 返回统一 `ChatModel` 接口，上层调用 `Generate` 方法

### Requirement: 消息队列扩展

`internal/cache/handler.go` 新增：

- `QueueLen(ctx) (int64, error)` — `LLEN bot:message_queue`
- `PopAllMessages(ctx) ([]string, error)` — `LRANGE bot:message_queue 0 -1` + `DEL bot:message_queue`（原子性通过 MULTI/EXEC 或 LRANGE+DEL 分步实现）
- `ResetQueue(ctx) error` — `DEL bot:message_queue`

### Requirement: Consumer 后台协程

`internal/consumer/consumer.go` — 后台轮询消费：

- 启动时传入 `*cache.Cache`, `*dao.Dao`, `ChatModel`, `*config.LLMConf`
- 每 10 秒检查一次 `QueueLen`
- 触发条件（满足其一）：
  - **积压触发**: `QueueLen >= batchSize(300)`
  - **定时触发**: 检测到刚过午夜 00:00（每分钟检查一次当前小时是否为 0 且上次非 0）
- 触发后执行：
  1. `PopAllMessages` 获取全部消息并清空队列
  2. 将消息格式化拼接为 LLM prompt
  3. 调用 `ChatModel.Generate` 发送给 LLM
  4. 解析 JSON 返回结果
  5. 生成 `Quotes` 模型，调用 `dao.AddQuote` 写入 MongoDB
- 日志记录每次触发的消息数和写入数

### Requirement: LLM Prompt 设计

System Prompt：
```
你是一个恶搞分析机器人。我会给你一批QQ群聊天消息，请你分析每条消息的"性压抑度"（0-100）。
性压抑度是一个幽默指标，衡量发言中体现的性压抑程度。
请从这些消息中选出性压抑度最高的0-15条。

你仅返回JSON数组，不要返回其他内容，格式：
[
  {"index": 0, "score": 85, "reason": "简短理由"},
  {"index": 5, "score": 72, "reason": "简短理由"}
]
index是消息的序号（从0开始），score是0-100的整数。
如果没有任何消息有性压抑倾向，返回空数组[]。
```

User Message: `[序号] 发言者: 消息内容` 的拼接文本。

### Requirement: 入库逻辑

LLM 返回 JSON 数组后：
- 遍历每个结果，根据 index 找到对应的原始消息
- 生成 `uuid` 作为 `qid`
- 填充 `Content`、`Suppression(score)`、`UserData`（从原始消息 JSON 的 `qqnumber/speaker/avatar` 字段提取）
- 调用 `dao.AddQuote` 写入 MongoDB
- 记录日志：`"consumer: processed N messages, saved M quotes"`

## MODIFIED Requirements

### Model 更新
现有 `Quotes` 模型的 `Suppression` 字段已存在（float64），无需修改。

### 依赖变更
- 新增 `github.com/cloudwego/eino` （Eino 核心 + 所需 adapter）
- 配置变更：config.go 新增 `LLMConf`，config.json 新增 `llmConf` 段

## REMOVED Requirements
无
