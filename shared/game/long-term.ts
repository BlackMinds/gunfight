import type { Attachment, WeaponElement } from './weapons'

export type TalentId = 'firepower' | 'survival' | 'mobility' | 'engineering' | 'logistics'
export type TalentLevels = Record<TalentId, number>
export type TalentNode = {
  id: TalentId
  branch: string
  name: string
  description: string
  maxLevel: number
}

export const talentNodes: TalentNode[] = [
  { id: 'firepower', branch: '火力', name: '弹道校准', description: '每级伤害 +4%', maxLevel: 5 },
  { id: 'survival', branch: '生存', name: '复合护层', description: '每级最大生命 +10', maxLevel: 5 },
  { id: 'mobility', branch: '机动', name: '轻量骨架', description: '每级移动速度 +3%', maxLevel: 5 },
  { id: 'engineering', branch: '工程', name: '元素增幅', description: '每级异常伤害和持续时间 +8%', maxLevel: 5 },
  { id: 'logistics', branch: '后勤', name: '自动后勤', description: '每级金币与离线收益 +6%', maxLevel: 5 }
]

export const emptyTalentLevels = (): TalentLevels => ({ firepower: 0, survival: 0, mobility: 0, engineering: 0, logistics: 0 })

export function normalizeTalentLevels(value?: Partial<TalentLevels>): TalentLevels {
  return talentNodes.reduce((levels, node) => {
    levels[node.id] = Math.max(0, Math.min(node.maxLevel, Math.floor(Number(value?.[node.id]) || 0)))
    return levels
  }, emptyTalentLevels())
}

export function talentPointBudget(playerLevel: number, highestCleared: number) {
  return Math.floor(Math.max(0, playerLevel - 1) / 2) + Math.floor(Math.max(0, highestCleared) / 10)
}

export function talentBonuses(levels: TalentLevels) {
  return {
    damage: levels.firepower * 0.04,
    maxHp: levels.survival * 10,
    speed: levels.mobility * 0.03,
    statusPower: levels.engineering * 0.08,
    goldGain: levels.logistics * 0.06,
    offlineGain: levels.logistics * 0.06
  }
}

export type SetSummary = {
  key: NonNullable<Attachment['setKey']>
  count: number
  nextThreshold: number | null
  effects: string[]
  bonuses: { damage: number; fireRate: number; pierce: number; statusPower: number; goldGain: number }
}

const setDefinitions: Record<NonNullable<Attachment['setKey']>, { two: string; four: string }> = {
  赤焰清道夫: { two: '火焰与灼烧伤害 +15%', four: '灼烧目标被击败时引发爆燃' },
  雷暴执行者: { two: '感电概率 +10%', four: '连锁电击额外跳跃 2 次' },
  穿甲猎手: { two: '穿透 +1', four: '穿透后的伤害衰减降低' },
  黄金后勤: { two: '金币收益 +20%', four: '通关奖励有 12% 概率翻倍' }
}

export function summarizeSets(equipped: Attachment[]): SetSummary[] {
  const counts = equipped.reduce<Partial<Record<NonNullable<Attachment['setKey']>, number>>>((result, item) => {
    if (item.setKey) result[item.setKey] = (result[item.setKey] ?? 0) + 1
    return result
  }, {})
  return (Object.entries(setDefinitions) as Array<[NonNullable<Attachment['setKey']>, { two: string; four: string }]>).map(([key, definition]) => {
    const count = counts[key] ?? 0
    const effects = [count >= 2 ? definition.two : `2 件：${definition.two}`, count >= 4 ? definition.four : `4 件：${definition.four}`]
    const bonuses = { damage: 0, fireRate: 0, pierce: 0, statusPower: 0, goldGain: 0 }
    if (count >= 2 && key === '赤焰清道夫') bonuses.statusPower += 0.15
    if (count >= 2 && key === '雷暴执行者') bonuses.fireRate += 0.1
    if (count >= 2 && key === '穿甲猎手') bonuses.pierce += 1
    if (count >= 2 && key === '黄金后勤') bonuses.goldGain += 0.2
    if (count >= 4) bonuses.damage += 0.12
    return { key, count, nextThreshold: count < 2 ? 2 : count < 4 ? 4 : null, effects, bonuses }
  })
}

