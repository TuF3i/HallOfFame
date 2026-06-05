package config

type Config struct {
	HertzConf      HertzConf
	RedisConf      RedisConf
	MongoDBConf    MongoDBConf
	PostgreSQLConf PostgreSQLConf
	MinioConf      MinioConf
}

type HertzConf struct {
	ListenAddr       string
	WebApiListerPort int
	BotApiListenPort int
}

type RedisConf struct {
	Addr     string
	Port     int
	Password string
}

type MongoDBConf struct {
	Addr     string
	Port     int
	Database string
	Username string
	Password string
}

type PostgreSQLConf struct {
	Addr     string
	Port     int
	Database string
	Username string
	Password string
}

type MinioConf struct {
	Addr     string
	Port     int
	Username string
	Password string
	Bucket   string
}
