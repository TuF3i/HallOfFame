package minio

import (
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Option func(info *BasicInfo)

type BasicInfo struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

func WithEndpoint(endpoint string) Option {
	return func(info *BasicInfo) { info.Endpoint = endpoint }
}

func WithAccessKey(key string) Option {
	return func(info *BasicInfo) { info.AccessKey = key }
}

func WithSecretKey(key string) Option {
	return func(info *BasicInfo) { info.SecretKey = key }
}

func WithBucket(bucket string) Option {
	return func(info *BasicInfo) { info.Bucket = bucket }
}

func WithUseSSL(useSSL bool) Option {
	return func(info *BasicInfo) { info.UseSSL = useSSL }
}

func NewMinioClient(opts ...Option) (*minio.Client, error) {
	info := &BasicInfo{
		Endpoint:  "localhost:9000",
		AccessKey: "minioadmin",
		SecretKey: "minioadmin",
		Bucket:    "halloffame",
		UseSSL:    false,
	}
	for _, opt := range opts {
		opt(info)
	}

	client, err := minio.New(info.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(info.AccessKey, info.SecretKey, ""),
		Secure: info.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	return client, nil
}
