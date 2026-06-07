package models

import (
	"time"

	"gorm.io/gorm"
)

type LoginLog struct {
	ID        int64          `gorm:"primaryKey;type:bigint;autoIncrement"`
	CreatedAt time.Time      `gorm:"column:created_at;type:timestamp;not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time      `gorm:"column:updated_at;type:timestamp;not null;default:CURRENT_TIMESTAMP"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;type:timestamp;index"`
	Uid       string         `gorm:"column:uid;type:varchar(64);index"`
	Email     string         `gorm:"column:email;type:varchar(64)"`
	IP        string         `gorm:"column:ip;type:varchar(45)"`
	Result    string         `gorm:"column:result;type:varchar(20)"`
}

func (LoginLog) TableName() string {
	return "login_logs"
}
