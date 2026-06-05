package mongodb

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type MongoClient struct {
	Client   *mongo.Client
	addr     string
	port     int
	username string
	password string
	database string
}

func (r *MongoClient) Shutdown() error {
	return r.Client.Disconnect(context.Background())
}

type opt func(c *MongoClient)

func WithAddr(addr string) opt {
	return func(c *MongoClient) {
		c.addr = addr
	}
}

func WithPort(port int) opt {
	return func(c *MongoClient) {
		c.port = port
	}
}

func WithUsername(username string) opt {
	return func(c *MongoClient) {
		c.username = username
	}
}

func WithPassword(password string) opt {
	return func(c *MongoClient) {
		c.password = password
	}
}

func WithDatabase(database string) opt {
	return func(c *MongoClient) {
		c.database = database
	}
}

func NewClient(opts ...opt) (*MongoClient, error) {
	conf := new(MongoClient)

	for _, opt := range opts {
		opt(conf)
	}

	return conf, nil
}
