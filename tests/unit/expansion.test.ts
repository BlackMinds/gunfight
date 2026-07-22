import { describe, expect, it } from 'vitest'
import { attachmentCanBreakthrough, attachmentCanStar, attachmentStarCost, eventClearRewards, normalizeAdvancedResources, normalizeSeasonState, normalizeShopState, normalizeSkillProgress, seasonTier } from '../../shared/game/expansion'
import type { Attachment } from '../../shared/game/weapons'

const legendary: Attachment = { name: '测试配件', slot: '枪口', rarity: '传说', effect: '', level: 15, stars: 3, bonuses: { damage: 0.2 } }

describe('完整内容扩展成长状态', () => {
  it('钳制旧存档中的资源、技能、商店和赛季数据', () => {
    expect(normalizeAdvancedResources({ honor: -1, precision: 3.8 })).toEqual({ honor: 0, precision: 3, energyCores: 0, reforgeChips: 0 })
    expect(normalizeSkillProgress({ dash: 99, pulse: 0 })).toEqual({ dash: 5, overload: 1, pulse: 1 })
    expect(normalizeShopState()).toEqual({ stock: { 'precision-kit': 3, 'reforge-cache': 2, 'attachment-crate': 1 } })
    expect(normalizeShopState({ stock: { 'precision-kit': 99, 'reforge-cache': -2, 'attachment-crate': 1 } })).toEqual({ stock: { 'precision-kit': 3, 'reforge-cache': 0, 'attachment-crate': 1 } })
    expect(normalizeSeasonState({ score: 601 }).score).toBe(601)
    expect(seasonTier(601)).toBe('精英')
  })

  it('限制升星与突破条件', () => {
    expect(attachmentCanStar({ ...legendary, stars: 2 })).toBe(true)
    expect(attachmentStarCost({ ...legendary, stars: 2 })).toEqual({ gold: 1300, precision: 7 })
    expect(attachmentCanBreakthrough(legendary, 15)).toBe(true)
    expect(attachmentCanBreakthrough({ ...legendary, level: 14 }, 15)).toBe(false)
  })

  it('战区突袭仅在首次完成发放赛季积分与能量核心', () => {
    expect(eventClearRewards(0)).toEqual({ firstClear: true, precision: 2, energyCores: 1, seasonScore: 100 })
    expect(eventClearRewards(1)).toEqual({ firstClear: false, precision: 2, energyCores: 0, seasonScore: 0 })
  })
})
