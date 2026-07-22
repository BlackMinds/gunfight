export type BossArchetype = 'assault-lord' | 'fortress-colossus' | 'warzone-commander' | 'final-core'

export type BossDefinition = {
  id: BossArchetype
  label: string
  summary: string
  summonKind?: 'warden' | 'commander'
  shieldRatio: number
  phaseShieldRatio: number
  charge: boolean
  laserSweep: boolean
  clones: boolean
  pressureRing: boolean
  radialBarrage: boolean
  enrageThreshold: number
  weakpointSeconds: number
}

export const bossDefinitions: Record<BossArchetype, BossDefinition> = {
  'assault-lord': { id: 'assault-lord', label: '突击领主', summary: '冲锋、扇形与圆形弹幕', shieldRatio: 0, phaseShieldRatio: 0, charge: true, laserSweep: false, clones: false, pressureRing: false, radialBarrage: true, enrageThreshold: 0.15, weakpointSeconds: 2.5 },
  'fortress-colossus': { id: 'fortress-colossus', label: '堡垒巨像', summary: '阶段护盾、圆形弹幕与护卫增援', summonKind: 'warden', shieldRatio: 0.28, phaseShieldRatio: 0.18, charge: false, laserSweep: false, clones: false, pressureRing: false, radialBarrage: true, enrageThreshold: 0.15, weakpointSeconds: 2.5 },
  'warzone-commander': { id: 'warzone-commander', label: '战区统帅', summary: '激光扫射、圆形弹幕与指挥编队', summonKind: 'commander', shieldRatio: 0.12, phaseShieldRatio: 0, charge: false, laserSweep: true, clones: false, pressureRing: false, radialBarrage: true, enrageThreshold: 0.15, weakpointSeconds: 2.5 },
  'final-core': { id: 'final-core', label: '终焉核心', summary: '冲锋、阶段护盾、分身激光、圆形弹幕与收缩压迫圈', summonKind: 'commander', shieldRatio: 0.2, phaseShieldRatio: 0.14, charge: true, laserSweep: true, clones: true, pressureRing: true, radialBarrage: true, enrageThreshold: 0.15, weakpointSeconds: 2.5 }
}

export function bossAbilityPlanForStage(stage: number, phase: number) {
  const definition = bossDefinitionForStage(stage)
  return {
    charge: definition.charge,
    phaseShieldRatio: phase > 0 ? definition.phaseShieldRatio : 0,
    summonKind: phase > 0 ? definition.summonKind : undefined,
    laserSweepShots: definition.laserSweep ? 5 : 0,
    clones: definition.clones && phase > 0 ? 2 : 0,
    pressureRing: definition.pressureRing && phase > 0,
    radialBarrageProjectiles: definition.radialBarrage && phase > 0 ? 12 : 0,
    enrageThreshold: definition.enrageThreshold,
    weakpointSeconds: definition.weakpointSeconds
  }
}

export function bossArchetypeForStage(stage: number): BossArchetype {
  if (stage >= 10000) return 'final-core'
  if (stage % 1000 === 0) return 'warzone-commander'
  if (stage % 100 === 0) return 'fortress-colossus'
  return 'assault-lord'
}

export function bossDefinitionForStage(stage: number) {
  return bossDefinitions[bossArchetypeForStage(stage)]
}
