import type { EnemyKind } from './formulas'
import { getR5StageBand } from './r5'
import { createWavePlan, type WaveDefinition } from './waves'

export type OperationMode = 'campaign' | 'challenge' | 'survival' | 'bounty' | 'event'

export type OperationDefinition = {
  id: OperationMode
  label: string
  shortLabel: string
  summary: string
  objective: string
  unlockHighestCleared: number
  rewardMultiplier: number
  durationSeconds?: number
}

export const operationDefinitions = [
  { id: 'campaign', label: '主线推进', shortLabel: '主线', summary: '5 波标准战役，胜利推进关卡。', objective: '肃清全部 5 波敌人', unlockHighestCleared: 0, rewardMultiplier: 1 },
  { id: 'challenge', label: '猎首挑战', shortLabel: '挑战', summary: '3 波高精英密度，终波必定出现首领。', objective: '击破终波首领', unlockHighestCleared: 500, rewardMultiplier: 0.8 },
  { id: 'survival', label: '90 秒生存', shortLabel: '生存', summary: '连续压力梯级，坚持到倒计时结束。', objective: '存活 90 秒', unlockHighestCleared: 500, rewardMultiplier: 0.65, durationSeconds: 90 },
  { id: 'bounty', label: '悬赏追猎', shortLabel: '悬赏', summary: '追踪指定职责敌人，完成三波定向清剿。', objective: '清剿全部悬赏目标', unlockHighestCleared: 500, rewardMultiplier: 0.9 },
  { id: 'event', label: '战区突袭', shortLabel: '活动', summary: '五波跨战区混编，终波迎战高阶首领。', objective: '完成战区突袭', unlockHighestCleared: 1000, rewardMultiplier: 1.1 }
] as const satisfies readonly OperationDefinition[]

export const BOUNTY_TARGET_KILLS = 6
const bountyTargets = [
  { kind: 'sniper', unlockStage: 501 },
  { kind: 'shield', unlockStage: 1001 },
  { kind: 'medic', unlockStage: 1501 },
  { kind: 'commander', unlockStage: 2001 },
  { kind: 'splitter', unlockStage: 5001 },
  { kind: 'stealth', unlockStage: 7501 }
] as const satisfies readonly { kind: EnemyKind; unlockStage: number }[]

export function getOperationDefinition(mode: OperationMode): OperationDefinition {
  return operationDefinitions.find((operation) => operation.id === mode) ?? operationDefinitions[0]
}

export function operationUnlocked(mode: OperationMode, highestCleared: number) {
  return highestCleared >= getOperationDefinition(mode).unlockHighestCleared
}

export function operationUnlockText(mode: OperationMode) {
  const required = getOperationDefinition(mode).unlockHighestCleared
  return required > 0 ? `完成第 ${required} 关后开放` : '已开放'
}

export function bountyTargetForStage(stage: number) {
  const current = Math.max(501, Math.round(stage))
  const available = bountyTargets.filter((target) => target.unlockStage <= current)
  return available[Math.abs(current * 7) % available.length].kind
}

export function bountyObjectiveForStage(stage: number) {
  const target = bountyTargetForStage(stage)
  return { target, targetLabel: enemyLabel(target), requiredKills: BOUNTY_TARGET_KILLS }
}

export function bountyObjectiveCompleted(targetKills: number, requiredKills = BOUNTY_TARGET_KILLS) {
  return targetKills >= requiredKills
}

export function eventWaveSourceStages(stage: number) {
  const current = Math.max(1001, Math.min(10000, Math.round(stage)))
  return Array.from({ length: 5 }, (_, index) => Math.round(501 + (current - 501) * index / 4))
}

export function operationAdvancesCampaign(mode: OperationMode) {
  return mode === 'campaign'
}

