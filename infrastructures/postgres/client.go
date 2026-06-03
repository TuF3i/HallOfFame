package postgres

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Option func(info *BasicInfo)

type BasicInfo struct {
	Host     string
	Port     int
	User     string
	Password string
	DB       string
	SSLMode  string
}

func WithHost(host string) Option {
	return func(info *BasicInfo) { info.Host = host }
}

func WithPort(port int) Option {
	return func(info *BasicInfo) { info.Port = port }
}

func WithUser(user string) Option {
	return func(info *BasicInfo) { info.User = user }
}

func WithPassword(password string) Option {
	return func(info *BasicInfo) { info.Password = password }
}

func WithDB(db string) Option {
	return func(info *BasicInfo) { info.DB = db }
}

func WithSSLMode(sslMode string) Option {
	return func(info *BasicInfo) { info.SSLMode = sslMode }
}

func NewPostgresClient(opts ...Option) (*gorm.DB, error) {
	info := &BasicInfo{
		Host:     "localhost",
		Port:     5432,
		User:     "postgres",
		Password: "postgres",
		DB:       "halloffame",
		SSLMode:  "disable",
	}
	for _, opt := range opts {
		opt(info)
	}

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		info.Host, info.Port, info.User, info.Password, info.DB, info.SSLMode,
	)

	db, err := gorm.Open(postgres.New(postgres.Config{DSN: dsn}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	return db, nil
}
