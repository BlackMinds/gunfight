import { describe, expect, it } from 'vitest'
import { createOperationWavePlan, getOperationDefinition, operationAdvancesCampaign, operationUnlocked, operationVictoryVerdict } from '../../shared/game/operations'

describe('独立挑战与生存行动', () => {
  it('完成第 500 关后开放独立行动', () => {
    expect(operationUnlocked('campaign', 0)).toBe(true)
    expect(operationUnlocked('challenge', 499)).toBe(false)
    expect(operationUnlocked('survival', 499)).toBe(false)
    expect(operationUnlocked('challenge', 500)).toBe(true)
    expect(operationUnlocked('survival', 500)).toBe(true)
    expect(operationAdvancesCampaign('campaign')).toBe(true)
    expect(operationAdvancesCampaign('challenge')).toBe(false)
    expect(operationAdvancesCampaign('survival')).toBe(false)
  })

  it('猎首挑战固定为三波且终波必定出现首领', () => {
    const waves = createOperationWavePlan(3000, 'challenge')
    expect(waves).toHaveLength(3)
    expect(waves.map((wave) => wave.index)).toEqual([1, 2, 3])
    expect(waves[0].eliteCount).toBeGreaterThanOrEqual(2)
    expect(waves[2]).toMatchObject({ label: '猎首决战', boss: true, eliteCount: 0 })
  })

  it('90 秒生存提供十个连续压力梯级且不生成首领', () => {
    const waves = createOperationWavePlan(5000, 'survival')
    expect(getOperationDefinition('survival').durationSeconds).toBe(90)
    expect(waves).toHaveLength(10)
    expect(waves.every((wave) => !wave.boss)).toBe(true)
    expect(waves[9].kinds).toEqual(['sniper', 'medic', 'warden', 'heavy'])
    expect(waves[9].count).toBeGreaterThan(waves[0].count)
  })

  it('独立行动使用自身目标判定而不复用主线时长结论', () => {
    expect(operationVictoryVerdict('campaign', '达标 · 目标区间 45～90 秒')).toBe('达标 · 目标区间 45～90 秒')
    expect(operationVictoryVerdict('challenge', '偏快 · 比目标少 15 秒')).toBe('达成 · 终波首领已击破')
    expect(operationVictoryVerdict('survival', '偏慢 · 超出目标 1 秒')).toBe('达成 · 已存活 90 秒')
  })
})
