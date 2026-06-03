package env

import (
	"os"
	"strconv"
)

type BasicEnv struct {
	Port        int
	BotPort     int
	MongoURI    string
	MongoDBName string

	PostgresHost     string
	PostgresPort     int
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	PostgresSSLMode  string

	SQLitePath string

	RedisAddr     string
	RedisPassword string
	RedisDB       int

	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool

	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string

	JWTSecret string

	BotAPIToken string

	StorageDriver string // "minio" or "local"
	DBDriver      string // "postgres" or "sqlite"
	LocalDataDir  string // fallback storage directory
}

func GetEnv() *BasicEnv {
	return &BasicEnv{
		Port:        getEnvInt("PORT", 8888),
		BotPort:     getEnvInt("BOT_PORT", 8889),
		MongoURI:    getEnvStr("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName: getEnvStr("MONGO_DB", "halloffame"),

		PostgresHost:     getEnvStr("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnvInt("POSTGRES_PORT", 5432),
		PostgresUser:     getEnvStr("POSTGRES_USER", "postgres"),
		PostgresPassword: getEnvStr("POSTGRES_PASSWORD", "postgres"),
		PostgresDB:       getEnvStr("POSTGRES_DB", "halloffame"),
		PostgresSSLMode:  getEnvStr("POSTGRES_SSLMODE", "disable"),

		SQLitePath: getEnvStr("SQLITE_PATH", "/app/data/halloffame.db"),

		RedisAddr:     getEnvStr("REDIS_ADDR", ""),
		RedisPassword: getEnvStr("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		MinioEndpoint:  getEnvStr("MINIO_ENDPOINT", ""),
		MinioAccessKey: getEnvStr("MINIO_ACCESS_KEY", ""),
		MinioSecretKey: getEnvStr("MINIO_SECRET_KEY", ""),
		MinioBucket:    getEnvStr("MINIO_BUCKET", "halloffame"),
		MinioUseSSL:    getEnvBool("MINIO_USE_SSL", false),

		GitHubClientID:     getEnvStr("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnvStr("GITHUB_CLIENT_SECRET", ""),
		GitHubRedirectURL:  getEnvStr("GITHUB_REDIRECT_URL", "http://localhost:8888/api/v1/auth/github/callback"),

		JWTSecret: getEnvStr("JWT_SECRET", "default-secret-change-in-production"),

		BotAPIToken: getEnvStr("BOT_API_TOKEN", ""),

		StorageDriver: getEnvStr("STORAGE_DRIVER", "local"),
		DBDriver:      getEnvStr("DB_DRIVER", "sqlite"),
		LocalDataDir:  getEnvStr("LOCAL_DATA_DIR", "/app/data"),
	}
}

func getEnvStr(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}
