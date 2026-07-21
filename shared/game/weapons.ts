export const attachmentSlots = ['枪口', '弹匣', '瞄具', '枪管', '枪托', '弹芯', '模块', '芯片'] as const
export const attachmentRarities = ['普通', '精良', '稀有', '史诗', '传说', '神话'] as const

export type AttachmentSlot = (typeof attachmentSlots)[number]
export type AttachmentRarity = (typeof attachmentRarities)[number]
export type AttachmentBonusKey = 'damage' | 'fireRate' | 'maxHp' | 'pickup' | 'speed' | 'pierce' | 'expGain' | 'critRate'
export type AttachmentAffixTier = '主词条' | '副词条'
export type AttachmentSpecialEffectKey =
  | 'status-spread'
  | 'storm-impact'
  | 'quantum-magazine'
  | 'no-pierce-falloff'
  | 'void-ammo'
  | 'phase-dodge'
  | 'fortress'
  | 'gold-conversion'
  | 'dominant-set'
  | 'last-stand'
  | 'black-hole'
  | 'threat-targeting'
  | 'elite-overdrive'
export type AttachmentAffix = {
  key: AttachmentBonusKey
  label: string
  value: number
  tier: AttachmentAffixTier
}

export const equipmentSetKeys = ['赤焰清道夫', '雷暴执行者', '穿甲猎手', '血色幸存者', '黄金后勤', '黑域终端'] as const
export type EquipmentSetKey = (typeof equipmentSetKeys)[number]

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
  setKey?: EquipmentSetKey
  specialEffectKey?: AttachmentSpecialEffectKey
  specialEffect?: string
}

export const weaponElements = ['物理', '爆炸', '火焰', '电击', '毒素', '冰霜', '能量'] as const
export type WeaponElement = (typeof weaponElements)[number]
export type WeaponAttackPattern = 'single' | 'dual' | 'spread' | 'automatic' | 'explosive' | 'cone' | 'chain' | 'beam' | 'charged'
export type WeaponDefinition = {
  key: string
  name: string
  category: string
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
  attackPattern: WeaponAttackPattern
  magazineSize: number
  reloadTime: number
  critRate: number
  critDamage: number
  knockback: number
  explosionRadius: number
  chainCount: number
  chargeTime: number
  maxLevel: number
  maxStars: number
  slotCount: number
  fixedTrait: string
  traits: string[]
}

export type WeaponProgress = { level: number; stars: number }
export type WeaponProgressMap = Record<string, WeaponProgress>

