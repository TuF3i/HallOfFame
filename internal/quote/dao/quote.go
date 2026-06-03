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

type QuoteFilter struct {
	QQGroup    string
	IsFeatured *bool
	StartTime  *time.Time
	EndTime    *time.Time
	Page       int64
	PageSize   int64
}

func (d *QuoteDao) col() *mongo.Collection {
	return d.Mongo.Database.Collection("quotes")
}

func (d *QuoteDao) Create(ctx context.Context, quote *models.Quote) error {
	if quote.CreatedAt.IsZero() {
		quote.CreatedAt = time.Now()
	}
	quote.UpdatedAt = quote.CreatedAt
	quote.ID = primitive.NewObjectID()

	_, err := d.col().InsertOne(ctx, quote)
	return err
}

func (d *QuoteDao) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Quote, error) {
	var quote models.Quote
	err := d.col().FindOne(ctx, bson.M{"_id": id, "deleted_at": nil}).Decode(&quote)
	if err != nil {
		return nil, err
	}
	return &quote, nil
}

func (d *QuoteDao) FindAll(ctx context.Context, filter QuoteFilter) ([]models.Quote, int64, error) {
	query := bson.M{"deleted_at": nil}
	if filter.QQGroup != "" {
		query["qq_group"] = filter.QQGroup
	}
	if filter.IsFeatured != nil {
		query["is_featured"] = *filter.IsFeatured
	}
	if filter.StartTime != nil || filter.EndTime != nil {
		timeFilter := bson.M{}
		if filter.StartTime != nil {
			timeFilter["$gte"] = filter.StartTime
		}
		if filter.EndTime != nil {
			timeFilter["$lte"] = filter.EndTime
		}
		query["created_at"] = timeFilter
	}

	total, err := d.col().CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 || filter.PageSize > 100 {
		filter.PageSize = 20
	}

	opts := options.Find().
		SetSort(bson.M{"created_at": -1}).
		SetSkip((filter.Page - 1) * filter.PageSize).
		SetLimit(filter.PageSize)

	cursor, err := d.col().Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var quotes []models.Quote
	if err := cursor.All(ctx, &quotes); err != nil {
		return nil, 0, err
	}
	return quotes, total, nil
}

func (d *QuoteDao) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()
	_, err := d.col().UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

func (d *QuoteDao) SoftDelete(ctx context.Context, id primitive.ObjectID) error {
	_, err := d.col().UpdateOne(ctx, bson.M{"_id": id},
		bson.M{"$set": bson.M{"deleted_at": time.Now(), "updated_at": time.Now()}})
	return err
}

func (d *QuoteDao) SetFeatured(ctx context.Context, id primitive.ObjectID, featured bool) error {
	return d.Update(ctx, id, bson.M{"is_featured": featured})
}
