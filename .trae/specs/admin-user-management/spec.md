# 管理员用户管理 Spec

## Why
目前管理员无法手动创建用户，也无法控制是否允许公开注册。登录/注册表单预填了演示数据，不符合生产使用习惯。此外，管理员操作后数据不会自动刷新，需要手动刷新页面。

## What Changes
- 新增管理员手动添加用户的 API 和前端界面
- 新增是否启用注册的配置开关（管理员控制）
- 注册和登录输入框改为 placeholder 提示，不再预填
- 管理员界面的增删改操作后自动刷新数据

## Impact
- Affected specs: user-auth-api, frontend-api-alignment, archive-and-admin-redesign
- Affected code:
  - `internal/handler/admin/user.go` — 新增 CreateUser handler
  - `internal/handler/admin/admin.go` — 可能新增配置字段
  - `internal/handler/auth/register.go` — 注册开关检查
  - `internal/router/router.go` — 新增路由
  - `internal/dao/handler.go` — 可能需要新增 DAO 方法
  - `internal/models/users.go` — 可能需要新增配置表
  - `web/src/App.tsx` — 前端改动
  - `web/src/styles.css` — 前端样式改动

## ADDED Requirements

### Requirement: 管理员手动创建用户
The system SHALL allow admin users to manually create new users with email, password, nickname, and role.

#### Scenario: Admin creates user successfully
- **WHEN** admin submits create user form with valid email, password, nickname, and role
- **THEN** the user is created and the user list is refreshed

#### Scenario: Admin creates user with existing email
- **WHEN** admin submits with an already-registered email
- **THEN** the system shows an error message "邮箱已被注册"

### Requirement: 注册开关
The system SHALL allow admin to enable or disable public user registration.

#### Scenario: Admin toggles registration
- **WHEN** admin toggles the registration switch
- **THEN** public registration is enabled/disabled accordingly
- **AND** the setting is persisted

#### Scenario: Registration disabled
- **WHEN** a non-admin user tries to register while registration is disabled
- **THEN** the system returns an error "注册已关闭"

### Requirement: 输入框 placeholder
The system SHALL display placeholder text in login/register inputs instead of pre-filled values.

#### Scenario: Login form
- **WHEN** the login form is displayed
- **THEN** email input shows "请输入邮箱" placeholder
- **AND** password input shows "请输入密码" placeholder

#### Scenario: Register form
- **WHEN** the register form is displayed
- **THEN** email input shows "请输入邮箱" placeholder
- **AND** password input shows "请输入密码" placeholder
- **AND** nickname input shows "请输入昵称" placeholder

### Requirement: 自动刷新数据
The system SHALL refresh data after admin mutations (add/delete users, quotes, speakers).

#### Scenario: After creating a quote
- **WHEN** admin creates a quote successfully
- **THEN** the quotes list is automatically refreshed (quotes re-fetched from API)

#### Scenario: After deleting a quote
- **WHEN** admin deletes a quote successfully
- **THEN** the quotes list is automatically refreshed

#### Scenario: After creating/deleting a user
- **WHEN** admin creates or deletes a user
- **THEN** the user list is automatically refreshed

#### Scenario: After deleting a speaker
- **WHEN** admin deletes a speaker
- **THEN** the speaker list is automatically refreshed

## MODIFIED Requirements

### Requirement: User registration
The system SHALL check the registration-enabled setting before allowing public registration.
- Registration is a public endpoint by default
- Admin can disable it via a toggle
- When disabled, only admin-created users can exist

### Requirement: Login/Register form
Change from pre-filled values to empty inputs with placeholders.

## REMOVED Requirements
None.