export const weaponCatalog: WeaponDefinition[] = [
  { key: 'pistol', name: '守望手枪', category: '手枪', rarity: '普通', level: 1, unlockLevel: 1, damage: 24, fireRate: 2.8, range: 600, bulletSpeed: 760, pierce: 0, spread: 0.04, projectiles: 1, element: '物理', statusChance: 0.12, attackPattern: 'single', magazineSize: 12, reloadTime: 1.1, critRate: 0.05, critDamage: 1.8, knockback: 20, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 4, fixedTrait: '首发校准：弹匣第一发暴击率翻倍', traits: ['稳定单发', '暴击入门', '低维护'] },
  { key: 'dual-pistols', name: '毒蝎双枪', category: '双枪', rarity: '精良', level: 1, unlockLevel: 2, damage: 12, fireRate: 6.8, range: 520, bulletSpeed: 780, pierce: 0, spread: 0.11, projectiles: 2, element: '毒素', statusChance: 0.18, attackPattern: 'dual', magazineSize: 24, reloadTime: 1.35, critRate: 0.04, critDamage: 1.7, knockback: 8, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 5, fixedTrait: '交替射击：连续命中提高移动速度', traits: ['双弹连射', '中毒叠层', '移动作战'] },
  { key: 'storm-smg', name: '风暴冲锋枪', category: '冲锋枪', rarity: '稀有', level: 1, unlockLevel: 3, damage: 10, fireRate: 9.2, range: 470, bulletSpeed: 800, pierce: 0, spread: 0.14, projectiles: 1, element: '电击', statusChance: 0.23, attackPattern: 'automatic', magazineSize: 36, reloadTime: 1.5, critRate: 0.03, critDamage: 1.65, knockback: 6, explosionRadius: 0, chainCount: 2, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 6, fixedTrait: '电弧触发：感电命中可传导附近目标', traits: ['高频触发', '感电连锁', '近中距离'] },
  { key: 'ember-shotgun', name: '余烬霰弹枪', category: '霰弹枪', rarity: '稀有', level: 1, unlockLevel: 5, damage: 10, fireRate: 1.75, range: 370, bulletSpeed: 630, pierce: 0, spread: 0.46, projectiles: 6, element: '火焰', statusChance: 0.3, attackPattern: 'spread', magazineSize: 6, reloadTime: 1.8, critRate: 0.02, critDamage: 1.7, knockback: 70, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 6, fixedTrait: '近距爆发：距离越近伤害越高', traits: ['六发弹丸', '灼烧压制', '强力击退'] },
  { key: 'assault-rifle', name: '制式突击步枪', category: '突击步枪', rarity: '精良', level: 1, unlockLevel: 8, damage: 19, fireRate: 5.1, range: 650, bulletSpeed: 820, pierce: 1, spread: 0.075, projectiles: 1, element: '物理', statusChance: 0.14, attackPattern: 'automatic', magazineSize: 30, reloadTime: 1.55, critRate: 0.04, critDamage: 1.75, knockback: 18, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 6, fixedTrait: '战术泛用：稳定连射并自带 1 次穿透', traits: ['均衡扫射', '稳定压制', '穿透入门'] },
  { key: 'frost-sniper', name: '霜痕狙击枪', category: '狙击枪', rarity: '史诗', level: 1, unlockLevel: 12, damage: 78, fireRate: 0.8, range: 980, bulletSpeed: 1180, pierce: 3, spread: 0.01, projectiles: 1, element: '冰霜', statusChance: 0.42, attackPattern: 'single', magazineSize: 5, reloadTime: 2.1, critRate: 0.14, critDamage: 2.35, knockback: 45, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 7, fixedTrait: '弱点狙杀：对首领暴击伤害提高', traits: ['高伤穿透', '冰缓冻结', '首领猎杀'] },
  { key: 'light-machine-gun', name: '壁垒轻机枪', category: '轻机枪', rarity: '史诗', level: 1, unlockLevel: 18, damage: 16, fireRate: 8.1, range: 640, bulletSpeed: 790, pierce: 1, spread: 0.16, projectiles: 1, element: '物理', statusChance: 0.16, attackPattern: 'automatic', magazineSize: 90, reloadTime: 3.2, critRate: 0.02, critDamage: 1.6, knockback: 22, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 8, fixedTrait: '持续压制：连射时射速逐步提高', traits: ['大弹匣', '持续压制', '破甲火力'] },
  { key: 'grenade-launcher', name: '震地榴弹发射器', category: '榴弹发射器', rarity: '史诗', level: 1, unlockLevel: 25, damage: 74, fireRate: 0.95, range: 700, bulletSpeed: 450, pierce: 0, spread: 0.06, projectiles: 1, element: '爆炸', statusChance: 0.4, attackPattern: 'explosive', magazineSize: 6, reloadTime: 2.4, critRate: 0.03, critDamage: 1.8, knockback: 120, explosionRadius: 105, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 7, fixedTrait: '范围爆破：命中造成范围伤害和眩晕', traits: ['范围清怪', '击退眩晕', '慢速弹道'] },
  { key: 'flamethrower', name: '炼狱火焰喷射器', category: '火焰喷射器', rarity: '传说', level: 1, unlockLevel: 35, damage: 8, fireRate: 12, range: 285, bulletSpeed: 520, pierce: 4, spread: 0.34, projectiles: 3, element: '火焰', statusChance: 0.46, attackPattern: 'cone', magazineSize: 80, reloadTime: 2.6, critRate: 0, critDamage: 1.5, knockback: 4, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 8, fixedTrait: '烈焰覆盖：灼烧可刷新并提高层级', traits: ['持续火焰', '扇面压制', '灼烧叠加'] },
  { key: 'electromagnetic-rifle', name: '雷链电磁枪', category: '电磁枪', rarity: '传说', level: 1, unlockLevel: 50, damage: 28, fireRate: 3.4, range: 720, bulletSpeed: 900, pierce: 0, spread: 0.035, projectiles: 1, element: '电击', statusChance: 0.5, attackPattern: 'chain', magazineSize: 18, reloadTime: 1.9, critRate: 0.06, critDamage: 1.85, knockback: 10, explosionRadius: 0, chainCount: 4, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 8, fixedTrait: '雷链：命中后自动传导多个目标', traits: ['多目标连锁', '高感电率', '群体传导'] },
  { key: 'laser-rifle', name: '棱镜激光枪', category: '激光枪', rarity: '神话', level: 1, unlockLevel: 70, damage: 7, fireRate: 18, range: 820, bulletSpeed: 1500, pierce: 2, spread: 0, projectiles: 1, element: '能量', statusChance: 0.36, attackPattern: 'beam', magazineSize: 120, reloadTime: 2.8, critRate: 0.05, critDamage: 1.7, knockback: 0, explosionRadius: 0, chainCount: 0, chargeTime: 0, maxLevel: 120, maxStars: 5, slotCount: 8, fixedTrait: '持续锁定：连续命中同一目标提高伤害', traits: ['即时光束', '能量破甲', '持续锁定'] },
  { key: 'plasma-cannon', name: '虚空等离子炮', category: '等离子炮', rarity: '神话', level: 1, unlockLevel: 100, damage: 165, fireRate: 0.48, range: 850, bulletSpeed: 580, pierce: 2, spread: 0.02, projectiles: 1, element: '能量', statusChance: 0.62, attackPattern: 'charged', magazineSize: 4, reloadTime: 3.4, critRate: 0.08, critDamage: 2.1, knockback: 135, explosionRadius: 145, chainCount: 0, chargeTime: 0.85, maxLevel: 120, maxStars: 5, slotCount: 8, fixedTrait: '蓄能湮灭：蓄力完成造成大范围能量爆发', traits: ['蓄力重击', '范围爆发', '无视护甲'] }
]

