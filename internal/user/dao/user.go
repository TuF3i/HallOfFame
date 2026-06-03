package dao

import (
	"halloffame/internal/user/models"
)

func (d *UserDao) Create(user *models.User) error {
	return d.DB.Create(user).Error
}

func (d *UserDao) FindByGitHubID(githubID string) (*models.User, error) {
	var user models.User
	err := d.DB.Where("github_id = ?", githubID).First(&user).Error
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

func (d *UserDao) FindOrCreate(githubID string, nickname string, avatarURL string, email string) (*models.User, error) {
	user, err := d.FindByGitHubID(githubID)
	if err == nil {
		// Update existing user info
		d.DB.Model(user).Updates(map[string]interface{}{
			"nickname":   nickname,
			"avatar_url": avatarURL,
			"email":      email,
		})
		return user, nil
	}

	// Create new user
	newUser := &models.User{
		GitHubID:  githubID,
		Nickname:  nickname,
		AvatarURL: avatarURL,
		Email:     email,
		Role:      "user",
	}
	if err := d.Create(newUser); err != nil {
		return nil, err
	}
	return newUser, nil
}
