<template>
  <section class="progression-section offline-section">
    <div class="progression-title"><b>离线收益</b><span>基础 8 小时，后勤天赋可扩至 16 小时</span></div>
    <template v-if="pendingOfflineReward">
      <p>已累计 {{ Math.floor(pendingOfflineReward.cappedSeconds / 60) }} 分钟</p>
      <strong>金币 +{{ pendingOfflineReward.gold }} · 经验 +{{ pendingOfflineReward.exp }} · 合金 +{{ pendingOfflineReward.alloy }} · 零件 +{{ pendingOfflineReward.parts }}</strong>
      <button type="button" data-testid="claim-offline" @click="claimOfflineReward">领取离线收益</button>
    </template>
    <p v-else>当前没有待领取收益。离开游戏一分钟后开始累计。</p>

  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { pendingOfflineReward, claimOfflineReward } = useGameCanvasContext()
</script>
