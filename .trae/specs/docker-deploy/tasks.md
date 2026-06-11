# Tasks

## Task 1: 后端 — 前后端整合 + 配置优化
- [x] 修改 `cmd/root.go`：`loadConfig()` 优先检查 `CONFIG_PATH` 环境变量，若存在则使用 `LoadFromFile()` 加载本地 JSON
- [x] 修改 `internal/engine/client.go`：读取 `FRONTEND_DIR` 环境变量，若存在则注册 `/*filepath` 路由，serve 前端静态文件并支持 SPA fallback（非 /api 路径丢失时返回 index.html）
- [x] `go build ./...` 编译通过

## Task 2: Dockerfile — 多阶段构建
- [x] 创建 `Dockerfile`：Stage 1 构建前端（node），Stage 2 编译后端（go），Stage 3 运行时（alpine）合并产物
- [x] 测试 `docker build` 能成功

## Task 3: docker-compose — 本地部署
- [x] 创建 `deployments/docker-compose.yml`：包含 PostgreSQL、Redis、MongoDB、MinIO 服务 + app 容器
- [x] 创建 `deployments/config.json`：docker-compose 默认配置

## Task 4: Helm — Kubernetes 部署
- [x] 创建 `deployments/helm/Chart.yaml`
- [x] 创建 `deployments/helm/values.yaml`（可配置所有服务地址、端口）
- [x] 创建 `deployments/helm/templates/deployment.yaml`
- [x] 创建 `deployments/helm/templates/service.yaml`
- [x] 创建 `deployments/helm/templates/configmap.yaml`

# Task Dependencies
- Task 2, 3, 4 可并行
- Task 2 depends on Task 1（Dockerfile 内 go build 需要最新代码）
