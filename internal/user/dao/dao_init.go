package dao

import (
	"halloffame/internal/user/models"

	"gorm.io/gorm"
)

// UserDaoReliance declares dependencies for UserDao.
type UserDaoReliance struct {
	DB *gorm.DB
}

// UserDao provides data access for users.
type UserDao struct {
	*UserDaoReliance
}

// NewUserDao creates a new UserDao with injected dependencies.
func NewUserDao(r *UserDaoReliance) *UserDao {
	return &UserDao{r}
}

// LoginLogDaoReliance declares dependencies for LoginLogDao.
type LoginLogDaoReliance struct {
	DB *gorm.DB
}

// LoginLogDao provides data access for login logs.
type LoginLogDao struct {
	*LoginLogDaoReliance
}

// NewLoginLogDao creates a new LoginLogDao with injected dependencies.
func NewLoginLogDao(r *LoginLogDaoReliance) *LoginLogDao {
	return &LoginLogDao{r}
}

// WhitelistDaoReliance declares dependencies for WhitelistDao.
type WhitelistDaoReliance struct {
	DB *gorm.DB
}

// WhitelistDao provides data access for whitelist.
type WhitelistDao struct {
	*WhitelistDaoReliance
}

// NewWhitelistDao creates a new WhitelistDao with injected dependencies.
func NewWhitelistDao(r *WhitelistDaoReliance) *WhitelistDao {
	return &WhitelistDao{r}
}

// AutoMigrate runs GORM auto migration for all user-related models.
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&models.User{}, &models.Whitelist{}, &models.LoginLog{})
}
