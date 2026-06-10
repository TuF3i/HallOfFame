# Tasks

## Task 1: 后端 — Bot Handler 支持 multipart 附件上传
- [x] 修改 `internal/handler/bot/handler.go`
  - BotHandler 增加 `*storage.Storage` 依赖
  - NewBotHandler 签名改为 `NewBotHandler(c *cache.Cache, s *storage.Storage)`
  - Upload 方法改为处理 multipart/form-data
  - 使用 `ctx.MultipartForm()` 解析 form，参考 `quote/handler.go` 的 CreateQuote 实现
  - 从 form value 读取：qqgroup, qqnumber, speaker, content, avatar, groupname, groupavatar
  - 从 form file 读取：files（可选）
  - 生成 qid（UUID），上传 files 到 MinIO（路径 `attachments/{qid}/{attId}`）
  - BotUploadMsg 增加 `AttachmentIDs []string` 字段
  - 消息序列化后推入 Redis 队列
- [x] `go build ./internal/handler/bot/` 编译通过

## Task 2: 后端 — 更新依赖注入
- [x] 修改 `cmd/server.go`：`NewBotHandler(c)` → `NewBotHandler(c, s)`
- [x] `go build ./...` 编译通过

## Task 3: 文档 — 更新 API 文档
- [x] 更新 `docs/api.md` 中 Bot API 部分的请求格式说明（JSON → multipart/form-data，新增 files 字段）
- [x] 更新 `api/openapi.yaml` 中 `/api/bot/upload` 的 requestBody（改为 multipart/form-data，新增 files 字段）

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 可与其他任务并行
