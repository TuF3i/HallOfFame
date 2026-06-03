package storage

import (
	"context"
	"fmt"
	"io"
	"path"

	"github.com/minio/minio-go/v7"
)

// MinioStore implements Storage using MinIO.
type MinioStore struct {
	client *minio.Client
	bucket string
	// endpoint for generating URL
	endpoint string
	useSSL   bool
}

func NewMinioStore(client *minio.Client, bucket string, endpoint string, useSSL bool) *MinioStore {
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil || !exists {
		client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
	}
	return &MinioStore{
		client:   client,
		bucket:   bucket,
		endpoint: endpoint,
		useSSL:   useSSL,
	}
}

func (s *MinioStore) Upload(ctx context.Context, filename string, reader io.Reader) (string, error) {
	_, err := s.client.PutObject(ctx, s.bucket, filename, reader, -1,
		minio.PutObjectOptions{})
	if err != nil {
		return "", err
	}
	return s.GetURL(ctx, filename)
}

func (s *MinioStore) Delete(ctx context.Context, filename string) error {
	return s.client.RemoveObject(ctx, s.bucket, filename, minio.RemoveObjectOptions{})
}

func (s *MinioStore) GetURL(_ context.Context, filename string) (string, error) {
	scheme := "http"
	if s.useSSL {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, s.endpoint, s.bucket, path.Clean(filename)), nil
}
