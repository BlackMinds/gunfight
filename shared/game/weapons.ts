export type Attachment = {
  name: string
  slot: string
  rarity: string
  effect: string
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
  { name: '聚束枪口', slot: '枪口', rarity: '稀有', effect: '扩散降低' },
  { name: '快速弹匣', slot: '弹匣', rarity: '精良', effect: '换弹加速' },
  { name: '穿甲枪管', slot: '枪管', rarity: '稀有', effect: '穿透 +1' },
  { name: '训练芯片', slot: '芯片', rarity: '普通', effect: '经验 +5%' }
]

export const inventoryPreview: Attachment[] = [
  { name: '燃烧弹芯', slot: '弹芯', rarity: '稀有', effect: '命中附加灼烧' },
  { name: '吸血模块', slot: '模块', rarity: '稀有', effect: '伤害转化生命' },
  { name: '红点瞄具', slot: '瞄具', rarity: '精良', effect: '暴击率 +4%' },
  { name: '稳定枪托', slot: '枪托', rarity: '精良', effect: '移动射击惩罚降低' }
]
