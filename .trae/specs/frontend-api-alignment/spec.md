# 前端对齐后端接口 Spec

## Why
前端代码在 API 路径、响应格式、数据结构定义、字段命名、业务逻辑等多个维度与后端 `api.md` 定义不一致，导致前后端无法正常对接。同时后端缺少登录记录功能，需新增该接口。

## What Changes
- 修正 API 请求路径，补充 `/api/` 前缀
- 修正响应反序列化逻辑，增加 `{ code, msg, data }` 封装解包
- 重建 `types.ts`，数据结构与后端字段完全对齐（含嵌套 `userdata`/`groupdata`）
- 修正 `mockData.ts`，mock 数据与新的类型定义一致
- 修正 `App.tsx` 中所有引用旧字段的地方
- 修正 `api.ts` 中 login/register/quote 接口的调用逻辑
- 移除后端不存在的接口（profile、groups），用现有接口替代或保留 mock 兜底
- 修正 `QuotePerson` 派生逻辑，适配新的 `Quote` 扁平化视图
- **新增**：后端 `LoginLog` 数据模型 + DAO + Handler + 路由
- **新增**：登录时自动记录登录日志
- **新增**：前端对接 `GET /api/admin/login-logs` 接口

## Impact
- Affected specs: quote-management, user-auth-api
- Affected frontend code: `src/types.ts`, `src/api.ts`, `src/mockData.ts`, `src/App.tsx`, `src/components/GeometricPortrait.tsx`
- Affected backend code: `internal/models/`, `internal/dao/handler.go`, `internal/dto/auth.go`, `internal/handler/auth/login.go`, `internal/handler/admin/user.go`, `internal/router/router.go`, `cmd/server.go`

## ADDED Requirements

### Requirement: 通用响应格式解包
前端 `request<T>()` SHALL 在 HTTP 200 时从 `response.data` 中提取实际业务数据。

#### Scenario: 成功响应
- **WHEN** 后端返回 `{ code: 10200, msg: "Operation Success", data: { ... } }`
- **THEN** 前端从 `data` 字段取数据，返回类型为 `T`

#### Scenario: 业务错误响应
- **WHEN** 后端返回 `{ code: 4xxxx, msg: "..." }`（HTTP 200）
- **THEN** 前端抛出 `ApiError`，包含 code 和 msg

### Requirement: Quote 数据模型对齐后端
前端 `Quote` 类型 SHALL 包含后端金句接口返回的所有字段。

字段列表：
- `qid`: string — 金句 ID
- `content`: string — 消息内容
- `suppression`: number — 压抑值
- `userdata`: `{ qqnumber: string; speaker: string; avatar?: string }` — 发言者信息
- `groupdata`: `{ groupnumber: string; groupname?: string; avatar?: string }` — 群信息
- `attachmentid`: string[] — 附件 ID 列表
- `is_featured`: boolean — 是否精华

#### Scenario: 从 /api/quotes/speakers/:qqNumber/quotes 获取数据
- **WHEN** 调用 `api.quotes()`
- **THEN** 返回 `Quote[]`，每个元素符合上述结构

### Requirement: Profile 类型使用 uid 字段
前端 `Profile` 类型 SHALL 使用 `uid` 而非 `id`。

```typescript
interface Profile {
  uid: string;
  email: string;
  nickname: string;
  role: "user" | "admin" | "banned";
}
```

#### Scenario: 从 login 响应中提取 Profile
- **WHEN** `api.login()` 成功
- **THEN** 返回 `{ tokens: AuthTokens, user: Profile }`

### Requirement: API 路径统一加 /api/ 前缀
所有请求路径 SHALL 以 `/api/` 开头。

| 前端方法 | 新路径 |
|----------|--------|
| `api.login()` | `/api/auth/login` |
| `api.register()` | `/api/auth/register` |
| `api.quotes()` | `/api/quotes/speakers/:qqNumber/quotes`（聚合多个发言人） |
| `api.adminUsers()` | `/api/admin/users` |
| `api.loginLogs()` | `/api/admin/login-logs` |

