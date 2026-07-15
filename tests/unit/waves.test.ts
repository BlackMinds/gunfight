import { describe, expect, it } from 'vitest'
import { countWaveEnemies, createWavePlan, enemyKindForWave, levelTuning, resolvedSpawnInterval } from '../../shared/game/waves'

describe('关卡波次配置', () => {
  it('每关生成五波且最后一波至少有精英或首领', () => {
    for (const stage of [1, 5, 10, 37]) {
      const waves = createWavePlan(stage)
      expect(waves).toHaveLength(5)
      expect(waves[4].eliteCount > 0 || waves[4].boss).toBe(true)
      expect(countWaveEnemies(waves)).toBeGreaterThan(0)
    }
  })

  it('每十关的最后一波包含首领', () => {
    expect(createWavePlan(10)[4].boss).toBe(true)
    expect(createWavePlan(20)[4].boss).toBe(true)
    expect(createWavePlan(11)[4].boss).toBe(false)
  })

  it('按配置顺序轮换敌人类型', () => {
    const wave = createWavePlan(1)[1]
    expect(enemyKindForWave(wave, 0)).toBe('grunt')
    expect(enemyKindForWave(wave, 1)).toBe('ranged')
    expect(enemyKindForWave(wave, 2)).toBe('grunt')
  })

  it('按热身到高潮的节奏生成，并从统一配置解析休息和倍率', () => {
    const waves = createWavePlan(5)
    expect(waves.map((wave) => wave.phase)).toEqual(['warmup', 'ranged-pressure', 'charge-burst', 'armor-check', 'climax'])
    expect(waves[3].eliteCount).toBe(1)
    expect(waves[4].eliteCount).toBe(2)
    expect(waves[0].restAfter).toBe(levelTuning.waves[0].restAfter)
    expect(levelTuning.elite.multipliers.hp).toBeGreaterThan(1)
    expect(levelTuning.boss.phases).toHaveLength(3)
    expect(resolvedSpawnInterval(10000, waves[0])).toBeCloseTo(waves[0].spawnInterval - levelTuning.stageGrowth.maxSpawnIntervalReduction)
    expect(resolvedSpawnInterval(10000, waves[0])).toBeGreaterThanOrEqual(levelTuning.stageGrowth.minSpawnInterval)
  })
})
