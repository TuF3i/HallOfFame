package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"HallOfFame/config"
	"HallOfFame/internal/cache"
	"HallOfFame/internal/dao"
	"HallOfFame/internal/models"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"
)

// 全局触发器，供手动触发使用
var (
	triggerMu     sync.Mutex
	triggerCache  *cache.Cache
	triggerDao    *dao.Dao
	triggerModel  model.ChatModel
	triggerConfig *config.LLMConf
)

// SetTrigger 注册全局触发器依赖
func SetTrigger(c *cache.Cache, d *dao.Dao, chatModel model.ChatModel, cfg *config.LLMConf) {
	triggerMu.Lock()
	triggerCache = c
	triggerDao = d
	triggerModel = chatModel
	triggerConfig = cfg
	triggerMu.Unlock()
}

// Trigger 手动触发一次 AI 分析，导出供 handler 调用
// 异步执行，不阻塞调用方
func Trigger(ctx context.Context) error {
	triggerMu.Lock()
	c := triggerCache
	d := triggerDao
	m := triggerModel
	cfg := triggerConfig
	triggerMu.Unlock()

	if m == nil {
		return fmt.Errorf("consumer: chat model not initialized")
	}

	go processBatch(context.Background(), c, d, m, cfg)
	return nil
}

// BotMsg 是 Redis 队列中消息的格式
type BotMsg struct {
	QQGroup     string `json:"qqgroup"`
	QQNumber    string `json:"qqnumber"`
	Speaker     string `json:"speaker"`
	Content     string `json:"content"`
	Avatar      string `json:"avatar,omitempty"`
	GroupName   string `json:"groupname,omitempty"`
	GroupAvatar string `json:"groupavatar,omitempty"`
	Timestamp   int64  `json:"timestamp"`
}

// LLMResult 是 LLM 返回的单个结果，包含完整消息内容和压抑度
type LLMResult struct {
	Content     string  `json:"content"`
	Score       float64 `json:"score"`
	Reason      string  `json:"reason"`
	QQNumber    string  `json:"qqnumber"`
	Speaker     string  `json:"speaker"`
	Avatar      string  `json:"avatar"`
	QQGroup     string  `json:"qqgroup"`
	GroupName   string  `json:"groupname"`
	GroupAvatar string  `json:"groupavatar"`
}

var systemPrompt = `你是一个恶搞分析机器人。我会给你一批QQ群聊天消息，请你分析每条消息的"性压抑度"（0-100）。
性压抑度是一个幽默指标，衡量发言中体现的性压抑程度。
请从这些消息中选出性压抑度最高的0-15条。

你仅返回JSON数组，不要返回其他内容，格式：
[
  {
    "content": "消息原文",
    "score": 85,
    "reason": "简短但好笑的理由",
    "qqnumber": "发言者QQ号",
    "speaker": "发言者昵称",
    "avatar": "头像URL(如果有)",
    "qqgroup": "群号",
    "groupname": "群名称(如果有)",
    "groupavatar": "群头像URL(如果有)"
  }
]
score是0-100的整数。
如果没有任何消息有性压抑倾向，返回空数组[]。`

// Start 启动后台 Consumer 协程，持续检查 Redis 队列并调用 LLM 分析
func Start(ctx context.Context, c *cache.Cache, d *dao.Dao, chatModel model.ChatModel, cfg *config.LLMConf) {
	// 注册全局触发器
	SetTrigger(c, d, chatModel, cfg)

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		midnightTicker := time.NewTicker(1 * time.Minute)
		defer midnightTicker.Stop()

		lastHour := time.Now().Hour()

		for {
			select {
			case <-ctx.Done():
				log.Println("consumer stopped")
				return

			case <-ticker.C:
				length, err := c.QueueLen(ctx)
				if err != nil {
					continue
				}
				if length >= int64(cfg.BatchSize) {
					log.Printf("consumer: queue length %d >= batchSize %d, triggering analysis", length, cfg.BatchSize)
					processBatch(ctx, c, d, chatModel, cfg)
				}

			case <-midnightTicker.C:
				currentHour := time.Now().Hour()
				if lastHour != 0 && currentHour == 0 {
					log.Println("consumer: midnight trigger, processing remaining messages")
					length, err := c.QueueLen(ctx)
					if err == nil && length > 0 {
						processBatch(ctx, c, d, chatModel, cfg)
					}
				}
				lastHour = currentHour
			}
		}
	}()
}

