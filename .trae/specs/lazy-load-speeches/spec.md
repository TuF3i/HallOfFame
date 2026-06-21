# 发言分页加载优化 Spec

## Why
当前页面初始加载调用 `api.quotes()` 仅获取 80 条发言（`page=1&page_size=80`），`createPeopleFromQuotes` 基于这 80 条数据构建发言者列表且最多取 8 人，导致发言者展示不全。

## What Changes
- 页面初始加载改为全量加载所有发言者（通过 `api.listSpeakers` 无分页获取）和所有精华言论（通过 `api.featuredQuotes` 无分页获取）
- 发言者卡片列表由 Speaker 数据构建，不再依赖分页的 quotes 数据
- 发言者的具体言论保持懒加载：切换至某发言者卡片时才分页加载该发言者的言论
- **BREAKING**: `quotes` 状态不再包含全量数据，仅包含精华言论；AdminDashboard 的言论管理页需自行加载数据

## Impact
- Affected specs: frontend-api-alignment
- Affected code:
  - `web/src/App.tsx` — 数据加载逻辑、people 构建方式
  - `web/src/types.ts` — QuotePerson 类型调整
  - `internal/handler/quote/quote.go` — page_size 上限放宽

## ADDED Requirements

### Requirement: 全量加载所有发言者
系统在页面初始加载时 SHALL 通过 `GET /api/quotes/speakers` 接口全量获取所有发言者（按 QQNum 去重），不限制展示数量。

#### Scenario: 页面首次加载获取所有发言者
- **WHEN** 用户登录后首次进入档案页
- **THEN** 系统调用 `listSpeakers` 获取所有发言者，且卡片列表中展示全部发言者

### Requirement: 全量加载所有精华言论
系统在页面初始加载时 SHALL 通过 `GET /api/quotes/featured` 接口全量获取所有精华言论。

#### Scenario: 页面首次加载获取所有精华言论
- **WHEN** 用户登录后首次进入档案页
- **THEN** 系统调用 `featuredQuotes` 获取所有精华言论

### Requirement: 发言者言论懒加载
系统 SHALL 仅在用户选中某个发言者卡片时才加载该发言者的言论。

#### Scenario: 点击发言者卡片加载言论
- **WHEN** 用户点击某个发言者卡片
- **THEN** 系统调用 `speakerQuotes` 分页加载该发言者的言论

### Requirement: 精华合集言论懒加载
系统 SHALL 仅在用户选中精华卡片时才分页加载精华言论。

#### Scenario: 点击精华卡片加载精华言论
- **WHEN** 用户点击精华卡片
- **THEN** 系统调用 `featuredQuotes` 分页加载精华言论

## MODIFIED Requirements

### Requirement: AdminDashboard 言论管理独立加载
AdminDashboard 的"Quote Management"标签页 SHALL 在切换至该标签时自行加载言论数据，不再依赖 App 组件传入的 `quotes` prop。

#### Scenario: 管理员切换到言论管理标签
- **WHEN** 管理员打开管理面板并切换到"言论管理"标签
- **THEN** 系统调用 `api.quotes()` 加载言论数据供管理操作使用
