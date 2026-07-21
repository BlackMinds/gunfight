import type { EnemyKind } from './formulas'

export const R4_STAGE_MIN = 101
export const R4_IMPLEMENTED_STAGE_CAP = 500

export type EliteAffixId = 'assault' | 'bulwark' | 'regeneration' | 'volatile'

export type R4EnemyMechanics = {
  rangedBurst: boolean
  heavyArmorRecovery: boolean
  bomberDeathZone: boolean
  eliteCoordination: boolean
}

export type R4StageBand = {
  id: 'firebreak' | 'lockdown' | 'ruins' | 'combined-arms'
  label: string
  minStage: number
  maxStage: number
  hp: readonly [number, number]
  damage: readonly [number, number]
  speed: readonly [number, number]
  extraWaveEnemies: number
  spawnIntervalMultiplier: number
  eliteAffixCount: 1 | 2
  mechanics: R4EnemyMechanics
}

export const r4Tuning = {
  maxEnemySpeed: 190,
  maxChargeSpeed: 575,
  rangedBurst: {
    spread: 0.045,
    projectileDamageMultiplier: 0.46
  },
  heavyArmorRecovery: {
    delaySeconds: 4,
    ratioPerSecond: 0.08
  },
  deathZone: {
    warningSeconds: 0.9,
    radius: 82,
    damageMultiplier: 0.65
  },
  coordination: {
    range: 140,
    speedMultiplier: 1.08,
    actionRateMultiplier: 1.12
  },
  regeneration: {
    delaySeconds: 3.5,
    hpRatioPerSecond: 0.015
  },
  affixes: {
    assault: { id: 'assault', label: '急袭', unlockStage: 101, color: '#f0a34a' },
    bulwark: { id: 'bulwark', label: '壁垒', unlockStage: 101, color: '#78b9d6' },
    regeneration: { id: 'regeneration', label: '再生', unlockStage: 201, color: '#86bf70' },
    volatile: { id: 'volatile', label: '爆裂', unlockStage: 301, color: '#e36b4f' }
  } satisfies Record<EliteAffixId, { id: EliteAffixId; label: string; unlockStage: number; color: string }>
} as const

export const r4StageBands = [
  {
    id: 'firebreak', label: '火力突破', minStage: 101, maxStage: 200,
    hp: [1, 1.18], damage: [1, 1.08], speed: [1, 1.01],
    extraWaveEnemies: 0, spawnIntervalMultiplier: 1, eliteAffixCount: 1,
    mechanics: { rangedBurst: true, heavyArmorRecovery: false, bomberDeathZone: false, eliteCoordination: false }
  },
  {
    id: 'lockdown', label: '装甲封锁', minStage: 201, maxStage: 300,
    hp: [1.18, 1.4], damage: [1.08, 1.16], speed: [1.01, 1.02],
    extraWaveEnemies: 1, spawnIntervalMultiplier: 0.97, eliteAffixCount: 1,
    mechanics: { rangedBurst: true, heavyArmorRecovery: true, bomberDeathZone: false, eliteCoordination: false }
  },
  {
    id: 'ruins', label: '废城压迫', minStage: 301, maxStage: 400,
    hp: [1.4, 1.68], damage: [1.16, 1.26], speed: [1.02, 1.03],
    extraWaveEnemies: 1, spawnIntervalMultiplier: 0.94, eliteAffixCount: 1,
    mechanics: { rangedBurst: true, heavyArmorRecovery: true, bomberDeathZone: true, eliteCoordination: false }
  },
  {
    id: 'combined-arms', label: '联合作战', minStage: 401, maxStage: 500,
    hp: [1.68, 2], damage: [1.26, 1.38], speed: [1.03, 1.04],
    extraWaveEnemies: 2, spawnIntervalMultiplier: 0.91, eliteAffixCount: 2,
    mechanics: { rangedBurst: true, heavyArmorRecovery: true, bomberDeathZone: true, eliteCoordination: true }
  }
] as const satisfies readonly R4StageBand[]

