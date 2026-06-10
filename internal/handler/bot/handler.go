package bot

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"HallOfFame/internal/cache"
	"HallOfFame/internal/dto"
	"HallOfFame/internal/storage"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/google/uuid"
)

// BotUploadMsg 是存入 Redis List 的消息格式
type BotUploadMsg struct {
	QQGroup       string   `json:"qqgroup"`
	QQNumber      string   `json:"qqnumber"`
	Speaker       string   `json:"speaker"`
	Content       string   `json:"content"`
	Avatar        string   `json:"avatar,omitempty"`
	GroupName     string   `json:"groupname,omitempty"`
	GroupAvatar   string   `json:"groupavatar,omitempty"`
	Timestamp     int64    `json:"timestamp"`
	AttachmentIDs []string `json:"attachment_ids"`
}

type BotHandler struct {
	cache   *cache.Cache
	storage *storage.Storage
}

func NewBotHandler(c *cache.Cache, s *storage.Storage) *BotHandler {
	return &BotHandler{cache: c, storage: s}
}

func (h *BotHandler) Upload(c context.Context, ctx *app.RequestContext) {
	// 解析 multipart form
	multipartForm, err := ctx.MultipartForm()
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "invalid multipart form"))
		return
	}

	// 读取 form 字段
	getVal := func(key string) string {
		if vals := multipartForm.Value[key]; len(vals) > 0 {
			return vals[0]
		}
		return ""
	}

	qqgroup := getVal("qqgroup")
	qqnumber := getVal("qqnumber")
	speaker := getVal("speaker")
	content := getVal("content")

	if qqgroup == "" || qqnumber == "" || speaker == "" || content == "" {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "missing required fields: qqgroup, qqnumber, speaker, content"))
		return
	}

	// 处理可选附件
	attachmentIDs := make([]string, 0)
	files := multipartForm.File["files"]
	if len(files) > 0 {
		qid := uuid.New().String()
		for _, file := range files {
			attID := uuid.New().String()
			minioKey := fmt.Sprintf("attachments/%s/%s", qid, attID)
			if err := h.storage.UploadFile(c, minioKey, file); err != nil {
				ctx.JSON(200, dto.Error(dto.ErrInternal, "upload attachment failed"))
				return
			}
			attachmentIDs = append(attachmentIDs, attID)
		}
	}

	msg := BotUploadMsg{
		QQGroup:       qqgroup,
		QQNumber:      qqnumber,
		Speaker:       speaker,
		Content:       content,
		Avatar:        getVal("avatar"),
		GroupName:     getVal("groupname"),
		GroupAvatar:   getVal("groupavatar"),
		Timestamp:     time.Now().Unix(),
		AttachmentIDs: attachmentIDs,
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
