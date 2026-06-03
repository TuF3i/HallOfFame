package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey"`
	GitHubID  string    `gorm:"uniqueIndex;size:255"`
	Nickname  string    `gorm:"size:255"`
	AvatarURL string    `gorm:"size:512"`
	Email     string    `gorm:"size:255"`
	Role      string    `gorm:"size:50;default:user"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Whitelist struct {
	ID        uint      `gorm:"primaryKey"`
	GitHubID  string    `gorm:"uniqueIndex;size:255"`
	AddedBy   uint      // User.ID who added this entry
	CreatedAt time.Time
}

type LoginLog struct {
	ID         uint      `gorm:"primaryKey"`
	UserID     uint      `gorm:"index"`
	IP         string    `gorm:"size:64"`
	UserAgent  string    `gorm:"size:512"`
	Success    bool
	FailReason string    `gorm:"size:255"`
	CreatedAt  time.Time
}