const noMechanics: R4EnemyMechanics = {
  rangedBurst: false,
  heavyArmorRecovery: false,
  bomberDeathZone: false,
  eliteCoordination: false
}

function clampedR4Stage(stage: number) {
  return Math.min(R4_IMPLEMENTED_STAGE_CAP, Math.max(R4_STAGE_MIN, Math.round(stage)))
}

export function getR4StageBand(stage: number): R4StageBand | null {
  if (stage < R4_STAGE_MIN) return null
  const clamped = clampedR4Stage(stage)
  return r4StageBands.find((band) => clamped >= band.minStage && clamped <= band.maxStage) ?? r4StageBands[r4StageBands.length - 1]
}

function interpolateBand(stage: number, band: R4StageBand, values: readonly [number, number]) {
  const clamped = Math.min(band.maxStage, Math.max(band.minStage, stage))
  const progress = (clamped - band.minStage) / Math.max(1, band.maxStage - band.minStage)
  return values[0] + (values[1] - values[0]) * progress
}

export function r4EnemyMultipliersForStage(stage: number) {
  const band = getR4StageBand(stage)
  if (!band) return { hp: 1, damage: 1, speed: 1 }
  const clamped = clampedR4Stage(stage)
  return {
    hp: interpolateBand(clamped, band, band.hp),
    damage: interpolateBand(clamped, band, band.damage),
    speed: interpolateBand(clamped, band, band.speed)
  }
}

export function r4EnemyMechanicsForStage(stage: number): R4EnemyMechanics {
  return getR4StageBand(stage)?.mechanics ?? noMechanics
}

export function r4WavePressureForStage(stage: number) {
  const band = getR4StageBand(stage)
  return {
    extraEnemies: band?.extraWaveEnemies ?? 0,
    spawnIntervalMultiplier: band?.spawnIntervalMultiplier ?? 1
  }
}

export function availableEliteAffixes(stage: number): EliteAffixId[] {
  if (stage < R4_STAGE_MIN) return []
  return (Object.keys(r4Tuning.affixes) as EliteAffixId[])
    .filter((id) => r4Tuning.affixes[id].unlockStage <= clampedR4Stage(stage))
}

export function resolveEliteAffixes(stage: number, waveIndex: number, spawnIndex: number, kind?: EnemyKind): EliteAffixId[] {
  const band = getR4StageBand(stage)
  const pool = availableEliteAffixes(stage)
  if (!band || !pool.length) return []
  const wanted = Math.min(band.eliteAffixCount, pool.length)
  const kindOffset = kind ? ['grunt', 'ranged', 'fast', 'heavy', 'bomber'].indexOf(kind) : 0
  const start = Math.abs(stage * 17 + waveIndex * 7 + spawnIndex * 3 + Math.max(0, kindOffset)) % pool.length
  return Array.from({ length: wanted }, (_, index) => pool[(start + index) % pool.length])
}

export function eliteAffixLabels(affixes: readonly EliteAffixId[]) {
  return affixes.map((id) => r4Tuning.affixes[id].label)
}

export function eliteAffixCombatModifiers(affixes: readonly EliteAffixId[]) {
  return {
    speedMultiplier: affixes.includes('assault') ? 1.06 : 1,
    actionRateMultiplier: affixes.includes('assault') ? 1.15 : 1,
    armorRatio: affixes.includes('bulwark') ? 0.22 : 0
  }
}

export function r4MechanicLabels(stage: number) {
  const mechanics = r4EnemyMechanicsForStage(stage)
  const labels: string[] = []
  if (mechanics.rangedBurst) labels.push('双发点射')
  if (mechanics.heavyArmorRecovery) labels.push('护甲整备')
  if (mechanics.bomberDeathZone) labels.push('延迟爆区')
  if (mechanics.eliteCoordination) labels.push('协同压迫')
  return labels
}
