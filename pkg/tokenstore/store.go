package tokenstore

import (
	"context"
	"sync"
	"time"
)

// TokenStore is the interface for token storage.
// It can be backed by Redis or in-memory store.
type TokenStore interface {
	Set(ctx context.Context, key string, value string, expiration time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Del(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

// MemoryStore implements TokenStore using an in-memory map.
type MemoryStore struct {
	mu   sync.RWMutex
	data map[string]memoryItem
}

type memoryItem struct {
	value     string
	expiresAt time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		data: make(map[string]memoryItem),
	}
}

func (s *MemoryStore) Set(_ context.Context, key string, value string, expiration time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = memoryItem{
		value:     value,
		expiresAt: time.Now().Add(expiration),
	}
	return nil
}

func (s *MemoryStore) Get(_ context.Context, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.data[key]
	if !ok {
		return "", nil
	}
	if time.Now().After(item.expiresAt) {
		delete(s.data, key)
		return "", nil
	}
	return item.value, nil
}

func (s *MemoryStore) Del(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, key)
	return nil
}

func (s *MemoryStore) Exists(_ context.Context, key string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.data[key]
	if !ok {
		return false, nil
	}
	if time.Now().After(item.expiresAt) {
		delete(s.data, key)
		return false, nil
	}
	return true, nil
}
