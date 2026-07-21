import { attachmentRarities, equipmentSetKeys, type Attachment, type AttachmentRarity, type EquipmentSetKey, type WeaponElement } from './weapons'

export type TalentBranchId = 'firepower' | 'survival' | 'mobility' | 'engineering' | 'logistics'
export type TalentNodeId = `${TalentBranchId}-${string}`
export type TalentLevels = Record<TalentNodeId, number>
export type TalentNode = {
  id: TalentNodeId
  branchId: TalentBranchId
  branch: string
  name: string
  description: string
  maxLevel: number
  requires?: { id: TalentNodeId; level: number }
  bonuses: Partial<TalentBonuses>
}

export type TalentBonuses = {
  damage: number
  fireRate: number
  critRate: number
  pierce: number
  maxHp: number
  damageReduction: number
  healthRegen: number
  lifesteal: number
  speed: number
  dodge: number
  pickup: number
  cooldownReduction: number
  statusPower: number
  statusChance: number
  statusDuration: number
  goldGain: number
  expGain: number
  dropRate: number
  offlineGain: number
  offlineCapHours: number
}

const talent = (node: TalentNode) => node
export const talentNodes: TalentNode[] = [
  talent({ id: 'firepower-ballistics', branchId: 'firepower', branch: '火力', name: '弹道校准', description: '每级伤害 +4%', maxLevel: 5, bonuses: { damage: 0.04 } }),
  talent({ id: 'firepower-rapid', branchId: 'firepower', branch: '火力', name: '高速枪机', description: '每级射速 +3%', maxLevel: 5, requires: { id: 'firepower-ballistics', level: 3 }, bonuses: { fireRate: 0.03 } }),
  talent({ id: 'firepower-critical', branchId: 'firepower', branch: '火力', name: '弱点计算', description: '每级暴击率 +2%', maxLevel: 5, requires: { id: 'firepower-rapid', level: 3 }, bonuses: { critRate: 0.02 } }),
  talent({ id: 'firepower-pierce', branchId: 'firepower', branch: '火力', name: '钨芯弹道', description: '满级穿透 +2', maxLevel: 2, requires: { id: 'firepower-critical', level: 3 }, bonuses: { pierce: 1 } }),
  talent({ id: 'firepower-overdrive', branchId: 'firepower', branch: '火力', name: '终极火控', description: '每级伤害与射速 +5%', maxLevel: 3, requires: { id: 'firepower-pierce', level: 2 }, bonuses: { damage: 0.05, fireRate: 0.05 } }),

  talent({ id: 'survival-vitality', branchId: 'survival', branch: '生存', name: '复合护层', description: '每级最大生命 +12', maxLevel: 5, bonuses: { maxHp: 12 } }),
  talent({ id: 'survival-armor', branchId: 'survival', branch: '生存', name: '冲击吸收', description: '每级减伤 +2%', maxLevel: 5, requires: { id: 'survival-vitality', level: 3 }, bonuses: { damageReduction: 0.02 } }),
  talent({ id: 'survival-regen', branchId: 'survival', branch: '生存', name: '战地再生', description: '每级每秒恢复 0.5 生命', maxLevel: 5, requires: { id: 'survival-armor', level: 3 }, bonuses: { healthRegen: 0.5 } }),
  talent({ id: 'survival-leech', branchId: 'survival', branch: '生存', name: '生命汲取', description: '每级吸血 +0.5%', maxLevel: 4, requires: { id: 'survival-regen', level: 3 }, bonuses: { lifesteal: 0.005 } }),
  talent({ id: 'survival-laststand', branchId: 'survival', branch: '生存', name: '最后防线', description: '每级最大生命 +8、闪避 +2.5%', maxLevel: 3, requires: { id: 'survival-leech', level: 4 }, bonuses: { maxHp: 8, dodge: 0.025 } }),

  talent({ id: 'mobility-frame', branchId: 'mobility', branch: '机动', name: '轻量骨架', description: '每级移动速度 +3%', maxLevel: 5, bonuses: { speed: 0.03 } }),
  talent({ id: 'mobility-evasion', branchId: 'mobility', branch: '机动', name: '威胁预判', description: '每级闪避 +2%', maxLevel: 5, requires: { id: 'mobility-frame', level: 3 }, bonuses: { dodge: 0.02 } }),
  talent({ id: 'mobility-magnet', branchId: 'mobility', branch: '机动', name: '磁吸扩容', description: '每级拾取范围 +10', maxLevel: 5, requires: { id: 'mobility-evasion', level: 3 }, bonuses: { pickup: 10 } }),
  talent({ id: 'mobility-cooldown', branchId: 'mobility', branch: '机动', name: '快速整备', description: '每级技能冷却 -3%', maxLevel: 5, requires: { id: 'mobility-magnet', level: 3 }, bonuses: { cooldownReduction: 0.03 } }),
  talent({ id: 'mobility-phantom', branchId: 'mobility', branch: '机动', name: '相位步法', description: '每级移速与闪避提高', maxLevel: 3, requires: { id: 'mobility-cooldown', level: 5 }, bonuses: { speed: 0.05, dodge: 0.03 } }),

  talent({ id: 'engineering-amplify', branchId: 'engineering', branch: '工程', name: '元素增幅', description: '每级异常伤害 +8%', maxLevel: 5, bonuses: { statusPower: 0.08 } }),
  talent({ id: 'engineering-trigger', branchId: 'engineering', branch: '工程', name: '触发矩阵', description: '每级异常概率 +3%', maxLevel: 5, requires: { id: 'engineering-amplify', level: 3 }, bonuses: { statusChance: 0.03 } }),
  talent({ id: 'engineering-duration', branchId: 'engineering', branch: '工程', name: '持续协议', description: '每级异常持续时间 +8%', maxLevel: 5, requires: { id: 'engineering-trigger', level: 3 }, bonuses: { statusDuration: 0.08 } }),
  talent({ id: 'engineering-module', branchId: 'engineering', branch: '工程', name: '模块超频', description: '每级技能冷却 -4%', maxLevel: 5, requires: { id: 'engineering-duration', level: 3 }, bonuses: { cooldownReduction: 0.04 } }),
  talent({ id: 'engineering-singularity', branchId: 'engineering', branch: '工程', name: '奇点工程', description: '全面强化异常强度、概率与持续时间', maxLevel: 3, requires: { id: 'engineering-module', level: 5 }, bonuses: { statusPower: 0.1, statusChance: 0.025, statusDuration: 0.1 } }),

  talent({ id: 'logistics-profit', branchId: 'logistics', branch: '后勤', name: '战地结算', description: '每级金币 +6%', maxLevel: 5, bonuses: { goldGain: 0.06 } }),
  talent({ id: 'logistics-training', branchId: 'logistics', branch: '后勤', name: '训练档案', description: '每级经验 +5%', maxLevel: 5, requires: { id: 'logistics-profit', level: 3 }, bonuses: { expGain: 0.05 } }),
  talent({ id: 'logistics-scavenge', branchId: 'logistics', branch: '后勤', name: '战场搜刮', description: '每级装备掉率 +3%', maxLevel: 5, requires: { id: 'logistics-training', level: 3 }, bonuses: { dropRate: 0.03 } }),
  talent({ id: 'logistics-offline', branchId: 'logistics', branch: '后勤', name: '自动后勤', description: '每级离线收益 +8%', maxLevel: 5, requires: { id: 'logistics-scavenge', level: 3 }, bonuses: { offlineGain: 0.08 } }),
  talent({ id: 'logistics-depot', branchId: 'logistics', branch: '后勤', name: '深空仓储', description: '每级离线上限 +2 小时', maxLevel: 4, requires: { id: 'logistics-offline', level: 5 }, bonuses: { offlineCapHours: 2 } })
]

