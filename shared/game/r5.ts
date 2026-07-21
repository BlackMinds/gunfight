import type { EnemyKind } from './formulas'
import { eliteAffixCombatModifiers, eliteAffixLabels, resolveEliteAffixes, type EliteAffixId } from './r4'
import type { BossPhaseDefinition, WavePhase } from './waves'

export const R5_STAGE_MIN = 501
export const R5_IMPLEMENTED_STAGE_CAP = 10000

export type R5EliteAffixId = EliteAffixId | 'suppression' | 'linked-armor' | 'hunter' | 'overload'

export type R5EnemyMechanics = {
  suppressiveMark: boolean
  shieldLink: boolean
  trackingDeathZone: boolean
  commandPulse: boolean
}

export type R5StageBand = {
  id: 'industrial-blockade' | 'wasteland-hunt' | 'wasteland-storm' | 'alloy-fortress' | 'radiation-city' | 'deep-front' | 'black-domain' | 'end-war'
  label: string
  minStage: number
  maxStage: number
  hp: readonly [number, number]
  damage: readonly [number, number]
  speed: readonly [number, number]
  extraWaveEnemies: number
  spawnIntervalMultiplier: number
  eliteAffixCount: 2 | 3 | 4
  bossPhaseCount: 3 | 4 | 5
  mechanics: R5EnemyMechanics
}

const mechanics = (suppressiveMark: boolean, shieldLink: boolean, trackingDeathZone: boolean, commandPulse: boolean): R5EnemyMechanics => ({
  suppressiveMark,
  shieldLink,
  trackingDeathZone,
  commandPulse
})

export const r5StageBands = [
  { id: 'industrial-blockade', label: '军工封锁', minStage: 501, maxStage: 1000, hp: [1, 1.45], damage: [1, 1.16], speed: [1, 1.01], extraWaveEnemies: 2, spawnIntervalMultiplier: 0.90, eliteAffixCount: 2, bossPhaseCount: 3, mechanics: mechanics(true, false, false, false) },
  { id: 'wasteland-hunt', label: '荒原猎杀', minStage: 1001, maxStage: 1500, hp: [1.45, 1.95], damage: [1.16, 1.32], speed: [1.01, 1.02], extraWaveEnemies: 3, spawnIntervalMultiplier: 0.88, eliteAffixCount: 2, bossPhaseCount: 3, mechanics: mechanics(true, true, false, false) },
  { id: 'wasteland-storm', label: '荒原风暴', minStage: 1501, maxStage: 2000, hp: [1.95, 2.55], damage: [1.32, 1.50], speed: [1.02, 1.03], extraWaveEnemies: 3, spawnIntervalMultiplier: 0.86, eliteAffixCount: 2, bossPhaseCount: 4, mechanics: mechanics(true, true, false, false) },
  { id: 'alloy-fortress', label: '合金要塞', minStage: 2001, maxStage: 3000, hp: [2.55, 3.60], damage: [1.50, 1.75], speed: [1.03, 1.04], extraWaveEnemies: 4, spawnIntervalMultiplier: 0.83, eliteAffixCount: 3, bossPhaseCount: 4, mechanics: mechanics(true, true, true, false) },
  { id: 'radiation-city', label: '辐射城区', minStage: 3001, maxStage: 5000, hp: [3.60, 5.20], damage: [1.75, 2.10], speed: [1.04, 1.05], extraWaveEnemies: 4, spawnIntervalMultiplier: 0.80, eliteAffixCount: 3, bossPhaseCount: 4, mechanics: mechanics(true, true, true, false) },
  { id: 'deep-front', label: '深层战场', minStage: 5001, maxStage: 7500, hp: [5.20, 7.20], damage: [2.10, 2.50], speed: [1.05, 1.06], extraWaveEnemies: 5, spawnIntervalMultiplier: 0.77, eliteAffixCount: 3, bossPhaseCount: 5, mechanics: mechanics(true, true, true, true) },
  { id: 'black-domain', label: '黑域行动', minStage: 7501, maxStage: 9000, hp: [7.20, 8.70], damage: [2.50, 2.80], speed: [1.06, 1.07], extraWaveEnemies: 5, spawnIntervalMultiplier: 0.75, eliteAffixCount: 4, bossPhaseCount: 5, mechanics: mechanics(true, true, true, true) },
  { id: 'end-war', label: '终局战争', minStage: 9001, maxStage: 10000, hp: [8.70, 10.00], damage: [2.80, 3.00], speed: [1.07, 1.08], extraWaveEnemies: 6, spawnIntervalMultiplier: 0.73, eliteAffixCount: 4, bossPhaseCount: 5, mechanics: mechanics(true, true, true, true) }
] as const satisfies readonly R5StageBand[]

