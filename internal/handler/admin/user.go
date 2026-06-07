package admin

import (
	"context"
	"strconv"

	"HallOfFame/internal/consumer"
	"HallOfFame/internal/dto"

	"github.com/cloudwego/hertz/pkg/app"
)

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

func (h *AdminHandler) TriggerAnalysis(c context.Context, ctx *app.RequestContext) {
	if err := consumer.Trigger(c); err != nil {
		ctx.JSON(200, dto.Error(dto.ErrInternal, err.Error()))
		return
	}
	ctx.JSON(200, dto.SuccessResp(nil))
}
