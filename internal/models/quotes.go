package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Quotes struct {
	ID       primitive.ObjectID `bson:"_id,omitempty"`
	QID      string             `bson:"qid"`
	Content  string             `bson:"content"`
	UserData UserMeta           `baon:"userdata"`
}

type UserMeta struct {
	QQNumber string `bson:"qqnumber"`
	Speaker  string `bson:"speaker"`
	Avatar   string `bson:"avatar"`
}

type GroupData struct {
	GroupNumber string `bson:"groupnumber"`
	GroupName   string `bson:"groupname"`
	Avatar      string `bson:"avatar"`
}
