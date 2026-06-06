-- HallOfFame PostgreSQL 数据库初始化
-- 使用超级用户（如 postgres）执行此脚本:
--   psql -U postgres -f sql/init_db.sql

-- 创建用户（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'halloffame') THEN
        CREATE USER halloffame WITH PASSWORD 'halloffame';
    END IF;
END
$$;

-- 创建数据库（如果不存在），指定所有者和编码
SELECT 'CREATE DATABASE halloffame
    OWNER halloffame
    ENCODING UTF8
    LC_COLLATE = ''en_US.UTF-8''
    LC_CTYPE = ''en_US.UTF-8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'halloffame')\gexec

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE halloffame TO halloffame;