export function operationVictoryVerdict(mode: OperationMode, campaignVerdict: string) {
  if (mode === 'challenge') return '达成 · 终波首领已击破'
  if (mode === 'survival') return '达成 · 已存活 90 秒'
  if (mode === 'bounty') return '达成 · 悬赏目标已肃清'
  if (mode === 'event') return '达成 · 战区突袭完成'
  return campaignVerdict
}

function reindex(waves: WaveDefinition[]): WaveDefinition[] {
  return waves.map((wave, index) => ({ ...wave, index: index + 1, kinds: [...wave.kinds] }))
}

export function createOperationWavePlan(stage: number, mode: OperationMode): WaveDefinition[] {
  const campaign = createWavePlan(stage)
  if (mode === 'campaign') return campaign
  if (mode === 'event') {
    const sourceStages = eventWaveSourceStages(stage)
    return reindex(sourceStages.map((sourceStage, index) => {
      const sourceWave = createWavePlan(sourceStage)[index]
      const bandLabel = getR5StageBand(sourceStage)?.label ?? `第 ${sourceStage} 关战区`
      return {
        ...sourceWave,
        label: index === sourceStages.length - 1 ? `${bandLabel} · 突袭首领` : `${bandLabel} · 跨区混编`,
        eliteCount: index === sourceStages.length - 1 ? 0 : Math.max(1, sourceWave.eliteCount),
        boss: index === sourceStages.length - 1,
        restAfter: index === sourceStages.length - 1 ? 0 : sourceWave.restAfter
      }
    }))
  }
  if (mode === 'challenge') {
    return reindex(campaign.slice(2).map((wave, index, selected) => ({
      ...wave,
      label: index === selected.length - 1 ? '猎首决战' : index === 0 ? '精英侦猎' : '护卫突破',
      count: Math.max(5, wave.count - 2),
      eliteCount: index === selected.length - 1 ? 0 : Math.max(2, wave.eliteCount + 2),
      boss: index === selected.length - 1,
      restAfter: index === selected.length - 1 ? 0 : 3
    })))
  }

  if (mode === 'bounty') {
    const target = bountyTargetForStage(stage)
    return reindex(campaign.slice(1, 4).map((wave, index) => ({
      ...wave,
      label: index === 2 ? `悬赏收网 · ${enemyLabel(target)}` : `追踪目标 · ${enemyLabel(target)}`,
      count: Math.max(6, wave.count - 1),
      kinds: [target, ...wave.kinds.filter((kind) => kind !== target).slice(0, 2)],
      eliteCount: Math.max(1, wave.eliteCount),
      boss: false,
      restAfter: index === 2 ? 0 : 2.5
    })))
  }

  const pressureKinds: EnemyKind[][] = [
    ['grunt', 'fast'],
    ['ranged', 'sniper'],
    ['fast', 'bomber'],
    ['heavy', 'medic'],
    ['warden', 'ranged'],
    ['sniper', 'fast', 'medic'],
    ['heavy', 'warden', 'bomber'],
    ['sniper', 'medic', 'warden'],
    ['fast', 'bomber', 'warden'],
    ['sniper', 'medic', 'warden', 'heavy']
  ]
  return pressureKinds.map((kinds, index) => {
    const source = campaign[index % campaign.length]
    return {
      ...source,
      index: index + 1,
      label: `生存压力 ${index + 1}`,
      count: Math.max(7, source.count - 1 + Math.floor(index / 2)),
      kinds: [...kinds],
      spawnInterval: Math.max(0.48, source.spawnInterval - index * 0.045),
      restAfter: 1.5,
      eliteCount: Math.min(3, Math.floor(index / 3)),
      boss: false
    }
  })
}

function enemyLabel(kind: EnemyKind) {
  const labels: Record<EnemyKind, string> = {
    grunt: '暴徒', ranged: '火力手', fast: '迅捷兵', heavy: '重装兵', bomber: '爆破兵',
    sniper: '狙击手', medic: '维修兵', warden: '护卫兵', shield: '护盾兵', commander: '指挥兵',
    splitter: '分裂兵', stealth: '隐形兵'
  }
  return labels[kind]
}
