<template>
    <section class="top-actions" aria-label="资源与菜单">
      <div class="currency-chip">
        <span>●</span>
        <b>{{ resources.gold }}</b>
      </div>
      <button type="button" disabled title="设置功能开发中">⚙ 设置</button>
      <button type="button" data-testid="return-to-base" @click="returnToBase">⇥ 退出</button>
    </section>

    <aside class="hud hud-left" :class="{ 'is-upgrade-obscured': upgradeChoices.length && mode === 'battle' }">
      <div class="profile-card">
        <div class="rank-mark" aria-hidden="true">◆</div>
        <div>
          <div class="profile-line">
            <b>训练者</b>
            <span>Lv.{{ player.level }}</span>
          </div>
          <div class="bar hp">
            <span :style="{ width: `${hpPercent}%` }" />
          </div>
          <small>{{ Math.ceil(player.hp) }} / {{ player.maxHp }}</small>
        </div>
      </div>
      <div class="stat-board">
        <p class="panel-kicker">基础属性</p>
        <div class="stat-row">
          <span>攻击力</span>
          <b>{{ damagePreview }}</b>
        </div>
        <div class="stat-row">
          <span>主武器</span>
          <b>{{ weapon.name }}</b>
        </div>
        <div class="stat-row">
          <span>元素</span>
          <b>{{ weapon.element }}</b>
        </div>
        <div class="stat-row">
          <span>弹匣</span>
          <b>{{ weaponReloadTimer > 0 ? `换弹 ${weaponReloadTimer.toFixed(1)}s` : weaponCharging ? `蓄力 ${weaponChargeTimer.toFixed(1)}s` : `${weaponAmmo} / ${weapon.magazineSize}` }}</b>
        </div>
        <div class="stat-row">
          <span>生命值</span>
          <b>{{ Math.ceil(player.hp) }} / {{ player.maxHp }}</b>
        </div>
        <div class="stat-row">
          <span>经验值</span>
          <b>{{ player.exp }} / {{ nextLevelExp }}</b>
        </div>
        <div class="stat-row">
          <span>合金</span>
          <b>{{ resources.alloy }}</b>
        </div>
      </div>
    </aside>

    <aside class="hud hud-right dps-hud">
      <p class="panel-kicker">实时输出</p>
      <div class="dps-readout">
        <span>最近 3 秒实际 DPS</span>
        <b>{{ Math.round(runStats.currentDps) }}</b>
        <small>仅统计实际造成伤害</small>
      </div>
    </aside>

    <section v-if="mode === 'battle'" class="wave-command" aria-label="波次进度">
      <div class="wave-command__title">
        <span>第 {{ currentWave }} / {{ totalWaves }} 波</span>
        <b>{{ operationDefinition.shortLabel }} · {{ currentWaveDefinition?.label }} · {{ operationProgressText }} · {{ formatClock(elapsedSeconds) }}</b>
      </div>
      <div class="wave-ticks">
        <i v-for="wave in wavePlan" :key="wave.index" :class="{ active: wave.index === currentWave, cleared: wave.index < currentWave }" />
      </div>
      <small>{{ waveStatusText }}</small>
      <small v-if="nextEnemyPreview.stageBandLabel" class="combat-stage-intel" data-testid="combat-stage-intel">
        {{ nextEnemyPreview.stageBandLabel }} · {{ nextEnemyPreview.warzoneLandmark }} · {{ nextEnemyPreview.eliteAffixCount }} 词缀 · {{ operationDefinition.id === 'survival' ? '90 秒连续压力' : `Boss ${nextEnemyPreview.bossPhaseCount} 阶段` }}
      </small>
    </section>

    <p v-if="showMovementHint" class="control-hint" role="status">
      <span class="desktop-control-hint">WASD / 方向键移动</span>
      <span class="mobile-control-hint">拖动左下摇杆移动</span>
    </p>

    <section v-if="bossHud.visible" class="boss-hud" aria-label="首领生命">
      <span>高威胁目标 · {{ bossHud.phaseLabel }}</span>
      <b>{{ bossHud.label }}</b>
      <div><i :style="{ transform: `scaleX(${bossHud.hpPercent / 100})` }" /></div>
      <small>{{ Math.ceil(bossHud.hp) }} / {{ Math.ceil(bossHud.maxHp) }}</small>
    </section>

    <div v-if="damageDirection.life > 0 && mode === 'battle'" class="damage-direction" :style="{ transform: `rotate(${damageDirection.angle}rad)` }" aria-hidden="true">⌃</div>
    <div v-if="killNotice" class="kill-notice">{{ killNotice }}</div>

    <div
      v-if="mode === 'battle'"
      ref="joystickRef"
      class="mobile-joystick"
      :class="{ active: Math.hypot(touchMovement.x, touchMovement.y) > 0.05 }"
      data-testid="mobile-joystick"
      aria-label="触控移动摇杆"
      role="application"
      @pointerdown="beginJoystick"
      @pointermove="moveJoystick"
      @pointerup="endJoystick"
      @pointercancel="endJoystick"
      @lostpointercapture="cancelJoystick"
    >
      <span class="mobile-joystick__ring" />
      <i :style="{ transform: `translate(${touchMovement.x * 38}px, ${touchMovement.y * 38}px)` }" />
      <small>移动</small>
    </div>

    <section class="skill-bar" aria-label="战术技能">
      <button v-for="skill in skills" :key="skill.key" type="button" :aria-label="`${skill.shortcut}：${skill.name}`" :disabled="skill.cooldown > 0 || mode !== 'battle'" @click="useSkill(skill.key)">
        <kbd>{{ skill.shortcut }}</kbd>
        <img :src="skill.icon" alt="" aria-hidden="true" />
        <span>
          <b>{{ skill.name }}</b>
          <small>{{ skill.cooldown > 0 ? `${skill.cooldown.toFixed(1)} 秒` : skill.hint }}</small>
        </span>
      </button>
    </section>

    <section
      v-if="upgradeChoices.length && mode === 'battle'"
      class="choice-panel"
      data-testid="upgrade-choice-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="combat-upgrade-title"
    >
      <p class="panel-kicker">局内升级</p>
      <h2 id="combat-upgrade-title">选择一项临时强化</h2>
      <div>
        <button v-for="(choice, index) in upgradeChoices" :key="choice.name" type="button" data-testid="upgrade-choice" @click="chooseUpgrade(choice)">
          <kbd>{{ index + 1 }}</kbd>
          <small>{{ choice.tag }}</small>
          <b>{{ choice.name }}</b>
          <span>{{ choice.desc }}</span>
          <strong>{{ choice.comparison }}</strong>
        </button>
      </div>
    </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  mode, resources, returnToBase, player, hpPercent, damagePreview, kills, targetKills,
  nextLevelExp, runStats, currentWave, totalWaves, currentWaveDefinition, wavePlan,
  waveStatusText, nextEnemyPreview, operationDefinition, operationProgressText, bossHud, damageDirection, killNotice, elapsedSeconds, formatClock,
  skills, useSkill, upgradeChoices, chooseUpgrade, weapon, weaponAmmo, weaponReloadTimer, weaponChargeTimer, weaponCharging,
  showMovementHint, touchMovement, setTouchMovement, clearTouchMovement
} = useGameCanvasContext()

const joystickRef = ref<HTMLElement | null>(null)
let joystickPointerId: number | null = null

function updateJoystick(event: PointerEvent) {
  const rect = joystickRef.value?.getBoundingClientRect()
  if (!rect) return
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  const radius = Math.max(1, rect.width * 0.34)
  setTouchMovement(dx / radius, dy / radius)
}

function beginJoystick(event: PointerEvent) {
  event.preventDefault()
  if (joystickPointerId !== null && joystickPointerId !== event.pointerId) return
  joystickPointerId = event.pointerId
  joystickRef.value?.setPointerCapture(event.pointerId)
  updateJoystick(event)
}

function moveJoystick(event: PointerEvent) {
  if (joystickPointerId !== event.pointerId) return
  event.preventDefault()
  updateJoystick(event)
}

function endJoystick(event: PointerEvent) {
  if (joystickPointerId !== event.pointerId) return
  if (joystickRef.value?.hasPointerCapture(event.pointerId)) joystickRef.value.releasePointerCapture(event.pointerId)
  joystickPointerId = null
  clearTouchMovement()
}

function cancelJoystick() {
  joystickPointerId = null
  clearTouchMovement()
}

onBeforeUnmount(cancelJoystick)
</script>
