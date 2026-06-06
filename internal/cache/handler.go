package cache

import (
	rediskeygen "HallOfFame/pkg/redisKeygen"
	"context"
	"time"
)

const (
	AccessTokenTTL  = time.Hour
	RefreshTokenTTL = 7 * 24 * time.Hour
)

func (r *Cache) SetToken(ctx context.Context, uid string, token string) error {
	return r.RedisClient.Client.Set(ctx, rediskeygen.GetUserTokenKey(uid), token, AccessTokenTTL).Err()
}

func (r *Cache) GetToken(ctx context.Context, uid string) (string, error) {
	return r.RedisClient.Client.Get(ctx, rediskeygen.GetUserTokenKey(uid)).Result()
}

func (r *Cache) DeleteToken(ctx context.Context, uid string) error {
	return r.RedisClient.Client.Del(ctx, rediskeygen.GetUserTokenKey(uid)).Err()
}

func (r *Cache) SetRefreshToken(ctx context.Context, uid string, token string) error {
	return r.RedisClient.Client.Set(ctx, rediskeygen.GetUserRefreshTokenKey(uid), token, RefreshTokenTTL).Err()
}

func (r *Cache) GetRefreshToken(ctx context.Context, uid string) (string, error) {
	return r.RedisClient.Client.Get(ctx, rediskeygen.GetUserRefreshTokenKey(uid)).Result()
}

func (r *Cache) DeleteRefreshToken(ctx context.Context, uid string) error {
	return r.RedisClient.Client.Del(ctx, rediskeygen.GetUserRefreshTokenKey(uid)).Err()
}

func (r *Cache) DeleteUserAllTokens(ctx context.Context, uid string) error {
	if err := r.DeleteToken(ctx, uid); err != nil {
		return err
	}
	return r.DeleteRefreshToken(ctx, uid)
}

// PushMessage 将消息 JSON 推入 Bot 消息队列（Redis List），非阻塞
func (r *Cache) PushMessage(ctx context.Context, msg string) error {
	return r.RedisClient.Client.LPush(ctx, rediskeygen.GetBotMessageQueueKey(), msg).Err()
}

// QueueLen 返回 Bot 消息队列的长度
func (r *Cache) QueueLen(ctx context.Context) (int64, error) {
	return r.RedisClient.Client.LLen(ctx, rediskeygen.GetBotMessageQueueKey()).Result()
}

// PopAllMessages 取出 Bot 消息队列中的所有消息并清空队列
func (r *Cache) PopAllMessages(ctx context.Context) ([]string, error) {
	key := rediskeygen.GetBotMessageQueueKey()

	msgs, err := r.RedisClient.Client.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	if err := r.RedisClient.Client.Del(ctx, key).Err(); err != nil {
		return nil, err
	}

	// LRANGE 返回的是从头到尾，LPUSH 是头插，所以需要反转以恢复原始顺序
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}

	return msgs, nil
}

// ResetQueue 清空 Bot 消息队列
func (r *Cache) ResetQueue(ctx context.Context) error {
	return r.RedisClient.Client.Del(ctx, rediskeygen.GetBotMessageQueueKey()).Err()
}
