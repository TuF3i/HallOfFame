package cache

import (
	rediskeygen "HallOfFame/pkg/redisKeygen"
	"context"
)

func (r *Cache) SetToken(ctx context.Context, uid string, token string) error {
	return r.RedisClient.Client.Set(ctx, rediskeygen.GetUserTokenKey(token), uid, 0).Err()
}

func (r *Cache) GetToken(ctx context.Context, uid string) (string, error) {
	return r.RedisClient.Client.Get(ctx, uid).Result()
}
