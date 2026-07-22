import { describe, expect, it } from 'vitest'
import { bossAbilityPlanForStage } from '../../shared/game/bosses'
import { enemyFactionFor, factionDamageMultiplier, factionFormationBonus, factionStatusDurationMultiplier } from '../../shared/game/factions'
import { extractSeasonSubmission, liveOpsSnapshot, mergeSeasonSubmission, normalizeLeaderboardMetric } from '../../shared/game/live-ops'
import { absorbWithArmor, defenseDamageMultiplier, luckDropMultiplier, luckRarityShift } from '../../shared/game/player-stats'
import { availableR5EliteAffixes, r5EliteAffixCombatModifiers } from '../../shared/game/r5'
import { applyWeaponProgress, breakthroughWeapon, reforgeWeapon, rollWeaponAffixes, rollWeaponCrate, starterWeapon, weaponCanBreakthrough, weaponCatalog } from '../../shared/game/weapons'

function sequence(values: number[]) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('完整系统深化', () => {
  it('五阵营随战区切换并实际修改元素抗性和状态时长', () => {
    expect([1, 501, 2001, 5001, 7501].map((stage) => enemyFactionFor(stage))).toEqual(['outlaw', 'mercenary', 'machine', 'mutant', 'black-domain'])
    expect(factionDamageMultiplier('machine', '毒素')).toBe(0.5)
    expect(factionDamageMultiplier('machine', '电击')).toBe(1.2)
    expect(factionStatusDurationMultiplier('black-domain')).toBe(0.75)
  })

  it('同阵营三人编队触发阵营专属规则', () => {
    expect(factionFormationBonus('outlaw', 2)).toMatchObject({ active: true, speedMultiplier: 1.08 })
    expect(factionFormationBonus('machine', 2)).toMatchObject({ active: true, incomingDamageMultiplier: 0.9 })
    expect(factionFormationBonus('mutant', 2, 0.4)).toMatchObject({ active: true, actionRateMultiplier: 1.15 })
    expect(factionFormationBonus('mercenary', 1).active).toBe(false)
  })

  it('远期精英词缀全部进入池且抗性词缀缩短异常时间', () => {
    const affixes = availableR5EliteAffixes(10000)
    expect(affixes).toEqual(expect.arrayContaining(['toxic', 'summoner', 'reflective', 'chilling', 'barrier', 'resistant']))
    expect(r5EliteAffixCombatModifiers(['resistant']).statusDurationMultiplier).toBe(0.55)
  })

  it('武器随机词条可重铸、突破并形成第三词条与实际属性', () => {
    const affixes = rollWeaponAffixes(sequence([0, 0, 0.2, 0.6, 0.9, 0.4]), 2)
    const progress = { level: 120, stars: 5, breakthrough: false, affixes }
    expect(weaponCanBreakthrough(starterWeapon, progress)).toBe(true)
    const broken = breakthroughWeapon(progress, sequence([0.9, 0.4, 0.7, 0.5, 0.3, 0.2]))
    expect(broken.breakthrough).toBe(true)
    expect(broken.affixes).toHaveLength(3)
    const applied = applyWeaponProgress(starterWeapon, broken)
    expect(applied.damage).toBeGreaterThan(starterWeapon.damage)
    expect(applied.fireRate).toBeGreaterThan(starterWeapon.fireRate)
    expect(reforgeWeapon(broken, sequence([0.1, 0.2, 0.5, 0.6, 0.9, 0.4])).affixes).toHaveLength(3)
    expect(rollWeaponCrate(weaponCatalog.slice(0, 3), () => 0.99).key).toBe(weaponCatalog[2].key)
  })

  it('独立防御、护甲和幸运公式具有边界', () => {
    expect(defenseDamageMultiplier(100)).toBe(0.5)
    expect(absorbWithArmor(100, 60)).toEqual({ armorDamage: 60, hpDamage: 40, armorAfter: 0 })
    expect(absorbWithArmor(100, 100, 0.8)).toEqual({ armorDamage: 80, hpDamage: 20, armorAfter: 20 })
    expect(luckDropMultiplier(60)).toBe(1.3)
    expect(luckRarityShift(100)).toBe(0.1)
  })

  it('Boss 计划包含圆形弹幕、狂暴阈值与弱点时间', () => {
    expect(bossAbilityPlanForStage(10000, 1)).toMatchObject({ radialBarrageProjectiles: 12, enrageThreshold: 0.15, weakpointSeconds: 2.5 })
  })

  it('服务端时间生成轮换赛季与活动日历', () => {
    const snapshot = liveOpsSnapshot(new Date('2026-07-23T00:00:00.000Z'))
    expect(snapshot.season.id).toBe('S01-联合作战')
    expect(snapshot.activity.id).toBe('boss-hunt')
    expect(snapshot.activity.endsAt).toBe('2026-07-29T00:00:00.000Z')
  })

  it('联网成绩仅从存档提取并按最佳成绩单调合并', () => {
    const first = extractSeasonSubmission({ highestCleared: 500, season: { bestBountySeconds: 42.5, bestSurvivalKills: 80, score: 1000 } })
    const next = extractSeasonSubmission({ highestCleared: 800, season: { bestBountySeconds: 45, bestSurvivalKills: 70, score: 1200 } })
    expect(mergeSeasonSubmission(first, next)).toEqual({ highestStage: 800, bestBountyMs: 42500, survivalKills: 80, eventScore: 1200 })
    expect(normalizeLeaderboardMetric('unsafe-column')).toBe('event-score')
  })
})
