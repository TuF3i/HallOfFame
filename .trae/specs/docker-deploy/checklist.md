# Checklist

- [x] `cmd/root.go` 支持 `CONFIG_PATH` 环境变量加载本地 JSON
- [x] `internal/engine/client.go` 注册前端静态文件路由 + SPA fallback
- [x] `/` 路由返回 index.html
- [x] 非 API 路径返回 index.html（SPA fallback）
- [x] `/api/*` 路径不受 static handler 影响
- [x] `go build ./...` 编译通过
- [x] Dockerfile 多阶段构建成功
- [x] docker-compose.yml 包含所有依赖服务
- [x] docker-compose 默认配置文件正确
- [x] Helm Chart 结构完整（Chart.yaml, values.yaml, templates）
- [x] Helm templates 包含 Deployment, Service, ConfigMap