const emptyBonuses = (): TalentBonuses => ({ damage: 0, fireRate: 0, critRate: 0, pierce: 0, maxHp: 0, damageReduction: 0, healthRegen: 0, lifesteal: 0, speed: 0, dodge: 0, pickup: 0, cooldownReduction: 0, statusPower: 0, statusChance: 0, statusDuration: 0, goldGain: 0, expGain: 0, dropRate: 0, offlineGain: 0, offlineCapHours: 0 })

export const emptyTalentLevels = (): TalentLevels => Object.fromEntries(talentNodes.map((node) => [node.id, 0])) as TalentLevels

export function normalizeTalentLevels(value?: Partial<TalentLevels>): TalentLevels {
  const levels = emptyTalentLevels()
  for (const node of talentNodes) levels[node.id] = Math.max(0, Math.min(node.maxLevel, Math.floor(Number(value?.[node.id]) || 0)))
  return levels
}

export function talentPointBudget(playerLevel: number, highestCleared: number) {
  return Math.max(0, playerLevel - 1) + Math.floor(Math.max(0, highestCleared) / 100)
}

export function canUpgradeTalent(node: TalentNode, levels: TalentLevels) {
  return levels[node.id] < node.maxLevel && (!node.requires || levels[node.requires.id] >= node.requires.level)
}

