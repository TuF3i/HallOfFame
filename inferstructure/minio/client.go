package minio

import "github.com/minio/minio-go/v7"

type MinioClient struct {
	Client   *minio.Client
	addr     string
	port     int
	username string
	password string
	bucket   string
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
		c.bucket = bucket
	}
}

func NewClient(opts ...opt) (*MinioClient, error) {
	conf := new(MinioClient)

	for _, opt := range opts {
		opt(conf)
	}

	return conf, nil
}
