package server

import (
	"os"
	"os/signal"
	"syscall"

	"halloffame/internal/admin/handler"
	"halloffame/internal/middleware"
	quoteDao "halloffame/internal/quote/dao"
	quoteHandler "halloffame/internal/quote/handler"
	"halloffame/internal/user/dao"
	userHandler "halloffame/internal/user/handler"
	mongoInfra "halloffame/infrastructures/mongo"
	"halloffame/infrastructures/postgres"
	"halloffame/infrastructures/redis"
	"halloffame/infrastructures/sqlite"
	infraMinio "halloffame/infrastructures/minio"
	"halloffame/pkg/env"
	"halloffame/pkg/storage"
	"halloffame/pkg/tokenstore"

	"github.com/cloudwego/hertz/pkg/app/server"
)

var hz *server.Hertz

func RunServer() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	e := env.GetEnv()
	onCreate(e)

	<-quit
	onDestroy()
}

func onCreate(e *env.BasicEnv) {
	// ============================================================
	// 1. 基础设施 — 客户端初始化 (函数式选项模式)
	// ============================================================

	// MongoDB (必选 — 启动失败即退出)
	mongoClient, err := mongoInfra.NewMongoClient(
		mongoInfra.WithURI(e.MongoURI),
		mongoInfra.WithDatabase(e.MongoDBName),
	)
	if err != nil {
		panic("MongoDB connection failed (required): " + err.Error())
	}

	// PostgreSQL (可选 — 失败则降级 SQLite)
	gormDB, pgErr := postgres.NewPostgresClient(
		postgres.WithHost(e.PostgresHost),
		postgres.WithPort(e.PostgresPort),
		postgres.WithUser(e.PostgresUser),
		postgres.WithPassword(e.PostgresPassword),
		postgres.WithDB(e.PostgresDB),
		postgres.WithSSLMode(e.PostgresSSLMode),
	)
	if pgErr != nil {
		// 降级 SQLite
		gormDB, pgErr = sqlite.NewSqliteClient(
			sqlite.WithPath(e.SQLitePath),
		)
		if pgErr != nil {
			panic("SQLite fallback also failed: " + pgErr.Error())
		}
	}

	// Redis (可选 — 失败则降级内存)
	var tokenStore tokenstore.TokenStore
	redisClient, redisErr := redis.NewRedisClient(
		redis.WithAddr(e.RedisAddr),
		redis.WithPassword(e.RedisPassword),
		redis.WithDB(e.RedisDB),
	)
	if redisErr == nil && e.RedisAddr != "" {
		tokenStore = tokenstore.NewRedisStoreFromClient(redisClient)
	} else {
		tokenStore = tokenstore.NewMemoryStore()
	}

	// MinIO (可选 — 失败或未配置则降级本地存储)
	var fileStore storage.Storage
	if e.StorageDriver == "minio" && e.MinioEndpoint != "" {
		minioClient, minioErr := infraMinio.NewMinioClient(
			infraMinio.WithEndpoint(e.MinioEndpoint),
			infraMinio.WithAccessKey(e.MinioAccessKey),
			infraMinio.WithSecretKey(e.MinioSecretKey),
			infraMinio.WithBucket(e.MinioBucket),
			infraMinio.WithUseSSL(e.MinioUseSSL),
		)
		if minioErr == nil {
			fileStore = storage.NewMinioStore(minioClient, e.MinioBucket, e.MinioEndpoint, e.MinioUseSSL)
		} else {
			fileStore = storage.NewLocalStore(e.LocalDataDir + "/uploads")
		}
	} else {
		fileStore = storage.NewLocalStore(e.LocalDataDir + "/uploads")
	}

	// ============================================================
	// 2. 自动建表 (GORM AutoMigrate)
	// ============================================================
	dao.AutoMigrate(gormDB)

	// ============================================================
	// 3. DAO 层 — Reliance 构造器注入
	// ============================================================
	userDao := dao.NewUserDao(&dao.UserDaoReliance{DB: gormDB})
	loginLogDao := dao.NewLoginLogDao(&dao.LoginLogDaoReliance{DB: gormDB})
	whitelistDao := dao.NewWhitelistDao(&dao.WhitelistDaoReliance{DB: gormDB})

	quoteDaoObj := quoteDao.NewQuoteDao(&quoteDao.QuoteDaoReliance{Mongo: mongoClient})
	qqGroupDao := quoteDao.NewQQGroupDao(&quoteDao.QQGroupDaoReliance{Mongo: mongoClient})

	// ============================================================
	// 4. Handler 层 — Reliance 构造器注入
	// ============================================================
	uHandler := userHandler.NewUserHandler(&userHandler.UserHandlerReliance{
		UserDao:            userDao,
		WhitelistDao:       whitelistDao,
		LoginLogDao:        loginLogDao,
		TokenStore:         tokenStore,
		JWTSecret:          e.JWTSecret,
		GitHubClientID:     e.GitHubClientID,
		GitHubClientSecret: e.GitHubClientSecret,
		GitHubRedirectURL:  e.GitHubRedirectURL,
	})

	qHandler := quoteHandler.NewQuoteHandler(&quoteHandler.QuoteHandlerReliance{
		QuoteDao:   quoteDaoObj,
		QQGroupDao: qqGroupDao,
		Storage:    fileStore,
	})

	aHandler := handler.NewAdminHandler(&handler.AdminHandlerReliance{
		UserDao:      userDao,
		WhitelistDao: whitelistDao,
		LoginLogDao:  loginLogDao,
	})

	// ============================================================
	// 5. 中间件
	// ============================================================
	mw := middleware.NewMiddleware(&middleware.MiddlewareReliance{
		JWTSecret:  e.JWTSecret,
		TokenStore: tokenStore,
	})

	// ============================================================
	// 6. Hertz Server
	// ============================================================
	hz = server.New(server.WithHostPorts(":" + itoa(e.Port)))

	// 静态文件服务 (for uploaded files in local mode)
	hz.Static("/uploads", e.LocalDataDir+"/uploads")

	// 注册路由
	uHandler.RegisterRoutes(hz, mw)
	qHandler.RegisterRoutes(hz, mw)
	aHandler.RegisterRoutes(hz, mw)

	hz.Spin()
}

func onDestroy() {
	if hz != nil {
		hz.Close()
	}
}

func itoa(i int) string {
	if i == 0 {
		return "8888"
	}
	s := ""
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}
