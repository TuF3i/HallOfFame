# 前端 CSS 样式统一 Spec

## Why
管理员界面的用户列表、创建用户弹窗、创建言论弹窗的 CSS 风格不统一，需要调整为一致的设计语言。

## What Changes
- 用户列表从三列改为四列（昵称、邮箱、Role、操作），删除按钮 CSS 与页面风格统一
- 创建用户弹窗的输入框 CSS 与页面昵称输入框风格统一
- 手动创建言论弹窗中"选择文件"按钮 CSS 与页面整体风格统一

## Impact
- Affected specs: admin-user-management
- Affected code: `web/src/App.tsx`, `web/src/styles.css`

## MODIFIED Requirements

### Requirement: 用户列表四列布局
用户列表 SHALL 显示四列：用户昵称、邮箱、Role、操作。

#### Scenario: 查看用户列表
- **WHEN** 管理员进入用户列表页面
- **THEN** 表格显示四列：用户昵称、邮箱、Role、操作
- **AND** 列宽比例合理，昵称和邮箱列自适应，Role 和操作列固定宽度

### Requirement: 用户列表删除按钮样式
用户列表中的删除按钮 SHALL 使用与页面其他表格操作按钮一致的 CSS 风格。

#### Scenario: 删除按钮样式
- **WHEN** 用户列表渲染
- **THEN** 每行的删除按钮样式与言论库表格中的操作按钮风格一致（圆角、尺寸、边框）

### Requirement: 创建用户弹窗输入框样式
创建用户弹窗中的输入框 SHALL 使用与页面统一的输入框 CSS 风格。

#### Scenario: 输入框样式
- **WHEN** 创建用户弹窗打开
- **THEN** 邮箱、密码、昵称输入框样式与页面中其他模态输入框一致（相同的边框、圆角、背景色、padding、focus 效果）

### Requirement: 创建言论弹窗文件选择按钮样式
手动创建言论弹窗中的文件选择按钮 SHALL 使用与页面统一的按钮 CSS 风格。

#### Scenario: 文件选择按钮
- **WHEN** 手动创建言论弹窗打开
- **THEN** 文件选择按钮的 CSS 样式与页面中其他按钮风格统一
