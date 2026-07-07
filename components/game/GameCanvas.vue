<template>
  <main class="game-screen" :class="`mode-${mode}`">
    <canvas ref="canvasRef" class="battlefield" aria-label="枪火放置战斗画面" />

    <aside class="hud hud-left">
      <p class="panel-kicker">第 {{ stageLabel }} 关</p>
      <h2>{{ stageMeta.name }}</h2>
      <div class="stage-line">
        <span>{{ stageType }}</span>
        <b>{{ stageMeta.pressure }}</b>
      </div>
      <div class="bar hp">
        <span :style="{ width: `${hpPercent}%` }" />
      </div>
      <div class="stats">
        <span>生命 {{ Math.ceil(player.hp) }}/{{ player.maxHp }}</span>
        <span>击杀 {{ kills }}/{{ targetKills }}</span>
        <span>金币 {{ resources.gold }}</span>
      </div>
      <div class="bar exp">
        <span :style="{ width: `${expPercent}%` }" />
      </div>
      <div class="stats">
        <span>等级 {{ player.level }}</span>
        <span>经验 {{ player.exp }}/{{ nextLevelExp }}</span>
        <span>合金 {{ resources.alloy }}</span>
      </div>
    </aside>

    <aside class="hud hud-right">
      <p class="panel-kicker">当前构筑</p>
      <h2>{{ weapon.name }} · {{ weapon.rarity }} +{{ base.weaponLevel }}</h2>
      <div class="power-readout">
        <span>战力预估</span>
        <b>{{ combatPower }}</b>
      </div>
      <div class="weapon-traits">
        <span v-for="trait in weapon.traits" :key="trait">{{ trait }}</span>
      </div>
      <ul class="loadout-list">
        <li v-for="part in equippedParts" :key="part.name">
          <b>{{ part.slot }} · {{ part.name }}</b>
          <span>{{ part.effect }}</span>
        </li>
      </ul>
      <div class="inventory-preview">
        <p class="panel-kicker">{{ attachmentSwapLabel }}</p>
        <p v-if="!inventory.length" class="empty-backpack">暂无掉落配件</p>
        <button v-for="item in inventory.slice(0, 4)" :key="item.name" type="button" :class="{ selected: selectedAttachment?.name === item.name }" :disabled="!canSwapAttachment" @click="selectAttachment(item)">
          <b>{{ item.name }}</b>
          <span>{{ item.slot }} · {{ item.rarity }} / {{ item.effect }}</span>
        </button>
      </div>
    </aside>

    <section class="objective-strip">
      <span>目标：清除 {{ targetKills }} 名敌人</span>
      <strong>{{ objectiveText }}</strong>
      <span>本关用时 {{ elapsedSeconds }} 秒</span>
    </section>

    <section class="skill-bar" aria-label="战术技能">
      <button v-for="skill in skills" :key="skill.key" type="button" :disabled="skill.cooldown > 0 || mode !== 'battle'" @click="useSkill(skill.key)">
        <img :src="skill.icon" :alt="skill.name" />
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
        <button v-for="choice in upgradeChoices" :key="choice.name" type="button" @click="chooseUpgrade(choice)">
          <b>{{ choice.name }}</b>
          <span>{{ choice.desc }}</span>
        </button>
      </div>
    </section>

    <section v-if="mode === 'base'" class="base-panel">
      <div class="base-hero">
        <p class="panel-kicker">外围基地</p>
        <h1>弹药、护甲、磁吸轨道已待命</h1>
        <p>用通关资源做永久强化，再把下一关压回去。</p>
        <div class="resource-rail">
          <span>金币 <b>{{ resources.gold }}</b></span>
          <span>合金 <b>{{ resources.alloy }}</b></span>
          <span>零件 <b>{{ resources.parts }}</b></span>
          <span>角色 Lv.<b>{{ player.level }}</b></span>
        </div>
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
          </article>
        </div>
        <div class="stage-picker" aria-label="关卡选择">
          <button type="button" @click="adjustStage(-10)">-10</button>
          <button type="button" @click="adjustStage(-1)">-1</button>
          <label>
            <span>目标关卡</span>
            <input v-model.number="stageDraft" type="number" min="1" max="10000" @change="commitStageDraft" />
          </label>
          <button type="button" @click="adjustStage(1)">+1</button>
          <button type="button" @click="adjustStage(10)">+10</button>
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
        <button type="button" @click="startStage">部署第 {{ stageLabel }} 关</button>
      </div>

      <div class="base-grid">
        <article v-for="upgrade in baseUpgrades" :key="upgrade.key" class="upgrade-card">
          <span class="upgrade-code">{{ upgrade.code }}</span>
          <h3>{{ upgrade.name }} Lv.{{ upgrade.level }}</h3>
          <p>{{ upgrade.desc }}</p>
          <strong>{{ upgrade.before }} → {{ upgrade.after }}</strong>
          <button type="button" :disabled="!canBuy(upgrade)" @click="buyUpgrade(upgrade)">
            {{ upgrade.cost.gold }} 金币 / {{ upgrade.cost.alloy }} 合金
          </button>
        </article>
      </div>

      <div class="base-backpack">
        <div class="base-backpack-head">
          <div>
            <p class="panel-kicker">配件背包</p>
            <h3>{{ attachmentSwapLabel }}</h3>
          </div>
          <span>{{ inventory.length }} 件可用</span>
        </div>
        <div v-if="inventory.length" class="slot-filter" aria-label="配件槽位筛选">
          <button v-for="slot in attachmentSlots" :key="slot" type="button" :class="{ active: selectedSlot === slot }" @click="selectedSlot = slot">
            <b>{{ slot }}</b>
            <span>{{ inventoryBySlot[slot]?.length ?? 0 }}</span>
          </button>
        </div>
        <div class="base-backpack-layout">
          <div class="base-backpack-list">
          <p v-if="!inventory.length" class="empty-backpack">打关卡有概率掉落配件，获得后会进入这里。</p>
          <p v-else-if="!filteredInventory.length" class="empty-backpack">这个槽位暂时没有可用配件。</p>
          <button v-for="item in filteredInventory" :key="item.name" type="button" :class="{ selected: selectedAttachment?.name === item.name }" :disabled="!canSwapAttachment" @click="selectAttachment(item)">
            <b>{{ item.name }}</b>
            <span>{{ item.slot }} · {{ item.rarity }} · {{ item.effect }}</span>
          </button>
          </div>
          <aside v-if="selectedAttachment" class="attachment-compare">
            <p class="panel-kicker">配件对比</p>
            <div class="decision-hint" :class="`tone-${selectedAttachmentDecision.tone}`">
              <b>{{ selectedAttachmentDecision.label }}</b>
              <span>{{ selectedAttachmentDecision.summary }}</span>
            </div>
            <div class="compare-title">
              <div>
                <span>当前装备</span>
                <b>{{ currentAttachmentForSelected?.name ?? '空槽位' }}</b>
              </div>
              <div>
                <span>新配件</span>
                <b>{{ selectedAttachment.name }}</b>
              </div>
            </div>
            <div class="compare-lines">
              <div v-for="row in selectedAttachmentCompare" :key="row.label">
                <span>{{ row.label }}</span>
                <b>{{ row.current }}</b>
                <strong>→</strong>
                <b>{{ row.next }}</b>
              </div>
            </div>
            <button type="button" :disabled="!canSwapAttachment" @click="equipSelectedAttachment">装备 {{ selectedAttachment.slot }}</button>
          </aside>
        </div>
      </div>
    </section>

    <section v-if="mode === 'settlement'" class="settlement-panel">
      <p class="panel-kicker">{{ lastRun?.victory ? '关卡结算' : '撤离结算' }}</p>
      <h2>{{ lastRun?.title }}</h2>
      <p>{{ lastRun?.body }}</p>
      <div v-if="lastRun?.reward" class="reward-grid">
        <span>金币 +{{ lastRun.reward.gold }}</span>
        <span>经验 +{{ lastRun.reward.exp }}</span>
        <span>合金 +{{ lastRun.reward.alloy }}</span>
        <span>零件 +{{ lastRun.reward.parts }}</span>
      </div>
      <div v-if="lastRun?.reward?.attachments.length" class="loot-card-grid">
        <article v-for="item in lastRun.reward.attachments" :key="item.name" class="loot-card" :class="`rarity-${item.rarity}`">
          <span class="new-tag">新获得</span>
          <span class="recommend-tag" :class="isAttachmentInInventory(item) ? `tone-${attachmentDecisionFor(item).tone}` : 'tone-survival'">{{ isAttachmentInInventory(item) ? attachmentDecisionFor(item).actionLabel : '已装备' }}</span>
          <p>{{ item.slot }} · {{ item.rarity }}</p>
          <h3>{{ item.name }}</h3>
          <strong>{{ item.effect }}</strong>
          <div class="loot-compare">
            <div v-if="isAttachmentInInventory(item)" class="decision-hint compact" :class="`tone-${attachmentDecisionFor(item).tone}`">
              <b>{{ attachmentDecisionFor(item).label }}</b>
              <span>{{ attachmentDecisionFor(item).summary }}</span>
            </div>
            <div v-else class="decision-hint compact tone-survival">
              <b>已完成替换</b>
              <span>当前同槽已同步为这件配件。</span>
            </div>
            <div class="compare-title">
              <div>
                <span>当前同槽</span>
                <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b>
              </div>
              <div>
                <span>掉落配件</span>
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
          </div>
          <div class="loot-card-actions">
            <span :class="{ equipped: !isAttachmentInInventory(item) }">{{ settlementLootStatus(item) }}</span>
            <button type="button" :disabled="!isAttachmentInInventory(item)" @click="equipSettlementAttachment(item)">立即装备</button>
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
      <div class="settlement-actions">
        <button type="button" @click="returnToBase">返回基地强化</button>
        <button v-if="lastRun?.victory" type="button" class="primary" @click="advanceAndStart">直接下一关</button>
        <button v-else type="button" class="primary" @click="startStage">重新挑战</button>
      </div>
    </section>

    <div v-if="bannerText" class="combat-banner">{{ bannerText }}</div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import battlefieldUrl from '~/assets/images/generated/battlefield.png'
