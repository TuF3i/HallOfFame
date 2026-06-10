# Tasks

## Task 1: 后端 — BotHandler 新增 Import 方法
- [ ] 修改 `internal/handler/bot/handler.go`
  - BotHandler 增加 `*dao.Dao` 依赖
  - NewBotHandler 签名改为 `NewBotHandler(d *dao.Dao, c *cache.Cache, s *storage.Storage)`
  - 新增 `Import` 方法：表单解析逻辑复用 Upload，但不推入 Redis，改为构造 `models.Quotes` 调用 `dao.AddQuote` 直接写库
  - 字段映射：qqgroup→GroupNumber, qqnumber→QQNumber, speaker→Speaker, avatar→Avatar（userdata）, groupname→GroupName, groupavatar→Avatar（groupdata）, content→Content, suppression=0, is_featured=false
- [ ] `go build ./internal/handler/bot/` 编译通过

## Task 2: 后端 — 更新路由和依赖注入
- [ ] 修改 `internal/router/bot_router.go`：注册 `POST /api/bot/import`
- [ ] 修改 `cmd/server.go`：`NewBotHandler` 调用增加 `d` 参数
- [ ] `go build ./...` 编译通过

## Task 3: 文档 — 更新 API 文档
- [ ] 更新 `docs/api.md` Bot API 部分新增 `POST /api/bot/import` 接口说明
- [ ] 更新 `api/openapi.yaml` 新增接口定义

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 可与其他任务并行
