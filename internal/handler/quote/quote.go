package quote

import (
	"HallOfFame/internal/dao"
	"HallOfFame/internal/storage"
)

type QuoteHandler struct {
	dao     *dao.Dao
	storage *storage.Storage
}

func NewQuoteHandler(d *dao.Dao, s *storage.Storage) *QuoteHandler {
	return &QuoteHandler{dao: d, storage: s}
}