import bulletUrl from '~/assets/images/generated/bullet.png'
import enemyBomberUrl from '~/assets/images/generated/enemy-bomber.png'
import enemyBossUrl from '~/assets/images/generated/enemy-boss.png'
import enemyFastUrl from '~/assets/images/generated/enemy-fast.png'
import enemyGruntUrl from '~/assets/images/generated/enemy-grunt.png'
import enemyHeavyUrl from '~/assets/images/generated/enemy-heavy.png'
import pickupExpUrl from '~/assets/images/generated/pickup-exp.png'
import pickupGoldUrl from '~/assets/images/generated/pickup-gold.png'
import playerUrl from '~/assets/images/generated/player.png'
import skillDashUrl from '~/assets/images/generated/skill-dash.png'
import skillOverloadUrl from '~/assets/images/generated/skill-overload.png'
import skillPulseUrl from '~/assets/images/generated/skill-pulse.png'
import { getStageMeta, rewardForStage, scaleEnemyStats, type EnemyKind } from '~/shared/game/formulas'
import { attachmentPool, attachmentRarities, attachmentSlots, starterAttachments, starterWeapon, type Attachment, type AttachmentRarity } from '~/shared/game/weapons'

type Vec = { x: number; y: number }
type Enemy = Vec & {
  id: number
  vx: number
  vy: number
  angle: number
  wobble: number
  hp: number
  maxHp: number
  speed: number
  radius: number
  damage: number
  elite: boolean
  boss: boolean
  kind: EnemyKind
  label: string
}
type Bullet = Vec & { vx: number; vy: number; damage: number; life: number; pierce: number }
type Drop = Vec & { value: number; radius: number; kind: 'gold' | 'exp' }
type Afterimage = Vec & { angle: number; life: number; maxLife: number; size: number }
type StageReward = ReturnType<typeof rewardForStage>
type Reward = StageReward & { attachments: Attachment[] }
type Upgrade = { name: string; desc: string; apply: () => void }
type PostBattleChoice = { name: string; desc: string; disabled: boolean; apply: () => void }
type HitText = Vec & { value: string; life: number; maxLife: number; color: string }
type SkillKey = 'dash' | 'overload' | 'pulse'
type CompareRow = { label: string; current: string; next: string }
type AttachmentDecisionTone = 'offense' | 'survival' | 'utility' | 'downgrade'
type AttachmentDecision = {
  label: string
  summary: string
  actionLabel: '推荐装备' | '适合保留'
  tone: AttachmentDecisionTone
}
type Mode = 'base' | 'battle' | 'settlement'
type PlayArea = { x: number; y: number; width: number; height: number }
type BaseUpgrade = {
  key: 'weaponLevel' | 'armorLevel' | 'magnetLevel'
  code: string
  name: string
  desc: string
  level: number
  cost: { gold: number; alloy: number }
  before: string
  after: string
}

