package middleware

import (
	"context"
	"strings"

	pkgjwt "HallOfFame/pkg/jwt"
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dto"

	"github.com/cloudwego/hertz/pkg/app"
)

func AuthMiddleware(cacheClient *cache.Cache) app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		authHeader := string(c.GetHeader("Authorization"))
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(200, dto.Error(dto.ErrUnauthorized, "missing or invalid authorization header"))
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := pkgjwt.ParseToken(tokenStr)
		if err != nil {
			c.JSON(200, dto.Error(dto.ErrUnauthorized, "invalid or expired token"))
			c.Abort()
			return
		}

		// 从 Redis 校验 token 一致性
		storedToken, err := cacheClient.GetToken(ctx, claims.Uid)
		if err != nil || storedToken != tokenStr {
			c.JSON(200, dto.Error(dto.ErrUnauthorized, "token has been revoked"))
			c.Abort()
			return
		}

		// 注入 uid 和 role 到 context
		c.Set("uid", claims.Uid)
		c.Set("role", claims.Role)

		c.Next(ctx)
	}
}
