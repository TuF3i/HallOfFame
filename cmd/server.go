package cmd

import (
	"context"
	"log"

	minioClient "HallOfFame/inferstructure/minio"
	mongoClient "HallOfFame/inferstructure/mongodb"
	postgresClient "HallOfFame/inferstructure/postgres"
	redisClient "HallOfFame/inferstructure/redis"
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dao"
	"HallOfFame/internal/engine"
	"HallOfFame/internal/handler/admin"
	"HallOfFame/internal/handler/auth"
	"HallOfFame/internal/handler/bot"
	"HallOfFame/internal/handler/quote"
	"HallOfFame/internal/models"
	"HallOfFame/internal/storage"

	"github.com/spf13/cobra"
)

// serverCmd 启动 HTTP 服务
var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "启动 HTTP 服务",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()
		ctx := context.Background()

		// PostgreSQL
		pgClient, err := postgresClient.NewClient(
			postgresClient.WithAddr(cfg.PostgreSQLConf.Addr),
			postgresClient.WithPort(cfg.PostgreSQLConf.Port),
			postgresClient.WithUsername(cfg.PostgreSQLConf.Username),
			postgresClient.WithPassword(cfg.PostgreSQLConf.Password),
			postgresClient.WithDatabase(cfg.PostgreSQLConf.Database),
		)
		if err != nil {
			log.Fatalf("failed to init postgres: %v", err)
		}
		if err := pgClient.Client.AutoMigrate(&models.User{}); err != nil {
			log.Fatalf("failed to auto migrate: %v", err)
		}

		// Redis
		rdClient, err := redisClient.NewClient(
			redisClient.WithAddr(cfg.RedisConf.Addr),
			redisClient.WithPort(cfg.RedisConf.Port),
			redisClient.WithPassword(cfg.RedisConf.Password),
			redisClient.WithDB(cfg.RedisConf.DB),
		)
		if err != nil {
			log.Fatalf("failed to init redis: %v", err)
		}

		// MongoDB
		mgClient, err := mongoClient.NewClient(
			mongoClient.WithAddr(cfg.MongoDBConf.Addr),
			mongoClient.WithPort(cfg.MongoDBConf.Port),
			mongoClient.WithUsername(cfg.MongoDBConf.Username),
			mongoClient.WithPassword(cfg.MongoDBConf.Password),
			mongoClient.WithDatabase(cfg.MongoDBConf.Database),
		)
		if err != nil {
			log.Fatalf("failed to init mongodb: %v", err)
		}

		// MinIO
		mnClient, err := minioClient.NewClient(
			minioClient.WithAddr(cfg.MinioConf.Addr),
			minioClient.WithPort(cfg.MinioConf.Port),
			minioClient.WithUsername(cfg.MinioConf.Username),
			minioClient.WithPassword(cfg.MinioConf.Password),
			minioClient.WithBucket(cfg.MinioConf.Bucket),
		)
		if err != nil {
			log.Fatalf("failed to init minio: %v", err)
		}

		// 依赖层
		d := dao.NewDao(&dao.DaoRelaliance{
			PostgresClient: pgClient,
			MongoClient:    mgClient,
		})
		c := cache.NewCache(&cache.CacheRelaliance{
			RedisClient: rdClient,
		})
		s := storage.NewStorage(storage.StorageReliance{
			MinioClient: mnClient,
		})

		// Handler
		authHandler := auth.NewAuthHandler(d, c)
		adminHandler := admin.NewAdminHandler(d, c)
		quoteHandler := quote.NewQuoteHandler(d, s)
		botHandler := bot.NewBotHandler(c)

		// Engine
		eng := engine.NewEngine(&engine.EngineReliance{
			Dao:     d,
			Cache:   c,
			Storage: s,
		})
		eng.Start(ctx, cfg, authHandler, adminHandler, quoteHandler, botHandler)
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)
}
