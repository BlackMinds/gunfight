import { attachmentRarities, type Attachment } from './weapons'

export const BASE_INVENTORY_CAPACITY = 24

export type AttachmentReforgeCost = {
  parts: number
  gold: number
  alloy: number
}

const reforgeCosts: Record<Attachment['rarity'], AttachmentReforgeCost> = {
  普通: { parts: 2, gold: 40, alloy: 0 },
  精良: { parts: 5, gold: 70, alloy: 0 },
  稀有: { parts: 7, gold: 110, alloy: 0 },
  史诗: { parts: 10, gold: 160, alloy: 0 },
  传说: { parts: 14, gold: 260, alloy: 0 },
  神话: { parts: 18, gold: 420, alloy: 5 }
}

const lockAlloyCosts: Record<Attachment['rarity'], number> = {
  普通: 1,
  精良: 1,
  稀有: 2,
  史诗: 3,
  传说: 5,
  神话: 8
}

function overflowPriority(item: Attachment) {
  const rarity = Math.max(0, attachmentRarities.indexOf(item.rarity))
  const level = Math.max(0, item.level ?? 0)
  const roll = Math.max(0, item.roll ?? 0)
  return rarity * 10000 + level * 100 + roll
}

export function resolveAttachmentOverflow(items: Attachment[], protectedKeys: ReadonlySet<string> = new Set(), capacity = BASE_INVENTORY_CAPACITY) {
  if (items.length <= capacity) return { inventory: [...items], overflow: [] as Attachment[], unresolvedCount: 0 }

  const overflowCount = items.length - capacity
  const candidates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !protectedKeys.has(item.id ?? item.templateKey ?? item.name))
    .sort((a, b) => overflowPriority(a.item) - overflowPriority(b.item) || b.index - a.index)

  const selected = candidates.slice(0, overflowCount)

  const overflowIndexes = new Set(selected.map(({ index }) => index))
  const inventory = items.filter((_, index) => !overflowIndexes.has(index))
  return {
    inventory,
    overflow: selected.map(({ item }) => item),
    unresolvedCount: Math.max(0, inventory.length - capacity)
  }
}

export function getAttachmentReforgeCost(item: Attachment, lockAffix = false): AttachmentReforgeCost {
  const base = reforgeCosts[item.rarity]
  return {
    ...base,
    alloy: base.alloy + (lockAffix ? lockAlloyCosts[item.rarity] : 0)
  }
}

export function canAffordAttachmentReforge(resources: AttachmentReforgeCost, cost: AttachmentReforgeCost) {
  return resources.parts >= cost.parts && resources.gold >= cost.gold && resources.alloy >= cost.alloy
}

export function getAttachmentRecycleValue(item: Attachment) {
  const goldByRarity = [18, 32, 58, 96, 180, 320]
  const partsByRarity = [0, 1, 2, 4, 8, 14]
  const rank = Math.max(0, attachmentRarities.indexOf(item.rarity))
  return { gold: goldByRarity[rank] ?? 18, parts: (partsByRarity[rank] ?? 0) + Math.floor((item.level ?? 0) / 2) }
}
