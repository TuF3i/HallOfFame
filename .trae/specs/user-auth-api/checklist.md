## DTO
- [x] `internal/dto/response.go` 定义了 `Response[T]` 结构体及 `Success`/`Error` 辅助函数
- [x] `internal/dto/response.go` 定义了错误码常量
- [x] `internal/dto/auth.go` 定义了 Register/Login/Refresh/UserInfo 等 data 结构体
- [x] `internal/dto/auth.go` 定义了 `UserToDTO` 等模型到 DTO 的转换函数

## JWT & Cache
- [x] `pkg/jwt/jwt.go` 实现了 `GenerateTokens` 和 `ParseToken`，使用 RSA/HS256
- [x] `pkg/redisKeygen/keygen.go` 补充了 `GetUserTokenKey` 和 `GetUserRefreshTokenKey`
- [x] `internal/cache/handler.go` 补充了 `SetToken`/`GetToken`/`DeleteToken` 和 refresh token 相关方法
- [x] `internal/cache/handler.go` 补充了 `DeleteUserAllTokens`（删 access + refresh）

## Handlers
- [x] `internal/handler/auth/register.go` 注册接口：bcrypt 加密密码，创建用户，返回 token
- [x] `internal/handler/auth/login.go` 登录接口：校验密码，banned 用户返回 403
- [x] `internal/handler/auth/refresh.go` 刷新 JWT 接口：比对 Redis 中的 refresh_token
- [x] `internal/handler/admin/user.go` 管理员接口：更改角色(PUT) 和 删除用户(DELETE)，ban 时清理 Redis token

## Middleware
- [x] `internal/middleware/auth.go` JWT 鉴权中间件：从 Redis 校验 token 有效
- [x] `internal/middleware/admin.go` Admin 鉴权中间件：校验 role 为 admin/owner

## Server
- [x] `cmd/server/main.go` 启动入口：初始化全部依赖，注册路由 + 中间件，启动 Hertz server
- [x] 所有接口均使用统一的 `Response[T]` 格式返回
- [x] 项目编译通过 `go build ./...`
