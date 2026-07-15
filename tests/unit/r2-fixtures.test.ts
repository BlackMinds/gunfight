import { describe, expect, it } from 'vitest'
import { attachmentSlots, type AttachmentBonusKey } from '../../shared/game/weapons'
import { R2_BALANCE_SAVE_FIXTURES, R2_BALANCE_STAGES, R2_FIXED_LOADOUT, createR2InventorySave } from '../fixtures/r2'

describe('R2 固定构筑夹具', () => {
  it('完整覆盖八个槽位并固定关键战斗属性', () => {
    expect(new Set(R2_FIXED_LOADOUT.map((item) => item.slot))).toEqual(new Set(attachmentSlots))

    const bonuses = R2_FIXED_LOADOUT.reduce(
      (total, item) => {
        for (const [key, value] of Object.entries(item.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>) total[key] += value
        return total
      },
      { damage: 0, fireRate: 0, maxHp: 0, pickup: 0, speed: 0, pierce: 0, expGain: 0, critRate: 0 }
    )

    expect(Math.round(18 * (1 + bonuses.damage))).toBe(20)
    expect((4.8 * (1 + bonuses.fireRate)).toFixed(1)).toBe('5.4')
    expect(bonuses).toMatchObject({ maxHp: 18, speed: 0.06, pierce: 1, critRate: 0.04 })
  })

  it('第 20、40、60、100 关只改变目标关卡，不改变构筑与资源基线', () => {
    expect(Object.keys(R2_BALANCE_SAVE_FIXTURES).map(Number)).toEqual([...R2_BALANCE_STAGES])
    const baseline = R2_BALANCE_SAVE_FIXTURES[20]
    for (const stage of R2_BALANCE_STAGES) {
      const fixture = R2_BALANCE_SAVE_FIXTURES[stage]
      expect(fixture.stage).toBe(stage)
      expect(fixture.player).toEqual(baseline.player)
      expect(fixture.resources).toEqual(baseline.resources)
      expect(fixture.equipped).toEqual(baseline.equipped)
    }
  })

  it('可稳定生成 25～30 件配件与指定收藏集合', () => {
    const fixture = createR2InventorySave({ count: 30, favoriteIndexes: [24, 25, 26, 27, 28, 29] })
    expect(fixture.inventory).toHaveLength(30)
    expect(new Set(fixture.inventory.map((item) => item.id)).size).toBe(30)
    expect(fixture.inventory.filter((item) => item.favorite).map((item) => item.id)).toEqual([
      'r2-item-24', 'r2-item-25', 'r2-item-26', 'r2-item-27', 'r2-item-28', 'r2-item-29'
    ])
  })
})
