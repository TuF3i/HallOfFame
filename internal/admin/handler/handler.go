package handler

import (
	"context"
	"strconv"

	"halloffame/internal/middleware"
	userDaoPkg "halloffame/internal/user/dao"
	"halloffame/internal/user/models"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type AdminHandlerReliance struct {
	UserDao      *userDaoPkg.UserDao
	WhitelistDao *userDaoPkg.WhitelistDao
	LoginLogDao  *userDaoPkg.LoginLogDao
}

type AdminHandler struct {
	*AdminHandlerReliance
}

func NewAdminHandler(r *AdminHandlerReliance) *AdminHandler {
	return &AdminHandler{r}
}

func (h *AdminHandler) RegisterRoutes(svr *server.Hertz, mw *middleware.Middleware) {
	admin := svr.Group("/api/v1/admin", mw.JWTAuthMiddleware(), middleware.AdminOnly())
	{
		admin.GET("/users", h.ListUsers)
		admin.PUT("/users/:id/role", h.UpdateUserRole)
		admin.GET("/whitelist", h.ListWhitelist)
		admin.POST("/whitelist", h.AddWhitelist)
		admin.DELETE("/whitelist/:id", h.RemoveWhitelist)
		admin.GET("/login-logs", h.ListLoginLogs)
	}
}

func (h *AdminHandler) ListUsers(ctx context.Context, c *app.RequestContext) {
	users, err := h.UserDao.FindAll()
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to fetch users"})
		return
	}
	c.JSON(consts.StatusOK, utils.H{"users": users})
}

func (h *AdminHandler) UpdateUserRole(ctx context.Context, c *app.RequestContext) {
	idStr := string(c.Param("id"))
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid request"})
		return
	}

	validRoles := map[string]bool{"user": true, "admin": true, "banned": true}
	if !validRoles[req.Role] {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid role"})
		return
	}

	if err := h.UserDao.UpdateRole(uint(id), req.Role); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to update role"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{"message": "role updated"})
}

func (h *AdminHandler) ListWhitelist(ctx context.Context, c *app.RequestContext) {
	entries, err := h.WhitelistDao.FindAll()
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to fetch whitelist"})
		return
	}
	c.JSON(consts.StatusOK, utils.H{"whitelist": entries})
}

func (h *AdminHandler) AddWhitelist(ctx context.Context, c *app.RequestContext) {
	var req struct {
		GitHubID string `json:"github_id"`
	}
	if err := c.BindJSON(&req); err != nil || req.GitHubID == "" {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "github_id is required"})
		return
	}

	adminUserID, _ := c.Get("user_id")

	entry := &models.Whitelist{
		GitHubID: req.GitHubID,
		AddedBy:  adminUserID.(uint),
	}

	if err := h.WhitelistDao.Create(entry); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to add whitelist entry"})
		return
	}

	c.JSON(consts.StatusCreated, utils.H{"whitelist": entry})
}

func (h *AdminHandler) RemoveWhitelist(ctx context.Context, c *app.RequestContext) {
	idStr := string(c.Param("id"))
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "invalid id"})
		return
	}

	if err := h.WhitelistDao.DeleteByID(uint(id)); err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to remove whitelist entry"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{"message": "removed"})
}

func (h *AdminHandler) ListLoginLogs(ctx context.Context, c *app.RequestContext) {
	pageStr := string(c.Query("page"))
	pageSizeStr := string(c.Query("page_size"))

	page, _ := strconv.Atoi(pageStr)
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := h.LoginLogDao.FindAll(page, pageSize)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to fetch login logs"})
		return
	}

	c.JSON(consts.StatusOK, utils.H{
		"logs":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