type SaveData = {
  saveVersion: number
  stage: number
  resources: typeof resources
  base: typeof base
  player: Pick<typeof player, 'level' | 'exp' | 'hp'>
  equipped: string[]
  inventory: string[]
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const SAVE_VERSION = 2
const SAVE_KEY = 'gunfight-growth-save-v1'
const keys = new Set<string>()
const mode = ref<Mode>('base')
const stage = ref(1)
const stageDraft = ref(1)
const kills = ref(0)
const upgradeChoices = ref<Upgrade[]>([])
const upgradeTakenForStage = ref(0)
const resources = reactive({ gold: 80, alloy: 3, parts: 0 })
const base = reactive({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })
const lastRun = ref<{ title: string; body: string; victory: boolean; reward?: Reward } | null>(null)
const bannerText = ref('')
const settlementEquipNotice = ref<{ equipped: string; replaced?: string } | null>(null)
const player = reactive({
  x: 0,
  y: 0,
  visualX: 0,
  visualY: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  bob: 0,
  afterimageTimer: 0,
  hp: 120,
  maxHp: 120,
  speed: 235,
  radius: 17,
  fireTimer: 0,
  invuln: 0,
  level: 1,
  exp: 0
})
const modifiers = reactive({ damage: 1, fireRate: 1, speed: 1, pickup: 70, pierceBonus: 0, expGain: 1 })
const skills = reactive([
  { key: 'dash' as SkillKey, name: '战术冲刺', hint: '瞬间拉开', cooldown: 0, icon: skillDashUrl },
  { key: 'overload' as SkillKey, name: '过载火力', hint: '短时射速', cooldown: 0, icon: skillOverloadUrl },
  { key: 'pulse' as SkillKey, name: '磁暴脉冲', hint: '清近身怪', cooldown: 0, icon: skillPulseUrl }
])

const assetUrls = {
  battlefield: battlefieldUrl,
  player: playerUrl,
  bullet: bulletUrl,
  enemyGrunt: enemyGruntUrl,
  enemyFast: enemyFastUrl,
  enemyHeavy: enemyHeavyUrl,
  enemyBomber: enemyBomberUrl,
  enemyBoss: enemyBossUrl,
  pickupGold: pickupGoldUrl,
  pickupExp: pickupExpUrl
}
const sprites: Partial<Record<keyof typeof assetUrls, HTMLImageElement>> = {}
const weapon = starterWeapon
const attachmentByName = new Map(attachmentPool.map((item) => [item.name, item]))
const equippedParts = reactive<Attachment[]>(starterAttachments.map((item) => ({ ...item })))
const inventory = ref<Attachment[]>([])
const selectedSlot = ref<(typeof attachmentSlots)[number]>('枪口')
const selectedAttachment = ref<Attachment | null>(null)
const enemies: Enemy[] = []
const bullets: Bullet[] = []
const drops: Drop[] = []
const afterimages: Afterimage[] = []
const hitTexts: HitText[] = []
let nextEnemyId = 1
let animationFrame = 0
let lastTime = 0
let spawnTimer = 0
let stageTimer = 0
let overloadTimer = 0
let dashTimer = 0
let playerHitFlash = 0
let screenShake = 0
let bossSpawned = false
let context: CanvasRenderingContext2D | null = null
let canPersist = false

const stageMeta = computed(() => getStageMeta(stage.value))
const stageLabel = computed(() => stage.value.toString().padStart(4, '0'))
const targetKills = computed(() => (stage.value % 10 === 0 ? 45 : 28 + Math.min(stage.value, 22)))
const nextLevelExp = computed(() => player.level * 100)
const hpPercent = computed(() => Math.max(0, Math.round((player.hp / player.maxHp) * 100)))
const expPercent = computed(() => Math.min(100, Math.round((player.exp / nextLevelExp.value) * 100)))
const elapsedSeconds = computed(() => Math.floor(stageTimer))
const damagePreview = computed(() => Math.round(weapon.damage * modifiers.damage))
const fireRatePreview = computed(() => (weapon.fireRate * modifiers.fireRate).toFixed(1))
const combatPower = computed(() => {
  const offense = weapon.damage * modifiers.damage * weapon.fireRate * modifiers.fireRate * (1 + (weapon.pierce + modifiers.pierceBonus) * 0.18)
  const survival = player.maxHp * (1 + base.armorLevel * 0.045)
  return Math.round(offense * 7 + survival * 2 + modifiers.pickup * 0.8)
})
const stageType = computed(() => {
  if (stage.value % 10 === 0) return '首领关'
  if (stage.value % 25 === 0) return '资源关'
  if (stage.value % 5 === 0) return '精英关'
  return '普通关'
})
const nextEnemyPreview = computed(() => {
  const kind: EnemyKind = stage.value % 10 === 0 ? 'heavy' : stage.value % 5 === 0 ? 'fast' : 'grunt'
  const stats = scaleEnemyStats(stage.value, kind)
  return {
    label: stage.value % 10 === 0 ? '街区首领' : stats.label,
    hp: Math.round(stats.hp * (stage.value % 10 === 0 ? 9 : 1)),
    damage: Math.round(stats.damage * (stage.value % 10 === 0 ? 1.7 : 1))
  }
})
const stageRewardPreview = computed(() => rewardForStage(stage.value, targetKills.value))
const dropProfile = computed(() => {
  const profile = getAttachmentDropProfile(stage.value)
  const raritySummary = attachmentRarities.filter((rarity) => profile.rarityWeights[rarity] > 0).join(' / ')
  return {
    ...profile,
    raritySummary,
    dropChance: Math.round(profile.dropChance * 100)
  }
})
const objectiveText = computed(() => {
  if (mode.value === 'base') return '基地整备中'
  if (stage.value % 10 === 0) return bossSpawned ? '首领已进入战场' : '击杀足够敌人后首领登场'
  return kills.value >= targetKills.value ? '目标完成' : '保持移动，避免包围'
})
const canSwapAttachment = computed(() => mode.value !== 'battle' && inventory.value.length > 0)
const attachmentSwapLabel = computed(() => {
  if (mode.value === 'battle') return '配件背包 · 战斗中锁定'
  if (!inventory.value.length) return '配件背包 · 等待掉落'
  return '配件背包 · 点击替换'
})
const inventoryBySlot = computed(() => {
  return attachmentSlots.reduce(
    (groups, slot) => {
      groups[slot] = inventory.value.filter((item) => item.slot === slot)
      return groups
    },
    {} as Record<(typeof attachmentSlots)[number], Attachment[]>
  )
})
const filteredInventory = computed(() => inventoryBySlot.value[selectedSlot.value] ?? [])
const currentAttachmentForSelected = computed(() => (selectedAttachment.value ? equippedParts.find((part) => part.slot === selectedAttachment.value?.slot) : undefined))
const selectedAttachmentCompare = computed<CompareRow[]>(() => {
  if (!selectedAttachment.value) return []
  return buildAttachmentComparison(currentAttachmentForSelected.value, selectedAttachment.value)
})
const selectedAttachmentDecision = computed<AttachmentDecision>(() => {
  if (!selectedAttachment.value) {
    return { label: '功能向替换', summary: '选择配件后显示换装判断。', actionLabel: '适合保留', tone: 'utility' }
  }
  return buildAttachmentDecision(currentAttachmentForSelected.value, selectedAttachment.value)
})
const baseUpgrades = computed<BaseUpgrade[]>(() => [
  {
    key: 'weaponLevel',
    code: 'ARS',
    name: '枪械校准',
    desc: `永久提升伤害和射速。当前伤害 +${base.weaponLevel * 10}%`,
    level: base.weaponLevel,
    cost: upgradeCost(base.weaponLevel, 42, 1),
    before: `伤害 +${base.weaponLevel * 10}% / 射速 +${Math.round(base.weaponLevel * 3.5)}%`,
    after: `伤害 +${(base.weaponLevel + 1) * 10}% / 射速 +${Math.round((base.weaponLevel + 1) * 3.5)}%`
  },
  {
    key: 'armorLevel',
    code: 'PLT',
    name: '护甲整备',
    desc: `提升最大生命并降低接触伤害。当前生命 +${base.armorLevel * 18}`,
    level: base.armorLevel,
    cost: upgradeCost(base.armorLevel, 36, 1),
    before: `生命 +${base.armorLevel * 18}`,
    after: `生命 +${(base.armorLevel + 1) * 18}`
  },
  {
    key: 'magnetLevel',
    code: 'MAG',
    name: '磁吸轨道',
    desc: `扩大金币和经验拾取范围。当前范围 +${base.magnetLevel * 18}`,
    level: base.magnetLevel,
    cost: upgradeCost(base.magnetLevel, 30, 0),
    before: `拾取 ${70 + base.magnetLevel * 18}`,
    after: `拾取 ${70 + (base.magnetLevel + 1) * 18}`
  }
])

const postBattleChoices = computed<PostBattleChoice[]>(() => [
  {
    name: '修复生命',
    desc: '回复 45% 最大生命，适合直接连战。',
    disabled: player.hp >= player.maxHp,
    apply: () => {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.45))
      bannerText.value = '生命修复完成'
      saveGame()
    }
  },
  {
    name: '强化武器',
    desc: '消耗 1 合金，基地枪械校准 +1。',
    disabled: resources.alloy < 1,
    apply: () => {
      resources.alloy -= 1
      base.weaponLevel += 1
      applyBaseStats()
      bannerText.value = '武器校准完成'
      saveGame()
    }
  },
  {
    name: '拆解零件',
    desc: '把 1 个零件转成 24 金币，方便回基地强化。',
    disabled: resources.parts < 1,
    apply: () => {
      resources.parts -= 1
      resources.gold += 24
      bannerText.value = '零件已拆解'
      saveGame()
    }
  }
])

function getAttachmentDropProfile(level: number) {
  if (level % 10 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 0, 精良: 22, 稀有: 58, 史诗: 20 } satisfies Record<AttachmentRarity, number>
    }
  }
  if (level % 5 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 8, 精良: 42, 稀有: 45, 史诗: 5 } satisfies Record<AttachmentRarity, number>
    }
  }
  return {
    dropChance: 0.38,
    rarityWeights: { 普通: 25, 精良: 45, 稀有: 30, 史诗: 0 } satisfies Record<AttachmentRarity, number>
  }
}

function rollWeightedRarity(weights: Record<AttachmentRarity, number>) {
  const total = attachmentRarities.reduce((sum, rarity) => sum + weights[rarity], 0)
  let cursor = Math.random() * total
  for (const rarity of attachmentRarities) {
    cursor -= weights[rarity]
    if (cursor <= 0) return rarity
  }
  return attachmentRarities[attachmentRarities.length - 1]
}

function formatBonusValue(key: keyof NonNullable<Attachment['bonuses']>, value?: number) {
  if (!value) return key === 'pierce' ? '无穿透' : '无'
  if (key === 'damage') return `伤害 +${Math.round(value * 100)}%`
  if (key === 'fireRate') return `射速 +${Math.round(value * 100)}%`
  if (key === 'maxHp') return `最大生命 +${value}`
  if (key === 'pickup') return `拾取 +${value}`
  if (key === 'speed') return `移速 +${Math.round(value * 100)}%`
  if (key === 'pierce') return `穿透 +${value}`
  return `经验 +${Math.round(value * 100)}%`
}

function buildAttachmentComparison(current: Attachment | undefined, next: Attachment) {
  const keys = ['damage', 'fireRate', 'maxHp', 'pickup', 'speed', 'pierce', 'expGain'] as const
  return keys
    .filter((key) => (current?.bonuses?.[key] ?? 0) !== 0 || (next.bonuses?.[key] ?? 0) !== 0)
    .map((key) => ({
      label: {
        damage: '伤害',
        fireRate: '射速',
        maxHp: '生命',
        pickup: '拾取',
        speed: '移速',
        pierce: '穿透',
        expGain: '经验'
      }[key],
      current: formatBonusValue(key, current?.bonuses?.[key]),
      next: formatBonusValue(key, next.bonuses?.[key])
    }))
}

function attachmentDecisionFor(item: Attachment) {
  return buildAttachmentDecision(currentAttachmentFor(item), item)
}

