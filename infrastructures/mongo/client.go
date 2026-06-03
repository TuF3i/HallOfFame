package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Option func(info *BasicInfo)

type BasicInfo struct {
	URI      string
	Database string
}

func WithURI(uri string) Option {
	return func(info *BasicInfo) {
		info.URI = uri
	}
}

func WithDatabase(db string) Option {
	return func(info *BasicInfo) {
		info.Database = db
	}
}

type Client struct {
	RawClient *mongo.Client
	Database  *mongo.Database
}

func NewMongoClient(opts ...Option) (*Client, error) {
	info := &BasicInfo{
		URI:      "mongodb://localhost:27017",
		Database: "halloffame",
	}
	for _, opt := range opts {
		opt(info)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(info.URI))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	return &Client{
		RawClient: client,
		Database:  client.Database(info.Database),
	}, nil
}
