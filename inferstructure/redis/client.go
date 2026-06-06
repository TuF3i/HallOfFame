package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	addr     string
	port     int
	password string
	Client   *redis.Client
}

func (r *RedisClient) Shutdown() error {
	return r.Client.Close()
}

type opt func(c *RedisClient)

func WithAddr(addr string) opt {
	return func(c *RedisClient) {
		c.addr = addr
		c.Client = redis.NewClient(&redis.Options{
			Addr: addr,
		})
	}
}

func WithPort(port int) opt {
	return func(c *RedisClient) {
		c.port = port
		c.Client = redis.NewClient(&redis.Options{
			Addr: fmt.Sprintf("%s:%d", c.Client.Options().Addr, port),
		})
	}
}

func WithPassword(password string) opt {
	return func(c *RedisClient) {
		c.password = password
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

	conf.Client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", conf.addr, conf.port),
		DB:       0,
		Password: conf.password,
	})

	if err := conf.Client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return conf, nil
}
