package auth

import (
	"context"

	"HallOfFame/internal/dto"
	"HallOfFame/internal/models"
	pkgjwt "HallOfFame/pkg/jwt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const minPasswordLength = 5

func (h *AuthHandler) Register(c context.Context, ctx *app.RequestContext) {
	// Check if registration is enabled
	enabled, err := h.cache.GetRegistrationEnabled(c)
	if err == nil && !enabled {
		ctx.JSON(200, dto.Error(dto.ErrForbidden, "注册已关闭"))
		return
	}

	var req dto.RegisterReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}

	// Check if email already exists
	_, err = h.dao.GetUser(c, req.Email)
	if err == nil {
		ctx.JSON(200, dto.Error(dto.ErrConflict, "email already registered"))
		return
	}
	if err != gorm.ErrRecordNotFound {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Validate password length
	if len(req.Password) < minPasswordLength {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "password must be at least 5 characters"))
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Generate UUID as uid
	uid := uuid.New().String()

	user := &models.User{
		Uid:      uid,
		Email:    req.Email,
		Password: string(hashedPassword),
		Nickname: req.Nickname,
		Role:     "user",
	}

	if err := h.dao.AddUser(c, user); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := pkgjwt.GenerateTokens(uid, user.Role)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	// Store tokens in Redis
	if err := h.cache.SetToken(c, uid, accessToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	if err := h.cache.SetRefreshToken(c, uid, refreshToken); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.RegisterResp{
		Uid:          uid,
		Email:        req.Email,
		Nickname:     req.Nickname,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}))
}
