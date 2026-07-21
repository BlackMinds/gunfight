import { describe, expect, it } from 'vitest'
import { PUBLISHED_STAGE_CAP } from '../../shared/game/formulas'
import { R4_BALANCE_STAGES, R4_BUILD_PROFILES, createR4BalanceSave, getR4BuildProfile } from '../fixtures/r4'

describe('R4 分段固定构筑夹具', () => {
  it('四段使用独立战力预算且正式上限已覆盖 R5 终点', () => {
    expect(PUBLISHED_STAGE_CAP).toBe(10000)
    expect(R4_BUILD_PROFILES.map((profile) => profile.expectedDps)).toEqual([430, 560, 720, 900])
    expect(new Set(R4_BUILD_PROFILES.map((profile) => `${profile.weaponLevel}-${profile.weaponStars}`)).size).toBe(4)
  })

  it('九个回放节点都能映射到完整的八槽固定构筑', () => {
    for (const stage of R4_BALANCE_STAGES) {
      const save = createR4BalanceSave(stage)
      expect(save.stage).toBe(stage)
      expect(save.equipped).toHaveLength(8)
      expect(new Set(save.equipped.map((item) => item.slot)).size).toBe(8)
      expect(save.selectedWeaponKey).toBe(getR4BuildProfile(stage).weaponKey)
    }
  })

  it('第 100 关使用 R4 首段锚点构筑而不是 R3 构筑', () => {
    const save = createR4BalanceSave(100)
    expect(getR4BuildProfile(100).id).toBe('firebreak')
    expect(save.player.level).toBe(70)
    expect(save.selectedWeaponKey).toBe('laser-rifle')
  })
})
