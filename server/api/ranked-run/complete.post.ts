import { createError, readBody } from 'h3'
import { rankedEventScoreFor, rankedRunRulesFor, type RankedOperationMode } from '../../../shared/game/live-ops'
import { requireCloudUser } from '../../utils/auth'
import { database, ensureCloudSchema } from '../../utils/database'

type RankedRunRow = {
  id: string
  season_id: string
  activity_id: string
  mode: RankedOperationMode
  stage: number
  started_at: Date
  expires_at: Date
}

export default defineEventHandler(async (event) => {
  const user = requireCloudUser(event)
  const body = await readBody(event).catch(() => null) as Record<string, unknown> | null
  const runId = typeof body?.runId === 'string' ? body.runId : ''
  const kills = Number(body?.kills)
  if (!runId || !Number.isSafeInteger(kills) || kills < 0) throw createError({ statusCode: 400, message: '排位结算数据无效' })

  try {
    await ensureCloudSchema()
    const runResult = await database().query<RankedRunRow>(`
      SELECT id, season_id, activity_id, mode, stage, started_at, expires_at
      FROM gunfight_ranked_runs
      WHERE id = $1 AND user_id = $2 AND status = 'active'
    `, [runId, user.sub])
    const run = runResult.rows[0]
    if (!run) throw createError({ statusCode: 409, message: '排位行动不存在或已经结算' })

    const rules = rankedRunRulesFor(run.stage, run.mode)
    const durationMs = Date.now() - run.started_at.getTime()
    if (Date.now() > run.expires_at.getTime() || durationMs > rules.maximumDurationMs) throw createError({ statusCode: 409, message: '排位行动已经过期' })
    if (durationMs < rules.minimumDurationMs) throw createError({ statusCode: 409, message: '排位行动完成时间不符合规则' })
    if (kills > rules.maxKills) throw createError({ statusCode: 400, message: '击杀数超过该行动理论上限' })
    if (run.mode !== 'survival' && kills !== rules.maxKills) throw createError({ statusCode: 409, message: '排位行动尚未完成全部目标' })

    const previousEvents = run.mode === 'event'
      ? await database().query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM gunfight_ranked_runs WHERE user_id = $1 AND season_id = $2 AND mode = 'event' AND status = 'completed'`, [user.sub, run.season_id])
      : { rows: [{ count: 0 }] }
    const eventScore = rankedEventScoreFor(run.mode, run.activity_id, Number(previousEvents.rows[0]?.count) || 0)

    const saved = await database().query<{
      highest_stage: number
      best_bounty_ms: number | null
      survival_kills: number
      event_score: number
      duration_ms: number
    }>(`
      WITH completed AS (
        UPDATE gunfight_ranked_runs
        SET status = 'completed', completed_at = NOW(),
            duration_ms = FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::int,
            kills = $3, event_score = $4
        WHERE id = $1 AND user_id = $2 AND status = 'active' AND expires_at >= NOW()
        RETURNING user_id, season_id, mode, stage, duration_ms, kills, event_score
      ), progress AS (
        INSERT INTO gunfight_ranked_progress (user_id, highest_stage, updated_at)
        SELECT user_id, CASE WHEN mode = 'campaign' THEN stage ELSE 0 END, NOW()
        FROM completed
        ON CONFLICT (user_id) DO UPDATE SET
          highest_stage = GREATEST(gunfight_ranked_progress.highest_stage, EXCLUDED.highest_stage),
          updated_at = NOW()
        RETURNING highest_stage
      ), score AS (
        INSERT INTO gunfight_season_scores (user_id, season_id, highest_stage, best_bounty_ms, survival_kills, event_score, updated_at)
        SELECT user_id, season_id,
          CASE WHEN mode = 'campaign' THEN stage ELSE 0 END,
          CASE WHEN mode = 'bounty' THEN duration_ms ELSE NULL END,
          CASE WHEN mode = 'survival' THEN kills ELSE 0 END,
          event_score, NOW()
        FROM completed
        ON CONFLICT (user_id, season_id) DO UPDATE SET
          highest_stage = GREATEST(gunfight_season_scores.highest_stage, EXCLUDED.highest_stage),
          best_bounty_ms = CASE
            WHEN gunfight_season_scores.best_bounty_ms IS NULL THEN EXCLUDED.best_bounty_ms
            WHEN EXCLUDED.best_bounty_ms IS NULL THEN gunfight_season_scores.best_bounty_ms
            ELSE LEAST(gunfight_season_scores.best_bounty_ms, EXCLUDED.best_bounty_ms)
          END,
          survival_kills = GREATEST(gunfight_season_scores.survival_kills, EXCLUDED.survival_kills),
          event_score = gunfight_season_scores.event_score + EXCLUDED.event_score,
          updated_at = NOW()
        RETURNING highest_stage, best_bounty_ms, survival_kills, event_score
      )
      SELECT score.*, completed.duration_ms FROM score CROSS JOIN completed
    `, [runId, user.sub, kills, eventScore])
    const score = saved.rows[0]
    if (!score) throw createError({ statusCode: 409, message: '排位行动已经结算' })
    return {
      seasonId: run.season_id,
      durationMs: score.duration_ms,
      awardedEventScore: eventScore,
      score: { highestStage: score.highest_stage, bestBountyMs: score.best_bounty_ms, survivalKills: score.survival_kills, eventScore: score.event_score }
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, message: '排位结算服务暂时不可用' })
  }
})
