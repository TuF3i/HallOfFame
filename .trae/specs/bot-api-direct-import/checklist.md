# Checklist

- [ ] BotHandler 增加 Dao 依赖
- [ ] Import 方法解析 multipart/form-data 正确
- [ ] 必填字段校验（qqgroup/qqnumber/speaker/content）
- [ ] 附件上传到 MinIO（可选）
- [ ] 发言直接写入 MongoDB（dao.AddQuote）
- [ ] 响应返回 Quote DTO
- [ ] 路由注册 `POST /api/bot/import`
- [ ] cmd/server.go 传入 Dao 实例
- [ ] docs/api.md 新增 import 接口说明
- [ ] api/openapi.yaml 新增 import 接口定义
- [ ] `go build ./...` 编译通过
