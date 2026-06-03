package config

// Config holds the parsed configuration from environment variables.
// It serves as a typed configuration object passed through DI.
type Config struct {
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

	StorageDriver string
	DBDriver      string
	LocalDataDir  string
}

func NewConfigFromEnv() *Config {
	// Config is typically constructed in the server's runc.go from env.BasicEnv.
	// This is a simple constructor that takes values from the env loader.
	return &Config{}
}

// FillFromEnv populates Config fields from a BasicEnv-like source.
// Used in the DI composition root.
func (c *Config) FillFromEnv(port int, botPort int, mongoURI string, mongoDBName string,
	pgHost string, pgPort int, pgUser string, pgPassword string, pgDB string, pgSSLMode string,
	sqlitePath string,
	redisAddr string, redisPassword string, redisDB int,
	minioEndpoint string, minioAccessKey string, minioSecretKey string, minioBucket string, minioUseSSL bool,
	githubClientID string, githubClientSecret string, githubRedirectURL string,
	jwtSecret string,
	botAPIToken string,
	storageDriver string, dbDriver string, localDataDir string) {

	c.Port = port
	c.BotPort = botPort
	c.MongoURI = mongoURI
	c.MongoDBName = mongoDBName

	c.PostgresHost = pgHost
	c.PostgresPort = pgPort
	c.PostgresUser = pgUser
	c.PostgresPassword = pgPassword
	c.PostgresDB = pgDB
	c.PostgresSSLMode = pgSSLMode

	c.SQLitePath = sqlitePath

	c.RedisAddr = redisAddr
	c.RedisPassword = redisPassword
	c.RedisDB = redisDB

	c.MinioEndpoint = minioEndpoint
	c.MinioAccessKey = minioAccessKey
	c.MinioSecretKey = minioSecretKey
	c.MinioBucket = minioBucket
	c.MinioUseSSL = minioUseSSL

	c.GitHubClientID = githubClientID
	c.GitHubClientSecret = githubClientSecret
	c.GitHubRedirectURL = githubRedirectURL

	c.JWTSecret = jwtSecret

	c.BotAPIToken = botAPIToken

	c.StorageDriver = storageDriver
	c.DBDriver = dbDriver
	c.LocalDataDir = localDataDir
}
