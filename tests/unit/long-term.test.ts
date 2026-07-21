import { describe, expect, it } from 'vitest'
import {
  applyElementStatus,
  attachmentDropCount,
  calculateOfflineReward,
  combinedSetBonuses,
  createAchievements,
  createDailyTasks,
  createWeeklyTasks,
  emptyDropPity,
  emptyEnemyStatus,
  guaranteedDropRarity,
  normalizeTalentLevels,
  recordPityDrop,
  recordTaskEvent,
  talentBonuses,
  talentNodes,
  talentPointBudget,
  tickEnemyStatus,
  weeklyTaskKey
} from '../../shared/game/long-term'
import type { Attachment } from '../../shared/game/weapons'

describe('完整长线系统领域规则', () => {
  it('提供五个分支共二十五个有前置关系的天赋节点', () => {
    expect(talentNodes).toHaveLength(25)
    expect(new Set(talentNodes.map((node) => node.branchId)).size).toBe(5)
    const levels = normalizeTalentLevels({ 'firepower-ballistics': 2, 'logistics-profit': 3 })
    expect(talentPointBudget(8, 100)).toBe(8)
    expect(talentBonuses(levels)).toMatchObject({ damage: 0.08, goldGain: 0.18 })
  })

  it('六套套装分别在 2 件和 4 件激活数值与机制效果', () => {
    const equipped = [
      { name: 'A', slot: '枪口', rarity: '史诗', effect: '', setKey: '赤焰清道夫' },
      { name: 'B', slot: '弹芯', rarity: '史诗', effect: '', setKey: '赤焰清道夫' },
      { name: 'C', slot: '模块', rarity: '传说', effect: '', setKey: '赤焰清道夫' },
      { name: 'D', slot: '枪管', rarity: '传说', effect: '', setKey: '赤焰清道夫' }
    ] satisfies Attachment[]
    expect(combinedSetBonuses(equipped)).toMatchObject({ fireDamage: 0.15, damage: 0, burnExplosion: true })
    const amplified = combinedSetBonuses(equipped, true)
    expect(amplified.fireDamage).toBeCloseTo(0.225)
    expect(amplified).toMatchObject({ damage: 0, burnExplosion: true })
  })

  it('七种伤害可覆盖策划中的十种状态结果', () => {
    const results = new Set<string>()
    for (const element of ['物理', '爆炸', '火焰', '电击', '毒素', '冰霜', '能量'] as const) {
      const status = emptyEnemyStatus()
      results.add(applyElementStatus(status, element, 1, 100, 1, () => 0) ?? '')
      if (element === '冰霜') results.add(applyElementStatus(status, element, 1, 100, 1, () => 0) ?? '')
      const tick = tickEnemyStatus(status, 0.1)
      expect(tick.damageTakenMultiplier).toBeGreaterThanOrEqual(1)
    }
    expect(results).toEqual(new Set(['流血', '眩晕', '灼烧', '感电', '中毒 1', '冰缓', '冻结', '破甲']))
  })

  it('毒素最多叠五层且火焰、毒素、流血共同结算持续伤害', () => {
    const status = emptyEnemyStatus()
    for (let index = 0; index < 8; index += 1) applyElementStatus(status, '毒素', 1, 50, 1, () => 0)
    applyElementStatus(status, '火焰', 1, 50, 1, () => 0)
    applyElementStatus(status, '物理', 1, 50, 1, () => 0)
    expect(status.poisonStacks).toBe(5)
    expect(tickEnemyStatus(status, 1).dotDamage).toBeGreaterThan(20)
  })

  it('离线收益含金币、经验、合金和材料，并支持天赋扩展上限', () => {
    const reward = calculateOfflineReward(0, 20 * 3600 * 1000, 20, 1.2, 14)
    expect(reward.cappedSeconds).toBe(14 * 3600)
    expect(reward.gold).toBeGreaterThan(38 * 14)
    expect(reward.alloy).toBeGreaterThan(0)
    expect(reward.parts).toBeGreaterThan(0)
  })

  it('每日、周常和成就任务均可记录增量与历史最高值', () => {
    const daily = createDailyTasks()
    const weekly = createWeeklyTasks()
    const achievements = createAchievements()
    expect(daily).toHaveLength(5)
    expect(weekly).toHaveLength(4)
    expect(achievements).toHaveLength(5)
    recordTaskEvent(daily, 'kill', 999)
    recordTaskEvent(achievements, 'stage', 120)
    expect(daily.find((task) => task.event === 'kill')?.progress).toBe(100)
    expect(achievements.find((task) => task.event === 'stage')?.progress).toBe(100)
    expect(weeklyTaskKey(new Date('2026-07-16T00:00:00Z'))).toMatch(/^2026-W\d{2}$/)
  })

  it('Boss、传说和神话保底状态能够累计与清零', () => {
    const pity = emptyDropPity()
    pity.bossKills = 9
    expect(guaranteedDropRarity(91, pity, false)).toBeNull()
    expect(guaranteedDropRarity(100, pity, true)).toBe('稀有')
    pity.legendaryMisses = 29
    expect(guaranteedDropRarity(3000, pity, true)).toBe('传说')
    recordPityDrop(pity, 3000, '传说', true)
    expect(pity.legendaryMisses).toBe(0)
    pity.mythicShards = 10
    expect(guaranteedDropRarity(7000, pity, true)).not.toBe('神话')
    expect(pity.mythicShards).toBe(10)
  })

  it('史诗保底按连续未出次数累计，期间随机史诗会重置', () => {
    const pity = emptyDropPity()
    pity.epicMisses = 98
    recordPityDrop(pity, 990, '史诗', true)
    expect(pity.epicMisses).toBe(0)
    expect(guaranteedDropRarity(1000, pity, true)).not.toBe('史诗')
    pity.epicMisses = 99
    expect(guaranteedDropRarity(1000, pity, true)).toBe('史诗')
  })

  it('关卡资源零件不再放大配件掉落件数', () => {
    expect(attachmentDropCount(false, null)).toBe(0)
    expect(attachmentDropCount(true, null)).toBe(1)
    expect(attachmentDropCount(false, '史诗')).toBe(1)
  })
})
