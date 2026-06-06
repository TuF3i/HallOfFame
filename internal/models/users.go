package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        int64          `gorm:"primaryKey;type:bigint;autoIncrement;comment:表自增主键ID"`
	CreatedAt time.Time      `gorm:"column:created_at;type:timestamp;not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
	UpdatedAt time.Time      `gorm:"column:updated_at;type:timestamp;not null;default:CURRENT_TIMESTAMP;comment:更新时间"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;type:timestamp;index;comment:删除时间（软删除）"`

	Uid      string `json:"uid" gorm:"column:uid;type:varchar(64);not null;uniqueIndex;comment:用户唯一ID"`
	Role     string `json:"role" gorm:"column:role;type:varchar(20);comment:用户角色"`
	Email    string `json:"email" gorm:"column:email;type:varchar(64);comment:用户邮箱"`
	Password string `json:"password" gorm:"column:password;type:varchar(256);comment:用户密码"`
	Nickname string `json:"nickname" gorm:"column:nickname;type:varchar(64);comment:用户昵称"`
}
