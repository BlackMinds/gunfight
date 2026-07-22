<template>
    <section v-if="mode === 'base'" class="base-panel">
      <div class="base-hero">
        <p class="panel-kicker">外围基地</p>
        <h1>配件整备台已开启</h1>
        <p>挑选更好的词条底子，整理背包后再推进下一关。</p>
        <div class="resource-rail">
          <span>
            <small>重铸手续费</small>
            金币 <b>{{ resources.gold }}</b>
          </span>
          <span>
            <small>锁定副词条</small>
            合金 <b>{{ resources.alloy }}</b>
          </span>
          <span>
            <small>强化 / 重铸</small>
            零件 <b>{{ resources.parts }}</b>
          </span>
          <span>
            <small>成长等级</small>
            角色 Lv.<b>{{ player.level }}</b>
          </span>
        </div>
        <section class="mission-briefing" data-testid="mission-briefing" aria-labelledby="mission-briefing-title">
          <header class="mission-briefing__head">
            <div>
              <p class="panel-kicker">下一步行动</p>
              <h2 id="mission-briefing-title">第 {{ stageLabel }} 关部署简报</h2>
            </div>
            <span>{{ stageType }}</span>
          </header>
          <div class="base-intel">
            <article>
              <span>当前战力</span>
              <b>{{ combatPower }}</b>
              <small>伤害 {{ damagePreview }} · 射速 {{ fireRatePreview }}/秒 · 生命 {{ player.maxHp }}</small>
            </article>
            <article>
              <span>下一关敌情</span>
              <b>{{ nextEnemyPreview.label }}</b>
              <small>生命 {{ nextEnemyPreview.hp }} · 伤害 {{ nextEnemyPreview.damage }} · {{ stageType }}</small>
              <small v-if="nextEnemyPreview.stageBandLabel" class="r5-stage-intel" data-testid="r5-stage-intel">
                R5 战区：{{ nextEnemyPreview.stageBandLabel }} · {{ nextEnemyPreview.eliteAffixCount }} 词缀 · {{ operationDefinition.id === 'survival' ? '无 Boss · 90 秒连续压力' : `Boss ${nextEnemyPreview.bossPhaseCount} 阶段` }} · 建议 DPS {{ nextEnemyPreview.expectedDps }} / 生命 {{ nextEnemyPreview.expectedMaxHp }}
              </small>
              <small v-if="nextEnemyPreview.warzoneLandmark" class="r5-map-intel" data-testid="r5-map-intel">
                地图：{{ nextEnemyPreview.warzoneLandmark }} · 走位重点：{{ nextEnemyPreview.warzonePositioningRule }}
              </small>
              <small v-if="nextEnemyPreview.mechanicLabels.length">累计机制：{{ nextEnemyPreview.mechanicLabels.join(' / ') }}</small>
            </article>
          </div>
          <div class="operation-picker" data-testid="operation-picker" aria-label="行动类型选择">
            <button
              v-for="operation in operationOptions"
              :key="operation.id"
              type="button"
              :class="{ active: selectedOperationMode === operation.id }"
              :disabled="!operation.unlocked"
              :aria-pressed="selectedOperationMode === operation.id"
              @click="selectOperation(operation.id)"
            >
              <b>{{ operation.label }}</b>
              <span>{{ operation.unlocked ? operation.summary : '完成第 500 关后开放' }}</span>
            </button>
          </div>
          <div class="stage-picker" aria-label="关卡选择">
            <button type="button" aria-label="减少十关" @click="adjustStage(-10)">-10</button>
            <button type="button" aria-label="减少一关" @click="adjustStage(-1)">-1</button>
            <label>
              <span>目标关卡</span>
              <input v-model.number="stageDraft" type="number" min="1" :max="maxSelectableStage" @change="commitStageDraft" @blur="commitStageDraft" @keyup.enter="commitStageDraft" />
            </label>
            <button type="button" aria-label="增加一关" @click="adjustStage(1)">+1</button>
            <button type="button" aria-label="增加十关" @click="adjustStage(10)">+10</button>
          </div>
          <p v-if="debugStageSelection" class="debug-stage-note">开发调试选关已开启 · R4 / R5 发布验收已完成，正式版本上限为第 10000 关</p>
          <div class="base-actions">
            <button type="button" class="primary" data-testid="deploy-stage" :disabled="inventoryOverCapacity" @click="startStage">部署 · {{ operationDefinition.label }}</button>
            <p v-if="inventoryOverCapacity" class="capacity-blocker" data-testid="inventory-capacity-blocker" role="alert">背包超出容量：请取消部分收藏保护、装备或出售配件后再部署。</p>
          </div>
          <div class="reward-preview" aria-label="奖励预览">
            <article>
              <span>预计金币</span>
              <b>{{ stageRewardPreview.gold }}</b>
            </article>
            <article>
              <span>预计合金</span>
              <b>{{ stageRewardPreview.alloy }}</b>
            </article>
            <article>
              <span>配件概率</span>
              <b>{{ dropProfile.dropChance }}%</b>
            </article>
            <article>
              <span>可能品质</span>
              <b>{{ dropProfile.raritySummary }}</b>
            </article>
          </div>
        </section>
        <div class="character-panel" aria-label="角色属性">
          <div class="character-level">
            <span>角色等级</span>
            <b>Lv.{{ player.level }}</b>
            <small>经验 {{ player.exp }} / {{ nextLevelExp }}，还差 {{ expToNextLevel }} 点升级</small>
            <div class="bar exp">
              <span :style="{ width: `${expPercent}%` }" />
            </div>
          </div>
          <div class="character-stats" aria-label="完整战斗属性">
            <article v-for="stat in characterStats" :key="stat.key" :class="`tone-${stat.tone}`" :title="stat.hint">
              <span>{{ stat.label }}</span>
              <b>{{ stat.value }}</b>
            </article>
          </div>
        </div>
      </div>

      <div class="base-backpack" :class="{ 'sale-mode': isSaleMode }">
        <div class="base-backpack-head">
          <div>
            <p class="panel-kicker">配件背包</p>
            <h3>{{ attachmentSwapLabel }}</h3>
          </div>
          <div class="backpack-summary">
            <span data-testid="inventory-capacity" :class="{ warning: inventoryNearCapacity }">容量 {{ inventoryCapacityLabel }} · 收藏 {{ favoriteAttachmentCount }} · 当前显示 {{ filteredInventory.length }}</span>
            <button type="button" data-testid="sale-mode-toggle" :class="{ active: isSaleMode }" :disabled="!inventory.length" @click="toggleSaleMode">
              {{ isSaleMode ? '退出出售' : '出售配件' }}
            </button>
          </div>
        </div>
        <div v-if="inventory.length" class="backpack-toolbar">
          <label>
            <span>排序</span>
            <select v-model="selectedInventorySort">
              <option v-for="option in inventorySortOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <div class="inventory-filter" aria-label="配件状态筛选">
            <button v-for="option in inventoryFilterOptions" :key="option" type="button" :class="{ active: selectedInventoryFilter === option }" @click="selectedInventoryFilter = option">
              {{ option }}
            </button>
          </div>
          <label>
            <span>品质</span>
            <select v-model="selectedRarity">
              <option v-for="rarity in attachmentRarityFilters" :key="rarity" :value="rarity">
                {{ rarity }}（{{ rarity === '全部' ? inventory.length : inventoryByRarity[rarity] ?? 0 }}）
              </option>
            </select>
          </label>
        </div>
        <div v-if="inventory.length" class="slot-filter-block">
          <div class="filter-caption">
            <span>装备槽位</span>
            <b>{{ selectedSlot }}</b>
          </div>
          <div class="slot-filter" aria-label="装备槽位筛选">
            <button v-for="slot in attachmentSlotFilters" :key="slot" type="button" :class="{ active: selectedSlot === slot }" @click="selectedSlot = slot">
              <b>{{ slot }}</b>
              <span>{{ slot === '全部' ? inventory.length : inventoryBySlot[slot]?.length ?? 0 }}</span>
            </button>
          </div>
        </div>
        <div v-if="isSaleMode" class="sale-toolbar" data-testid="sale-toolbar" aria-label="出售操作">
          <div>
            <span>已选择 {{ saleItems.length }} 件</span>
            <b>预计获得：金币 +{{ saleReward.gold }} / 零件 +{{ saleReward.parts }}</b>
          </div>
          <button type="button" data-testid="sale-select-all" :disabled="!sellableFilteredInventory.length" @click="toggleFilteredSaleSelection">
            {{ allFilteredSelected ? '取消当前' : '全选当前' }}
          </button>
          <button type="button" :disabled="!saleItems.length" @click="clearSaleSelection">清空</button>
          <button type="button" class="sale-confirm" data-testid="sale-confirm" :disabled="!saleItems.length" @click="sellSelectedAttachments">
            出售 {{ saleItems.length }} 件
          </button>
        </div>
        <div class="base-backpack-layout">
          <div class="base-backpack-list">
          <p v-if="!inventory.length" class="empty-backpack">打关卡有概率掉落配件，获得后会进入这里。</p>
          <p v-else-if="!filteredInventory.length" class="empty-backpack">当前整理条件下没有可用配件。</p>
          <article
            v-for="item in filteredInventory"
            :key="attachmentKey(item)"
            class="inventory-icon-shell"
            data-testid="inventory-item-shell"
            :data-attachment-id="attachmentKey(item)"
            :class="{ 'sale-selected': isSaleSelected(item), 'favorite-protected': item.favorite }"
          >
            <button
              type="button"
              class="inventory-icon-item"
              data-testid="inventory-item-button"
              :class="[`rarity-${item.rarity}`, { selected: !isSaleMode && selectedAttachment && sameAttachment(selectedAttachment, item) }]"
              :aria-label="`${item.name}，${item.slot}，${item.rarity}，${item.effect}${item.favorite ? '，已收藏保护' : ''}`"
              :aria-pressed="isSaleMode ? isSaleSelected(item) : undefined"
              :disabled="!canSwapAttachment || (isSaleMode && item.favorite)"
              @click="handleInventoryItemClick(item)"
            >
              <span class="inventory-item-art" :style="equipmentIconStyle(item, Math.max(0, attachmentSlots.indexOf(item.slot)))" aria-hidden="true" />
              <span class="inventory-item-level">+{{ item.level ?? 0 }}</span>
              <span class="inventory-item-slot">{{ item.slot }}</span>
              <span v-if="item.favorite" class="inventory-favorite-mark" aria-hidden="true">★</span>
              <span v-if="isSaleMode" class="inventory-sale-check" :class="{ protected: item.favorite }" aria-hidden="true">{{ item.favorite ? '锁' : isSaleSelected(item) ? '✓' : '' }}</span>
            </button>
            <div v-if="!isSaleMode" class="inventory-item-tooltip" role="tooltip">
              <div class="inventory-tooltip-head">
                <div>
                  <b>{{ item.name }}</b>
                  <small>{{ item.slot }} · {{ item.rarity }} · Roll {{ formatRoll(item.roll) }}</small>
                </div>
                <strong :class="`tone-${attachmentDecisionFor(item).tone}`">{{ attachmentDecisionFor(item).actionLabel }}</strong>
              </div>
              <em>{{ item.effect }}</em>
              <p v-if="item.specialEffect" class="attachment-special-effect"><b>专属效果</b>{{ item.specialEffect }}</p>
              <div v-if="item.subAffixes?.length" class="inventory-tooltip-affixes" aria-label="副词条锁定">
                <button
                  v-for="affix in item.subAffixes"
                  :key="affix.key"
                  type="button"
                  data-testid="affix-lock"
                  :class="{ locked: isReforgeAffixLocked(item, affix) }"
                  :aria-pressed="isReforgeAffixLocked(item, affix)"
                  @click.stop="toggleReforgeAffixLock(item, affix)"
                >
                  <span>{{ isReforgeAffixLocked(item, affix) ? '已锁定' : '锁定' }}</span>
                  <b>{{ formatAffix(affix) }}</b>
                </button>
              </div>
              <p class="reforge-cost-note" data-testid="reforge-cost-status" :class="{ shortage: reforgeShortageText(item) }">
                {{ reforgeShortageText(item) || `重铸消耗 ${formatReforgeCost(item)}` }}
              </p>
              <div class="inventory-tooltip-names">
                <span>当前 <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b></span>
                <span>替换 <b>{{ item.name }}</b></span>
              </div>
              <div class="inventory-tooltip-compare">
                <div v-for="row in attachmentComparisonFor(item)" :key="row.label">
                  <span>{{ row.label }}</span>
                  <b>{{ row.current }}</b>
                  <strong>→</strong>
                  <b>{{ row.next }}</b>
                </div>
              </div>
              <div class="attachment-dimensions" aria-label="输出、生存和功能对比">
                <article v-for="dimension in attachmentDimensionsFor(item)" :key="dimension.key" :class="{ gain: dimension.delta > 0, loss: dimension.delta < 0 }">
                  <span>{{ dimension.label }}</span>
                  <b>{{ dimension.current }} → {{ dimension.next }}</b>
                  <small>{{ dimension.delta > 0 ? '+' : '' }}{{ dimension.delta }} · {{ dimension.summary }}</small>
                </article>
              </div>
              <div class="inventory-tooltip-actions">
                <button type="button" :disabled="!canSwapAttachment || !canEquipAttachment(item)" @click.stop="equipInventoryAttachment(item)">{{ canEquipAttachment(item) ? `装备 ${item.slot}` : `已达 ${weapon.slotCount} 槽上限` }}</button>
                <button type="button" data-testid="favorite-toggle" :class="{ active: item.favorite }" :aria-pressed="Boolean(item.favorite)" @click.stop="toggleAttachmentFavorite(item)">{{ item.favorite ? '取消收藏' : '收藏保护' }}</button>
                <button type="button" :disabled="!canUpgradeAttachment(item)" @click.stop="upgradeInventoryAttachment(item)">强化 {{ attachmentUpgradeCost(item) }} 零件</button>
                <button type="button" data-testid="reforge-action" :disabled="!canReforgeAttachment(item)" @click.stop="reforgeInventoryAttachment(item)">重铸 {{ formatReforgeCost(item) }}</button>
              </div>
            </div>
          </article>
          </div>
        </div>
        <div v-if="overflowSalvageNotice" class="overflow-salvage-notice base-overflow-salvage-notice" data-testid="overflow-salvage-base" role="status">
          <b>背包已满，自动回收 {{ overflowSalvageNotice.items.length }} 件低优先级配件</b>
          <span>{{ overflowSalvageNotice.items.map((item) => item.name).join('、') }}</span>
          <strong>返还金币 +{{ overflowSalvageNotice.gold }} / 零件 +{{ overflowSalvageNotice.parts }}</strong>
        </div>
      </div>

      <GameProgressionPanel class="progression-desktop" />
    </section>
