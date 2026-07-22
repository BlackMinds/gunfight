import { describe, expect, it } from 'vitest'
import {
  attachmentMaxLevel,
  attachmentUpgradeCost,
  buildAttachmentComparison,
  buildAttachmentDecision,
  buildAttachmentDimensions,
  buildAttachmentTags,
  combineAffixBonuses,
  normalizeBonus,
  rollSubAffixes
} from '../../shared/game/attachment-domain'
import type { Attachment, AttachmentAffix } from '../../shared/game/weapons'

function attachment(overrides: Partial<Attachment>): Attachment {
  return {
    name: '测试配件',
    slot: '枪口',
    rarity: '精良',
    effect: '',
    bonuses: {},
    ...overrides
  }
}

describe('attachment domain', () => {
  it('保持整数词条与百分比词条的原有归一化规则', () => {
    expect(normalizeBonus('pierce', 1.49)).toBe(1)
    expect(normalizeBonus('maxHp', 10.6)).toBe(11)
    expect(normalizeBonus('damage', 0.02649)).toBe(0.026)
  })

  it('重铸时保留锁定副词条并避免与主词条重复', () => {
    const locked: AttachmentAffix = { key: 'critRate', label: '暴击率', value: 0.04, tier: '副词条' }
    const values = [0, 0.5, 0.3, 0.7]
    const affixes = rollSubAffixes('稀有', 'damage', () => values.shift() ?? 0.5, locked)

    expect(affixes).toHaveLength(3)
    expect(affixes[0]).toEqual(locked)
    expect(new Set(affixes.map((affix) => affix.key)).size).toBe(3)
    expect(affixes.some((affix) => affix.key === 'damage')).toBe(false)
  })

  it('所有品质都按规则生成固定数量的副词条', () => {
    const expected = { 普通: 1, 精良: 2, 稀有: 3, 史诗: 4, 传说: 5, 神话: 6 } as const
    for (const [rarity, count] of Object.entries(expected)) {
      expect(rollSubAffixes(rarity as Attachment['rarity'], 'damage', () => 0.5)).toHaveLength(count)
    }
  })

  it('合并词条后保持比较行与推荐结论', () => {
    const current = attachment({ bonuses: { damage: 0.05 } })
    const next = attachment({ rarity: '稀有', bonuses: { damage: 0.1, pierce: 1 } })

    expect(combineAffixBonuses(
      { key: 'damage', label: '伤害', value: 0.08, tier: '主词条' },
      [{ key: 'damage', label: '伤害', value: 0.025, tier: '副词条' }]
    )).toEqual({ damage: 0.105 })
    expect(buildAttachmentComparison(current, next)).toEqual([
      { label: '伤害', current: '伤害 +5%', next: '伤害 +10%' },
      { label: '穿透', current: '无穿透', next: '穿透 +1' }
    ])
    expect(buildAttachmentDecision(current, next)).toMatchObject({ label: '输出提升', actionLabel: '推荐装备', tone: 'offense' })
    expect(buildAttachmentDimensions(current, next)).toEqual([
      { key: 'offense', label: '输出', current: 5, next: 26, delta: 21, summary: '伤害、射速、暴击与穿透' },
      { key: 'survival', label: '生存', current: 0, next: 0, delta: 0, summary: '最大生命与移动容错' },
      { key: 'utility', label: '功能', current: 0, next: 0, delta: 0, summary: '拾取范围与经验收益' }
    ])
  })

  it('保持品质强化上限和强化成本', () => {
    const epic = attachment({ rarity: '史诗', level: 4 })
    expect(attachmentMaxLevel(epic)).toBe(10)
    expect(attachmentUpgradeCost(epic)).toBe(6)
  })

  it('根据实际词条稳定生成最多两个流派标签', () => {
    expect(buildAttachmentTags(attachment({ bonuses: { maxHp: 40, speed: 0.08 } }))).toEqual(['生存'])
    expect(buildAttachmentTags(attachment({ bonuses: { damage: 0.2, pierce: 2, expGain: 0.1 } }))).toEqual(['穿透', '输出'])
    expect(buildAttachmentTags(attachment({ bonuses: { pickup: 30, expGain: 0.2 } }))).toEqual(['经济'])
  })
})
