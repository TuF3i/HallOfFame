# Checklist

## mockData.ts
- [x] `src/mockData.ts` 文件已删除

## api.ts
- [x] `withFallback()` 和 `delay()` 函数已移除
- [x] 无任何 `./mockData` 导入
- [x] `login()` 直接调用后端，失败抛出 ApiError
- [x] `register()` 直接调用后端，失败抛出 ApiError
- [x] `quotes()` 级联策略：先 `/api/admin/quotes`，失败后 `/api/quotes/featured`
- [x] `groups()` 方法已移除
- [x] `adminUsers()` 直接调用 `/api/admin/users`
- [x] `loginLogs()` 直接调用 `/api/admin/login-logs`

## App.tsx
- [x] 无任何 `./mockData` 导入
- [x] `quotes` 初始状态为 `[]`
- [x] `adminUsers` 初始状态为 `[]`
- [x] `loginLogs` 初始状态为 `[]`
- [x] `createPeopleFromQuotes()` 空数据时返回 `[]`
- [x] ArchivePage selected 人物无 mockPeople 兜底

## types.ts
- [x] `GroupInfo` 类型已移除

## 编译验证
- [x] TypeScript 编译零错误（`tsc --noEmit` 通过）
