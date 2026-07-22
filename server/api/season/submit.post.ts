import { createError } from 'h3'
import { requireCloudUser } from '../../utils/auth'
import { database, ensureCloudSchema } from '../../utils/database'
import { isValidCloudSavePayload } from '../../utils/validation'
import { extractSeasonSubmission, liveOpsSnapshot } from '../../../shared/game/live-ops'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  try {
    await ensureCloudSchema()
    const saveResult = await database().query<{ payload: Record<string, unknown> }>('SELECT payload FROM gunfight_cloud_saves WHERE user_id = $1', [user.sub])
    const payload = saveResult.rows[0]?.payload
    if (!payload || !isValidCloudSavePayload(payload)) throw createError({ statusCode: 409, message: '请先完成一次有效云存档同步' })
    const seasonId = liveOpsSnapshot().season.id
    const score = extractSeasonSubmission(payload)
    const result = await database().query<{
      highest_stage: number
      best_bounty_ms: number | null
      survival_kills: number
      event_score: number
      updated_at: Date
    }>(`
      INSERT INTO gunfight_season_scores (user_id, season_id, highest_stage, best_bounty_ms, survival_kills, event_score, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, season_id) DO UPDATE SET
        highest_stage = GREATEST(gunfight_season_scores.highest_stage, EXCLUDED.highest_stage),
        best_bounty_ms = CASE
          WHEN gunfight_season_scores.best_bounty_ms IS NULL THEN EXCLUDED.best_bounty_ms
          WHEN EXCLUDED.best_bounty_ms IS NULL THEN gunfight_season_scores.best_bounty_ms
          ELSE LEAST(gunfight_season_scores.best_bounty_ms, EXCLUDED.best_bounty_ms)
        END,
        survival_kills = GREATEST(gunfight_season_scores.survival_kills, EXCLUDED.survival_kills),
        event_score = GREATEST(gunfight_season_scores.event_score, EXCLUDED.event_score),
        updated_at = NOW()
      RETURNING highest_stage, best_bounty_ms, survival_kills, event_score, updated_at
    `, [user.sub, seasonId, score.highestStage, score.bestBountyMs, score.survivalKills, score.eventScore])
    const saved = result.rows[0]
    if (!saved) throw new Error('missing season score')
    return {
      seasonId,
      score: { highestStage: saved.highest_stage, bestBountyMs: saved.best_bounty_ms, survivalKills: saved.survival_kills, eventScore: saved.event_score },
      updatedAt: saved.updated_at.toISOString()
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, message: '赛季服务暂时不可用' })
  }
})
