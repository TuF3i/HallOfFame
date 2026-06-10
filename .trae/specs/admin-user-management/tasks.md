# Tasks

## Task 1: 后端 — 管理员手动创建用户 API
- [x] 在 `internal/handler/admin/user.go` 中新增 `CreateUser` handler
  - 解析请求体：email, password, nickname, role
  - 验证邮箱是否已存在
  - bcrypt 加密密码
  - 调用 `dao.AddUser` 创建用户
  - 不生成 token（管理员创建不需要自动登录）
- [x] 在 `internal/router/router.go` 中注册路由 `POST /api/admin/users`

## Task 2: 后端 — 注册开关
- [x] 使用 Redis 存储注册开关状态（`settings:registration_enabled`）
- [x] 在 `internal/cache/` 中新增 `GetRegistrationEnabled` / `SetRegistrationEnabled` 方法
- [x] 在 `internal/handler/admin/user.go` 中新增 `GetRegistrationConfig` / `SetRegistrationConfig` handler
- [x] 在 `internal/handler/auth/register.go` 中检查注册开关，关闭时返回错误
- [x] 在 `internal/router/router.go` 中注册路由 `GET /api/admin/settings/registration` 和 `PUT /api/admin/settings/registration`

## Task 3: 后端 — 管理员删除用户 API (已存在 DELETE /api/admin/users/:uid)
- [x] 确认现有 `DeleteUser` handler 工作正常，在 admin 前端界面添加删除用户按钮

## Task 4: 前端 — 登录/注册输入框改为 placeholder
- [x] 在 `AuthPage` 组件中移除预填充，添加 `placeholder` 属性
- [x] email 输入框 placeholder="请输入邮箱"
- [x] password 输入框 placeholder="请输入密码"
- [x] nickname 注册输入框 placeholder="请输入昵称"

## Task 5: 前端 — 管理员手动创建用户界面
- [x] 在用户列表 tab 中添加"创建用户"按钮和弹窗
- [x] 表单字段：邮箱、密码、昵称、角色选择
- [x] 调用 `POST /api/admin/users` API
- [x] 创建成功后刷新用户列表

## Task 6: 前端 — 管理员删除用户界面
- [x] 在用户列表每行添加删除按钮
- [x] 调用 `DELETE /api/admin/users/:uid` API
- [x] 删除成功后刷新用户列表

## Task 7: 前端 — 注册开关界面
- [x] 在管理界面添加注册开关 toggle
- [x] 调用 `GET/PUT /api/admin/settings/registration` API
- [x] 前端注册按钮根据开关状态显示

## Task 8: 前端 — 自动刷新数据
- [x] 创建/删除言论后自动刷新言论列表
- [x] 创建/删除用户后自动刷新用户列表
- [x] 删除发言人后自动刷新发言人列表

# Task Dependencies
- Task 1, 2, 3 可并行开发（后端无依赖）
- Task 5 depends on Task 1
- Task 6 depends on Task 3
- Task 7 depends on Task 2
- Task 8 与其他任务并行，但需等各 API 就绪
- Task 4 独立，可随时进行
