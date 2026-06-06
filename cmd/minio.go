package cmd

import (
	"context"
	"fmt"

	"HallOfFame/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// ensureMinIOBucket 确保 MinIO 存储桶存在，不存在则创建
func ensureMinIOBucket(cfg *config.Config) error {
	client, err := minio.New(
		cfg.MinioConf.Addr,
		&minio.Options{
			Creds: credentials.NewStaticV4(
				cfg.MinioConf.Username,
				cfg.MinioConf.Password,
				"",
			),
			Secure: false,
		},
	)
	if err != nil {
		return fmt.Errorf("create minio client: %w", err)
	}

	bucket := cfg.MinioConf.Bucket
	exists, err := client.BucketExists(context.Background(), bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(context.Background(), bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("create bucket %q: %w", bucket, err)
		}
		fmt.Printf("created bucket: %s\n", bucket)
	} else {
		fmt.Printf("bucket already exists: %s\n", bucket)
	}
	return nil
}
