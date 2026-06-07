package router

import (
	"HallOfFame/internal/cache"
	"HallOfFame/internal/handler/admin"
	"HallOfFame/internal/handler/auth"
	"HallOfFame/internal/handler/quote"
	"HallOfFame/internal/middleware"

	"github.com/cloudwego/hertz/pkg/app/server"
)

func RegisterRoutes(h *server.Hertz, cacheClient *cache.Cache, authHandler *auth.AuthHandler, adminHandler *admin.AdminHandler, quoteHandler *quote.QuoteHandler) {
	// 公开路由（无需认证）
	authGroup := h.Group("/api/auth")
	authGroup.POST("/register", authHandler.Register)
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/refresh", authHandler.Refresh)

	// Quote 公开路由（需 JWT 认证）
	quoteGroup := h.Group("/api/quotes", middleware.AuthMiddleware(cacheClient))
	quoteGroup.GET("/speakers", quoteHandler.ListSpeakers)
	quoteGroup.GET("/speakers/:qqNumber/quotes", quoteHandler.ListSpeakerQuotes)
	quoteGroup.GET("/featured", quoteHandler.ListFeaturedQuotes)
	quoteGroup.GET("/attachments/:qid/:attId", quoteHandler.GetAttachment)

	// 管理路由（需要 JWT 认证 + Admin 权限）
	adminGroup := h.Group("/api/admin", middleware.AuthMiddleware(cacheClient), middleware.AdminMiddleware())
	// 精确路由放前面，避免与参数化路由冲突
	adminGroup.POST("/quotes/trigger", adminHandler.TriggerAnalysis)
	adminGroup.GET("/quotes", quoteHandler.ListAllQuotes)
	adminGroup.POST("/quotes", quoteHandler.CreateQuote)
	adminGroup.GET("/users", adminHandler.ListUsers)
	adminGroup.GET("/login-logs", adminHandler.ListLoginLogs)
	// 参数化路由
	adminGroup.PUT("/users/:uid/role", adminHandler.UpdateRole)
	adminGroup.DELETE("/users/:uid", adminHandler.DeleteUser)
	adminGroup.PUT("/quotes/:qid/featured", quoteHandler.SetFeatured)
	adminGroup.DELETE("/quotes/:qid", quoteHandler.DeleteQuote)
	adminGroup.DELETE("/speakers/:qqNumber", quoteHandler.DeleteSpeaker)
}
