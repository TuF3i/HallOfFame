package dao

import (
	"HallOfFame/internal/models"
	"HallOfFame/pkg/consts"
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
)

func (r *Dao) IfUserExist(ctx context.Context, uid string) (bool, error) {
	var user models.User
	if err := r.PostgresClient.Client.Where("uid = ?", uid).First(&user).WithContext(ctx).Error; err != nil {
		return false, err
	}
	return true, nil
}

func (r *Dao) AddUser(ctx context.Context, userInfo *models.User) error {
	ok, err := r.IfUserExist(ctx, userInfo.Uid)
	if err != nil {
		return err
	}
	if ok {
		return fmt.Errorf("user %s already exist", userInfo.Uid)
	}
	return r.PostgresClient.Client.Create(userInfo).WithContext(ctx).Error
}

func (r *Dao) GetUser(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	if err := r.PostgresClient.Client.Where("email = ?", email).First(&user).WithContext(ctx).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Dao) DeleteUser(ctx context.Context, uid string) error {
	return r.PostgresClient.Client.Where("uid = ?", uid).Delete(&models.User{}).WithContext(ctx).Error
}

func (r *Dao) ListUsers(ctx context.Context, page, pageSize int) ([]models.User, int64, error) {
	var total int64
	if err := r.PostgresClient.Client.Model(&models.User{}).
		Count(&total).WithContext(ctx).Error; err != nil {
		return nil, 0, err
	}

	var users []models.User
	if err := r.PostgresClient.Client.
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Order("id DESC").
		Find(&users).WithContext(ctx).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *Dao) UpdateUserRole(ctx context.Context, uid string, role string) error {
	return r.PostgresClient.Client.Where("uid = ?", uid).Updates(&models.User{Role: role}).WithContext(ctx).Error
}

func (r *Dao) AddQuote(ctx context.Context, quoteInfo *models.Quotes) error {
	_, err := r.MongoClient.Database.Collection(consts.QuotesCollection).InsertOne(ctx, quoteInfo)
	if err != nil {
		return err
	}
	return nil
}

func (r *Dao) CheckQuoteExist(ctx context.Context, qid string) (bool, error) {
	var quote models.Quotes
	if err := r.MongoClient.Database.Collection(consts.QuotesCollection).FindOne(ctx, bson.M{"qid": qid}).Decode(&quote); err != nil {
		return false, err
	}
	return true, nil
}

func (r *Dao) GetQuote(ctx context.Context, qid string) (*models.Quotes, error) {
	var quote models.Quotes
	if err := r.MongoClient.Database.Collection(consts.QuotesCollection).FindOne(ctx, bson.M{"qid": qid}).Decode(&quote); err != nil {
		return nil, err
	}
	return &quote, nil
}

func (r *Dao) DeleteQuote(ctx context.Context, qid string) error {
	_, err := r.MongoClient.Database.Collection(consts.QuotesCollection).DeleteOne(ctx, bson.M{"qid": qid})
	return err
}

func (r *Dao) GetAllQuotes(ctx context.Context) ([]models.Quotes, error) {
	var quotes []models.Quotes
	cursor, err := r.MongoClient.Database.Collection(consts.QuotesCollection).Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	if err := cursor.All(ctx, &quotes); err != nil {
		return nil, err
	}
	return quotes, nil
}

func (r *Dao) AddSpeaker(ctx context.Context, speakerInfo *models.UserMeta) error {
	_, err := r.MongoClient.Database.Collection(consts.SpeakersCollection).InsertOne(ctx, speakerInfo)
	if err != nil {
		return err
	}
	return nil
}

func (r *Dao) CheckSpeakerExist(ctx context.Context, qqNumber string) (bool, error) {
	var speaker models.UserMeta
	if err := r.MongoClient.Database.Collection(consts.SpeakersCollection).FindOne(ctx, bson.M{"qqnumber": qqNumber}).Decode(&speaker); err != nil {
		return false, err
	}
	return true, nil
}
