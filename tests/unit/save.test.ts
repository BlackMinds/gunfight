import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, emptyLegacyBase, migrateAttachmentIdentity } from '../../shared/game/save'

describe('存档迁移', () => {
  it('完整长线系统使用版本 7 存档', () => {
    expect(CURRENT_SAVE_VERSION).toBe(7)
  })

  it('清除已删除基地强化产生的隐藏战力', () => {
    expect(emptyLegacyBase()).toEqual({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })
  })

  it('把旧生命配件名称迁移为真实机制名称', () => {
    expect(migrateAttachmentIdentity({ name: '吸血模块 #012', templateKey: '吸血模块', slot: '模块', rarity: '稀有', effect: '最大生命 +18' })).toMatchObject({
      name: '生命模块 #012',
      templateKey: '生命模块'
    })
  })
})
