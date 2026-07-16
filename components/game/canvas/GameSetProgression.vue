<template>
  <section class="progression-section">
    <div class="progression-title"><b>六套套装</b><span>2 件数值效果 / 4 件机制效果</span></div>
    <div class="set-grid">
      <article v-for="set in setProgress" :key="set.key" :class="{ active: set.count >= 2, complete: set.count >= 4 }">
        <b>{{ set.key }} · {{ set.count }}/4</b>
        <span v-for="effect in set.effects" :key="effect">{{ effect }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { setProgress } = useGameCanvasContext()
</script>
