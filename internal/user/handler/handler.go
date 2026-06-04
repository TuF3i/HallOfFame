package handler

import (
	"context"
	"strings"

	"halloffame/internal/user/models"
	userDao "halloffame/internal/user/dao"
	"halloffame/pkg/jwt"
	"halloffame/pkg/tokenstore"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type UserHandlerReliance struct {
	UserDao      *userDao.UserDao
	WhitelistDao *userDao.WhitelistDao
	LoginLogDao  *userDao.LoginLogDao
	TokenStore   tokenstore.TokenStore
	JWTSecret    string
}

type UserHandler struct {
	*UserHandlerReliance
}

func NewUserHandler(r *UserHandlerReliance) *UserHandler {
	return &UserHandler{r}
}

// Register handles user registration.
func (h *UserHandler) Register(ctx context.Context, c *app.RequestContext) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Nickname string `json:"nickname"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}
	if req.Email == "" || req.Password == "" {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "email and password are required"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "password must be at least 6 characters"})
		return
	}

	existing, _ := h.UserDao.FindByEmail(req.Email)
	if existing != nil {
		c.JSON(consts.StatusConflict, utils.H{"error": "email already registered"})
		return
	}

	hash, err := h.UserDao.HashPassword(req.Password)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to process password"})
		return
	}

	nickname := req.Nickname
	if nickname == "" {
		at := strings.Index(req.Email, "@")
		if at > 0 {
			nickname = req.Email[:at]
		} else {
			nickname = req.Email
		}
	}

	user := &models.User{
		Email:    req.Email,
		Password: hash,
		Nickname: nickname,
		Role:     "user",
	}
	if err := h.UserDao.Create(user); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to create user"})
		return
	}

	c.JSON(consts.StatusCreated, utils.H{"message": "registered successfully"})
}

// Login handles email/password login.
func (h *UserHandler) Login(ctx context.Context, c *app.RequestContext) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}

	user, err := h.UserDao.FindByEmail(req.Email)
	if err != nil {
		h.LoginLogDao.Create(&models.LoginLog{
			UserID:     0,
			IP:         c.ClientIP(),
			UserAgent:  string(c.GetHeader("User-Agent")),
			Success:    false,
			FailReason: "user not found",
		})
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "invalid email or password"})
		return
	}

	if !h.UserDao.CheckPassword(req.Password, user.Password) {
		h.LoginLogDao.Create(&models.LoginLog{
			UserID:     user.ID,
			IP:         c.ClientIP(),
			UserAgent:  string(c.GetHeader("User-Agent")),
			Success:    false,
			FailReason: "wrong password",
		})
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "invalid email or password"})
		return
	}

	if user.Role == "banned" {
		h.LoginLogDao.Create(&models.LoginLog{
			UserID:     user.ID,
			IP:         c.ClientIP(),
			UserAgent:  string(c.GetHeader("User-Agent")),
			Success:    false,
			FailReason: "user banned",
		})
		c.JSON(consts.StatusForbidden, utils.H{"error": "your account has been banned"})
		return
	}

	accessToken, err := jwt.GenAccessToken(h.JWTSecret, user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to generate token"})
		return
	}
	refreshToken, err := jwt.GenRefreshToken(h.JWTSecret, user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to generate token"})
		return
	}

	h.TokenStore.Set(ctx, "token:access:"+user.Email, accessToken, jwt.AccessTokenExpire)
	h.TokenStore.Set(ctx, "token:refresh:"+user.Email, refreshToken, jwt.RefreshTokenExpire)

	h.LoginLogDao.Create(&models.LoginLog{
		UserID:    user.ID,
		IP:        c.ClientIP(),
		UserAgent: string(c.GetHeader("User-Agent")),
		Success:   true,
	})

	c.JSON(consts.StatusOK, utils.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

// RefreshToken refreshes the access token.
func (h *UserHandler) RefreshToken(ctx context.Context, c *app.RequestContext) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}

	claims, err := jwt.VerifyToken(h.JWTSecret, req.RefreshToken)
	if err != nil {
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "invalid refresh token"})
		return
	}

	key := "token:refresh:" + claims.GitHubID
	stored, err := h.TokenStore.Get(ctx, key)
	if err != nil || stored != req.RefreshToken {
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "refresh token revoked"})
		return
	}

	accessToken, err := jwt.GenAccessToken(h.JWTSecret, claims.UserID, claims.GitHubID, claims.Role)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to generate token"})
		return
	}

	h.TokenStore.Set(ctx, "token:access:"+claims.GitHubID, accessToken, jwt.AccessTokenExpire)
	c.JSON(consts.StatusOK, utils.H{"access_token": accessToken})
}

// GetProfile returns the current user's profile.
func (h *UserHandler) GetProfile(ctx context.Context, c *app.RequestContext) {
	userID, _ := c.Get("user_id")
	user, err := h.UserDao.FindByID(userID.(uint))
	if err != nil {
		c.JSON(consts.StatusNotFound, utils.H{"error": "user not found"})
		return
	}
	c.JSON(consts.StatusOK, utils.H{
		"id":       user.ID,
		"email":    user.Email,
		"nickname": user.Nickname,
		"role":     user.Role,
	})
}
