import { createError } from 'h3'
import { requireCloudUser } from '../../utils/auth'
import { database, ensureCloudSchema } from '../../utils/database'
import { liveOpsSnapshot } from '../../../shared/game/live-ops'

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  try {
    await ensureCloudSchema()
    const seasonId = liveOpsSnapshot().season.id
    const result = await database().query<{
      highest_stage: number
      best_bounty_ms: number | null
      survival_kills: number
      event_score: number
      updated_at: Date
    }>(`
      SELECT highest_stage, best_bounty_ms, survival_kills, event_score, updated_at
      FROM gunfight_season_scores
      WHERE user_id = $1 AND season_id = $2
    `, [user.sub, seasonId])
    const saved = result.rows[0]
    if (!saved) throw createError({ statusCode: 409, message: '本赛季尚无已验证的排位行动成绩' })
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
