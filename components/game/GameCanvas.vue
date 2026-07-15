<template>
  <main class="game-screen" :class="`mode-${mode}`">
    <canvas ref="canvasRef" class="battlefield" aria-label="枪火放置战斗画面" />

    <section v-if="replayUi.visible" class="r3-replay-status" data-testid="r3-replay-status" aria-live="polite">
      <small>R3 开发回放 · {{ replayUi.status }}</small>
      <b>{{ replayUi.currentLabel || '等待启动' }}</b>
      <span>有效 {{ replayUi.validSamples }} / 12 · 剔除 {{ replayUi.rejectedSamples }}</span>
      <span>{{ replayUi.message }}</span>
      <output data-testid="r3-replay-results" hidden>{{ replayResultsJson }}</output>
    </section>

    <GameCombatHud />
    <GameBasePanel />
    <GameEquipmentPanel />
    <GameSettlementPanel />

    <div v-if="bannerText" class="combat-banner" :class="`tone-${bannerTone}`">{{ bannerText }}</div>
  </main>
</template>

<script setup lang="ts">
import GameBasePanel from './canvas/GameBasePanel.vue'
import GameCombatHud from './canvas/GameCombatHud.vue'
import GameEquipmentPanel from './canvas/GameEquipmentPanel.vue'
import GameSettlementPanel from './canvas/GameSettlementPanel.vue'
import { provideGameCanvasContext } from '~/composables/game/gameCanvasContext'
import { useGameCanvas } from '~/composables/game/useGameCanvas'

const game = useGameCanvas()
provideGameCanvasContext(game)

const { canvasRef, mode, replayUi, replayResultsJson, bannerText, bannerTone } = game
</script>

<style src="./GameCanvas.css"></style>
