-- HallOfFame 创建管理员用户
-- 需要在 halloffame 数据库上执行:
--   psql -U postgres -d halloffame -f sql/init_admin.sql
-- 或:
--   psql -U halloffame -d halloffame -f sql/init_admin.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (created_at, updated_at, uid, role, email, password, nickname)
SELECT now(), now(), gen_random_uuid()::text, 'admin', 'admin@halloffame.local',
       crypt('admin', gen_salt('bf')), 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@halloffame.local');
