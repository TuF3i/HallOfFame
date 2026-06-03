package dao

import (
	"halloffame/internal/user/models"
)

func (d *LoginLogDao) Create(log *models.LoginLog) error {
	return d.DB.Create(log).Error
}

func (d *LoginLogDao) FindAll(page int, pageSize int) ([]models.LoginLog, int64, error) {
	var logs []models.LoginLog
	var total int64

	d.DB.Model(&models.LoginLog{}).Count(&total)
	err := d.DB.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

func (d *LoginLogDao) FindByUserID(userID uint, page int, pageSize int) ([]models.LoginLog, int64, error) {
	var logs []models.LoginLog
	var total int64

	d.DB.Model(&models.LoginLog{}).Where("user_id = ?", userID).Count(&total)
	err := d.DB.Where("user_id = ?", userID).Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}
