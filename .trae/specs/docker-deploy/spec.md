# Docker 部署 Spec

## Why
项目目前没有容器化部署方案，需要将前后端整合到同一端口，并支持 Docker / docker-compose / Helm 三种部署方式。

## What Changes
- 后端引擎支持 Serving 前端静态文件（SPA fallback），访问 8080 的 `/` 进前端，`/api` 走后端
- 配置加载支持从本地 JSON 文件读取（`CONFIG_PATH` 环境变量），无需依赖 etcd
- 写 Dockerfile（多阶段构建）
- 写 docker-compose.yml（含所有依赖服务）
- 写 Helm Chart（deployments/）

## Impact
- Affected code: `internal/engine/client.go`, `cmd/root.go`
- New files: `Dockerfile`, `deployments/docker-compose.yml`, `deployments/helm/`

## ADDED Requirements

### Requirement: 前后端同端口部署
系统 SHALL 在 8080 端口同时 serve 前端静态文件和 `/api` 后端接口。

#### Scenario: 访问根路径进前端
- **WHEN** 浏览器访问 `http://host:8080/`
- **THEN** 返回 `index.html`

#### Scenario: SPA client-side routing
- **WHEN** 浏览器访问 `http://host:8080/admin`（非 API 路径）
- **THEN** 返回 `index.html`（fallback）

#### Scenario: API 路径走后端
- **WHEN** 访问 `http://host:8080/api/auth/login`
- **THEN** 走后端路由处理

### Requirement: 配置从本地 JSON 加载
系统 SHALL 支持通过 `CONFIG_PATH` 环境变量指定本地 JSON 配置文件路径。
