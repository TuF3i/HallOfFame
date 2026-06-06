# Redis DB 选择

## Why
当前 Redis 硬编码使用 DB 0，需要在 etcd 配置中可指定 DB 编号。

## What Changes
- config.go: `RedisConf` 增加 `DB int`
- config.json: `redisConf` 增加 `"db": 0`
- redis/client.go: `RedisClient` 增加 `db` 字段 + `WithDB` 函数 + `NewClient` 使用

## Impact
- Affected code: `config/config.go`, `config/config.json`, `inferstructure/redis/client.go`
