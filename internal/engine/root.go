package engine

import (
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dao"
	"HallOfFame/internal/storage"
)

type EngineReliance struct {
	Dao     *dao.Dao
	Cache   *cache.Cache
	Storage *storage.Storage
}

type Engine struct {
	*EngineReliance
}

func NewEngine(rel *EngineReliance) *Engine {
	return &Engine{EngineReliance: rel}
}
