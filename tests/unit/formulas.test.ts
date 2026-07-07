import { describe, expect, it } from 'vitest'
import { getDifficultyMultipliers, rewardForStage, scaleEnemyStats } from '../../shared/game/formulas'

describe('game formulas', () => {
  it('scales difficulty as stages rise', () => {
    expect(getDifficultyMultipliers(100).hpMultiplier).toBeGreaterThan(getDifficultyMultipliers(1).hpMultiplier)
    expect(scaleEnemyStats(500, 'heavy').hp).toBeGreaterThan(scaleEnemyStats(1, 'grunt').hp)
  })

  it('calculates larger rewards for later stages', () => {
    expect(rewardForStage(100, 30).gold).toBeGreaterThan(rewardForStage(1, 30).gold)
  })
})
