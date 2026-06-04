package handler

import (
	"halloffame/internal/middleware"

	"github.com/cloudwego/hertz/pkg/app/server"
)

func (h *UserHandler) RegisterRoutes(svr *server.Hertz, mw *middleware.Middleware) {
	auth := svr.Group("/api/v1/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/refresh", h.RefreshToken)
	}

	user := svr.Group("/api/v1/user", mw.JWTAuthMiddleware())
	{
		user.GET("/profile", h.GetProfile)
	}
}

func (h *UserHandler) RegisterBotRoutes(botGroup interface{}) {
}
