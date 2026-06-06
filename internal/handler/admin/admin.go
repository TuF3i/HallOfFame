package admin

import (
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dao"
)

type AdminHandler struct {
	dao   *dao.Dao
	cache *cache.Cache
}

func NewAdminHandler(d *dao.Dao, c *cache.Cache) *AdminHandler {
	return &AdminHandler{dao: d, cache: c}
}
