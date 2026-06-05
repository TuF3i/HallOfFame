package mongodb

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoClient struct {
	Database *mongo.Database
	client   *mongo.Client
	addr     string
	port     int
	username string
	password string
	database string
}

func (r *MongoClient) Shutdown() error {
	return r.client.Disconnect(context.Background())
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

	clientOptions := options.Client().ApplyURI(fmt.Sprintf("mongodb://%s:%d", conf.addr, conf.port))
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		return nil, err
	}

	err = client.Ping(context.TODO(), nil)
	if err != nil {
		return nil, err
	}

	conf.Database = client.Database(conf.database)
	conf.client = client

	return conf, nil
}
