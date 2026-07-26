import { createError, readBody } from 'h3'
import { PUBLISHED_STAGE_CAP } from '../../../shared/game/formulas'
import { liveOpsSnapshot, normalizeRankedOperationMode, rankedRunRulesFor } from '../../../shared/game/live-ops'
import { operationUnlocked } from '../../../shared/game/operations'
import { requireCloudUser } from '../../utils/auth'
import { createUserId, database, ensureCloudSchema } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  const body = await readBody(event).catch(() => null) as Record<string, unknown> | null
  let mode
  try {
    mode = normalizeRankedOperationMode(body?.mode)
  } catch {
    throw createError({ statusCode: 400, message: '排位行动类型无效' })
  }
  const stage = Number(body?.stage)
  if (!Number.isSafeInteger(stage) || stage < 1 || stage > PUBLISHED_STAGE_CAP) throw createError({ statusCode: 400, message: '排位关卡无效' })

  try {
    await ensureCloudSchema()
    const client = await database().connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        INSERT INTO gunfight_ranked_progress (user_id, highest_stage, updated_at)
        VALUES ($1, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [user.sub])
      const progress = await client.query<{ highest_stage: number }>(`
        SELECT highest_stage
        FROM gunfight_ranked_progress
        WHERE user_id = $1
        FOR UPDATE
      `, [user.sub])
      const verifiedHighestStage = Math.max(0, Math.min(PUBLISHED_STAGE_CAP, Number(progress.rows[0]?.highest_stage) || 0))
      if (!operationUnlocked(mode, verifiedHighestStage) || stage > Math.min(PUBLISHED_STAGE_CAP, verifiedHighestStage + 1)) {
        throw createError({ statusCode: 409, message: `服务端已验证至第 ${verifiedHighestStage} 关，尚未解锁该排位行动` })
      }

      const snapshot = liveOpsSnapshot()
      const rules = rankedRunRulesFor(stage, mode)
      const runId = createUserId()
      await client.query(`
        UPDATE gunfight_ranked_runs
        SET status = 'expired'
        WHERE user_id = $1 AND status = 'active'
      `, [user.sub])
      await client.query(`
        INSERT INTO gunfight_ranked_runs (id, user_id, season_id, activity_id, mode, stage, expires_at)
        VALUES ($2, $1, $3, $4, $5, $6, NOW() + INTERVAL '30 minutes')
      `, [user.sub, runId, snapshot.season.id, snapshot.activity.id, mode, stage])
      await client.query('COMMIT')

      return {
        runId,
        seasonId: snapshot.season.id,
        activityId: snapshot.activity.id,
        mode,
        stage,
        maxKills: rules.maxKills,
        minimumDurationMs: rules.minimumDurationMs,
        expiresInMs: rules.maximumDurationMs
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, message: '排位行动服务暂时不可用' })
  }
})
