package minio

import (
	"context"
	"errors"
	"fmt"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioClient struct {
	Client   *minio.Client
	addr     string
	port     int
	username string
	password string
	Bucket   string
}

type opt func(c *MinioClient)

func WithAddr(addr string) opt {
	return func(c *MinioClient) {
		c.addr = addr
	}
}

func WithPort(port int) opt {
	return func(c *MinioClient) {
		c.port = port
	}
}

func WithUsername(username string) opt {
	return func(c *MinioClient) {
		c.username = username
	}
}
func WithPassword(password string) opt {
	return func(c *MinioClient) {
		c.password = password
	}
}
func WithBucket(bucket string) opt {
	return func(c *MinioClient) {
		c.Bucket = bucket
	}
}

func NewClient(opts ...opt) (*MinioClient, error) {
	conf := new(MinioClient)

	for _, opt := range opts {
		opt(conf)
	}

	endpoint := fmt.Sprintf("%s:%d", conf.addr, conf.port)
	client, err := minio.New(
		endpoint,
		&minio.Options{
			Creds: credentials.NewStaticV4(
				conf.username,
				conf.password,
				"",
			),
			Secure: false,
		},
	)
	if err != nil {
		return nil, err
	}

	exists, err := client.BucketExists(context.Background(), conf.Bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("blanket not exists")
	}

	exists, err = client.BucketExists(context.Background(), conf.Bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("pic blanket not exists")
	}

	conf.Client = client

	return conf, nil
}
