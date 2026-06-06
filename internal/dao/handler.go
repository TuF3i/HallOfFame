package dao

import (
	"HallOfFame/internal/models"
	"HallOfFame/pkg/consts"
	"context"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/gorm"
)

func (r *Dao) IfUserExist(ctx context.Context, uid string) (bool, error) {
	var user models.User
	if err := r.PostgresClient.Client.Where("uid = ?", uid).First(&user).WithContext(ctx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
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

func (r *Dao) GetUserByUid(ctx context.Context, uid string) (*models.User, error) {
	var user models.User
	if err := r.PostgresClient.Client.Where("uid = ?", uid).First(&user).WithContext(ctx).Error; err != nil {
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
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
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
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// ListQuotes 通用分页查询，filter 为 bson.M 条件
func (r *Dao) ListQuotes(ctx context.Context, filter bson.M, page, pageSize int) ([]models.Quotes, int64, error) {
	collection := r.MongoClient.Database.Collection(consts.QuotesCollection)

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * pageSize)
	limit := int64(pageSize)

	cursor, err := collection.Find(ctx, filter, &options.FindOptions{
		Skip:  &skip,
		Limit: &limit,
		Sort:  bson.D{{Key: "_id", Value: -1}},
	})
	if err != nil {
		return nil, 0, err
	}

	var quotes []models.Quotes
	if err := cursor.All(ctx, &quotes); err != nil {
		return nil, 0, err
	}

	return quotes, total, nil
}

// ListSpeakers 从 quotes 聚合去重获取发言者列表
func (r *Dao) ListSpeakers(ctx context.Context, page, pageSize int) ([]models.SpeakerSummary, int64, error) {
	collection := r.MongoClient.Database.Collection(consts.QuotesCollection)

	// 先聚合去重获取发言者数量
	countPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$userdata.qqnumber"},
		}}},
		{{Key: "$count", Value: "total"}},
	}
	countCursor, err := collection.Aggregate(ctx, countPipeline)
	if err != nil {
		return nil, 0, err
	}
	var countResult []struct {
		Total int64 `bson:"total"`
	}
	var total int64
	if err := countCursor.All(ctx, &countResult); err == nil && len(countResult) > 0 {
		total = countResult[0].Total
	}

	skip := int64((page - 1) * pageSize)
	limit := int64(pageSize)

	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$userdata.qqnumber"},
			{Key: "speaker", Value: bson.D{{Key: "$first", Value: "$userdata.speaker"}}},
			{Key: "avatar", Value: bson.D{{Key: "$first", Value: "$userdata.avatar"}}},
			{Key: "quote_count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}

	var speakers []models.SpeakerSummary
	if err := cursor.All(ctx, &speakers); err != nil {
		return nil, 0, err
	}

	return speakers, total, nil
}

// DeleteQuotesBySpeaker 删除某个发言者的所有发言，返回删除数量
func (r *Dao) DeleteQuotesBySpeaker(ctx context.Context, qqNumber string) (int64, error) {
	result, err := r.MongoClient.Database.Collection(consts.QuotesCollection).
		DeleteMany(ctx, bson.M{"userdata.qqnumber": qqNumber})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

// UpdateQuoteFeatured 更新精华状态
func (r *Dao) UpdateQuoteFeatured(ctx context.Context, qid string, featured bool) error {
	_, err := r.MongoClient.Database.Collection(consts.QuotesCollection).
		UpdateOne(ctx, bson.M{"qid": qid}, bson.M{"$set": bson.M{"is_featured": featured}})
	return err
}

// GetQuotesBySpeaker 按发言者分页查询
func (r *Dao) GetQuotesBySpeaker(ctx context.Context, qqNumber string, page, pageSize int) ([]models.Quotes, int64, error) {
	filter := bson.M{"userdata.qqnumber": qqNumber}
	return r.ListQuotes(ctx, filter, page, pageSize)
}

// GetFeaturedQuotes 获取精华发言
func (r *Dao) GetFeaturedQuotes(ctx context.Context, page, pageSize int) ([]models.Quotes, int64, error) {
	filter := bson.M{"is_featured": true}
	return r.ListQuotes(ctx, filter, page, pageSize)
}
