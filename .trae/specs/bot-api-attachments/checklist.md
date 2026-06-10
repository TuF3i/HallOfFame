# Checklist

- [x] BotHandler 增加 Storage 依赖
- [x] Upload 方法使用 multipart/form-data 解析
- [x] qqgroup/qqnumber/speaker/content 等字段从 form value 正确读取
- [x] files 字段支持多文件上传到 MinIO
- [x] BotUploadMsg 包含 AttachmentIDs 字段
- [x] 无附件时 attachment_ids 为空数组
- [x] cmd/server.go 传入 Storage 实例
- [x] docs/api.md 更新为 multipart/form-data 格式说明
- [x] api/openapi.yaml 更新 requestBody 为 multipart/form-data
- [x] `go build ./...` 编译通过
