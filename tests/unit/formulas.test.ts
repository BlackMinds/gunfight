import { describe, expect, it } from 'vitest'
import { ENEMY_STAT_GROWTH_CAP, STAGE_REWARD_CAPS, getDifficultyMultipliers, rewardForStage, scaleEnemyStats } from '../../shared/game/formulas'

describe('game formulas', () => {
  it('scales difficulty as stages rise', () => {
    expect(getDifficultyMultipliers(100).hpMultiplier).toBeGreaterThan(getDifficultyMultipliers(1).hpMultiplier)
    expect(scaleEnemyStats(500, 'heavy').hp).toBeGreaterThan(scaleEnemyStats(1, 'grunt').hp)
  })

  it('caps enemy stat growth at the validated stage while long-term player damage growth is absent', () => {
    expect(ENEMY_STAT_GROWTH_CAP).toBe(20)
    expect(scaleEnemyStats(100, 'heavy')).toEqual(scaleEnemyStats(20, 'heavy'))
  })

  it('calculates larger rewards for later stages', () => {
    expect(rewardForStage(100, 30).gold).toBeGreaterThan(rewardForStage(1, 30).gold)
  })

  it('caps settlement gold and alloy before they outgrow rare reforge costs', () => {
    expect(rewardForStage(100, 47)).toMatchObject(STAGE_REWARD_CAPS)
    expect(rewardForStage(20, 32).gold).toBe(STAGE_REWARD_CAPS.gold)
  })
})
