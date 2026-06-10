# Checklist

## 后端
- [x] `POST /api/admin/users` — 管理员手动创建用户 API 可正常调用
- [x] 创建用户时 bcrypt 加密密码
- [x] 创建用户时校验邮箱唯一性
- [x] 创建用户时不生成 token
- [x] `GET /api/admin/settings/registration` — 返回注册开关状态
- [x] `PUT /api/admin/settings/registration` — 更新注册开关状态
- [x] 注册关闭时 `/api/auth/register` 返回错误 "注册已关闭"

## 前端
- [x] 登录页邮箱输入框显示 "请输入邮箱" placeholder，无预填
- [x] 登录页密码输入框显示 "请输入密码" placeholder，无预填
- [x] 注册页昵称输入框显示 "请输入昵称" placeholder，无预填
- [x] 用户列表 tab 有"创建用户"按钮
- [x] 创建用户弹窗包含邮箱、密码、昵称、角色字段
- [x] 创建用户成功后用户列表刷新
- [x] 用户列表每行有删除按钮
- [x] 删除用户成功后有确认提示，列表刷新
- [x] 管理界面有注册开关 toggle
- [x] 注册开关状态与后端同步
- [x] 创建言论后言论列表自动刷新
- [x] 删除言论后言论列表自动刷新
- [x] 创建/删除用户后用户列表自动刷新
- [x] 删除发言人后发言人列表自动刷新
