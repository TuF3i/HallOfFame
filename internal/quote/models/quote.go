package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Quote struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	QQGroup    string             `bson:"qq_group" json:"qq_group"`
	Speaker    string             `bson:"speaker" json:"speaker"`
	Content    string             `bson:"content" json:"content"`
	IsFeatured bool               `bson:"is_featured" json:"is_featured"`
	CreatedBy  uint               `bson:"created_by" json:"created_by"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`
	DeletedAt  *time.Time         `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}

type QQGroup struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}
