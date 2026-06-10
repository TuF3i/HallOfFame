# Checklist

- [x] BotHandler 增加 Dao 依赖
- [x] Import 方法解析 multipart/form-data 正确
- [x] 必填字段校验（qqgroup/qqnumber/speaker/content）
- [x] 附件上传到 MinIO（可选）
- [x] 发言直接写入 MongoDB（dao.AddQuote）
- [x] 响应返回 Quote DTO
- [x] 路由注册 `POST /api/bot/import`
- [x] cmd/server.go 传入 Dao 实例
- [x] docs/api.md 新增 import 接口说明
- [x] api/openapi.yaml 新增 import 接口定义
- [x] `go build ./...` 编译通过
