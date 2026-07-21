import { describe, expect, it } from 'vitest'
import { canAdvanceStage, maxSelectableStageFor, nextStageAfterVictory, restoreProgression } from '../../shared/game/progression'

describe('正式发布关卡推进', () => {
  it('正式选关只开放到最高通关关卡 +1，并在第 10000 关封顶', () => {
    expect(maxSelectableStageFor(0)).toBe(1)
    expect(maxSelectableStageFor(998)).toBe(999)
    expect(maxSelectableStageFor(9999)).toBe(10000)
    expect(maxSelectableStageFor(10000)).toBe(10000)
  })

  it('恢复正式存档时保留合法进度并钳制越界或跳关数据', () => {
    expect(restoreProgression({ stage: 500 })).toEqual({ stage: 500, highestCleared: 499 })
    expect(restoreProgression({ stage: 10000, highestCleared: 9999 })).toEqual({ stage: 10000, highestCleared: 9999 })
    expect(restoreProgression({ stage: 10000, highestCleared: 998 })).toEqual({ stage: 999, highestCleared: 998 })
    expect(restoreProgression({ stage: 12000, highestCleared: 12000 })).toEqual({ stage: 10000, highestCleared: 10000 })
  })

  it('从第 1 关逐关推进可达 10000，终局胜利后不再生成下一关', () => {
    let highestCleared = 0
    let stage = 1

    for (let expectedStage = 1; expectedStage <= 10000; expectedStage += 1) {
      expect(stage).toBe(expectedStage)
      expect(maxSelectableStageFor(highestCleared)).toBe(expectedStage)
      highestCleared = expectedStage

      if (expectedStage < 10000) {
        expect(canAdvanceStage(stage, true)).toBe(true)
        stage = nextStageAfterVictory(stage, true)
      }
    }

    expect(canAdvanceStage(stage, true)).toBe(false)
    expect(nextStageAfterVictory(stage, true)).toBe(10000)
  })

  it('开发选关仍限制在既有 1～10000 范围', () => {
    expect(maxSelectableStageFor(0, true)).toBe(10000)
    expect(restoreProgression({ stage: 10001, highestCleared: 10001 }, true)).toEqual({ stage: 10000, highestCleared: 10000 })
    expect(canAdvanceStage(10000, true, true)).toBe(false)
  })
})
