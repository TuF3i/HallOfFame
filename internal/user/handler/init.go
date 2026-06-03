package handler

import (
	"halloffame/internal/middleware"

	"github.com/cloudwego/hertz/pkg/app/server"
)

// RegisterRoutes registers all user-related routes on the given Hertz server group.
func (h *UserHandler) RegisterRoutes(svr *server.Hertz, mw *middleware.Middleware) {
	auth := svr.Group("/api/v1/auth")
	{
		auth.GET("/github/login", h.GitHubLogin)
		auth.GET("/github/callback", h.GitHubCallback)
		auth.POST("/refresh", h.RefreshToken)
	}

	user := svr.Group("/api/v1/user", mw.JWTAuthMiddleware())
	{
		user.GET("/profile", h.GetProfile)
	}
}
