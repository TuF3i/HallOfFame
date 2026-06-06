# Tasks
- [ ] Task 1: 创建 `internal/dto/` 包
  - 定义 `type Response[T any] struct { Code int; Msg string; Data T }`
  - 定义成功辅助函数 `Success(w, data)`、`SuccessMsg(w, msg, data)`、`Error(w, code, msg)`
  - 定义错误码常量（Success=10200, 通用错误、认证错误、权限错误）
  - 定义 RegisterResp/LoginResp/RefreshResp/UserInfo 等 data 结构体
  - 定义 `UserToDTO` 等模型到 DTO 的转换函数
  - **代码路径**: `d:\R\HallOfFame\internal\dto\`

- [ ] Task 2: 创建 JWT 工具包并扩展 Cache/RedisKeygen
  - 2a: `pkg/jwt/jwt.go` — `GenerateTokens(uid, role) -> (accessToken, refreshToken, error)`、`ParseToken(tokenStr) -> (Claims, error)`，使用 golang-jwt 库
  - 2b: `pkg/redisKeygen/keygen.go` — 补充 `GetUserRefreshTokenKey(uid)`，access token key 已存在
  - 2c: `internal/cache/handler.go` — 补充 `SetRefreshToken`/`GetRefreshToken`/`DeleteToken`/`DeleteRefreshToken`/`DeleteUserAllTokens`（同时删除某个 uid 的 access 和 refresh token）

- [ ] Task 3: 实现认证接口 handler
  - 依赖 Task 1（DTO）、Task 2（JWT + Cache）
  - 3a: `internal/handler/auth/register.go` — `POST /api/auth/register`：bcrypt 加密密码，创建用户，生成 token 存入 Redis，返回 DTO
  - 3b: `internal/handler/auth/login.go` — `POST /api/auth/login`：查询用户，bcrypt 校验，banned 返回 403，生成 token 存入 Redis
  - 3c: `internal/handler/auth/refresh.go` — `POST /api/auth/refresh`：解析 refresh_token，对比 Redis 中的值，删除旧 token，生成新 token

- [ ] Task 4: 实现管理员接口 handler
  - 依赖 Task 1（DTO）、Task 2（Cache）
  - 4a: `internal/handler/admin/user.go` — `PUT /api/admin/users/:uid/role`：更新角色，如改为 banned 则清理 Redis token
  - 4b: `internal/handler/admin/user.go` — `DELETE /api/admin/users/:uid`：软删除用户，清理 Redis token

- [ ] Task 5: 实现中间件
  - 依赖 Task 2（JWT + Cache）
  - 5a: `internal/middleware/auth.go` — 从 `Authorization: Bearer <token>` 提取 JWT，解析 Claims，检查 Redis 中 token 一致，注入 `uid`/`role` 到 context
  - 5b: `internal/middleware/admin.go` — 从 context 读取 role，判断是否为 admin/owner

- [ ] Task 6: 创建后端启动入口
  - 依赖 Task 3（auth handlers）、Task 4（admin handlers）、Task 5（middleware）
  - `cmd/server/main.go`：读取配置，初始化 Postgres/Redis/MongoDB/Minio/Etcd，创建 Dao/Cache/Storage，注册路由和中间件，启动 Hertz server（监听 config 中配置的端口）

# Task Dependencies
- [Task 1] 无依赖
- [Task 2] 无依赖
- [Task 3] 依赖 [Task 1], [Task 2]
- [Task 4] 依赖 [Task 1], [Task 2]
- [Task 5] 依赖 [Task 2]
- [Task 6] 依赖 [Task 3], [Task 4], [Task 5]
