package handler

import (
	"context"

	"halloffame/internal/middleware"
	quoteDaoPkg "halloffame/internal/quote/dao"
	"halloffame/pkg/storage"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

type QuoteHandlerReliance struct {
	QuoteDao   *quoteDaoPkg.QuoteDao
	QQGroupDao *quoteDaoPkg.QQGroupDao
	Storage    storage.Storage
}

type QuoteHandler struct {
	*QuoteHandlerReliance
}

func NewQuoteHandler(r *QuoteHandlerReliance) *QuoteHandler {
	return &QuoteHandler{r}
}

func (h *QuoteHandler) RegisterRoutes(svr *server.Hertz, mw *middleware.Middleware) {
	api := svr.Group("/api/v1")

	// Public routes (read-only, no auth needed)
	api.GET("/quotes", h.ListQuotes)
	api.GET("/quotes/:id", h.GetQuote)
	api.GET("/groups", h.ListGroups)

	// Authenticated routes
	auth := api.Group("", mw.JWTAuthMiddleware())
	{
		auth.POST("/quotes", h.CreateQuote)
		auth.PUT("/quotes/:id", h.UpdateQuote)
		auth.DELETE("/quotes/:id", h.DeleteQuote)
		auth.PUT("/quotes/:id/feature", h.ToggleFeatured)
		auth.POST("/quotes/:id/images", h.UploadImage)
	}
}

// RegisterBotRoutes registers bot-accessible routes (no auth, separate server).
func (h *QuoteHandler) RegisterBotRoutes(bot apiRouter) {
	bot.POST("/quotes", h.BotCreateQuote)
	bot.POST("/quotes/:id/images", h.BotUploadImage)
	bot.GET("/groups", h.BotListGroups)
}

// apiRouter is an interface for registering routes on the bot server.
type apiRouter interface {
	POST(path string, handler app.HandlerFunc)
	GET(path string, handler app.HandlerFunc)
	PUT(path string, handler app.HandlerFunc)
	DELETE(path string, handler app.HandlerFunc)
}

// --- Route handlers (delegate to Impl methods) ---

func (h *QuoteHandler) ListQuotes(ctx context.Context, c *app.RequestContext) {
	h.ListQuotesImpl(ctx, c)
}

func (h *QuoteHandler) GetQuote(ctx context.Context, c *app.RequestContext) {
	h.GetQuoteImpl(ctx, c)
}

func (h *QuoteHandler) CreateQuote(ctx context.Context, c *app.RequestContext) {
	h.CreateQuoteImpl(ctx, c)
}

func (h *QuoteHandler) UpdateQuote(ctx context.Context, c *app.RequestContext) {
	h.UpdateQuoteImpl(ctx, c)
}

func (h *QuoteHandler) DeleteQuote(ctx context.Context, c *app.RequestContext) {
	h.DeleteQuoteImpl(ctx, c)
}

func (h *QuoteHandler) ToggleFeatured(ctx context.Context, c *app.RequestContext) {
	h.ToggleFeaturedImpl(ctx, c)
}

func (h *QuoteHandler) UploadImage(ctx context.Context, c *app.RequestContext) {
	h.UploadImageImpl(ctx, c)
}

func (h *QuoteHandler) ListGroups(ctx context.Context, c *app.RequestContext) {
	h.ListGroupsImpl(ctx, c)
}

// Bot handlers (no auth)
func (h *QuoteHandler) BotCreateQuote(ctx context.Context, c *app.RequestContext) {
	h.BotCreateQuoteImpl(ctx, c)
}

func (h *QuoteHandler) BotUploadImage(ctx context.Context, c *app.RequestContext) {
	h.UploadImageImpl(ctx, c)
}

func (h *QuoteHandler) BotListGroups(ctx context.Context, c *app.RequestContext) {
	h.ListGroupsImpl(ctx, c)
}
