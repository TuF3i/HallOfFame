package postgres

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type PostgresClient struct {
	addr     string
	port     int
	username string
	password string
	database string
	Client   *gorm.DB
}

type opt func(c *PostgresClient)

func WithAddr(addr string) opt {
	return func(c *PostgresClient) {
		c.addr = addr
	}
}

func WithPort(port int) opt {
	return func(c *PostgresClient) {
		c.port = port
	}
}

func WithUsername(username string) opt {
	return func(c *PostgresClient) {
		c.username = username
	}
}

func WithPassword(password string) opt {
	return func(c *PostgresClient) {
		c.password = password
	}
}

func WithDatabase(database string) opt {
	return func(c *PostgresClient) {
		c.database = database
	}
}

func NewClient(opts ...opt) (*PostgresClient, error) {
	conf := new(PostgresClient)

	for _, opt := range opts {
		opt(conf)
	}

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", conf.addr, conf.port, conf.username, conf.password, conf.database)
	client, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	conf.Client = client

	return conf, nil
}
