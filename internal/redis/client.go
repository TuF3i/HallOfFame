package redis

import (
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
}

func (r *RedisClient) Shutdown() error {
	return r.Client.Close()
}

type opt func(c *RedisClient)

func WithAddr(addr string) opt {
	return func(c *RedisClient) {
		c.Client = redis.NewClient(&redis.Options{
			Addr: addr,
		})
	}
}

func WithPort(port int) opt {
	return func(c *RedisClient) {
		c.Client = redis.NewClient(&redis.Options{
			Addr: fmt.Sprintf("%s:%d", c.Client.Options().Addr, port),
		})
	}
}

func WithPassword(password string) opt {
	return func(c *RedisClient) {
		c.Client = redis.NewClient(&redis.Options{
			Addr:     c.Client.Options().Addr,
			Password: password,
		})
	}
}

func NewClient(opts ...opt) (*RedisClient, error) {
	conf := new(RedisClient)

	for _, opt := range opts {
		opt(conf)
	}

	return conf, nil
}
