package quote

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strconv"

	"HallOfFame/internal/dto"
	"HallOfFame/internal/models"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
)

// ListSpeakers GET /api/quotes/speakers?page=1&page_size=20
func (h *QuoteHandler) ListSpeakers(c context.Context, ctx *app.RequestContext) {
	page, pageSize := getPageParams(ctx)

	speakers, total, err := h.dao.ListSpeakers(c, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	items := make([]dto.SpeakerResp, len(speakers))
	for i, s := range speakers {
		items[i] = dto.SpeakerResp{
			QQNumber:   s.QQNumber,
			Speaker:    s.Speaker,
			Avatar:     s.Avatar,
			QuoteCount: s.QuoteCount,
		}
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.SpeakerResp]{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

// ListSpeakerQuotes GET /api/quotes/speakers/:qqNumber/quotes?page=1&page_size=20
func (h *QuoteHandler) ListSpeakerQuotes(c context.Context, ctx *app.RequestContext) {
	qqNumber := ctx.Param("qqNumber")
	page, pageSize := getPageParams(ctx)

	quotes, total, err := h.dao.GetQuotesBySpeaker(c, qqNumber, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.QuoteResp]{
		Items:    dto.QuoteToDTOList(quotes),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

// SetFeatured PUT /api/admin/quotes/:qid/featured
func (h *QuoteHandler) SetFeatured(c context.Context, ctx *app.RequestContext) {
	qid := ctx.Param("qid")

	var req dto.SetFeaturedReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}

	// 检查发言是否存在
	quote, err := h.dao.GetQuote(c, qid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrNotFound, "quote not found"))
		return
	}

	if err := h.dao.UpdateQuoteFeatured(c, qid, req.Featured); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	quote.IsFeatured = req.Featured
	ctx.JSON(200, dto.SuccessResp(dto.QuoteToDTO(quote)))
}

// DeleteQuote DELETE /api/admin/quotes/:qid
func (h *QuoteHandler) DeleteQuote(c context.Context, ctx *app.RequestContext) {
	qid := ctx.Param("qid")

	quote, err := h.dao.GetQuote(c, qid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrNotFound, "quote not found"))
		return
	}

	// 先删除 MinIO 中的附件
	for _, attID := range quote.AttachmentID {
		_ = h.storage.DeleteFile(c, "attachments/"+qid+"/"+attID)
	}

	// 再删除 MongoDB 记录
	if err := h.dao.DeleteQuote(c, qid); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(nil))
}

// DeleteSpeaker DELETE /api/admin/speakers/:qqNumber
func (h *QuoteHandler) DeleteSpeaker(c context.Context, ctx *app.RequestContext) {
	qqNumber := ctx.Param("qqNumber")

	// 先查出该发言者的所有发言，删除附件
	// 为避免内存溢出，分页遍历
	page := 1
	pageSize := 100
	for {
		quotes, _, err := h.dao.GetQuotesBySpeaker(c, qqNumber, page, pageSize)
		if err != nil {
			break
		}
		if len(quotes) == 0 {
			break
		}
		for _, quote := range quotes {
			for _, attID := range quote.AttachmentID {
				_ = h.storage.DeleteFile(c, "attachments/"+quote.QID+"/"+attID)
			}
		}
		if len(quotes) < pageSize {
			break
		}
		page++
	}

	// 删除 MongoDB 记录
	deleted, err := h.dao.DeleteQuotesBySpeaker(c, qqNumber)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(map[string]int64{"deleted": deleted}))
}

// ListFeaturedQuotes GET /api/quotes/featured?page=1&page_size=20
func (h *QuoteHandler) ListFeaturedQuotes(c context.Context, ctx *app.RequestContext) {
	page, pageSize := getPageParams(ctx)

	quotes, total, err := h.dao.GetFeaturedQuotes(c, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.QuoteResp]{
		Items:    dto.QuoteToDTOList(quotes),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

// ListAllQuotes GET /api/admin/quotes?page=1&page_size=20
func (h *QuoteHandler) ListAllQuotes(c context.Context, ctx *app.RequestContext) {
	page, pageSize := getPageParams(ctx)

	quotes, total, err := h.dao.ListQuotes(c, bson.M{}, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.QuoteResp]{
		Items:    dto.QuoteToDTOList(quotes),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

// CreateQuote POST /api/admin/quotes (multipart/form-data)
func (h *QuoteHandler) CreateQuote(c context.Context, ctx *app.RequestContext) {
	content := ctx.PostForm("content")
	if content == "" {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "content is required"))
		return
	}

	suppressionStr := ctx.PostForm("suppression")
	var suppression float64
	if suppressionStr != "" {
		suppression, _ = strconv.ParseFloat(suppressionStr, 64)
	}

	// 解析 UserData JSON
	userDataStr := ctx.PostForm("userdata")
	if userDataStr == "" {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "userdata is required"))
		return
	}
	var userData models.UserMeta
	if err := json.Unmarshal([]byte(userDataStr), &userData); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "invalid userdata json"))
		return
	}

	// 解析 GroupData JSON（可选）
	var groupData models.GroupData
	if groupDataStr := ctx.PostForm("groupdata"); groupDataStr != "" {
		if err := json.Unmarshal([]byte(groupDataStr), &groupData); err != nil {
			ctx.JSON(200, dto.Error(dto.ErrBadRequest, "invalid groupdata json"))
			return
		}
	}

	qid := uuid.New().String()

	// 处理附件上传
	var attachmentIDs []string
	form, err := ctx.MultipartForm()
	if err == nil {
		files := form.File["files"]
		for _, file := range files {
			attID := uuid.New().String()
			minioKey := fmt.Sprintf("attachments/%s/%s", qid, attID)
			if err := h.storage.UploadFile(c, minioKey, file); err != nil {
				ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to upload file: "+err.Error()))
				return
			}
			attachmentIDs = append(attachmentIDs, attID)
		}
	}

	quote := &models.Quotes{
		QID:          qid,
		Content:      content,
		Suppression:  suppression,
		UserData:     userData,
		GroupData:    groupData,
		AttachmentID: attachmentIDs,
		IsFeatured:   false,
	}

	if err := h.dao.AddQuote(c, quote); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.QuoteToDTO(quote)))
}

// GetAttachment GET /api/quotes/attachments/:attachmentId
func (h *QuoteHandler) GetAttachment(c context.Context, ctx *app.RequestContext) {
	attachmentID := ctx.Param("attachmentId")
	// 附件 ID 格式为 "qid/fileId"，通过参数传递完整路径
	// 实际使用中 attachmentId 是完整 minio key 或 qid+fileId
	// 这里假设 attachmentId 格式为 "qid/filename"

	reader, err := h.storage.GetFile(c, "attachments/"+attachmentID)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrNotFound, "attachment not found"))
		return
	}

	ctx.SetContentType("image/jpeg")
	_, _ = io.Copy(ctx, reader)
}

func getPageParams(ctx *app.RequestContext) (int, int) {
	page, _ := strconv.Atoi(ctx.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(ctx.Query("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}
