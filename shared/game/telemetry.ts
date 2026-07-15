import type { AttachmentBonusKey } from './weapons'
import { levelTuning, type WavePhase } from './waves'

export type WaveRunRecord = {
  wave: number
  phase: WavePhase
  label: string
  duration: number
  enemyKinds: string[]
  cleared: boolean
}

export type AttachmentContribution = {
  heavyPierceDamage: number
  criticalTriggers: number
  criticalExtraDamage: number
  dodgedCharges: number
  totalChargeAttempts: number
}

export type StrategyInsight = {
  key: AttachmentBonusKey
  label: string
  value: string
  fit: string
  effective: boolean
}

export function durationVerdict(duration: number) {
  const target = levelTuning.targetDurationSeconds
  if (duration < target.min) return `偏快 · 比目标少 ${Math.ceil(target.min - duration)} 秒`
  if (duration > target.max) return `偏慢 · 超出目标 ${Math.ceil(duration - target.max)} 秒`
  return '达标 · 45–90 秒'
}

export function dpsGapPercent(peakDps: number, averageDps: number) {
  if (averageDps <= 0) return 0
  return Math.max(0, Math.round(((peakDps - averageDps) / averageDps) * 100))
}

export function buildStrategyInsights(
  contribution: AttachmentContribution,
  bonuses: Partial<Record<AttachmentBonusKey, number>>
): StrategyInsight[] {
  const insights: StrategyInsight[] = []
  if ((bonuses.pierce ?? 0) > 0) {
    insights.push({
      key: 'pierce',
      label: '穿透 / 破甲',
      value: `对重甲额外贡献 ${Math.round(contribution.heavyPierceDamage)} 伤害`,
      fit: '更适合重装兵与密集纵队',
      effective: contribution.heavyPierceDamage >= 20
    })
  }
  if ((bonuses.critRate ?? 0) > 0) {
    insights.push({
      key: 'critRate',
      label: '暴击',
      value: `触发 ${contribution.criticalTriggers} 次 · 额外 ${Math.round(contribution.criticalExtraDamage)} 伤害`,
      fit: '更适合精英与 Boss 等高血量目标',
      effective: contribution.criticalTriggers >= 2
    })
  }
  if ((bonuses.speed ?? 0) > 0) {
    insights.push({
      key: 'speed',
      label: '机动',
      value: `帮助躲避 ${contribution.dodgedCharges} / ${contribution.totalChargeAttempts} 次冲锋`,
      fit: '更适合迅捷兵、爆破兵与冲锋波',
      effective: contribution.dodgedCharges > 0
    })
  }
  if ((bonuses.damage ?? 0) > 0 || (bonuses.fireRate ?? 0) > 0) {
    insights.push({
      key: (bonuses.damage ?? 0) >= (bonuses.fireRate ?? 0) ? 'damage' : 'fireRate',
      label: '持续火力',
      value: '直接提高全目标清理效率',
      fit: '更适合热身波与远程压力波',
      effective: true
    })
  }
  if (!insights.length) {
    insights.push({ key: 'maxHp', label: '生存 / 成长', value: '本关没有可直接量化的输出贡献', fit: '更适合高爆发组合或长期成长', effective: true })
  }
  return insights
}
