package storage

import (
	"context"
	"io"
	"mime/multipart"

	"github.com/minio/minio-go/v7"
)

func (r *Storage) UploadFile(ctx context.Context, minioKey string, file *multipart.FileHeader) error {
	// 打开文件
	f, err := file.Open()
	if err != nil {
		return err
	}
	// 上传到私有桶
	_, err = r.MinioClient.Client.PutObject(
		ctx,
		r.MinioClient.Bucket,
		minioKey,
		f,
		file.Size,
		minio.PutObjectOptions{ContentType: "image/jpeg"},
	)
	if err != nil {
		return err
	}

	_ = f.Close()
	return nil
}

func (r *Storage) GetFile(ctx context.Context, minioKey string) (io.Reader, error) {
	return r.MinioClient.Client.GetObject(
		ctx,
		r.MinioClient.Bucket,
		minioKey,
		minio.GetObjectOptions{},
	)
}

func (r *Storage) DeleteFile(ctx context.Context, minioKey string) error {
	return r.MinioClient.Client.RemoveObject(
		ctx,
		r.MinioClient.Bucket,
		minioKey,
		minio.RemoveObjectOptions{},
	)
}