export function talentBonuses(levels: TalentLevels) {
  const result = emptyBonuses()
  for (const node of talentNodes) {
    const level = levels[node.id] ?? 0
    for (const [key, value] of Object.entries(node.bonuses) as Array<[keyof TalentBonuses, number]>) result[key] += value * level
  }
  return result
}

export type SetBonuses = {
  damage: number
  fireRate: number
  pierce: number
  fireDamage: number
  shockChance: number
  statusPower: number
  goldGain: number
  maxHp: number
  lifesteal: number
  eliteDamage: number
  burnExplosion: boolean
  extraChains: number
  noPierceFalloff: boolean
  lowHealthLifesteal: boolean
  doubleRewardChance: number
  eliteKillBuff: boolean
}
export type SetSummary = { key: EquipmentSetKey; count: number; nextThreshold: number | null; effects: string[]; bonuses: SetBonuses }

const setDefinitions: Record<EquipmentSetKey, { two: string; four: string; twoBonus: Partial<SetBonuses>; fourBonus: Partial<SetBonuses> }> = {
  赤焰清道夫: { two: '火焰伤害 +15%', four: '灼烧敌人死亡时爆燃', twoBonus: { fireDamage: 0.15 }, fourBonus: { burnExplosion: true } },
  雷暴执行者: { two: '电击概率 +10%', four: '连锁电击次数 +2', twoBonus: { shockChance: 0.1 }, fourBonus: { extraChains: 2 } },
  穿甲猎手: { two: '穿透 +1', four: '穿透后伤害不再衰减', twoBonus: { pierce: 1 }, fourBonus: { noPierceFalloff: true } },
  血色幸存者: { two: '吸血 +2%', four: '低血量时吸血翻倍', twoBonus: { lifesteal: 0.02 }, fourBonus: { lowHealthLifesteal: true } },
  黄金后勤: { two: '金币 +20%', four: '通关奖励有概率额外翻倍', twoBonus: { goldGain: 0.2 }, fourBonus: { doubleRewardChance: 0.12 } },
  黑域终端: { two: '对精英和 Boss 增伤 +18%', four: '击败精英后 6 秒伤害、射速、暴击与移速 +25%', twoBonus: { eliteDamage: 0.18 }, fourBonus: { eliteKillBuff: true } }
}

const emptySetBonuses = (): SetBonuses => ({ damage: 0, fireRate: 0, pierce: 0, fireDamage: 0, shockChance: 0, statusPower: 0, goldGain: 0, maxHp: 0, lifesteal: 0, eliteDamage: 0, burnExplosion: false, extraChains: 0, noPierceFalloff: false, lowHealthLifesteal: false, doubleRewardChance: 0, eliteKillBuff: false })

export function summarizeSets(equipped: Attachment[]): SetSummary[] {
  const counts = equipped.reduce<Partial<Record<EquipmentSetKey, number>>>((result, item) => {
    if (item.setKey) result[item.setKey] = (result[item.setKey] ?? 0) + 1
    return result
  }, {})
  return equipmentSetKeys.map((key) => {
    const count = counts[key] ?? 0
    const definition = setDefinitions[key]
    const bonuses = emptySetBonuses()
    if (count >= 2) Object.assign(bonuses, definition.twoBonus)
    if (count >= 4) {
      for (const [bonusKey, value] of Object.entries(definition.fourBonus) as Array<[keyof SetBonuses, number | boolean]>) {
        if (typeof value === 'number') (bonuses[bonusKey] as number) = ((bonuses[bonusKey] as number) || 0) + value
        else (bonuses[bonusKey] as boolean) = value
      }
    }
    return { key, count, nextThreshold: count < 2 ? 2 : count < 4 ? 4 : null, effects: [count >= 2 ? definition.two : `2 件：${definition.two}`, count >= 4 ? definition.four : `4 件：${definition.four}`], bonuses }
  })
}

