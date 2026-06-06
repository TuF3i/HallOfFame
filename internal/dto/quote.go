package dto

import (
	"HallOfFame/internal/models"
)

// === 请求 DTO ===

type CreateQuoteReq struct {
	Content     string  `form:"content"`
	Suppression float64 `form:"suppression"`
	UserData    string  `form:"userdata"`   // JSON string: {"qqnumber":"...","speaker":"...","avatar":"..."}
	GroupData   string  `form:"groupdata"`  // JSON string: {"groupnumber":"...","groupname":"...","avatar":"..."}
}

type SetFeaturedReq struct {
	Featured bool `json:"featured"`
}

// === 响应 DTO ===

type PageResult[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}

type QuoteResp struct {
	QID          string        `json:"qid"`
	Content      string        `json:"content"`
	Suppression  float64       `json:"suppression"`
	UserData     UserMetaResp  `json:"userdata"`
	GroupData    GroupDataResp `json:"groupdata"`
	AttachmentID []string      `json:"attachmentid"`
	IsFeatured   bool          `json:"is_featured"`
}

type UserMetaResp struct {
	QQNumber string `json:"qqnumber"`
	Speaker  string `json:"speaker"`
	Avatar   string `json:"avatar"`
}

type GroupDataResp struct {
	GroupNumber string `json:"groupnumber"`
	GroupName   string `json:"groupname"`
	Avatar      string `json:"avatar"`
}

type SpeakerResp struct {
	QQNumber   string `json:"qqnumber"`
	Speaker    string `json:"speaker"`
	Avatar     string `json:"avatar"`
	QuoteCount int64  `json:"quote_count"`
}

// === 转换函数 ===

func QuoteToDTO(q *models.Quotes) QuoteResp {
	return QuoteResp{
		QID:         q.QID,
		Content:     q.Content,
		Suppression: q.Suppression,
		UserData: UserMetaResp{
			QQNumber: q.UserData.QQNumber,
			Speaker:  q.UserData.Speaker,
			Avatar:   q.UserData.Avatar,
		},
		GroupData: GroupDataResp{
			GroupNumber: q.GroupData.GroupNumber,
			GroupName:   q.GroupData.GroupName,
			Avatar:      q.GroupData.Avatar,
		},
		AttachmentID: q.AttachmentID,
		IsFeatured:   q.IsFeatured,
	}
}

func QuoteToDTOList(quotes []models.Quotes) []QuoteResp {
	result := make([]QuoteResp, len(quotes))
	for i, q := range quotes {
		result[i] = QuoteToDTO(&q)
	}
	return result
}
