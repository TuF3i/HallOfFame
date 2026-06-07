# Tasks

- [x] Task 1: 删除 `mockData.ts` 文件
- [x] Task 2: 重构 `api.ts` — 移除所有 mock 兜底
  - [x] 2.1 移除 `withFallback()` 和 `delay()` 函数
  - [x] 2.2 移除 mock 数据导入
  - [x] 2.3 `login()` 直接 `await request()`，失败抛错
  - [x] 2.4 `register()` 直接 `await request()`，失败抛错
  - [x] 2.5 `quotes()` 改为级联：优先 `/api/admin/quotes`，失败后 `/api/quotes/featured`
  - [x] 2.6 移除 `groups()` 方法
  - [x] 2.7 `adminUsers()` 直接 `await request()`
  - [x] 2.8 `loginLogs()` 直接 `await request()`

- [x] Task 3: 重构 `App.tsx` — 移除所有 mock 数据依赖
  - [x] 3.1 移除 `import { mockLoginLogs, mockPeople, mockUsers } from "./mockData"`
  - [x] 3.2 `quotes` 初始状态：`[]`
  - [x] 3.3 `adminUsers` 初始状态：`[]`
  - [x] 3.4 `loginLogs` 初始状态：`[]`
  - [x] 3.5 `createPeopleFromQuotes()` 空数据时返回 `[]`
  - [x] 3.6 移除 `mockPeople[0]` 兜底，改为可选链处理空状态

- [x] Task 4: 重构 `types.ts` — 移除 `GroupInfo` 类型

- [x] Task 5: 运行 TypeScript 类型检查，确保零错误

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 5 依赖 Task 1-4
