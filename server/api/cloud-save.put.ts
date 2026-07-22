import { readBody } from 'h3'
import type { PoolClient } from 'pg'
import { requireCloudUser } from '../utils/auth'
import { cloudServiceUnavailable } from '../utils/cloud-errors'
import { database, ensureCloudSchema } from '../utils/database'
import { isValidCloudSavePayload, parseCloudSaveWrite } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  const body = parseCloudSaveWrite(await readBody(event))
  try {
    await ensureCloudSchema()
  } catch {
    throw cloudServiceUnavailable()
  }
  let client: PoolClient
  try {
    client = await database().connect()
  } catch {
    throw cloudServiceUnavailable()
  }
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [user.sub])
    const currentResult = await client.query<{ revision: number; payload: Record<string, unknown>; saved_at: Date }>('SELECT revision, payload, saved_at FROM gunfight_cloud_saves WHERE user_id = $1 FOR UPDATE', [user.sub])
    const current = currentResult.rows[0]
    if (current && (!Number.isSafeInteger(current.revision) || current.revision < 1 || !isValidCloudSavePayload(current.payload) || !(current.saved_at instanceof Date) || Number.isNaN(current.saved_at.getTime()))) {
      throw new Error('invalid stored cloud save')
    }
    const currentRevision = current?.revision ?? 0
    if (body.baseRevision !== currentRevision) {
      await client.query('ROLLBACK')
      return { conflict: true, revision: currentRevision, payload: current?.payload ?? null, savedAt: current?.saved_at?.toISOString() ?? null }
    }
    const nextRevision = currentRevision + 1
    const savedResult = await client.query<{ saved_at: Date }>(`INSERT INTO gunfight_cloud_saves (user_id, revision, payload, saved_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET revision = EXCLUDED.revision, payload = EXCLUDED.payload, saved_at = NOW() RETURNING saved_at`, [user.sub, nextRevision, body.payload])
    const savedAt = savedResult.rows[0]?.saved_at
    if (!(savedAt instanceof Date) || Number.isNaN(savedAt.getTime())) throw new Error('invalid save timestamp')
    await client.query('COMMIT')
    return { conflict: false, revision: nextRevision, savedAt: savedAt.toISOString() }
  } catch {
    try {
      await client.query('ROLLBACK')
    } catch {
      // 连接中断时回滚也可能失败；对外仍只返回稳定的服务不可用错误。
    }
    throw cloudServiceUnavailable()
  } finally {
    client.release()
  }
})
