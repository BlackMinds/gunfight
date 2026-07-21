import { CURRENT_SAVE_VERSION } from '../../shared/game/save'
import { applyWeaponProgress, attachmentPool, weaponCatalog, type Attachment, type WeaponProgressMap } from '../../shared/game/weapons'
import type { GameSaveFixture } from './r2'

export const R4_BALANCE_STAGES = [100, 150, 200, 250, 300, 350, 400, 450, 500] as const
export type R4BalanceStage = (typeof R4_BALANCE_STAGES)[number]

export type R4BuildProfile = {
  id: 'firebreak' | 'lockdown' | 'ruins' | 'combined-arms'
  label: string
  minStage: number
  maxStage: number
  playerLevel: number
  weaponKey: string
  weaponLevel: number
  weaponStars: number
  attachmentNames: readonly string[]
  expectedDps: number
}

const FIREBREAK_LOADOUT = ['猎头枪口', '量子弹匣', '弱点分析镜', '轨道枪管', '相位枪托', '虚空弹芯', '雷暴线圈', '战术 AI 芯片'] as const
const LOCKDOWN_LOADOUT = ['风暴枪口', '量子弹匣', '黑域瞄具', '轨道枪管', '相位枪托', '虚空弹芯', '雷暴线圈', '战术 AI 芯片'] as const
const RUINS_LOADOUT = ['猎头枪口', '量子弹匣', '黑域瞄具', '黑域枪管', '相位枪托', '裂变弹芯', '黑洞模块', '战术 AI 芯片'] as const
const COMBINED_ARMS_LOADOUT = ['猎头枪口', '量子弹匣', '黑域瞄具', '黑域枪管', '相位枪托', '虚空弹芯', '死线模块', '终局芯片'] as const

export const R4_BUILD_PROFILES = [
  { id: 'firebreak', label: '火力突破验证构筑', minStage: 100, maxStage: 200, playerLevel: 70, weaponKey: 'laser-rifle', weaponLevel: 18, weaponStars: 1, attachmentNames: FIREBREAK_LOADOUT, expectedDps: 430 },
  { id: 'lockdown', label: '装甲封锁验证构筑', minStage: 201, maxStage: 300, playerLevel: 78, weaponKey: 'laser-rifle', weaponLevel: 30, weaponStars: 2, attachmentNames: LOCKDOWN_LOADOUT, expectedDps: 560 },
  { id: 'ruins', label: '废城压迫验证构筑', minStage: 301, maxStage: 400, playerLevel: 88, weaponKey: 'laser-rifle', weaponLevel: 44, weaponStars: 3, attachmentNames: RUINS_LOADOUT, expectedDps: 720 },
  { id: 'combined-arms', label: '联合作战验证构筑', minStage: 401, maxStage: 500, playerLevel: 100, weaponKey: 'laser-rifle', weaponLevel: 60, weaponStars: 4, attachmentNames: COMBINED_ARMS_LOADOUT, expectedDps: 900 }
] as const satisfies readonly R4BuildProfile[]

function cloneAttachment(name: string, profileId: string, index: number): Attachment {
  const template = attachmentPool.find((item) => item.name === name)
  if (!template) throw new Error(`R4 固定构筑缺少配件：${name}`)
  return {
    ...structuredClone(template),
    id: `r4-${profileId}-${index.toString().padStart(2, '0')}`,
    templateKey: template.name,
    roll: 1,
    level: 0,
    favorite: true
  }
}

export function getR4BuildProfile(stage: number): R4BuildProfile {
  const clamped = Math.max(100, Math.min(500, Math.round(stage)))
  return R4_BUILD_PROFILES.find((profile) => clamped >= profile.minStage && clamped <= profile.maxStage) ?? R4_BUILD_PROFILES[R4_BUILD_PROFILES.length - 1]
}

export function createR4BalanceSave(stage: R4BalanceStage): GameSaveFixture {
  const profile = getR4BuildProfile(stage)
  const weaponDefinition = weaponCatalog.find((item) => item.key === profile.weaponKey)
  if (!weaponDefinition) throw new Error(`R4 固定构筑缺少武器：${profile.weaponKey}`)
  const progress = { level: profile.weaponLevel, stars: profile.weaponStars }
  applyWeaponProgress(weaponDefinition, progress)
  const weaponProgress: Partial<WeaponProgressMap> = { [profile.weaponKey]: progress }
  const equipped = profile.attachmentNames.map((name, index) => cloneAttachment(name, profile.id, index))
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage,
    highestCleared: stage - 1,
    resources: { gold: 4000, alloy: 120, parts: 500 },
    base: { weaponLevel: 0, armorLevel: 0, magnetLevel: 0 },
    player: { level: profile.playerLevel, exp: 0, hp: 9999 },
    equipped,
    inventory: [],
    acquireOrder: {},
    selectedWeaponKey: profile.weaponKey,
    weaponProgress
  }
}

for (const profile of R4_BUILD_PROFILES) {
  const slots = profile.attachmentNames.map((name) => attachmentPool.find((item) => item.name === name)?.slot)
  if (slots.some((slot) => !slot) || new Set(slots).size !== 8) throw new Error(`${profile.label} 必须覆盖 8 个不重复槽位`)
}
