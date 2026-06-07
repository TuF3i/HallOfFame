# Tasks

- [x] Task 1: 重构 `types.ts` — 数据类型对齐后端
  - [x] 1.1 修改 `Profile`，`id: number` → `uid: string`
  - [x] 1.2 重建 `Quote`，字段改为 `qid`、`suppression`、`userdata`、`groupdata`、`attachmentid`、`is_featured`、`content`
  - [x] 1.3 修改 `AdminUser`，`id: number` → `uid: string`
  - [x] 1.4 `LoginLog` 类型字段与后端响应对齐（`id: string`, `at: string`, `email: string`, `ip: string`, `result: "success" | "failed"`）

- [x] Task 2: 重构 `mockData.ts` — Mock 数据匹配新类型
  - [x] 2.1 `mockProfile` 使用 `uid` 替代 `id`
  - [x] 2.2 `mockPeople` 中的 `Quote` 实例改为新结构（`qid`、`userdata`、`groupdata` 嵌套）
  - [x] 2.3 `mockUsers` 使用 `uid` 替代 `id`
  - [x] 2.4 `mockPeople` 中 `QuotePerson` 引用旧 `Quote` 字段处全部适配

- [x] Task 3: 重构 `api.ts` — API 层路径、响应解包、接口逻辑对齐
  - [x] 3.1 通用响应解包：`request<T>()` 从 `{ code, msg, data }` 中提取 `data`，非 10200 抛出 `ApiError`
  - [x] 3.2 所有路径加 `/api/` 前缀
  - [x] 3.3 `login()` 返回 `{ tokens, user }` 而非仅 tokens
  - [x] 3.4 `register()` 直接返回 tokens，不再内调 `login()`
  - [x] 3.5 移除 `api.profile()`，Profile 由 `login()` 提供
  - [x] 3.6 `api.groups()` 保留 mock 降级（后端无此接口）
  - [x] 3.7 `api.loginLogs()` 调用 `GET /api/admin/login-logs`，失败降级 mock

- [x] Task 4: 重构 `App.tsx` — 适配新类型和 API 变更
  - [x] 4.1 认证逻辑：`handleAuthenticated` 同时接收 tokens 和 user Profile
  - [x] 4.2 移除 `api.profile()` 调用，Profile 从登录流程传入
  - [x] 4.3 `createPeopleFromQuotes()` 从 `Quote.userdata.speaker` / `Quote.groupdata.groupnumber` 提取字段
  - [x] 4.4 所有 `quote.id` → `quote.qid`、`quote.speaker` → `quote.userdata.speaker`、`quote.qq_group` → `quote.groupdata.groupnumber`
  - [x] 4.5 `AdminDashboard` 中 `user.id` → `user.uid`
  - [x] 4.6 `archivePage` 中人物卡片展示适配新字段路径

- [x] Task 5: 适配 `GeometricPortrait.tsx` — 确保组件不依赖旧 Quote 字段
  - [x] 5.1 确认组件只使用 `QuotePerson` 类型，无直接 `Quote` 引用

- [x] Task 6: 运行 TypeScript 类型检查，确保零错误

- [x] Task 7: 后端新增登录记录功能
  - [x] 7.1 创建 `internal/models/login_log.go` — `LoginLog` GORM 模型
  - [x] 7.2 `internal/dao/handler.go` 添加 `AddLoginLog()` 和 `ListLoginLogs()` 方法
  - [x] 7.3 `internal/dto/auth.go` 添加 `LoginLogInfo` DTO 和 `LoginLogToDTO()` 转换函数
  - [x] 7.4 `internal/handler/admin/user.go` 添加 `ListLoginLogs()` handler
  - [x] 7.5 `internal/handler/auth/login.go` 中登录成功/失败时调用 `AddLoginLog()`
  - [x] 7.6 `internal/router/router.go` 添加 `GET /api/admin/login-logs` 路由
  - [x] 7.7 `cmd/server.go` 中 AutoMigrate 添加 `&models.LoginLog{}`

# Task Dependencies
- Task 2 依赖 Task 1（mockData 引用 types）
- Task 3 依赖 Task 1（api.ts 引用 types）
- Task 4 依赖 Task 1, 2, 3（App.tsx 引用所有类型和 API）
- Task 5 无依赖
- Task 6 依赖 Task 1-5
- Task 7 无依赖，可与 Task 1-6 并行