export function combinedSetBonuses(equipped: Attachment[]) {
  return summarizeSets(equipped).reduce((total, set) => ({
    damage: total.damage + set.bonuses.damage,
    fireRate: total.fireRate + set.bonuses.fireRate,
    pierce: total.pierce + set.bonuses.pierce,
    statusPower: total.statusPower + set.bonuses.statusPower,
    goldGain: total.goldGain + set.bonuses.goldGain
  }), { damage: 0, fireRate: 0, pierce: 0, statusPower: 0, goldGain: 0 })
}

export type EnemyStatusState = {
  burnSeconds: number
  burnDps: number
  shockSeconds: number
  chillSeconds: number
}

export const emptyEnemyStatus = (): EnemyStatusState => ({ burnSeconds: 0, burnDps: 0, shockSeconds: 0, chillSeconds: 0 })

export function applyElementStatus(status: EnemyStatusState, element: WeaponElement, chance: number, rawDamage: number, power: number, random: () => number) {
  if (element === '物理' || random() >= chance) return null
  if (element === '火焰') {
    status.burnSeconds = Math.max(status.burnSeconds, 3 * power)
    status.burnDps = Math.max(status.burnDps, rawDamage * 0.22 * power)
    return '灼烧'
  }
  if (element === '电击') {
    status.shockSeconds = Math.max(status.shockSeconds, 2.2 * power)
    return '感电'
  }
  status.chillSeconds = Math.max(status.chillSeconds, 2.8 * power)
  return '冰缓'
}

export function tickEnemyStatus(status: EnemyStatusState, delta: number) {
  const burnDamage = status.burnSeconds > 0 ? status.burnDps * delta : 0
  status.burnSeconds = Math.max(0, status.burnSeconds - delta)
  status.shockSeconds = Math.max(0, status.shockSeconds - delta)
  status.chillSeconds = Math.max(0, status.chillSeconds - delta)
  return {
    burnDamage,
    damageTakenMultiplier: status.shockSeconds > 0 ? 1.12 : 1,
    speedMultiplier: status.chillSeconds > 0 ? 0.68 : 1
  }
}

export type OfflineReward = { elapsedSeconds: number; cappedSeconds: number; gold: number; exp: number; parts: number }

export function calculateOfflineReward(lastSeenAt: number, now: number, highestCleared: number, gainMultiplier = 1, capHours = 8): OfflineReward {
  const elapsedSeconds = Math.max(0, Math.floor((now - lastSeenAt) / 1000))
  const cappedSeconds = Math.min(elapsedSeconds, capHours * 3600)
  const stageFactor = 1 + Math.max(0, highestCleared) * 0.035
  const hours = cappedSeconds / 3600
  return {
    elapsedSeconds,
    cappedSeconds,
    gold: Math.floor(hours * 38 * stageFactor * gainMultiplier),
    exp: Math.floor(hours * 22 * stageFactor * gainMultiplier),
    parts: Math.floor(hours * 1.5 * gainMultiplier)
  }
}

export type TaskEvent = 'kill' | 'clear' | 'boss' | 'reforge'
export type DailyTask = {
  id: string
  label: string
  event: TaskEvent
  target: number
  progress: number
  claimed: boolean
  reward: { gold: number; alloy: number; parts: number }
}

export function dailyTaskKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function createDailyTasks(): DailyTask[] {
  return [
    { id: 'daily-kill', label: '击败 50 名敌人', event: 'kill', target: 50, progress: 0, claimed: false, reward: { gold: 80, alloy: 0, parts: 2 } },
    { id: 'daily-clear', label: '通关 2 个关卡', event: 'clear', target: 2, progress: 0, claimed: false, reward: { gold: 120, alloy: 1, parts: 0 } },
    { id: 'daily-reforge', label: '完成 1 次配件重铸', event: 'reforge', target: 1, progress: 0, claimed: false, reward: { gold: 60, alloy: 0, parts: 3 } }
  ]
}

export function normalizeDailyTasks(saved?: DailyTask[]) {
  const current = createDailyTasks()
  return current.map((task) => {
    const previous = saved?.find((item) => item.id === task.id)
    return previous ? { ...task, progress: Math.min(task.target, Math.max(0, previous.progress)), claimed: Boolean(previous.claimed) } : task
  })
}

export function recordTaskEvent(tasks: DailyTask[], event: TaskEvent, amount = 1) {
  for (const task of tasks) if (task.event === event && !task.claimed) task.progress = Math.min(task.target, task.progress + amount)
}