export const r5Tuning = {
  affixes: {
    suppression: { id: 'suppression', label: '抑制', unlockStage: 501, color: '#b58cff' },
    'linked-armor': { id: 'linked-armor', label: '链甲', unlockStage: 1001, color: '#69aee8' },
    hunter: { id: 'hunter', label: '猎手', unlockStage: 2001, color: '#ef8b5a' },
    overload: { id: 'overload', label: '过载', unlockStage: 5001, color: '#f05d72' }
  },
  suppressionCooldownPenalty: 0.4,
  linkedDamageShare: 0.18,
  linkedRange: 150,
  hunterActionRate: 1.12,
  overloadHpThreshold: 0.35,
  overloadActionRate: 1.18,
  trackingRatio: 0.5,
  commandActionRate: 1.08,
  fivePhaseBossHpMultiplier: 8
} as const

const extraBossPhases: readonly BossPhaseDefinition[] = [
  { hpThreshold: 0.18, label: '环形封锁', attackInterval: 1.08, projectileCount: 9, spread: 0.22, warningSeconds: 0.76, warningRange: 520 },
  { hpThreshold: 0.08, label: '交替爆区', attackInterval: 1.02, projectileCount: 11, spread: 0.24, warningSeconds: 0.8, warningRange: 540 }
]

const noMechanics: R5EnemyMechanics = mechanics(false, false, false, false)

function clampedStage(stage: number) {
  return Math.min(R5_IMPLEMENTED_STAGE_CAP, Math.max(R5_STAGE_MIN, Math.round(stage)))
}

function interpolate(stage: number, band: R5StageBand, values: readonly [number, number]) {
  const current = Math.min(band.maxStage, Math.max(band.minStage, stage))
  const progress = (current - band.minStage) / Math.max(1, band.maxStage - band.minStage)
  return values[0] + (values[1] - values[0]) * progress
}

export function getR5StageBand(stage: number): R5StageBand | null {
  if (stage < R5_STAGE_MIN) return null
  const current = clampedStage(stage)
  return r5StageBands.find((band) => current >= band.minStage && current <= band.maxStage) ?? r5StageBands[r5StageBands.length - 1]
}

export function r5EnemyMultipliersForStage(stage: number) {
  const band = getR5StageBand(stage)
  if (!band) return { hp: 1, damage: 1, speed: 1 }
  const current = clampedStage(stage)
  return {
    hp: interpolate(current, band, band.hp),
    damage: interpolate(current, band, band.damage),
    speed: interpolate(current, band, band.speed)
  }
}

export function r5WavePressureForStage(stage: number) {
  const band = getR5StageBand(stage)
  return {
    extraEnemies: band?.extraWaveEnemies ?? 0,
    spawnIntervalMultiplier: band?.spawnIntervalMultiplier ?? 1
  }
}

export function r5EnemyMechanicsForStage(stage: number): R5EnemyMechanics {
  return getR5StageBand(stage)?.mechanics ?? noMechanics
}

export function r5ShieldLinkPairEligible(
  stage: number,
  firstKind: EnemyKind,
  firstAffixes: readonly R5EliteAffixId[],
  secondKind: EnemyKind,
  secondAffixes: readonly R5EliteAffixId[]
) {
  if (!r5EnemyMechanicsForStage(stage).shieldLink) return false
  if (firstKind === 'heavy' && secondKind === 'heavy') return true
  return firstKind === secondKind && firstAffixes.includes('linked-armor') && secondAffixes.includes('linked-armor')
}