export function combinedSetBonuses(equipped: Attachment[], amplifyDominant = false): SetBonuses {
  const summaries = summarizeSets(equipped)
  const dominant = amplifyDominant
    ? summaries.filter((set) => set.count >= 2).sort((a, b) => b.count - a.count)[0]
    : undefined
  return summaries.reduce((total, set) => {
    for (const [key, value] of Object.entries(set.bonuses) as Array<[keyof SetBonuses, number | boolean]>) {
      if (typeof value === 'number') (total[key] as number) += value * (set.key === dominant?.key ? 1.5 : 1)
      else (total[key] as boolean) ||= value
    }
    return total
  }, emptySetBonuses())
}

export type EnemyStatusState = {
  burnSeconds: number; burnDps: number; burnStacks: number
  shockSeconds: number
  poisonSeconds: number; poisonDps: number; poisonStacks: number
  chillSeconds: number; freezeSeconds: number
  bleedSeconds: number; bleedDps: number
  armorBreakSeconds: number; vulnerableSeconds: number
  knockbackForce: number; stunSeconds: number
}

export const emptyEnemyStatus = (): EnemyStatusState => ({ burnSeconds: 0, burnDps: 0, burnStacks: 0, shockSeconds: 0, poisonSeconds: 0, poisonDps: 0, poisonStacks: 0, chillSeconds: 0, freezeSeconds: 0, bleedSeconds: 0, bleedDps: 0, armorBreakSeconds: 0, vulnerableSeconds: 0, knockbackForce: 0, stunSeconds: 0 })

export function applyElementStatus(status: EnemyStatusState, element: WeaponElement, chance: number, rawDamage: number, power: number, random: () => number, durationMultiplier = 1) {
  if (random() >= Math.min(0.95, Math.max(0, chance))) return null
  const duration = Math.max(0.25, power * durationMultiplier)
  if (element === '火焰') { status.burnStacks = Math.min(5, status.burnStacks + 1); status.burnSeconds = Math.max(status.burnSeconds, 3 * duration); status.burnDps = Math.max(status.burnDps, rawDamage * 0.22 * power * status.burnStacks); return status.burnStacks > 1 ? `灼烧 ${status.burnStacks}` : '灼烧' }
  if (element === '电击') { status.shockSeconds = Math.max(status.shockSeconds, 2.2 * duration); return '感电' }
  if (element === '毒素') { status.poisonStacks = Math.min(5, status.poisonStacks + 1); status.poisonSeconds = Math.max(status.poisonSeconds, 5 * duration); status.poisonDps = Math.max(status.poisonDps, rawDamage * 0.08 * power * status.poisonStacks); return `中毒 ${status.poisonStacks}` }
  if (element === '冰霜') {
    if (status.chillSeconds > 0) { status.freezeSeconds = Math.max(status.freezeSeconds, 1.1 * duration); return '冻结' }
    status.chillSeconds = Math.max(status.chillSeconds, 3 * duration); return '冰缓'
  }
  if (element === '爆炸') { status.knockbackForce = Math.max(status.knockbackForce, rawDamage * 0.9 * power); status.stunSeconds = Math.max(status.stunSeconds, 0.55 * duration); return '眩晕' }
  if (element === '能量') { status.armorBreakSeconds = Math.max(status.armorBreakSeconds, 4 * duration); status.vulnerableSeconds = Math.max(status.vulnerableSeconds, 2 * duration); return '破甲' }
  status.bleedSeconds = Math.max(status.bleedSeconds, 4 * duration)
  status.bleedDps = Math.max(status.bleedDps, rawDamage * 0.12 * power)
  return '流血'
}

export function tickEnemyStatus(status: EnemyStatusState, delta: number, isMoving = true) {
  const burnDamage = status.burnSeconds > 0 ? status.burnDps * delta : 0
  const poisonDamage = status.poisonSeconds > 0 ? status.poisonDps * delta : 0
  const bleedDamage = status.bleedSeconds > 0 && isMoving ? status.bleedDps * delta : 0
  status.burnSeconds = Math.max(0, status.burnSeconds - delta)
  if (status.burnSeconds <= 0) { status.burnStacks = 0; status.burnDps = 0 }
  status.shockSeconds = Math.max(0, status.shockSeconds - delta)
  status.poisonSeconds = Math.max(0, status.poisonSeconds - delta)
  if (status.poisonSeconds <= 0) { status.poisonStacks = 0; status.poisonDps = 0 }
  status.chillSeconds = Math.max(0, status.chillSeconds - delta)
  status.freezeSeconds = Math.max(0, status.freezeSeconds - delta)
  status.bleedSeconds = Math.max(0, status.bleedSeconds - delta)
  status.armorBreakSeconds = Math.max(0, status.armorBreakSeconds - delta)
  status.vulnerableSeconds = Math.max(0, status.vulnerableSeconds - delta)
  status.stunSeconds = Math.max(0, status.stunSeconds - delta)
  const knockbackForce = status.knockbackForce
  status.knockbackForce = 0
  return {
    burnDamage,
    poisonDamage,
    bleedDamage,
    dotDamage: burnDamage + poisonDamage + bleedDamage,
    damageTakenMultiplier: (status.shockSeconds > 0 ? 1.12 : 1) * (status.vulnerableSeconds > 0 ? 1.18 : 1),
    speedMultiplier: status.freezeSeconds > 0 || status.stunSeconds > 0 ? 0 : status.chillSeconds > 0 ? 0.68 : 1,
    armorMultiplier: status.armorBreakSeconds > 0 ? 0.55 : 1,
    canAct: status.freezeSeconds <= 0 && status.stunSeconds <= 0,
    knockbackForce
  }
}

