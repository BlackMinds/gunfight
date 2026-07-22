import type { Attachment } from './weapons'

export type AdvancedResources = { honor: number; precision: number; energyCores: number; reforgeChips: number }
export const emptyAdvancedResources = (): AdvancedResources => ({ honor: 0, precision: 0, energyCores: 0, reforgeChips: 0 })
export function normalizeAdvancedResources(saved?: Partial<AdvancedResources>): AdvancedResources {
  const base = emptyAdvancedResources()
  for (const key of Object.keys(base) as Array<keyof AdvancedResources>) base[key] = Math.max(0, Math.floor(Number(saved?.[key]) || 0))
  return base
}

export type SkillProgress = Record<'dash' | 'overload' | 'pulse', number>
export const emptySkillProgress = (): SkillProgress => ({ dash: 1, overload: 1, pulse: 1 })
export function normalizeSkillProgress(saved?: Partial<SkillProgress>): SkillProgress {
  const result = emptySkillProgress()
  for (const key of Object.keys(result) as Array<keyof SkillProgress>) result[key] = Math.max(1, Math.min(5, Math.floor(Number(saved?.[key]) || 1)))
  return result
}
export function skillUpgradeCost(level: number) { return { gold: 300 + level * 220, precision: 2 + level } }

export function attachmentStarCost(item: Attachment) {
  const stars = Math.max(0, item.stars ?? 0)
  return { gold: 500 + stars * 400, precision: 3 + stars * 2 }
}
export function attachmentCanStar(item: Attachment) { return ['史诗', '传说', '神话'].includes(item.rarity) && (item.stars ?? 0) < 3 }
export function attachmentCanBreakthrough(item: Attachment, maxLevel: number) { return ['传说', '神话'].includes(item.rarity) && (item.level ?? 0) >= maxLevel && (item.stars ?? 0) >= 3 && !item.breakthrough }
export function attachmentBreakthroughCost(item: Attachment) { return { precision: item.rarity === '神话' ? 14 : 10, energyCores: item.rarity === '神话' ? 2 : 0 } }

export type ShopOfferId = 'precision-kit' | 'reforge-cache' | 'attachment-crate'
export type ShopState = { stock: Record<ShopOfferId, number> }
export const shopOffers = [
  { id: 'precision-kit', label: '精密元件补给', detail: '获得 3 精密元件', cost: { gold: 650, honor: 0 }, grant: { precision: 3, reforgeChips: 0 } },
  { id: 'reforge-cache', label: '重铸芯片箱', detail: '获得 2 重铸芯片', cost: { gold: 0, honor: 18 }, grant: { precision: 0, reforgeChips: 2 } },
  { id: 'attachment-crate', label: '高阶配件箱', detail: '获得 1 件史诗以上配件', cost: { gold: 0, honor: 45 }, grant: { precision: 0, reforgeChips: 0 } }
] as const
export const emptyShopState = (): ShopState => ({ stock: { 'precision-kit': 3, 'reforge-cache': 2, 'attachment-crate': 1 } })
export function normalizeShopState(saved?: Partial<ShopState>): ShopState {
  const result = emptyShopState()
  for (const offer of shopOffers) {
    const savedStock = saved?.stock?.[offer.id]
    if (savedStock !== undefined) result.stock[offer.id] = Math.max(0, Math.min(result.stock[offer.id], Math.floor(Number(savedStock) || 0)))
  }
  return result
}

export type SeasonState = { id: string; score: number; eventClears: number; bestBountySeconds: number | null; bestSurvivalKills: number }
export const emptySeasonState = (): SeasonState => ({ id: 'S1-终局前线', score: 0, eventClears: 0, bestBountySeconds: null, bestSurvivalKills: 0 })
export function normalizeSeasonState(saved?: Partial<SeasonState>): SeasonState {
  const base = emptySeasonState()
  return { id: base.id, score: Math.max(0, Math.floor(Number(saved?.score) || 0)), eventClears: Math.max(0, Math.floor(Number(saved?.eventClears) || 0)), bestBountySeconds: saved?.bestBountySeconds == null ? null : Math.max(0, Number(saved.bestBountySeconds) || 0), bestSurvivalKills: Math.max(0, Math.floor(Number(saved?.bestSurvivalKills) || 0)) }
}
export function seasonTier(score: number) { return score >= 1200 ? '传奇' : score >= 600 ? '精英' : score >= 250 ? '先锋' : '新兵' }

export function eventClearRewards(previousEventClears: number) {
  const firstClear = previousEventClears <= 0
  return {
    firstClear,
    precision: 2,
    energyCores: firstClear ? 1 : 0,
    seasonScore: firstClear ? 100 : 0
  }
}
