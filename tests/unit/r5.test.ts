import { describe, expect, it } from 'vitest'
import { PUBLISHED_STAGE_CAP, rewardForStage, scaleEnemyStats } from '../../shared/game/formulas'
import {
  R5_IMPLEMENTED_STAGE_CAP,
  availableR5EliteAffixes,
  bossPhasesForStage,
  getR5StageBand,
  r5BossHpMultiplierForStage,
  r5CampaignGrowthForHighestCleared,
  r5EnemyMechanicsForStage,
  r5EnemyMultipliersForStage,
  r5GrowthAnchors,
  r5ShieldLinkPairEligible,
  r5WavePressureForStage,
  resolveR5EliteAffixes
} from '../../shared/game/r5'
import { createR5ReplayPlan, R5_REPLAY_STAGES } from '../../shared/game/replay'
import { createWavePlan, levelTuning, resolvedBossPhases } from '../../shared/game/waves'

describe('R5 第 501～10000 关配置', () => {
  it('正式上限覆盖终局并让第 500/501 关曲线连续', () => {
    expect(PUBLISHED_STAGE_CAP).toBe(10000)
    expect(getR5StageBand(500)).toBeNull()
    expect(getR5StageBand(501)?.label).toBe('军工封锁')
    expect(r5EnemyMultipliersForStage(500)).toEqual({ hp: 1, damage: 1, speed: 1 })
    expect(r5EnemyMultipliersForStage(501)).toEqual({ hp: 1, damage: 1, speed: 1 })
    expect(r5EnemyMultipliersForStage(R5_IMPLEMENTED_STAGE_CAP).hp).toBeCloseTo(10)
    expect(r5EnemyMultipliersForStage(15000)).toEqual(r5EnemyMultipliersForStage(10000))
  })

  it('八个战区首尾无断崖且压力逐段上升', () => {
    const boundaries = [1000, 1500, 2000, 3000, 5000, 7500, 9000]
    for (const boundary of boundaries) {
      const before = r5EnemyMultipliersForStage(boundary)
      const after = r5EnemyMultipliersForStage(boundary + 1)
      expect(after.hp).toBeCloseTo(before.hp)
      expect(after.damage).toBeCloseTo(before.damage)
      expect(after.speed).toBeCloseTo(before.speed)
    }
    expect(r5WavePressureForStage(501)).toEqual({ extraEnemies: 2, spawnIntervalMultiplier: 0.9 })
    expect(r5WavePressureForStage(10000)).toEqual({ extraEnemies: 6, spawnIntervalMultiplier: 0.73 })
  })

  it('机制、词缀数与 Boss 阶段按战区累积', () => {
    expect(r5EnemyMechanicsForStage(500)).toEqual({ suppressiveMark: false, shieldLink: false, trackingDeathZone: false, commandPulse: false })
    expect(r5EnemyMechanicsForStage(501)).toMatchObject({ suppressiveMark: true, shieldLink: false })
    expect(r5EnemyMechanicsForStage(2001).trackingDeathZone).toBe(true)
    expect(r5EnemyMechanicsForStage(5001).commandPulse).toBe(true)
    expect(availableR5EliteAffixes(501)).toContain('suppression')
    expect(availableR5EliteAffixes(1001)).toContain('linked-armor')
    const dual = resolveR5EliteAffixes(1000, 5, 2, 'heavy')
    const triple = resolveR5EliteAffixes(3000, 5, 2, 'heavy')
    const quadruple = resolveR5EliteAffixes(10000, 5, 2, 'heavy')
    expect(dual).toHaveLength(2)
    expect(triple).toHaveLength(3)
    expect(quadruple).toHaveLength(4)
    expect(new Set(quadruple).size).toBe(4)
    expect(resolveR5EliteAffixes(10000, 5, 2, 'heavy')).toEqual(quadruple)
    expect(bossPhasesForStage(1000, levelTuning.boss.phases)).toHaveLength(3)
    expect(resolvedBossPhases(2000)).toHaveLength(4)
    expect(resolvedBossPhases(10000)).toHaveLength(5)
    expect(r5BossHpMultiplierForStage(5000)).toBe(1)
    expect(r5BossHpMultiplierForStage(5001)).toBe(8)
    expect(r5BossHpMultiplierForStage(10000)).toBe(8)
  })

  it('护盾联结只在解锁后连接重装兵或同类链甲单位', () => {
    expect(r5ShieldLinkPairEligible(1000, 'heavy', [], 'heavy', [])).toBe(false)
    expect(r5ShieldLinkPairEligible(1001, 'heavy', [], 'heavy', [])).toBe(true)
    expect(r5ShieldLinkPairEligible(3000, 'grunt', ['linked-armor'], 'grunt', ['linked-armor'])).toBe(true)
    expect(r5ShieldLinkPairEligible(3000, 'grunt', ['linked-armor'], 'ranged', ['linked-armor'])).toBe(false)
  })

  it('高关混编、成长与奖励同时推进', () => {
    expect(createWavePlan(500)[0].count).toBe(createWavePlan(501)[0].count)
    expect(createWavePlan(10000)[0].count).toBeGreaterThan(createWavePlan(501)[0].count)
    expect(createWavePlan(3000)[3].kinds).toContain('bomber')
    expect(r5CampaignGrowthForHighestCleared(499)).toEqual({ damageMultiplier: 1, maxHpBonus: 0 })
    expect(r5CampaignGrowthForHighestCleared(999).damageMultiplier).toBeCloseTo(1.3)
    expect(r5CampaignGrowthForHighestCleared(9999).damageMultiplier).toBeCloseTo(7.2)
    expect(r5GrowthAnchors.map((anchor) => anchor.expectedDps)).toEqual([900, 1400, 1900, 2500, 3500, 5200, 7200, 9500])
    expect(rewardForStage(10000, 80)).toMatchObject({ gold: 900, alloy: 12, parts: 18 })
    expect(scaleEnemyStats(10000, 'grunt').hp).toBeGreaterThan(scaleEnemyStats(500, 'grunt').hp * 9.9)
  })

  it('创建 8 节点 × 3 局且种子唯一的回放计划', () => {
    const plan = createR5ReplayPlan()
    expect(plan).toHaveLength(24)
    expect([...new Set(plan.map((entry) => entry.stage))]).toEqual([...R5_REPLAY_STAGES])
    expect(new Set(plan.map((entry) => entry.seed)).size).toBe(24)
    for (const stage of R5_REPLAY_STAGES) expect(plan.filter((entry) => entry.stage === stage)).toHaveLength(3)
  })
})