export type OfflineReward = { elapsedSeconds: number; cappedSeconds: number; gold: number; exp: number; alloy: number; parts: number }

export function calculateOfflineReward(lastSeenAt: number, now: number, highestCleared: number, gainMultiplier = 1, capHours = 8): OfflineReward {
  const elapsedSeconds = Math.max(0, Math.floor((now - lastSeenAt) / 1000))
  const cappedSeconds = Math.min(elapsedSeconds, Math.max(1, capHours) * 3600)
  const stageFactor = 1 + Math.max(0, highestCleared) * 0.035
  const hours = cappedSeconds / 3600
  return { elapsedSeconds, cappedSeconds, gold: Math.floor(hours * 38 * stageFactor * gainMultiplier), exp: Math.floor(hours * 22 * stageFactor * gainMultiplier), alloy: Math.floor(hours * 0.35 * gainMultiplier), parts: Math.floor(hours * 1.5 * gainMultiplier) }
}

export type TaskEvent = 'kill' | 'clear' | 'boss' | 'upgrade' | 'resource' | 'rarity' | 'challenge' | 'critical' | 'build' | 'reforge' | 'stage'
export type TaskPeriod = 'daily' | 'weekly' | 'achievement'
export type GameTask = {
  id: string; period: TaskPeriod; label: string; event: TaskEvent; target: number; progress: number; claimed: boolean
  progressMode?: 'increment' | 'max'
  reward: { gold: number; alloy: number; parts: number }
}
export type DailyTask = GameTask

