import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve('server/database/migrations/20260726_trusted_ranked_up.sql'), 'utf8')
const rollback = readFileSync(resolve('server/database/migrations/20260726_trusted_ranked_rollback.sql'), 'utf8')
const schema = readFileSync(resolve('server/database/schema.sql'), 'utf8')

const businessTables = [
  'gunfight_users',
  'gunfight_cloud_saves',
  'gunfight_season_scores',
  'gunfight_ranked_progress',
  'gunfight_ranked_runs'
]

describe('可信排行正式数据库迁移', () => {
  it('在单次迁移锁与版本标记内覆盖五张业务表', () => {
    expect(migration).toContain('BEGIN;')
    expect(migration).toContain("pg_advisory_xact_lock(hashtext('gunfight:20260726_trusted_ranked'))")
    expect(migration).toContain("version = '20260726_trusted_ranked'")
    expect(migration).toContain('COMMIT;')
    for (const table of businessTables) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
  })

  it('首次迁移把旧账号排位进度设为 0，且不从云存档或旧榜单回填', () => {
    expect(migration).toContain('DELETE FROM gunfight_ranked_runs')
    expect(migration).toContain('DELETE FROM gunfight_season_scores')
    expect(migration).toContain('DELETE FROM gunfight_ranked_progress')
    expect(migration).toMatch(/INSERT INTO gunfight_ranked_progress[\s\S]+SELECT id, 0, NOW\(\)[\s\S]+FROM gunfight_users/)
    expect(migration).not.toMatch(/SELECT[\s\S]+highestCleared[\s\S]+FROM gunfight_cloud_saves/)
  })

  it('应用回滚只使在途票据失效并保留全部业务表', () => {
    expect(rollback).toContain("SET status = 'expired'")
    expect(rollback).not.toMatch(/^\s*DROP\s+TABLE\b/im)
    expect(rollback).not.toMatch(/^\s*DELETE\s+FROM\b/im)
    for (const table of businessTables) expect(rollback).toContain(table)
  })
})
