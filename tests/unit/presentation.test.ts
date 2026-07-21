import { describe, expect, it } from 'vitest'
import { scaleEnemyStats } from '../../shared/game/formulas'
import { getEnemyPreview, getStageTypeLabel } from '../../shared/game/presentation'
import { levelTuning } from '../../shared/game/waves'

describe('关卡展示数据', () => {
  it('Boss 预览与实际生成倍率同源', () => {
    const stage = 10
    const stats = scaleEnemyStats(stage, levelTuning.boss.kind)
    expect(getEnemyPreview(stage)).toMatchObject({
      label: levelTuning.boss.label,
      hp: Math.round(stats.hp * levelTuning.boss.multipliers.hp),
      damage: Math.round(stats.damage * levelTuning.boss.multipliers.damage),
      boss: true
    })
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
