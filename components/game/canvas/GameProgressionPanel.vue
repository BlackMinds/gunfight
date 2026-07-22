<template>
  <section class="progression-panel" aria-label="长线成长系统">
    <div class="progression-head">
      <div><p class="panel-kicker">长线成长</p><h2>军械与行动中枢</h2></div>
      <span>武器、天赋、套装、离线、任务与云存档</span>
    </div>
    <GameWeaponProgression />
    <GameTalentProgression />
    <div class="progression-grid"><GameSetProgression /><GameOfflineCloudPanel /></div>
    <GameTaskProgression />
    <GameExpansionProgression />
  </section>
</template>

<script setup lang="ts">
import GameOfflineCloudPanel from './GameOfflineCloudPanel.vue'
import GameSetProgression from './GameSetProgression.vue'
import GameTalentProgression from './GameTalentProgression.vue'
import GameTaskProgression from './GameTaskProgression.vue'
import GameWeaponProgression from './GameWeaponProgression.vue'
import GameExpansionProgression from './GameExpansionProgression.vue'
</script>
