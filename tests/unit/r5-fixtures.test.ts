import { describe, expect, it } from 'vitest'
import { PUBLISHED_STAGE_CAP } from '../../shared/game/formulas'
import { R5_BALANCE_STAGES, R5_BUILD_PROFILES, createR5BalanceSave, getR5BuildProfile } from '../fixtures/r5'

describe('R5 八节点固定构筑夹具', () => {
  it('覆盖全部自动验收节点且正式上限已通过发布验收', () => {
    expect(PUBLISHED_STAGE_CAP).toBe(10000)
    expect(R5_BUILD_PROFILES.map((profile) => profile.stage)).toEqual([...R5_BALANCE_STAGES])
    expect(R5_BUILD_PROFILES.map((profile) => profile.expectedDps)).toEqual([900, 1400, 1900, 2500, 3500, 5200, 7200, 9500])
  })

  it('每个节点都注入独立八槽、武器与长期等级预算', () => {
    for (const stage of R5_BALANCE_STAGES) {
      const save = createR5BalanceSave(stage)
      const profile = getR5BuildProfile(stage)
      expect(save.stage).toBe(stage)
      expect(save.highestCleared).toBe(stage - 1)
      expect(save.player.level).toBe(profile.playerLevel)
      expect(save.equipped).toHaveLength(8)
      expect(new Set(save.equipped.map((item) => item.slot)).size).toBe(8)
      expect(save.weaponProgress?.[profile.weaponKey]).toEqual({ level: profile.weaponLevel, stars: profile.weaponStars, breakthrough: false, affixes: [] })
    }
  })
})
