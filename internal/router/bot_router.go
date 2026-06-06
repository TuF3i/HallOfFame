package router

import (
	"HallOfFame/internal/cache"
	"HallOfFame/internal/handler/bot"

	"github.com/cloudwego/hertz/pkg/app/server"
)

// RegisterBotRoutes 注册 QQ Bot 专用路由（无鉴权）
func RegisterBotRoutes(h *server.Hertz, cacheClient *cache.Cache, botHandler *bot.BotHandler) {
	h.POST("/api/bot/upload", botHandler.Upload)
}
