import { describe, expect, it } from 'vitest'
import { bossAbilityPlanForStage, bossDefinitionForStage } from '../../shared/game/bosses'

describe('boss definitions', () => {
  it('按十关、百关、千关和终局选择不同首领', () => {
    expect(bossDefinitionForStage(10).id).toBe('assault-lord')
    expect(bossDefinitionForStage(100).id).toBe('fortress-colossus')
    expect(bossDefinitionForStage(1000).id).toBe('warzone-commander')
    expect(bossDefinitionForStage(10000).id).toBe('final-core')
  })

  it('四档首领向战斗循环提供独立能力计划', () => {
    expect(bossAbilityPlanForStage(10, 1)).toMatchObject({ charge: true, laserSweepShots: 0, clones: 0, pressureRing: false })
    expect(bossAbilityPlanForStage(100, 1)).toMatchObject({ charge: false, phaseShieldRatio: 0.18, summonKind: 'warden' })
    expect(bossAbilityPlanForStage(1000, 1)).toMatchObject({ charge: false, summonKind: 'commander', laserSweepShots: 5 })
    expect(bossAbilityPlanForStage(10000, 1)).toMatchObject({ charge: true, phaseShieldRatio: 0.14, summonKind: 'commander', laserSweepShots: 5, clones: 2, pressureRing: true })
    expect(bossAbilityPlanForStage(1000, 0)).toMatchObject({ laserSweepShots: 5, summonKind: undefined })
  })
})
