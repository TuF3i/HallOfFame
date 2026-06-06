## Model & DAO
- [x] `Quotes` 结构体新增 `IsFeatured bool` 字段
- [x] `Quotes.UserData` 的 bson tag 已修复（`baon` → `bson`）
- [x] DAO 新增 `ListQuotes` 通用分页查询方法
- [x] DAO 新增 `ListSpeakers` 发言者聚合查询方法
- [x] DAO 新增 `DeleteQuotesBySpeaker` 批量删除方法
- [x] DAO 新增 `UpdateQuoteFeatured` 更新精华状态方法
- [x] DAO 新增 `GetQuotesBySpeaker` 按发言者查询方法
- [x] DAO 新增 `GetFeaturedQuotes` 获取精华发言方法

## DTO
- [x] `dto/quote.go` 定义了请求 DTO（CreateQuoteReq, SetFeaturedReq 等）
- [x] `dto/quote.go` 定义了响应 DTO（QuoteResp, SpeakerResp 等）
- [x] `dto/quote.go` 定义了 `PageResult[T]` 分页泛型
- [x] `dto/quote.go` 定义了转换函数（QuoteToDTO, QuoteToDTOList）

## Handler
- [x] `handler/quote/quote.go` QuoteHandler 结构体及构造函数
- [x] `ListSpeakers` — 发言者列表接口，分页
- [x] `ListSpeakerQuotes` — 按发言者查询发言，分页
- [x] `SetFeatured` — 设置精华，admin 权限
- [x] `DeleteQuote` — 删除发言及附件，admin 权限
- [x] `DeleteSpeaker` — 删除发言者及其所有发言及附件，admin 权限
- [x] `ListFeaturedQuotes` — 获取精华发言，分页
- [x] `ListAllQuotes` — 获取所有发言，分页，admin 权限
- [x] `CreateQuote` — 新建发言（multipart + 附件上传），admin 权限
- [x] `GetAttachment` — 获取附件图片

## Router & Engine
- [x] Route 注册：公开 Quote 路由 + Admin Quote 路由
- [x] EngineReliance 包含 Storage 依赖
- [x] Engine.Start 参数包含 QuoteHandler
- [x] main.go 初始化 Storage 并传递

## 编译验证
- [x] 项目编译通过 `go build ./...`
