import { describe, expect, it } from 'vitest'
import { scaleEnemyStats } from '../../shared/game/formulas'
import { getEnemyPreview, getStageTypeLabel } from '../../shared/game/presentation'
import { bossDefinitionForStage } from '../../shared/game/bosses'
import { r5BossHpMultiplierForStage } from '../../shared/game/r5'
import { levelTuning } from '../../shared/game/waves'

describe('关卡展示数据', () => {
  it('Boss 预览与实际生成倍率同源', () => {
    const stage = 10
    const stats = scaleEnemyStats(stage, levelTuning.boss.kind)
    expect(getEnemyPreview(stage)).toMatchObject({
      label: bossDefinitionForStage(stage).label,
      hp: Math.round(stats.hp * levelTuning.boss.multipliers.hp),
      damage: Math.round(stats.damage * levelTuning.boss.multipliers.damage),
      boss: true
    })
  })

  it('10/100/1000/10000 关预览使用对应 Boss 名称', () => {
    expect([10, 100, 1000, 10000].map((stage) => getEnemyPreview(stage).label)).toEqual(['突击领主', '堡垒巨像', '战区统帅', '终焉核心'])
  })

  it('五阶段 Boss 预览包含阶段可读性生命倍率', () => {
    const stage = 7500
    const stats = scaleEnemyStats(stage, levelTuning.boss.kind)
    expect(getEnemyPreview(stage).hp).toBe(Math.round(stats.hp * levelTuning.boss.multipliers.hp * r5BossHpMultiplierForStage(stage)))
  })

  it('复合关卡同时显示战斗主类型与零件加成', () => {
    expect(getStageTypeLabel(10)).toBe('首领关')
    expect(getStageTypeLabel(25)).toBe('精英关 · 零件加成')
    expect(getStageTypeLabel(50)).toBe('首领关 · 零件加成')
  })

  it('R4 精英预览展示词缀与已解锁机制', () => {
    const preview = getEnemyPreview(405)
    expect(preview.elite).toBe(true)
    expect(preview.affixes).toHaveLength(2)
    expect(preview.affixLabels.every((label) => preview.label.includes(label))).toBe(true)
    expect(preview.mechanicLabels).toEqual(['双发点射', '护甲整备', '延迟爆区', '协同压迫'])
  })
})
