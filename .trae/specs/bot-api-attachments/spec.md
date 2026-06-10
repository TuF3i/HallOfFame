# Bot API 上传附件 Spec

## Why
Bot API 目前仅支持 JSON 文本消息上传，无法附带图片附件。需要扩展为支持 multipart/form-data，允许 QQ 机器人上传消息时附带可选图片附件，存储到 MinIO。

## What Changes
- Bot API `/api/bot/upload` 从 JSON-only 改为 `multipart/form-data`
- 原有 JSON 字段改为 form 字段（字符串）
- 新增可选 `files` 字段，支持多张图片附件上传
- 附件上传到 MinIO，attachment ID 存入 Redis 消息
- 更新 `docs/api.md` 和 `api/openapi.yaml`

## Impact
- Affected specs: bot-api
- Affected code: `internal/handler/bot/handler.go`, `cmd/server.go`, `internal/router/bot_router.go`, `docs/api.md`, `api/openapi.yaml`

## MODIFIED Requirements

### Requirement: Bot 上传接口支持附件
Bot API `/api/bot/upload` SHALL 接受 `multipart/form-data` 格式，支持可选图片附件上传。

#### Scenario: 带附件上传
- **WHEN** QQ 机器人在上传消息的同时附带图片文件
- **THEN** 图片文件存储到 MinIO（路径：`attachments/{qid}/{attId}`，其中 qid 为 UUID）
- **AND** Redis 消息中记录 attachment IDs

#### Scenario: 纯文本上传（无附件）
- **WHEN** QQ 机器人上传纯文本消息（无 files 字段）
- **THEN** 消息正常推入 Redis 队列，attachment_ids 为空数组

#### Scenario: 多张附件
- **WHEN** 上传时附带多张图片
- **THEN** 所有图片均上传到 MinIO，所有 attachment ID 记录在消息中

## MODIFIED API Documentation
`docs/api.md` 和 `api/openapi.yaml` 需更新为 multipart/form-data 格式，新增 files 字段说明。
