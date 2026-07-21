import { describe, expect, it } from 'vitest'
import { ENEMY_STAT_GROWTH_CAP, PUBLISHED_STAGE_CAP, STAGE_REWARD_CAPS, getDifficultyMultipliers, rewardForStage, scaleEnemyStats } from '../../shared/game/formulas'

describe('game formulas', () => {
  it('正式发布关卡上限与当前验收范围一致', () => {
    expect(PUBLISHED_STAGE_CAP).toBe(100)
  })

  it('scales difficulty as stages rise', () => {
    expect(getDifficultyMultipliers(100).hpMultiplier).toBeGreaterThan(getDifficultyMultipliers(1).hpMultiplier)
    expect(scaleEnemyStats(500, 'heavy').hp).toBeGreaterThan(scaleEnemyStats(1, 'grunt').hp)
  })

  it('caps enemy stat growth at the validated stage while long-term player damage growth is absent', () => {
    expect(ENEMY_STAT_GROWTH_CAP).toBe(20)
    expect(scaleEnemyStats(100, 'heavy')).toEqual(scaleEnemyStats(20, 'heavy'))
  })

  it('以第 100 关为锚点应用 R4 分段倍率并在第 500 关后钳制', () => {
    expect(scaleEnemyStats(101, 'heavy')).toEqual(scaleEnemyStats(100, 'heavy'))
    expect(scaleEnemyStats(500, 'heavy').hp).toBeCloseTo(scaleEnemyStats(100, 'heavy').hp * 2)
    expect(scaleEnemyStats(500, 'heavy').damage).toBeCloseTo(scaleEnemyStats(100, 'heavy').damage * 1.38)
    expect(scaleEnemyStats(9999, 'heavy')).toEqual(scaleEnemyStats(500, 'heavy'))
  })

  it('calculates larger rewards for later stages', () => {
    expect(rewardForStage(100, 30).gold).toBeGreaterThan(rewardForStage(1, 30).gold)
  })

  it('caps settlement gold and alloy before they outgrow rare reforge costs', () => {
    expect(rewardForStage(100, 47)).toMatchObject(STAGE_REWARD_CAPS)
    expect(rewardForStage(20, 32).gold).toBe(STAGE_REWARD_CAPS.gold)
  })

  it('资源节点提供真实零件加成', () => {
    expect(rewardForStage(25, 32).parts).toBe(6)
    expect(rewardForStage(20, 32).parts).toBe(3)
  })
})
