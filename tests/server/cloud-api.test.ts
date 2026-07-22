import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCloudSave } from '../fixtures/cloud'

const h3Mocks = vi.hoisted(() => ({ readBody: vi.fn(), getHeader: vi.fn() }))
const databaseMocks = vi.hoisted(() => ({
  ensureCloudSchema: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  createUserId: vi.fn(() => 'user-created')
}))
const bcryptMocks = vi.hoisted(() => ({ hash: vi.fn(), compare: vi.fn() }))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return { ...actual, readBody: h3Mocks.readBody, getHeader: h3Mocks.getHeader }
})

vi.mock('../../server/utils/database', () => ({
  ensureCloudSchema: databaseMocks.ensureCloudSchema,
  database: () => ({ query: databaseMocks.query, connect: databaseMocks.connect }),
  createUserId: databaseMocks.createUserId
}))

vi.mock('bcryptjs', () => ({ default: bcryptMocks }))

import { issueCloudToken, requireCloudUser } from '../../server/utils/auth'
import registerHandler from '../../server/api/auth/register.post'
import loginHandler from '../../server/api/auth/login.post'
import getCloudSaveHandler from '../../server/api/cloud-save.get'
import putCloudSaveHandler from '../../server/api/cloud-save.put'

const event = {} as never
const jwtSecret = 'test-only-secret-with-at-least-32-characters'

function statusOf(error: unknown) {
  return typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined
}

function createClient<T>(query: T) {
  return { query, release: vi.fn() }
}

