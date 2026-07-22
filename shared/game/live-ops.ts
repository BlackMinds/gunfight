export const leaderboardMetrics = ['highest-stage', 'bounty-time', 'survival-kills', 'event-score'] as const
export type LeaderboardMetric = (typeof leaderboardMetrics)[number]

export type SeasonSubmission = {
  highestStage: number
  bestBountyMs: number | null
  survivalKills: number
  eventScore: number
}

const activityRotation = [
  { id: 'bounty-surge', label: '悬赏增援周', operation: 'bounty', bonus: '荣誉币 +25%' },
  { id: 'survival-front', label: '生存前线周', operation: 'survival', bonus: '赛季积分 +25%' },
  { id: 'warzone-assault', label: '战区突袭周', operation: 'event', bonus: '精密元件 +1' },
  { id: 'boss-hunt', label: '首领猎杀周', operation: 'challenge', bonus: 'Boss 材料 +1' }
] as const

const DAY_MS = 86_400_000
const SEASON_DAYS = 28
const EPOCH = Date.UTC(2026, 6, 1)

export function liveOpsSnapshot(now = new Date()) {
  const time = now.getTime()
  const seasonIndex = Math.max(0, Math.floor((time - EPOCH) / (SEASON_DAYS * DAY_MS)))
  const startsAt = new Date(EPOCH + seasonIndex * SEASON_DAYS * DAY_MS)
  const endsAt = new Date(startsAt.getTime() + SEASON_DAYS * DAY_MS)
  const weekIndex = Math.max(0, Math.floor((time - startsAt.getTime()) / (7 * DAY_MS))) % activityRotation.length
  const activityStartsAt = new Date(startsAt.getTime() + weekIndex * 7 * DAY_MS)
  const activityEndsAt = new Date(Math.min(endsAt.getTime(), activityStartsAt.getTime() + 7 * DAY_MS))
  const current = activityRotation[weekIndex]
  const next = activityRotation[(weekIndex + 1) % activityRotation.length]
  return {
    season: { id: `S${String(seasonIndex + 1).padStart(2, '0')}-联合作战`, index: seasonIndex + 1, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    activity: { ...current, startsAt: activityStartsAt.toISOString(), endsAt: activityEndsAt.toISOString() },
    nextActivity: { ...next, startsAt: activityEndsAt.toISOString() }
  }
}

export function normalizeLeaderboardMetric(value: unknown): LeaderboardMetric {
  return leaderboardMetrics.includes(value as LeaderboardMetric) ? value as LeaderboardMetric : 'event-score'
}

export function extractSeasonSubmission(payload: Record<string, unknown>): SeasonSubmission {
  const season = payload.season && typeof payload.season === 'object' ? payload.season as Record<string, unknown> : {}
  const highestStage = Math.max(0, Math.min(10000, Math.floor(Number(payload.highestCleared) || 0)))
  const bountySeconds = season.bestBountySeconds == null ? null : Number(season.bestBountySeconds)
  return {
    highestStage,
    bestBountyMs: bountySeconds != null && Number.isFinite(bountySeconds) && bountySeconds > 0 ? Math.round(bountySeconds * 1000) : null,
    survivalKills: Math.max(0, Math.floor(Number(season.bestSurvivalKills) || 0)),
    eventScore: Math.max(0, Math.floor(Number(season.score) || 0))
  }
}

export function mergeSeasonSubmission(current: SeasonSubmission | null, incoming: SeasonSubmission): SeasonSubmission {
  return {
    highestStage: Math.max(current?.highestStage ?? 0, incoming.highestStage),
    bestBountyMs: current?.bestBountyMs == null ? incoming.bestBountyMs : incoming.bestBountyMs == null ? current.bestBountyMs : Math.min(current.bestBountyMs, incoming.bestBountyMs),
    survivalKills: Math.max(current?.survivalKills ?? 0, incoming.survivalKills),
    eventScore: Math.max(current?.eventScore ?? 0, incoming.eventScore)
  }
}
