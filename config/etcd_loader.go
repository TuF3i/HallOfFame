package config

import (
	"HallOfFame/inferstructure/etcd"
	"context"
	"encoding/json"
	"fmt"
)

func LoadFromEtcd(ctx context.Context, client *etcd.EtcdClient) (*Config, error) {

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
