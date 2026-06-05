package dao

import (
	"HallOfFame/inferstructure/mongodb"
	"HallOfFame/inferstructure/postgres"
)

type DaoRelaliance struct {
	PostgresClient *postgres.PostgresClient
	MongoClient    *mongodb.MongoClient
}

type Dao struct {
	*DaoRelaliance
}

func NewDao(rel *DaoRelaliance) *Dao {
	return &Dao{DaoRelaliance: rel}
}
