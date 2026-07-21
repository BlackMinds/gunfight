export const R3_REPLAY_STAGES = [20, 40, 60, 100] as const
export const R3_REPLAY_RUNS_PER_STAGE = 3
export const R3_REPLAY_FIXED_DELTA = 1 / 60
export const R4_REPLAY_STAGES = [100, 150, 200, 250, 300, 350, 400, 450, 500] as const
export const R4_REPLAY_RUNS_PER_STAGE = 3
export const R5_REPLAY_STAGES = [500, 1000, 1500, 2000, 3000, 5000, 7500, 10000] as const
export const R5_REPLAY_RUNS_PER_STAGE = 3

export type R3ReplayStage = (typeof R3_REPLAY_STAGES)[number]
export type R4ReplayStage = (typeof R4_REPLAY_STAGES)[number]
export type R5ReplayStage = (typeof R5_REPLAY_STAGES)[number]

export type ReplayArea = {
  x: number
  y: number
  width: number
  height: number
}

export type ReplayPoint = { x: number; y: number }

export type R3ReplayPlanEntry = {
  stage: R3ReplayStage
  run: number
  seed: number
}

export type R3ReplaySample = R3ReplayPlanEntry & {
  attempt: number
  valid: boolean
  result: '通关' | '失败'
  duration: number
  wallDuration: number
  goldIncome: number
  alloyIncome: number
  partsIncome: number
  unlockedReforges: number
  lockedReforges: number
  deathReason: string
  inputOrSamplingIssue: string
  maxFrameGapMs: number
  inventoryCount: number
  protectedOverflow: boolean
}

export type R4ReplayPlanEntry = {
  stage: R4ReplayStage
  run: number
  seed: number
}

export type R4ReplaySample = R4ReplayPlanEntry & {
  attempt: number
  valid: boolean
  result: '通关' | '失败'
  duration: number
  wallDuration: number
  waveDurations: Array<{ wave: number; label: string; duration: number; cleared: boolean }>
  deathCombination: string
  affixCombinations: Record<string, number>
  deathZoneHits: number
  armorRecovered: number
  coordinationCoverageSeconds: number
  eliteKillDurations: number[]
  inputOrSamplingIssue: string
  maxFrameGapMs: number
  buildProfileId: string
  buildExpectedDps: number
}

export type R5ReplayPlanEntry = {
  stage: R5ReplayStage
  run: number
  seed: number
}

export type R5ReplaySample = R5ReplayPlanEntry & {
  attempt: number
  valid: boolean
  result: '通关' | '失败'
  duration: number
  wallDuration: number
  waveDurations: Array<{ wave: number; label: string; duration: number; cleared: boolean }>
  deathCombination: string
  affixCombinations: Record<string, number>
  deathZoneHits: number
  trackingZoneHits: number
  armorRecovered: number
  coordinationCoverageSeconds: number
  shieldLinkSeconds: number
  commandPulseSeconds: number
  suppressionHits: number
  bossPhaseReached: number
  eliteKillDurations: number[]
  goldIncome: number
  alloyIncome: number
  partsIncome: number
  unlockedReforges: number
  lockedReforges: number
  inputOrSamplingIssue: string
  maxFrameGapMs: number
  buildProfileId: string
  buildExpectedDps: number
  buildExpectedMaxHp: number
}

export function createR3ReplayPlan(baseSeed = 0x5a17): R3ReplayPlanEntry[] {
  return R3_REPLAY_STAGES.flatMap((stage, stageIndex) =>
    Array.from({ length: R3_REPLAY_RUNS_PER_STAGE }, (_, runIndex) => ({
      stage,
      run: runIndex + 1,
      seed: (baseSeed + stageIndex * 1009 + runIndex * 97) >>> 0
    }))
  )
}

export function createR4ReplayPlan(baseSeed = 0x6a18): R4ReplayPlanEntry[] {
  return R4_REPLAY_STAGES.flatMap((stage, stageIndex) =>
    Array.from({ length: R4_REPLAY_RUNS_PER_STAGE }, (_, runIndex) => ({
      stage,
      run: runIndex + 1,
      seed: (baseSeed + stageIndex * 1009 + runIndex * 97) >>> 0
    }))
  )
}

export function createR5ReplayPlan(baseSeed = 0x7a19): R5ReplayPlanEntry[] {
  return R5_REPLAY_STAGES.flatMap((stage, stageIndex) =>
    Array.from({ length: R5_REPLAY_RUNS_PER_STAGE }, (_, runIndex) => ({
      stage,
      run: runIndex + 1,
      seed: (baseSeed + stageIndex * 1009 + runIndex * 97) >>> 0
    }))
  )
}

/** Mulberry32：相同种子与调用顺序始终得到相同结果。 */
export function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function clockwisePatrolWaypoints(area: ReplayArea): ReplayPoint[] {
  const insetX = Math.max(24, area.width * 0.16)
  const insetY = Math.max(24, area.height * 0.18)
  return [
    { x: area.x + insetX, y: area.y + insetY },
    { x: area.x + area.width - insetX, y: area.y + insetY },
    { x: area.x + area.width - insetX, y: area.y + area.height - insetY },
    { x: area.x + insetX, y: area.y + area.height - insetY }
  ]
}

export function clockwisePatrolVector(position: ReplayPoint, area: ReplayArea, waypointIndex: number) {
  const waypoints = clockwisePatrolWaypoints(area)
  let nextWaypointIndex = ((waypointIndex % waypoints.length) + waypoints.length) % waypoints.length
  let target = waypoints[nextWaypointIndex]
  let dx = target.x - position.x
  let dy = target.y - position.y
  if (Math.hypot(dx, dy) <= 24) {
    nextWaypointIndex = (nextWaypointIndex + 1) % waypoints.length
    target = waypoints[nextWaypointIndex]
    dx = target.x - position.x
    dy = target.y - position.y
  }
  const length = Math.hypot(dx, dy) || 1
  return {
    vector: { x: dx / length, y: dy / length },
    waypointIndex: nextWaypointIndex,
    target
  }
}

/** 与 R2 文档口径一致：金币衡量无锁次数，合金衡量锁词条次数。 */
export function supportedRareReforges(goldIncome: number, alloyIncome: number) {
  return {
    unlocked: Math.round((goldIncome / 110) * 100) / 100,
    locked: Math.round((alloyIncome / 2) * 100) / 100
  }
}
