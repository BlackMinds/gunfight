import { createError, readBody } from 'h3'
import { requireCloudUser } from '../utils/auth'
import { database, ensureCloudSchema } from '../utils/database'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  const body = await readBody<{ baseRevision?: number; payload?: Record<string, unknown> }>(event)
  if (!body.payload || typeof body.payload !== 'object') throw createError({ statusCode: 400, message: '存档内容无效' })
  if (JSON.stringify(body.payload).length > 1_000_000) throw createError({ statusCode: 413, message: '存档超过 1 MB 上限' })
  await ensureCloudSchema()
  const client = await database().connect()
  try {
    await client.query('BEGIN')
    const currentResult = await client.query<{ revision: number; payload: Record<string, unknown>; saved_at: Date }>('SELECT revision, payload, saved_at FROM gunfight_cloud_saves WHERE user_id = $1 FOR UPDATE', [user.sub])
    const current = currentResult.rows[0]
    const currentRevision = current?.revision ?? 0
    if ((body.baseRevision ?? 0) !== currentRevision) {
      await client.query('ROLLBACK')
      return { conflict: true, revision: currentRevision, payload: current?.payload ?? null, savedAt: current?.saved_at?.toISOString() ?? null }
    }
    const nextRevision = currentRevision + 1
    await client.query(`INSERT INTO gunfight_cloud_saves (user_id, revision, payload, saved_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET revision = EXCLUDED.revision, payload = EXCLUDED.payload, saved_at = NOW()`, [user.sub, nextRevision, body.payload])
    await client.query('COMMIT')
    return { conflict: false, revision: nextRevision, savedAt: new Date().toISOString() }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
