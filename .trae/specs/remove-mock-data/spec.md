# 删除 Mock 数据，全量对接后端接口 Spec

## Why
前端仍依赖 `mockData.ts` 作为初始状态和 API 失败的兜底数据，导致即使后端可用，非 admin 用户的档案页仍显示 mock 数据。需要彻底删除 mock 数据，所有数据从后端真实接口获取。

## What Changes
- 删除 `src/mockData.ts`
- 删除 `api.ts` 中的 `withFallback()` / `delay()` 兜底机制
- 所有 API 方法移除 mock fallback，直接调用后端接口，失败时直接抛错
- 移除 `api.groups()`（后端无此接口，且前端未使用）
- `api.quotes()` 改为后端链路：admin 用户走 `/api/admin/quotes`，非 admin 已认证用户走 `/api/quotes/featured`
- 删除 `src/types.ts` 中 `GroupInfo` 类型（不再使用）
- `App.tsx` 初始状态改为空数组，移除所有 mock 引用和兜底逻辑
- 移除 import 链中对 mockData 的所有引用

## Impact
- Affected specs: frontend-api-alignment
- Affected code: `src/mockData.ts`, `src/api.ts`, `src/App.tsx`, `src/types.ts`

## ADDED Requirements

### Requirement: `api.quotes()` 后端多级获取
前端 `api.quotes()` SHALL 按级联策略从后端获取 quotes：

1. 优先调用 `GET /api/admin/quotes`（带 JWT Auth），适用于 admin 用户
2. 失败时调用 `GET /api/quotes/featured`（带 JWT Auth），适用于已认证的非 admin 用户
3. 都失败则抛出 `ApiError`，不再返回 mock 数据

#### Scenario: Admin 用户获取全量金句
- **WHEN** 已登录 admin 用户调用 `api.quotes()`
- **THEN** 请求 `GET /api/admin/quotes` 返回所有金句，包括非精华金句

#### Scenario: 普通已认证用户获取金句
- **WHEN** 已登录非 admin 用户调用 `api.quotes()`
- **THEN** 先请求 `/api/admin/quotes`（403 拒绝），再请求 `/api/quotes/featured`，返回精华金句列表

### Requirement: API 方法直连后端，不使用 mock
所有 API 方法 SHALL 直接调用后端接口，失败时直接抛出 `ApiError`。

| 方法 | 后端路径 | 失败行为 |
|------|----------|----------|
| `api.login()` | POST /api/auth/login | 抛出 ApiError |
| `api.register()` | POST /api/auth/register | 抛出 ApiError |
| `api.quotes()` | GET /api/admin/quotes → /api/quotes/featured | 抛出 ApiError |
| `api.adminUsers()` | GET /api/admin/users | 抛出 ApiError |
| `api.loginLogs()` | GET /api/admin/login-logs | 抛出 ApiError |

### Requirement: 移除 `withFallback()` 和 `delay()` 辅助函数
`api.ts` SHALL 移除这两个函数，所有 API 方法直接 `await request<T>()`。

#### Scenario: 后端不可达
- **WHEN** 后端 API 服务器未运行
- **THEN** 前端抛出 `ApiError`，错误信息在前端 UI 中展示（例如登录页显示错误提示）

### Requirement: 移除 `api.groups()`
因为后端没有对应的群组查询接口，且前端没有任何 UI 调用 `api.groups()`，SHALL 直接删除该方法及 `GroupInfo` 类型。

## REMOVED Requirements

### Requirement: 删除 src/mockData.ts 文件
**Reason**: 所有数据已改为从后端获取，mock 数据不再需要。
**Migration**: 直接删除文件。

### Requirement: 删除 GroupInfo 类型
**Reason**: 无后端接口对应，前端未使用。
**Migration**: 从 types.ts 中删除。

### Requirement: 删除 App.tsx 中所有 mock 数据依赖
**Reason**: 初始状态应为空，等待后端数据加载。
**Migration**:
- `quotes` 初始状态：`[]`
- `adminUsers` 初始状态：`[]`
- `loginLogs` 初始状态：`[]`
- `createPeopleFromQuotes` 空数据时返回 `[]`
- ArchivePage selected 人物兜底：使用 `null` 并在 UI 中处理空状态
