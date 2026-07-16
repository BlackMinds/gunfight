import { describe, expect, it } from 'vitest'
import {
  applyElementStatus,
  calculateOfflineReward,
  combinedSetBonuses,
  createDailyTasks,
  emptyEnemyStatus,
  normalizeTalentLevels,
  recordTaskEvent,
  talentBonuses,
  talentPointBudget,
  tickEnemyStatus
} from '../../shared/game/long-term'
import type { Attachment } from '../../shared/game/weapons'

describe('长线系统领域规则', () => {
  it('按角色等级和通关节点追溯天赋点', () => {
    expect(talentPointBudget(8, 25)).toBe(5)
    expect(talentBonuses(normalizeTalentLevels({ firepower: 2, logistics: 3 }))).toMatchObject({ damage: 0.08, goldGain: 0.18, offlineGain: 0.18 })
  })

  it('套装只在达到 2 件或 4 件阈值时生效', () => {
    const equipped = [
      { name: 'A', slot: '枪口', rarity: '史诗', effect: '', setKey: '赤焰清道夫' },
      { name: 'B', slot: '弹芯', rarity: '史诗', effect: '', setKey: '赤焰清道夫' }
    ] satisfies Attachment[]
    expect(combinedSetBonuses(equipped).statusPower).toBe(0.15)
    expect(combinedSetBonuses(equipped).damage).toBe(0)
  })

  it('火焰状态造成持续伤害并正常衰减', () => {
    const status = emptyEnemyStatus()
    expect(applyElementStatus(status, '火焰', 1, 100, 1, () => 0)).toBe('灼烧')
    expect(tickEnemyStatus(status, 1)).toMatchObject({ burnDamage: 22, speedMultiplier: 1 })
    expect(status.burnSeconds).toBe(2)
  })

  it('冰缓降低速度、感电提高承伤', () => {
    const status = emptyEnemyStatus()
    applyElementStatus(status, '冰霜', 1, 10, 1, () => 0)
    applyElementStatus(status, '电击', 1, 10, 1, () => 0)
    expect(tickEnemyStatus(status, 0.1)).toMatchObject({ speedMultiplier: 0.68, damageTakenMultiplier: 1.12 })
  })

  it('离线收益最多累计八小时并受关卡和后勤倍率影响', () => {
    const reward = calculateOfflineReward(0, 12 * 3600 * 1000, 20, 1.2)
    expect(reward.cappedSeconds).toBe(8 * 3600)
    expect(reward.gold).toBeGreaterThan(38 * 8)
    expect(reward.parts).toBe(14)
  })

  it('每日任务进度不会超过目标', () => {
    const tasks = createDailyTasks()
    recordTaskEvent(tasks, 'kill', 99)
    expect(tasks[0].progress).toBe(50)
  })
})
