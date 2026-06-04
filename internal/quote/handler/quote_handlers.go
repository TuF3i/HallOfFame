package handler

import (
	"context"
	"math"
	"strconv"
	"time"

	"halloffame/internal/quote/dao"
	"halloffame/internal/quote/models"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (h *QuoteHandler) ListQuotesImpl(ctx context.Context, c *app.RequestContext) {
	qqGroup := string(c.Query("qq_group"))
	isFeatured := string(c.Query("is_featured"))
	startTime := string(c.Query("start_time"))
	endTime := string(c.Query("end_time"))
	pageStr := string(c.Query("page"))
	pageSizeStr := string(c.Query("page_size"))

	page, _ := strconv.ParseInt(pageStr, 10, 64)
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.ParseInt(pageSizeStr, 10, 64)
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	filter := dao.QuoteFilter{
		QQGroup:  qqGroup,
		Page:     page,
		PageSize: pageSize,
	}

	if isFeatured == "true" {
		t := true
		filter.IsFeatured = &t
	} else if isFeatured == "false" {
		f := false
		filter.IsFeatured = &f
	}

	if startTime != "" {
		t, err := time.Parse(time.RFC3339, startTime)
		if err == nil {
			filter.StartTime = &t
		}
	}
	if endTime != "" {
		t, err := time.Parse(time.RFC3339, endTime)
		if err == nil {
			filter.EndTime = &t
		}
	}

	quotes, total, err := h.QuoteDao.FindAll(ctx, filter)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to fetch quotes"})
		return
	}

	totalPages := int64(math.Ceil(float64(total) / float64(pageSize)))
	c.JSON(consts.StatusOK, utils.H{
		"quotes":      quotes,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	})
}

func (h *QuoteHandler) GetQuoteImpl(ctx context.Context, c *app.RequestContext) {
	idStr := string(c.Param("id"))
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid quote id"})
		return
	}

	quote, err := h.QuoteDao.FindByID(ctx, id)
	if err != nil {
		c.JSON(consts.StatusNotFound, utils.H{"error": "quote not found"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{"quote": quote})
}

func (h *QuoteHandler) CreateQuoteImpl(ctx context.Context, c *app.RequestContext) {
	var req struct {
		QQGroup string `json:"qq_group"`
		Speaker string `json:"speaker"`
		Content string `json:"content"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}

	if req.QQGroup == "" || req.Content == "" {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "qq_group and content are required"})
		return
	}

	userID, _ := c.Get("user_id")

	h.QQGroupDao.FindOrCreate(ctx, req.QQGroup)

	quote := &models.Quote{
		QQGroup:   req.QQGroup,
		Speaker:   req.Speaker,
		Content:   req.Content,
		CreatedBy: userID.(uint),
	}

	if err := h.QuoteDao.Create(ctx, quote); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to create quote"})
		return
	}

	c.JSON(consts.StatusCreated, utils.H{"quote": quote})
}

func (h *QuoteHandler) DeleteQuoteImpl(ctx context.Context, c *app.RequestContext) {
	idStr := string(c.Param("id"))
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid quote id"})
		return
	}

	if err := h.QuoteDao.SoftDelete(ctx, id); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to delete quote"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{"message": "deleted"})
}

func (h *QuoteHandler) ToggleFeaturedImpl(ctx context.Context, c *app.RequestContext) {
	idStr := string(c.Param("id"))
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid quote id"})
		return
	}

	var req struct {
		Featured bool `json:"featured"`
	}
	if err := c.BindJSON(&req); err != nil {
		quote, err := h.QuoteDao.FindByID(ctx, id)
		if err != nil {
			c.JSON(consts.StatusNotFound, utils.H{"error": "quote not found"})
			return
		}
		req.Featured = !quote.IsFeatured
	}

	if err := h.QuoteDao.SetFeatured(ctx, id, req.Featured); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to update quote"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{"message": "updated"})
}

func (h *QuoteHandler) ListGroupsImpl(ctx context.Context, c *app.RequestContext) {
	groups, err := h.QQGroupDao.FindAll(ctx)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to fetch groups"})
		return
	}
	c.JSON(consts.StatusOK, utils.H{"groups": groups})
}

func (h *QuoteHandler) BotCreateQuoteImpl(ctx context.Context, c *app.RequestContext) {
	var req struct {
		QQGroup string `json:"qq_group"`
		Speaker string `json:"speaker"`
		Content string `json:"content"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}

	h.QQGroupDao.FindOrCreate(ctx, req.QQGroup)

	quote := &models.Quote{
		QQGroup:   req.QQGroup,
		Speaker:   req.Speaker,
		Content:   req.Content,
		CreatedBy: 0,
	}

	if err := h.QuoteDao.Create(ctx, quote); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to create quote"})
		return
	}

	c.JSON(consts.StatusCreated, utils.H{"quote_id": quote.ID.Hex()})
}
