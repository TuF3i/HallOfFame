package sqlite

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Option func(info *BasicInfo)

type BasicInfo struct {
	Path string
}

func WithPath(path string) Option {
	return func(info *BasicInfo) { info.Path = path }
}

func NewSqliteClient(opts ...Option) (*gorm.DB, error) {
	info := &BasicInfo{
		Path: "/app/data/halloffame.db",
	}
	for _, opt := range opts {
		opt(info)
	}

	db, err := gorm.Open(sqlite.Open(info.Path), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	return db, nil
}
