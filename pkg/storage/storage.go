package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
)

// Storage defines the interface for file storage.
// It can be backed by MinIO or local filesystem.
type Storage interface {
	Upload(ctx context.Context, filename string, reader io.Reader) (string, error)
	Delete(ctx context.Context, filename string) error
	GetURL(ctx context.Context, filename string) (string, error)
}

// LocalStore implements Storage using local filesystem.
type LocalStore struct {
	BasePath string
	BaseURL  string
}

func NewLocalStore(basePath string) *LocalStore {
	os.MkdirAll(basePath, 0755)
	return &LocalStore{
		BasePath: basePath,
		BaseURL:  "/uploads",
	}
}

func (s *LocalStore) Upload(_ context.Context, filename string, reader io.Reader) (string, error) {
	fullPath := filepath.Join(s.BasePath, filename)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		return "", err
	}

	return s.BaseURL + "/" + filename, nil
}

func (s *LocalStore) Delete(_ context.Context, filename string) error {
	return os.Remove(filepath.Join(s.BasePath, filename))
}

func (s *LocalStore) GetURL(_ context.Context, filename string) (string, error) {
	return s.BaseURL + "/" + filename, nil
}