function buildAttachmentDecision(current: Attachment | undefined, next: Attachment): AttachmentDecision {
  const currentBonus = current?.bonuses ?? {}
  const nextBonus = next.bonuses ?? {}
  const delta = {
    damage: (nextBonus.damage ?? 0) - (currentBonus.damage ?? 0),
    fireRate: (nextBonus.fireRate ?? 0) - (currentBonus.fireRate ?? 0),
    maxHp: (nextBonus.maxHp ?? 0) - (currentBonus.maxHp ?? 0),
    pickup: (nextBonus.pickup ?? 0) - (currentBonus.pickup ?? 0),
    speed: (nextBonus.speed ?? 0) - (currentBonus.speed ?? 0),
    pierce: (nextBonus.pierce ?? 0) - (currentBonus.pierce ?? 0),
    expGain: (nextBonus.expGain ?? 0) - (currentBonus.expGain ?? 0)
  }
  const rarityDelta = attachmentRarities.indexOf(next.rarity) - (current ? attachmentRarities.indexOf(current.rarity) : -1)
  const offenseScore = delta.damage * 100 + delta.fireRate * 80 + delta.pierce * 16
  const survivalScore = delta.maxHp + delta.speed * 120
  const utilityScore = delta.pickup * 0.7 + delta.expGain * 120
  const hasMajorGain = rarityDelta > 0 || delta.damage >= 0.04 || delta.fireRate >= 0.06 || delta.pierce >= 1 || delta.maxHp >= 15 || delta.pickup >= 18 || delta.expGain >= 0.05 || delta.speed >= 0.06
  const hasAnyGain = offenseScore > 0 || survivalScore > 0 || utilityScore > 0
  const mostlyLoss = rarityDelta < 0 && offenseScore <= 0 && survivalScore <= 0 && utilityScore <= 0

  if (mostlyLoss || (!hasAnyGain && rarityDelta <= 0 && current)) {
    return {
      label: '可能降级',
      summary: rarityDelta < 0 ? `品质低于当前 ${current?.rarity ?? '装备'}，建议先留背包。` : '关键属性没有明显增益，暂时不急着换。',
      actionLabel: '适合保留',
      tone: 'downgrade'
    }
  }

  if (offenseScore >= survivalScore && offenseScore >= utilityScore && offenseScore > 0) {
    return {
      label: '输出提升',
      summary: delta.pierce > 0 ? '穿透或火力更强，清怪效率会更好。' : '伤害/射速更高，适合直接强化火力。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'offense'
    }
  }

  if (survivalScore >= utilityScore && survivalScore > 0) {
    return {
      label: '生存提升',
      summary: delta.maxHp > 0 ? '最大生命更高，容错会更稳。' : '机动性更好，走位压力会降低。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'survival'
    }
  }

  return {
    label: '功能向替换',
    summary: delta.expGain > 0 ? '偏向经验收益，适合刷成长。' : '偏向拾取或节奏收益，适合特定推关需求。',
    actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
    tone: 'utility'
  }
}

function currentAttachmentFor(item: Attachment) {
  return equippedParts.find((part) => part.slot === item.slot)
}

function attachmentComparisonFor(item: Attachment) {
  return buildAttachmentComparison(currentAttachmentFor(item), item)
}

function isAttachmentInInventory(item: Attachment) {
  return inventory.value.some((part) => part.name === item.name)
}

function settlementLootStatus(item: Attachment) {
  return isAttachmentInInventory(item) ? '保留到背包' : '已装备'
}

function upgradeCost(level: number, goldBase: number, alloyBase: number) {
  return { gold: goldBase + level * 32, alloy: alloyBase + Math.floor(level / 2) }
}

function commitStageDraft() {
  stage.value = clamp(Math.round(Number(stageDraft.value) || 1), 1, 10000)
  stageDraft.value = stage.value
  saveGame()
}

function adjustStage(amount: number) {
  stageDraft.value = clamp(stage.value + amount, 1, 10000)
  commitStageDraft()
}

function canBuy(upgrade: BaseUpgrade) {
  return resources.gold >= upgrade.cost.gold && resources.alloy >= upgrade.cost.alloy
}

function buyUpgrade(upgrade: BaseUpgrade) {
  if (!canBuy(upgrade)) return
  resources.gold -= upgrade.cost.gold
  resources.alloy -= upgrade.cost.alloy
  base[upgrade.key] += 1
  applyBaseStats()
  saveGame()
}

function applyBaseStats() {
  const gear = equippedParts.reduce(
    (total, part) => ({
      damage: total.damage + (part.bonuses?.damage ?? 0),
      fireRate: total.fireRate + (part.bonuses?.fireRate ?? 0),
      maxHp: total.maxHp + (part.bonuses?.maxHp ?? 0),
      pickup: total.pickup + (part.bonuses?.pickup ?? 0),
      speed: total.speed + (part.bonuses?.speed ?? 0),
      pierce: total.pierce + (part.bonuses?.pierce ?? 0),
      expGain: total.expGain + (part.bonuses?.expGain ?? 0)
    }),
    { damage: 0, fireRate: 0, maxHp: 0, pickup: 0, speed: 0, pierce: 0, expGain: 0 }
  )
  player.maxHp = 120 + base.armorLevel * 18 + (player.level - 1) * 12 + gear.maxHp
  player.hp = Math.min(player.maxHp, player.hp)
  modifiers.damage = 1 + base.weaponLevel * 0.1 + gear.damage
  modifiers.fireRate = 1 + base.weaponLevel * 0.035 + gear.fireRate
  modifiers.speed = 1 + gear.speed
  modifiers.pickup = 70 + base.magnetLevel * 18 + gear.pickup
  modifiers.pierceBonus = gear.pierce
  modifiers.expGain = 1 + gear.expGain
}

function saveGame() {
  if (!canPersist) return
  const payload = {
    saveVersion: SAVE_VERSION,
    stage: stage.value,
    resources: { ...resources },
    base: { ...base },
    player: { level: player.level, exp: player.exp, hp: player.hp },
    equipped: equippedParts.map((item) => item.name),
    inventory: inventory.value.map((item) => item.name)
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw) as Partial<SaveData>
    stage.value = clamp(Math.round(Number(saved.stage) || 1), 1, 10000)
    stageDraft.value = stage.value
    Object.assign(resources, { gold: saved.resources?.gold ?? 80, alloy: saved.resources?.alloy ?? 3, parts: saved.resources?.parts ?? 0 })
    Object.assign(base, { weaponLevel: saved.base?.weaponLevel ?? 0, armorLevel: saved.base?.armorLevel ?? 0, magnetLevel: saved.base?.magnetLevel ?? 0 })
    player.level = Math.max(1, Number(saved.player?.level) || 1)
    player.exp = Math.max(0, Number(saved.player?.exp) || 0)
    player.hp = Math.max(1, Number(saved.player?.hp) || player.hp)
    const savedEquipped = (saved.equipped ?? starterAttachments.map((item) => item.name)).map((name) => attachmentByName.get(name)).filter(Boolean) as Attachment[]
    const savedInventoryNames = saved.saveVersion === SAVE_VERSION ? saved.inventory ?? [] : []
    const savedInventory = savedInventoryNames.map((name) => attachmentByName.get(name)).filter(Boolean) as Attachment[]
    equippedParts.splice(0, equippedParts.length, ...savedEquipped)
    inventory.value = savedInventory
    selectedSlot.value = inventory.value[0]?.slot ?? selectedSlot.value
  } catch {
    localStorage.removeItem(SAVE_KEY)
  }
}

function selectAttachment(item: Attachment) {
  selectedAttachment.value = item
  selectedSlot.value = item.slot
}

function equipSelectedAttachment() {
  if (!selectedAttachment.value) return
  equipAttachment(selectedAttachment.value)
}

function equipAttachment(item: Attachment) {
  if (!canSwapAttachment.value || !isAttachmentInInventory(item)) return
  const currentIndex = equippedParts.findIndex((part) => part.slot === item.slot)
  const replaced = currentIndex >= 0 ? equippedParts[currentIndex] : undefined
  inventory.value = inventory.value.filter((part) => part.name !== item.name)
  if (currentIndex >= 0) {
    inventory.value = [equippedParts[currentIndex], ...inventory.value].slice(0, 12)
    equippedParts[currentIndex] = item
  } else {
    equippedParts.push(item)
  }
  selectedAttachment.value = inventory.value.find((part) => part.slot === item.slot) ?? null
  applyBaseStats()
  saveGame()
  return replaced
}

function equipSettlementAttachment(item: Attachment) {
  const replaced = equipAttachment(item)
  settlementEquipNotice.value = { equipped: item.name, replaced: replaced?.name }
  bannerText.value = replaced ? `${item.name} 已装备，替换下 ${replaced.name}` : `${item.name} 已装备`
}

