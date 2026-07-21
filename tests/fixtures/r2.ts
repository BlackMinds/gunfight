import { CURRENT_SAVE_VERSION } from '../../shared/game/save'
import { attachmentPool, attachmentSlots, type Attachment, type AttachmentAffix, type AttachmentBonusKey, type AttachmentRarity, type AttachmentSlot, type WeaponProgressMap } from '../../shared/game/weapons'

export const GAME_SAVE_KEY = 'gunfight-growth-save-v1'
export const R2_BALANCE_STAGES = [20, 40, 60, 100] as const

export type GameSaveFixture = {
  saveVersion: number
  stage: number
  highestCleared: number
  resources: { gold: number; alloy: number; parts: number }
  base: { weaponLevel: number; armorLevel: number; magnetLevel: number }
  player: { level: number; exp: number; hp: number }
  equipped: Attachment[]
  inventory: Attachment[]
  acquireOrder: Record<string, number>
  selectedWeaponKey?: string
  weaponProgress?: Partial<WeaponProgressMap>
}

const affixLabels: Record<AttachmentBonusKey, string> = {
  damage: '伤害',
  fireRate: '射速',
  maxHp: '最大生命',
  pickup: '拾取',
  speed: '移速',
  pierce: '穿透',
  expGain: '经验',
  critRate: '暴击率'
}

function affix(key: AttachmentBonusKey, value: number, tier: AttachmentAffix['tier']): AttachmentAffix {
  return { key, label: affixLabels[key], value, tier }
}

function bonusEffect(key: AttachmentBonusKey, value: number) {
  if (key === 'maxHp' || key === 'pickup' || key === 'pierce') return `${affixLabels[key]} +${value}`
  return `${affixLabels[key]} +${Math.round(value * 100)}%`
}

export function createR2Attachment(index: number, options: { favorite?: boolean; rarity?: AttachmentRarity } = {}): Attachment {
  const template = attachmentPool[index % attachmentPool.length]
  const [mainKey = 'damage', mainValue = 0.04] = (Object.entries(template.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>)[0] ?? []
  const firstSubKey: AttachmentBonusKey = mainKey === 'speed' ? 'critRate' : 'speed'
  const secondSubKey: AttachmentBonusKey = mainKey === 'critRate' ? 'damage' : 'critRate'
  const mainAffix = affix(mainKey, mainValue, '主词条')
  const subAffixes = [affix(firstSubKey, 0.03, '副词条'), affix(secondSubKey, secondSubKey === 'damage' ? 0.025 : 0.03, '副词条')]
  return {
    id: `r2-item-${index.toString().padStart(2, '0')}`,
    templateKey: template.name,
    name: `${template.name} · R2-${(index + 1).toString().padStart(2, '0')}`,
    slot: template.slot,
    rarity: options.rarity ?? (index >= 24 ? '史诗' : '普通'),
    roll: 0.8 + index / 1000,
    level: 0,
    favorite: options.favorite ?? false,
    mainAffix,
    subAffixes,
    bonuses: { [mainKey]: mainValue, [firstSubKey]: 0.03, [secondSubKey]: secondSubKey === 'damage' ? 0.025 : 0.03 },
    effect: bonusEffect(mainKey, mainValue)
  }
}

function fixedAttachment(id: string, name: string, slot: AttachmentSlot, rarity: AttachmentRarity, key: AttachmentBonusKey, value: number): Attachment {
  return {
    id,
    templateKey: name,
    name,
    slot,
    rarity,
    roll: 1,
    level: 0,
    mainAffix: affix(key, value, '主词条'),
    subAffixes: [],
    bonuses: { [key]: value },
    effect: bonusEffect(key, value)
  }
}

export const R2_FIXED_LOADOUT: Attachment[] = [
  fixedAttachment('r2-fixed-muzzle', '聚束枪口', '枪口', '稀有', 'damage', 0.06),
  fixedAttachment('r2-fixed-magazine', '快速弹匣', '弹匣', '精良', 'fireRate', 0.08),
  fixedAttachment('r2-fixed-sight', '红点瞄具', '瞄具', '精良', 'fireRate', 0.05),
  fixedAttachment('r2-fixed-barrel', '穿甲枪管', '枪管', '稀有', 'pierce', 1),
  fixedAttachment('r2-fixed-stock', '稳定枪托', '枪托', '精良', 'speed', 0.06),
  fixedAttachment('r2-fixed-core', '燃烧弹芯', '弹芯', '稀有', 'damage', 0.06),
  fixedAttachment('r2-fixed-module', '生命模块', '模块', '稀有', 'maxHp', 18),
  fixedAttachment('r2-fixed-chip', '训练芯片', '芯片', '稀有', 'critRate', 0.04)
]

export function createR2InventorySave(options: {
  count: number
  favoriteIndexes?: number[]
  resources?: Partial<GameSaveFixture['resources']>
}): GameSaveFixture {
  const favoriteIndexes = new Set(options.favoriteIndexes ?? [])
  const inventory = Array.from({ length: options.count }, (_, index) => createR2Attachment(index, { favorite: favoriteIndexes.has(index) }))
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage: 1,
    highestCleared: 0,
    resources: { gold: 0, alloy: 0, parts: 0, ...options.resources },
    base: { weaponLevel: 0, armorLevel: 0, magnetLevel: 0 },
    player: { level: 8, exp: 0, hp: 222 },
    equipped: R2_FIXED_LOADOUT.map((item) => ({ ...item })),
    inventory,
    acquireOrder: Object.fromEntries(inventory.map((item, index) => [item.id!, index + 1]))
  }
}

export function createR2BalanceSave(stage: (typeof R2_BALANCE_STAGES)[number]): GameSaveFixture {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage,
    highestCleared: stage - 1,
    resources: { gold: 2000, alloy: 50, parts: 200 },
    base: { weaponLevel: 0, armorLevel: 0, magnetLevel: 0 },
    player: { level: 18, exp: 0, hp: 342 },
    equipped: R2_FIXED_LOADOUT.map((item) => ({ ...item })),
    inventory: [],
    acquireOrder: {},
    selectedWeaponKey: 'light-machine-gun',
    weaponProgress: { 'light-machine-gun': { level: 1, stars: 0 } }
  }
}

export function serializeGameSave(fixture: GameSaveFixture) {
  return JSON.stringify(fixture)
}

export const R2_BALANCE_SAVE_FIXTURES = Object.fromEntries(
  R2_BALANCE_STAGES.map((stage) => [stage, createR2BalanceSave(stage)])
) as Record<(typeof R2_BALANCE_STAGES)[number], GameSaveFixture>

if (R2_FIXED_LOADOUT.map((item) => item.slot).some((slot, index, slots) => slots.indexOf(slot) !== index) || R2_FIXED_LOADOUT.length !== attachmentSlots.length) {
  throw new Error('R2 固定构筑必须完整覆盖 8 个不重复槽位')
}
