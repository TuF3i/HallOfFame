# Checklist

- [x] 后端 `page_size` 上限已从 100 提高到 10000
- [x] OpenAPI 规范中 `page_size` maximum 值已同步更新
- [x] `api.listSpeakersAll()` 可一次获取全部发言者
- [x] `api.featuredQuotesAll()` 可一次获取全部精华言论
- [x] Mock API 中的 `listSpeakersAll()` 和 `featuredQuotesAll()` 方法已添加
- [x] `QuotePerson.featuredQuote` 和 `history` 已改为可选字段
- [x] 页面初始加载不再调用 `api.quotes()`，改为并发调用 `listSpeakersAll()` 和 `featuredQuotesAll()`
- [x] `people` 由 `allSpeakers` 构建，展示全部发言者（无 8 人限制）
- [x] `featuredQuoteIds` 由精华言论数据计算
- [x] 登录后加载逻辑与初始加载保持一致
- [x] `handleRefreshQuotes` 同时刷新 speakers 和 featured quotes
- [x] AdminDashboard 的言论管理标签页在切换时自行加载言论数据，不依赖 App 传入的 `quotes` prop
- [x] AdminDashboard 中删除 / 切换精华操作正确更新本地 `adminQuotes` 状态
- [x] 点击发言者卡片时分页加载该发言者的言论（原有逻辑不变）
- [x] 点击精华卡片时分页加载精华言论详情（原有逻辑不变）
- [x] 构建无错误（npm run build 通过）
