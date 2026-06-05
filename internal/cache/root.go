package cache

import (
	"HallOfFame/inferstructure/redis"
)

type CacheRelaliance struct {
	RedisClient *redis.RedisClient
}

type Cache struct {
	*CacheRelaliance
}

func NewCache(rel *CacheRelaliance) *Cache {
	return &Cache{CacheRelaliance: rel}
}
