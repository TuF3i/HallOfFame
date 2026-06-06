package auth

import (
	"context"

	"HallOfFame/internal/dto"
	pkgjwt "HallOfFame/pkg/jwt"

	"github.com/cloudwego/hertz/pkg/app"
)

func (h *AuthHandler) Refresh(c context.Context, ctx *app.RequestContext) {
	var req dto.RefreshReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}

	// Parse refresh token
	claims, err := pkgjwt.ParseToken(req.RefreshToken)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrUnauthorized, "invalid or expired refresh token"))
		return
	}

	// Get stored refresh token from Redis
	storedRefreshToken, err := h.cache.GetRefreshToken(c, claims.Uid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrUnauthorized, "refresh token not found or expired"))
		return
	}

	// Compare the provided refresh token with the stored one
	if storedRefreshToken != req.RefreshToken {
		ctx.JSON(200, dto.Error(dto.ErrUnauthorized, "refresh token mismatch"))
		return
	}

	// Delete old tokens
	if err := h.cache.DeleteUserAllTokens(c, claims.Uid); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Generate new tokens
	accessToken, refreshToken, err := pkgjwt.GenerateTokens(claims.Uid, claims.Role)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Store new tokens in Redis
	if err := h.cache.SetToken(c, claims.Uid, accessToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	if err := h.cache.SetRefreshToken(c, claims.Uid, refreshToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.RefreshResp{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}))
}