export const starterWeapon = weaponCatalog[0]

export function weaponHitCanChain(weapon: WeaponDefinition, shockSeconds: number, chainCount = weapon.chainCount) {
  if (chainCount <= 0) return false
  return weapon.key !== 'storm-smg' || shockSeconds > 0
}

export function weaponRequiresCharge(weapon: WeaponDefinition) {
  return weapon.attackPattern === 'charged' && weapon.chargeTime > 0
}

export function emptyWeaponProgress(): WeaponProgressMap {
  return Object.fromEntries(weaponCatalog.map((weapon) => [weapon.key, { level: 1, stars: 0 }]))
}

export function normalizeWeaponProgress(saved?: Partial<WeaponProgressMap>): WeaponProgressMap {
  const result = emptyWeaponProgress()
  for (const weapon of weaponCatalog) {
    const value = saved?.[weapon.key]
    if (!value) continue
    result[weapon.key] = {
      level: Math.max(1, Math.min(weapon.maxLevel, Math.floor(Number(value.level) || 1))),
      stars: Math.max(0, Math.min(weapon.maxStars, Math.floor(Number(value.stars) || 0)))
    }
  }
  return result
}

export function weaponUpgradeCost(progress: WeaponProgress) {
  return { gold: 80 + progress.level * 35, parts: 1 + Math.floor(progress.level / 8) }
}

export function weaponStarCost(progress: WeaponProgress) {
  return { alloy: 3 + progress.stars * 4, parts: 8 + progress.stars * 6 }
}

export function applyWeaponProgress(definition: WeaponDefinition, progress: WeaponProgress): WeaponDefinition {
  const levelScale = 1 + (progress.level - 1) * 0.035
  const starScale = 1 + progress.stars * 0.12
  return { ...definition, level: progress.level, damage: Math.round(definition.damage * levelScale * starScale * 100) / 100, traits: [...definition.traits] }
}

export const starterAttachments: Attachment[] = [
  { name: '聚束枪口', slot: '枪口', rarity: '稀有', effect: '伤害 +6%', bonuses: { damage: 0.06 } },
  { name: '快速弹匣', slot: '弹匣', rarity: '精良', effect: '射速 +8%', bonuses: { fireRate: 0.08 } },
  { name: '穿甲枪管', slot: '枪管', rarity: '稀有', effect: '穿透 +1', bonuses: { pierce: 1 }, setKey: '穿甲猎手' },
  { name: '训练芯片', slot: '芯片', rarity: '普通', effect: '经验 +5%', bonuses: { expGain: 0.05 } }
]

