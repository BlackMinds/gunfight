import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pgMocks = vi.hoisted(() => ({ query: vi.fn(), poolConfig: vi.fn() }))

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor(config: unknown) {
        pgMocks.poolConfig(config)
      }
      query = pgMocks.query
    }
  }
}))

describe('云存档数据库初始化', () => {
  beforeEach(() => {
    vi.resetModules()
    pgMocks.query.mockReset()
    pgMocks.poolConfig.mockReset()
    process.env.DATABASE_URL = 'postgresql://localhost/gunfight-test'
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
  })

  it('首次建表失败后清除失败缓存并允许下一次安全重试', async () => {
    pgMocks.query
      .mockResolvedValueOnce({ rows: [{ users_table: null, saves_table: null }] })
      .mockRejectedValueOnce(new Error('temporary connection failure'))
      .mockResolvedValueOnce({ rows: [{ users_table: null, saves_table: null }] })
      .mockResolvedValueOnce({ rows: [] })
    const { ensureCloudSchema } = await import('../../server/utils/database')

    await expect(ensureCloudSchema()).rejects.toThrow('temporary connection failure')
    await expect(ensureCloudSchema()).resolves.toBeUndefined()
    expect(pgMocks.query).toHaveBeenCalledTimes(4)
  })

  it('表已预建时只探测 schema，不要求运行时重复执行 DDL', async () => {
    pgMocks.query.mockResolvedValueOnce({ rows: [{ users_table: 'gunfight_users', saves_table: 'gunfight_cloud_saves', season_scores_table: 'gunfight_season_scores' }] })
    const { ensureCloudSchema } = await import('../../server/utils/database')

    await expect(ensureCloudSchema()).resolves.toBeUndefined()
    expect(pgMocks.query).toHaveBeenCalledOnce()
    expect(pgMocks.query).toHaveBeenCalledWith(expect.stringContaining("to_regclass('public.gunfight_users')"))
    expect(pgMocks.query).toHaveBeenCalledWith(expect.stringContaining("to_regclass('public.gunfight_season_scores')"))
  })

  it('未配置数据库时返回 503 且不创建连接池', async () => {
    delete process.env.DATABASE_URL
    const { database } = await import('../../server/utils/database')

    expect(() => database()).toThrow(expect.objectContaining({ statusCode: 503 }))
    expect(pgMocks.query).not.toHaveBeenCalled()
  })

  it('线上连接启用证书校验和有限连接等待，本地连接不强制 SSL', async () => {
    process.env.DATABASE_URL = 'postgresql://user:password@example.neon.tech/gunfight?sslmode=require'
    let module = await import('../../server/utils/database')
    module.database()
    expect(pgMocks.poolConfig).toHaveBeenLastCalledWith(expect.objectContaining({
      ssl: { rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000
    }))

    vi.resetModules()
    process.env.DATABASE_URL = 'postgresql://localhost/gunfight-test'
    module = await import('../../server/utils/database')
    module.database()
    expect(pgMocks.poolConfig).toHaveBeenLastCalledWith(expect.objectContaining({ ssl: undefined }))
  })
})
