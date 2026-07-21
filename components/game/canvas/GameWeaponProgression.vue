<template>
  <section class="progression-section">
    <div class="progression-title"><b>主武器库 · 12 类</b><span>攻击形态、弹匣、换弹、元素和固定特性均独立</span></div>
    <div class="weapon-catalog">
      <button v-for="item in weaponOptions" :key="item.key" type="button" :class="{ equipped: item.equipped }" :disabled="!item.unlocked || item.equipped" :data-testid="`weapon-${item.key}`" @click="equipWeapon(item)">
        <small>{{ item.category }} · {{ item.element }} · Lv.{{ item.unlockLevel }} 解锁</small>
        <b>{{ item.name }} · {{ '★'.repeat(item.progress.stars) || '未升星' }}</b>
        <span>Lv.{{ item.progress.level }} · 伤害 {{ item.damage }} · 射速 {{ item.fireRate }} · 弹匣 {{ item.magazineSize }} · {{ item.slotCount }} 槽</span>
        <em>{{ item.unlocked ? `${item.fixedTrait}｜${item.traits.join(' / ')}` : `角色达到 Lv.${item.unlockLevel}` }}</em>
      </button>
    </div>
    <div class="weapon-growth-actions">
      <div><b>当前武器成长</b><span>Lv.{{ currentWeaponProgress.level }}/120 · {{ currentWeaponProgress.stars }}/5 星</span></div>
      <button type="button" :disabled="currentWeaponProgress.level >= 120 || resources.gold < currentWeaponUpgradeCost.gold || resources.parts < currentWeaponUpgradeCost.parts" @click="upgradeCurrentWeapon">强化 · {{ currentWeaponUpgradeCost.gold }} 金 / {{ currentWeaponUpgradeCost.parts }} 零件</button>
      <button type="button" :disabled="currentWeaponProgress.stars >= 5 || resources.alloy < currentWeaponStarCost.alloy || resources.parts < currentWeaponStarCost.parts" @click="starCurrentWeapon">升星 · {{ currentWeaponStarCost.alloy }} 合金 / {{ currentWeaponStarCost.parts }} 零件</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { weaponOptions, equipWeapon, resources, currentWeaponProgress, currentWeaponUpgradeCost, currentWeaponStarCost, upgradeCurrentWeapon, starCurrentWeapon } = useGameCanvasContext()
</script>
