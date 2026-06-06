package jwt

import (
	"errors"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("hall-of-fame-secret-key-change-in-production")

type Claims struct {
	Uid  string `json:"uid"`
	Role string `json:"role"`
	jwtv5.RegisteredClaims
}

const (
	AccessTokenTTL  = time.Hour          // 1 小时
	RefreshTokenTTL = 7 * 24 * time.Hour // 7 天
)

func GenerateTokens(uid, role string) (accessToken, refreshToken string, err error) {
	// access token
	accessClaims := &Claims{
		Uid:  uid,
		Role: role,
		RegisteredClaims: jwtv5.RegisteredClaims{
			ExpiresAt: jwtv5.NewNumericDate(time.Now().Add(AccessTokenTTL)),
			IssuedAt:  jwtv5.NewNumericDate(time.Now()),
		},
	}
	accessToken, err = jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, accessClaims).SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	// refresh token
	refreshClaims := &Claims{
		Uid:  uid,
		Role: role,
		RegisteredClaims: jwtv5.RegisteredClaims{
			ExpiresAt: jwtv5.NewNumericDate(time.Now().Add(RefreshTokenTTL)),
			IssuedAt:  jwtv5.NewNumericDate(time.Now()),
		},
	}
	refreshToken, err = jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, refreshClaims).SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwtv5.ParseWithClaims(tokenStr, &Claims{}, func(token *jwtv5.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
