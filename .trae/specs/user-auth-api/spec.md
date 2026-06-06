# 用户认证与管理 API Spec

## Why
为 HallOfFame 提供完整的用户注册、登录认证和管理能力，支撑前端已有管理面板（AdminDashboard）对用户列表、角色管理的操作需求。

## What Changes

- 新增 `internal/dto/` 包，定义统一响应结构 `Response[T]` 及辅助函数
- 新增 `internal/handler/auth/` 包，实现注册/登录/刷新 JWT 三个接口
- 新增 `internal/handler/admin/` 包，实现更改用户角色/删除用户两个管理接口（需 admin 权限）
- JWT 鉴权中间件 `internal/middleware/auth.go`，从 Redis 校验 token 有效性
- Admin 鉴权中间件 `internal/middleware/admin.go`
- 扩展 `internal/cache/handler.go`，补充 token 管理方法（黑名单、过期控制）
- 扩展 `pkg/redisKeygen/keygen.go`，补充 token 相关 key 生成
- 后端启动入口 `cmd/server/main.go`

## Impact
- Affected specs: 用户认证、管理员管理
- Affected code: 新增 `internal/dto/`, `internal/handler/`, `internal/middleware/`, `cmd/server/`；修改 `internal/cache/handler.go`, `pkg/redisKeygen/keygen.go`

## ADDED Requirements

### 统一响应格式
所有接口的响应格式为：
```json
{
    "code": 10200,
    "msg": "Operation Success",
    "data": <any or null>
}
```
成功 code 为 10200，错误 code 使用 4xxxx/5xxxx 系列。

### JWT + Redis 缓存设计
- 登录/注册成功后，生成 access_token（短期 1h）和 refresh_token（长期 7d）
- access_token 存入 Redis，key `user:token:<uid>`，value 为 token，带 TTL（1h），用于鉴权时校验 token 是否有效
- refresh_token 存入 Redis，key `user:refresh_token:<uid>`，value 为 refresh token，带 TTL（7d）
- 鉴权中间件从 Redis 检查 access_token 是否存在且与请求携带的一致，防止旧 token 继续使用
- 用户被 ban 时，从 Redis 删除该用户的所有 token，使其立即失效

### Requirement: 注册接口
`POST /api/auth/register`

#### Scenario: 注册成功
- **WHEN** 用户提交 `{ email, password, nickname }`
- **THEN** 创建用户，生成 `uid`（UUID），密码 bcrypt 加密，生成 access_token + refresh_token 存入 Redis，返回 `{ uid, email, nickname, access_token, refresh_token }`

#### Scenario: 邮箱已存在
- **WHEN** 邮箱已被注册
- **THEN** 返回 400 错误

### Requirement: 登录接口
`POST /api/auth/login`

#### Scenario: 登录成功
- **WHEN** 用户提交 `{ email, password }`
- **THEN** 校验 bcrypt 密码，检查 role，生成 token 并存入 Redis，返回 `{ access_token, refresh_token, user }`

#### Scenario: 用户被 ban
- **WHEN** 用户 role 为 "banned"
- **THEN** 返回 403 错误，禁止登录

#### Scenario: 密码错误
- **WHEN** 密码不匹配
- **THEN** 返回 401 错误

### Requirement: 刷新 JWT 接口
`POST /api/auth/refresh`

#### Scenario: 刷新成功
- **WHEN** 提交 `{ refresh_token }`
- **THEN** 校验 refresh_token 与 Redis 中一致，删除旧 token，生成新 access_token + refresh_token 存入 Redis，返回 `{ access_token, refresh_token }`

### Requirement: 更改用户角色接口
`PUT /api/admin/users/:uid/role` (需要 admin 权限)

#### Scenario: 修改成功
- **WHEN** admin 提交 `{ role: "admin" | "user" | "banned" }`
- **THEN** 更新用户角色。如果改为 "banned"，同时从 Redis 清除该用户所有 token 使其立即下线。

### Requirement: 删除用户接口
`DELETE /api/admin/users/:uid` (需要 admin 权限)

#### Scenario: 删除成功
- **WHEN** admin 删除指定用户
- **THEN** 软删除用户，从 Redis 清除该用户所有 token，返回 `null`

## MODIFIED Requirements
无

## REMOVED Requirements
无
