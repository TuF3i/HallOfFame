package dto

import (
	"strings"

	"HallOfFame/internal/models"
)

type RegisterReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

type UpdateRoleReq struct {
	Role string `json:"role"`
}

type RegisterResp struct {
	Uid          string `json:"uid"`
	Email        string `json:"email"`
	Nickname     string `json:"nickname"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LoginResp struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}

type UserInfo struct {
	Uid      string `json:"uid"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
}

type RefreshResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// UserToDTO converts a models.User to a UserInfo DTO.
// Since the User model does not have a Nickname field,
// the part before "@" in the email is used as the nickname.
func UserToDTO(user *models.User) UserInfo {
	nickname := user.Email
	if idx := strings.Index(user.Email, "@"); idx > 0 {
		nickname = user.Email[:idx]
	}
	return UserInfo{
		Uid:      user.Uid,
		Email:    user.Email,
		Nickname: nickname,
		Role:     user.Role,
	}
}
