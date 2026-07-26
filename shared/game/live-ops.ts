import { createOperationWavePlan, type OperationMode } from './operations'
import { countWaveEnemies } from './waves'

export const leaderboardMetrics = ['highest-stage', 'bounty-time', 'survival-kills', 'event-score'] as const
export type LeaderboardMetric = (typeof leaderboardMetrics)[number]

export const rankedOperationModes = ['campaign', 'challenge', 'survival', 'bounty', 'event'] as const satisfies readonly OperationMode[]
export type RankedOperationMode = (typeof rankedOperationModes)[number]

const activityRotation = [
  { id: 'bounty-surge', label: '悬赏增援周', operation: 'bounty', bonus: '荣誉币 +25%' },
  { id: 'survival-front', label: '生存前线周', operation: 'survival', bonus: '赛季积分 +25%' },
  { id: 'warzone-assault', label: '战区突袭周', operation: 'event', bonus: '精密元件 +1' },
  { id: 'boss-hunt', label: '首领猎杀周', operation: 'challenge', bonus: '精密元件 +1' }
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

export function normalizeRankedOperationMode(value: unknown): RankedOperationMode {
  if (!rankedOperationModes.includes(value as RankedOperationMode)) throw new Error('invalid ranked operation mode')
  return value as RankedOperationMode
}

export function rankedRunRulesFor(stage: number, mode: RankedOperationMode) {
  const safeStage = Math.max(1, Math.min(10000, Math.round(Number(stage) || 1)))
  const maxKills = countWaveEnemies(createOperationWavePlan(safeStage, mode))
  const minimumDurationMs = mode === 'survival' ? 85_000 : mode === 'event' ? 12_000 : mode === 'campaign' ? 6_000 : 5_000
  return { stage: safeStage, mode, maxKills, minimumDurationMs, maximumDurationMs: 30 * 60_000 }
}

export function activityBonusFor(activityId: string | null | undefined, mode: RankedOperationMode) {
  return {
    honorMultiplier: activityId === 'bounty-surge' && mode === 'bounty' ? 1.25 : 1,
    seasonScoreMultiplier: activityId === 'survival-front' && mode === 'survival' ? 1.25 : 1,
    precisionBonus: ((activityId === 'warzone-assault' && mode === 'event') || (activityId === 'boss-hunt' && mode === 'challenge')) ? 1 : 0
  }
}

export function rankedEventScoreFor(mode: RankedOperationMode, activityId: string, previousEventClears = 0) {
  const base = mode === 'bounty' ? 35 : mode === 'survival' ? 25 : mode === 'event' && previousEventClears === 0 ? 100 : 0
  return Math.round(base * activityBonusFor(activityId, mode).seasonScoreMultiplier)
}

export function normalizeLeaderboardMetric(value: unknown): LeaderboardMetric {
  return leaderboardMetrics.includes(value as LeaderboardMetric) ? value as LeaderboardMetric : 'event-score'
}
