import { describe, expect, it } from 'vitest'
import { BOUNTY_TARGET_KILLS, bountyObjectiveCompleted, bountyObjectiveForStage, createOperationWavePlan, eventWaveSourceStages, getOperationDefinition, operationAdvancesCampaign, operationUnlockText, operationUnlocked, operationVictoryVerdict } from '../../shared/game/operations'

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
    expect(operationUnlocked('bounty', 500)).toBe(true)
    expect(operationUnlocked('event', 999)).toBe(false)
    expect(operationUnlocked('event', 1000)).toBe(true)
    expect(operationUnlockText('bounty')).toBe('完成第 500 关后开放')
    expect(operationUnlockText('event')).toBe('完成第 1000 关后开放')
  })

  it('生成悬赏追猎和战区突袭波次', () => {
    const bounty = createOperationWavePlan(5000, 'bounty')
    const event = createOperationWavePlan(10000, 'event')
    expect(bounty).toHaveLength(3)
    expect(bounty.every((wave) => wave.label.includes('悬赏') || wave.label.includes('追踪'))).toBe(true)
    expect(event).toHaveLength(5)
    expect(event[4].boss).toBe(true)
    expect(new Set(event.map((wave) => wave.label.split(' · ')[0])).size).toBe(5)
    expect(eventWaveSourceStages(10000)).toEqual([501, 2876, 5251, 7625, 10000])
  })

  it('悬赏使用稳定目标与独立完成阈值', () => {
    const objective = bountyObjectiveForStage(5000)
    const repeated = bountyObjectiveForStage(5000)
    expect(objective).toEqual(repeated)
    expect(objective.requiredKills).toBe(BOUNTY_TARGET_KILLS)
    expect(createOperationWavePlan(5000, 'bounty').every((wave) => wave.kinds.includes(objective.target))).toBe(true)
    expect(bountyObjectiveCompleted(BOUNTY_TARGET_KILLS - 1)).toBe(false)
    expect(bountyObjectiveCompleted(BOUNTY_TARGET_KILLS)).toBe(true)
    expect(bountyObjectiveForStage(500).target).toBe('sniper')
    expect(['sniper', 'shield']).toContain(bountyObjectiveForStage(1001).target)
    expect(['splitter', 'stealth']).not.toContain(bountyObjectiveForStage(1001).target)
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
    expect(operationVictoryVerdict('bounty', '偏慢')).toBe('达成 · 悬赏目标已肃清')
    expect(operationVictoryVerdict('event', '偏慢')).toBe('达成 · 战区突袭完成')
  })
})
