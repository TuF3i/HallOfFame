package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"uniqueIndex;size:255"`
	Password  string    `gorm:"size:255"`
	Nickname  string    `gorm:"size:255"`
	AvatarURL string    `gorm:"size:512"`
	Role      string    `gorm:"size:50;default:user"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Whitelist struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"uniqueIndex;size:255"`
	AddedBy   uint
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
