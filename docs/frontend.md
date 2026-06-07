# HallOfFame — 前端项目文档

## 概述

HallOfFame 前端是一个基于 React 19 的单页应用，用于展示 QQ 群聊天记录中的"金句"（Quotes），并提供管理面板。项目以"酸性设计"（Acid UI）风格为视觉基调，融合了 WebGL 流体动画、自定义光标、几何图形化头像等视觉效果。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.1.0 | UI 框架 |
| TypeScript | ^5.8.0 | 类型系统 |
| Vite | ^7.0.0 | 构建工具 |
| @vitejs/plugin-react | ^5.0.0 | React 热更新 |
| lucide-react | ^0.468.0 | 图标库 |
| WebGL | — | 流体着色器动画 |

## 项目结构

```
web/
├── index.html                  # HTML 入口
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 依赖与脚本
├── scripts/
│   └── build.mjs               # 构建脚本（tsc 检查 + vite 构建）
├── .env.example                # 环境变量示例
└── src/
    ├── main.tsx                # React 入口
    ├── App.tsx                 # 主应用组件（所有页面逻辑）
    ├── api.ts                  # API 层（请求封装 + 鉴权 + mock 降级）
    ├── types.ts                # 类型定义
    ├── mockData.ts             # Mock 数据
    ├── styles.css              # 全局样式
    ├── vite-env.d.ts           # Vite 类型声明
    └── components/
        ├── FluidShader.tsx      # WebGL 流体着色器背景
        └── GeometricPortrait.tsx # 几何图形化头像
```

## 页面与路由

整个应用通过 `#hash` 进行客户端路由，共有三个视图（View）：

| 视图 | Hash | 说明 |
|------|------|------|
| `auth` | `#auth` | 登录/注册页 |
| `archive` | `#archive` | 金句档案浏览（默认登录后页面） |
| `admin` | `#admin` | 管理面板（仅 admin 角色可访问） |

未登录时自动跳转到 `auth`；非 admin 用户尝试访问 `admin` 会被重定向到 `archive`。

## 核心功能

### 1. 认证（AuthPage）

- 支持登录和注册两种模式，通过分段控件切换
- 表单验证（邮箱格式、密码长度）
- 调用 API 完成认证，成功后保存 JWT Token 到 `localStorage`
- 默认填充演示账号 `operator@hall.local` / `hallfame`

### 2. 档案浏览（ArchivePage）

- **卡片包（Card Pack）**：左侧展示人物卡片堆叠列表，悬停或聚焦可展开预览，点击选中
- **几何头像（GeometricPortrait）**：根据人物的 `portrait` 类型（`circles` / `slices` / `halo` / `mesh`）渲染不同风格的几何头像
- **今日金句（Quote of the Day）**：展示选中人物的精华发言，支持点击切换字号大小
- **历史记录**：展示该人物的历史发言列表，支持分页浏览和精华标记
- **压抑值（Pressure Meter）**：展示人物的"性压抑度"指标（0-5）

### 3. 管理面板（AdminDashboard）

- **言论库**：搜索、分页浏览所有金句，管理员可标记/取消精华、删除言论
- **用户列表**：查看用户、修改角色（admin/user/banned）、启用/禁用账户
- **压抑值面板**：调节各发言人的压抑值（0-5 滑块）
- **登录日志**：虚拟滚动列表展示登录日志，失败记录高亮显示

### 4. 设置面板（SettingsPanel）

- **背景颜色**：自定义页面背景色
- **自定义光标**：可开关的自定义光标，支持大小调节、颜色选择、延迟跟随模式

## 视觉效果

### WebGL 流体着色器

`FluidShader` 组件使用原生 WebGL 渲染全屏流体动画背景：
- 多个圆形光晕叠加（品红、青色、橙色、紫色）
- Perlin 噪声驱动的流动效果
- 响应鼠标位置变化
- 叠加线条纹理和噪点，模拟纸张质感

### 几何装饰

`AcidGeometry` 组件固定在页面底层，包含多个几何图形装饰元素（圆环、渐变圆、平行四边形、网格方块、竖线、条纹圆），低透明度叠加，形成酸性设计风格的背景基底。

