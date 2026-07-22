import type { EnemyKind } from './formulas'
import type { WeaponElement } from './weapons'

export type EnemyFaction = 'outlaw' | 'mercenary' | 'machine' | 'mutant' | 'black-domain'

export type EnemyFactionDefinition = {
  id: EnemyFaction
  label: string
  color: string
  summary: string
  statusDurationMultiplier: number
  elementMultipliers: Partial<Record<WeaponElement, number>>
}

export const enemyFactionDefinitions: Record<EnemyFaction, EnemyFactionDefinition> = {
  outlaw: { id: 'outlaw', label: '暴徒', color: '#c66a4d', summary: '群聚后移动更快，惧怕爆炸清场', statusDurationMultiplier: 1, elementMultipliers: { 爆炸: 1.1 } },
  mercenary: { id: 'mercenary', label: '雇佣兵', color: '#d2aa48', summary: '编队提高行动速率，能量武器可破阵', statusDurationMultiplier: 0.95, elementMultipliers: { 物理: 0.92, 能量: 1.08 } },
  machine: { id: 'machine', label: '机械军团', color: '#69b9d8', summary: '方阵减伤且抗毒，电击可过载装甲', statusDurationMultiplier: 0.85, elementMultipliers: { 物理: 0.85, 电击: 1.2, 毒素: 0.5 } },
  mutant: { id: 'mutant', label: '变异体', color: '#91cf62', summary: '低生命狂潮，火焰克制再生组织', statusDurationMultiplier: 0.9, elementMultipliers: { 毒素: 0.75, 火焰: 1.15 } },
  'black-domain': { id: 'black-domain', label: '黑域部队', color: '#a88ce8', summary: '共振加快攻击并抵抗能量与状态', statusDurationMultiplier: 0.75, elementMultipliers: { 能量: 0.8, 物理: 1.05 } }
}

export function enemyFactionFor(stage: number, _kind?: EnemyKind): EnemyFaction {
  if (stage >= 7501) return 'black-domain'
  if (stage >= 5001) return 'mutant'
  if (stage >= 2001) return 'machine'
  if (stage >= 501) return 'mercenary'
  return 'outlaw'
}

export function factionDamageMultiplier(faction: EnemyFaction, element: WeaponElement) {
  return enemyFactionDefinitions[faction].elementMultipliers[element] ?? 1
}

export function factionStatusDurationMultiplier(faction: EnemyFaction) {
  return enemyFactionDefinitions[faction].statusDurationMultiplier
}

export function factionFormationBonus(faction: EnemyFaction, nearbySameFaction: number, hpRatio = 1) {
  const active = nearbySameFaction >= 2
  if (!active) return { active: false, speedMultiplier: 1, actionRateMultiplier: 1, incomingDamageMultiplier: 1 }
  if (faction === 'outlaw') return { active: true, speedMultiplier: 1.08, actionRateMultiplier: 1, incomingDamageMultiplier: 1 }
  if (faction === 'mercenary') return { active: true, speedMultiplier: 1, actionRateMultiplier: 1.1, incomingDamageMultiplier: 1 }
  if (faction === 'machine') return { active: true, speedMultiplier: 1, actionRateMultiplier: 1, incomingDamageMultiplier: 0.9 }
  if (faction === 'mutant') return { active: true, speedMultiplier: 1, actionRateMultiplier: hpRatio <= 0.5 ? 1.15 : 1, incomingDamageMultiplier: 1 }
  return { active: true, speedMultiplier: 1, actionRateMultiplier: 1.12, incomingDamageMultiplier: 1 }
}
