package engine

import (
	"context"
	"os/signal"
	"syscall"
)

// SignalContext 返回一个监听 SIGINT/SIGTERM 的 context
func SignalContext() (context.Context, context.CancelFunc) {
	return signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
}
