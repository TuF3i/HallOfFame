package dao

import (
	"halloffame/internal/user/models"
	"golang.org/x/crypto/bcrypt"
)

func (d *UserDao) Create(user *models.User) error {
	return d.DB.Create(user).Error
}

func (d *UserDao) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := d.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *UserDao) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := d.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *UserDao) FindAll() ([]models.User, error) {
	var users []models.User
	err := d.DB.Order("created_at DESC").Find(&users).Error
	return users, err
}

func (d *UserDao) UpdateRole(id uint, role string) error {
	return d.DB.Model(&models.User{}).Where("id = ?", id).Update("role", role).Error
}

func (d *UserDao) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func (d *UserDao) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
