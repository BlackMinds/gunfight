import {
  attachmentRarities,
  type Attachment,
  type AttachmentAffix,
  type AttachmentBonusKey,
  type AttachmentRarity
} from './weapons'

export type CompareRow = { label: string; current: string; next: string }
export type AttachmentDecisionTone = 'offense' | 'survival' | 'utility' | 'downgrade'
export type AttachmentDecision = {
  label: string
  summary: string
  actionLabel: '推荐装备' | '适合保留'
  tone: AttachmentDecisionTone
}
export type AttachmentDimension = {
  key: 'offense' | 'survival' | 'utility'
  label: '输出' | '生存' | '功能'
  current: number
  next: number
  delta: number
  summary: string
}
export const attachmentBuildTags = ['输出', '生存', '经济', '穿透'] as const
export type AttachmentBuildTag = (typeof attachmentBuildTags)[number]

type AttachmentBonusMap = NonNullable<Attachment['bonuses']>

const bonusLabels: Record<AttachmentBonusKey, string> = {
  damage: '伤害',
  fireRate: '射速',
  maxHp: '最大生命',
  pickup: '拾取',
  speed: '移速',
  pierce: '穿透',
  expGain: '经验',
  critRate: '暴击率',
  critDamage: '暴击伤害',
  magazine: '弹匣容量',
  reload: '换弹速度',
  range: '射程',
  knockback: '击退',
  statusChance: '异常概率',
  defense: '防御',
  armor: '护甲',
  luck: '幸运'
}

const subAffixBase: Record<AttachmentBonusKey, number> = {
  damage: 0.025,
  fireRate: 0.025,
  maxHp: 10,
  pickup: 12,
  speed: 0.025,
  pierce: 1,
  expGain: 0.03,
  critRate: 0.03,
  critDamage: 0.08,
  magazine: 0.08,
  reload: 0.05,
  range: 0.05,
  knockback: 0.08,
  statusChance: 0.04,
  defense: 6,
  armor: 14,
  luck: 3
}

const bonusKeys = Object.keys(bonusLabels) as AttachmentBonusKey[]

export function normalizeBonus(key: AttachmentBonusKey, value: number) {
  if (key === 'maxHp' || key === 'pickup' || key === 'defense' || key === 'armor' || key === 'luck') return Math.max(1, Math.round(value))
  if (key === 'pierce') return Math.max(1, Math.round(value))
  return Math.round(value * 1000) / 1000
}