function rollAttachment(rarityWeights: Record<AttachmentRarity, number>) {
  const ownedNames = new Set([...equippedParts, ...inventory.value].map((item) => item.name))
  const candidates = attachmentPool.filter((item) => !ownedNames.has(item.name))
  const desiredRarity = rollWeightedRarity(rarityWeights)
  const rarityPool = candidates.filter((item) => item.rarity === desiredRarity)
  const fallbackRarityPool = attachmentPool.filter((item) => item.rarity === desiredRarity)
  const pool = rarityPool.length ? rarityPool : candidates.length ? candidates : fallbackRarityPool.length ? fallbackRarityPool : attachmentPool
  return pool[Math.floor(Math.random() * pool.length)]
}

function grantAttachmentDrops(count: number, rarityWeights: Record<AttachmentRarity, number>) {
  const drops: Attachment[] = []
  for (let i = 0; i < count; i++) {
    const item = rollAttachment(rarityWeights)
    if (!inventory.value.some((part) => part.name === item.name) && !equippedParts.some((part) => part.name === item.name)) {
      inventory.value = [item, ...inventory.value].slice(0, 12)
      drops.push(item)
    }
  }
  if (drops[0]) {
    selectedAttachment.value = drops[0]
    selectedSlot.value = drops[0].slot
  }
  return drops
}

function choosePostBattle(choice: PostBattleChoice) {
  if (choice.disabled) return
  choice.apply()
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * clamp(amount, 0, 1)
}

function lerpAngle(current: number, target: number, amount: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * clamp(amount, 0, 1)
}

function getPlayArea(width: number, height: number): PlayArea {
  if (width < 900 || height < 620) {
    return { x: width * 0.08, y: height * 0.12, width: width * 0.84, height: height * 0.68 }
  }
  return { x: width * 0.24, y: height * 0.21, width: width * 0.46, height: height * 0.57 }
}

function movePlayerToAreaCenter() {
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  player.x = area.x + area.width / 2
  player.y = area.y + area.height / 2
  player.visualX = player.x
  player.visualY = player.y
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(canvas.clientWidth * pixelRatio)
  canvas.height = Math.floor(canvas.clientHeight * pixelRatio)
  context = canvas.getContext('2d')
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
}

function handleKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  keys.add(key)
  if (key === '1') useSkill('dash')
  if (key === '2') useSkill('overload')
  if (key === '3') useSkill('pulse')
}

function handleKeyup(event: KeyboardEvent) {
  keys.delete(event.key.toLowerCase())
}

function inputVector(): Vec {
  const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
  const y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

function pickEnemyKind(): EnemyKind {
  if (stage.value % 10 === 0 && kills.value > targetKills.value * 0.6 && !bossSpawned) return 'heavy'
  const roll = Math.random()
  if (roll < 0.12) return 'bomber'
  if (roll < 0.34) return 'fast'
  if (roll > 0.86) return 'heavy'
  return 'grunt'
}

function spawnEnemy(forceBoss = false) {
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  const edge = Math.floor(Math.random() * 4)
  const spawnInset = forceBoss ? 28 : 18
  const x = edge === 1 ? area.x + area.width - spawnInset : edge === 3 ? area.x + spawnInset : area.x + Math.random() * area.width
  const y = edge === 0 ? area.y + spawnInset : edge === 2 ? area.y + area.height - spawnInset : area.y + Math.random() * area.height
  const kind = forceBoss ? 'heavy' : pickEnemyKind()
  const stats = scaleEnemyStats(stage.value, kind)
  const elite = forceBoss || Math.random() < Math.min(0.05 + stage.value / 850, 0.32)

  enemies.push({
    id: nextEnemyId++,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.atan2(player.y - y, player.x - x),
    wobble: Math.random() * Math.PI * 2,
    hp: stats.hp * (forceBoss ? 9 : elite ? 1.9 : 1),
    maxHp: stats.hp * (forceBoss ? 9 : elite ? 1.9 : 1),
    speed: stats.speed * (forceBoss ? 0.68 : elite ? 1.08 : 1),
    damage: stats.damage * (forceBoss ? 1.7 : 1),
    radius: forceBoss ? 34 : elite ? 18 : 13,
    elite,
    boss: forceBoss,
    kind,
    label: forceBoss ? '街区首领' : elite ? `精英${stats.label}` : stats.label
  })
  if (forceBoss) {
    bannerText.value = '首领登场'
    screenShake = 0.4
  }
}

function shootNearest() {
  if (!enemies.length) return
  const target = enemies.reduce((nearest, enemy) => {
    const a = Math.hypot(nearest.x - player.x, nearest.y - player.y)
    const b = Math.hypot(enemy.x - player.x, enemy.y - player.y)
    if (enemy.boss && b < weapon.range) return enemy
    return b < a ? enemy : nearest
  })
  const angle = Math.atan2(target.y - player.y, target.x - player.x)
  const finalAngle = angle + (Math.random() - 0.5) * weapon.spread
  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(finalAngle) * weapon.bulletSpeed,
    vy: Math.sin(finalAngle) * weapon.bulletSpeed,
    damage: weapon.damage * modifiers.damage,
    life: weapon.range / weapon.bulletSpeed,
    pierce: weapon.pierce + modifiers.pierceBonus
  })
}

function grantExp(amount: number) {
  player.exp += Math.round(amount * modifiers.expGain)
  while (player.exp >= nextLevelExp.value) {
    player.exp -= nextLevelExp.value
    player.level += 1
    player.maxHp += 12
    player.hp = Math.min(player.maxHp, player.hp + 24)
    bannerText.value = `角色等级提升至 Lv.${player.level}`
  }
}

function maybeOfferUpgrade() {
  if (upgradeTakenForStage.value === stage.value || kills.value < 10 || upgradeChoices.value.length) return
  upgradeChoices.value = [
    { name: '穿透校准', desc: '子弹穿透 +1', apply: () => { modifiers.pierceBonus += 1 } },
    { name: '火力压制', desc: '本局伤害提高 18%', apply: () => { modifiers.damage *= 1.18 } },
    { name: '机动回收', desc: '移速与拾取范围提高', apply: () => { modifiers.speed *= 1.12; modifiers.pickup += 24 } }
  ]
}

function chooseUpgrade(choice: Upgrade) {
  choice.apply()
  upgradeTakenForStage.value = stage.value
  upgradeChoices.value = []
}

function loadSprite(key: keyof typeof assetUrls, url: string) {
  const image = new Image()
  image.src = url
  sprites[key] = image
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function drawSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, angle = 0) {
  if (!image || !image.complete) return
  const ratio = image.width / image.height
  const drawWidth = ratio >= 1 ? size : size * ratio
  const drawHeight = ratio >= 1 ? size / ratio : size
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, alpha = 0.32) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, y + width * 0.16, width * 0.42, width * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSpriteTint(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, angle: number, alpha: number, tint: string) {
  if (!image || !image.complete) return
  const ratio = image.width / image.height
  const drawWidth = ratio >= 1 ? size : size * ratio
  const drawHeight = ratio >= 1 ? size / ratio : size
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = tint
  ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}

function drawPlayArea(ctx: CanvasRenderingContext2D, area: PlayArea, width: number, height: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(7, 7, 6, 0.38)'
  ctx.fillRect(0, 0, width, area.y)
  ctx.fillRect(0, area.y + area.height, width, height - area.y - area.height)
  ctx.fillRect(0, area.y, area.x, area.height)
  ctx.fillRect(area.x + area.width, area.y, width - area.x - area.width, area.height)
  ctx.strokeStyle = 'rgba(229, 184, 75, 0.45)'
  ctx.lineWidth = 2
  ctx.strokeRect(area.x, area.y, area.width, area.height)
  ctx.restore()
}

function enemySprite(enemy: Enemy) {
  if (enemy.boss) return sprites.enemyBoss
  if (enemy.kind === 'fast') return sprites.enemyFast
  if (enemy.kind === 'heavy') return sprites.enemyHeavy
  if (enemy.kind === 'bomber') return sprites.enemyBomber
  return sprites.enemyGrunt
}

function useSkill(key: SkillKey) {
  const skill = skills.find((item) => item.key === key)
  if (!skill || skill.cooldown > 0 || mode.value !== 'battle' || upgradeChoices.value.length) return
  if (key === 'dash') {
    dashTimer = 0.55
    player.invuln = Math.max(player.invuln, 0.55)
    const input = inputVector()
    player.vx += input.x * 520
    player.vy += input.y * 520
    skill.cooldown = 6
  }
  if (key === 'overload') {
    overloadTimer = 4
    skill.cooldown = 12
  }
  if (key === 'pulse') {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 190) {
        enemy.hp -= 85 * modifiers.damage
        if (enemy.hp <= 0) killEnemy(i)
      }
    }
    skill.cooldown = 9
  }
}