func processBatch(ctx context.Context, c *cache.Cache, d *dao.Dao, chatModel model.ChatModel, cfg *config.LLMConf) {
	// 1. 取出全部消息
	msgs, err := c.PopAllMessages(ctx)
	if err != nil {
		log.Printf("consumer: failed to pop messages: %v", err)
		return
	}
	if len(msgs) == 0 {
		return
	}

	log.Printf("consumer: processing %d messages", len(msgs))

	// 2. 解析消息作为 LLM 上下文
	var botMsgs []BotMsg
	for _, msg := range msgs {
		var botMsg BotMsg
		if err := json.Unmarshal([]byte(msg), &botMsg); err != nil {
			continue
		}
		botMsgs = append(botMsgs, botMsg)
	}

	if len(botMsgs) == 0 {
		return
	}

	// 3. 调用 LLM 分析
	results := callLLM(ctx, chatModel, botMsgs, cfg.MaxResults)
	if len(results) == 0 {
		log.Printf("consumer: LLM returned no results for %d messages", len(botMsgs))
		return
	}

	// 4. 写入数据库 — LLM 直接返回完整消息内容，无需按 index 映射
	saved := 0
	for _, result := range results {
		quote := &models.Quotes{
			QID:         uuid.New().String(),
			Content:     result.Content,
			Suppression: result.Score,
			UserData: models.UserMeta{
				QQNumber: result.QQNumber,
				Speaker:  result.Speaker,
				Avatar:   result.Avatar,
			},
			GroupData: models.GroupData{
				GroupNumber: result.QQGroup,
				GroupName:   result.GroupName,
				Avatar:      result.GroupAvatar,
			},
			AttachmentID: nil,
			IsFeatured:   false,
		}

		if err := d.AddQuote(ctx, quote); err != nil {
			log.Printf("consumer: failed to save quote: %v", err)
			continue
		}
		saved++
	}

	log.Printf("consumer: processed %d messages, saved %d quotes", len(botMsgs), saved)
}

func callLLM(ctx context.Context, chatModel model.ChatModel, msgs []BotMsg, maxResults int) []LLMResult {
	// 构建 user message：序号 + 完整信息
	var userContent string
	for i, msg := range msgs {
		userContent += fmt.Sprintf("[%d] %s(%s): %s\n  群: %s(%s)\n  头像: %s\n  群头像: %s\n", i, msg.Speaker, msg.QQNumber, msg.Content, msg.GroupName, msg.QQGroup, msg.Avatar, msg.GroupAvatar)
	}

	// 打印发送给 LLM 的消息内容摘要
	if len(userContent) > 500 {
		log.Printf("consumer: LLM input (truncated): %s...", userContent[:500])
	} else {
		log.Printf("consumer: LLM input: %s", userContent)
	}

	messages := []*schema.Message{
		schema.SystemMessage(systemPrompt),
		schema.UserMessage(userContent),
	}

	resp, err := chatModel.Generate(ctx, messages)
	if err != nil {
		log.Printf("consumer: LLM generate error: %v", err)
		return nil
	}

	content := resp.Content
	if content == "" {
		log.Println("consumer: LLM returned empty content")
		return nil
	}

	// 打印原始 LLM 响应
	if len(content) > 1000 {
		log.Printf("consumer: LLM raw response (truncated): %s...", content[:1000])
	} else {
		log.Printf("consumer: LLM raw response: %s", content)
	}

	// 解析 JSON 返回
	var results []LLMResult
	if err := json.Unmarshal([]byte(content), &results); err != nil {
		log.Printf("consumer: failed to parse LLM response: %v\nresponse: %s", err, content)
		results = extractJSONArray(content)
		if results != nil {
			log.Printf("consumer: extractJSONArray recovered %d results", len(results))
		}
	}

	log.Printf("consumer: LLM returned %d results", len(results))

	// 限制返回数量
	if len(results) > maxResults {
		results = results[:maxResults]
	}

	return results
}

// extractJSONArray 从文本中提取 JSON 数组
func extractJSONArray(content string) []LLMResult {
	start := -1
	for i := 0; i < len(content); i++ {
		if content[i] == '[' {
			start = i
			break
		}
	}
	if start == -1 {
		return nil
	}

	end := -1
	for i := len(content) - 1; i >= start; i-- {
		if content[i] == ']' {
			end = i + 1
			break
		}
	}
	if end == -1 {
		return nil
	}

	var results []LLMResult
	if err := json.Unmarshal([]byte(content[start:end]), &results); err != nil {
		return nil
	}
	return results
}
