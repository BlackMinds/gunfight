import type { QueryResult } from 'pg'
import { requireCloudUser } from '../utils/auth'
import { cloudServiceUnavailable } from '../utils/cloud-errors'
import { database, ensureCloudSchema } from '../utils/database'
import { isValidCloudSavePayload } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  let result: QueryResult<{ revision: number; payload: Record<string, unknown>; saved_at: Date }>
  try {
    await ensureCloudSchema()
    result = await database().query<{ revision: number; payload: Record<string, unknown>; saved_at: Date }>('SELECT revision, payload, saved_at FROM gunfight_cloud_saves WHERE user_id = $1', [user.sub])
  } catch {
    throw cloudServiceUnavailable()
  }
  const save = result.rows[0]
  if (save && (!Number.isSafeInteger(save.revision) || save.revision < 1 || !isValidCloudSavePayload(save.payload) || !(save.saved_at instanceof Date) || Number.isNaN(save.saved_at.getTime()))) {
    throw cloudServiceUnavailable()
  }
  return save ? { revision: save.revision, payload: save.payload, savedAt: save.saved_at.toISOString() } : { revision: 0, payload: null, savedAt: null }
})
