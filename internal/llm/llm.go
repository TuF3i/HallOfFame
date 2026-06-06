package llm

import (
	"context"
	"fmt"

	"HallOfFame/config"

	"github.com/cloudwego/eino-ext/components/model/ark"
	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
)

// NewChatModel 根据配置创建 Eino ChatModel
// 支持 provider: openai（及 OpenAI 兼容接口）, ark（火山引擎）
func NewChatModel(ctx context.Context, cfg *config.LLMConf) (model.ChatModel, error) {
	switch cfg.Provider {
	case "openai":
		return openai.NewChatModel(ctx, &openai.ChatModelConfig{
			BaseURL: cfg.BaseURL,
			APIKey:  cfg.APIKey,
			Model:   cfg.Model,
		})

	case "ark":
		return ark.NewChatModel(ctx, &ark.ChatModelConfig{
			APIKey:     cfg.APIKey,
			Model:      cfg.Model,
		})

	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", cfg.Provider)
	}
}
