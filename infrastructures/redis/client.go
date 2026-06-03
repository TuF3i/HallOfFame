package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Option func(info *BasicInfo)

type BasicInfo struct {
	Addr     string
	Password string
	DB       int
}

func WithAddr(addr string) Option {
	return func(info *BasicInfo) { info.Addr = addr }
}

func WithPassword(password string) Option {
	return func(info *BasicInfo) { info.Password = password }
}

func WithDB(db int) Option {
	return func(info *BasicInfo) { info.DB = db }
}

func NewRedisClient(opts ...Option) (*redis.Client, error) {
	info := &BasicInfo{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
	}
	for _, opt := range opts {
		opt(info)
	}

	client := redis.NewClient(&redis.Options{
		Addr:     info.Addr,
		Password: info.Password,
		DB:       info.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}
