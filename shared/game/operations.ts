import type { EnemyKind } from './formulas'
import { createWavePlan, type WaveDefinition } from './waves'

export type OperationMode = 'campaign' | 'challenge' | 'survival'

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
  { id: 'survival', label: '90 秒生存', shortLabel: '生存', summary: '连续压力梯级，坚持到倒计时结束。', objective: '存活 90 秒', unlockHighestCleared: 500, rewardMultiplier: 0.65, durationSeconds: 90 }
] as const satisfies readonly OperationDefinition[]

export function getOperationDefinition(mode: OperationMode): OperationDefinition {
  return operationDefinitions.find((operation) => operation.id === mode) ?? operationDefinitions[0]
}

export function operationUnlocked(mode: OperationMode, highestCleared: number) {
  return highestCleared >= getOperationDefinition(mode).unlockHighestCleared
}

export function operationAdvancesCampaign(mode: OperationMode) {
  return mode === 'campaign'
}

export function operationVictoryVerdict(mode: OperationMode, campaignVerdict: string) {
  if (mode === 'challenge') return '达成 · 终波首领已击破'
  if (mode === 'survival') return '达成 · 已存活 90 秒'
  return campaignVerdict
}

function reindex(waves: WaveDefinition[]): WaveDefinition[] {
  return waves.map((wave, index) => ({ ...wave, index: index + 1, kinds: [...wave.kinds] }))
}

export function createOperationWavePlan(stage: number, mode: OperationMode): WaveDefinition[] {
  const campaign = createWavePlan(stage)
  if (mode === 'campaign') return campaign
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