function killEnemy(index: number) {
  const enemy = enemies[index]
  kills.value += enemy.boss ? 8 : 1
  grantExp(enemy.elite ? 7 : 3)
  drops.push({ x: enemy.x, y: enemy.y, value: enemy.elite ? 9 : 3, radius: 6, kind: 'gold' })
  if (enemy.elite) drops.push({ x: enemy.x + 10, y: enemy.y - 8, value: 5, radius: 5, kind: 'exp' })
  enemies.splice(index, 1)
}

function update(delta: number) {
  if (mode.value !== 'battle' || upgradeChoices.value.length) return
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  stageTimer += delta
  spawnTimer -= delta
  player.fireTimer -= delta
  player.invuln = Math.max(0, player.invuln - delta)
  overloadTimer = Math.max(0, overloadTimer - delta)
  dashTimer = Math.max(0, dashTimer - delta)
  for (const skill of skills) skill.cooldown = Math.max(0, skill.cooldown - delta)

  const movement = inputVector()
  const moving = Math.hypot(movement.x, movement.y) > 0.1
  const targetSpeed = player.speed * modifiers.speed * (dashTimer > 0 ? 2.2 : 1)
  player.vx = lerp(player.vx, movement.x * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.vy = lerp(player.vy, movement.y * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.x = clamp(player.x + player.vx * delta, area.x + player.radius, area.x + area.width - player.radius)
  player.y = clamp(player.y + player.vy * delta, area.y + player.radius, area.y + area.height - player.radius)
  player.visualX = lerp(player.visualX, player.x, 18 * delta)
  player.visualY = lerp(player.visualY, player.y, 18 * delta)
  player.bob += Math.hypot(player.vx, player.vy) * delta * 0.045
  player.afterimageTimer -= delta

  const aimTarget = enemies.reduce<Enemy | null>((nearest, enemy) => {
    if (!nearest) return enemy
    return Math.hypot(enemy.x - player.x, enemy.y - player.y) < Math.hypot(nearest.x - player.x, nearest.y - player.y) ? enemy : nearest
  }, null)
  player.angle = lerpAngle(player.angle, aimTarget ? Math.atan2(aimTarget.y - player.y, aimTarget.x - player.x) : player.angle, 12 * delta)

  if ((dashTimer > 0 || Math.hypot(player.vx, player.vy) > 120) && player.afterimageTimer <= 0) {
    afterimages.push({ x: player.visualX, y: player.visualY, angle: player.angle, life: 0.18, maxLife: 0.18, size: player.radius * 3.5 })
    player.afterimageTimer = dashTimer > 0 ? 0.035 : 0.075
  }
  for (let i = afterimages.length - 1; i >= 0; i--) {
    afterimages[i].life -= delta
    if (afterimages[i].life <= 0) afterimages.splice(i, 1)
  }

  if (spawnTimer <= 0) {
    if (stage.value % 10 === 0 && kills.value >= Math.floor(targetKills.value * 0.55) && !bossSpawned) {
      spawnEnemy(true)
      bossSpawned = true
    } else {
      spawnEnemy()
    }
    spawnTimer = Math.max(0.28, 1.0 - stage.value * 0.01)
  }

  if (player.fireTimer <= 0) {
    shootNearest()
    player.fireTimer = 1 / (weapon.fireRate * modifiers.fireRate * (overloadTimer > 0 ? 1.75 : 1))
  }

  for (const enemy of enemies) {
    enemy.wobble += delta * (enemy.kind === 'fast' ? 8 : 4)
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + Math.sin(enemy.wobble) * (enemy.kind === 'fast' ? 0.55 : 0.2)
    enemy.vx = lerp(enemy.vx, Math.cos(angle) * enemy.speed, 5.5 * delta)
    enemy.vy = lerp(enemy.vy, Math.sin(angle) * enemy.speed, 5.5 * delta)
    enemy.x = clamp(enemy.x + enemy.vx * delta, area.x + enemy.radius, area.x + area.width - enemy.radius)
    enemy.y = clamp(enemy.y + enemy.vy * delta, area.y + enemy.radius, area.y + area.height - enemy.radius)
    enemy.angle = lerpAngle(enemy.angle, Math.atan2(enemy.vy, enemy.vx), 8 * delta)
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius && player.invuln <= 0) {
      const damage = enemy.damage * Math.max(0.55, 1 - base.armorLevel * 0.045)
      player.hp -= damage
      playerHitFlash = 0.28
      screenShake = Math.max(screenShake, 0.18)
      hitTexts.push({ x: player.x, y: player.y - 24, value: `-${Math.round(damage)}`, life: 0.55, maxLife: 0.55, color: '#da4c3d' })
      player.invuln = 0.35
      if (enemy.kind === 'bomber') enemy.hp = 0
    }
  }

  for (const bullet of bullets) {
    bullet.x += bullet.vx * delta
    bullet.y += bullet.vy * delta
    bullet.life -= delta
  }

  for (let b = bullets.length - 1; b >= 0; b--) {
    const bullet = bullets[b]
    for (let e = enemies.length - 1; e >= 0; e--) {
      const enemy = enemies[e]
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) <= enemy.radius + 4) {
        enemy.hp -= bullet.damage
        hitTexts.push({ x: enemy.x + (Math.random() - 0.5) * 12, y: enemy.y - enemy.radius - 10, value: Math.round(bullet.damage).toString(), life: 0.42, maxLife: 0.42, color: enemy.boss ? '#e5b84b' : '#f3efe5' })
        bullet.pierce -= 1
        if (enemy.hp <= 0) killEnemy(e)
        if (bullet.pierce < 0) bullets.splice(b, 1)
        break
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) killEnemy(i)
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1)
  for (let i = hitTexts.length - 1; i >= 0; i--) {
    hitTexts[i].life -= delta
    hitTexts[i].y -= 28 * delta
    if (hitTexts[i].life <= 0) hitTexts.splice(i, 1)
  }
  playerHitFlash = Math.max(0, playerHitFlash - delta)
  screenShake = Math.max(0, screenShake - delta)
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i]
    if (Math.hypot(drop.x - player.x, drop.y - player.y) < modifiers.pickup) {
      if (drop.kind === 'gold') resources.gold += drop.value
      if (drop.kind === 'exp') grantExp(drop.value)
      drops.splice(i, 1)
    }
  }

  maybeOfferUpgrade()

  if (player.hp <= 0) {
    lastRun.value = { title: '撤离失败', body: '保留已拾取资源，回基地强化后再冲。', victory: false }
    mode.value = 'settlement'
    saveGame()
  }

  const bossCleared = stage.value % 10 !== 0 || (bossSpawned && !enemies.some((enemy) => enemy.boss))
  if (kills.value >= targetKills.value && bossCleared) {
    const stageReward = rewardForStage(stage.value, kills.value)
    const profile = getAttachmentDropProfile(stage.value)
    const attachmentDropCount = Math.random() < profile.dropChance ? Math.max(1, stageReward.parts) : 0
    const attachmentDrops = grantAttachmentDrops(attachmentDropCount, profile.rarityWeights)
    const reward: Reward = { ...stageReward, attachments: attachmentDrops }
    resources.gold += reward.gold
    resources.alloy += reward.alloy
    resources.parts += reward.parts
    grantExp(reward.exp)
    settlementEquipNotice.value = null
    lastRun.value = {
      title: `第 ${stage.value} 关清场`,
      body: attachmentDrops.length ? `缴获 ${attachmentDrops.map((item) => item.name).join('、')}，回基地可替换构筑。` : `${stageMeta.value.name} 已压制，本次未发现可用配件。`,
      victory: true,
      reward
    }
    bannerText.value = attachmentDrops.length ? `掉落配件：${attachmentDrops[0].name}` : '清场完成'
    mode.value = 'settlement'
    saveGame()
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = context
  if (!canvas || !ctx) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake * 16, (Math.random() - 0.5) * screenShake * 16)
  if (sprites.battlefield?.complete) drawCoverImage(ctx, sprites.battlefield, width, height)
  drawPlayArea(ctx, getPlayArea(width, height), width, height)

  for (const drop of drops) {
    drawShadow(ctx, drop.x, drop.y + 7, drop.radius * 3, 0.18)
    drawSprite(ctx, drop.kind === 'gold' ? sprites.pickupGold : sprites.pickupExp, drop.x, drop.y, drop.radius * 4)
  }
  for (const bullet of bullets) drawSprite(ctx, sprites.bullet, bullet.x, bullet.y, overloadTimer > 0 ? 34 : 26, Math.atan2(bullet.vy, bullet.vx))

  ctx.font = '12px Trebuchet MS'
  ctx.textAlign = 'center'
  for (const enemy of enemies) {
    const size = enemy.radius * (enemy.boss ? 3.6 : 3.2)
    drawShadow(ctx, enemy.x, enemy.y, size, enemy.boss ? 0.45 : 0.3)
    drawSprite(ctx, enemySprite(enemy), enemy.x, enemy.y, size, enemy.angle)
    ctx.fillStyle = '#15120d'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 4)
    ctx.fillStyle = '#78a866'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2 * Math.max(enemy.hp / enemy.maxHp, 0), 4)
    if (enemy.elite || enemy.boss) {
      ctx.fillStyle = '#f3efe5'
      ctx.fillText(enemy.label, enemy.x, enemy.y - enemy.radius - 15)
    }
  }

  ctx.font = '700 13px Trebuchet MS'
  ctx.textAlign = 'center'
  for (const text of hitTexts) {
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1)
    ctx.fillStyle = text.color
    ctx.fillText(text.value, text.x, text.y)
    ctx.globalAlpha = 1
  }

  for (const ghost of afterimages) {
    drawSpriteTint(ctx, sprites.player, ghost.x, ghost.y, ghost.size, ghost.angle, (ghost.life / ghost.maxLife) * 0.32, dashTimer > 0 ? '#e5b84b' : '#6ea6c9')
  }
  const speed = Math.hypot(player.vx, player.vy)
  const playerSize = player.radius * 3.4 * (1 + clamp(speed / 650, 0, 0.08))
  drawShadow(ctx, player.visualX, player.visualY, playerSize, 0.36)
  if (playerHitFlash > 0) {
    drawSpriteTint(ctx, sprites.player, player.visualX, player.visualY + Math.sin(player.bob) * clamp(speed / 260, 0, 2.3), playerSize, player.angle, 0.88, '#da4c3d')
  } else {
    drawSprite(ctx, sprites.player, player.visualX, player.visualY + Math.sin(player.bob) * clamp(speed / 260, 0, 2.3), playerSize, player.angle)
  }
  ctx.restore()
}

