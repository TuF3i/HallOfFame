package bot

import (
	"context"
	"encoding/json"
	"time"

	"HallOfFame/internal/cache"
	"HallOfFame/internal/dto"

	"github.com/cloudwego/hertz/pkg/app"
)

// BotUploadReq 是 QQ 机器人上传消息的请求格式
type BotUploadReq struct {
	QQGroup  string `json:"qqgroup"`
	QQNumber string `json:"qqnumber"`
	Speaker  string `json:"speaker"`
	Content  string `json:"content"`
	Avatar   string `json:"avatar,omitempty"`
}

// BotUploadMsg 是存入 Redis List 的消息格式
type BotUploadMsg struct {
	QQGroup   string `json:"qqgroup"`
	QQNumber  string `json:"qqnumber"`
	Speaker   string `json:"speaker"`
	Content   string `json:"content"`
	Avatar    string `json:"avatar,omitempty"`
	Timestamp int64  `json:"timestamp"`
}

type BotHandler struct {
	cache *cache.Cache
}

func NewBotHandler(c *cache.Cache) *BotHandler {
	return &BotHandler{cache: c}
}

func (h *BotHandler) Upload(c context.Context, ctx *app.RequestContext) {
	var req BotUploadReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "invalid json body"))
		return
	}

	msg := BotUploadMsg{
		QQGroup:   req.QQGroup,
		QQNumber:  req.QQNumber,
		Speaker:   req.Speaker,
		Content:   req.Content,
		Avatar:    req.Avatar,
		Timestamp: time.Now().Unix(),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "serialize error"))
		return
	}

	if err := h.cache.PushMessage(c, string(data)); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "queue error"))
		return
	}

	ctx.JSON(200, dto.SuccessResp(nil))
}
