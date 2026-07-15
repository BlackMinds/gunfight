import { attachmentRarities, type Attachment } from './weapons'

export const BASE_INVENTORY_CAPACITY = 24

export type AttachmentReforgeCost = {
  parts: number
  gold: number
  alloy: number
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
  const rank = Math.max(0, attachmentRarities.indexOf(item.rarity))
  const parts = 2 + rank * 2 + Math.floor((item.subAffixes?.length ?? 0) / 2)
  const gold = [40, 70, 110, 160][rank] ?? 40
  const alloy = lockAffix ? ([1, 1, 2, 3][rank] ?? 1) : 0
  return { parts, gold, alloy }
}

export function canAffordAttachmentReforge(resources: AttachmentReforgeCost, cost: AttachmentReforgeCost) {
  return resources.parts >= cost.parts && resources.gold >= cost.gold && resources.alloy >= cost.alloy
}
