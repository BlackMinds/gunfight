<template>
  <section class="progression-section">
    <div class="progression-title"><b>任务与成就</b><span>每日 {{ completedDailyTasks }}/{{ dailyTasks.length }} · 周常 {{ completedWeeklyTasks }}/{{ weeklyTasks.length }} · 成就 {{ completedAchievements }}/{{ achievements.length }}</span></div>
    <div class="task-tabs">
      <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </div>
    <div class="task-list">
      <article v-for="task in visibleTasks" :key="task.id">
        <div><b>{{ task.label }}</b><span>{{ task.progress }} / {{ task.target }}</span></div>
        <small>金币 +{{ task.reward.gold }} · 合金 +{{ task.reward.alloy }} · 零件 +{{ task.reward.parts }}</small>
        <button type="button" :disabled="task.claimed || task.progress < task.target" @click="claimTask(task)">{{ task.claimed ? '已领取' : '领取' }}</button>
      </article>
    </div>
    <small class="pity-status">保底：Boss {{ dropPity.bossKills }} · 史诗计数 {{ dropPity.epicMisses }}/100 · 传说计数 {{ dropPity.legendaryMisses }}/30 · 神话碎片 {{ dropPity.mythicShards }}/10</small>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { dailyTasks, weeklyTasks, achievements, completedDailyTasks, completedWeeklyTasks, completedAchievements, claimTask, dropPity } = useGameCanvasContext()
const tabs = [{ key: 'daily', label: '每日任务' }, { key: 'weekly', label: '周常任务' }, { key: 'achievement', label: '成就' }] as const
const activeTab = ref<(typeof tabs)[number]['key']>('daily')
const visibleTasks = computed(() => activeTab.value === 'daily' ? dailyTasks.value : activeTab.value === 'weekly' ? weeklyTasks.value : achievements.value)
</script>