export function r5BossHpMultiplierForStage(stage: number) {
  return getR5StageBand(stage)?.bossPhaseCount === 5 ? r5Tuning.fivePhaseBossHpMultiplier : 1
}

export function r5MechanicLabels(stage: number) {
  const current = r5EnemyMechanicsForStage(stage)
  const labels: string[] = []
  if (current.suppressiveMark) labels.push('压制标记')
  if (current.shieldLink) labels.push('护盾链接')
  if (current.trackingDeathZone) labels.push('追踪爆区')
  if (current.commandPulse) labels.push('指挥脉冲')
  return labels
}

const allAffixIds: readonly R5EliteAffixId[] = ['assault', 'bulwark', 'regeneration', 'volatile', 'suppression', 'linked-armor', 'hunter', 'overload']

export function availableR5EliteAffixes(stage: number): R5EliteAffixId[] {
  if (stage < R5_STAGE_MIN) return []
  return allAffixIds.filter((id) => {
    if (id === 'suppression' || id === 'linked-armor' || id === 'hunter' || id === 'overload') return r5Tuning.affixes[id].unlockStage <= clampedStage(stage)
    return true
  })
}

export function resolveR5EliteAffixes(stage: number, waveIndex: number, spawnIndex: number, kind?: EnemyKind): R5EliteAffixId[] {
  if (stage < R5_STAGE_MIN) return resolveEliteAffixes(stage, waveIndex, spawnIndex, kind)
  const band = getR5StageBand(stage)
  const pool = availableR5EliteAffixes(stage)
  if (!band || !pool.length) return []
  const kindOffset = kind ? ['grunt', 'ranged', 'fast', 'heavy', 'bomber'].indexOf(kind) : 0
  const start = Math.abs(stage * 19 + waveIndex * 11 + spawnIndex * 5 + Math.max(0, kindOffset)) % pool.length
  return Array.from({ length: Math.min(band.eliteAffixCount, pool.length) }, (_, index) => pool[(start + index) % pool.length])
}

export function r5EliteAffixLabels(affixes: readonly R5EliteAffixId[]) {
  return affixes.map((id) => {
    if (id === 'suppression' || id === 'linked-armor' || id === 'hunter' || id === 'overload') return r5Tuning.affixes[id].label
    return eliteAffixLabels([id])[0]
  })
}

export function r5EliteAffixColor(id: R5EliteAffixId) {
  if (id === 'suppression' || id === 'linked-armor' || id === 'hunter' || id === 'overload') return r5Tuning.affixes[id].color
  const colors: Record<EliteAffixId, string> = { assault: '#f0a34a', bulwark: '#78b9d6', regeneration: '#86bf70', volatile: '#e36b4f' }
  return colors[id]
}

export function r5EliteAffixCombatModifiers(affixes: readonly R5EliteAffixId[], hpRatio = 1) {
  const legacy = eliteAffixCombatModifiers(affixes.filter((id): id is EliteAffixId => ['assault', 'bulwark', 'regeneration', 'volatile'].includes(id)))
  const hunterRate = affixes.includes('hunter') ? r5Tuning.hunterActionRate : 1
  const overloadRate = affixes.includes('overload') && hpRatio <= r5Tuning.overloadHpThreshold ? r5Tuning.overloadActionRate : 1
  return { ...legacy, actionRateMultiplier: legacy.actionRateMultiplier * hunterRate * overloadRate }
}

export function bossPhasesForStage(stage: number, basePhases: readonly BossPhaseDefinition[]) {
  const count = getR5StageBand(stage)?.bossPhaseCount ?? basePhases.length
  return [...basePhases, ...extraBossPhases].slice(0, count)
}

