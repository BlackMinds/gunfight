import { describe, expect, it } from 'vitest'
import { BASE_INVENTORY_CAPACITY, canAffordAttachmentReforge, getAttachmentReforgeCost, resolveAttachmentOverflow } from '../../shared/game/inventory'
import type { Attachment } from '../../shared/game/weapons'

function attachment(index: number, rarity: Attachment['rarity'] = '普通'): Attachment {
  return { id: `item-${index}`, name: `配件 ${index}`, slot: '模块', rarity, effect: '测试' }
}

describe('背包溢出', () => {
  it('保持实例守恒并优先回收低品质配件', () => {
    const items = Array.from({ length: BASE_INVENTORY_CAPACITY }, (_, index) => attachment(index))
    const protectedDrop = attachment(100, '史诗')
    const result = resolveAttachmentOverflow([protectedDrop, ...items], new Set([protectedDrop.id!]))
    expect(result.inventory).toHaveLength(BASE_INVENTORY_CAPACITY)
    expect(result.overflow).toHaveLength(1)
    expect(result.inventory).toContain(protectedDrop)
    expect(new Set([...result.inventory, ...result.overflow].map((item) => item.id)).size).toBe(items.length + 1)
  })

  it('连续注入超过 24 件时保留每个实例且不回收受保护配件', () => {
    const items = Array.from({ length: 30 }, (_, index) => attachment(index, index >= 24 ? '史诗' : '普通'))
    const protectedIds = new Set(items.slice(24).map((item) => item.id!))
    const result = resolveAttachmentOverflow(items, protectedIds)

    expect(result.inventory).toHaveLength(BASE_INVENTORY_CAPACITY)
    expect(result.overflow).toHaveLength(6)
    expect(result.unresolvedCount).toBe(0)
    expect(result.overflow.every((item) => !protectedIds.has(item.id!))).toBe(true)
    expect(result.inventory.filter((item) => protectedIds.has(item.id!))).toHaveLength(6)
    expect([...result.inventory, ...result.overflow].map((item) => item.id).sort()).toEqual(items.map((item) => item.id).sort())
  })

  it('受保护实例超过容量时保持保护并明确报告未解决超容', () => {
    const items = Array.from({ length: 27 }, (_, index) => attachment(index, '史诗'))
    const result = resolveAttachmentOverflow(items, new Set(items.map((item) => item.id!)))

    expect(result.inventory).toHaveLength(27)
    expect(result.overflow).toHaveLength(0)
    expect(result.unresolvedCount).toBe(3)
    expect(result.inventory.map((item) => item.id)).toEqual(items.map((item) => item.id))
  })
})

describe('配件重铸成本', () => {
  it('同时计算零件、金币和锁词条合金成本', () => {
    const item: Attachment = { ...attachment(1, '稀有'), subAffixes: [{ key: 'damage', label: '伤害', value: 0.03, tier: '副词条' }, { key: 'speed', label: '移速', value: 0.03, tier: '副词条' }, { key: 'critRate', label: '暴击率', value: 0.03, tier: '副词条' }] }
    expect(getAttachmentReforgeCost(item)).toEqual({ parts: 7, gold: 110, alloy: 0 })
    expect(getAttachmentReforgeCost(item, true)).toEqual({ parts: 7, gold: 110, alloy: 2 })
    expect(canAffordAttachmentReforge({ parts: 7, gold: 110, alloy: 2 }, getAttachmentReforgeCost(item, true))).toBe(true)
    expect(canAffordAttachmentReforge({ parts: 7, gold: 109, alloy: 2 }, getAttachmentReforgeCost(item, true))).toBe(false)
  })
})
