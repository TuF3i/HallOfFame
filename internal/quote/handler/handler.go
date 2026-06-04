package handler

import (
	"context"

	"halloffame/internal/middleware"
	quoteDaoPkg "halloffame/internal/quote/dao"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

type QuoteHandlerReliance struct {
	QuoteDao   *quoteDaoPkg.QuoteDao
	QQGroupDao *quoteDaoPkg.QQGroupDao
}

type QuoteHandler struct {
	*QuoteHandlerReliance
}

func NewQuoteHandler(r *QuoteHandlerReliance) *QuoteHandler {
	return &QuoteHandler{r}
}

func (h *QuoteHandler) RegisterRoutes(svr *server.Hertz, mw *middleware.Middleware) {
	api := svr.Group("/api/v1")

	api.GET("/quotes", h.ListQuotes)
	api.GET("/quotes/:id", h.GetQuote)
	api.GET("/groups", h.ListGroups)

	auth := api.Group("", mw.JWTAuthMiddleware())
	{
		auth.POST("/quotes", h.CreateQuote)
		auth.DELETE("/quotes/:id", h.DeleteQuote)
		auth.PUT("/quotes/:id/feature", h.ToggleFeatured)
	}
}

func (h *QuoteHandler) RegisterBotRoutes(bot apiRouter) {
	bot.POST("/quotes", h.BotCreateQuote)
	bot.GET("/groups", h.BotListGroups)
}

type apiRouter interface {
	POST(path string, handler app.HandlerFunc)
	GET(path string, handler app.HandlerFunc)
	PUT(path string, handler app.HandlerFunc)
	DELETE(path string, handler app.HandlerFunc)
}

func (h *QuoteHandler) ListQuotes(ctx context.Context, c *app.RequestContext) {
	h.ListQuotesImpl(ctx, c)
}

func (h *QuoteHandler) GetQuote(ctx context.Context, c *app.RequestContext) {
	h.GetQuoteImpl(ctx, c)
}

func (h *QuoteHandler) CreateQuote(ctx context.Context, c *app.RequestContext) {
	h.CreateQuoteImpl(ctx, c)
}

func (h *QuoteHandler) DeleteQuote(ctx context.Context, c *app.RequestContext) {
	h.DeleteQuoteImpl(ctx, c)
}

func (h *QuoteHandler) ToggleFeatured(ctx context.Context, c *app.RequestContext) {
	h.ToggleFeaturedImpl(ctx, c)
}

func (h *QuoteHandler) ListGroups(ctx context.Context, c *app.RequestContext) {
	h.ListGroupsImpl(ctx, c)
}

func (h *QuoteHandler) BotCreateQuote(ctx context.Context, c *app.RequestContext) {
	h.BotCreateQuoteImpl(ctx, c)
}

func (h *QuoteHandler) BotListGroups(ctx context.Context, c *app.RequestContext) {
	h.ListGroupsImpl(ctx, c)
}
