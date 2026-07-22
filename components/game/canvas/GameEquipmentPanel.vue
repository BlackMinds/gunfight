<template>
    <section v-if="mode === 'base'" class="equipment-panel equipment-dock" aria-label="角色装备界面">
      <div class="equipment-head">
        <div>
          <p class="panel-kicker">角色装备</p>
          <h2>训练者 Lv.{{ player.level }}</h2>
        </div>
        <div class="equipment-power" aria-label="综合战力">
          <span>综合战力</span>
          <b>{{ combatPower }}</b>
        </div>
      </div>
      <div class="equipment-layout">
        <div class="equipment-slots left">
          <article v-for="card in equipmentLeftSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item, inactive: card.item && !card.active, selected: card.item && selectedEquippedAttachment && sameAttachment(card.item, selectedEquippedAttachment) }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
              <em v-if="card.item && !card.active">当前武器槽位上限，效果未激活</em>
              <button v-if="card.item" type="button" class="equipment-manage-trigger" @click="selectEquippedAttachment(card.item)">培养</button>
            </div>
          </article>
        </div>
        <div class="operator-card">
          <Operator3D :equipment="equippedParts" />
          <div class="operator-loadout">
            <span>已激活 {{ activeEquipmentLabel }} · 已安装 {{ equippedParts.length }} / {{ attachmentSlots.length }}</span>
            <b>{{ weapon?.name ?? '突击步枪' }}</b>
          </div>
        </div>
        <div class="equipment-slots right">
          <article v-for="card in equipmentRightSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item, inactive: card.item && !card.active, selected: card.item && selectedEquippedAttachment && sameAttachment(card.item, selectedEquippedAttachment) }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
              <em v-if="card.item && !card.active">当前武器槽位上限，效果未激活</em>
              <button v-if="card.item" type="button" class="equipment-manage-trigger" @click="selectEquippedAttachment(card.item)">培养</button>
            </div>
          </article>
        </div>
      </div>
      <div v-if="selectedEquippedAttachment" class="equipment-cultivation" data-testid="equipped-cultivation">
        <div>
          <small>已装备配件培养</small>
          <b>{{ selectedEquippedAttachment.name }} · +{{ selectedEquippedAttachment.level ?? 0 }} · ★{{ selectedEquippedAttachment.stars ?? 0 }}/3{{ selectedEquippedAttachment.breakthrough ? ' · 已突破' : '' }}</b>
          <span>{{ selectedEquippedAttachment.effect }}</span>
        </div>
        <div v-if="selectedEquippedAttachment.subAffixes?.length" class="equipment-affix-locks" aria-label="已装备配件副词条锁定">
          <button
            v-for="affix in selectedEquippedAttachment.subAffixes"
            :key="affix.key"
            type="button"
            :class="{ locked: isReforgeAffixLocked(selectedEquippedAttachment, affix) }"
            :aria-pressed="isReforgeAffixLocked(selectedEquippedAttachment, affix)"
            @click="toggleReforgeAffixLock(selectedEquippedAttachment, affix)"
          >
            {{ isReforgeAffixLocked(selectedEquippedAttachment, affix) ? '已锁' : '锁定' }} · {{ formatAffix(affix) }}
          </button>
        </div>
        <div class="equipment-cultivation-actions">
          <button type="button" :disabled="!canUpgradeAttachment(selectedEquippedAttachment)" @click="upgradeInventoryAttachment(selectedEquippedAttachment)">强化 {{ attachmentUpgradeCost(selectedEquippedAttachment) }} 零件</button>
          <button type="button" :disabled="!canReforgeAttachment(selectedEquippedAttachment)" @click="reforgeInventoryAttachment(selectedEquippedAttachment)">重铸 {{ formatReforgeCost(selectedEquippedAttachment) }}</button>
          <button type="button" :disabled="!canStarAttachment(selectedEquippedAttachment)" @click="starAttachment(selectedEquippedAttachment)">
            升星 {{ selectedEquippedAttachment.stars ?? 0 }}/3 · {{ attachmentStarCost(selectedEquippedAttachment).gold }} 金 / {{ attachmentStarCost(selectedEquippedAttachment).precision }} 元件
          </button>
          <button type="button" :disabled="!canBreakthroughAttachment(selectedEquippedAttachment)" @click="breakthroughAttachment(selectedEquippedAttachment)">
            {{ selectedEquippedAttachment.breakthrough ? '已突破' : `突破 · ${attachmentBreakthroughCost(selectedEquippedAttachment).precision} 元件 / ${attachmentBreakthroughCost(selectedEquippedAttachment).energyCores} 核心` }}
          </button>
        </div>
      </div>
    </section>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const Operator3D = defineAsyncComponent(() => import('../Operator3D.vue').then((module) => module.default))

const {
  mode, player, combatPower, equipmentLeftSlots, equipmentRightSlots,
  equipmentIconStyle, equippedParts, attachmentSlots, activeEquipmentLabel, weapon,
  selectedEquippedAttachment, selectEquippedAttachment, sameAttachment,
  isReforgeAffixLocked, toggleReforgeAffixLock, formatAffix,
  canUpgradeAttachment, upgradeInventoryAttachment, attachmentUpgradeCost,
  canReforgeAttachment, reforgeInventoryAttachment, formatReforgeCost,
  attachmentStarCost, canStarAttachment, starAttachment,
  attachmentBreakthroughCost, canBreakthroughAttachment, breakthroughAttachment
} = useGameCanvasContext()
</script>
