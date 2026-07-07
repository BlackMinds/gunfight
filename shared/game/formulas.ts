export type EnemyKind = 'grunt' | 'fast' | 'heavy' | 'bomber'

const stageNames = [
  { max: 50, name: '训练区', pressure: '基础暴徒' },
  { max: 200, name: '街区战', pressure: '快速怪与重装怪' },
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
  fast: { label: '迅捷兵', hp: 24, damage: 5, speed: 118, hpRate: 0.72, damageRate: 0.82, speedRate: 1.42 },
  heavy: { label: '重装兵', hp: 92, damage: 12, speed: 48, hpRate: 1.75, damageRate: 1.34, speedRate: 0.72 },
  bomber: { label: '爆破兵', hp: 32, damage: 18, speed: 86, hpRate: 0.9, damageRate: 1.6, speedRate: 1.08 }
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
  const multipliers = getDifficultyMultipliers(level)
  const stageRate = 1 + Math.floor((level - 1) / 1000) * 0.18

  return {
    label: String(base.label),
    hp: Number(base.hp) * multipliers.hpMultiplier * Number(base.hpRate) * stageRate,
    damage: Number(base.damage) * multipliers.damageMultiplier * Number(base.damageRate) * stageRate,
    speed: Number(base.speed) * multipliers.speedMultiplier * Number(base.speedRate)
  }
}

export function rewardForStage(level: number, kills: number) {
  const { rewardMultiplier } = getDifficultyMultipliers(level)
  return {
    gold: Math.round((18 + kills * 2.4) * rewardMultiplier),
    exp: Math.round((12 + kills * 1.6) * rewardMultiplier),
    alloy: Math.max(1, Math.floor(level / 5) + Math.floor(kills / 18)),
    parts: level % 5 === 0 ? 3 : 1
  }
}

export function getStageMeta(level: number) {
  return stageNames.find((stage) => level <= stage.max) ?? stageNames[stageNames.length - 1]
}
