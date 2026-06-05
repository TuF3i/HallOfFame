package postgres

import "gorm.io/gorm"

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

	return conf, nil
}
