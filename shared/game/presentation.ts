import { scaleEnemyStats, type EnemyKind } from './formulas'
import { eliteAffixLabels, r4MechanicLabels, resolveEliteAffixes } from './r4'
import { levelTuning } from './waves'

export const enemyKindLabels: Record<EnemyKind, string> = {
  grunt: '暴徒',
  ranged: '火力手',
  fast: '迅捷兵',
  heavy: '重装兵',
  bomber: '爆破兵'
}

export function getStageTypeLabel(stage: number) {
  const labels: string[] = []
  if (stage % 10 === 0) labels.push('首领关')
  else if (stage % 5 === 0) labels.push('精英关')
  else labels.push('普通关')
  if (stage % 25 === 0) labels.push('零件加成')
  return labels.join(' · ')
}

export function getEnemyPreview(stage: number) {
  const boss = stage % 10 === 0
  const elite = !boss && stage % 5 === 0
  const kind: EnemyKind = boss ? levelTuning.boss.kind : elite ? 'fast' : 'grunt'
  const stats = scaleEnemyStats(stage, kind)
  const affixes = elite ? resolveEliteAffixes(stage, 5, 0, kind) : []
  const affixLabels = eliteAffixLabels(affixes)
  const mechanicLabels = r4MechanicLabels(stage)
  const multipliers = boss ? levelTuning.boss.multipliers : elite ? levelTuning.elite.multipliers : { hp: 1, damage: 1, speed: 1, radius: 1 }
  return {
    kind,
    label: boss ? levelTuning.boss.label : elite ? `${affixLabels.length ? `${affixLabels.join('·')} · ` : ''}精英${stats.label}` : stats.label,
    hp: Math.round(stats.hp * multipliers.hp),
    damage: Math.round(stats.damage * multipliers.damage),
    speed: Math.round(stats.speed * multipliers.speed),
    boss,
    elite,
    affixes,
    affixLabels,
    mechanicLabels
  }
}