#### Scenario: 请求路径拼接
- **WHEN** `API_BASE_URL = "http://127.0.0.1:8080"`
- **THEN** 最终请求 URL 为 `http://127.0.0.1:8080/api/auth/login`

### Requirement: 注册接口直接使用返回的 token
`api.register()` SHALL 直接使用注册响应中的 `access_token` 和 `refresh_token`，不再额外调用 `api.login()`。

#### Scenario: 注册成功
- **WHEN** 用户提交注册表单
- **THEN** 一次 `POST /api/auth/register` 完成认证，无需二次请求

### Requirement: 后端登录记录 - 数据模型
系统 SHALL 在 PostgreSQL 中创建 `login_logs` 表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | bigint (PK, auto increment) | 主键 |
| `uid` | varchar(64), index | 用户 UID |
| `email` | varchar(64) | 登录邮箱 |
| `ip` | varchar(45) | 登录 IP |
| `result` | varchar(20) | success / failed |
| `created_at` | timestamp | 记录时间（GORM 自动管理） |

#### Scenario: 表结构
- **WHEN** 启动服务执行 AutoMigrate
- **THEN** `login_logs` 表自动创建

### Requirement: 后端登录记录 - 写入
每次登录请求 SHALL 记录一条登录日志（无论成功或失败）。

#### Scenario: 登录成功
- **WHEN** 密码验证通过
- **THEN** 写入 `result = "success"` 的登录日志

#### Scenario: 登录失败（密码错误 / 用户不存在）
- **WHEN** 登录校验未通过
- **THEN** 写入 `result = "failed"` 的登录日志（uid 为空）

### Requirement: 后端登录记录 - 查询接口
系统 SHALL 提供 `GET /api/admin/login-logs` 接口，需 JWT + Admin 鉴权。

- 请求参数：`?page=1&page_size=30`
- 响应格式：`{ code: 10200, data: { items: LoginLogInfo[], total, page, page_size } }`
- `LoginLogInfo` 字段：`id: string`, `at: string`（格式化时间）, `email: string`, `ip: string`, `result: string`
- 按 `created_at DESC` 排序

#### Scenario: 查询登录日志
- **WHEN** Admin 用户请求 `GET /api/admin/login-logs?page=1&page_size=30`
- **THEN** 返回分页的登录日志列表

### Requirement: 前端对接登录记录接口
前端 `api.loginLogs()` SHALL 调用 `GET /api/admin/login-logs`，失败时降级到 mock 数据。

前端 `LoginLog` 类型：
```typescript
interface LoginLog {
  id: string;
  at: string;
  email: string;
  ip: string;
  result: "success" | "failed";
}
```

#### Scenario: 前端获取登录日志
- **WHEN** AdminDashboard 加载
- **THEN** 调用 `api.loginLogs()` 获取登录日志并展示

## MODIFIED Requirements

### Requirement: QuotePerson 派生逻辑适配新 Quote 结构
`createPeopleFromQuotes()` SHALL 从新的 `Quote` 结构（`userdata.speaker`、`groupdata.groupnumber`）中提取 `QuotePerson` 所需的字段。

#### Scenario: 从后端 Quote 列表派生 QuotePerson
- **WHEN** `api.quotes()` 返回 `Quote[]`
- **THEN** `createPeopleFromQuotes()` 按 `userdata.speaker` 分组，生成 `QuotePerson[]`

## REMOVED Requirements

### Requirement: 移除 /user/profile 独立接口
**Reason**: 后端无此接口，用户信息从 login 响应中获取。
**Migration**: 登录成功后直接从 `login()` 返回值中提取 Profile，不再单独调用 `api.profile()`。

### Requirement: 移除 /groups 独立接口
**Reason**: 后端无此接口，群组信息可从 quotes 数据中聚合。
**Migration**: `GroupInfo[]` 从 quotes 的 `groupdata` 中提取聚合，或保留 mock 降级。
