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
        <p class="panel-kicker">背包预览</p>
        <button v-for="item in inventoryPreview" :key="item.name" type="button">
          <b>{{ item.name }}</b>
          <span>{{ item.rarity }} / {{ item.effect }}</span>
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
        <button type="button" @click="startStage">部署第 {{ stageLabel }} 关</button>
      </div>

      <div class="base-grid">
        <article v-for="upgrade in baseUpgrades" :key="upgrade.key" class="upgrade-card">
          <span class="upgrade-code">{{ upgrade.code }}</span>
          <h3>{{ upgrade.name }} Lv.{{ upgrade.level }}</h3>
          <p>{{ upgrade.desc }}</p>
          <button type="button" :disabled="!canBuy(upgrade)" @click="buyUpgrade(upgrade)">
            {{ upgrade.cost.gold }} 金币 / {{ upgrade.cost.alloy }} 合金
          </button>
        </article>
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
      <div class="settlement-actions">
        <button type="button" @click="returnToBase">返回基地强化</button>
        <button v-if="lastRun?.victory" type="button" class="primary" @click="advanceAndStart">直接下一关</button>
        <button v-else type="button" class="primary" @click="startStage">重新挑战</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
import { inventoryPreview, starterAttachments, starterWeapon } from '~/shared/game/weapons'

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
type Reward = ReturnType<typeof rewardForStage>
type Upgrade = { name: string; desc: string; apply: () => void }
type SkillKey = 'dash' | 'overload' | 'pulse'
type Mode = 'base' | 'battle' | 'settlement'
type PlayArea = { x: number; y: number; width: number; height: number }
type BaseUpgrade = {
  key: 'weaponLevel' | 'armorLevel' | 'magnetLevel'
  code: string
  name: string
  desc: string
  level: number
  cost: { gold: number; alloy: number }
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const keys = new Set<string>()
const mode = ref<Mode>('base')
const stage = ref(1)
const kills = ref(0)
const upgradeChoices = ref<Upgrade[]>([])
const upgradeTakenForStage = ref(0)
const resources = reactive({ gold: 80, alloy: 3, parts: 0 })
const base = reactive({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })
const lastRun = ref<{ title: string; body: string; victory: boolean; reward?: Reward } | null>(null)
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
const modifiers = reactive({ damage: 1, fireRate: 1, speed: 1, pickup: 70, pierceBonus: 0 })
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
const equippedParts = starterAttachments
const enemies: Enemy[] = []
const bullets: Bullet[] = []
const drops: Drop[] = []
const afterimages: Afterimage[] = []
let nextEnemyId = 1
let animationFrame = 0
let lastTime = 0
let spawnTimer = 0
let stageTimer = 0
let overloadTimer = 0
let dashTimer = 0
let bossSpawned = false
let context: CanvasRenderingContext2D | null = null

const stageMeta = computed(() => getStageMeta(stage.value))
const stageLabel = computed(() => stage.value.toString().padStart(4, '0'))
const targetKills = computed(() => (stage.value % 10 === 0 ? 45 : 28 + Math.min(stage.value, 22)))
const nextLevelExp = computed(() => player.level * 100)
const hpPercent = computed(() => Math.max(0, Math.round((player.hp / player.maxHp) * 100)))
const expPercent = computed(() => Math.min(100, Math.round((player.exp / nextLevelExp.value) * 100)))
const elapsedSeconds = computed(() => Math.floor(stageTimer))
const stageType = computed(() => {
  if (stage.value % 10 === 0) return '首领关'
  if (stage.value % 25 === 0) return '资源关'
  if (stage.value % 5 === 0) return '精英关'
  return '普通关'
})
const objectiveText = computed(() => {
  if (mode.value === 'base') return '基地整备中'
  if (stage.value % 10 === 0) return bossSpawned ? '首领已进入战场' : '击杀足够敌人后首领登场'
  return kills.value >= targetKills.value ? '目标完成' : '保持移动，避免包围'
})
const baseUpgrades = computed<BaseUpgrade[]>(() => [
  {
    key: 'weaponLevel',
    code: 'ARS',
    name: '枪械校准',
    desc: `永久提升伤害和射速。当前伤害 +${base.weaponLevel * 10}%`,
    level: base.weaponLevel,
    cost: upgradeCost(base.weaponLevel, 42, 1)
  },
  {
    key: 'armorLevel',
    code: 'PLT',
    name: '护甲整备',
    desc: `提升最大生命并降低接触伤害。当前生命 +${base.armorLevel * 18}`,
    level: base.armorLevel,
    cost: upgradeCost(base.armorLevel, 36, 1)
  },
  {
    key: 'magnetLevel',
    code: 'MAG',
    name: '磁吸轨道',
    desc: `扩大金币和经验拾取范围。当前范围 +${base.magnetLevel * 18}`,
    level: base.magnetLevel,
    cost: upgradeCost(base.magnetLevel, 30, 0)
  }
])

function upgradeCost(level: number, goldBase: number, alloyBase: number) {
  return { gold: goldBase + level * 32, alloy: alloyBase + Math.floor(level / 2) }
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
}

function applyBaseStats() {
  player.maxHp = 120 + base.armorLevel * 18 + (player.level - 1) * 12
  player.hp = Math.min(player.maxHp, player.hp)
  modifiers.damage = 1 + base.weaponLevel * 0.1
  modifiers.fireRate = 1 + base.weaponLevel * 0.035
  modifiers.speed = 1
  modifiers.pickup = 70 + base.magnetLevel * 18
  modifiers.pierceBonus = 0
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
  player.exp += amount
  while (player.exp >= nextLevelExp.value) {
    player.exp -= nextLevelExp.value
    player.level += 1
    player.maxHp += 12
    player.hp = Math.min(player.maxHp, player.hp + 24)
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
      player.hp -= enemy.damage * Math.max(0.55, 1 - base.armorLevel * 0.045)
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
        bullet.pierce -= 1
        if (enemy.hp <= 0) killEnemy(e)
        if (bullet.pierce < 0) bullets.splice(b, 1)
        break
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) killEnemy(i)
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1)
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
  }

  const bossCleared = stage.value % 10 !== 0 || (bossSpawned && !enemies.some((enemy) => enemy.boss))
  if (kills.value >= targetKills.value && bossCleared) {
    const reward = rewardForStage(stage.value, kills.value)
    resources.gold += reward.gold
    resources.alloy += reward.alloy
    resources.parts += reward.parts
    grantExp(reward.exp)
    lastRun.value = {
      title: `第 ${stage.value} 关清场`,
      body: `${stageMeta.value.name} 已压制，建议回外围基地做一次强化。`,
      victory: true,
      reward
    }
    mode.value = 'settlement'
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = context
  if (!canvas || !ctx) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  ctx.clearRect(0, 0, width, height)
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

  for (const ghost of afterimages) {
    drawSpriteTint(ctx, sprites.player, ghost.x, ghost.y, ghost.size, ghost.angle, (ghost.life / ghost.maxLife) * 0.32, dashTimer > 0 ? '#e5b84b' : '#6ea6c9')
  }
  const speed = Math.hypot(player.vx, player.vy)
  const playerSize = player.radius * 3.4 * (1 + clamp(speed / 650, 0, 0.08))
  drawShadow(ctx, player.visualX, player.visualY, playerSize, 0.36)
  drawSprite(ctx, sprites.player, player.visualX, player.visualY + Math.sin(player.bob) * clamp(speed / 260, 0, 2.3), playerSize, player.angle)
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
  if (lastRun.value?.victory) stage.value += 1
  lastRun.value = null
  applyBaseStats()
  resetRunState()
  mode.value = 'base'
}

function advanceAndStart() {
  if (lastRun.value?.victory) stage.value += 1
  lastRun.value = null
  startStage()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  for (const [key, url] of Object.entries(assetUrls)) loadSprite(key as keyof typeof assetUrls, url)
  resizeCanvas()
  applyBaseStats()
  movePlayerToAreaCenter()
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
.settlement-panel {
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
.settlement-actions {
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
.settlement-panel p {
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
  width: min(980px, calc(100vw - 36px));
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

.upgrade-card button {
  margin-top: auto;
  min-height: 44px;
}

.settlement-panel {
  display: grid;
  gap: 12px;
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
  .choice-panel > div,
  .skill-bar {
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
