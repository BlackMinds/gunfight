import { inject, provide, type InjectionKey } from 'vue'
import type { GameCanvasContext } from './useGameCanvas'

const gameCanvasContextKey: InjectionKey<GameCanvasContext> = Symbol('game-canvas-context')

export function provideGameCanvasContext(context: GameCanvasContext) {
  provide(gameCanvasContextKey, context)
}

export function useGameCanvasContext() {
  const context = inject(gameCanvasContextKey)
  if (!context) throw new Error('Game canvas context is unavailable')
  return context
}
