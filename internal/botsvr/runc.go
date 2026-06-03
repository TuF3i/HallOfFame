package botsvr

import (
	"os"
	"os/signal"
	"syscall"

	quoteDao "halloffame/internal/quote/dao"
	quoteHandler "halloffame/internal/quote/handler"
	mongoInfra "halloffame/infrastructures/mongo"
	infraMinio "halloffame/infrastructures/minio"
	"halloffame/pkg/env"
	"halloffame/pkg/storage"

	"github.com/cloudwego/hertz/pkg/app/server"
)

var hz *server.Hertz

func RunBotServer() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	e := env.GetEnv()
	onCreate(e)

	<-quit
	onDestroy()
}

func onCreate(e *env.BasicEnv) {
	// ============================================================
	// 1. 基础设施
	// ============================================================

	// MongoDB (必选)
	mongoClient, err := mongoInfra.NewMongoClient(
		mongoInfra.WithURI(e.MongoURI),
		mongoInfra.WithDatabase(e.MongoDBName),
	)
	if err != nil {
		panic("MongoDB connection failed (required): " + err.Error())
	}

	// MinIO 或本地存储 (用于 Bot 上传图片)
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
	// 2. DAO
	// ============================================================
	quoteDaoObj := quoteDao.NewQuoteDao(&quoteDao.QuoteDaoReliance{Mongo: mongoClient})
	qqGroupDao := quoteDao.NewQQGroupDao(&quoteDao.QQGroupDaoReliance{Mongo: mongoClient})

	// ============================================================
	// 3. Handler
	// ============================================================
	qHandler := quoteHandler.NewQuoteHandler(&quoteHandler.QuoteHandlerReliance{
		QuoteDao:   quoteDaoObj,
		QQGroupDao: qqGroupDao,
		Storage:    fileStore,
	})

	// ============================================================
	// 4. Hertz Bot 服务器 (另起端口)
	// ============================================================
	port := e.BotPort
	if port <= 0 {
		port = 8889
	}
	hz = server.New(server.WithHostPorts(":" + itoa(port)))

	// Bot API 路由 (无鉴权)
	bot := hz.Group("/api/v1/bot")
	{
		bot.POST("/quotes", qHandler.BotCreateQuote)
		bot.POST("/quotes/:id/images", qHandler.BotUploadImage)
		bot.GET("/groups", qHandler.BotListGroups)
	}

	hz.Spin()
}

func onDestroy() {
	if hz != nil {
		hz.Close()
	}
}

func itoa(i int) string {
	if i == 0 {
		return "8889"
	}
	s := ""
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}
