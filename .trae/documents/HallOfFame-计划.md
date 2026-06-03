# HallOfFame 名人堂 - 实施计划

## 1. 概要

基于 **Go + Hertz** 后端与 **React** 前端，构建一个展示 QQ 群精彩言论的"名人堂"网站。采用从 [Seckill](https://github.com/TuF3i/Seckill) 项目学到的 **Reliance 结构体 + 构造器注入** 的依赖注入模式。

## 2. 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| HTTP 框架 | Hertz | 主 API 服务器 + Bot 无鉴权服务器 |
| 数据库 | MongoDB | **必选** — 存储发言/言论数据 |
| 关系型 DB | PostgreSQL / SQLite (GORM) | 用户/登录日志/白名单；PG 未配置降级 SQLite |
| 缓存 | Redis / 内存 | Token 管理；Redis 未配置降级内存 |
| 对象存储 | MinIO / 本地目录 | 图片存储；MinIO 未配置降级 `/app/data` |
| 命令行 | Cobra | 统一启动入口 |
| 前端 | React | 基础 SPA |
| 部署 | Docker Compose + Helm | 容器化 + Kubernetes |

## 3. 项目结构

```
d:\R\HallOfFame\
├── cmd/
│   └── halloffame/            # Cobra 入口
│       └── main.go
├── internal/
│   ├── server/                # 主 API 服务器 (Hertz)
│   │   └── runc.go            # DI 组合根
│   ├── botsvr/                # Bot 无鉴权服务器 (Hertz, 另起端口)
│   │   └── runc.go
│   ├── user/                  # 用户领域
│   │   ├── handler/
│   │   ├── dao/
│   │   └── models/
│   ├── quote/                 # 言论领域
│   │   ├── handler/
│   │   ├── dao/
│   │   └── models/
│   ├── admin/                 # 管理员后台
│   │   └── handler/
│   └── middleware/            # 共享中间件
│       └── jwt.go
├── infrastructures/           # 基础设施层 (函数式选项模式)
│   ├── redis/
│   ├── postgres/
│   ├── sqlite/
│   ├── mongo/
│   └── minio/
├── pkg/                       # 公共工具
│   ├── config/
│   ├── env/
│   ├── jwt/
│   ├── storage/               # 存储抽象 (MinIO / 本地文件)
│   └── tokenstore/            # Token 存储抽象 (Redis / 内存)
├── web/                       # React 前端
│   ├── src/
│   └── package.json
├── api/                       # 接口文档 (OpenAPI 3.0)
│   └── openapi.yaml
├── configs/                   # 配置模板
│   └── config.yaml
├── deployments/
│   ├── docker-compose/
│   │   └── docker-compose.yaml
│   └── helm/                  # Helm Chart
└── docs/                      # 部署文档
    └── deployment.md
```

## 4. 依赖注入模式 (DI Pattern)

完整沿用 Seckill 的 **Reliance 结构体 + 构造器注入** 模式：

### 4.1 基础设施层 — 函数式选项模式

```go
// infrastructures/mongo/client.go
type Option func(info *BasicInfo)
func WithHost(host string) Option {
    return func(info *BasicInfo) { info.Host = host }
}
func NewMongoClient(opts ...Option) (*mongo.Client, error) {
    info := &BasicInfo{Host: "localhost", Port: "27017"}
    for _, opt := range opts { opt(info) }
    // ...
}
```

同样模式用于: `redis/client.go`, `postgres/client.go`, `sqlite/client.go`, `minio/client.go`

### 4.2 业务层 — Reliance 结构体

Each layer (dao, handler) follows the same triple:

```go
// xxx_init.go — 声明依赖 + 构造器
type FooDaoReliance struct {
    DB *mongo.Database            // 声明依赖
}
type FooDao struct {
    *FooDaoReliance               // 嵌入
}
func NewFooDao(r *FooDaoReliance) *FooDao {
    return &FooDao{r}
}

// xxx.go — 业务方法，通过嵌入访问依赖
func (r *FooDao) FindByID(id string) (*Model, error) {
    return r.DB.Collection("foos").FindOne(...)
}
```

### 4.3 DI 组合根 (Composition Root)

集中在 `internal/server/runc.go` 的 `onCreate()` 中完成所有装配：

```go
func onCreate(env *configs.BasicEnv) {
    // 1. 基础设施
    mongoClient := mongo.NewMongoClient(...)
    pgClient, pgErr := postgres.NewPostgresClient(...)
    redisClient, redisErr := redis.NewRedisClient(...)
    minioClient, minioErr := minio.NewMinioClient(...)
    sqliteClient := sqlite.NewSqliteClient(...)  // 始终可用

    // 2. 退化策略
    db := pgClient       // 优先 PG
    if pgErr != nil {
        db = sqliteClient  // 降级 SQLite
    }
    tokenStore := tokenstore.NewRedisStore(redisClient)
    if redisErr != nil {
        tokenStore = tokenstore.NewMemoryStore()  // 降级内存
    }
    storage := storage.NewMinioStore(minioClient)
    if minioErr != nil {
        storage = storage.NewLocalStore("/app/data")  // 降级本地
    }

    // 3. DAO 层
    userDao := userDao.NewUserDao(&userDao.UserDaoReliance{DB: db})
    loginLogDao := loginLogDao.NewLoginLogDao(&loginLogDao.LoginLogDaoReliance{DB: db})
    quoteDao := quoteDao.NewQuoteDao(&quoteDao.QuoteDaoReliance{Mongo: mongoClient})

    // 4. Handler 层
    userHandler := userHandler.NewUserHandler(&userHandler.UserHandlerReliance{
        UserDao: userDao, TokenStore: tokenStore, ...
    })
    quoteHandler := quoteHandler.NewQuoteHandler(&quoteHandler.QuoteHandlerReliance{
        QuoteDao: quoteDao, Storage: storage, ...
    })

    // 5. Server
    h := server.NewHertz()
    // register routes...
    h.Spin()
}
```

## 5. 数据模型

### 5.1 User (PostgreSQL/SQLite — GORM)

```go
type User struct {
    ID        uint      `gorm:"primaryKey"`
    GitHubID  string    `gorm:"uniqueIndex"`
    Nickname  string
    AvatarURL string
    Email     string
    Role      string    // "owner", "admin", "user", "banned"
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### 5.2 Whitelist (PostgreSQL/SQLite — GORM)

```go
type Whitelist struct {
    ID        uint   `gorm:"primaryKey"`
    GitHubID  string `gorm:"uniqueIndex"`
    AddedBy   uint   // User.ID
    CreatedAt time.Time
}
```

### 5.3 LoginLog (PostgreSQL/SQLite — GORM)

```go
type LoginLog struct {
    ID        uint      `gorm:"primaryKey"`
    UserID    uint      `gorm:"index"`
    IP        string
    UserAgent string
    Success   bool
    FailReason string
    CreatedAt time.Time
}
```

### 5.4 Quote (MongoDB — 必选)

```go
type Quote struct {
    ID        primitive.ObjectID   `bson:"_id"`
    QQGroup   string               `bson:"qq_group"`
    Speaker   string               `bson:"speaker"`
    Content   string               `bson:"content"`     // Markdown
    Images    []string             `bson:"images"`      // 图片 URL 列表
    IsFeatured bool                `bson:"is_featured"`
    CreatedBy uint                 `bson:"created_by"`  // User.ID
    CreatedAt time.Time            `bson:"created_at"`
    UpdatedAt time.Time            `bson:"updated_at"`
    DeletedAt *time.Time           `bson:"deleted_at,omitempty"` // 软删除
}
```

### 5.5 QQGroup (MongoDB — 必选)

```go
type QQGroup struct {
    ID          primitive.ObjectID `bson:"_id"`
    Name        string             `bson:"name"`
    Description string             `bson:"description"`
    CreatedAt   time.Time          `bson:"created_at"`
}
```

## 6. API 设计

### 6.1 主服务器 (端口 8888)

```
GitHub OIDC 登录流程:
  GET  /api/v1/auth/github/login    → 302 跳转到 GitHub OAuth
  GET  /api/v1/auth/github/callback → 回调处理, 返回 JWT

需要鉴权的接口 (JWT Bearer Token):

用户:
  POST   /api/v1/auth/refresh       → 刷新 Token
  GET    /api/v1/user/profile       → 获取当前用户信息

言论 (Quote):
  GET    /api/v1/quotes             → 列表 (分页, 支持 qq_group, is_featured, time 过滤)
  GET    /api/v1/quotes/:id         → 详情
  POST   /api/v1/quotes             → 添加 (需要 user 及以上权限)
  PUT    /api/v1/quotes/:id         → 编辑 (本人 或 admin)
  DELETE /api/v1/quotes/:id         → 删除 (软删除, 本人 或 admin)
  PUT    /api/v1/quotes/:id/feature → 设置/取消精华 (admin 及以上)
  POST   /api/v1/quotes/:id/images  → 上传图片 (multipart)

QQ 群:
  GET    /api/v1/groups             → 列表

管理员 (需要 admin 及以上权限):
  GET    /api/v1/admin/users        → 用户列表
  PUT    /api/v1/admin/users/:id/role → 修改角色
  GET    /api/v1/admin/whitelist    → 白名单列表
  POST   /api/v1/admin/whitelist    → 添加白名单
  DELETE /api/v1/admin/whitelist/:id → 移除白名单
  GET    /api/v1/admin/login-logs   → 登录日志 (分页)
```

### 6.2 Bot 服务器 (端口 8889 — 无鉴权)

```
  POST   /api/v1/bot/quotes             → 添加言论
  POST   /api/v1/bot/quotes/:id/images  → 上传图片
  GET    /api/v1/bot/groups             → 获取群列表
```

Bot 接口通过来源 IP 白名单或预设 Token (通过环境变量 `BOT_API_TOKEN` 配置) 进行简单防护。

## 7. 实施步骤

### Phase 1: 项目骨架与基础设施

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.1 | 初始化 Go Module + 安装依赖 | `go.mod`, `go.sum` | `go mod init halloffame`, 安装 hertz, gorm, mongo-driver, cobra 等 |
| 1.2 | 配置加载 | `pkg/env/`, `pkg/config/` | 从环境变量读取配置, `Config` 结构体含所有组件配置 |
| 1.3 | MongoDB 客户端 | `infrastructures/mongo/client.go` | 函数式选项模式, 创建 `*mongo.Client` |
| 1.4 | PostgreSQL 客户端 | `infrastructures/postgres/client.go` | 函数式选项模式, 创建 `*gorm.DB` |
| 1.5 | SQLite 客户端 | `infrastructures/sqlite/client.go` | 函数式选项模式, 创建 `*gorm.DB` (始终可用) |
| 1.6 | Redis 客户端 | `infrastructures/redis/client.go` | 函数式选项模式, 创建 `*redis.Client` |
| 1.7 | MinIO 客户端 | `infrastructures/minio/client.go` | 函数式选项模式, 创建 `*minio.Client` |
| 1.8 | Token 存储抽象 | `pkg/tokenstore/` | `TokenStore` 接口 + `RedisStore` / `MemoryStore` 实现 |
| 1.9 | 文件存储抽象 | `pkg/storage/` | `Storage` 接口 + `MinioStore` / `LocalStore` 实现 |
| 1.10 | Cobra 入口 | `cmd/halloffame/main.go` | 解析命令行, 调用 `server.RunServer()` |

### Phase 2: 用户系统

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.1 | User 数据模型 | `internal/user/models/` | GORM Model |
| 2.2 | Whitelist 数据模型 | `internal/user/models/` | GORM Model |
| 2.3 | LoginLog 数据模型 | `internal/user/models/` | GORM Model |
| 2.4 | User DAO | `internal/user/dao/` | 增删改查, Reliance 模式注入 `*gorm.DB` |
| 2.5 | LoginLog DAO | `internal/user/dao/` | 插入 + 分页查询 |
| 2.6 | Whitelist DAO | `internal/user/dao/` | 增删改查 |
| 2.7 | JWT 工具 | `pkg/jwt/` | 生成/验证 AccessToken + RefreshToken |
| 2.8 | GitHub OIDC 集成 | `internal/user/handler/` | OAuth 登录 + 回调 |
| 2.9 | User Handler | `internal/user/handler/` | 注册路由, 组装 Reliance |
| 2.10 | 登录白名单检查 | `internal/middleware/` | 在 JWT 中间件中检查 |
| 2.11 | 自动建表 | `pkg/config/` | GORM AutoMigrate |

### Phase 3: 言论系统 (Quote)

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.1 | Quote 数据模型 | `internal/quote/models/` | MongoDB Model (bson tags) |
| 3.2 | QQGroup 数据模型 | `internal/quote/models/` | MongoDB Model |
| 3.3 | Quote DAO | `internal/quote/dao/` | CRUD + 分页 + 过滤 + 软删除 |
| 3.4 | QQGroup DAO | `internal/quote/dao/` | 增删改查 |
| 3.5 | Quote Handler | `internal/quote/handler/` | 路由注册, Markdown 渲染 API |
| 3.6 | 图片上传接口 | `internal/quote/handler/` | multipart 上传 + 调用 Storage |

### Phase 4: 管理员后台

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.1 | Admin Handler | `internal/admin/handler/` | 用户管理/白名单/日志路由 |
| 4.2 | 权限中间件 | `internal/middleware/auth.go` | Role-Based 鉴权 (admin/owner) |

### Phase 5: 主服务器 + Bot 服务器

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 5.1 | 主服务器组合根 | `internal/server/runc.go` | 完整 DI 装配 + Hertz 路由注册 |
| 5.2 | Bot 服务器组合根 | `internal/botsvr/runc.go` | 简易 DI 装配, 另起端口 8889 |
| 5.3 | Bot 无鉴权 API | `internal/botsvr/handler/` | 添加言论/上传图片/群列表 |

### Phase 6: 前端

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 6.1 | React 项目初始化 | `web/` | `npx create-react-app` 或 Vite |
| 6.2 | 登录页面 | `web/src/pages/Login.tsx` | GitHub OAuth 跳转 |
| 6.3 | 言论列表页 | `web/src/pages/Quotes.tsx` | Markdown 渲染, 分页过滤 |
| 6.4 | 言论详情页 | `web/src/pages/QuoteDetail.tsx` | 完整显示 + 图片 |
| 6.5 | 管理员页面 | `web/src/pages/Admin.tsx` | 用户/白名单/日志管理 |
| 6.6 | 导航与布局 | `web/src/App.tsx` | 路由 + 通用布局 |

### Phase 7: 部署配置

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 7.1 | Dockerfile | `Dockerfile` | 多阶段构建 (Go 编译 + 前端构建) |
| 7.2 | Docker Compose | `deployments/docker-compose/docker-compose.yaml` | MongoDB + Redis + MinIO + App |
| 7.3 | Helm Chart | `deployments/helm/` | Kubernetes 部署 |
| 7.4 | 接口文档 | `api/openapi.yaml` | OpenAPI 3.0 格式 |

## 8. 退化策略 (Degradation Strategy)

| 组件 | 配置缺失时 | 行为 |
|------|-----------|------|
| PostgreSQL | `DB_DRIVER=sqlite` / 无 PG 配置 | 自动使用 SQLite (`/app/data/halloffame.db`) |
| Redis | `REDIS_ENABLED=false` / 无 Redis 配置 | Token 存储在内存 (`sync.Map`) |
| MinIO | `STORAGE_DRIVER=local` / 无 MinIO 配置 | 图片存入 `/app/data/uploads/` |
| MongoDB | 无 MongoDB 配置 | **启动失败** — 必须配置 |

## 9. 关键设计决策

1. **不使用 DI 框架** — 纯手工 Reliance 模式 + 函数式选项，保持零外部 DI 依赖
2. **MongoDB 为必选** — 因为 Quote 数据有柔性 Schema 需求 (Markdown + 可变数量图片)
3. **Bot 服务器独立端口** — 无鉴权 API 与主 API 物理隔离，通过不同端口暴露
4. **SQLite 作为 PG 降级** — 开发环境无需启动 PostgreSQL，降低上手门槛
5. **前后面分离** — Go 后端只提供 API，React 前端独立构建，通过 nginx 或 CORS 连接

## 10. 验证步骤

1. `cd cmd/halloffame && go build .` — 编译通过
2. `docker compose up` — 所有容器正常启动
3. 访问 `http://localhost:8888/api/v1/quotes` — API 返回 JSON
4. 访问 `http://localhost:5173` — 前端页面加载
5. `go vet ./...` — 无 vet 错误
6. 启动时验证各退化策略 (关闭 PG / Redis / MinIO 分别测试)
