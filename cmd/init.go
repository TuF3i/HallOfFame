package cmd

import (
	"log"

	postgresClient "HallOfFame/inferstructure/postgres"
	"HallOfFame/internal/models"

	"github.com/spf13/cobra"
)

// initCmd 是 init 子命令的父命令
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "初始化数据库或存储",
}

// initDBCmd 初始化 PostgreSQL 表结构
var initDBCmd = &cobra.Command{
	Use:   "db",
	Short: "初始化 PostgreSQL 数据库表",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()

		pgClient, err := postgresClient.NewClient(
			postgresClient.WithAddr(cfg.PostgreSQLConf.Addr),
			postgresClient.WithPort(cfg.PostgreSQLConf.Port),
			postgresClient.WithUsername(cfg.PostgreSQLConf.Username),
			postgresClient.WithPassword(cfg.PostgreSQLConf.Password),
			postgresClient.WithDatabase(cfg.PostgreSQLConf.Database),
		)
		if err != nil {
			log.Fatalf("failed to connect postgres: %v", err)
		}

		if err := pgClient.Client.AutoMigrate(&models.User{}, &models.LoginLog{}); err != nil {
			log.Fatalf("failed to auto migrate: %v", err)
		}
		log.Println("PostgreSQL tables initialized successfully")
	},
}

// initMinIOCmd 初始化 MinIO 存储桶
var initMinIOCmd = &cobra.Command{
	Use:   "minio",
	Short: "初始化 MinIO 存储桶",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()

		if err := ensureMinIOBucket(cfg); err != nil {
			log.Fatalf("failed to init minio: %v", err)
		}
		log.Println("MinIO buckets initialized successfully")
	},
}

func init() {
	initCmd.AddCommand(initDBCmd)
	initCmd.AddCommand(initMinIOCmd)
	rootCmd.AddCommand(initCmd)
}
