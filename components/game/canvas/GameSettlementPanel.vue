<template>
    <section v-if="mode === 'settlement'" class="settlement-panel">
      <p class="panel-kicker">{{ lastRun?.victory ? '关卡结算' : '撤离结算' }}</p>
      <h2>{{ lastRun?.title }}</h2>
      <p>{{ lastRun?.body }}</p>
      <p v-if="lastRun?.objectiveSummary" class="operation-objective-summary" data-testid="operation-objective-summary" role="status">{{ lastRun.objectiveSummary }}</p>
      <div v-if="lastRun?.reward" class="reward-grid">
        <span>金币 +{{ lastRun.reward.gold }}</span>
        <span>经验 +{{ lastRun.reward.exp }}</span>
        <span>合金 +{{ lastRun.reward.alloy }}</span>
        <span>零件 +{{ lastRun.reward.parts }}</span>
      </div>
      <div v-if="lastRun?.stats" class="run-report" aria-label="本关战斗数据">
        <article><span>{{ lastRun.victory ? '通关时间' : '撤离时间' }}</span><b>{{ formatPreciseClock(lastRun.stats.duration) }}</b></article>
        <article><span>{{ operationDefinition.id === 'campaign' ? '时长目标' : '行动判定' }}</span><b>{{ lastRun.stats.durationVerdict }}</b></article>
        <article><span>击杀数量</span><b>{{ lastRun.stats.kills }}</b></article>
        <article><span>受伤次数</span><b>{{ lastRun.stats.hitCount }} 次</b></article>
        <article><span>吸血恢复</span><b>{{ Math.round(lastRun.stats.lifestealHealing) }}</b></article>
        <article><span>总伤害</span><b>{{ Math.round(lastRun.stats.totalDamage) }}</b></article>
        <article><span>平均 DPS</span><b>{{ Math.round(lastRun.stats.averageDps) }}</b></article>
        <article><span>最高 3 秒 DPS</span><b>{{ Math.round(lastRun.stats.peakDps) }}</b></article>
        <article><span>峰值 / 均值差距</span><b>{{ lastRun.stats.dpsGapPercent }}%</b></article>
        <article><span>最高单次伤害</span><b>{{ Math.round(lastRun.stats.highestHit) }}</b></article>
        <article><span>本关金币</span><b>+{{ lastRun.stats.goldEarned }}</b></article>
        <article><span>本关经验</span><b>+{{ lastRun.stats.expEarned }}</b></article>
        <article v-if="lastRun.stats.deathCombination"><span>致命敌人组合</span><b>{{ lastRun.stats.deathCombination }}</b></article>
      </div>
      <div v-if="lastRun?.stats" class="wave-run-report" aria-label="逐波清理时间">
        <article v-for="wave in lastRun.stats.waves" :key="wave.wave">
          <span>第 {{ wave.wave }} 波 · {{ wave.label }}</span>
          <b>{{ wave.cleared ? '' : '未清 · ' }}{{ wave.duration.toFixed(1) }} 秒</b>
          <small>{{ formatEnemyKinds(wave.enemyKinds) }}</small>
        </article>
      </div>
      <div v-if="overflowSalvageNotice" class="overflow-salvage-notice" data-testid="overflow-salvage-settlement" role="status">
        <b>背包已满，自动回收 {{ overflowSalvageNotice.items.length }} 件低优先级配件</b>
        <span>{{ overflowSalvageNotice.items.map((item) => item.name).join('、') }}</span>
        <strong>返还金币 +{{ overflowSalvageNotice.gold }} / 零件 +{{ overflowSalvageNotice.parts }}</strong>
      </div>
      <section v-if="lastRun?.stats" class="strategy-report" aria-label="配件战术贡献">
        <div class="strategy-report__head">
          <div><p class="panel-kicker">配件策略复盘</p><h3>这套构筑实际做了什么</h3></div>
          <span>按本关命中与闪避实时统计</span>
        </div>
        <div class="strategy-report__grid">
          <article v-for="insight in lastRunStrategyInsights" :key="insight.key" :class="{ muted: !insight.effective }">
            <span>{{ insight.label }}</span>
            <b>{{ insight.value }}</b>
            <small>{{ insight.fit }}</small>
            <em v-if="!insight.effective">本关收益不明显</em>
          </article>
        </div>
      </section>
      <div v-if="lastRun?.reward?.attachments.length" class="loot-card-grid">
        <article v-for="item in lastRun.reward.attachments" :key="attachmentKey(item)" class="loot-card" :class="`rarity-${item.rarity}`">
          <span class="new-tag">新获得</span>
          <span class="recommend-tag" :class="settlementLootTone(item)">{{ settlementLootLabel(item) }}</span>
          <p>{{ item.slot }} · {{ item.rarity }}</p>
          <h3>{{ item.name }}</h3>
          <strong>{{ item.effect }}</strong>
          <p v-if="item.specialEffect" class="attachment-special-effect"><b>专属效果</b>{{ item.specialEffect }}</p>
          <div class="equipped-now">
            <span>当前已装备</span>
            <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b>
          </div>
          <div class="loot-compare">
            <div v-if="isAttachmentInInventory(item)" class="decision-hint compact" :class="`tone-${attachmentDecisionFor(item).tone}`">
              <b>{{ attachmentDecisionFor(item).label }}</b>
              <span>{{ attachmentDecisionFor(item).summary }}</span>
            </div>
            <div v-else-if="isAttachmentEquipped(item)" class="decision-hint compact tone-survival">
              <b>已完成替换</b>
              <span>当前同槽已同步为这件配件。</span>
            </div>
            <div v-else class="decision-hint compact tone-downgrade">
              <b>已自动回收</b>
              <span>背包满时转为金币和零件，返还明细见上方提示。</span>
            </div>
            <div class="compare-title">
              <div>
                <span>当前已装备</span>
                <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b>
              </div>
              <div>
                <span>本次掉落</span>
                <b>{{ item.name }}</b>
              </div>
            </div>
            <div class="compare-lines compact">
              <div v-for="row in attachmentComparisonFor(item)" :key="row.label">
                <span>{{ row.label }}</span>
                <b>{{ row.current }}</b>
                <strong>→</strong>
                <b>{{ row.next }}</b>
              </div>
            </div>
            <div class="attachment-dimensions compact" aria-label="输出、生存和功能对比">
              <article v-for="dimension in attachmentDimensionsFor(item)" :key="dimension.key" :class="{ gain: dimension.delta > 0, loss: dimension.delta < 0 }">
                <span>{{ dimension.label }}</span>
                <b>{{ dimension.current }} → {{ dimension.next }}</b>
                <small>{{ dimension.delta > 0 ? '+' : '' }}{{ dimension.delta }}</small>
              </article>
            </div>
          </div>
          <div class="loot-card-actions">
            <span :class="{ equipped: isAttachmentEquipped(item) }">{{ settlementLootStatus(item) }}</span>
            <button type="button" :disabled="!isAttachmentInInventory(item) || !canEquipAttachment(item)" @click="equipSettlementAttachment(item)">{{ canEquipAttachment(item) ? '立即装备' : `已达 ${weapon.slotCount} 槽上限` }}</button>
          </div>
        </article>
      </div>
      <p v-if="settlementEquipNotice" class="settlement-equip-notice">
        <span><b>{{ settlementEquipNotice.equipped }}</b> 已装备</span>
        <span v-if="settlementEquipNotice.replaced">替换下的 <b>{{ settlementEquipNotice.replaced }}</b> 已回背包</span>
      </p>
      <div v-if="lastRun?.victory" class="post-battle-grid">
        <button v-for="choice in postBattleChoices" :key="choice.name" type="button" :disabled="choice.disabled" @click="choosePostBattle(choice)">
          <b>{{ choice.name }}</b>
          <span>{{ choice.desc }}</span>
        </button>
      </div>
      <p v-if="postBattleChoiceTaken" class="post-battle-choice-notice">本次战后处置已完成，同一结算不可重复选择。</p>
      <div class="settlement-actions">
        <button type="button" @click="returnToBase">返回基地整备</button>
        <button v-if="lastRun?.victory && isIndependentOperation" type="button" class="primary" data-testid="restart-operation" :disabled="inventoryOverCapacity" @click="startStage">再次执行 {{ operationDefinition.shortLabel }}</button>
        <button v-else-if="lastRun?.victory && canAdvanceToNextStage" type="button" class="primary" data-testid="advance-next-stage" :disabled="inventoryOverCapacity" @click="advanceAndStart">直接下一关</button>
        <button v-else-if="lastRun?.victory" type="button" class="primary" data-testid="stage-cap-reached" disabled>已达第 {{ PUBLISHED_STAGE_CAP }} 关上限</button>
        <button v-else type="button" class="primary" @click="startStage">重新挑战</button>
      </div>
    </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
import { PUBLISHED_STAGE_CAP } from '~/shared/game/formulas'

const {
  mode, lastRun, formatPreciseClock, formatEnemyKinds, overflowSalvageNotice,
  lastRunStrategyInsights, attachmentKey, settlementLootTone, settlementLootLabel,
  currentAttachmentFor, isAttachmentInInventory, attachmentDecisionFor, attachmentDimensionsFor,
  isAttachmentEquipped, attachmentComparisonFor, settlementLootStatus,
  canEquipAttachment, weapon, equipSettlementAttachment, settlementEquipNotice, postBattleChoices,
  choosePostBattle, postBattleChoiceTaken, returnToBase, inventoryOverCapacity, canAdvanceToNextStage,
  advanceAndStart, startStage, isIndependentOperation, operationDefinition
} = useGameCanvasContext()
</script>
