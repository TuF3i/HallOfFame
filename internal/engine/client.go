package engine

import (
	"context"
	"fmt"
	"log"
	"time"

	"HallOfFame/config"
	"HallOfFame/internal/consumer"
	"HallOfFame/internal/handler/admin"
	"HallOfFame/internal/handler/auth"
	"HallOfFame/internal/handler/bot"
	"HallOfFame/internal/handler/quote"
	"HallOfFame/internal/llm"
	"HallOfFame/internal/middleware"
	"HallOfFame/internal/router"

	"github.com/cloudwego/hertz/pkg/app/server"
)

func (e *Engine) Start(ctx context.Context, cfg *config.Config, authHandler *auth.AuthHandler, adminHandler *admin.AdminHandler, quoteHandler *quote.QuoteHandler, botHandler *bot.BotHandler) {
	// 启动主 Web API Server
	addr := fmt.Sprintf("%s:%d", cfg.HertzConf.ListenAddr, cfg.HertzConf.WebApiListerPort)
	h := server.New(server.WithHostPorts(addr))
	h.Use(middleware.CORSHandler())

	router.RegisterRoutes(h, e.Cache, authHandler, adminHandler, quoteHandler)

	go func() {
		h.Spin()
	}()

	// 启动 Bot Server（独立端口，无鉴权）
	botAddr := fmt.Sprintf("%s:%d", cfg.HertzConf.ListenAddr, cfg.HertzConf.BotApiListenPort)
	bh := server.New(server.WithHostPorts(botAddr))

	router.RegisterBotRoutes(bh, e.Cache, botHandler)

	go func() {
		bh.Spin()
	}()

	// 启动 Consumer（后台 AI 分析协程）
	if chatModel, err := llm.NewChatModel(ctx, &cfg.LLMConf); err != nil {
		log.Printf("consumer: failed to create chat model (disabled): %v", err)
	} else {
		consumer.Start(ctx, e.Cache, e.Dao, chatModel, &cfg.LLMConf)
	}

	log.Printf("Web API server listening on %s, Bot API server listening on %s", addr, botAddr)

	// 等待退出信号
	sigCtx, stop := SignalContext()
	defer stop()

	<-sigCtx.Done()
	log.Println("shutting down servers...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = shutdownCtx

	log.Println("servers stopped")
}

func (e *Engine) Shutdown() error {
	return nil
}
