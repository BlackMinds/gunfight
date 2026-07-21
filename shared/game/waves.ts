import type { EnemyKind } from './formulas'
import { r4WavePressureForStage } from './r4'
import { bossPhasesForStage, r5WaveKindsForStage, r5WavePressureForStage } from './r5'

export type WavePhase = 'warmup' | 'ranged-pressure' | 'charge-burst' | 'armor-check' | 'climax'

export type CombatMultipliers = {
  hp: number
  damage: number
  speed: number
  radius: number
}

export type BossPhaseDefinition = {
  hpThreshold: number
  label: string
  attackInterval: number
  projectileCount: number
  spread: number
  warningSeconds: number
  warningRange: number
}

export type WaveDefinition = {
  index: number
  phase: WavePhase
  label: string
  count: number
  kinds: EnemyKind[]
  spawnInterval: number
  restAfter: number
  eliteCount: number
  boss: boolean
}

type WaveTemplate = Omit<WaveDefinition, 'count' | 'eliteCount' | 'boss'> & {
  baseCount: number
  eliteEveryFiveStages: number
  eliteDefault: number
  bossOnMilestone: boolean
}

/**
 * 关卡唯一调参入口。
 * 数量、类型、生成间隔、精英倍率、波间休息与 Boss 阶段属性都集中在这里，
 * 调参时无需再进入画布战斗循环寻找魔法数字。
 */
export const levelTuning = {
  targetDurationSeconds: { min: 45, max: 90 },
  stageGrowth: {
    countBonusEveryStages: 20,
    maxCountBonus: 3,
    spawnIntervalReductionPerStage: 0.002,
    maxSpawnIntervalReduction: 0.18,
    minSpawnInterval: 0.28
  },
  elite: {
    everyStages: 5,
    multipliers: { hp: 1.9, damage: 1.12, speed: 1.08, radius: 1.38 } satisfies CombatMultipliers
  },
  boss: {
    everyStages: 10,
    kind: 'heavy' as EnemyKind,
    label: '街区首领',
    multipliers: { hp: 4.8, damage: 1.2, speed: 0.64, radius: 2.62 } satisfies CombatMultipliers,
    projectileSpeed: 230,
    projectileDamageMultiplier: 0.4,
    phases: [
      { hpThreshold: 1, label: '扇形压制', attackInterval: 1.62, projectileCount: 3, spread: 0.14, warningSeconds: 0.82, warningRange: 430 },
      { hpThreshold: 0.62, label: '交叉火网', attackInterval: 1.36, projectileCount: 5, spread: 0.18, warningSeconds: 0.74, warningRange: 460 },
      { hpThreshold: 0.3, label: '终局齐射', attackInterval: 1.15, projectileCount: 7, spread: 0.2, warningSeconds: 0.72, warningRange: 500 }
    ] satisfies BossPhaseDefinition[]
  },
  enemyWarnings: {
    rangedAimSeconds: 0.72,
    rangedRange: 340,
    rangedProjectileSpeed: 205,
    fastWindupSeconds: 0.58,
    fastChargeSeconds: 0.42,
    fastChargeRange: 285,
    fastChargeSpeedMultiplier: 3.15,
    heavyArmorRatio: 0.4
  },
  waves: [
    {
      index: 1,
      phase: 'warmup',
      label: '热身接敌',
      baseCount: 6,
      kinds: ['grunt'],
      spawnInterval: 1.3,
      restAfter: 3.7,
      eliteEveryFiveStages: 0,
      eliteDefault: 0,
      bossOnMilestone: false
    },
    {
      index: 2,
      phase: 'ranged-pressure',
      label: '远程压力',
      baseCount: 7,
      kinds: ['grunt', 'ranged'],
      spawnInterval: 0.96,
      restAfter: 3.8,
      eliteEveryFiveStages: 0,
      eliteDefault: 0,
      bossOnMilestone: false
    },
    {
      index: 3,
      phase: 'charge-burst',
      label: '冲锋爆发',
      baseCount: 7,
      kinds: ['fast', 'grunt', 'fast', 'bomber'],
      spawnInterval: 0.82,
      restAfter: 3.6,
      eliteEveryFiveStages: 0,
      eliteDefault: 0,
      bossOnMilestone: false
    },
    {
      index: 4,
      phase: 'armor-check',
      label: '重甲考验',
      baseCount: 7,
      kinds: ['heavy', 'ranged', 'heavy', 'grunt'],
      spawnInterval: 1.08,
      restAfter: 4.1,
      eliteEveryFiveStages: 1,
      eliteDefault: 0,
      bossOnMilestone: false
    },
    {
      index: 5,
      phase: 'climax',
      label: '精英高潮',
      baseCount: 5,
      kinds: ['ranged', 'fast', 'heavy', 'grunt', 'bomber'],
      spawnInterval: 1.3,
      restAfter: 0,
      eliteEveryFiveStages: 2,
      eliteDefault: 1,
      bossOnMilestone: true
    }
  ] satisfies WaveTemplate[]
} as const

export function createWavePlan(stage: number): WaveDefinition[] {
  const growth = levelTuning.stageGrowth
  const pressureBonus = Math.min(growth.maxCountBonus, Math.floor(Math.max(0, stage - 1) / growth.countBonusEveryStages))
  const pressure = stage >= 501 ? r5WavePressureForStage(stage) : r4WavePressureForStage(stage)
  const eliteStage = stage % levelTuning.elite.everyStages === 0
  const bossStage = stage % levelTuning.boss.everyStages === 0

  return levelTuning.waves.map((wave) => ({
    index: wave.index,
    phase: wave.phase,
    label: bossStage && wave.bossOnMilestone ? 'Boss 高潮' : wave.label,
    count: wave.baseCount + pressureBonus + pressure.extraEnemies,
    kinds: r5WaveKindsForStage(stage, wave.phase, wave.kinds),
    spawnInterval: wave.spawnInterval,
    restAfter: wave.restAfter,
    eliteCount: bossStage && wave.bossOnMilestone ? 0 : eliteStage ? wave.eliteEveryFiveStages : wave.eliteDefault,
    boss: bossStage && wave.bossOnMilestone
  }))
}

export function resolvedSpawnInterval(stage: number, wave: WaveDefinition) {
  const growth = levelTuning.stageGrowth
  const pressure = stage >= 501 ? r5WavePressureForStage(stage) : r4WavePressureForStage(stage)
  return Math.max(
    growth.minSpawnInterval,
    (wave.spawnInterval - Math.min(growth.maxSpawnIntervalReduction, stage * growth.spawnIntervalReductionPerStage)) * pressure.spawnIntervalMultiplier
  )
}

export function resolvedBossPhases(stage: number) {
  return bossPhasesForStage(stage, levelTuning.boss.phases)
}

export function countWaveEnemies(waves: WaveDefinition[]) {
  return waves.reduce((total, wave) => total + wave.count, 0)
}

export function enemyKindForWave(wave: WaveDefinition, spawnIndex: number): EnemyKind {
  return wave.kinds[spawnIndex % wave.kinds.length] ?? 'grunt'
}
