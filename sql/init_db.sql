-- HallOfFame PostgreSQL 数据库创建（必须在事务外执行）
--   psql -U postgres -f sql/init_db.sql
-- 如果客户端报"cannot run inside a transaction block":
--   psql -U postgres -c "CREATE DATABASE halloffame OWNER halloffame ENCODING UTF8"

CREATE DATABASE halloffame
    OWNER halloffame
    ENCODING UTF8;
