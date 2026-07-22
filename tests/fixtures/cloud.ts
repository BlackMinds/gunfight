import { CURRENT_SAVE_VERSION } from '../../shared/game/save'

export function createCloudSave(overrides: Record<string, unknown> = {}) {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage: 12,
    highestCleared: 11,
    resources: { gold: 80, alloy: 3, parts: 4 },
    base: { weaponLevel: 0, armorLevel: 0, magnetLevel: 0 },
    player: { level: 5, exp: 20, hp: 100 },
    equipped: [],
    inventory: [],
    savedAt: 1_753_156_800_000,
    ...overrides
  }
}
