export function defenseDamageMultiplier(defense: number) {
  const safeDefense = Math.max(0, Number(defense) || 0)
  return 100 / (100 + safeDefense)
}

export function absorbWithArmor(damage: number, armor: number, armorEfficiency = 1) {
  const safeDamage = Math.max(0, damage)
  const absorbable = safeDamage * Math.max(0, Math.min(1, armorEfficiency))
  const armorDamage = Math.min(Math.max(0, armor), absorbable)
  return { armorDamage, hpDamage: safeDamage - armorDamage, armorAfter: Math.max(0, armor - armorDamage) }
}

export function luckDropMultiplier(luck: number) {
  return 1 + Math.max(0, Math.min(60, luck)) / 200
}

export function luckRarityShift(luck: number) {
  return Math.max(0, Math.min(60, luck)) / 600
}
