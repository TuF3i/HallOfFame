package dao

import (
	infraMongo "halloffame/infrastructures/mongo"
)

// QuoteDaoReliance declares dependencies for QuoteDao.
type QuoteDaoReliance struct {
	Mongo *infraMongo.Client
}

// QuoteDao provides data access for quotes.
type QuoteDao struct {
	*QuoteDaoReliance
}

// NewQuoteDao creates a new QuoteDao with injected dependencies.
func NewQuoteDao(r *QuoteDaoReliance) *QuoteDao {
	return &QuoteDao{r}
}

// QQGroupDaoReliance declares dependencies for QQGroupDao.
type QQGroupDaoReliance struct {
	Mongo *infraMongo.Client
}

// QQGroupDao provides data access for QQ groups.
type QQGroupDao struct {
	*QQGroupDaoReliance
}

// NewQQGroupDao creates a new QQGroupDao with injected dependencies.
func NewQQGroupDao(r *QQGroupDaoReliance) *QQGroupDao {
	return &QQGroupDao{r}
}
