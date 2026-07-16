export const attachmentSlots = ['枪口', '弹匣', '瞄具', '枪管', '枪托', '弹芯', '模块', '芯片'] as const
export const attachmentRarities = ['普通', '精良', '稀有', '史诗', '传说', '神话'] as const

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
  setKey?: '赤焰清道夫' | '雷暴执行者' | '穿甲猎手' | '黄金后勤'
  specialEffect?: string
}

export type WeaponElement = '物理' | '火焰' | '电击' | '冰霜'
export type WeaponDefinition = {
  key: string
  name: string
  rarity: AttachmentRarity
  level: number
  unlockLevel: number
  damage: number
  fireRate: number
  range: number
  bulletSpeed: number
  pierce: number
  spread: number
  projectiles: number
  element: WeaponElement
  statusChance: number
  traits: string[]
}

export const weaponCatalog: WeaponDefinition[] = [
  { key: 'assault-rifle', name: '突击步枪', rarity: '精良', level: 8, unlockLevel: 1, damage: 18, fireRate: 4.8, range: 620, bulletSpeed: 720, pierce: 1, spread: 0.08, projectiles: 1, element: '物理', statusChance: 0, traits: ['均衡扫射', '移动射击', '穿透入门'] },
  { key: 'storm-smg', name: '风暴冲锋枪', rarity: '稀有', level: 8, unlockLevel: 3, damage: 10, fireRate: 8.2, range: 470, bulletSpeed: 760, pierce: 0, spread: 0.13, projectiles: 1, element: '电击', statusChance: 0.22, traits: ['高频触发', '感电连锁', '近中距离'] },
  { key: 'ember-shotgun', name: '余烬霰弹枪', rarity: '稀有', level: 8, unlockLevel: 5, damage: 9, fireRate: 1.7, range: 360, bulletSpeed: 610, pierce: 0, spread: 0.42, projectiles: 5, element: '火焰', statusChance: 0.28, traits: ['五发弹丸', '灼烧压制', '近距离爆发'] },
  { key: 'frost-sniper', name: '霜痕狙击枪', rarity: '史诗', level: 8, unlockLevel: 8, damage: 62, fireRate: 0.85, range: 920, bulletSpeed: 1100, pierce: 3, spread: 0.015, projectiles: 1, element: '冰霜', statusChance: 0.38, traits: ['高伤穿透', '冰缓控制', '首领猎杀'] }
]

export const starterWeapon = weaponCatalog[0]

export const starterAttachments: Attachment[] = [
  { name: '聚束枪口', slot: '枪口', rarity: '稀有', effect: '伤害 +6%', bonuses: { damage: 0.06 } },
  { name: '快速弹匣', slot: '弹匣', rarity: '精良', effect: '射速 +8%', bonuses: { fireRate: 0.08 } },
  { name: '穿甲枪管', slot: '枪管', rarity: '稀有', effect: '穿透 +1', bonuses: { pierce: 1 } },
  { name: '训练芯片', slot: '芯片', rarity: '普通', effect: '经验 +5%', bonuses: { expGain: 0.05 } }
]

export const inventoryPreview: Attachment[] = [
  { name: '燃烧弹芯', slot: '弹芯', rarity: '稀有', effect: '伤害 +10%', bonuses: { damage: 0.1 }, setKey: '赤焰清道夫' },
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
  { name: '战术记录仪', slot: '芯片', rarity: '稀有', effect: '经验 +12%', bonuses: { expGain: 0.12 } },
  { name: '余烬制退器', slot: '枪口', rarity: '史诗', effect: '伤害 +18% / 暴击率 +5%', bonuses: { damage: 0.18, critRate: 0.05 }, setKey: '赤焰清道夫' },
  { name: '雷暴线圈', slot: '模块', rarity: '史诗', effect: '射速 +16% / 暴击率 +4%', bonuses: { fireRate: 0.16, critRate: 0.04 }, setKey: '雷暴执行者' },
  { name: '财阀芯片', slot: '芯片', rarity: '传说', effect: '经验 +24% / 伤害 +12%', bonuses: { expGain: 0.24, damage: 0.12 }, setKey: '黄金后勤', specialEffect: '本关金币收益提高 20%' },
  { name: '裂变弹芯', slot: '弹芯', rarity: '传说', effect: '伤害 +28% / 暴击率 +8%', bonuses: { damage: 0.28, critRate: 0.08 }, setKey: '赤焰清道夫', specialEffect: '异常目标被击败时扩散元素状态' },
  { name: '虚空弹芯', slot: '弹芯', rarity: '神话', effect: '伤害 +42% / 穿透 +2', bonuses: { damage: 0.42, pierce: 2 }, specialEffect: '部分伤害无视护甲' },
  { name: '终局芯片', slot: '芯片', rarity: '神话', effect: '射速 +24% / 经验 +30%', bonuses: { fireRate: 0.24, expGain: 0.3 }, specialEffect: '强化当前件数最高的套装效果' }
]
