<template>
  <main class="game-screen" :class="`mode-${mode}`">
    <canvas ref="canvasRef" class="battlefield" aria-label="枪火放置战斗画面" />

    <section v-if="replayUi.visible && replayUi.status !== 'complete'" class="r3-replay-status" data-testid="replay-status" aria-live="polite">
      <small>{{ replayUi.phaseLabel }} 开发回放 · {{ replayUi.status }}</small>
      <b>{{ replayUi.currentLabel || '等待启动' }}</b>
      <span>有效 {{ replayUi.validSamples }} / {{ replayUi.targetSamples }} · 剔除 {{ replayUi.rejectedSamples }}</span>
      <span>{{ replayUi.message }}</span>
    </section>
    <output data-testid="r3-replay-results" hidden>{{ replayResultsJson }}</output>
    <output data-testid="r4-replay-results" hidden>{{ replayResultsJson }}</output>

    <GameCombatHud />
    <GameBasePanel />
    <GameEquipmentPanel />
    <GameProgressionPanel class="progression-mobile" />
    <GameSettlementPanel />

    <div v-if="bannerText" class="combat-banner" :class="`tone-${bannerTone}`">{{ bannerText }}</div>
  </main>
</template>

<script setup lang="ts">
import GameBasePanel from './canvas/GameBasePanel.vue'
import GameCombatHud from './canvas/GameCombatHud.vue'
import GameEquipmentPanel from './canvas/GameEquipmentPanel.vue'
import GameProgressionPanel from './canvas/GameProgressionPanel.vue'
import GameSettlementPanel from './canvas/GameSettlementPanel.vue'
import { provideGameCanvasContext } from '~/composables/game/gameCanvasContext'
import { useGameCanvas } from '~/composables/game/useGameCanvas'

const game = useGameCanvas()
provideGameCanvasContext(game)

const { canvasRef, mode, replayUi, replayResultsJson, bannerText, bannerTone } = game
</script>

<style src="./GameCanvas.css"></style>
