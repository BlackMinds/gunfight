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
          <article v-for="card in equipmentLeftSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
            </div>
          </article>
        </div>
        <div class="operator-card">
          <Operator3D :equipment="equippedParts" />
          <div class="operator-loadout">
            <span>已装备 {{ equippedParts.length }} / {{ attachmentSlots.length }}</span>
            <b>{{ weapon?.name ?? '突击步枪' }}</b>
          </div>
        </div>
        <div class="equipment-slots right">
          <article v-for="card in equipmentRightSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>
</template>

<script setup lang="ts">
import Operator3D from '../Operator3D.vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  mode, player, combatPower, equipmentLeftSlots, equipmentRightSlots,
  equipmentIconStyle, equippedParts, attachmentSlots, weapon
} = useGameCanvasContext()
</script>