function loop(now: number) {
  const delta = Math.min((now - lastTime) / 1000 || 0, 0.05)
  lastTime = now
  update(delta)
  draw()
  animationFrame = requestAnimationFrame(loop)
}

function resetRunState() {
  kills.value = 0
  stageTimer = 0
  spawnTimer = 0
  overloadTimer = 0
  dashTimer = 0
  bossSpawned = false
  upgradeTakenForStage.value = 0
  upgradeChoices.value = []
  enemies.splice(0)
  bullets.splice(0)
  drops.splice(0)
  afterimages.splice(0)
  hitTexts.splice(0)
  for (const skill of skills) skill.cooldown = 0
  player.hp = player.maxHp
  player.vx = 0
  player.vy = 0
  movePlayerToAreaCenter()
}

function startStage() {
  applyBaseStats()
  resetRunState()
  mode.value = 'battle'
}

function returnToBase() {
  lastRun.value = null
  settlementEquipNotice.value = null
  stageDraft.value = stage.value
  applyBaseStats()
  resetRunState()
  mode.value = 'base'
  saveGame()
}

function advanceAndStart() {
  if (lastRun.value?.victory) {
    stage.value = clamp(stage.value + 1, 1, 10000)
    stageDraft.value = stage.value
  }
  lastRun.value = null
  settlementEquipNotice.value = null
  saveGame()
  startStage()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  for (const [key, url] of Object.entries(assetUrls)) loadSprite(key as keyof typeof assetUrls, url)
  loadGame()
  resizeCanvas()
  applyBaseStats()
  movePlayerToAreaCenter()
  canPersist = true
  watch(stage, (value) => {
    stageDraft.value = value
  })
  watch([stage, inventory, () => ({ ...resources }), () => ({ ...base }), () => ({ level: player.level, exp: player.exp, hp: player.hp }), () => equippedParts.map((item) => item.name)], saveGame, { deep: true })
  watch(bannerText, (text) => {
    if (!text) return
    window.setTimeout(() => {
      if (bannerText.value === text) bannerText.value = ''
    }, 1500)
  })
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  animationFrame = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<style scoped>
.game-screen {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #171815;
}

.battlefield {
  width: 100%;
  height: 100%;
  display: block;
}

.mode-base .battlefield,
.mode-settlement .battlefield {
  filter: saturate(0.8) brightness(0.56);
}

.hud,
.objective-strip,
.skill-bar,
.choice-panel,
.base-panel,
.settlement-panel,
.combat-banner {
  border: 1px solid rgba(243, 239, 229, 0.14);
  background: rgba(25, 24, 21, 0.9);
}

.hud {
  position: absolute;
  top: 18px;
  width: min(360px, calc(100vw - 36px));
  padding: 14px;
}

.hud-left {
  left: 18px;
}

.hud-right {
  right: 18px;
}

.mode-base .hud,
.mode-base .objective-strip,
.mode-base .skill-bar,
.mode-settlement .hud,
.mode-settlement .objective-strip,
.mode-settlement .skill-bar {
  display: none;
}

.panel-kicker,
.upgrade-code {
  margin: 0 0 6px;
  color: var(--hazard);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.hud h2,
.choice-panel h2,
.settlement-panel h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.stage-line,
.stats,
li,
.objective-strip,
.skill-bar button,
.inventory-preview button,
.reward-grid,
.reward-preview,
.settlement-actions,
.resource-rail,
.power-readout {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stage-line,
.stats,
li,
.inventory-preview button span,
.skill-bar span,
.base-hero p,
.upgrade-card p,
.settlement-panel p,
.base-intel small,
.base-intel span,
.power-readout span {
  color: var(--muted);
}

.bar {
  height: 10px;
  margin: 10px 0;
  background: #11100e;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--green);
}

.bar.exp span {
  background: var(--blue);
}

.stats {
  font-size: 12px;
}

.weapon-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.power-readout {
  align-items: center;
  margin: 0 0 12px;
  padding: 8px 10px;
  background: rgba(229, 184, 75, 0.1);
}

.power-readout b {
  color: #ead28a;
  font-size: 20px;
}

.weapon-traits span {
  padding: 4px 8px;
  background: rgba(229, 184, 75, 0.14);
  color: #ead28a;
  font-size: 12px;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

li b {
  color: var(--ink);
}

.inventory-preview {
  margin-top: 14px;
  display: grid;
  gap: 7px;
}

.empty-backpack {
  margin: 0;
  padding: 10px;
  color: var(--muted);
  background: rgba(243, 239, 229, 0.045);
  border: 1px dashed rgba(243, 239, 229, 0.16);
}

button {
  border: 1px solid rgba(243, 239, 229, 0.14);
  color: var(--ink);
  background: rgba(243, 239, 229, 0.06);
}

button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.inventory-preview button {
  padding: 8px;
  text-align: left;
}

.inventory-preview button.selected,
.base-backpack-list button.selected {
  border-color: rgba(229, 184, 75, 0.72);
  background: rgba(229, 184, 75, 0.14);
}

.objective-strip {
  position: absolute;
  left: 50%;
  top: 18px;
  width: min(620px, calc(100vw - 760px));
  min-width: 360px;
  transform: translateX(-50%);
  padding: 12px 14px;
  color: var(--muted);
}

.objective-strip strong {
  color: var(--ink);
}

.skill-bar {
  position: absolute;
  left: 50%;
  bottom: 22px;
  width: min(560px, calc(100vw - 36px));
  transform: translateX(-50%);
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.skill-bar button,
.choice-panel button {
  min-height: 58px;
  padding: 10px;
  display: grid;
  grid-template-columns: 42px 1fr;
  align-items: center;
  gap: 10px;
  text-align: left;
}

.skill-bar img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.skill-bar small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
}

.choice-panel,
.settlement-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(560px, calc(100vw - 36px));
  transform: translate(-50%, -50%);
  padding: 22px;
  z-index: 4;
}

.choice-panel > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.base-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(1080px, calc(100vw - 36px));
  transform: translate(-50%, -50%);
  padding: clamp(18px, 3vw, 30px);
  z-index: 3;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 18px;
}

.base-hero h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 62px);
  line-height: 0.98;
}

