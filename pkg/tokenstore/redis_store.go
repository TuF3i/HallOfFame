package tokenstore

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedisStoreFromClient creates a Redis-backed token store from an existing redis.Client.
func NewRedisStoreFromClient(client *redis.Client) TokenStore {
	return &redisStoreImpl{client: client}
}

type redisStoreImpl struct {
	client *redis.Client
}

func (r *redisStoreImpl) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	return r.client.Set(ctx, key, value, expiration).Err()
}

func (r *redisStoreImpl) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *redisStoreImpl) Del(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *redisStoreImpl) Exists(ctx context.Context, key string) (bool, error) {
	n, err := r.client.Exists(ctx, key).Result()
	return n > 0, err
}
