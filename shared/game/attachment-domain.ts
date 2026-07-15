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

type AttachmentBonusMap = NonNullable<Attachment['bonuses']>

const bonusLabels: Record<AttachmentBonusKey, string> = {
  damage: '伤害',
  fireRate: '射速',
  maxHp: '最大生命',
  pickup: '拾取',
  speed: '移速',
  pierce: '穿透',
  expGain: '经验',
  critRate: '暴击率'
}

const subAffixBase: Record<AttachmentBonusKey, number> = {
  damage: 0.025,
  fireRate: 0.025,
  maxHp: 10,
  pickup: 12,
  speed: 0.025,
  pierce: 1,
  expGain: 0.03,
  critRate: 0.03
}

const bonusKeys = Object.keys(bonusLabels) as AttachmentBonusKey[]

export function normalizeBonus(key: AttachmentBonusKey, value: number) {
  if (key === 'maxHp' || key === 'pickup') return Math.max(1, Math.round(value))
  if (key === 'pierce') return Math.max(1, Math.round(value))
  return Math.round(value * 1000) / 1000
}

export function attachmentRarityScale(rarity: AttachmentRarity) {
  return [0.78, 1, 1.28, 1.68][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
}

function subAffixCountFor(rarity: AttachmentRarity) {
  return [1, 2, 3, 4][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
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
  return `经验 +${Math.round(value * 100)}%`
}

export function formatAffix(affix: AttachmentAffix) {
  return formatBonusValue(affix.key, affix.value)
}

export function buildAttachmentComparison(current: Attachment | undefined, next: Attachment): CompareRow[] {
  const keys = ['damage', 'fireRate', 'critRate', 'maxHp', 'pickup', 'speed', 'pierce', 'expGain'] as const
  return keys
    .filter((key) => (current?.bonuses?.[key] ?? 0) !== 0 || (next.bonuses?.[key] ?? 0) !== 0)
    .map((key) => ({
      label: {
        damage: '伤害',
        fireRate: '射速',
        critRate: '暴击',
        maxHp: '生命',
        pickup: '拾取',
        speed: '移速',
        pierce: '穿透',
        expGain: '经验'
      }[key],
      current: formatBonusValue(key, current?.bonuses?.[key]),
      next: formatBonusValue(key, next.bonuses?.[key])
    }))
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
    critRate: (nextBonus.critRate ?? 0) - (currentBonus.critRate ?? 0)
  }
  const rarityDelta = attachmentRarities.indexOf(next.rarity) - (current ? attachmentRarities.indexOf(current.rarity) : -1)
  const offenseScore = delta.damage * 100 + delta.fireRate * 80 + delta.critRate * 90 + delta.pierce * 16
  const survivalScore = delta.maxHp + delta.speed * 120
  const utilityScore = delta.pickup * 0.7 + delta.expGain * 120
  const hasMajorGain = rarityDelta > 0 || delta.damage >= 0.04 || delta.fireRate >= 0.06 || delta.critRate >= 0.03 || delta.pierce >= 1 || delta.maxHp >= 15 || delta.pickup >= 18 || delta.expGain >= 0.05 || delta.speed >= 0.06
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

export function attachmentRarityRank(item: Pick<Attachment, 'rarity'>) {
  return attachmentRarities.indexOf(item.rarity)
}

export function attachmentMaxLevel(item: Attachment) {
  return [3, 5, 7, 10][attachmentRarityRank(item)] ?? 3
}

export function attachmentUpgradeCost(item: Attachment) {
  return 1 + Math.floor((item.level ?? 0) / 2) + attachmentRarityRank(item)
}
