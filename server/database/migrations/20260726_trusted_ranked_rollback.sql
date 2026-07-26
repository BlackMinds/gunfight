BEGIN;

SELECT pg_advisory_xact_lock(hashtext('gunfight:20260726_trusted_ranked'));

-- 应用回滚只终止在途排位，不删除账号、云存档或已完成成绩。
-- 结构或数据需要回退时，使用部署前 Neon 恢复点建立独立分支，
-- 核对五张业务表后切换 DATABASE_URL；禁止在 Production 直接 DROP TABLE。
UPDATE gunfight_ranked_runs
SET status = 'expired'
WHERE status = 'active';

COMMIT;

SELECT 'gunfight_users' AS table_name, COUNT(*)::bigint AS row_count FROM gunfight_users
UNION ALL
SELECT 'gunfight_cloud_saves', COUNT(*)::bigint FROM gunfight_cloud_saves
UNION ALL
SELECT 'gunfight_season_scores', COUNT(*)::bigint FROM gunfight_season_scores
UNION ALL
SELECT 'gunfight_ranked_progress', COUNT(*)::bigint FROM gunfight_ranked_progress
UNION ALL
SELECT 'gunfight_ranked_runs', COUNT(*)::bigint FROM gunfight_ranked_runs
ORDER BY table_name;
