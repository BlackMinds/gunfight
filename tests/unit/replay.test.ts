import { describe, expect, it } from 'vitest'
import { R4_REPLAY_STAGES, clockwisePatrolVector, createR3ReplayPlan, createR4ReplayPlan, createSeededRandom, supportedRareReforges } from '../../shared/game/replay'

describe('R3 确定性战斗回放', () => {
  it('生成第 20、40、60、100 关各三局的固定计划', () => {
    const plan = createR3ReplayPlan()
    expect(plan).toHaveLength(12)
    expect(plan.map(({ stage, run }) => `${stage}-${run}`)).toEqual([
      '20-1', '20-2', '20-3', '40-1', '40-2', '40-3',
      '60-1', '60-2', '60-3', '100-1', '100-2', '100-3'
    ])
  })

  it('同种子输出相同随机序列，不同种子输出不同序列', () => {
    const first = createSeededRandom(20260715)
    const second = createSeededRandom(20260715)
    const other = createSeededRandom(20260716)
    const firstValues = Array.from({ length: 8 }, first)
    expect(Array.from({ length: 8 }, second)).toEqual(firstValues)
    expect(Array.from({ length: 8 }, other)).not.toEqual(firstValues)
  })

  it('按顺时针航点持续给出单位移动向量', () => {
    const area = { x: 100, y: 80, width: 600, height: 400 }
    const first = clockwisePatrolVector({ x: 400, y: 280 }, area, 0)
    expect(Math.hypot(first.vector.x, first.vector.y)).toBeCloseTo(1)
    const atFirstTarget = clockwisePatrolVector(first.target, area, first.waypointIndex)
    expect(atFirstTarget.waypointIndex).toBe(1)
    expect(atFirstTarget.vector.x).toBeGreaterThan(0)
  })

  it('按稀有配件 110 金币和 2 合金口径计算可支持重铸次数', () => {
    expect(supportedRareReforges(165, 3)).toEqual({ unlocked: 1.5, locked: 1.5 })
  })

  it('生成 R4 九节点各三局、共 27 个固定样本', () => {
    const plan = createR4ReplayPlan()
    expect(plan).toHaveLength(27)
    expect([...new Set(plan.map((entry) => entry.stage))]).toEqual(R4_REPLAY_STAGES)
    for (const stage of R4_REPLAY_STAGES) expect(plan.filter((entry) => entry.stage === stage)).toHaveLength(3)
  })
})