describe('账号与 JWT API', () => {
  beforeEach(() => {
    process.env.NUXT_JWT_SECRET = jwtSecret
    delete process.env.JWT_SECRET
    h3Mocks.readBody.mockReset()
    h3Mocks.getHeader.mockReset()
    databaseMocks.ensureCloudSchema.mockReset().mockResolvedValue(undefined)
    databaseMocks.query.mockReset()
    databaseMocks.connect.mockReset()
    bcryptMocks.hash.mockReset().mockResolvedValue('hashed-password')
    bcryptMocks.compare.mockReset()
  })

  afterEach(() => {
    delete process.env.NUXT_JWT_SECRET
    delete process.env.JWT_SECRET
  })

  it('注册会规范化账号、哈希密码并直接依赖唯一约束写入', async () => {
    h3Mocks.readBody.mockResolvedValue({ username: '  Test_User ', password: 'password-123' })
    databaseMocks.query.mockResolvedValue({ rows: [], rowCount: 1 })

    const result = await registerHandler(event)
    h3Mocks.getHeader.mockReturnValue(`Bearer ${result.token}`)

    expect(result.username).toBe('test_user')
    expect(bcryptMocks.hash).toHaveBeenCalledWith('password-123', 12)
    expect(databaseMocks.query).toHaveBeenCalledTimes(1)
    expect(databaseMocks.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO gunfight_users'), ['user-created', 'test_user', 'hashed-password'])
    expect(requireCloudUser(event)).toEqual({ sub: 'user-created', username: 'test_user' })
  })

  it('并发重复注册由数据库唯一约束稳定收敛为一个成功和一个 409', async () => {
    h3Mocks.readBody.mockResolvedValue({ username: 'same_user', password: 'password-123' })
    databaseMocks.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }).mockRejectedValueOnce(Object.assign(new Error('duplicate detail must stay private'), { code: '23505' }))

    const results = await Promise.allSettled([registerHandler(event), registerHandler(event)])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejection = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    expect(statusOf(rejection?.reason)).toBe(409)
    expect(String(rejection?.reason.message)).toContain('该账号已存在')
    expect(String(rejection?.reason.message)).not.toContain('duplicate detail')
  })

  it('登录校验密码并签发可验证的 JWT', async () => {
    h3Mocks.readBody.mockResolvedValue({ username: 'Player_1', password: 'password-123' })
    databaseMocks.query.mockResolvedValue({ rows: [{ id: 'user-1', password_hash: 'stored-hash' }] })
    bcryptMocks.compare.mockResolvedValue(true)

    const result = await loginHandler(event)
    h3Mocks.getHeader.mockReturnValue(`Bearer ${result.token}`)

    expect(result.username).toBe('player_1')
    expect(bcryptMocks.compare).toHaveBeenCalledWith('password-123', 'stored-hash')
    expect(requireCloudUser(event)).toEqual({ sub: 'user-1', username: 'player_1' })
  })

  it('错误密码返回 401，数据库异常返回不泄露内部信息的 503', async () => {
    h3Mocks.readBody.mockResolvedValue({ username: 'player_1', password: 'password-123' })
    databaseMocks.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', password_hash: 'stored-hash' }] })
    bcryptMocks.compare.mockResolvedValue(false)
    await expect(loginHandler(event)).rejects.toMatchObject({ statusCode: 401 })

    databaseMocks.query.mockRejectedValueOnce(new Error('postgres host and table details'))
    await expect(loginHandler(event)).rejects.toMatchObject({ statusCode: 503, message: '云存档服务暂时不可用，请稍后重试' })
  })

  it('JWT 缺失或无效时返回 401，服务端缺少密钥时返回 503', () => {
    h3Mocks.getHeader.mockReturnValue(undefined)
    expect(() => requireCloudUser(event)).toThrow(expect.objectContaining({ statusCode: 401 }))

    h3Mocks.getHeader.mockReturnValue('Bearer invalid-token')
    expect(() => requireCloudUser(event)).toThrow(expect.objectContaining({ statusCode: 401 }))

    const validToken = issueCloudToken('user-1', 'player_1')
    delete process.env.NUXT_JWT_SECRET
    h3Mocks.getHeader.mockReturnValue(`Bearer ${validToken}`)
    expect(() => requireCloudUser(event)).toThrow(expect.objectContaining({ statusCode: 503 }))

    process.env.NUXT_JWT_SECRET = 'too-short'
    expect(() => requireCloudUser(event)).toThrow(expect.objectContaining({ statusCode: 503 }))
  })

  it('账号与密码的非字符串或越界输入在访问数据库前返回 400', async () => {
    h3Mocks.readBody.mockResolvedValue({ username: ['player'], password: 12345678 })
    await expect(registerHandler(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(databaseMocks.query).not.toHaveBeenCalled()
  })

  it('缺少 JWT 密钥时注册返回 503 且不会创建无会话账号', async () => {
    delete process.env.NUXT_JWT_SECRET
    h3Mocks.readBody.mockResolvedValue({ username: 'player_1', password: 'password-123' })

    await expect(registerHandler(event)).rejects.toMatchObject({ statusCode: 503 })
    expect(bcryptMocks.hash).not.toHaveBeenCalled()
    expect(databaseMocks.query).not.toHaveBeenCalled()
  })
})

describe('云存档读取与事务写入 API', () => {
  let token: string

  beforeEach(() => {
    process.env.NUXT_JWT_SECRET = jwtSecret
    token = issueCloudToken('user-1', 'player_1')
    h3Mocks.getHeader.mockReset().mockReturnValue(`Bearer ${token}`)
    h3Mocks.readBody.mockReset()
    databaseMocks.ensureCloudSchema.mockReset().mockResolvedValue(undefined)
    databaseMocks.query.mockReset()
    databaseMocks.connect.mockReset()
  })

  afterEach(() => {
    delete process.env.NUXT_JWT_SECRET
  })

  it('读取不存在和已存在的有效云存档', async () => {
    databaseMocks.query.mockResolvedValueOnce({ rows: [] })
    await expect(getCloudSaveHandler(event)).resolves.toEqual({ revision: 0, payload: null, savedAt: null })

    const payload = createCloudSave()
    const savedAt = new Date('2026-07-22T08:00:00.000Z')
    databaseMocks.query.mockResolvedValueOnce({ rows: [{ revision: 3, payload, saved_at: savedAt }] })
    await expect(getCloudSaveHandler(event)).resolves.toEqual({ revision: 3, payload, savedAt: savedAt.toISOString() })
  })

  it('读取异常或数据库中的损坏存档只返回稳定 503', async () => {
    databaseMocks.query.mockRejectedValueOnce(new Error('relation gunfight_cloud_saves does not exist'))
    await expect(getCloudSaveHandler(event)).rejects.toMatchObject({ statusCode: 503, message: '云存档服务暂时不可用，请稍后重试' })

    databaseMocks.query.mockResolvedValueOnce({ rows: [{ revision: 2, payload: { stage: 'bad' }, saved_at: new Date() }] })
    await expect(getCloudSaveHandler(event)).rejects.toMatchObject({ statusCode: 503 })
  })

  it.each([
    [{ payload: createCloudSave() }, 400],
    [{ baseRevision: -1, payload: createCloudSave() }, 400],
    [{ baseRevision: 0, payload: [] }, 400],
    [{ baseRevision: 0, payload: createCloudSave({ stage: '12' }) }, 400],
    [{ baseRevision: 0, payload: createCloudSave({ resources: { gold: -1, alloy: 0, parts: 0 } }) }, 400],
    [{ baseRevision: 0, payload: createCloudSave({ note: '界'.repeat(400_000) }) }, 413]
  ])('严格拒绝无效修订号、payload、核心字段和超限存档 %#', async (body, statusCode) => {
    h3Mocks.readBody.mockResolvedValue(body)
    await expect(putCloudSaveHandler(event)).rejects.toMatchObject({ statusCode })
    expect(databaseMocks.connect).not.toHaveBeenCalled()
  })

  it('新存档在用户级事务锁内写入并提交修订 1', async () => {
    const payload = createCloudSave()
    const savedAt = new Date('2026-07-22T08:10:00.000Z')
    h3Mocks.readBody.mockResolvedValue({ baseRevision: 0, payload })
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT revision')) return { rows: [] }
      if (sql.includes('INSERT INTO')) return { rows: [{ saved_at: savedAt }] }
      return { rows: [] }
    })
    const client = createClient(query)
    databaseMocks.connect.mockResolvedValue(client)

    await expect(putCloudSaveHandler(event)).resolves.toEqual({ conflict: false, revision: 1, savedAt: savedAt.toISOString() })
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      expect.stringContaining('SELECT revision'),
      expect.stringContaining('INSERT INTO'),
      'COMMIT'
    ])
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('旧修订号返回当前有效存档并在写入前回滚', async () => {
    const localPayload = createCloudSave({ savedAt: 200 })
    const cloudPayload = createCloudSave({ savedAt: 300 })
    const cloudSavedAt = new Date('2026-07-22T08:20:00.000Z')
    h3Mocks.readBody.mockResolvedValue({ baseRevision: 1, payload: localPayload })
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT revision')) return { rows: [{ revision: 2, payload: cloudPayload, saved_at: cloudSavedAt }] }
      return { rows: [] }
    })
    const client = createClient(query)
    databaseMocks.connect.mockResolvedValue(client)

    await expect(putCloudSaveHandler(event)).resolves.toEqual({ conflict: true, revision: 2, payload: cloudPayload, savedAt: cloudSavedAt.toISOString() })
    expect(query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO'))).toBe(false)
  })

  it('冲突查询发现损坏的云端快照时回滚并拒绝回传', async () => {
    h3Mocks.readBody.mockResolvedValue({ baseRevision: 1, payload: createCloudSave() })
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT revision')) return { rows: [{ revision: 2, payload: { stage: 'bad' }, saved_at: new Date() }] }
      return { rows: [] }
    })
    const client = createClient(query)
    databaseMocks.connect.mockResolvedValue(client)

    await expect(putCloudSaveHandler(event)).rejects.toMatchObject({ statusCode: 503 })
    expect(query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO'))).toBe(false)
  })

  it('写入失败会回滚且只暴露 503，绝不提交或覆盖旧存档', async () => {
    h3Mocks.readBody.mockResolvedValue({ baseRevision: 2, payload: createCloudSave() })
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT revision')) return { rows: [{ revision: 2, payload: createCloudSave(), saved_at: new Date() }] }
      if (sql.includes('INSERT INTO')) throw new Error('private constraint and host details')
      return { rows: [] }
    })
    const client = createClient(query)
    databaseMocks.connect.mockResolvedValue(client)

    await expect(putCloudSaveHandler(event)).rejects.toMatchObject({ statusCode: 503, message: '云存档服务暂时不可用，请稍后重试' })
    expect(query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false)
    expect(client.release).toHaveBeenCalledOnce()
  })
})
