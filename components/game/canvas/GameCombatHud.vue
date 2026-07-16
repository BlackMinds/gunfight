<template>
    <section class="top-actions" aria-label="资源与菜单">
      <div class="currency-chip">
        <span>●</span>
        <b>{{ resources.gold }}</b>
      </div>
      <button type="button" disabled title="设置功能开发中">⚙ 设置</button>
      <button type="button" data-testid="return-to-base" @click="returnToBase">⇥ 退出</button>
    </section>

    <aside class="hud hud-left">
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
          <b>{{ weaponReloadTimer > 0 ? `换弹 ${weaponReloadTimer.toFixed(1)}s` : `${weaponAmmo} / ${weapon.magazineSize}` }}</b>
        </div>
        <div class="stat-row">
          <span>生命值</span>
          <b>{{ Math.ceil(player.hp) }} / {{ player.maxHp }}</b>
        </div>
        <div class="stat-row">
          <span>击杀数</span>
          <b>{{ kills }} / {{ targetKills }}</b>
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
      <div class="combat-metrics">
        <span><small>本关最高</small><b>{{ Math.round(runStats.peakDps) }}</b></span>
        <span><small>总伤害</small><b>{{ Math.round(runStats.totalDamage) }}</b></span>
      </div>
    </aside>

    <section v-if="mode === 'battle'" class="wave-command" aria-label="波次进度">
      <div class="wave-command__title">
        <span>第 {{ currentWave }} / {{ totalWaves }} 波</span>
        <b>{{ currentWaveDefinition?.label }}</b>
      </div>
      <div class="wave-ticks">
        <i v-for="wave in wavePlan" :key="wave.index" :class="{ active: wave.index === currentWave, cleared: wave.index < currentWave }" />
      </div>
      <small>{{ waveStatusText }}</small>
    </section>

    <section v-if="bossHud.visible" class="boss-hud" aria-label="首领生命">
      <span>高威胁目标 · {{ bossHud.phaseLabel }}</span>
      <b>{{ bossHud.label }}</b>
      <div><i :style="{ transform: `scaleX(${bossHud.hpPercent / 100})` }" /></div>
      <small>{{ Math.ceil(bossHud.hp) }} / {{ Math.ceil(bossHud.maxHp) }}</small>
    </section>

    <div v-if="damageDirection.life > 0 && mode === 'battle'" class="damage-direction" :style="{ transform: `rotate(${damageDirection.angle}rad)` }" aria-hidden="true">⌃</div>
    <div v-if="killNotice" class="kill-notice">{{ killNotice }}</div>

    <section class="objective-strip">
      <div>
        <span class="objective-icon">☠</span>
        <small>击杀进度</small>
        <b>{{ Math.min(kills, targetKills) }} / {{ targetKills }}</b>
      </div>
      <div>
        <span class="objective-icon">⏱</span>
        <small>关卡用时</small>
        <b>{{ formatClock(elapsedSeconds) }}</b>
      </div>
      <div>
        <span class="objective-icon">⌨</span>
        <small>移动控制</small>
        <b>WASD / 方向键</b>
      </div>
    </section>

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

    <section v-if="upgradeChoices.length && mode === 'battle'" class="choice-panel">
      <p class="panel-kicker">局内升级</p>
      <h2>选择一项临时强化</h2>
      <div>
        <button v-for="(choice, index) in upgradeChoices" :key="choice.name" type="button" @click="chooseUpgrade(choice)">
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
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  mode, resources, returnToBase, player, hpPercent, damagePreview, kills, targetKills,
  nextLevelExp, runStats, currentWave, totalWaves, currentWaveDefinition, wavePlan,
  waveStatusText, bossHud, damageDirection, killNotice, elapsedSeconds, formatClock,
  skills, useSkill, upgradeChoices, chooseUpgrade, weapon, weaponAmmo, weaponReloadTimer
} = useGameCanvasContext()
</script>
