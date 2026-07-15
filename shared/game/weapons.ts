export const attachmentSlots = ['枪口', '弹匣', '瞄具', '枪管', '枪托', '弹芯', '模块', '芯片'] as const
export const attachmentRarities = ['普通', '精良', '稀有', '史诗'] as const

export type AttachmentSlot = (typeof attachmentSlots)[number]
export type AttachmentRarity = (typeof attachmentRarities)[number]
export type AttachmentBonusKey = 'damage' | 'fireRate' | 'maxHp' | 'pickup' | 'speed' | 'pierce' | 'expGain' | 'critRate'
export type AttachmentAffixTier = '主词条' | '副词条'
export type AttachmentAffix = {
  key: AttachmentBonusKey
  label: string
  value: number
  tier: AttachmentAffixTier
}

export type Attachment = {
  id?: string
  templateKey?: string
  roll?: number
  level?: number
  favorite?: boolean
  mainAffix?: AttachmentAffix
  subAffixes?: AttachmentAffix[]
  name: string
  slot: AttachmentSlot
  rarity: AttachmentRarity
  effect: string
  bonuses?: Partial<Record<AttachmentBonusKey, number>>
}

export const starterWeapon = {
  key: 'assault-rifle',
  name: '突击步枪',
  rarity: '精良',
  level: 8,
  damage: 18,
  fireRate: 4.8,
  range: 620,
  bulletSpeed: 720,
  pierce: 1,
  spread: 0.08,
  traits: ['均衡扫射', '移动射击', '穿透入门']
}

export const starterAttachments: Attachment[] = [
  { name: '聚束枪口', slot: '枪口', rarity: '稀有', effect: '伤害 +6%', bonuses: { damage: 0.06 } },
  { name: '快速弹匣', slot: '弹匣', rarity: '精良', effect: '射速 +8%', bonuses: { fireRate: 0.08 } },
  { name: '穿甲枪管', slot: '枪管', rarity: '稀有', effect: '穿透 +1', bonuses: { pierce: 1 } },
  { name: '训练芯片', slot: '芯片', rarity: '普通', effect: '经验 +5%', bonuses: { expGain: 0.05 } }
]

export const inventoryPreview: Attachment[] = [
  { name: '燃烧弹芯', slot: '弹芯', rarity: '稀有', effect: '伤害 +10%', bonuses: { damage: 0.1 } },
  { name: '生命模块', slot: '模块', rarity: '稀有', effect: '最大生命 +18', bonuses: { maxHp: 18 } },
  { name: '红点瞄具', slot: '瞄具', rarity: '精良', effect: '射速 +6%', bonuses: { fireRate: 0.06 } },
  { name: '稳定枪托', slot: '枪托', rarity: '精良', effect: '移速 +7%', bonuses: { speed: 0.07 } }
]

export const attachmentPool: Attachment[] = [
  ...starterAttachments,
  ...inventoryPreview,
  { name: '回收磁环', slot: '模块', rarity: '精良', effect: '拾取 +28', bonuses: { pickup: 28 } },
  { name: '军规模块', slot: '模块', rarity: '稀有', effect: '射速 +12%', bonuses: { fireRate: 0.12 } },
  { name: '重型枪托', slot: '枪托', rarity: '稀有', effect: '最大生命 +30', bonuses: { maxHp: 30 } },
  { name: '高压弹头', slot: '弹芯', rarity: '史诗', effect: '伤害 +16%', bonuses: { damage: 0.16 } },
  { name: '贯通线圈', slot: '枪管', rarity: '史诗', effect: '穿透 +2', bonuses: { pierce: 2 } },
  { name: '战术记录仪', slot: '芯片', rarity: '稀有', effect: '经验 +12%', bonuses: { expGain: 0.12 } }
]