.resource-rail {
  flex-wrap: wrap;
  margin: 18px 0 12px;
}

.resource-rail span,
.base-intel article {
  padding: 10px;
  background: rgba(243, 239, 229, 0.06);
  border: 1px solid rgba(243, 239, 229, 0.1);
}

.resource-rail b {
  color: #ead28a;
}

.base-intel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.base-intel article {
  display: grid;
  gap: 5px;
}

.base-intel b {
  font-size: 20px;
}

.stage-picker {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 48px 48px minmax(120px, 1fr) 48px 48px;
  gap: 8px;
  align-items: stretch;
}

.stage-picker button,
.stage-picker label {
  min-height: 48px;
}

.stage-picker label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid rgba(243, 239, 229, 0.14);
  background: rgba(243, 239, 229, 0.06);
}

.stage-picker span {
  color: var(--muted);
  font-size: 13px;
}

.stage-picker input {
  width: 100%;
  min-width: 0;
  border: 0;
  color: var(--ink);
  background: transparent;
  text-align: right;
  font-weight: 900;
}

.reward-preview {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.reward-preview article {
  padding: 10px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.1);
}

.reward-preview span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.reward-preview b {
  display: block;
  margin-top: 4px;
  color: #ead28a;
  font-size: 15px;
}

.base-hero button,
.settlement-actions .primary,
.settlement-actions button:first-child {
  margin-top: 18px;
  padding: 12px 14px;
  font-weight: 800;
}

.base-hero button,
.settlement-actions .primary {
  background: var(--hazard);
  color: #15120d;
}

.base-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.upgrade-card {
  min-height: 210px;
  padding: 14px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
  display: flex;
  flex-direction: column;
}

.upgrade-card h3 {
  margin: 6px 0 8px;
}

.upgrade-card strong {
  margin: 0 0 12px;
  color: #ead28a;
  font-size: 13px;
}

.upgrade-card button {
  margin-top: auto;
  min-height: 44px;
}

.base-backpack {
  grid-column: 1 / -1;
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(243, 239, 229, 0.12);
}

.base-backpack-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
}

.base-backpack-head h3 {
  margin: 0;
  font-size: 18px;
}

.base-backpack-head > span {
  color: #ead28a;
  font-weight: 800;
}

.slot-filter {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

.slot-filter button {
  min-height: 48px;
  padding: 7px 6px;
  display: grid;
  place-items: center;
  gap: 2px;
}

.slot-filter button.active {
  border-color: rgba(229, 184, 75, 0.75);
  background: rgba(229, 184, 75, 0.16);
}

.slot-filter b {
  font-size: 13px;
}

.slot-filter span {
  color: var(--muted);
  font-size: 12px;
}

.base-backpack-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 10px;
}

.base-backpack-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.base-backpack-list button {
  min-height: 68px;
  padding: 10px;
  display: grid;
  gap: 5px;
  text-align: left;
}

.base-backpack-list span {
  color: var(--muted);
  font-size: 13px;
}

.attachment-compare {
  padding: 12px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
}

.compare-title {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.decision-hint {
  display: grid;
  gap: 3px;
  margin-bottom: 10px;
  padding: 9px 10px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
}

.decision-hint.compact {
  margin-bottom: 8px;
  padding: 7px 8px;
}

.decision-hint b {
  font-size: 14px;
}

.decision-hint span {
  color: var(--muted);
  font-size: 12px;
}

.tone-offense {
  border-color: rgba(229, 184, 75, 0.42);
}

.tone-offense b,
.recommend-tag.tone-offense {
  color: #ead28a;
}

.tone-survival {
  border-color: rgba(120, 168, 102, 0.48);
}

.tone-survival b,
.recommend-tag.tone-survival {
  color: var(--green);
}

.tone-utility {
  border-color: rgba(110, 166, 201, 0.48);
}

.tone-utility b,
.recommend-tag.tone-utility {
  color: #9fd0f0;
}

.tone-downgrade {
  border-color: rgba(218, 76, 61, 0.42);
}

.tone-downgrade b,
.recommend-tag.tone-downgrade {
  color: #ee8f83;
}

.compare-title div {
  display: grid;
  gap: 4px;
  padding: 8px;
  background: rgba(25, 24, 21, 0.52);
}

.compare-title span,
.compare-lines span {
  color: var(--muted);
  font-size: 12px;
}

.compare-lines {
  display: grid;
  gap: 6px;
  margin: 10px 0;
}

.compare-lines div {
  display: grid;
  grid-template-columns: 54px 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: rgba(243, 239, 229, 0.04);
}

.compare-lines strong {
  color: #ead28a;
}

.attachment-compare > button {
  width: 100%;
  min-height: 44px;
  background: var(--hazard);
  color: #15120d;
  font-weight: 900;
}

.settlement-panel {
  display: grid;
  gap: 12px;
  width: min(780px, calc(100vw - 36px));
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.reward-grid span {
  padding: 8px;
  background: rgba(229, 184, 75, 0.12);
}

.loot-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.loot-card {
  position: relative;
  min-height: 126px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(229, 184, 75, 0.2), rgba(110, 166, 201, 0.08));
  border: 1px solid rgba(229, 184, 75, 0.34);
}

.loot-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: var(--hazard);
}

.loot-card p {
  margin: 18px 0 6px;
  color: var(--muted);
}

.loot-card h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.loot-card strong {
  color: #ead28a;
}

.loot-compare {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(243, 239, 229, 0.12);
}

.compare-lines.compact {
  margin-bottom: 0;
}

.compare-lines.compact div {
  grid-template-columns: 46px minmax(0, 1fr) auto minmax(0, 1fr);
  padding: 6px;
  font-size: 12px;
}

.compare-title b,
.compare-lines b {
  min-width: 0;
  overflow-wrap: anywhere;
}

.loot-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.loot-card-actions span {
  color: #ead28a;
  font-size: 13px;
  font-weight: 800;
}

.loot-card-actions span.equipped {
  color: var(--green);
}

.loot-card-actions button {
  min-height: 38px;
  padding: 0 12px;
  background: var(--hazard);
  color: #15120d;
  font-weight: 900;
}

.settlement-equip-notice {
  margin: 0;
  padding: 9px 10px;
  display: grid;
  gap: 4px;
  color: #ead28a;
  background: rgba(120, 168, 102, 0.14);
  border: 1px solid rgba(120, 168, 102, 0.32);
}

.settlement-equip-notice b {
  color: var(--green);
}

.new-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 7px;
  background: #ead28a;
  color: #15120d;
  font-size: 12px;
  font-weight: 900;
}

.recommend-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 7px;
  background: rgba(25, 24, 21, 0.76);
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 900;
}

.post-battle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.post-battle-grid button {
  min-height: 82px;
  padding: 10px;
  display: grid;
  gap: 6px;
  text-align: left;
}

.post-battle-grid span {
  color: var(--muted);
  font-size: 13px;
}

.combat-banner {
  position: absolute;
  left: 50%;
  top: 98px;
  z-index: 5;
  transform: translateX(-50%);
  padding: 10px 18px;
  color: #ead28a;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  animation: banner-pop 1.5s ease-out both;
}

@keyframes banner-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -10px) scale(0.96);
  }
  18%,
  72% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -18px) scale(0.98);
  }
}

@media (max-width: 1180px) {
  .objective-strip {
    top: auto;
    bottom: 108px;
    width: min(560px, calc(100vw - 36px));
    min-width: 0;
  }
}

@media (max-width: 900px) {
  .base-panel {
    grid-template-columns: 1fr;
  }

  .base-grid,
  .base-intel,
  .stage-picker,
  .reward-preview,
  .slot-filter,
  .base-backpack-layout,
  .base-backpack-list,
  .loot-card-grid,
  .post-battle-grid,
  .choice-panel > div,
  .skill-bar {
    grid-template-columns: 1fr;
  }

  .loot-card-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .game-screen {
    min-height: 100vh;
    height: auto;
    display: grid;
    grid-template-rows: 60vh auto auto auto;
  }

  .hud,
  .objective-strip,
  .skill-bar {
    position: static;
    width: auto;
    margin: 8px;
    transform: none;
  }

  .hud-right {
    display: none;
  }

  .base-panel,
  .settlement-panel,
  .choice-panel {
    position: fixed;
    max-height: calc(100vh - 32px);
    overflow: auto;
  }
}
</style>
