package middleware

import (
	"context"

	"HallOfFame/internal/dto"

	"github.com/cloudwego/hertz/pkg/app"
)

func AdminMiddleware() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		role := c.GetString("role")
		if role != "admin" && role != "owner" {
			c.JSON(200, dto.Error(dto.ErrForbidden, "admin access required"))
			c.Abort()
			return
		}
		c.Next(ctx)
	}
}
