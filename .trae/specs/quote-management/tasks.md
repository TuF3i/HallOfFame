# Tasks

- [x] Task 1: 更新 Quotes Model 和 DAO
  - 1a: 给 `Quotes` 加 `IsFeatured bool` 字段，修复 `UserData` bson tag（`baon` -> `bson`）
  - 1b: DAO 新增方法：
    - `ListQuotes(ctx, filter, page, pageSize) -> ([]Quotes, int64, error)` — 通用分页查询，filter 支持 speaker, featured 条件
    - `ListSpeakers(ctx, page, pageSize) -> ([]SpeakerSummary, int64, error)` — 从 quotes 聚合去重获取发言者列表
    - `DeleteQuotesBySpeaker(ctx, qqNumber) -> (int64, error)` — 删除某个发言者的所有发言，返回删除数量
    - `UpdateQuoteFeatured(ctx, qid, featured bool) error` — 更新精华状态
    - `GetQuotesBySpeaker(ctx, qqNumber, page, pageSize) -> ([]Quotes, int64, error)` — 按发言者分页查询
    - `GetFeaturedQuotes(ctx, page, pageSize) -> ([]Quotes, int64, error)` — 获取精华发言
    - 修正已有的 `AddQuote` 等方法使用正确的字段名

- [x] Task 2: 创建 DTO
  - `internal/dto/quote.go` 定义：
    - 请求 DTO: `CreateQuoteReq`（含 UserMeta、GroupData 等字段）, `SetFeaturedReq`
    - 响应 DTO: `QuoteResp`, `SpeakerResp`, `PageResult[T]`（含 Items, Total, Page, PageSize）
    - 转换函数: `QuoteToDTO`, `QuoteToDTOList`

- [x] Task 3: 创建 Quote Handler
  - `internal/handler/quote/quote.go` — `QuoteHandler` 结构体（Dao, Storage 依赖）
  - `internal/handler/quote/handler.go` — 9 个 handler 方法

- [x] Task 4: 更新 Router
  - `internal/router/router.go` — 新增 Quote 公开路由和 Admin Quote 路由
  - 增加 `quoteHandler *quote.QuoteHandler` 参数

- [x] Task 5: 更新 Engine 和 main.go
  - `internal/engine/root.go` — EngineReliance 增加 `Storage *storage.Storage`
  - `internal/engine/client.go` — Start 增加 `quoteHandler *quote.QuoteHandler` 参数
  - `cmd/server/main.go` — 初始化 Storage 并传递给 Engine
