package config

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	HertzConf      HertzConf
	RedisConf      RedisConf
	MongoDBConf    MongoDBConf
	PostgreSQLConf PostgreSQLConf
	MinioConf      MinioConf
	LLMConf        LLMConf
}

type HertzConf struct {
	ListenAddr       string
	WebApiListerPort int
	BotApiListenPort int
}

type RedisConf struct {
	Addr     string
	Port     int
	Password string
	DB       int
}

type MongoDBConf struct {
	Addr     string
	Port     int
	Database string
	Username string
	Password string
}

type PostgreSQLConf struct {
	Addr     string
	Port     int
	Database string
	Username string
	Password string
}

type MinioConf struct {
	Addr     string
	Port     int
	Username string
	Password string
	Bucket   string
}

type LLMConf struct {
	Provider    string  // openai, ark
	APIKey      string
	BaseURL     string
	Model       string
	BatchSize   int     // 积压触发阈值，默认 300
	MaxResults  int     // LLM 最多返回条数，默认 15
}

// LoadFromFile 从本地 JSON 文件加载配置
func LoadFromFile(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	// 设置默认值
	if cfg.LLMConf.BatchSize <= 0 {
		cfg.LLMConf.BatchSize = 300
	}
	if cfg.LLMConf.MaxResults <= 0 {
		cfg.LLMConf.MaxResults = 15
	}
	return &cfg, nil
}
