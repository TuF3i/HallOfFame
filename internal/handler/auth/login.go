package auth

import (
	"context"

	"HallOfFame/internal/dto"
	pkgjwt "HallOfFame/pkg/jwt"

	"github.com/cloudwego/hertz/pkg/app"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func (h *AuthHandler) Login(c context.Context, ctx *app.RequestContext) {
	var req dto.LoginReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}

	// Query user by email
	user, err := h.dao.GetUser(c, req.Email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			ctx.JSON(200, dto.Error(dto.ErrUnauthorized, "invalid email or password"))
			return
		}
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrUnauthorized, "invalid email or password"))
		return
	}

	// Check if account is banned
	if user.Role == "banned" {
		ctx.JSON(200, dto.Error(dto.ErrForbidden, "account has been banned"))
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := pkgjwt.GenerateTokens(user.Uid, user.Role)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Store tokens in Redis
	if err := h.cache.SetToken(c, user.Uid, accessToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	if err := h.cache.SetRefreshToken(c, user.Uid, refreshToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.LoginResp{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.UserToDTO(user),
	}))
}
