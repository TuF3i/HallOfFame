package cmd

import (
	"context"
	"log"
	"os"
	"strconv"

	"HallOfFame/config"

	"github.com/spf13/cobra"
)

// rootCmd 是所有子命令的根
var rootCmd = &cobra.Command{
	Use:   "HallOfFame",
	Short: "HallOfFame - 名人堂后端服务",
	Long:  `HallOfFame 是一个 QQ 群聊天记录管理与恶搞分析平台。`,
}

// Execute 执行根命令
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		log.Fatalf("cmd execute: %v", err)
	}
}

// loadConfig 加载配置：优先 CONFIG_PATH 本地文件，否则从 etcd 读取
func loadConfig() *config.Config {
	// 优先从本地 JSON 文件加载
	configPath := os.Getenv("CONFIG_PATH")
	if configPath != "" {
		cfg, err := config.LoadFromFile(configPath)
		if err != nil {
			log.Fatalf("failed to load config from file %s: %v", configPath, err)
		}
		return cfg
	}

	// 否则从 etcd 加载
	addr := os.Getenv("ETCD_ADDR")
	if addr == "" {
		addr = "localhost"
	}

	portStr := os.Getenv("ETCD_PORT")
	port := 2379
	if portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	cfg, err := config.LoadFromEtcd(context.Background(), addr, port)
	if err != nil {
		log.Fatalf("failed to load config from etcd (%s:%d): %v", addr, port, err)
	}
	return cfg
}
