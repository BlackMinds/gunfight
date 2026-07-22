import type { EnemyKind } from './formulas'
import { eliteAffixCombatModifiers, eliteAffixLabels, resolveEliteAffixes, type EliteAffixId } from './r4'
import type { BossPhaseDefinition, WavePhase } from './waves'

export const R5_STAGE_MIN = 501
export const R5_IMPLEMENTED_STAGE_CAP = 10000

export type R5EliteAffixId = EliteAffixId
  | 'suppression'
  | 'linked-armor'
  | 'hunter'
  | 'overload'
  | 'toxic'
  | 'summoner'
  | 'reflective'
  | 'chilling'
  | 'barrier'
  | 'resistant'

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

export type R5WarzoneTheme = {
  bandId: R5StageBand['id']
  motif: 'assembly-lines' | 'hunting-arcs' | 'storm-cuts' | 'fortress-cross' | 'radiation-blocks' | 'deep-trenches' | 'black-rings' | 'finale-rays'
  floor: string
  grid: string
  boundary: string
  accent: string
  landmark: string
  positioningRule: string
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

export const r5WarzoneThemes = [
  { bandId: 'industrial-blockade', motif: 'assembly-lines', floor: '#172126', grid: '#5c8394', boundary: '#f0bd54', accent: '#d87b42', landmark: '装配线封锁带', positioningRule: '左右换线' },
  { bandId: 'wasteland-hunt', motif: 'hunting-arcs', floor: '#2b241b', grid: '#a98558', boundary: '#e1a84f', accent: '#c65f3f', landmark: '荒原追踪弧', positioningRule: '绕圈拉扯' },
  { bandId: 'wasteland-storm', motif: 'storm-cuts', floor: '#20282d', grid: '#7699ab', boundary: '#9dd7e8', accent: '#62b8d5', landmark: '风暴航道', positioningRule: '斜向穿越' },
  { bandId: 'alloy-fortress', motif: 'fortress-cross', floor: '#182427', grid: '#608b91', boundary: '#f0a84d', accent: '#de713c', landmark: '中央合金堡', positioningRule: '四角转移' },
  { bandId: 'radiation-city', motif: 'radiation-blocks', floor: '#1e281b', grid: '#74945b', boundary: '#b4d65c', accent: '#d1e56a', landmark: '污染街块', positioningRule: '避开聚集区' },
  { bandId: 'deep-front', motif: 'deep-trenches', floor: '#251a1a', grid: '#875b4f', boundary: '#d38b5d', accent: '#b74d42', landmark: '纵深壕沟', positioningRule: '前后换层' },
  { bandId: 'black-domain', motif: 'black-rings', floor: '#171521', grid: '#665b8c', boundary: '#a88ce8', accent: '#7bd2d0', landmark: '黑域扫描环', positioningRule: '环形机动' },
  { bandId: 'end-war', motif: 'finale-rays', floor: '#251b17', grid: '#a17d5a', boundary: '#f0c85b', accent: '#e75b4f', landmark: '终局汇聚点', positioningRule: '持续换位' }
] as const satisfies readonly R5WarzoneTheme[]

export const r5Tuning = {
  affixes: {
    suppression: { id: 'suppression', label: '抑制', unlockStage: 501, color: '#b58cff' },
    'linked-armor': { id: 'linked-armor', label: '链甲', unlockStage: 1001, color: '#69aee8' },
    hunter: { id: 'hunter', label: '猎手', unlockStage: 2001, color: '#ef8b5a' },
    overload: { id: 'overload', label: '过载', unlockStage: 5001, color: '#f05d72' },
    toxic: { id: 'toxic', label: '毒性', unlockStage: 501, color: '#78c95b' },
    summoner: { id: 'summoner', label: '召唤', unlockStage: 1001, color: '#c394ef' },
    reflective: { id: 'reflective', label: '反伤', unlockStage: 2001, color: '#f07b68' },
    chilling: { id: 'chilling', label: '冰冷', unlockStage: 3001, color: '#73cfe8' },
    barrier: { id: 'barrier', label: '屏障', unlockStage: 5001, color: '#f2c968' },
    resistant: { id: 'resistant', label: '抗性', unlockStage: 7501, color: '#b5c1d6' }
  },
  suppressionCooldownPenalty: 0.4,
  linkedDamageShare: 0.18,
  linkedRange: 150,
  hunterActionRate: 1.12,
  overloadHpThreshold: 0.35,
  overloadActionRate: 1.18,
  toxicDuration: 4,
  toxicDamageRatio: 0.12,
  summonCooldown: 8,
  reflectRatio: 0.08,
  reflectMaxHpCap: 0.03,
  chillingDuration: 2.5,
  chillingSpeedMultiplier: 0.7,
  barrierCooldown: 6,
  barrierArmorRatio: 0.12,
  resistantStatusDurationMultiplier: 0.55,
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

export function getR5WarzoneTheme(stage: number): R5WarzoneTheme | null {
  const band = getR5StageBand(stage)
  return band ? r5WarzoneThemes.find((theme) => theme.bandId === band.id) ?? null : null
}

export function r5SpecialistKindsForStage(stage: number): EnemyKind[] {
  const kinds: EnemyKind[] = []
  if (stage >= 501) kinds.push('sniper')
  if (stage >= 1501) kinds.push('medic')
  if (stage >= 3001) kinds.push('warden')
  return kinds
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

const allAffixIds: readonly R5EliteAffixId[] = [
  'assault', 'bulwark', 'regeneration', 'volatile',
  'suppression', 'linked-armor', 'hunter', 'overload',
  'toxic', 'summoner', 'reflective', 'chilling', 'barrier', 'resistant'
]

export function availableR5EliteAffixes(stage: number): R5EliteAffixId[] {
  if (stage < R5_STAGE_MIN) return []
  return allAffixIds.filter((id) => {
    if (id in r5Tuning.affixes) return r5Tuning.affixes[id as keyof typeof r5Tuning.affixes].unlockStage <= clampedStage(stage)
    return true
  })
}

const extraAffixDefinitions = r5Tuning.affixes as Record<string, { id: string; label: string; unlockStage: number; color: string }>

export function resolveR5EliteAffixes(stage: number, waveIndex: number, spawnIndex: number, kind?: EnemyKind): R5EliteAffixId[] {
  if (stage < R5_STAGE_MIN) return resolveEliteAffixes(stage, waveIndex, spawnIndex, kind)
  const band = getR5StageBand(stage)
  const pool = availableR5EliteAffixes(stage)
  if (!band || !pool.length) return []
  const kindOffset = kind ? ['grunt', 'ranged', 'fast', 'heavy', 'bomber', 'sniper', 'medic', 'warden', 'shield', 'commander', 'splitter', 'stealth'].indexOf(kind) : 0
  const start = Math.abs(stage * 19 + waveIndex * 11 + spawnIndex * 5 + Math.max(0, kindOffset)) % pool.length
  return Array.from({ length: Math.min(band.eliteAffixCount, pool.length) }, (_, index) => pool[(start + index) % pool.length])
}

export function r5EliteAffixLabels(affixes: readonly R5EliteAffixId[]) {
  return affixes.map((id) => {
    if (id in extraAffixDefinitions) return extraAffixDefinitions[id].label
    return eliteAffixLabels([id as EliteAffixId])[0]
  })
}

export function r5EliteAffixColor(id: R5EliteAffixId) {
  if (id in extraAffixDefinitions) return extraAffixDefinitions[id].color
  const colors: Record<EliteAffixId, string> = { assault: '#f0a34a', bulwark: '#78b9d6', regeneration: '#86bf70', volatile: '#e36b4f' }
  return colors[id as EliteAffixId]
}

export function r5EliteAffixCombatModifiers(affixes: readonly R5EliteAffixId[], hpRatio = 1) {
  const legacy = eliteAffixCombatModifiers(affixes.filter((id): id is EliteAffixId => ['assault', 'bulwark', 'regeneration', 'volatile'].includes(id)))
  const hunterRate = affixes.includes('hunter') ? r5Tuning.hunterActionRate : 1
  const overloadRate = affixes.includes('overload') && hpRatio <= r5Tuning.overloadHpThreshold ? r5Tuning.overloadActionRate : 1
  return {
    ...legacy,
    actionRateMultiplier: legacy.actionRateMultiplier * hunterRate * overloadRate,
    statusDurationMultiplier: affixes.includes('resistant') ? r5Tuning.resistantStatusDurationMultiplier : 1
  }
}

export function bossPhasesForStage(stage: number, basePhases: readonly BossPhaseDefinition[]) {
  const count = getR5StageBand(stage)?.bossPhaseCount ?? basePhases.length
  return [...basePhases, ...extraBossPhases].slice(0, count)
}

export function r5WaveKindsForStage(stage: number, phase: WavePhase, baseKinds: readonly EnemyKind[]) {
  if (stage < R5_STAGE_MIN) return [...baseKinds]
  const specialists = r5SpecialistKindsForStage(stage)
  const additions: Partial<Record<WavePhase, EnemyKind[]>> = {
    warmup: stage >= 2001 ? ['grunt', 'medic', 'commander'] : stage >= 1501 ? ['grunt', 'medic'] : ['grunt'],
    'ranged-pressure': ['ranged', 'sniper', stage >= 1001 ? 'shield' : 'grunt'],
    'charge-burst': ['fast', 'bomber', ...(stage >= 5001 ? ['splitter' as EnemyKind] : stage >= 1501 ? ['medic' as EnemyKind] : [])],
    'armor-check': ['heavy', stage >= 3001 ? 'warden' : stage >= 2001 ? 'bomber' : stage >= 1001 ? 'shield' : 'ranged'],
    climax: stage >= 7501
      ? ['ranged', 'sniper', 'shield', 'commander', 'splitter', 'stealth', ...specialists]
      : stage >= 5001
        ? ['ranged', 'sniper', 'heavy', 'warden', 'splitter', ...specialists]
        : stage >= 3001
          ? ['ranged', 'sniper', 'heavy', 'warden', 'bomber', 'fast', ...specialists]
          : ['heavy', 'ranged', ...specialists]
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
