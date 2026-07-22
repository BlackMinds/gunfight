import { createError, getQuery } from 'h3'
import { requireCloudUser } from '../utils/auth'
import { database, ensureCloudSchema } from '../utils/database'
import { liveOpsSnapshot, normalizeLeaderboardMetric, type LeaderboardMetric } from '../../shared/game/live-ops'

const columns: Record<LeaderboardMetric, { column: string; direction: 'ASC' | 'DESC'; nonNull?: boolean }> = {
  'highest-stage': { column: 'highest_stage', direction: 'DESC' },
  'bounty-time': { column: 'best_bounty_ms', direction: 'ASC', nonNull: true },
  'survival-kills': { column: 'survival_kills', direction: 'DESC' },
  'event-score': { column: 'event_score', direction: 'DESC' }
}

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  const metric = normalizeLeaderboardMetric(getQuery(event).metric)
  const config = columns[metric]
  const seasonId = liveOpsSnapshot().season.id
  const nonNull = config.nonNull ? `AND scores.${config.column} IS NOT NULL` : ''
  try {
    await ensureCloudSchema()
    const result = await database().query<{ user_id: string; username: string; score: number; rank: number }>(`
      WITH ranked AS (
        SELECT scores.user_id, users.username, scores.${config.column} AS score,
          ROW_NUMBER() OVER (ORDER BY scores.${config.column} ${config.direction}, scores.updated_at ASC, scores.user_id ASC) AS rank
        FROM gunfight_season_scores scores
        JOIN gunfight_users users ON users.id = scores.user_id
        WHERE scores.season_id = $1 ${nonNull}
      )
      SELECT user_id, username, score, rank FROM ranked
      WHERE rank <= 50 OR user_id = $2
      ORDER BY rank ASC
    `, [seasonId, user.sub])
    const entries = result.rows.filter((row) => row.rank <= 50).map((row) => ({ username: row.username, score: Number(row.score), rank: Number(row.rank), currentUser: row.user_id === user.sub }))
    const current = result.rows.find((row) => row.user_id === user.sub)
    return { seasonId, metric, entries, currentRank: current ? Number(current.rank) : null, currentScore: current ? Number(current.score) : null }
  } catch {
    throw createError({ statusCode: 503, message: '排行榜服务暂时不可用' })
  }
})
