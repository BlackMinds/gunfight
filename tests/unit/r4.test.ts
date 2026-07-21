import { describe, expect, it } from 'vitest'
import {
  R4_IMPLEMENTED_STAGE_CAP,
  availableEliteAffixes,
  eliteAffixCombatModifiers,
  getR4StageBand,
  r4EnemyMechanicsForStage,
  r4EnemyMultipliersForStage,
  r4WavePressureForStage,
  resolveEliteAffixes
} from '../../shared/game/r4'

describe('R4 第 101～500 关配置', () => {
  it('对 R3 已验收节点不施加任何 R4 属性或波次修饰', () => {
    for (const stage of [1, 20, 40, 60, 100]) {
      expect(r4EnemyMultipliersForStage(stage)).toEqual({ hp: 1, damage: 1, speed: 1 })
      expect(r4WavePressureForStage(stage)).toEqual({ extraEnemies: 0, spawnIntervalMultiplier: 1 })
    }
  })

  it('按四个区段连续成长并在第 500 关后钳制', () => {
    expect(getR4StageBand(100)).toBeNull()
    expect(getR4StageBand(101)?.label).toBe('火力突破')
    expect(getR4StageBand(201)?.label).toBe('装甲封锁')
    expect(getR4StageBand(301)?.label).toBe('废城压迫')
    expect(getR4StageBand(401)?.label).toBe('联合作战')
    expect(r4EnemyMultipliersForStage(200).hp).toBeCloseTo(r4EnemyMultipliersForStage(201).hp)
    expect(r4EnemyMultipliersForStage(300).damage).toBeCloseTo(r4EnemyMultipliersForStage(301).damage)
    expect(r4EnemyMultipliersForStage(400).speed).toBeCloseTo(r4EnemyMultipliersForStage(401).speed)
    expect(r4EnemyMultipliersForStage(R4_IMPLEMENTED_STAGE_CAP)).toEqual(r4EnemyMultipliersForStage(9999))
  })

  it('机制按区段累积解锁', () => {
    expect(r4EnemyMechanicsForStage(100)).toEqual({ rangedBurst: false, heavyArmorRecovery: false, bomberDeathZone: false, eliteCoordination: false })
    expect(r4EnemyMechanicsForStage(101)).toMatchObject({ rangedBurst: true, heavyArmorRecovery: false })
    expect(r4EnemyMechanicsForStage(201)).toMatchObject({ rangedBurst: true, heavyArmorRecovery: true, bomberDeathZone: false })
    expect(r4EnemyMechanicsForStage(301)).toMatchObject({ bomberDeathZone: true, eliteCoordination: false })
    expect(r4EnemyMechanicsForStage(401).eliteCoordination).toBe(true)
  })

  it('波次压力分段增加', () => {
    expect(r4WavePressureForStage(100)).toEqual({ extraEnemies: 0, spawnIntervalMultiplier: 1 })
    expect(r4WavePressureForStage(201)).toEqual({ extraEnemies: 1, spawnIntervalMultiplier: 0.97 })
    expect(r4WavePressureForStage(401)).toEqual({ extraEnemies: 2, spawnIntervalMultiplier: 0.91 })
  })

  it('精英词缀确定、无重复且在 401 关后为双词缀', () => {
    expect(availableEliteAffixes(100)).toEqual([])
    expect(availableEliteAffixes(101)).toEqual(['assault', 'bulwark'])
    expect(availableEliteAffixes(301)).toEqual(['assault', 'bulwark', 'regeneration', 'volatile'])
    const single = resolveEliteAffixes(301, 5, 2, 'fast')
    const dual = resolveEliteAffixes(401, 5, 2, 'fast')
    expect(single).toHaveLength(1)
    expect(dual).toHaveLength(2)
    expect(new Set(dual).size).toBe(2)
    expect(resolveEliteAffixes(401, 5, 2, 'fast')).toEqual(dual)
  })

  it('急袭与壁垒只修改各自负责的战斗维度', () => {
    expect(eliteAffixCombatModifiers(['assault'])).toEqual({ speedMultiplier: 1.06, actionRateMultiplier: 1.15, armorRatio: 0 })
    expect(eliteAffixCombatModifiers(['bulwark'])).toEqual({ speedMultiplier: 1, actionRateMultiplier: 1, armorRatio: 0.22 })
    expect(eliteAffixCombatModifiers(['assault', 'bulwark'])).toEqual({ speedMultiplier: 1.06, actionRateMultiplier: 1.15, armorRatio: 0.22 })
  })
})