### 自定义光标

`CustomCursor` 组件替代默认鼠标光标：
- 圆形光标，跟随鼠标移动
- 悬停可交互元素时缩小
- 点击时有扩散遮罩动画
- 支持延迟跟随模式（缓动跟随）

## API 层设计

### 鉴权管理

- Token 存储在 `localStorage` 的 `hall-of-fame.tokens` 键中
- 自动在请求头添加 `Authorization: Bearer <token>`
- 提供 `read()` / `write()` / `clear()` 三个方法

### 请求封装

通用 `request<T>()` 函数：
- 8 秒超时自动 abort
- 自动设置 `Content-Type: application/json`
- 支持带鉴权的请求
- 统一错误处理（`ApiError` 类）

### Mock 降级

所有 API 方法都通过 `withFallback()` 包装：当后端 API 不可达时，自动降级返回 mock 数据（延迟 260ms 模拟网络请求），保证前后端分离开发时页面可正常预览。

### API 接口列表

| 方法 | 端点 | 鉴权 | 说明 |
|------|------|------|------|
| `api.login()` | POST /auth/login | 否 | 登录 |
| `api.register()` | POST /auth/register | 否 | 注册 |
| `api.profile()` | GET /user/profile | 是 | 获取当前用户信息 |
| `api.quotes()` | GET /quotes | 否 | 获取金句列表 |
| `api.groups()` | GET /groups | 否 | 获取群组信息 |
| `api.adminUsers()` | GET /admin/users | 是 | 获取用户列表（admin） |
| `api.loginLogs()` | GET /admin/login-logs | 是 | 获取登录日志（admin） |

## 类型系统

核心类型定义在 `types.ts` 中：

| 类型 | 说明 |
|------|------|
| `View` | 页面视图枚举（auth / archive / admin） |
| `AuthMode` | 认证模式（login / register） |
| `AuthTokens` | JWT 令牌对 |
| `Profile` | 用户个人信息 |
| `Quote` | 金句（发言） |
| `QuotePerson` | 封装的人物信息（含精华金句和历史记录） |
| `GroupInfo` | QQ 群信息 |
| `AdminUser` | 管理后台用户 |
| `LoginLog` | 登录日志 |

## Mock 数据

`mockData.ts` 提供了一套完整的虚构演示数据：

- **4 个人物**：陈折线、罗像素、徐终端、殷棱镜，各自有不同的 QQ 群、角色、信号标识
- **精华金句**：每人 1 条特色精华发言
- **历史记录**：每人 4 条历史发言
- **4 个群组**：不同状态的 QQ 群
- **4 个用户**：含 admin / user / banned 角色
- **6 条登录日志**：含成功和失败记录

## 构建与运行

### 环境变量

复制 `.env.example` 为 `.env`，配置 API 地址：

```
VITE_API_BASE_URL=http://127.0.0.1:3000
```

### 开发

```bash
npm run dev
# 启动 Vite 开发服务器 at http://127.0.0.1:5173
```

### 构建

```bash
npm run build
# 1. TypeScript 类型检查（tsc --noEmit）
# 2. Vite 生产构建
```

### 预览

```bash
npm run preview
# 预览生产构建结果 at http://127.0.0.1:4173
```

## 性能优化

- **虚拟列表**：`PageVirtualList` 组件对登录日志进行虚拟滚动渲染，仅渲染可视区域的 DOM 节点
- **惰性分页**：历史记录和言论库采用分页加载，避免一次性渲染大量数据
- **CSS 动画优化**：使用 `transform` 和 `opacity` 驱动动画，避免触发重排
- **WebGL**：流体动画在 GPU 上执行，不占用主线程
- **状态更新优化**：使用 `useCallback` 模式（通过 `setState` 函数式更新）减少不必要的重渲染
- **`prefers-reduced-motion`**：响应无障碍设置，减少动画

## 响应式设计

- **桌面（>980px）**：完整布局，双栏或三栏
- **平板（640-980px）**：卡片包变为水平滚动，档案区变为单栏
- **手机（<640px）**：简化导航图标，历史记录覆盖层变为底部弹出，表格列自适应隐藏