export function dailyTaskKey(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
export function weeklyTaskKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function createDailyTasks(): GameTask[] {
  return [
    { id: 'daily-clear', period: 'daily', label: '通关 3 个关卡', event: 'clear', target: 3, progress: 0, claimed: false, reward: { gold: 150, alloy: 1, parts: 0 } },
    { id: 'daily-kill', period: 'daily', label: '击败 100 名敌人', event: 'kill', target: 100, progress: 0, claimed: false, reward: { gold: 100, alloy: 0, parts: 3 } },
    { id: 'daily-boss', period: 'daily', label: '击败 1 个 Boss', event: 'boss', target: 1, progress: 0, claimed: false, reward: { gold: 180, alloy: 2, parts: 0 } },
    { id: 'daily-upgrade', period: 'daily', label: '强化 1 次装备或武器', event: 'upgrade', target: 1, progress: 0, claimed: false, reward: { gold: 80, alloy: 0, parts: 4 } },
    { id: 'daily-resource', period: 'daily', label: '完成 1 次资源关', event: 'resource', target: 1, progress: 0, claimed: false, reward: { gold: 120, alloy: 2, parts: 2 } }
  ]
}

export function createWeeklyTasks(): GameTask[] {
  return [
    { id: 'weekly-clear', period: 'weekly', label: '推进 20 个关卡', event: 'clear', target: 20, progress: 0, claimed: false, reward: { gold: 1200, alloy: 8, parts: 12 } },
    { id: 'weekly-boss', period: 'weekly', label: '击败 5 个 Boss', event: 'boss', target: 5, progress: 0, claimed: false, reward: { gold: 800, alloy: 12, parts: 8 } },
    { id: 'weekly-rarity', period: 'weekly', label: '获得 1 件史诗以上装备', event: 'rarity', target: 1, progress: 0, claimed: false, reward: { gold: 600, alloy: 6, parts: 16 } },
    { id: 'weekly-challenge', period: 'weekly', label: '完成 1 个高危节点', event: 'challenge', target: 1, progress: 0, claimed: false, reward: { gold: 1000, alloy: 10, parts: 10 } }
  ]
}

export function createAchievements(): GameTask[] {
  return [
    { id: 'achievement-stage100', period: 'achievement', label: '首次通关第 100 关', event: 'stage', target: 100, progress: 0, claimed: false, progressMode: 'max', reward: { gold: 2000, alloy: 20, parts: 20 } },
    { id: 'achievement-legendary', period: 'achievement', label: '首次获得传说装备', event: 'rarity', target: 2, progress: 0, claimed: false, progressMode: 'max', reward: { gold: 3000, alloy: 30, parts: 20 } },
    { id: 'achievement-kills', period: 'achievement', label: '累计击杀 1000 名敌人', event: 'kill', target: 1000, progress: 0, claimed: false, reward: { gold: 2500, alloy: 15, parts: 30 } },
    { id: 'achievement-critical', period: 'achievement', label: '单次暴击伤害达到 1000', event: 'critical', target: 1000, progress: 0, claimed: false, progressMode: 'max', reward: { gold: 2200, alloy: 15, parts: 25 } },
    { id: 'achievement-build', period: 'achievement', label: '激活任意 4 件套效果', event: 'build', target: 4, progress: 0, claimed: false, progressMode: 'max', reward: { gold: 3500, alloy: 25, parts: 30 } }
  ]
}

export function normalizeTasks(factory: () => GameTask[], saved?: GameTask[]) {
  return factory().map((task) => {
    const previous = saved?.find((item) => item.id === task.id)
    return previous ? { ...task, progress: Math.min(task.target, Math.max(0, Number(previous.progress) || 0)), claimed: Boolean(previous.claimed) } : task
  })
}
export const normalizeDailyTasks = (saved?: GameTask[]) => normalizeTasks(createDailyTasks, saved)
export const normalizeWeeklyTasks = (saved?: GameTask[]) => normalizeTasks(createWeeklyTasks, saved)
export const normalizeAchievements = (saved?: GameTask[]) => normalizeTasks(createAchievements, saved)

export function recordTaskEvent(tasks: GameTask[], event: TaskEvent, amount = 1) {
  for (const task of tasks) {
    if (task.event !== event) continue
    task.progress = Math.min(task.target, task.progressMode === 'max' ? Math.max(task.progress, amount) : task.progress + amount)
  }
}

export type DropPityState = { bossKills: number; epicMisses: number; legendaryMisses: number; mythicShards: number }
export const emptyDropPity = (): DropPityState => ({ bossKills: 0, epicMisses: 0, legendaryMisses: 0, mythicShards: 0 })
export function normalizeDropPity(saved?: Partial<DropPityState>): DropPityState { return { bossKills: Math.max(0, Math.floor(Number(saved?.bossKills) || 0)), epicMisses: Math.max(0, Math.floor(Number(saved?.epicMisses) || 0)), legendaryMisses: Math.max(0, Math.floor(Number(saved?.legendaryMisses) || 0)), mythicShards: Math.max(0, Math.floor(Number(saved?.mythicShards) || 0)) } }
export function rarityRank(rarity: AttachmentRarity) { return attachmentRarities.indexOf(rarity) }
export function guaranteedDropRarity(stage: number, pity: DropPityState, bossDefeated = false): AttachmentRarity | null {
  if (!bossDefeated) return null
  if (stage >= 3000 && pity.legendaryMisses >= 29) return '传说'
  if (pity.epicMisses >= 99) return '史诗'
  if ((pity.bossKills + 1) % 10 === 0) return '稀有'
  return null
}
export function attachmentDropCount(rolledDrop: boolean, guaranteedRarity: AttachmentRarity | null) {
  return rolledDrop || guaranteedRarity ? 1 : 0
}
export function recordPityDrop(pity: DropPityState, stage: number, rarity: AttachmentRarity, bossDefeated: boolean) {
  if (!bossDefeated) return
  if (bossDefeated) pity.bossKills += 1
  pity.epicMisses = rarityRank(rarity) >= rarityRank('史诗') ? 0 : pity.epicMisses + 1
  pity.legendaryMisses = rarityRank(rarity) >= rarityRank('传说') ? 0 : pity.legendaryMisses + (stage >= 3000 ? 1 : 0)
  if (bossDefeated && stage >= 7000 && rarity !== '神话') pity.mythicShards += 1
}
