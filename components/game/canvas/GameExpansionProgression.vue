<template>
  <section class="expansion-progression" aria-label="深度成长、商店与联网赛季">
    <header>
      <div><p class="panel-kicker">深度成长</p><h3>战区后勤与赛季记录</h3></div>
      <div class="advanced-resource-row" aria-label="高级资源">
        <span>荣誉 <b>{{ advancedResources.honor }}</b></span>
        <span>精密元件 <b>{{ advancedResources.precision }}</b></span>
        <span>能量核心 <b>{{ advancedResources.energyCores }}</b></span>
        <span>重铸芯片 <b>{{ advancedResources.reforgeChips }}</b></span>
      </div>
    </header>

    <div class="expansion-grid">
      <article class="skill-growth-card">
        <h4>技能培养</h4>
        <button v-for="skill in skillCards" :key="skill.key" type="button" :disabled="skill.disabled" @click="upgradeSkill(skill.key)">
          <span><b>{{ skill.label }} Lv.{{ skill.level }}</b><small>{{ skill.link }}</small></span>
          <strong>{{ skill.level >= 5 ? '已满级' : `${skill.cost.gold} 金 / ${skill.cost.precision} 元件` }}</strong>
        </button>
      </article>

      <article class="shop-card">
        <h4>战区商店</h4>
        <button v-for="offer in offerCards" :key="offer.id" type="button" :disabled="offer.disabled" @click="buyShopOffer(offer.id)">
          <span><b>{{ offer.label }}</b><small>{{ offer.detail }} · 库存 {{ offer.stock }}</small></span>
          <strong>{{ offer.price }}</strong>
        </button>
      </article>

      <article class="season-card">
        <h4>{{ onlineLiveOps?.season.id ?? seasonState.id }} · {{ currentSeasonTier }}</h4>
        <div v-if="onlineLiveOps"><span>{{ onlineLiveOps.activity.label }}</span><b>{{ onlineLiveOps.activity.bonus }}</b></div>
        <div v-if="onlineLiveOps"><span>活动结束</span><b>{{ formatDate(onlineLiveOps.activity.endsAt) }}</b></div>
        <div><span>赛季积分</span><b>{{ seasonState.score }}</b></div>
        <div><span>主线最高</span><b>第 {{ highestCleared }} 关</b></div>
        <div><span>悬赏最快</span><b>{{ seasonState.bestBountySeconds == null ? '暂无' : `${seasonState.bestBountySeconds.toFixed(1)} 秒` }}</b></div>
        <div><span>生存最高击杀</span><b>{{ seasonState.bestSurvivalKills }}</b></div>
        <div><span>活动完成</span><b>{{ seasonState.eventClears }}</b></div>
        <button type="button" :disabled="onlineSeasonStatus.loading" @click="syncOnlineSeason">{{ onlineSeasonStatus.loading ? '同步中…' : '校验云存档并同步赛季' }}</button>
        <small>{{ onlineSeasonStatus.error || onlineSeasonStatus.label }}</small>
        <div class="leaderboard-tabs">
          <button v-for="metric in leaderboardMetrics" :key="metric" type="button" :class="{ active: metric === leaderboardMetric }" @click="refreshLeaderboard(metric)">{{ metricLabels[metric] }}</button>
        </div>
        <ol v-if="onlineLeaderboard.length" class="online-leaderboard">
          <li v-for="entry in onlineLeaderboard.slice(0, 10)" :key="`${entry.rank}-${entry.username}`" :class="{ current: entry.currentUser }"><span>#{{ entry.rank }} {{ entry.username }}</span><b>{{ formatScore(entry.score) }}</b></li>
        </ol>
        <small v-else>联网榜暂无数据；需登录云存档账号后同步。</small>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  resources, highestCleared, advancedResources, skillProgress, skillUpgradeCost, upgradeSkill, skillBuildLinks,
  shopState, shopOffers, buyShopOffer, seasonState, currentSeasonTier,
  onlineLiveOps, leaderboardMetrics, leaderboardMetric, onlineLeaderboard, onlineSeasonStatus, refreshLeaderboard, syncOnlineSeason
} = useGameCanvasContext()

const metricLabels = { 'highest-stage': '最高关卡', 'bounty-time': '悬赏竞速', 'survival-kills': '生存击杀', 'event-score': '活动积分' } as const
const formatDate = (value: string) => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const formatScore = (score: number) => leaderboardMetric.value === 'bounty-time' ? `${(score / 1000).toFixed(1)} 秒` : score.toLocaleString('zh-CN')

const labels = { dash: '战术冲刺', overload: '过载火力', pulse: '磁暴脉冲' } as const
const linkLabels = { dash: '生存标签联动', overload: '输出标签联动', pulse: '穿透标签联动' } as const
const skillCards = computed(() => (Object.keys(labels) as Array<keyof typeof labels>).map((key) => {
  const level = skillProgress[key]
  const cost = skillUpgradeCost(level)
  return { key, label: labels[key], level, cost, link: skillBuildLinks.value[key] ? linkLabels[key] : '当前无配件联动', disabled: level >= 5 || resources.gold < cost.gold || advancedResources.precision < cost.precision }
}))

const offerCards = computed(() => shopOffers.map((offer) => ({
  ...offer,
  stock: shopState.stock[offer.id],
  price: offer.cost.honor ? `${offer.cost.honor} 荣誉` : `${offer.cost.gold} 金`,
  disabled: shopState.stock[offer.id] <= 0 || resources.gold < offer.cost.gold || advancedResources.honor < offer.cost.honor
})))
</script>
