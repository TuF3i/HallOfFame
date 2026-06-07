# Checklist

## 前端类型对齐
- [x] `Profile` 类型使用 `uid: string` 而非 `id: number`
- [x] `Quote` 类型包含 `qid`、`suppression`、`userdata`、`groupdata`、`attachmentid`、`is_featured`、`content` 字段
- [x] `AdminUser` 类型使用 `uid: string` 而非 `id: number`
- [x] `LoginLog` 类型字段与后端响应一致（id / at / email / ip / result）

## Mock 数据
- [x] `mockProfile` 使用 `uid` 字段
- [x] `mockPeople` 中 `Quote` 实例使用新结构（嵌套 `userdata`/`groupdata`）
- [x] `mockUsers` 使用 `uid` 字段

## API 层
- [x] `request<T>()` 从响应 `data` 字段解包业务数据
- [x] `request<T>()` 处理业务错误（非 10200 抛出 ApiError）
- [x] API 路径包含 `/api/` 前缀
- [x] `api.login()` 返回 `{ tokens, user }`
- [x] `api.register()` 直接返回 tokens，不内调 login
- [x] `api.profile()` 已移除
- [x] `api.groups()` 仅使用 mock 降级
- [x] `api.loginLogs()` 调用 `GET /api/admin/login-logs`，失败降级 mock

## App.tsx
- [x] `handleAuthenticated` 同时接收 tokens 和 user Profile
- [x] `createPeopleFromQuotes()` 从 `quote.userdata.speaker` 分组
- [x] 所有 `quote.id` 引用改为 `quote.qid`
- [x] 所有 `quote.speaker` 引用改为 `quote.userdata.speaker`
- [x] 所有 `quote.qq_group` 引用改为 `quote.groupdata.groupnumber`
- [x] `AdminDashboard` 中 `user.id` 改为 `user.uid`

## 组件
- [x] `GeometricPortrait` 不直接依赖 `Quote` 类型

## 后端登录记录
- [x] `internal/models/login_log.go` 包含 `LoginLog` GORM 模型（id / uid / email / ip / result / created_at）
- [x] `internal/dao/handler.go` 包含 `AddLoginLog()` 和 `ListLoginLogs()` 方法
- [x] `internal/dto/auth.go` 包含 `LoginLogInfo` DTO 和转换函数
- [x] `internal/handler/admin/user.go` 包含 `ListLoginLogs()` handler
- [x] `internal/handler/auth/login.go` 登录成功和失败时均调用 `AddLoginLog()`
- [x] `internal/router/router.go` 注册 `GET /api/admin/login-logs` 路由
- [x] `cmd/server.go` AutoMigrate 包含 `&models.LoginLog{}`

## 编译验证
- [x] 前端 TypeScript 编译零错误（`tsc --noEmit` 通过）
- [x] 后端 Go 编译零错误（`go build ./...` 通过）