export const inventoryPreview: Attachment[] = [
  { name: '燃烧弹芯', slot: '弹芯', rarity: '稀有', effect: '伤害 +10%', bonuses: { damage: 0.1 }, setKey: '赤焰清道夫' },
  { name: '生命模块', slot: '模块', rarity: '稀有', effect: '最大生命 +18', bonuses: { maxHp: 18 }, setKey: '血色幸存者' },
  { name: '红点瞄具', slot: '瞄具', rarity: '精良', effect: '射速 +6%', bonuses: { fireRate: 0.06 } },
  { name: '稳定枪托', slot: '枪托', rarity: '精良', effect: '移速 +7%', bonuses: { speed: 0.07 } }
]

const setAttachments: Attachment[] = [
  { name: '余烬制退器', slot: '枪口', rarity: '史诗', effect: '伤害 +18% / 暴击率 +5%', bonuses: { damage: 0.18, critRate: 0.05 }, setKey: '赤焰清道夫' },
  { name: '裂变弹芯', slot: '弹芯', rarity: '传说', effect: '伤害 +28% / 暴击率 +8%', bonuses: { damage: 0.28, critRate: 0.08 }, setKey: '赤焰清道夫', specialEffectKey: 'status-spread', specialEffect: '异常目标被击败时扩散元素状态' },
  { name: '熔炉模块', slot: '模块', rarity: '史诗', effect: '射速 +14%', bonuses: { fireRate: 0.14 }, setKey: '赤焰清道夫' },
  { name: '焦土枪管', slot: '枪管', rarity: '传说', effect: '伤害 +24% / 穿透 +1', bonuses: { damage: 0.24, pierce: 1 }, setKey: '赤焰清道夫' },
  { name: '雷暴线圈', slot: '模块', rarity: '史诗', effect: '射速 +16% / 暴击率 +4%', bonuses: { fireRate: 0.16, critRate: 0.04 }, setKey: '雷暴执行者' },
  { name: '电磁弹芯', slot: '弹芯', rarity: '史诗', effect: '射速 +12%', bonuses: { fireRate: 0.12 }, setKey: '雷暴执行者' },
  { name: '风暴枪口', slot: '枪口', rarity: '传说', effect: '伤害 +18% / 射速 +12%', bonuses: { damage: 0.18, fireRate: 0.12 }, setKey: '雷暴执行者', specialEffectKey: 'storm-impact', specialEffect: '连续命中 8 次触发范围冲击波' },
  { name: '量子弹匣', slot: '弹匣', rarity: '神话', effect: '射速 +24% / 暴击率 +8%', bonuses: { fireRate: 0.24, critRate: 0.08 }, setKey: '雷暴执行者', specialEffectKey: 'quantum-magazine', specialEffect: '每第 6 发不消耗弹药并附加 35% 伤害' },
  { name: '轨道枪管', slot: '枪管', rarity: '传说', effect: '伤害 +22% / 穿透 +2', bonuses: { damage: 0.22, pierce: 2 }, setKey: '穿甲猎手', specialEffectKey: 'no-pierce-falloff', specialEffect: '穿透伤害不再衰减' },
  { name: '弱点分析镜', slot: '瞄具', rarity: '传说', effect: '暴击率 +12%', bonuses: { critRate: 0.12 }, setKey: '穿甲猎手' },
  { name: '猎头枪口', slot: '枪口', rarity: '传说', effect: '伤害 +20% / 暴击率 +8%', bonuses: { damage: 0.2, critRate: 0.08 }, setKey: '穿甲猎手' },
  { name: '虚空弹芯', slot: '弹芯', rarity: '神话', effect: '伤害 +42% / 穿透 +2', bonuses: { damage: 0.42, pierce: 2 }, setKey: '穿甲猎手', specialEffectKey: 'void-ammo', specialEffect: '部分伤害转为能量，至少无视 50% 护甲减伤' },
  { name: '血契模块', slot: '模块', rarity: '史诗', effect: '最大生命 +42', bonuses: { maxHp: 42 }, setKey: '血色幸存者' },
  { name: '相位枪托', slot: '枪托', rarity: '神话', effect: '移速 +18% / 最大生命 +36', bonuses: { speed: 0.18, maxHp: 36 }, setKey: '血色幸存者', specialEffectKey: 'phase-dodge', specialEffect: '低于 30% 生命受击时触发 0.8 秒相位闪避，冷却 8 秒' },
  { name: '急救芯片', slot: '芯片', rarity: '史诗', effect: '最大生命 +38 / 拾取 +20', bonuses: { maxHp: 38, pickup: 20 }, setKey: '血色幸存者' },
  { name: '堡垒枪托', slot: '枪托', rarity: '传说', effect: '最大生命 +54', bonuses: { maxHp: 54 }, setKey: '血色幸存者', specialEffectKey: 'fortress', specialEffect: '静止 1 秒获得 18% 最大生命护盾与 15% 增伤' },
  { name: '血色弹匣', slot: '弹匣', rarity: '传说', effect: '射速 +14% / 最大生命 +24', bonuses: { fireRate: 0.14, maxHp: 24 }, setKey: '血色幸存者' },
  { name: '财阀芯片', slot: '芯片', rarity: '传说', effect: '经验 +24% / 伤害 +12%', bonuses: { expGain: 0.24, damage: 0.12 }, setKey: '黄金后勤', specialEffectKey: 'gold-conversion', specialEffect: '金币收益 +15%，每 500 金币提供 1% 伤害，最多 20%' },
  { name: '幸运瞄具', slot: '瞄具', rarity: '史诗', effect: '暴击率 +9% / 经验 +12%', bonuses: { critRate: 0.09, expGain: 0.12 }, setKey: '黄金后勤' },
  { name: '回收磁环', slot: '模块', rarity: '精良', effect: '拾取 +28', bonuses: { pickup: 28 }, setKey: '黄金后勤' },
  { name: '终局芯片', slot: '芯片', rarity: '神话', effect: '射速 +24% / 经验 +30%', bonuses: { fireRate: 0.24, expGain: 0.3 }, setKey: '黄金后勤', specialEffectKey: 'dominant-set', specialEffect: '最高件数套装的数值效果提高 50%' },
  { name: '黄金弹匣', slot: '弹匣', rarity: '传说', effect: '经验 +18% / 射速 +12%', bonuses: { expGain: 0.18, fireRate: 0.12 }, setKey: '黄金后勤' },
  { name: '黑域瞄具', slot: '瞄具', rarity: '传说', effect: '伤害 +20% / 暴击率 +10%', bonuses: { damage: 0.2, critRate: 0.1 }, setKey: '黑域终端' },
  { name: '死线模块', slot: '模块', rarity: '神话', effect: '伤害 +36% / 最大生命 +30', bonuses: { damage: 0.36, maxHp: 30 }, setKey: '黑域终端', specialEffectKey: 'last-stand', specialEffect: '低于 25% 生命触发 5 秒死线增幅：伤害 +30%、吸血 +5%，冷却 15 秒' },
  { name: '黑洞模块', slot: '模块', rarity: '神话', effect: '伤害 +32% / 拾取 +36', bonuses: { damage: 0.32, pickup: 36 }, setKey: '黑域终端', specialEffectKey: 'black-hole', specialEffect: '每 8 秒牵引附近敌人并造成范围伤害' },
  { name: '战术 AI 芯片', slot: '芯片', rarity: '传说', effect: '射速 +20% / 暴击率 +7%', bonuses: { fireRate: 0.2, critRate: 0.07 }, setKey: '黑域终端', specialEffectKey: 'threat-targeting', specialEffect: '优先锁定 Boss、精英和远程高威胁目标' },
  { name: '黑域枪管', slot: '枪管', rarity: '神话', effect: '伤害 +34% / 穿透 +2', bonuses: { damage: 0.34, pierce: 2 }, setKey: '黑域终端', specialEffectKey: 'elite-overdrive', specialEffect: '击败精英后 6 秒伤害、射速、暴击和移速提高 25%' }
]

export const attachmentPool: Attachment[] = [
  ...starterAttachments,
  ...inventoryPreview,
  { name: '军规模块', slot: '模块', rarity: '稀有', effect: '射速 +12%', bonuses: { fireRate: 0.12 } },
  { name: '重型枪托', slot: '枪托', rarity: '稀有', effect: '最大生命 +30', bonuses: { maxHp: 30 } },
  { name: '高压弹头', slot: '弹芯', rarity: '史诗', effect: '伤害 +16%', bonuses: { damage: 0.16 } },
  { name: '贯通线圈', slot: '枪管', rarity: '史诗', effect: '穿透 +2', bonuses: { pierce: 2 } },
  { name: '战术记录仪', slot: '芯片', rarity: '稀有', effect: '经验 +12%', bonuses: { expGain: 0.12 } },
  ...setAttachments
]
