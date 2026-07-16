import { requireCloudUser } from '../utils/auth'
import { database, ensureCloudSchema } from '../utils/database'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  await ensureCloudSchema()
  const result = await database().query<{ revision: number; payload: Record<string, unknown>; saved_at: Date }>('SELECT revision, payload, saved_at FROM gunfight_cloud_saves WHERE user_id = $1', [user.sub])
  const save = result.rows[0]
  return save ? { revision: save.revision, payload: save.payload, savedAt: save.saved_at.toISOString() } : { revision: 0, payload: null, savedAt: null }
})
