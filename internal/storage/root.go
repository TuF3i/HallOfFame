package storage

import "HallOfFame/inferstructure/minio"

type StorageReliance struct {
	MinioClient *minio.MinioClient
}

type Storage struct {
	StorageReliance
}

func NewStorage(rel StorageReliance) *Storage {
	return &Storage{StorageReliance: rel}
}
