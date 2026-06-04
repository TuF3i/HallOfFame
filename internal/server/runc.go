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
	"halloffame/pkg/env"
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
	mongoClient, err := mongoInfra.NewMongoClient(
		mongoInfra.WithURI(e.MongoURI),
		mongoInfra.WithDatabase(e.MongoDBName),
	)
	if err != nil {
		panic("MongoDB connection failed (required): " + err.Error())
	}

	gormDB, pgErr := postgres.NewPostgresClient(
		postgres.WithHost(e.PostgresHost),
		postgres.WithPort(e.PostgresPort),
		postgres.WithUser(e.PostgresUser),
		postgres.WithPassword(e.PostgresPassword),
		postgres.WithDB(e.PostgresDB),
		postgres.WithSSLMode(e.PostgresSSLMode),
	)
	if pgErr != nil {
		gormDB, pgErr = sqlite.NewSqliteClient(sqlite.WithPath(e.SQLitePath))
		if pgErr != nil {
			panic("SQLite fallback also failed: " + pgErr.Error())
		}
	}

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

	dao.AutoMigrate(gormDB)

	userDao := dao.NewUserDao(&dao.UserDaoReliance{DB: gormDB})
	loginLogDao := dao.NewLoginLogDao(&dao.LoginLogDaoReliance{DB: gormDB})
	whitelistDao := dao.NewWhitelistDao(&dao.WhitelistDaoReliance{DB: gormDB})

	quoteDaoObj := quoteDao.NewQuoteDao(&quoteDao.QuoteDaoReliance{Mongo: mongoClient})
	qqGroupDao := quoteDao.NewQQGroupDao(&quoteDao.QQGroupDaoReliance{Mongo: mongoClient})

	uHandler := userHandler.NewUserHandler(&userHandler.UserHandlerReliance{
		UserDao:      userDao,
		WhitelistDao: whitelistDao,
		LoginLogDao:  loginLogDao,
		TokenStore:   tokenStore,
		JWTSecret:    e.JWTSecret,
	})

	qHandler := quoteHandler.NewQuoteHandler(&quoteHandler.QuoteHandlerReliance{
		QuoteDao:   quoteDaoObj,
		QQGroupDao: qqGroupDao,
	})

	aHandler := handler.NewAdminHandler(&handler.AdminHandlerReliance{
		UserDao:      userDao,
		WhitelistDao: whitelistDao,
		LoginLogDao:  loginLogDao,
	})

	mw := middleware.NewMiddleware(&middleware.MiddlewareReliance{
		JWTSecret:  e.JWTSecret,
		TokenStore: tokenStore,
	})

	hz = server.New(server.WithHostPorts(":" + itoa(e.Port)))
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
