# Tasks

- [x] Task 1: 后端放宽 `page_size` 上限
  - [x] 修改 `internal/handler/quote/quote.go` 中 `getPageParams` 函数，将 `page_size` 上限从 100 提高到 10000，使前端可以一次获取所有发言者和精华言论
  - [x] 同步更新 OpenAPI 规范 `api/openapi.yaml` 中 `page_size` 的 maximum 值

- [x] Task 2: 前端增加 `api.listSpeakersAll()` 和 `api.featuredQuotesAll()` 方法
  - [x] 在 `web/src/api.ts` 中新增 `listSpeakersAll()` 方法，调用 `listSpeakers(1, 10000)` 返回 `Speaker[]`
  - [x] 在 `web/src/api.ts` 中新增 `featuredQuotesAll()` 方法，调用 `featuredQuotes(1, 10000)` 返回 `Quote[]`
  - [x] Mock API 同步添加对应方法

- [x] Task 3: 调整 `QuotePerson` 类型
  - [x] 在 `web/src/types.ts` 中，将 `QuotePerson.featuredQuote` 改为可选字段 `featuredQuote?: Quote`
  - [x] 将 `QuotePerson.history` 改为可选字段 `history?: Quote[]`

- [x] Task 4: 重构 App 组件数据加载逻辑
  - [x] 新增 `allSpeakers` state 用于存储全量发言者
  - [x] 修改 `App` 组件初始化 `useEffect`：将 `api.quotes()` 替换为 `Promise.all([api.listSpeakersAll(), api.featuredQuotesAll()])`
  - [x] `quotes` state 仅存储精华言论
  - [x] 新增 `createPeopleFromSpeakers(speakers: Speaker[]): QuotePerson[]` 函数替换原有 `createPeopleFromQuotes`
    - [x] 移除 `.slice(0, 8)` 限制，展示全部发言者
    - [x] 使用 Speaker 字段构造 QuotePerson（`name` 取自 `speaker`，`quoteCount` 取自 `quote_count`，`qqGroup` 等不可用字段置为占位符）
  - [x] 修改 `people` 的 useMemo 依赖：从 `quotes` 改为 `allSpeakers`
  - [x] 修改 `featuredQuoteIds` 的 useMemo 依赖：保持依赖 `quotes`（精华数据）
  - [x] 修改 `handleAuthenticated` 中的登录后加载：与初始化加载保持一致
  - [x] 修改 `handleRefreshQuotes`：改为同时刷新 speakers 和 featured quotes

- [x] Task 5: AdminDashboard 言论管理标签独立加载数据
  - [x] 在 `AdminDashboard` 组件中添加本地 `adminQuotes` state，初始为空数组
  - [x] 当 `adminTab === 0` 时，通过 `useEffect` 调用 `api.quotes()` 加载数据
  - [x] 将本地过滤/分页逻辑的输入从 `quotes` prop 改为 `adminQuotes` state
  - [x] 删除和切换精华操作更新 `adminQuotes` 状态

- [x] Task 6: ArchivePage 精华卡片懒加载优化
  - [x] 精华卡片的 `quoteTotal` 初始显示为已加载的精华总数（来自 `quotes` state 长度）
  - [x] 当用户点击精华卡片时，按现有分页逻辑加载精华言论详情（不需要改动，已实现）

# Task Dependencies
- [Task 4] 依赖 [Task 1], [Task 2], [Task 3]
- [Task 5] 依赖 [Task 4]
- [Task 6] 可与 [Task 4] 并行
