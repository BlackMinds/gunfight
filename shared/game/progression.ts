import { PUBLISHED_STAGE_CAP } from './formulas'
import { R5_IMPLEMENTED_STAGE_CAP } from './r5'

type SavedProgression = {
  stage?: number
  highestCleared?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundedNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

export function stageCap(debugStageSelection = false) {
  return debugStageSelection ? R5_IMPLEMENTED_STAGE_CAP : PUBLISHED_STAGE_CAP
}

export function maxSelectableStageFor(highestCleared: number, debugStageSelection = false) {
  const cap = stageCap(debugStageSelection)
  if (debugStageSelection) return cap
  return Math.min(cap, clamp(roundedNumber(highestCleared, 0), 0, cap) + 1)
}

export function restoreProgression(saved: SavedProgression, debugStageSelection = false) {
  const cap = stageCap(debugStageSelection)
  const requestedStage = roundedNumber(saved.stage, 1)
  const savedHighest = roundedNumber(saved.highestCleared, 0)
  const inferredHighest = savedHighest || Math.max(0, requestedStage - 1)
  const highestCleared = clamp(inferredHighest, 0, cap)
  const stage = clamp(requestedStage, 1, debugStageSelection ? cap : maxSelectableStageFor(highestCleared, false))

  return { stage, highestCleared }
}

export function canAdvanceStage(currentStage: number, victory: boolean, debugStageSelection = false) {
  return victory && roundedNumber(currentStage, 1) < stageCap(debugStageSelection)
}

export function nextStageAfterVictory(currentStage: number, victory: boolean, debugStageSelection = false) {
  const cap = stageCap(debugStageSelection)
  const normalizedStage = clamp(roundedNumber(currentStage, 1), 1, cap)
  return victory ? Math.min(cap, normalizedStage + 1) : normalizedStage
}
