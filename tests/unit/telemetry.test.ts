import { describe, expect, it } from 'vitest'
import { buildStrategyInsights, dpsGapPercent, durationVerdict } from '../../shared/game/telemetry'

describe('战斗调参遥测', () => {
  it('标记 45–90 秒目标与峰均 DPS 差', () => {
    expect(durationVerdict(60)).toContain('达标')
    expect(durationVerdict(30)).toContain('偏快')
    expect(durationVerdict(100)).toContain('偏慢')
    expect(dpsGapPercent(150, 100)).toBe(50)
  })

  it('指出没有产生实际收益的配件策略', () => {
    const insights = buildStrategyInsights(
      { heavyPierceDamage: 0, criticalTriggers: 0, criticalExtraDamage: 0, dodgedCharges: 0, totalChargeAttempts: 3 },
      { pierce: 1, critRate: 0.1, speed: 0.08 }
    )
    expect(insights).toHaveLength(3)
    expect(insights.every((insight) => !insight.effective)).toBe(true)
    expect(insights[0].fit).toContain('重装兵')
  })
})
