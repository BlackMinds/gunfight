import { describe, expect, it } from 'vitest'
import { applyWeaponProgress, attachmentPool, emptyWeaponProgress, equipmentSetKeys, weaponCatalog, weaponElements, weaponHitCanChain, weaponRequiresCharge } from '../../shared/game/weapons'

describe('完整武器与装备目录', () => {
  it('包含策划定义的十二类武器和七种伤害类型', () => {
    expect(weaponCatalog).toHaveLength(12)
    expect(new Set(weaponCatalog.map((weapon) => weapon.category)).size).toBe(12)
    expect(new Set(weaponCatalog.map((weapon) => weapon.element))).toEqual(new Set(weaponElements))
  })

  it('每种武器都有弹匣、换弹、固定特性、槽位和成长上限', () => {
    for (const weapon of weaponCatalog) {
      expect(weapon.magazineSize).toBeGreaterThan(0)
      expect(weapon.reloadTime).toBeGreaterThan(0)
      expect(weapon.fixedTrait.length).toBeGreaterThan(4)
      expect(weapon.slotCount).toBeGreaterThanOrEqual(4)
      expect(weapon.maxLevel).toBe(120)
      expect(weapon.maxStars).toBe(5)
    }
  })

  it('武器升级和升星会实际提高基础伤害', () => {
    const progress = emptyWeaponProgress()[weaponCatalog[0].key]
    const base = applyWeaponProgress(weaponCatalog[0], progress)
    const upgraded = applyWeaponProgress(weaponCatalog[0], { level: 20, stars: 3 })
    expect(upgraded.damage).toBeGreaterThan(base.damage)
  })

  it('固定武器特性具备可执行的战斗判定', () => {
    const assault = weaponCatalog.find((weapon) => weapon.key === 'assault-rifle')!
    const storm = weaponCatalog.find((weapon) => weapon.key === 'storm-smg')!
    const pistol = weaponCatalog.find((weapon) => weapon.key === 'pistol')!
    const plasma = weaponCatalog.find((weapon) => weapon.key === 'plasma-cannon')!

    expect(assault.fixedTrait).toContain('1 次穿透')
    expect(weaponHitCanChain(storm, 0)).toBe(false)
    expect(weaponHitCanChain(storm, 0.5)).toBe(true)
    expect(weaponRequiresCharge(plasma)).toBe(true)
    expect(weaponRequiresCharge(pistol)).toBe(false)
  })

  it('六套装备都至少提供四个不同槽位的可掉落部件', () => {
    for (const setKey of equipmentSetKeys) expect(new Set(attachmentPool.filter((item) => item.setKey === setKey).map((item) => item.slot)).size).toBeGreaterThanOrEqual(4)
  })

  it('每件传说或神话专属装备都有唯一机制键和玩家可见说明', () => {
    const specialItems = attachmentPool.filter((item) => item.specialEffect)
    expect(specialItems).toHaveLength(13)
    expect(specialItems.every((item) => Boolean(item.specialEffectKey))).toBe(true)
    expect(new Set(specialItems.map((item) => item.specialEffectKey)).size).toBe(13)
  })
})
