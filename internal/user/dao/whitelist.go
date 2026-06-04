package dao

import (
	"halloffame/internal/user/models"
)

func (d *WhitelistDao) Create(entry *models.Whitelist) error {
	return d.DB.Create(entry).Error
}

func (d *WhitelistDao) FindAll() ([]models.Whitelist, error) {
	var entries []models.Whitelist
	err := d.DB.Order("created_at DESC").Find(&entries).Error
	return entries, err
}

func (d *WhitelistDao) FindByEmail(email string) (*models.Whitelist, error) {
	var entry models.Whitelist
	err := d.DB.Where("email = ?", email).First(&entry).Error
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (d *WhitelistDao) Exists(email string) (bool, error) {
	var count int64
	err := d.DB.Model(&models.Whitelist{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

func (d *WhitelistDao) DeleteByID(id uint) error {
	return d.DB.Delete(&models.Whitelist{}, id).Error
}
