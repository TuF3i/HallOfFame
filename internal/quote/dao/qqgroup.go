package dao

import (
	"context"
	"time"

	"halloffame/internal/quote/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (d *QQGroupDao) col() *mongo.Collection {
	return d.Mongo.Database.Collection("qq_groups")
}

func (d *QQGroupDao) Create(ctx context.Context, group *models.QQGroup) error {
	group.ID = primitive.NewObjectID()
	group.CreatedAt = time.Now()
	_, err := d.col().InsertOne(ctx, group)
	return err
}

func (d *QQGroupDao) FindAll(ctx context.Context) ([]models.QQGroup, error) {
	cursor, err := d.col().Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []models.QQGroup
	if err := cursor.All(ctx, &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

func (d *QQGroupDao) FindByName(ctx context.Context, name string) (*models.QQGroup, error) {
	var group models.QQGroup
	err := d.col().FindOne(ctx, bson.M{"name": name}).Decode(&group)
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func (d *QQGroupDao) FindOrCreate(ctx context.Context, name string) (*models.QQGroup, error) {
	group, err := d.FindByName(ctx, name)
	if err == nil {
		return group, nil
	}

	newGroup := &models.QQGroup{
		Name:      name,
		CreatedAt: time.Now(),
	}
	if err := d.Create(ctx, newGroup); err != nil {
		return nil, err
	}
	return newGroup, nil
}
