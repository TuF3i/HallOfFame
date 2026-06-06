# 金句管理 API Spec

## Why
为 HallOfFame 提供发言者管理、发言查询、精华标记、附件图片等核心功能，支撑前端 Archive 页面和管理面板的操作。

## What Changes

- **Model**: `internal/models/quotes.go` — 添加 `IsFeatured` 字段，修复 `UserData` 的 bson tag 拼写
- **DAO**: `internal/dao/handler.go` — 新增分页查询、条件过滤、批量删除等 Quote DAO 方法
- **DTO**: `internal/dto/quote.go` — 新增请求/响应结构体和转换函数
- **Handler**: `internal/handler/quote/` — 新增 QuoteHandler，处理所有发言者/发言相关接口
- **Router**: `internal/router/router.go` — 注册 Quote 路由分两组（公开/需认证 + admin）
- **Engine**: `internal/engine/client.go` — Engine.Start 增加 QuoteHandler 参数；`internal/engine/root.go` — EngineReliance 增加 Storage 依赖
- **Storage**: `internal/storage` — 现有 `GetFile`/`UploadFile`，新建发言需上传附件

## Impact
- Affected specs: 用户端浏览金句、管理员管理金句
- Affected code: 新增 `internal/handler/quote/`、`internal/dto/quote.go`；修改 `internal/models/quotes.go`、`internal/dao/handler.go`、`internal/router/router.go`、`internal/engine/`、`cmd/server/main.go`

## ADDED Requirements

### 统一响应格式
所有接口沿用 `Response[any]` 结构，HTTP 状态码始终 200，业务状态码在 code 字段。

### 分页规约
分页参数统一为 `?page=1&page_size=20`，page 从 1 开始。响应格式：
```json
{
  "code": 10200,
  "msg": "Operation Success",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### Requirement: 获取发言者列表
`GET /api/quotes/speakers` (需 JWT 认证，user/admin)

#### Scenario: 成功返回
- **WHEN** 请求参数 `?page=1&page_size=20`
- **THEN** 从 quotes 表中聚合去重，返回分页后的发言者列表（包含 QQNumber、Speaker（昵称）、Avatar、发言数量）

### Requirement: 获取某个发言者的发言
`GET /api/quotes/speakers/:qqNumber/quotes` (需 JWT 认证，user/admin)

#### Scenario: 成功返回
- **WHEN** 请求参数 `?page=1&page_size=20`
- **THEN** 查询该 QQNumber 的所有发言，按时间倒序，返回分页发言列表

### Requirement: 将某条发言设为精华
`PUT /api/admin/quotes/:qid/featured` (需 JWT + Admin 权限)

#### Scenario: 设精华成功
- **WHEN** admin 请求 body `{ "featured": true }`
- **THEN** 更新该发言的 `IsFeatured` 字段，返回更新后的发言

### Requirement: 删除某个发言
`DELETE /api/admin/quotes/:qid` (需 JWT + Admin 权限)

#### Scenario: 删除成功
- **WHEN** admin 请求删除
- **THEN** 从 MongoDB 删除该 qid 的发言记录，同时删除 MinIO 中关联的附件图片

### Requirement: 删除某个发言者以及其所有发言
`DELETE /api/admin/speakers/:qqNumber` (需 JWT + Admin 权限)

#### Scenario: 删除成功
- **WHEN** admin 请求删除
- **THEN** 从 MongoDB 删除该 QQNumber 的全部发言记录，同时删除 MinIO 中关联的所有附件图片

### Requirement: 获取所有精华发言
`GET /api/quotes/featured` (需 JWT 认证，user/admin)

#### Scenario: 成功返回
- **WHEN** 请求参数 `?page=1&page_size=20`
- **THEN** 查询 `IsFeatured = true` 的发言，按更新时间倒序，分页返回

### Requirement: 获取所有发言
`GET /api/admin/quotes` (需 JWT + Admin 权限)

#### Scenario: 成功返回
- **WHEN** 请求参数 `?page=1&page_size=20`
- **THEN** 查询所有发言，按时间倒序，分页返回

### Requirement: 新建发言
`POST /api/admin/quotes` (需 JWT + Admin 权限)

数据模型 `Quotes` 字段：
- `qid` — 唯一 ID（服务端生成 UUID）
- `content` — 发言内容
- `suppression` — 压抑值 (float64)
- `userdata` — 发言者数据 `{ qqnumber, speaker, avatar }`
- `groupdata` — 群数据 `{ groupnumber, groupname, avatar }`
- `attachmentid` — 附件 ID 列表 `[]string`

#### Scenario: 成功创建
- **WHEN** admin 提交 multipart/form-data，包含：
  - `content` (string, 必需)
  - `suppression` (float64, 可选, 默认 0)
  - `userdata` (JSON string, 必需): `{"qqnumber":"...","speaker":"...","avatar":"..."}`
  - `groupdata` (JSON string, 可选): `{"groupnumber":"...","groupname":"...","avatar":"..."}`
  - `files` (file[], 可选): 附件图片
- **THEN** 生成 qid (UUID)，将图片上传到 MinIO（key 格式 `attachments/<qid>/<uuid>.jpg`），记录附件 ID，插入 MongoDB，返回新创建的发言

### Requirement: 获取附件图片
`GET /api/quotes/attachments/:attachmentId` (需 JWT 认证，user/admin)

#### Scenario: 成功返回
- **WHEN** 请求附件 ID
- **THEN** 从 MinIO 读取并返回图片（Content-Type: image/jpeg）

## MODIFIED Requirements

### Requirement: 更新 Quotes Model
需要给 `internal/models/quotes.go` 的 `Quotes` 结构体添加 `IsFeatured bool` 字段，并修复 `UserData` 的 bson tag 拼写（`baon` -> `bson`）。

## REMOVED Requirements
无
