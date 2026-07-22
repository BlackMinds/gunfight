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
      <div><b>当前武器成长</b><span>Lv.{{ currentWeaponProgress.level }}/120 · {{ currentWeaponProgress.stars }}/5 星 · {{ currentWeaponProgress.breakthrough ? '已突破' : '未突破' }}</span></div>
      <div><b>随机词条</b><span>{{ currentWeaponProgress.affixes.map((affix) => `${affix.label} +${affix.key === 'pierce' ? affix.value : Math.round(affix.value * 100) + '%'}`).join(' · ') }}</span></div>
      <button type="button" :disabled="currentWeaponProgress.level >= 120 || resources.gold < currentWeaponUpgradeCost.gold || resources.parts < currentWeaponUpgradeCost.parts" @click="upgradeCurrentWeapon">强化 · {{ currentWeaponUpgradeCost.gold }} 金 / {{ currentWeaponUpgradeCost.parts }} 零件</button>
      <button type="button" :disabled="currentWeaponProgress.stars >= 5 || resources.alloy < currentWeaponStarCost.alloy || resources.parts < currentWeaponStarCost.parts" @click="starCurrentWeapon">升星 · {{ currentWeaponStarCost.alloy }} 合金 / {{ currentWeaponStarCost.parts }} 零件</button>
      <button type="button" :disabled="currentWeaponProgress.breakthrough || currentWeaponProgress.level < 120 || currentWeaponProgress.stars < 5 || advancedResources.energyCores < weaponBreakthroughCost.energyCores || advancedResources.precision < weaponBreakthroughCost.precision" @click="breakthroughCurrentWeapon">突破 · 2 核心 / 12 精密件</button>
      <button type="button" :disabled="advancedResources.reforgeChips < weaponReforgeCost.reforgeChips" @click="reforgeCurrentWeapon">重铸词条 · 2 芯片</button>
      <button type="button" :disabled="resources.gold < 600" @click="openWeaponCrate">开启武器箱 · 600 金</button>
    </div>
    <div class="weapon-growth-actions">
      <div><b>支援武器</b><span>每 2.5 秒自动攻击，造成该武器 35% 伤害</span></div>
      <button type="button" :disabled="!selectedSupportWeaponKey" @click="equipSupportWeapon(null)">卸下支援</button>
      <button v-for="item in supportWeaponOptions" :key="`support-${item.key}`" type="button" :disabled="item.supportEquipped" @click="equipSupportWeapon(item)">{{ item.supportEquipped ? '支援中' : '设为支援' }} · {{ item.name }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { weaponOptions, equipWeapon, resources, advancedResources, currentWeaponProgress, currentWeaponUpgradeCost, currentWeaponStarCost, upgradeCurrentWeapon, starCurrentWeapon, supportWeaponOptions, selectedSupportWeaponKey, equipSupportWeapon, breakthroughCurrentWeapon, reforgeCurrentWeapon, openWeaponCrate, weaponBreakthroughCost, weaponReforgeCost } = useGameCanvasContext()
</script>
