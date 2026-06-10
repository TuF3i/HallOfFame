# Bot API 直写数据库 Spec

## Why
Bot API 目前仅支持将消息推入 Redis 缓冲区由 Consumer 异步分析。需要新增一个直写接口，跳过缓冲区直接将发言写入 MongoDB，用于已筛选过的优质发言即时入库。

## What Changes
- Bot API 新增 `POST /api/bot/import`，字段与 `/api/bot/upload` 相同，但不进 Redis 队列，直接写入 MongoDB
- BotHandler 增加 `*dao.Dao` 依赖
- 更新 `docs/api.md` 和 `api/openapi.yaml`

## Impact
- Affected specs: bot-api, bot-api-attachments
- Affected code: `internal/handler/bot/handler.go`, `internal/router/bot_router.go`, `cmd/server.go`, `docs/api.md`, `api/openapi.yaml`

## ADDED Requirements

### Requirement: Bot 直写导入接口
系统 SHALL 提供 `POST /api/bot/import` 接口，接受 multipart/form-data，直接将发言写入 MongoDB 并上传附件到 MinIO。

#### Scenario: 带附件直写
- **WHEN** QQ 机器人调用 import 接口附带图片附件
- **THEN** 发言直接写入 MongoDB（qid=UUID），附件存储到 MinIO
- **AND** 响应返回写入成功的 Quote DTO

#### Scenario: 纯文本直写
- **WHEN** QQ 机器人调用 import 接口不带附件
- **THEN** 发言直接写入 MongoDB，attachment_ids 为空数组

#### Scenario: 字段缺失
- **WHEN** 缺少必填字段 qqgroup / qqnumber / speaker / content
- **THEN** 返回 40000 错误
