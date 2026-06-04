package botsvr

import (
	"os"
	"os/signal"
	"syscall"

	quoteDao "halloffame/internal/quote/dao"
	quoteHandler "halloffame/internal/quote/handler"
	mongoInfra "halloffame/infrastructures/mongo"
	"halloffame/pkg/env"

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
	mongoClient, err := mongoInfra.NewMongoClient(
		mongoInfra.WithURI(e.MongoURI),
		mongoInfra.WithDatabase(e.MongoDBName),
	)
	if err != nil {
		panic("MongoDB connection failed (required): " + err.Error())
	}

	quoteDaoObj := quoteDao.NewQuoteDao(&quoteDao.QuoteDaoReliance{Mongo: mongoClient})
	qqGroupDao := quoteDao.NewQQGroupDao(&quoteDao.QQGroupDaoReliance{Mongo: mongoClient})

	qHandler := quoteHandler.NewQuoteHandler(&quoteHandler.QuoteHandlerReliance{
		QuoteDao:   quoteDaoObj,
		QQGroupDao: qqGroupDao,
	})

	port := e.BotPort
	if port <= 0 {
		port = 8889
	}
	hz = server.New(server.WithHostPorts(":" + itoa(port)))

	bot := hz.Group("/api/v1/bot")
	{
		bot.POST("/quotes", qHandler.BotCreateQuote)
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
