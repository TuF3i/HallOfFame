package config

import (
	"context"
	"encoding/json"
	"fmt"

	etcd "HallOfFame/inferstructure/etcd"
)

// LoadFromEtcd 从 etcd 加载配置，内部创建 etcd 客户端
func LoadFromEtcd(ctx context.Context, addr string, port int) (*Config, error) {
	client, err := etcd.NewClient(
		etcd.WithAddr(addr),
		etcd.WithPort(port),
	)
	if err != nil {
		return nil, fmt.Errorf("create etcd client: %w", err)
	}
	defer client.Shutdown()

	key := "/halloffame/config"
	resp, err := client.Client.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("etcd get key %q: %w", key, err)
	}

	if len(resp.Kvs) == 0 {
		return nil, fmt.Errorf("key %q not found in etcd", key)
	}

	var cfg Config
	if err := json.Unmarshal(resp.Kvs[0].Value, &cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, nil
}
