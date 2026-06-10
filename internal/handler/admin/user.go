package admin

import (
	"context"
	"strconv"

	"HallOfFame/internal/consumer"
	"HallOfFame/internal/dto"
	"HallOfFame/internal/models"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandler) CreateUser(c context.Context, ctx *app.RequestContext) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Nickname string `json:"nickname"`
		Role     string `json:"role"`
	}
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}

	// Check if email already exists
	_, err := h.dao.GetUser(c, req.Email)
	if err == nil {
		ctx.JSON(200, dto.Error(dto.ErrConflict, "邮箱已被注册"))
		return
	}

	// Validate password length
	if len(req.Password) < 5 {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "password must be at least 5 characters"))
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	uid := uuid.New().String()

	role := req.Role
	if role != "admin" && role != "user" && role != "banned" {
		role = "user"
	}

	user := &models.User{
		Uid:      uid,
		Email:    req.Email,
		Password: string(hashedPassword),
		Nickname: req.Nickname,
		Role:     role,
	}

	if err := h.dao.AddUser(c, user); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.UserToDTO(user)))
}

func (h *AdminHandler) ListUsers(c context.Context, ctx *app.RequestContext) {
	page, _ := strconv.Atoi(ctx.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(ctx.Query("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	users, total, err := h.dao.ListUsers(c, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}

	items := make([]dto.UserInfo, len(users))
	for i, u := range users {
		items[i] = dto.UserToDTO(&u)
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.UserInfo]{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

func (h *AdminHandler) UpdateRole(c context.Context, ctx *app.RequestContext) {
	uid := ctx.Param("uid")

	var req dto.UpdateRoleReq
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "invalid request body"))
		return
	}

	if req.Role != "admin" && req.Role != "user" && req.Role != "banned" {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, "role must be one of: admin, user, banned"))
		return
	}

	user, err := h.dao.GetUserByUid(c, uid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrNotFound, "user not found"))
		return
	}

	if err := h.dao.UpdateUserRole(c, user.Uid, req.Role); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to update user role"))
		return
	}

	if req.Role == "banned" {
		if err := h.cache.DeleteUserAllTokens(c, user.Uid); err != nil {
			ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to clear user tokens"))
			return
		}
	}

	updatedUser, err := h.dao.GetUserByUid(c, uid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to retrieve updated user"))
		return
	}

	ctx.JSON(200, dto.SuccessResp(dto.UserToDTO(updatedUser)))
}

func (h *AdminHandler) DeleteUser(c context.Context, ctx *app.RequestContext) {
	uid := ctx.Param("uid")

	user, err := h.dao.GetUserByUid(c, uid)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrNotFound, "user not found"))
		return
	}

	if err := h.cache.DeleteUserAllTokens(c, user.Uid); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to clear user tokens"))
		return
	}

	if err := h.dao.DeleteUser(c, user.Uid); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "failed to delete user"))
		return
	}

	ctx.JSON(200, dto.SuccessResp(nil))
}

func (h *AdminHandler) ListLoginLogs(c context.Context, ctx *app.RequestContext) {
	page, _ := strconv.Atoi(ctx.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(ctx.Query("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := h.dao.ListLoginLogs(c, page, pageSize)
	if err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, "Failed to query login logs."))
		return
	}

	items := make([]dto.LoginLogInfo, len(logs))
	for i, log := range logs {
		items[i] = dto.LoginLogToDTO(&log)
	}

	ctx.JSON(200, dto.SuccessResp(dto.PageResult[dto.LoginLogInfo]{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}))
}

func (h *AdminHandler) GetRegistrationConfig(c context.Context, ctx *app.RequestContext) {
	enabled, err := h.cache.GetRegistrationEnabled(c)
	if err != nil {
		// Default to enabled if not set
		ctx.JSON(200, dto.SuccessResp(map[string]bool{"registration_enabled": true}))
		return
	}
	ctx.JSON(200, dto.SuccessResp(map[string]bool{"registration_enabled": enabled}))
}

func (h *AdminHandler) SetRegistrationConfig(c context.Context, ctx *app.RequestContext) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := ctx.BindAndValidate(&req); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrBadRequest, err.Error()))
		return
	}
	if err := h.cache.SetRegistrationEnabled(c, req.Enabled); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	ctx.JSON(200, dto.SuccessResp(map[string]bool{"registration_enabled": req.Enabled}))
}

func (h *AdminHandler) TriggerAnalysis(c context.Context, ctx *app.RequestContext) {
	if err := consumer.Trigger(c); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	ctx.JSON(200, dto.SuccessResp(nil))
}
