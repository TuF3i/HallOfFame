package middleware

import (
	"context"
	"strings"

	"halloffame/pkg/jwt"
	"halloffame/pkg/tokenstore"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type Middleware struct {
	JWTSecret  string
	TokenStore tokenstore.TokenStore
}

type MiddlewareReliance struct {
	JWTSecret  string
	TokenStore tokenstore.TokenStore
}

func NewMiddleware(r *MiddlewareReliance) *Middleware {
	return &Middleware{
		JWTSecret:  r.JWTSecret,
		TokenStore: r.TokenStore,
	}
}

// JWTAuthMiddleware verifies JWT access token and injects claims into context.
func (m *Middleware) JWTAuthMiddleware() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		authHeader := string(c.GetHeader("Authorization"))
		if authHeader == "" {
			c.JSON(consts.StatusUnauthorized, utils.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(consts.StatusUnauthorized, utils.H{"error": "invalid authorization format"})
			c.Abort()
			return
		}

		claims, err := jwt.VerifyToken(m.JWTSecret, tokenString)
		if err != nil {
			c.JSON(consts.StatusUnauthorized, utils.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		// Verify token is stored (not revoked)
		key := "token:access:" + claims.GitHubID
		stored, err := m.TokenStore.Exists(ctx, key)
		if err != nil || !stored {
			c.JSON(consts.StatusUnauthorized, utils.H{"error": "token revoked"})
			c.Abort()
			return
		}

		// Inject claims into context
		c.Set("user_id", claims.UserID)
		c.Set("github_id", claims.GitHubID)
		c.Set("role", claims.Role)
		c.Next(ctx)
	}
}

// AdminOnly restricts access to admin and owner roles.
func AdminOnly() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(consts.StatusForbidden, utils.H{"error": "forbidden"})
			c.Abort()
			return
		}
		roleStr := role.(string)
		if roleStr != "admin" && roleStr != "owner" {
			c.JSON(consts.StatusForbidden, utils.H{"error": "admin access required"})
			c.Abort()
			return
		}
		c.Next(ctx)
	}
}

// OwnerOnly restricts access to owner role only.
func OwnerOnly() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(consts.StatusForbidden, utils.H{"error": "forbidden"})
			c.Abort()
			return
		}
		if role.(string) != "owner" {
			c.JSON(consts.StatusForbidden, utils.H{"error": "owner access required"})
			c.Abort()
			return
		}
		c.Next(ctx)
	}
}
