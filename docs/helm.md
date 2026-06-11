# Helm 部署指南

## 前提条件

- Kubernetes 集群（v1.25+）
- Helm v3
- 集群内已部署以下外部服务（HallOfFame 不通过 Helm 管理它们）：
  - **Etcd** — 配置中心
  - **PostgreSQL** — 用户数据
  - **Redis** — 缓存 + 消息队列
  - **MongoDB** — 金句存储
  - **MinIO** — 附件存储
- Ingress Controller（如 nginx-ingress）

## 快速部署

### 1. 准备 Etcd 配置

将配置写入 Etcd 的 `/halloffame/config` 键（参考 [deploy.md](deploy.md) 中的配置格式），各服务地址填写 K8s 内部 Service 域名：

```bash
etcdctl put /halloffame/config '{
  "hertzConf": {"listenAddr": "0.0.0.0", "webApiListerPort": 8080, "botApiListenPort": 9090},
  "redisConf":    {"addr": "redis.default.svc.cluster.local", "port": 6379, "password": "", "db": 0},
  "mongoDBConf":  {"addr": "mongodb.default.svc.cluster.local", "port": 27017, "database": "halloffame", "username": "mongodb", "password": "mongodb"},
  "postgreSQLConf": {"addr": "postgres.default.svc.cluster.local", "port": 5432, "database": "halloffame", "username": "halloffame", "password": "halloffame"},
  "minioConf":    {"addr": "minio.default.svc.cluster.local", "port": 9000, "username": "minioadmin", "password": "minioadmin", "bucket": "halloffame"},
  "llmConf":      {"provider": "openai", "apiKey": "sk-xxx", "baseURL": "https://api.deepseek.com/v1", "model": "deepseek-chat", "batchSize": 300, "maxResults": 15}
}'
```

### 2. 构建镜像

```bash
docker build -t halloffame:latest .
```

将镜像推送到集群可访问的镜像仓库。

### 3. 安装

```bash
# 仅集群内部访问
helm install halloffame ./deployments/helm \
  --set etcd.addr=etcd.default.svc.cluster.local \
  --set etcd.port=2379

# 启用 Ingress（对外暴露 Web 界面）
helm install halloffame ./deployments/helm \
  --set etcd.addr=etcd.default.svc.cluster.local \
  --set ingress.enabled=true \
  --set ingress.host=halloffame.your-domain.com
```

也可以先编写 `my-values.yaml` 文件再安装：

```yaml
# my-values.yaml
replicaCount: 2

image:
  repository: registry.example.com/halloffame
  tag: v1.0.0
  pullPolicy: Always

service:
  type: ClusterIP
  webPort: 8080
  botPort: 9090

ingress:
  enabled: true
  className: traefik
  host: halloffame.example.com
  annotations: {}

etcd:
  addr: etcd.default.svc.cluster.local
  port: 2379

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

```bash
helm install halloffame ./deployments/helm -f my-values.yaml
```

### 4. 验证

```bash
# 检查 Pod 状态
kubectl get pods -l app.kubernetes.io/name=halloffame

# 检查 Service
kubectl get svc halloffame

# 检查 Ingress（如果启用）
kubectl get ingress halloffame
```

## K8s 内部 Service 域名

部署后，可通过以下域名在集群内访问服务：

| 用途 | 域名 | 端口 |
|------|------|------|
| Web API + 前端界面 | `<release-name>.<namespace>.svc.cluster.local` | 8080 |
| Bot API | `<release-name>.<namespace>.svc.cluster.local` | 9090 |

**示例**（默认 namespace、release 名 `halloffame`）：

```
# Web API（浏览器访问、前端调用）
halloffame.default.svc.cluster.local:8080

# Bot API（QQ 机器人上报消息）
halloffame.default.svc.cluster.local:9090
```

### Bot API 上报示例

```bash
curl -X POST http://halloffame.default.svc.cluster.local:9090/api/bot/upload \
  -F qqgroup=123456 \
  -F qqnumber=789012 \
  -F speaker="发言人昵称" \
  -F content="发言内容"
```

### 直写导入示例

```bash
curl -X POST http://halloffame.default.svc.cluster.local:9090/api/bot/import \
  -F qqgroup=123456 \
  -F qqnumber=789012 \
  -F speaker="发言人昵称" \
  -F content="发言内容"
```

## 可配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `replicaCount` | 副本数 | `1` |
| `image.repository` | 镜像仓库地址 | `halloffame` |
| `image.tag` | 镜像标签 | `latest` |
| `image.pullPolicy` | 镜像拉取策略 | `IfNotPresent` |
| `service.type` | Service 类型 | `ClusterIP` |
| `service.webPort` | Web API 端口 | `8080` |
| `service.botPort` | Bot API 端口 | `9090` |
| `ingress.enabled` | 是否启用 Ingress | `false` |
| `ingress.className` | Ingress Class | `traefik` |
| `ingress.host` | Ingress 域名 | `halloffame.example.com` |
| `ingress.annotations` | Ingress 注解 | `{}` |
| `etcd.addr` | Etcd 地址 | `halloffame-etcd` |
| `etcd.port` | Etcd 端口 | `2379` |
| `resources.limits.cpu` | CPU 上限 | `500m` |
| `resources.limits.memory` | 内存上限 | `512Mi` |
| `resources.requests.cpu` | CPU 请求 | `100m` |
| `resources.requests.memory` | 内存请求 | `128Mi` |

## 升级

```bash
helm upgrade halloffame ./deployments/helm --set image.tag=v0.2.0
```

## 卸载

```bash
helm uninstall halloffame
```
