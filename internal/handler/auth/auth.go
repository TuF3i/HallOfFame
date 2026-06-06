package auth

import (
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dao"
)

type AuthHandler struct {
	dao   *dao.Dao
	cache *cache.Cache
}

func NewAuthHandler(d *dao.Dao, c *cache.Cache) *AuthHandler {
	return &AuthHandler{dao: d, cache: c}
}
