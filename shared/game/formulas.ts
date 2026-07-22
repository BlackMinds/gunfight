import { r4EnemyMultipliersForStage } from './r4'
import { r5EnemyMultipliersForStage, r5RewardBudgetForStage } from './r5'

export type EnemyKind = 'grunt' | 'ranged' | 'fast' | 'heavy' | 'bomber' | 'sniper' | 'medic' | 'warden'

export const PUBLISHED_STAGE_CAP = 10000

// 在玩家长期伤害成长落地前，避免敌人生命/伤害继续指数上扬；奖励与波次压力仍按真实关卡计算。
export const ENEMY_STAT_GROWTH_CAP = 20
export const STAGE_REWARD_CAPS = { gold: 121, alloy: 3 } as const

const stageNames = [
  { max: 50, name: '训练区', pressure: '基础暴徒' },
  { max: 200, name: '街区战', pressure: '快速兵与重装兵' },
  { max: 500, name: '废城推进', pressure: '精英词缀' },
  { max: 1000, name: '军工封锁', pressure: '首领机制' },
  { max: 2000, name: '荒原战线', pressure: '元素流派' },
  { max: 3000, name: '合金要塞', pressure: '护甲体系' },
  { max: 5000, name: '辐射城区', pressure: '高密度怪群' },
  { max: 7000, name: '深层战场', pressure: '多阶段首领' },
  { max: 9000, name: '黑域行动', pressure: '神话装备' },
  { max: 10000, name: '终局战争', pressure: '毕业检验' }
]

const baseEnemy = {
  grunt: { label: '暴徒', hp: 38, damage: 7, speed: 74, hpRate: 1, damageRate: 1, speedRate: 1 },
  ranged: { label: '火力手', hp: 30, damage: 6, speed: 66, hpRate: 0.82, damageRate: 0.92, speedRate: 0.92 },
  fast: { label: '迅捷兵', hp: 24, damage: 5, speed: 118, hpRate: 0.72, damageRate: 0.82, speedRate: 1.42 },
  heavy: { label: '重装兵', hp: 92, damage: 12, speed: 48, hpRate: 1.75, damageRate: 1.34, speedRate: 0.72 },
  bomber: { label: '爆破兵', hp: 32, damage: 18, speed: 86, hpRate: 0.9, damageRate: 1.6, speedRate: 1.08 },
  sniper: { label: '狙击手', hp: 26, damage: 11, speed: 58, hpRate: 0.78, damageRate: 1.48, speedRate: 0.82 },
  medic: { label: '维修兵', hp: 42, damage: 5, speed: 70, hpRate: 1.08, damageRate: 0.72, speedRate: 0.9 },
  warden: { label: '护卫兵', hp: 78, damage: 9, speed: 54, hpRate: 1.48, damageRate: 1.05, speedRate: 0.76 }
} satisfies Record<EnemyKind, Record<string, number | string>>

export function getDifficultyMultipliers(level: number) {
  return {
    hpMultiplier: 1 + level * 0.08 + Math.pow(level, 1.18) * 0.015,
    damageMultiplier: 1 + level * 0.035 + Math.pow(level, 1.08) * 0.004,
    speedMultiplier: 1 + Math.min(level / 3000, 1.5),
    rewardMultiplier: 1 + level * 0.06 + Math.pow(level, 1.12) * 0.01
  }
}

export function scaleEnemyStats(level: number, kind: EnemyKind) {
  const base = baseEnemy[kind]
  const balancedLevel = Math.min(level, ENEMY_STAT_GROWTH_CAP)
  const multipliers = getDifficultyMultipliers(balancedLevel)
  const r4Multipliers = r4EnemyMultipliersForStage(level)
  const r5Multipliers = r5EnemyMultipliersForStage(level)
  const stageRate = 1 + Math.floor((balancedLevel - 1) / 1000) * 0.18

  return {
    label: String(base.label),
    hp: Number(base.hp) * multipliers.hpMultiplier * Number(base.hpRate) * stageRate * r4Multipliers.hp * r5Multipliers.hp,
    damage: Number(base.damage) * multipliers.damageMultiplier * Number(base.damageRate) * stageRate * r4Multipliers.damage * r5Multipliers.damage,
    speed: Number(base.speed) * multipliers.speedMultiplier * Number(base.speedRate) * r4Multipliers.speed * r5Multipliers.speed
  }
}

export function rewardForStage(level: number, kills: number) {
  const { rewardMultiplier } = getDifficultyMultipliers(level)
  const rawGold = Math.round((18 + kills * 2.4) * rewardMultiplier)
  const rawAlloy = Math.max(1, Math.floor(level / 5) + Math.floor(kills / 18))
  const r5Budget = r5RewardBudgetForStage(level)
  const isR5 = level >= 501
  const parts = isR5 ? (level % 25 === 0 ? r5Budget.resourceParts : r5Budget.parts) : level % 5 === 0 ? 3 : 1
  return {
    gold: Math.min(isR5 ? r5Budget.gold : STAGE_REWARD_CAPS.gold, rawGold),
    exp: Math.round((12 + kills * 1.6) * rewardMultiplier),
    alloy: Math.min(isR5 ? r5Budget.alloy : STAGE_REWARD_CAPS.alloy, rawAlloy),
    parts: isR5 ? parts : parts + (level % 25 === 0 ? 3 : 0)
  }
}

export function getStageMeta(level: number) {
  return stageNames.find((stage) => level <= stage.max) ?? stageNames[stageNames.length - 1]
}
