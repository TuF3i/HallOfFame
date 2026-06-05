package config

import (
	"context"
	"encoding/json"
	"fmt"

	clientv3 "go.etcd.io/etcd/client/v3"
)

// LoadFromEtcd 从 etcd 加载完整配置。
// etcd 中 /halloffame/config 这个 key 的值就是整个配置的 JSON。
func LoadFromEtcd(ctx context.Context, addr string, port int) (*Config, error) {
	client, err := clientv3.New(clientv3.Config{
		Endpoints: []string{fmt.Sprintf("%s:%d", addr, port)},
	})
	if err != nil {
		return nil, fmt.Errorf("create etcd client: %w", err)
	}
	defer client.Close()

	key := "/halloffame/config"
	resp, err := client.Get(ctx, key)
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
