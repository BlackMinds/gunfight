import { CURRENT_SAVE_VERSION } from '../../shared/game/save'
import { r5GrowthAnchors } from '../../shared/game/r5'
import { applyWeaponProgress, attachmentPool, weaponCatalog, type Attachment, type WeaponProgressMap } from '../../shared/game/weapons'
import type { GameSaveFixture } from './r2'

export const R5_BALANCE_STAGES = [500, 1000, 1500, 2000, 3000, 5000, 7500, 10000] as const
export type R5BalanceStage = (typeof R5_BALANCE_STAGES)[number]

export type R5BuildProfile = {
  id: 'r4-anchor' | 'industrial-blockade' | 'wasteland-hunt' | 'wasteland-storm' | 'alloy-fortress' | 'radiation-city' | 'deep-front' | 'end-war'
  label: string
  stage: R5BalanceStage
  playerLevel: number
  weaponKey: string
  weaponLevel: number
  weaponStars: number
  attachmentNames: readonly string[]
  expectedDps: number
  expectedMaxHp: number
}

const LOADOUTS = {
  energy: ['猎头枪口', '量子弹匣', '黑域瞄具', '轨道枪管', '相位枪托', '虚空弹芯', '死线模块', '终局芯片'],
  density: ['风暴枪口', '量子弹匣', '黑域瞄具', '黑域枪管', '相位枪托', '裂变弹芯', '黑洞模块', '终局芯片'],
  survival: ['猎头枪口', '量子弹匣', '黑域瞄具', '黑域枪管', '相位枪托', '虚空弹芯', '死线模块', '终局芯片']
} as const

const profileRows = [
  ['r4-anchor', 'R4 连续锚点构筑', 500, 100, 60, 4, LOADOUTS.energy],
  ['industrial-blockade', '军工封锁验证构筑', 1000, 125, 80, 4, LOADOUTS.energy],
  ['wasteland-hunt', '荒原猎杀验证构筑', 1500, 150, 95, 5, LOADOUTS.energy],
  ['wasteland-storm', '荒原风暴验证构筑', 2000, 180, 110, 5, LOADOUTS.density],
  ['alloy-fortress', '合金要塞验证构筑', 3000, 220, 120, 5, LOADOUTS.energy],
  ['radiation-city', '辐射城区验证构筑', 5000, 300, 120, 5, LOADOUTS.density],
  ['deep-front', '深层战场验证构筑', 7500, 400, 120, 5, LOADOUTS.survival],
  ['end-war', '终局战争验证构筑', 10000, 500, 120, 5, LOADOUTS.survival]
] as const

export const R5_BUILD_PROFILES = profileRows.map(([id, label, stage, playerLevel, weaponLevel, weaponStars, attachmentNames]) => {
  const budget = r5GrowthAnchors.find((anchor) => anchor.stage === stage)
  if (!budget) throw new Error(`R5 缺少第 ${stage} 关成长预算`)
  return { id, label, stage, playerLevel, weaponKey: 'laser-rifle', weaponLevel, weaponStars, attachmentNames, expectedDps: budget.expectedDps, expectedMaxHp: budget.expectedMaxHp }
}) satisfies R5BuildProfile[]

function cloneAttachment(name: string, profileId: string, index: number): Attachment {
  const template = attachmentPool.find((item) => item.name === name)
  if (!template) throw new Error(`R5 固定构筑缺少配件：${name}`)
  return { ...structuredClone(template), id: `r5-${profileId}-${index.toString().padStart(2, '0')}`, templateKey: template.name, roll: 1, level: 0, favorite: true }
}

export function getR5BuildProfile(stage: number): R5BuildProfile {
  const current = Math.max(500, Math.min(10000, Math.round(stage)))
  return R5_BUILD_PROFILES.find((profile) => current <= profile.stage) ?? R5_BUILD_PROFILES[R5_BUILD_PROFILES.length - 1]
}

export function createR5BalanceSave(stage: R5BalanceStage): GameSaveFixture {
  const profile = getR5BuildProfile(stage)
  const definition = weaponCatalog.find((item) => item.key === profile.weaponKey)
  if (!definition) throw new Error(`R5 固定构筑缺少武器：${profile.weaponKey}`)
  const progress = { level: profile.weaponLevel, stars: profile.weaponStars, breakthrough: false, affixes: [] }
  applyWeaponProgress(definition, progress)
  const weaponProgress: Partial<WeaponProgressMap> = { [profile.weaponKey]: progress }
  const equipped = profile.attachmentNames.map((name, index) => cloneAttachment(name, profile.id, index))
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage,
    highestCleared: stage - 1,
    resources: { gold: 12000, alloy: 360, parts: 1500 },
    base: { weaponLevel: 0, armorLevel: 0, magnetLevel: 0 },
    player: { level: profile.playerLevel, exp: 0, hp: 99999 },
    equipped,
    inventory: [],
    acquireOrder: {},
    selectedWeaponKey: profile.weaponKey,
    weaponProgress
  }
}

for (const profile of R5_BUILD_PROFILES) {
  const slots = profile.attachmentNames.map((name) => attachmentPool.find((item) => item.name === name)?.slot)
  if (slots.some((slot) => !slot) || new Set(slots).size !== 8) throw new Error(`${profile.label} 必须覆盖 8 个不重复槽位`)
}
