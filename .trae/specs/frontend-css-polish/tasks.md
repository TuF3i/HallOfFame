# Tasks

## Task 1: 用户列表改为四列，删除按钮样式统一
- [x] 修改 `App.tsx` 中用户列表的表头行：从 `User / Role / 操作` 改为 `用户昵称 / 邮箱 / Role / 操作`
- [x] 修改 `App.tsx` 中用户列表的数据行：每行增加邮箱列（显示 `user.email`）
- [x] 修改 `App.tsx` 中的删除按钮，使用与页面其他操作按钮一致的样式（参考言论库中的 `switch-cluster` 按钮风格）
- [x] 修改 `styles.css` 中 `.user-table .table-row` 的 `grid-template-columns` 适配四列布局

## Task 2: 创建用户弹窗输入框 CSS 统一
- [x] 修改 `styles.css`，确保 `.modal-field input[type="email"]` 和 `.modal-field input[type="password"]` 使用与其他文本输入框相同的样式规则
- [x] 确保邮箱、密码、昵称三个输入框的 CSS 完全一致

## Task 3: 创建言论弹窗文件选择按钮 CSS 统一
- [x] 修改 `styles.css` 中 `.global-file-input` 的样式，使其视觉风格与页面中其他按钮统一（边框粗细、颜色、背景、hover 效果等保持一致的 brutalist 风格）

# Task Dependencies
- 三个 Task 无依赖关系，可并行开发
