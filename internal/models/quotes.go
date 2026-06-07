package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Quotes struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	QID          string             `bson:"qid"`
	Content      string             `bson:"content"`
	Suppression  float64            `bson:"suppression"`
	UserData     UserMeta           `bson:"userdata"`
	GroupData    GroupData          `bson:"groupdata"`
	AttachmentID []string           `bson:"attachmentid"`
	IsFeatured   bool               `bson:"is_featured"`
	AiComment    string             `bson:"ai_comment" json:"ai_comment"`
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

// SpeakerSummary 发言者聚合结果
type SpeakerSummary struct {
	QQNumber   string `bson:"_id"`
	Speaker    string `bson:"speaker"`
	Avatar     string `bson:"avatar"`
	QuoteCount int64  `bson:"quote_count"`
}
