package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
	UserDao       *userDao.UserDao
	WhitelistDao  *userDao.WhitelistDao
	LoginLogDao   *userDao.LoginLogDao
	TokenStore    tokenstore.TokenStore
	JWTSecret     string
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string
}

type UserHandler struct {
	*UserHandlerReliance
}

func NewUserHandler(r *UserHandlerReliance) *UserHandler {
	return &UserHandler{r}
}

// GitHubLogin redirects the user to GitHub OAuth authorization page.
func (h *UserHandler) GitHubLogin(ctx context.Context, c *app.RequestContext) {
	redirectURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=user:email",
		h.GitHubClientID,
		url.QueryEscape(h.GitHubRedirectURL),
	)
	c.Redirect(consts.StatusFound, []byte(redirectURL))
}

// GitHubCallback handles the GitHub OAuth callback.
func (h *UserHandler) GitHubCallback(ctx context.Context, c *app.RequestContext) {
	code := string(c.Query("code"))
	if code == "" {
		c.JSON(consts.StatusBadRequest, utils.H{"error": "missing code"})
		return
	}

	// Exchange code for access token
	githubToken, err := h.exchangeGitHubCode(code)
	if err != nil {
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "failed to authenticate with GitHub"})
		return
	}

	// Get user info from GitHub
	githubUser, err := h.getGitHubUser(githubToken)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to get GitHub user info"})
		return
	}

	// Check whitelist (if whitelist is enabled, i.e., has entries)
	whitelistCount, _ := h.WhitelistDao.FindAll()
	if len(whitelistCount) > 0 {
		whitelisted, err := h.WhitelistDao.Exists(githubUser.ID)
		if err != nil || !whitelisted {
			// Log the failed login
			h.LoginLogDao.Create(&models.LoginLog{
				UserID:     0,
				IP:         c.ClientIP(),
				UserAgent:  string(c.GetHeader("User-Agent")),
				Success:    false,
				FailReason: "not in whitelist",
			})
			c.JSON(consts.StatusForbidden, utils.H{"error": "you are not in the whitelist"})
			return
		}
	}

	// Find or create user
	user, err := h.UserDao.FindOrCreate(githubUser.ID, githubUser.Login, githubUser.AvatarURL, githubUser.Email)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to create user"})
		return
	}

	// Check if user is banned
	if user.Role == "banned" {
		h.LoginLogDao.Create(&models.LoginLog{
			UserID:     user.ID,
			IP:         c.ClientIP(),
			UserAgent:  string(c.GetHeader("User-Agent")),
			Success:    false,
			FailReason: "user is banned",
		})
		c.JSON(consts.StatusForbidden, utils.H{"error": "your account has been banned"})
		return
	}

	// Generate tokens
	accessToken, err := jwt.GenAccessToken(h.JWTSecret, user.ID, user.GitHubID, user.Role)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to generate token"})
		return
	}

	refreshToken, err := jwt.GenRefreshToken(h.JWTSecret, user.ID, user.GitHubID, user.Role)
	if err != nil {
		c.JSON(consts.StatusInternalServerError, utils.H{"error": "failed to generate refresh token"})
		return
	}

	// Store tokens
	h.TokenStore.Set(ctx, "token:access:"+user.GitHubID, accessToken, jwt.AccessTokenExpire)
	h.TokenStore.Set(ctx, "token:refresh:"+user.GitHubID, refreshToken, jwt.RefreshTokenExpire)

	// Log success
	h.LoginLogDao.Create(&models.LoginLog{
		UserID:    user.ID,
		IP:        c.ClientIP(),
		UserAgent: string(c.GetHeader("User-Agent")),
		Success:   true,
	})

	// Redirect to frontend with token
	frontendURL := fmt.Sprintf("/?access_token=%s&refresh_token=%s", accessToken, refreshToken)
	c.Redirect(consts.StatusFound, []byte(frontendURL))
}

// RefreshToken refreshes the access token using the refresh token.
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

	// Verify the refresh token exists in store
	key := "token:refresh:" + claims.GitHubID
	stored, err := h.TokenStore.Get(ctx, key)
	if err != nil || stored != req.RefreshToken {
		c.JSON(consts.StatusUnauthorized, utils.H{"error": "refresh token revoked"})
		return
	}

	// Generate new access token
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
		"id":         user.ID,
		"github_id":  user.GitHubID,
		"nickname":   user.Nickname,
		"avatar_url": user.AvatarURL,
		"email":      user.Email,
		"role":       user.Role,
	})
}

// --- GitHub API helpers ---

type githubTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

type githubUser struct {
	ID        string `json:"node_id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Email     string `json:"email"`
}

func (h *UserHandler) exchangeGitHubCode(code string) (string, error) {
	data := url.Values{
		"client_id":     {h.GitHubClientID},
		"client_secret": {h.GitHubClientSecret},
		"code":          {code},
		"redirect_uri":  {h.GitHubRedirectURL},
	}

	resp, err := http.Post("https://github.com/login/oauth/access_token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	vals, err := url.ParseQuery(string(body))
	if err != nil {
		return "", err
	}

	token := vals.Get("access_token")
	if token == "" {
		return "", fmt.Errorf("no access token in response")
	}
	return token, nil
}

func (h *UserHandler) getGitHubUser(accessToken string) (*githubUser, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse the raw response first
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	user := &githubUser{
		ID:        getStringField(raw, "node_id"),
		Login:     getStringField(raw, "login"),
		AvatarURL: getStringField(raw, "avatar_url"),
	}

	// Get email from user
	email, _ := getStringFieldE(raw, "email")
	user.Email = email

	// If email is empty, try to get from GitHub emails API
	if user.Email == "" {
		emailResp, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		if err == nil {
			emailResp.Header.Set("Authorization", "Bearer "+accessToken)
			emailResp.Header.Set("Accept", "application/json")
			if resp2, err2 := http.DefaultClient.Do(emailResp); err2 == nil {
				defer resp2.Body.Close()
				if body2, err3 := io.ReadAll(resp2.Body); err3 == nil {
					var emails []map[string]interface{}
					if json.Unmarshal(body2, &emails) == nil {
						for _, e := range emails {
							if primary, ok := e["primary"].(bool); ok && primary {
								user.Email, _ = e["email"].(string)
								break
							}
						}
					}
				}
			}
		}
	}

	return user, nil
}

func getStringField(m map[string]interface{}, key string) string {
	v, _ := getStringFieldE(m, key)
	return v
}

func getStringFieldE(m map[string]interface{}, key string) (string, bool) {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s, true
		}
	}
	return "", false
}
