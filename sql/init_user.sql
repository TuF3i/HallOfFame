-- HallOfFame PostgreSQL 用户初始化（事务内安全）
--   psql -U postgres -f sql/init_user.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'halloffame') THEN
        CREATE USER halloffame WITH PASSWORD 'halloffame';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE halloffame TO halloffame;
