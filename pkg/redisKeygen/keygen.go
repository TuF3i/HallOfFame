package rediskeygen

import "fmt"

func GetUserTokenKey(uid string) string {
	return fmt.Sprintf("user:token:%s", uid)
}

func GetUserRefreshTokenKey(uid string) string {
	return fmt.Sprintf("user:refresh_token:%s", uid)
}

func GetBotMessageQueueKey() string {
	return "bot:message_queue"
}

func GetRegistrationEnabledKey() string {
	return "settings:registration_enabled"
}