export function attachmentRarityScale(rarity: AttachmentRarity) {
  return [0.78, 1, 1.28, 1.68, 2.15, 2.75][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
}

function subAffixCountFor(rarity: AttachmentRarity) {
  return [1, 2, 3, 4, 5, 6][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
}

export function createAffix(key: AttachmentBonusKey, value: number, tier: AttachmentAffix['tier']): AttachmentAffix {
  return { key, label: bonusLabels[key], value: normalizeBonus(key, value), tier }
}

export function createMainAffix(template: Attachment, rarity: AttachmentRarity, roll: number) {
  const rarityScale = attachmentRarityScale(rarity) / (attachmentRarityScale(template.rarity) || 1)
  const mainEntry = (Object.entries(template.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>)[0]
  const mainKey = mainEntry?.[0] ?? 'damage'
  return createAffix(mainKey, (mainEntry?.[1] ?? subAffixBase[mainKey]) * rarityScale * roll, '主词条')
}

export function rollSubAffixes(
  rarity: AttachmentRarity,
  mainKey: AttachmentBonusKey,
  random: () => number,
  lockedAffix?: AttachmentAffix
) {
  const rank = Math.max(0, attachmentRarities.indexOf(rarity))
  const available = bonusKeys.filter((key) => key !== mainKey && key !== lockedAffix?.key)
  const affixes: AttachmentAffix[] = lockedAffix ? [{ ...lockedAffix }] : []
  for (let i = affixes.length; i < subAffixCountFor(rarity); i++) {
    const key = available.splice(Math.floor(random() * available.length), 1)[0] ?? mainKey
    const roll = 0.78 + random() * 0.44
    const rankScale = 0.82 + rank * 0.22
    affixes.push(createAffix(key, subAffixBase[key] * rankScale * roll, '副词条'))
  }
  return affixes
}

export function combineAffixBonuses(mainAffix: AttachmentAffix | undefined, subAffixes: AttachmentAffix[] | undefined) {
  const bonuses: AttachmentBonusMap = {}
  for (const affix of [mainAffix, ...(subAffixes ?? [])]) {
    if (!affix) continue
    bonuses[affix.key] = normalizeBonus(affix.key, (bonuses[affix.key] ?? 0) + affix.value)
  }
  return bonuses
}

export function formatAttachmentEffect(bonuses: Attachment['bonuses']) {
  if (!bonuses) return ''
  return (Object.entries(bonuses) as Array<[AttachmentBonusKey, number]>)
    .filter(([, value]) => value)
    .map(([key, value]) => formatBonusValue(key, value))
    .join(' / ')
}

export function formatBonusValue(key: AttachmentBonusKey, value?: number) {
  if (!value) return key === 'pierce' ? '无穿透' : '无'
  if (key === 'damage') return `伤害 +${Math.round(value * 100)}%`
  if (key === 'fireRate') return `射速 +${Math.round(value * 100)}%`
  if (key === 'maxHp') return `最大生命 +${value}`
  if (key === 'pickup') return `拾取 +${value}`
  if (key === 'speed') return `移速 +${Math.round(value * 100)}%`
  if (key === 'pierce') return `穿透 +${value}`
  if (key === 'critRate') return `暴击率 +${Math.round(value * 100)}%`
  if (key === 'critDamage') return `暴击伤害 +${Math.round(value * 100)}%`
  if (key === 'magazine') return `弹匣容量 +${Math.round(value * 100)}%`
  if (key === 'reload') return `换弹速度 +${Math.round(value * 100)}%`
  if (key === 'range') return `射程 +${Math.round(value * 100)}%`
  if (key === 'knockback') return `击退 +${Math.round(value * 100)}%`
  if (key === 'statusChance') return `异常概率 +${Math.round(value * 100)}%`
  if (key === 'defense') return `防御 +${value}`
  if (key === 'armor') return `护甲 +${value}`
  if (key === 'luck') return `幸运 +${value}`
  return `经验 +${Math.round(value * 100)}%`
}

export function formatAffix(affix: AttachmentAffix) {
  return formatBonusValue(affix.key, affix.value)
}

export function buildAttachmentComparison(current: Attachment | undefined, next: Attachment): CompareRow[] {
  const keys = ['damage', 'fireRate', 'critRate', 'critDamage', 'magazine', 'reload', 'range', 'knockback', 'statusChance', 'maxHp', 'defense', 'armor', 'luck', 'pickup', 'speed', 'pierce', 'expGain'] as const
  return keys
    .filter((key) => (current?.bonuses?.[key] ?? 0) !== 0 || (next.bonuses?.[key] ?? 0) !== 0)
    .map((key) => ({
      label: {
        damage: '伤害',
        fireRate: '射速',
        critRate: '暴击',
        critDamage: '暴伤',
        magazine: '弹匣',
        reload: '换弹',
        range: '射程',
        knockback: '击退',
        statusChance: '异常',
        maxHp: '生命',
        pickup: '拾取',
        speed: '移速',
        pierce: '穿透',
        expGain: '经验',
        defense: '防御',
        armor: '护甲',
        luck: '幸运'
      }[key],
      current: formatBonusValue(key, current?.bonuses?.[key]),
      next: formatBonusValue(key, next.bonuses?.[key])
    }))
}

export function buildAttachmentDimensions(current: Attachment | undefined, next: Attachment): AttachmentDimension[] {
  const value = (item: Attachment | undefined, key: AttachmentBonusKey) => item?.bonuses?.[key] ?? 0
  const score = (item: Attachment | undefined) => ({
    offense: value(item, 'damage') * 100 + value(item, 'fireRate') * 80 + value(item, 'critRate') * 90 + value(item, 'critDamage') * 45 + value(item, 'magazine') * 25 + value(item, 'reload') * 30 + value(item, 'range') * 20 + value(item, 'knockback') * 12 + value(item, 'statusChance') * 45 + value(item, 'pierce') * 16,
    survival: value(item, 'maxHp') + value(item, 'speed') * 120 + value(item, 'defense') * 2 + value(item, 'armor'),
    utility: value(item, 'pickup') * 0.7 + value(item, 'expGain') * 120 + value(item, 'luck') * 4
  })
  const before = score(current)
  const after = score(next)
  return [
    { key: 'offense', label: '输出', current: before.offense, next: after.offense, delta: after.offense - before.offense, summary: '伤害、射速、暴击与穿透' },
    { key: 'survival', label: '生存', current: before.survival, next: after.survival, delta: after.survival - before.survival, summary: '生命、防御、护甲与移动容错' },
    { key: 'utility', label: '功能', current: before.utility, next: after.utility, delta: after.utility - before.utility, summary: '拾取、经验与幸运收益' }
  ].map((dimension) => ({ ...dimension, current: Math.round(dimension.current * 10) / 10, next: Math.round(dimension.next * 10) / 10, delta: Math.round(dimension.delta * 10) / 10 })) as AttachmentDimension[]
}

export function buildAttachmentTags(item: Attachment): AttachmentBuildTag[] {
  const bonuses = item.bonuses ?? {}
  const scores: Record<Exclude<AttachmentBuildTag, '穿透'>, number> = {
    输出: (bonuses.damage ?? 0) * 100 + (bonuses.fireRate ?? 0) * 80 + (bonuses.critRate ?? 0) * 90 + (bonuses.critDamage ?? 0) * 45 + (bonuses.magazine ?? 0) * 25 + (bonuses.reload ?? 0) * 30 + (bonuses.range ?? 0) * 20 + (bonuses.knockback ?? 0) * 12 + (bonuses.statusChance ?? 0) * 45,
    生存: (bonuses.maxHp ?? 0) + (bonuses.speed ?? 0) * 120 + (bonuses.defense ?? 0) * 2 + (bonuses.armor ?? 0),
    经济: (bonuses.pickup ?? 0) * 0.7 + (bonuses.expGain ?? 0) * 120 + (bonuses.luck ?? 0) * 4
  }
  const tags: AttachmentBuildTag[] = []
  if ((bonuses.pierce ?? 0) > 0 || item.specialEffectKey === 'no-pierce-falloff' || item.specialEffectKey === 'void-ammo') tags.push('穿透')
  const ranked = (Object.entries(scores) as Array<[Exclude<AttachmentBuildTag, '穿透'>, number]>)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || attachmentBuildTags.indexOf(a[0]) - attachmentBuildTags.indexOf(b[0]))
  for (const [tag] of ranked) {
    if (tags.length >= 2) break
    tags.push(tag)
  }
  return tags.length ? tags : ['输出']
}

export function buildAttachmentDecision(current: Attachment | undefined, next: Attachment): AttachmentDecision {
  const currentBonus = current?.bonuses ?? {}
  const nextBonus = next.bonuses ?? {}
  const delta = {
    damage: (nextBonus.damage ?? 0) - (currentBonus.damage ?? 0),
    fireRate: (nextBonus.fireRate ?? 0) - (currentBonus.fireRate ?? 0),
    maxHp: (nextBonus.maxHp ?? 0) - (currentBonus.maxHp ?? 0),
    pickup: (nextBonus.pickup ?? 0) - (currentBonus.pickup ?? 0),
    speed: (nextBonus.speed ?? 0) - (currentBonus.speed ?? 0),
    pierce: (nextBonus.pierce ?? 0) - (currentBonus.pierce ?? 0),
    expGain: (nextBonus.expGain ?? 0) - (currentBonus.expGain ?? 0),
    critRate: (nextBonus.critRate ?? 0) - (currentBonus.critRate ?? 0),
    critDamage: (nextBonus.critDamage ?? 0) - (currentBonus.critDamage ?? 0),
    magazine: (nextBonus.magazine ?? 0) - (currentBonus.magazine ?? 0),
    reload: (nextBonus.reload ?? 0) - (currentBonus.reload ?? 0),
    range: (nextBonus.range ?? 0) - (currentBonus.range ?? 0),
    knockback: (nextBonus.knockback ?? 0) - (currentBonus.knockback ?? 0),
    statusChance: (nextBonus.statusChance ?? 0) - (currentBonus.statusChance ?? 0),
    defense: (nextBonus.defense ?? 0) - (currentBonus.defense ?? 0),
    armor: (nextBonus.armor ?? 0) - (currentBonus.armor ?? 0),
    luck: (nextBonus.luck ?? 0) - (currentBonus.luck ?? 0)
  }
  const rarityDelta = attachmentRarities.indexOf(next.rarity) - (current ? attachmentRarities.indexOf(current.rarity) : -1)
  const offenseScore = delta.damage * 100 + delta.fireRate * 80 + delta.critRate * 90 + delta.critDamage * 45 + delta.magazine * 25 + delta.reload * 30 + delta.range * 20 + delta.knockback * 12 + delta.statusChance * 45 + delta.pierce * 16
  const survivalScore = delta.maxHp + delta.speed * 120 + delta.defense * 2 + delta.armor
  const utilityScore = delta.pickup * 0.7 + delta.expGain * 120 + delta.luck * 4
  const hasMajorGain = rarityDelta > 0 || delta.damage >= 0.04 || delta.fireRate >= 0.06 || delta.critRate >= 0.03 || delta.pierce >= 1 || delta.maxHp >= 15 || delta.defense >= 6 || delta.armor >= 14 || delta.luck >= 3 || delta.pickup >= 18 || delta.expGain >= 0.05 || delta.speed >= 0.06
  const hasAnyGain = offenseScore > 0 || survivalScore > 0 || utilityScore > 0
  const mostlyLoss = rarityDelta < 0 && offenseScore <= 0 && survivalScore <= 0 && utilityScore <= 0

  if (mostlyLoss || (!hasAnyGain && rarityDelta <= 0 && current)) {
    return {
      label: '可能降级',
      summary: rarityDelta < 0 ? `品质低于当前 ${current?.rarity ?? '装备'}，建议先留背包。` : '关键属性没有明显增益，暂时不急着换。',
      actionLabel: '适合保留',
      tone: 'downgrade'
    }
  }

  if (offenseScore >= survivalScore && offenseScore >= utilityScore && offenseScore > 0) {
    return {
      label: '输出提升',
      summary: delta.pierce > 0 ? '穿透或火力更强，清怪效率会更好。' : '伤害、射速或暴击更高，适合直接强化火力。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'offense'
    }
  }

  if (survivalScore >= utilityScore && survivalScore > 0) {
    return {
      label: '生存提升',
      summary: delta.maxHp > 0 ? '最大生命更高，容错会更稳。' : '机动性更好，走位压力会降低。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'survival'
    }
  }

  return {
    label: '功能向替换',
    summary: delta.expGain > 0 ? '偏向经验收益，适合刷成长。' : '偏向拾取或节奏收益，适合特定推关需求。',
    actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
    tone: 'utility'
  }
}

export function attachmentPowerScore(item: Attachment) {
  return buildAttachmentDimensions(undefined, item).reduce((sum, dimension) => sum + dimension.next, 0) + attachmentRarities.indexOf(item.rarity) * 12 + (item.level ?? 0) * 2 + (item.stars ?? 0) * 8
}

export function attachmentRarityRank(item: Pick<Attachment, 'rarity'>) {
  return attachmentRarities.indexOf(item.rarity)
}

export function attachmentMaxLevel(item: Attachment) {
  return [3, 5, 7, 10, 15, 20][attachmentRarityRank(item)] ?? 3
}

export function attachmentUpgradeCost(item: Attachment) {
  return 1 + Math.floor((item.level ?? 0) / 2) + attachmentRarityRank(item)
}