export function r5WaveKindsForStage(stage: number, phase: WavePhase, baseKinds: readonly EnemyKind[]) {
  if (stage < R5_STAGE_MIN) return [...baseKinds]
  const additions: Partial<Record<WavePhase, EnemyKind[]>> = {
    warmup: stage >= 3001 ? ['grunt', 'fast'] : ['grunt'],
    'ranged-pressure': ['ranged', stage >= 1001 ? 'heavy' : 'grunt'],
    'charge-burst': ['fast', 'bomber'],
    'armor-check': ['heavy', stage >= 2001 ? 'bomber' : 'ranged'],
    climax: stage >= 5001 ? ['ranged', 'heavy', 'bomber', 'fast'] : ['heavy', 'ranged']
  }
  return [...baseKinds, ...(additions[phase] ?? [])]
}

const growthAnchors = [
  { stage: 500, damageMultiplier: 1, maxHpBonus: 0, expectedDps: 900, expectedMaxHp: 1400 },
  { stage: 1000, damageMultiplier: 1.3, maxHpBonus: 200, expectedDps: 1400, expectedMaxHp: 1800 },
  { stage: 1500, damageMultiplier: 1.7, maxHpBonus: 300, expectedDps: 1900, expectedMaxHp: 2200 },
  { stage: 2000, damageMultiplier: 2.2, maxHpBonus: 450, expectedDps: 2500, expectedMaxHp: 2700 },
  { stage: 3000, damageMultiplier: 3.1, maxHpBonus: 650, expectedDps: 3500, expectedMaxHp: 3400 },
  { stage: 5000, damageMultiplier: 4.3, maxHpBonus: 700, expectedDps: 5200, expectedMaxHp: 4400 },
  { stage: 7500, damageMultiplier: 5.6, maxHpBonus: 700, expectedDps: 7200, expectedMaxHp: 5600 },
  { stage: 10000, damageMultiplier: 7.2, maxHpBonus: 850, expectedDps: 9500, expectedMaxHp: 7000 }
] as const

export const r5GrowthAnchors = growthAnchors

export function r5CampaignGrowthForHighestCleared(highestCleared: number) {
  if (highestCleared < 500) return { damageMultiplier: 1, maxHpBonus: 0 }
  const stage = Math.min(R5_IMPLEMENTED_STAGE_CAP, Math.max(500, highestCleared + 1))
  const upperIndex = growthAnchors.findIndex((anchor) => stage <= anchor.stage)
  if (upperIndex <= 0) return { damageMultiplier: 1, maxHpBonus: 0 }
  if (upperIndex < 0) {
    const last = growthAnchors[growthAnchors.length - 1]
    return { damageMultiplier: last.damageMultiplier, maxHpBonus: last.maxHpBonus }
  }
  const lower = growthAnchors[upperIndex - 1]
  const upper = growthAnchors[upperIndex]
  const progress = (stage - lower.stage) / (upper.stage - lower.stage)
  return {
    damageMultiplier: lower.damageMultiplier + (upper.damageMultiplier - lower.damageMultiplier) * progress,
    maxHpBonus: Math.round(lower.maxHpBonus + (upper.maxHpBonus - lower.maxHpBonus) * progress)
  }
}

export function r5GrowthBudgetForStage(stage: number) {
  const target = growthAnchors.find((anchor) => stage <= anchor.stage) ?? growthAnchors[growthAnchors.length - 1]
  return target
}

const rewardAnchors = [
  { stage: 500, gold: 121, alloy: 3, parts: 1, resourceParts: 4 },
  { stage: 1000, gold: 180, alloy: 4, parts: 2, resourceParts: 6 },
  { stage: 2000, gold: 260, alloy: 5, parts: 3, resourceParts: 8 },
  { stage: 3000, gold: 360, alloy: 6, parts: 4, resourceParts: 10 },
  { stage: 5000, gold: 520, alloy: 8, parts: 5, resourceParts: 12 },
  { stage: 7500, gold: 720, alloy: 10, parts: 6, resourceParts: 15 },
  { stage: 10000, gold: 900, alloy: 12, parts: 8, resourceParts: 18 }
] as const

export function r5RewardBudgetForStage(stage: number) {
  return rewardAnchors.find((anchor) => stage <= anchor.stage) ?? rewardAnchors[rewardAnchors.length - 1]
}
