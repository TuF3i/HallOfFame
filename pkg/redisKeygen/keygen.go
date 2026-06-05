package rediskeygen

import "fmt"

func GetUserTokenKey(uid string) string {
	return fmt.Sprintf("user:token:%s", uid)
}