</template>

<script setup lang="ts">
import GameProgressionPanel from './GameProgressionPanel.vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  mode, resources, player, combatPower, damagePreview, fireRatePreview, nextEnemyPreview,
  operationOptions, selectedOperationMode, operationDefinition, selectOperation,
  stageType, adjustStage, stageDraft, maxSelectableStage, commitStageDraft,
  debugStageSelection, stageRewardPreview, dropProfile, inventoryOverCapacity, startStage,
  stageLabel, nextLevelExp, expToNextLevel, expPercent, characterStats, isSaleMode,
  attachmentSwapLabel, inventoryNearCapacity, inventoryCapacityLabel, favoriteAttachmentCount,
  filteredInventory, inventory, toggleSaleMode, selectedInventorySort, inventorySortOptions,
  inventoryFilterOptions, selectedInventoryFilter, selectedRarity, attachmentRarityFilters,
  inventoryByRarity, selectedSlot, attachmentSlotFilters, inventoryBySlot, saleItems,
  saleReward, sellableFilteredInventory, toggleFilteredSaleSelection, allFilteredSelected,
  clearSaleSelection, sellSelectedAttachments, attachmentKey, isSaleSelected,
  selectedAttachment, sameAttachment, canSwapAttachment, handleInventoryItemClick,
  equipmentIconStyle, attachmentSlots, formatRoll, attachmentDecisionFor,
  isReforgeAffixLocked, toggleReforgeAffixLock, formatAffix, reforgeShortageText,
  formatReforgeCost, currentAttachmentFor, attachmentComparisonFor,
  attachmentDimensionsFor, canEquipAttachment, weapon, equipInventoryAttachment, toggleAttachmentFavorite, canUpgradeAttachment,
  upgradeInventoryAttachment, attachmentUpgradeCost, canReforgeAttachment,
  reforgeInventoryAttachment, overflowSalvageNotice
} = useGameCanvasContext()
</script>
