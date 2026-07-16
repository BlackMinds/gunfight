<template>
  <section class="progression-panel" aria-label="长线成长系统">
    <div class="progression-head">
      <div>
        <p class="panel-kicker">长线成长</p>
        <h2>军械与行动中枢</h2>
      </div>
      <span>{{ completedDailyTasks }} / {{ dailyTasks.length }} 项今日任务可结算</span>
    </div>

    <div class="progression-section">
      <div class="progression-title"><b>主武器</b><span>武器改变弹道、射速、元素和异常状态</span></div>
      <div class="weapon-catalog">
        <button
          v-for="item in weaponOptions"
          :key="item.key"
          type="button"
          :class="{ equipped: item.equipped }"
          :disabled="!item.unlocked || item.equipped"
          :data-testid="`weapon-${item.key}`"
          @click="equipWeapon(item)"
        >
          <small>{{ item.element }} · Lv.{{ item.unlockLevel }} 解锁</small>
          <b>{{ item.name }}</b>
          <span>伤害 {{ item.damage }} · 射速 {{ item.fireRate }} · 弹丸 {{ item.projectiles }}</span>
          <em>{{ item.unlocked ? item.traits.join(' / ') : `角色达到 Lv.${item.unlockLevel}` }}</em>
        </button>
      </div>
    </div>

    <div class="progression-grid">
      <section class="progression-section talent-section">
        <div class="progression-title"><b>天赋树</b><span>可用 {{ talentPointsAvailable }} / 总计 {{ talentPointsTotal }}</span></div>
        <div class="talent-grid">
          <button v-for="talent in talentCards" :key="talent.id" type="button" :disabled="!talent.canUpgrade" @click="upgradeTalent(talent.id)">
            <small>{{ talent.branch }}</small>
            <b>{{ talent.name }} · {{ talent.level }}/{{ talent.maxLevel }}</b>
            <span>{{ talent.description }}</span>
          </button>
        </div>
      </section>

      <section class="progression-section offline-section">
        <div class="progression-title"><b>离线收益</b><span>最多累计 8 小时</span></div>
        <template v-if="pendingOfflineReward">
          <p>已累计 {{ Math.floor(pendingOfflineReward.cappedSeconds / 60) }} 分钟</p>
          <strong>金币 +{{ pendingOfflineReward.gold }} · 经验 +{{ pendingOfflineReward.exp }} · 零件 +{{ pendingOfflineReward.parts }}</strong>
          <button type="button" data-testid="claim-offline" @click="claimOfflineReward">领取离线收益</button>
        </template>
        <p v-else>当前没有待领取收益。离开游戏一分钟后开始累计。</p>
        <div class="cloud-state" :class="`status-${cloudSyncState.status}`">
          <b>{{ cloudSyncState.label }}</b>
          <span>{{ cloudSyncState.detail }}</span>
        </div>
      </section>
    </div>

    <div class="progression-grid">
      <section class="progression-section">
        <div class="progression-title"><b>套装进度</b><span>达到 2 / 4 件激活效果</span></div>
        <div class="set-grid">
          <article v-for="set in setProgress" :key="set.key" :class="{ active: set.count >= 2 }">
            <b>{{ set.key }} · {{ set.count }}/4</b>
            <span v-for="effect in set.effects" :key="effect">{{ effect }}</span>
          </article>
        </div>
      </section>

      <section class="progression-section">
        <div class="progression-title"><b>每日任务</b><span>按本地日期刷新</span></div>
        <div class="task-list">
          <article v-for="task in dailyTasks" :key="task.id">
            <div><b>{{ task.label }}</b><span>{{ task.progress }} / {{ task.target }}</span></div>
            <small>金币 +{{ task.reward.gold }} · 合金 +{{ task.reward.alloy }} · 零件 +{{ task.reward.parts }}</small>
            <button type="button" :disabled="task.claimed || task.progress < task.target" @click="claimDailyTask(task)">{{ task.claimed ? '已领取' : '领取' }}</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  weaponOptions, equipWeapon, talentCards, talentPointsAvailable, talentPointsTotal,
  upgradeTalent, setProgress, pendingOfflineReward, claimOfflineReward, dailyTasks,
  completedDailyTasks, claimDailyTask, cloudSyncState
} = useGameCanvasContext()
</script>
