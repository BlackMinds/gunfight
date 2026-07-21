import { describe, expect, it } from 'vitest'
import { adjacentDurationBreaches, buildStrategyInsights, dpsGapPercent, durationVerdict, emptyR4CombatTelemetry, recordAffixCombination } from '../../shared/game/telemetry'

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

  it('按无序组合归并 R4 精英词缀计数', () => {
    const telemetry = emptyR4CombatTelemetry()
    recordAffixCombination(telemetry, ['爆裂', '再生'])
    recordAffixCombination(telemetry, ['再生', '爆裂'])
    expect(telemetry.affixCombinations).toEqual({ '爆裂 + 再生': 2 })
  })

  it('只有两个相邻节点同方向越界才给出全局曲线调参证据', () => {
    expect(adjacentDurationBreaches([
      { stage: 100, medianDuration: 62 },
      { stage: 150, medianDuration: 92 },
      { stage: 200, medianDuration: 88 }
    ])).toEqual([])
    expect(adjacentDurationBreaches([
      { stage: 250, medianDuration: 91 },
      { stage: 300, medianDuration: 94 }
    ])).toEqual([{ fromStage: 250, toStage: 300, direction: '偏慢' }])
  })
})
