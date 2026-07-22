import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useCloudSave } from './useCloudSave'
import battlefieldUrl from '~/assets/images/generated/battlefield.webp'
import bulletUrl from '~/assets/images/generated/bullet.png'
import enemyBomberUrl from '~/assets/images/generated/enemy-bomber.png'
import enemyBossUrl from '~/assets/images/generated/enemy-boss.png'
import enemyFastUrl from '~/assets/images/generated/enemy-fast.png'
import enemyGruntUrl from '~/assets/images/generated/enemy-grunt.png'
import enemyHeavyUrl from '~/assets/images/generated/enemy-heavy.png'
import enemyShieldUrl from '~/assets/images/generated/enemy-shield.png'
import enemyCommanderUrl from '~/assets/images/generated/enemy-commander.png'
import enemySplitterUrl from '~/assets/images/generated/enemy-splitter.png'
import enemyStealthUrl from '~/assets/images/generated/enemy-stealth.png'
import bossAssaultLordUrl from '~/assets/images/generated/boss-assault-lord.png'
import bossFortressColossusUrl from '~/assets/images/generated/boss-fortress-colossus.png'
import bossWarzoneCommanderUrl from '~/assets/images/generated/boss-warzone-commander.png'
import bossFinalCoreUrl from '~/assets/images/generated/boss-final-core.png'
import warzoneIndustrialBlockadeUrl from '~/assets/images/generated/warzone-industrial-blockade.webp'
import warzoneWastelandHuntUrl from '~/assets/images/generated/warzone-wasteland-hunt.webp'
import warzoneWastelandStormUrl from '~/assets/images/generated/warzone-wasteland-storm.webp'
import warzoneAlloyFortressUrl from '~/assets/images/generated/warzone-alloy-fortress.webp'
import warzoneRadiationCityUrl from '~/assets/images/generated/warzone-radiation-city.webp'
import warzoneDeepFrontUrl from '~/assets/images/generated/warzone-deep-front.webp'
import warzoneBlackDomainUrl from '~/assets/images/generated/warzone-black-domain.webp'
import warzoneEndWarUrl from '~/assets/images/generated/warzone-end-war.webp'
import attachmentIconsSheetUrl from '~/assets/images/generated/attachment-icons-sheet.webp'
import equipmentIconsSheetUrl from '~/assets/images/generated/equipment-icons-sheet.webp'
import pickupExpUrl from '~/assets/images/generated/pickup-exp.webp'
import pickupGoldUrl from '~/assets/images/generated/pickup-gold.webp'
import playerUrl from '~/assets/images/generated/player.png'
import skillDashUrl from '~/assets/images/generated/skill-dash.webp'
import skillOverloadUrl from '~/assets/images/generated/skill-overload.webp'
import skillPulseUrl from '~/assets/images/generated/skill-pulse.webp'
import {
  attachmentBuildTags,
  attachmentMaxLevel,
  attachmentRarityRank,
  attachmentUpgradeCost,
  buildAttachmentComparison,
  buildAttachmentDecision,
  buildAttachmentDimensions,
  buildAttachmentTags,
  combineAffixBonuses,
  createAffix,
  createMainAffix,
  formatAffix,
  formatAttachmentEffect,
  normalizeBonus,
  rollSubAffixes,
  type AttachmentDecision,
  type AttachmentDimension,
  type AttachmentBuildTag,
  type CompareRow
} from '~/shared/game/attachment-domain'
import { getStageMeta, rewardForStage, scaleEnemyStats, type EnemyKind } from '~/shared/game/formulas'
import { enemyFactionDefinitions, enemyFactionFor, factionDamageMultiplier, factionFormationBonus, factionStatusDurationMultiplier, type EnemyFaction } from '~/shared/game/factions'
import { bossAbilityPlanForStage, bossDefinitionForStage, type BossArchetype } from '~/shared/game/bosses'
import { attachmentBreakthroughCost, attachmentCanBreakthrough, attachmentCanStar, attachmentStarCost, emptyAdvancedResources, emptySeasonState, emptyShopState, emptySkillProgress, eventClearRewards, normalizeAdvancedResources, normalizeSeasonState, normalizeShopState, normalizeSkillProgress, seasonTier, shopOffers, skillUpgradeCost, type AdvancedResources, type SeasonState, type ShopState, type SkillProgress, type ShopOfferId } from '~/shared/game/expansion'
import { canAdvanceStage, maxSelectableStageFor, nextStageAfterVictory, restoreProgression } from '~/shared/game/progression'
import { BASE_INVENTORY_CAPACITY, canAffordAttachmentReforge, getAttachmentRecycleValue, getAttachmentReforgeCost, resolveAttachmentOverflow, type AttachmentReforgeCost } from '~/shared/game/inventory'
import { enemyKindLabels, getEnemyPreview, getStageTypeLabel } from '~/shared/game/presentation'
import { absorbWithArmor, defenseDamageMultiplier, luckDropMultiplier, luckRarityShift } from '~/shared/game/player-stats'
import { leaderboardMetrics, type LeaderboardMetric } from '~/shared/game/live-ops'
import { bountyObjectiveCompleted, bountyObjectiveForStage, createOperationWavePlan, getOperationDefinition, operationAdvancesCampaign, operationDefinitions, operationUnlockText, operationUnlocked, operationVictoryVerdict, type OperationMode } from '~/shared/game/operations'
import { eliteAffixCombatModifiers, eliteAffixLabels, r4EnemyMechanicsForStage, r4Tuning, resolveEliteAffixes, type EliteAffixId } from '~/shared/game/r4'
import { getR5WarzoneTheme, r5BossHpMultiplierForStage, r5CampaignGrowthForHighestCleared, r5EliteAffixColor, r5EliteAffixCombatModifiers, r5EliteAffixLabels, r5EnemyMechanicsForStage, r5ShieldLinkPairEligible, r5Tuning, resolveR5EliteAffixes, type R5EliteAffixId, type R5WarzoneTheme } from '~/shared/game/r5'
import { CURRENT_SAVE_VERSION, emptyLegacyBase, migrateAttachmentIdentity } from '~/shared/game/save'
import { R3_REPLAY_FIXED_DELTA, clockwisePatrolVector, createR3ReplayPlan, createR4ReplayPlan, createR5ReplayPlan, createSeededRandom, supportedRareReforges, type R3ReplayPlanEntry, type R3ReplaySample, type R4ReplayPlanEntry, type R4ReplaySample, type R5ReplayPlanEntry, type R5ReplaySample } from '~/shared/game/replay'
import { countWaveEnemies, enemyKindForWave, levelTuning, resolvedBossPhases, resolvedSpawnInterval } from '~/shared/game/waves'
import { buildStrategyInsights, dpsGapPercent, durationVerdict, emptyR5CombatTelemetry, recordAffixCombination, type AttachmentContribution, type R5CombatTelemetry, type WaveRunRecord } from '~/shared/game/telemetry'
import {
  applyElementStatus,
  attachmentDropCount,
  canUpgradeTalent,
  calculateOfflineReward,
  combinedSetBonuses,
  createAchievements,
  createDailyTasks,
  createWeeklyTasks,
  dailyTaskKey,
  emptyDropPity,
  emptyEnemyStatus,
  emptyTalentLevels,
  guaranteedDropRarity,
  normalizeAchievements,
  normalizeDailyTasks,
  normalizeDropPity,
  normalizeTalentLevels,
  normalizeWeeklyTasks,
  rarityRank,
  recordPityDrop,
  recordTaskEvent,
  summarizeSets,
  talentBonuses,
  talentNodes,
  talentPointBudget,
  tickEnemyStatus,
  weeklyTaskKey,
  type DropPityState,
  type EnemyStatusState,
  type GameTask,
  type OfflineReward,
  type TalentNodeId,
  type TalentLevels
} from '~/shared/game/long-term'
import { applyWeaponProgress, attachmentPool, attachmentRarities, attachmentSlots, breakthroughWeapon, emptyWeaponProgress, normalizeWeaponProgress, reforgeWeapon, rollWeaponCrate, starterAttachments, starterWeapon, weaponBreakthroughCost, weaponCanBreakthrough, weaponCatalog, weaponHitCanChain, weaponReforgeCost, weaponRequiresCharge, weaponStarCost, weaponUpgradeCost, type Attachment, type AttachmentAffix, type AttachmentBonusKey, type AttachmentRarity, type AttachmentSlot, type AttachmentSpecialEffectKey, type WeaponDefinition, type WeaponElement, type WeaponProgressMap } from '~/shared/game/weapons'

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
  affixes: R5EliteAffixId[]
  faction: EnemyFaction
  formationActive: boolean
  formationIncomingMultiplier: number
  attackTimer: number
  aimTime: number
  aimAngle: number
  chargeCooldown: number
  chargeWindup: number
  chargeTime: number
  chargeHit: boolean
  armor: number
  maxArmor: number
  armorBreakFlash: number
  damageIdleSeconds: number
  contactDetonated: boolean
  bossPhase: number
  statuses: EnemyStatusState
  spawnedAt: number
  bossArchetype?: BossArchetype
  abilityCooldown: number
  summonCooldown: number
  barrierCooldown: number
  revealedUntil: number
  laserSweepShotsRemaining: number
  laserSweepTimer: number
  laserSweepAngle: number
  laserSweepStep: number
  enraged: boolean
}
type Bullet = Vec & { vx: number; vy: number; damage: number; life: number; pierce: number; critical: boolean; element: WeaponElement; statusChance: number; explosionRadius: number; chainCount: number; knockback: number; hitEnemyIds: Set<number> }
type EnemyProjectile = Vec & { vx: number; vy: number; damage: number; life: number; radius: number; sourceKind: EnemyKind | 'boss'; sourceAffixes: R5EliteAffixId[] }
type EnemyHazard = Vec & { radius: number; warningSeconds: number; totalWarningSeconds: number; damage: number; sourceKind: EnemyKind; tracking: boolean }
type Drop = Vec & { value: number; radius: number; kind: 'gold' | 'exp' }
type Afterimage = Vec & { angle: number; life: number; maxLife: number; size: number }
type StageReward = ReturnType<typeof rewardForStage>
type Reward = StageReward & { attachments: Attachment[] }
type Upgrade = { name: string; desc: string; tag: string; comparison: string; apply: () => void }
type PostBattleChoice = { name: string; desc: string; disabled: boolean; apply: () => void }
type HitText = Vec & { value: string; life: number; maxLife: number; color: string; critical?: boolean }
type RunStatsSnapshot = {
  duration: number
  kills: number
  totalDamage: number
  averageDps: number
  peakDps: number
  highestHit: number
  goldEarned: number
  expEarned: number
  hitCount: number
  damageTaken: number
  lifestealHealing: number
  waves: WaveRunRecord[]
  deathCombination: string
  dpsGapPercent: number
  durationVerdict: string
  contribution: AttachmentContribution
  loadoutBonuses: EquippedBonusTotals
  r4Telemetry: R5CombatTelemetry
}
type SkillKey = 'dash' | 'overload' | 'pulse'
type EquippedBonusTotals = Record<AttachmentBonusKey, number>
type InventorySortMode = '最近获得' | '品质优先' | '槽位整理'
type InventoryFilterMode = '全部' | '收藏' | '推荐' | '可替换' | '低品质'
type AttachmentSlotFilter = AttachmentSlot | '全部'
type AttachmentRarityFilter = AttachmentRarity | '全部'
type AttachmentBuildTagFilter = AttachmentBuildTag | '全部'
type CharacterStatTone = 'offense' | 'survival' | 'mobility' | 'growth'
type CharacterStat = { key: string; label: string; value: string | number; hint: string; tone: CharacterStatTone }
type Mode = 'base' | 'battle' | 'settlement'
type PlayArea = { x: number; y: number; width: number; height: number }
type SaveData = {
  saveVersion: number
  stage: number
  highestCleared?: number
  resources: { gold: number; alloy: number; parts: number }
  base: { weaponLevel: number; armorLevel: number; magnetLevel: number }
  player: { level: number; exp: number; hp: number; armor?: number }
  equipped: Array<string | Attachment>
  inventory: Array<string | Attachment>
  acquireOrder?: Record<string, number>
  selectedWeaponKey?: string
  selectedSupportWeaponKey?: string | null
  weaponProgress?: Record<string, Partial<WeaponProgressMap[string]>>
  talents?: Partial<TalentLevels>
  daily?: { key: string; tasks: GameTask[] }
  weekly?: { key: string; tasks: GameTask[] }
  achievements?: GameTask[]
  dropPity?: Partial<DropPityState>
  advancedResources?: Partial<AdvancedResources>
  skillProgress?: Partial<SkillProgress>
  shop?: Partial<ShopState>
  season?: Partial<SeasonState>
  lastSeenAt?: number
  savedAt?: number
}

type ReplayBatchOptions = { speed?: number; baseSeed?: number }
type ReplayPlanEntry = R3ReplayPlanEntry | R4ReplayPlanEntry | R5ReplayPlanEntry
type ReplaySample = R3ReplaySample | R4ReplaySample | R5ReplaySample
type ReplayStatus = {
  status: string
  currentLabel: string
  validSamples: number
  rejectedSamples: number
  message: string
  samples: ReplaySample[]
  rejected: ReplaySample[]
}

declare global {
  interface Window {
    __gunfightR3Replay?: {
      start: (options?: ReplayBatchOptions) => Promise<void>
      stop: () => void
      getStatus: () => ReplayStatus
    }
    __gunfightR4Replay?: {
      start: (options?: ReplayBatchOptions) => Promise<void>
      stop: () => void
      getStatus: () => ReplayStatus
    }
    __gunfightR5Replay?: {
      start: (options?: ReplayBatchOptions) => Promise<void>
      stop: () => void
      getStatus: () => ReplayStatus
    }
  }
}

export function useGameCanvas() {
const canvasRef = ref<HTMLCanvasElement | null>(null)
const SAVE_KEY = 'gunfight-growth-save-v1'
const keys = new Set<string>()
const mode = ref<Mode>('base')
const stage = ref(1)
const stageDraft = ref(1)
const highestCleared = ref(0)
const selectedOperationMode = ref<OperationMode>('campaign')
const activeOperationMode = ref<OperationMode>('campaign')
const kills = ref(0)
const bountyTargetKills = ref(0)
const spawnedEnemyCount = ref(0)
const upgradeChoices = ref<Upgrade[]>([])
const upgradeTakenForStage = ref(0)
const resources = reactive({ gold: 80, alloy: 3, parts: 0 })
const base = reactive({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })
const lastRun = ref<{ title: string; body: string; objectiveSummary?: string; victory: boolean; reward?: Reward; stats: RunStatsSnapshot } | null>(null)
const bannerText = ref('')
const bannerTone = ref<'normal' | 'elite' | 'victory'>('normal')
const killNotice = ref('')
const currentWave = ref(1)
const waveSpawnedCount = ref(0)
const waveTransitionSeconds = ref(0)
const waveTransitionPending = ref(false)
const bossHud = reactive({ visible: false, label: '', phaseLabel: '', hp: 0, maxHp: 1, hpPercent: 0 })
const damageDirection = reactive({ angle: 0, life: 0 })
const touchMovement = reactive({ x: 0, y: 0 })
const postBattleChoiceTaken = ref(false)
const runStats = reactive({
  currentDps: 0,
  peakDps: 0,
  totalDamage: 0,
  highestHit: 0,
  goldEarned: 0,
  expEarned: 0,
  hitCount: 0,
  damageTaken: 0,
  lifestealHealing: 0,
  heavyPierceDamage: 0,
  criticalTriggers: 0,
  criticalExtraDamage: 0,
  dodgedCharges: 0,
  totalChargeAttempts: 0,
  deathCombination: ''
})
const r4Telemetry = reactive<R5CombatTelemetry>(emptyR5CombatTelemetry())
const settlementEquipNotice = ref<{ equipped: string; replaced?: string } | null>(null)
const overflowSalvageNotice = ref<{ items: Attachment[]; gold: number; parts: number } | null>(null)
const replayUi = reactive({
  visible: false,
  status: 'idle',
  currentLabel: '',
  validSamples: 0,
  rejectedSamples: 0,
  message: '',
  phaseLabel: 'R3',
  targetSamples: 12
})
const replayResultsJson = computed(() => {
  void replayUi.validSamples
  void replayUi.rejectedSamples
  void replayUi.status
  void replayUi.message
  return JSON.stringify(replayStatus())
})
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
  defense: 0,
  armor: 0,
  maxArmor: 0,
  luck: 0,
  speed: 235,
  radius: 17,
  fireTimer: 0,
  invuln: 0,
  level: 1,
  exp: 0
})
const modifiers = reactive({
  damage: 1, fireRate: 1, speed: 1, pickup: 70, pierceBonus: 0, expGain: 1, critRate: 0,
  statusPower: 1, statusChance: 0, statusDuration: 1, goldGain: 1, offlineGain: 1,
  offlineCapHours: 8, dropRate: 0, damageReduction: 0, healthRegen: 0, lifesteal: 0,
  dodge: 0, cooldownReduction: 0, eliteDamage: 0, extraChains: 0, noPierceFalloff: false,
  burnExplosion: false, lowHealthLifesteal: false, doubleRewardChance: 0, eliteKillBuff: false,
  fireDamage: 0, shockChance: 0, voidAmmo: false, phaseDodge: false, fortress: false, statusSpread: false,
  stormImpact: false, quantumMagazine: false, goldConversion: false, lastStand: false,
  blackHole: false, threatTargeting: false, eliteOverdrive: false
})
const skills = reactive([
  { key: 'dash' as SkillKey, shortcut: '1', name: '战术冲刺', hint: '瞬间拉开', cooldown: 0, icon: skillDashUrl },
  { key: 'overload' as SkillKey, shortcut: '2', name: '过载火力', hint: '短时射速', cooldown: 0, icon: skillOverloadUrl },
  { key: 'pulse' as SkillKey, shortcut: '3', name: '磁暴脉冲', hint: '清近身怪', cooldown: 0, icon: skillPulseUrl }
])
const skillBuildLinks = computed(() => {
  const supportParts = activeEquippedParts.value.filter((part) => part.slot === '模块' || part.slot === '芯片')
  const tags = new Set(supportParts.flatMap(buildAttachmentTags))
  return { dash: tags.has('生存'), overload: tags.has('输出'), pulse: tags.has('穿透') }
})

const assetUrls = {
  battlefield: battlefieldUrl,
  player: playerUrl,
  bullet: bulletUrl,
  enemyGrunt: enemyGruntUrl,
  enemyFast: enemyFastUrl,
  enemyHeavy: enemyHeavyUrl,
  enemyBomber: enemyBomberUrl,
  enemyBoss: enemyBossUrl,
  enemyShield: enemyShieldUrl,
  enemyCommander: enemyCommanderUrl,
  enemySplitter: enemySplitterUrl,
  enemyStealth: enemyStealthUrl,
  bossAssaultLord: bossAssaultLordUrl,
  bossFortressColossus: bossFortressColossusUrl,
  bossWarzoneCommander: bossWarzoneCommanderUrl,
  bossFinalCore: bossFinalCoreUrl,
  warzoneIndustrialBlockade: warzoneIndustrialBlockadeUrl,
  warzoneWastelandHunt: warzoneWastelandHuntUrl,
  warzoneWastelandStorm: warzoneWastelandStormUrl,
  warzoneAlloyFortress: warzoneAlloyFortressUrl,
  warzoneRadiationCity: warzoneRadiationCityUrl,
  warzoneDeepFront: warzoneDeepFrontUrl,
  warzoneBlackDomain: warzoneBlackDomainUrl,
  warzoneEndWar: warzoneEndWarUrl,
  pickupGold: pickupGoldUrl,
  pickupExp: pickupExpUrl
}
const sprites: Partial<Record<keyof typeof assetUrls, HTMLImageElement>> = {}
const selectedWeaponKey = ref(starterWeapon.key)
const selectedSupportWeaponKey = ref<string | null>(null)
const weapon = reactive<WeaponDefinition>({ ...starterWeapon, traits: [...starterWeapon.traits] })
const weaponProgress = reactive<WeaponProgressMap>(emptyWeaponProgress())
const weaponAmmo = ref(starterWeapon.magazineSize)
const weaponReloadTimer = ref(0)
const weaponChargeTimer = ref(0)
const weaponCharging = ref(false)
const talentLevels = reactive<TalentLevels>(emptyTalentLevels())
const dailyKey = ref(dailyTaskKey())
const dailyTasks = ref<GameTask[]>(createDailyTasks())
const weeklyKey = ref(weeklyTaskKey())
const weeklyTasks = ref<GameTask[]>(createWeeklyTasks())
const achievements = ref<GameTask[]>(createAchievements())
const dropPity = reactive<DropPityState>(emptyDropPity())
const advancedResources = reactive<AdvancedResources>(emptyAdvancedResources())
const skillProgress = reactive<SkillProgress>(emptySkillProgress())
const shopState = reactive<ShopState>(emptyShopState())
const seasonState = reactive<SeasonState>(emptySeasonState())
const currentSeasonTier = computed(() => seasonTier(seasonState.score))
const pendingOfflineReward = ref<OfflineReward | null>(null)
const lastSeenAt = ref(Date.now())
const attachmentByName = new Map(attachmentPool.map((item) => [item.name, item]))
let attachmentInstanceCursor = 0
const equippedParts = reactive<Attachment[]>([])
const inventory = ref<Attachment[]>([])
const inventorySortOptions: InventorySortMode[] = ['最近获得', '品质优先', '槽位整理']
const inventoryFilterOptions: InventoryFilterMode[] = ['全部', '收藏', '推荐', '可替换', '低品质']
const attachmentSlotFilters = ['全部', ...attachmentSlots] as const
const attachmentRarityFilters = ['全部', ...attachmentRarities] as const
const selectedInventorySort = ref<InventorySortMode>('最近获得')
const selectedInventoryFilter = ref<InventoryFilterMode>('全部')
const selectedSlot = ref<AttachmentSlotFilter>('全部')
const selectedRarity = ref<AttachmentRarityFilter>('全部')
const selectedBuildTag = ref<AttachmentBuildTagFilter>('全部')
const selectedAttachment = ref<Attachment | null>(null)
const lockedReforgeAffix = ref<{ attachmentKey: string; affixKey: AttachmentBonusKey } | null>(null)
const isSaleMode = ref(false)
const saleSelection = reactive(new Set<string>())
const attachmentAcquireOrder = reactive<Record<string, number>>({})
const enemies: Enemy[] = []
const bullets: Bullet[] = []
const enemyProjectiles: EnemyProjectile[] = []
const enemyHazards: EnemyHazard[] = []
const drops: Drop[] = []
const afterimages: Afterimage[] = []
const hitTexts: HitText[] = []
let nextEnemyId = 1
let animationFrame = 0
let lastTime = 0
let spawnTimer = 0
const stageTimer = ref(0)
let overloadTimer = 0
let dashTimer = 0
let eliteSetBuffTimer = 0
let dualMoveBuffTimer = 0
let phaseDodgeCooldown = 0
let lastStandBuffTimer = 0
let lastStandCooldown = 0
let blackHoleTimer = 8
let playerPoisonSeconds = 0
let playerPoisonDps = 0
let playerChillSeconds = 0
let supportWeaponTimer = 0
let stationarySeconds = 0
let fortressShield = 0
let shotsFiredThisRun = 0
let stormHitCounter = 0
let quantumShotActive = false
let lifestealWindowSeconds = 1
let lifestealRecoveredInWindow = 0
let movementIdleSeconds = 0
let hasMovedThisRun = false
let sustainedFireStacks = 0
let lastLockedTargetId = 0
let lockedTargetHits = 0
let playerHitFlash = 0
let screenShake = 0
let bossSpawned = false
let audioContext: AudioContext | null = null
let killNoticeTimer = 0
const damageEvents: Array<{ time: number; amount: number }> = []
const waveRecords: WaveRunRecord[] = []
const recordedWaveIndexes = new Set<number>()
let waveStartTime = 0
let context: CanvasRenderingContext2D | null = null
let canPersist = false
let attachmentAcquireCursor = 0
let replayPersistenceSuppressed = false
const replayRuntime = {
  running: false,
  mode: 'r3' as 'r3' | 'r4' | 'r5',
  plan: [] as ReplayPlanEntry[],
  planIndex: 0,
  attempt: 1,
  speed: 1,
  random: Math.random as () => number,
  waypointIndex: 0,
  samples: [] as ReplaySample[],
  rejected: [] as ReplaySample[],
  issues: new Set<string>(),
  maxFrameGapMs: 0,
  previousFrameAt: 0,
  wallStartedAt: 0,
  startResources: { gold: 0, alloy: 0, parts: 0 },
  fixtureFactory: null as null | ((stage: number) => SaveData),
  buildProfileFactory: null as null | ((stage: number) => { id: string; expectedDps: number; expectedMaxHp?: number })
}

const stageMeta = computed(() => getStageMeta(stage.value))
const stageLabel = computed(() => stage.value.toString().padStart(4, '0'))
const debugStageSelection = import.meta.dev
const maxSelectableStage = computed(() => maxSelectableStageFor(highestCleared.value, debugStageSelection))
const operationMode = computed(() => mode.value === 'base' ? selectedOperationMode.value : activeOperationMode.value)
const operationDefinition = computed(() => getOperationDefinition(operationMode.value))
const operationOptions = computed(() => operationDefinitions.map((operation) => ({
  ...operation,
  unlocked: debugStageSelection || operationUnlocked(operation.id, highestCleared.value),
  unlockText: operationUnlockText(operation.id)
})))
const isIndependentOperation = computed(() => !operationAdvancesCampaign(operationMode.value))
const canAdvanceToNextStage = computed(() => !isIndependentOperation.value && canAdvanceStage(stage.value, Boolean(lastRun.value?.victory), debugStageSelection))
const wavePlan = computed(() => createOperationWavePlan(stage.value, operationMode.value))
const totalWaves = computed(() => wavePlan.value.length)
const currentWaveDefinition = computed(() => wavePlan.value[currentWave.value - 1])
const targetKills = computed(() => countWaveEnemies(wavePlan.value))
const bountyObjective = computed(() => bountyObjectiveForStage(stage.value))
const nextLevelExp = computed(() => player.level * 100)
const expToNextLevel = computed(() => Math.max(0, nextLevelExp.value - player.exp))
const hpPercent = computed(() => Math.max(0, Math.round((player.hp / player.maxHp) * 100)))
const expPercent = computed(() => Math.min(100, Math.round((player.exp / nextLevelExp.value) * 100)))
const elapsedSeconds = computed(() => Math.floor(stageTimer.value))
const operationTimeRemaining = computed(() => Math.max(0, (operationDefinition.value.durationSeconds ?? 0) - stageTimer.value))
const operationObjectiveText = computed(() => operationMode.value === 'bounty'
  ? `清剿 ${bountyObjective.value.requiredKills} 名${bountyObjective.value.targetLabel}`
  : operationDefinition.value.objective)
const operationProgressText = computed(() => operationMode.value === 'survival'
  ? `剩余 ${Math.ceil(operationTimeRemaining.value)} 秒 · 击杀 ${kills.value}`
  : operationMode.value === 'bounty'
    ? `${bountyObjective.value.targetLabel} ${Math.min(bountyTargetKills.value, bountyObjective.value.requiredKills)}/${bountyObjective.value.requiredKills}`
    : `击杀 ${Math.min(kills.value, targetKills.value)}/${targetKills.value}`)
const damagePreview = computed(() => Math.round(weapon.damage * modifiers.damage))
const fireRatePreview = computed(() => (weapon.fireRate * modifiers.fireRate).toFixed(1))
const moveSpeedPreview = computed(() => Math.round(player.speed * modifiers.speed))
const critRatePreview = computed(() => Math.round(Math.min(0.9, modifiers.critRate + weapon.critRate) * 100))
const expGainPreview = computed(() => Math.round(modifiers.expGain * 100))
const expGainBonusPreview = computed(() => Math.round((modifiers.expGain - 1) * 100))
const totalPiercePreview = computed(() => weapon.pierce + modifiers.pierceBonus)
const damageReductionPreview = computed(() => Math.round(modifiers.damageReduction * 100))
const expectedDpsPreview = computed(() => Math.round(Number(damagePreview.value) * Number(fireRatePreview.value) * weapon.projectiles * (1 + Math.min(0.9, modifiers.critRate + weapon.critRate) * (weapon.critDamage - 1))))
const combatPower = computed(() => {
  const offense = weapon.damage * modifiers.damage * weapon.fireRate * modifiers.fireRate * (1 + modifiers.critRate * 0.55) * (1 + (weapon.pierce + modifiers.pierceBonus) * 0.18)
  const survival = player.maxHp
  return Math.round(offense * 7 + survival * 2 + modifiers.pickup * 0.8)
})
const characterStats = computed<CharacterStat[]>(() => [
  { key: 'damage', label: '单发伤害', value: damagePreview.value, hint: '每颗子弹未暴击时造成的伤害。', tone: 'offense' },
  { key: 'dps', label: '秒伤预估', value: expectedDpsPreview.value, hint: '按当前射速和暴击率计算的持续输出预估。', tone: 'offense' },
  { key: 'fireRate', label: '攻击频率', value: `${fireRatePreview.value}/秒`, hint: '每秒发射的子弹数量。', tone: 'offense' },
  { key: 'pierce', label: '子弹穿透', value: totalPiercePreview.value, hint: '一颗子弹可额外穿过的敌人数量。', tone: 'offense' },
  { key: 'critRate', label: '暴击率', value: `${critRatePreview.value}%`, hint: '每次命中触发暴击的概率。', tone: 'offense' },
  { key: 'critDamage', label: '暴击伤害', value: `${Math.round(weapon.critDamage * 100)}%`, hint: '当前武器的暴击伤害倍率。', tone: 'offense' },
  { key: 'health', label: '生命', value: `${Math.ceil(player.hp)}/${player.maxHp}`, hint: '当前生命与最大生命。', tone: 'survival' },
  { key: 'defense', label: '独立防御', value: player.defense, hint: `独立承伤倍率 ${Math.round(defenseDamageMultiplier(player.defense) * 100)}%。`, tone: 'survival' },
  { key: 'armor', label: '玩家护甲', value: `${Math.ceil(player.armor)}/${player.maxArmor}`, hint: '受击时优先吸收伤害，Boss 伤害可穿透 20%。', tone: 'survival' },
  { key: 'reduction', label: '接触减伤', value: `${damageReductionPreview.value}%`, hint: '当前构筑提供的敌人接触伤害减免。', tone: 'survival' },
  { key: 'speed', label: '移动速度', value: moveSpeedPreview.value, hint: '角色每秒移动距离。', tone: 'mobility' },
  { key: 'pickup', label: '拾取范围', value: Math.round(modifiers.pickup), hint: '自动吸取金币和经验的半径。', tone: 'mobility' },
  { key: 'range', label: '武器射程', value: weapon.range, hint: '子弹的最大有效飞行距离。', tone: 'mobility' },
  { key: 'expGain', label: '经验获取', value: `${expGainBonusPreview.value >= 0 ? '+' : ''}${expGainBonusPreview.value}%`, hint: `当前经验收益倍率为 ${expGainPreview.value}%。`, tone: 'growth' },
  { key: 'luck', label: '幸运', value: player.luck, hint: '提高掉落概率并将品质权重推向高稀有度，上限 60。', tone: 'growth' }
])
const weaponOptions = computed(() => weaponCatalog.map((item) => ({ ...applyWeaponProgress(item, weaponProgress[item.key]), progress: weaponProgress[item.key], unlocked: player.level >= item.unlockLevel, equipped: item.key === selectedWeaponKey.value })))
const supportWeaponOptions = computed(() => weaponOptions.value.filter((item) => item.unlocked && item.key !== selectedWeaponKey.value).map((item) => ({ ...item, supportEquipped: item.key === selectedSupportWeaponKey.value })))
const supportWeapon = computed(() => {
  const definition = weaponCatalog.find((item) => item.key === selectedSupportWeaponKey.value)
  return definition ? applyWeaponProgress(definition, weaponProgress[definition.key]) : null
})
const currentWeaponProgress = computed(() => weaponProgress[selectedWeaponKey.value])
const currentWeaponUpgradeCost = computed(() => weaponUpgradeCost(currentWeaponProgress.value))
const currentWeaponStarCost = computed(() => weaponStarCost(currentWeaponProgress.value))
const talentPointsTotal = computed(() => talentPointBudget(player.level, highestCleared.value))
const talentPointsSpent = computed(() => Object.values(talentLevels).reduce((sum, level) => sum + level, 0))
const talentPointsAvailable = computed(() => Math.max(0, talentPointsTotal.value - talentPointsSpent.value))
const talentCards = computed(() => talentNodes.map((node) => ({ ...node, level: talentLevels[node.id], canUpgrade: talentPointsAvailable.value > 0 && canUpgradeTalent(node, talentLevels), requirementMet: !node.requires || talentLevels[node.requires.id] >= node.requires.level })))
const activeEquippedParts = computed(() => equippedParts.slice(0, weapon.slotCount))
const activeSpecialEffects = computed(() => new Set(activeEquippedParts.value.map((item) => item.specialEffectKey).filter(Boolean) as AttachmentSpecialEffectKey[]))
const setProgress = computed(() => summarizeSets(activeEquippedParts.value))
const activeEquipmentLabel = computed(() => `${activeEquippedParts.value.length} / ${weapon.slotCount}`)
const showMovementHint = computed(() => {
  void stageTimer.value
  return mode.value === 'battle' && (!hasMovedThisRun || movementIdleSeconds >= 3)
})
const completedDailyTasks = computed(() => dailyTasks.value.filter((task) => task.progress >= task.target).length)
const completedWeeklyTasks = computed(() => weeklyTasks.value.filter((task) => task.progress >= task.target).length)
const completedAchievements = computed(() => achievements.value.filter((task) => task.progress >= task.target).length)
const stageType = computed(() => operationMode.value === 'campaign' ? getStageTypeLabel(stage.value) : operationDefinition.value.label)
const nextEnemyPreview = computed(() => {
  const preview = getEnemyPreview(stage.value)
  if (operationMode.value === 'challenge') return { ...preview, label: '精英护卫与终波首领' }
  if (operationMode.value === 'survival') {
    const frontline = scaleEnemyStats(stage.value, 'grunt')
    return { ...preview, label: '连续混编部队', hp: Math.round(frontline.hp), damage: Math.round(frontline.damage), bossPhaseCount: 0 }
  }
  return preview
})
const inventoryCapacityLabel = computed(() => `${inventory.value.length} / ${BASE_INVENTORY_CAPACITY}`)
const inventoryNearCapacity = computed(() => inventory.value.length >= Math.floor(BASE_INVENTORY_CAPACITY * 0.8))
const inventoryOverCapacity = computed(() => inventory.value.length > BASE_INVENTORY_CAPACITY)
const favoriteAttachmentCount = computed(() => inventory.value.filter((item) => item.favorite).length)
const stageRewardPreview = computed(() => {
  const reward = rewardForStage(stage.value, targetKills.value)
  const multiplier = operationDefinition.value.rewardMultiplier
  return {
    ...reward,
    gold: Math.round(reward.gold * multiplier),
    alloy: Math.round(reward.alloy * multiplier),
    parts: Math.round(reward.parts * multiplier),
    exp: Math.round(reward.exp * multiplier)
  }
})
const dropProfile = computed(() => {
  const profile = getAttachmentDropProfile(stage.value)
  const raritySummary = attachmentRarities.filter((rarity) => profile.rarityWeights[rarity] > 0).join(' / ')
  return {
    ...profile,
    raritySummary,
    dropChance: Math.round(profile.dropChance * 100)
  }
})
const waveStatusText = computed(() => {
  void kills.value
  const wave = currentWaveDefinition.value
  if (operationMode.value === 'survival') return `${operationObjectiveText.value} · 当前压力 ${Math.min(currentWave.value, totalWaves.value)}/${totalWaves.value} · 场上 ${enemies.length}`
  if (!wave) return '区域已清空'
  if (waveTransitionPending.value) return `威胁已清除 · ${Math.max(0, waveTransitionSeconds.value).toFixed(1)} 秒后接敌`
  return `已投入 ${waveSpawnedCount.value} / ${wave.count} · 场上 ${enemies.length}`
})
const lastRunStrategyInsights = computed(() => {
  const stats = lastRun.value?.stats
  return stats ? buildStrategyInsights(stats.contribution, stats.loadoutBonuses) : []
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
    {} as Record<AttachmentSlot, Attachment[]>
  )
})
const inventoryByRarity = computed(() =>
  attachmentRarities.reduce(
    (counts, rarity) => {
      counts[rarity] = inventory.value.filter((item) => item.rarity === rarity).length
      return counts
    },
    {} as Record<AttachmentRarity, number>
  )
)
const equipmentSlotCards = computed(() =>
  attachmentSlots.map((slot, index) => ({
    slot,
    index,
    item: equippedParts.find((part) => part.slot === slot),
    active: activeEquippedParts.value.some((part) => part.slot === slot)
  }))
)
const equipmentLeftSlots = computed(() => equipmentSlotCards.value.slice(0, 4))
const equipmentRightSlots = computed(() => equipmentSlotCards.value.slice(4))
const filteredInventory = computed(() => {
  const bySlot = selectedSlot.value === '全部' ? inventory.value : inventoryBySlot.value[selectedSlot.value] ?? []
  return [...bySlot]
    .filter((item) => {
      if (selectedRarity.value !== '全部' && item.rarity !== selectedRarity.value) return false
      if (selectedBuildTag.value !== '全部' && !buildAttachmentTags(item).includes(selectedBuildTag.value)) return false
      if (selectedInventoryFilter.value === '收藏') return Boolean(item.favorite)
      if (selectedInventoryFilter.value === '推荐') return isRecommendedAttachment(item)
      if (selectedInventoryFilter.value === '可替换') return isReplaceableAttachment(item)
      if (selectedInventoryFilter.value === '低品质') return isLowQualityAttachment(item)
      return true
    })
    .sort(compareInventoryAttachments)
})
const saleItems = computed(() => inventory.value.filter((item) => !item.favorite && saleSelection.has(attachmentKey(item))))
const sellableFilteredInventory = computed(() => filteredInventory.value.filter((item) => !item.favorite))
const saleReward = computed(() => {
  return saleItems.value.reduce(
    (total, item) => {
      const reward = recycleAttachmentValue(item)
      total.gold += reward.gold
      total.parts += reward.parts
      return total
    },
    { gold: 0, parts: 0 }
  )
})
const allFilteredSelected = computed(() => Boolean(sellableFilteredInventory.value.length) && sellableFilteredInventory.value.every((item) => saleSelection.has(attachmentKey(item))))
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
const selectedAttachmentDimensions = computed<AttachmentDimension[]>(() => selectedAttachment.value ? buildAttachmentDimensions(currentAttachmentForSelected.value, selectedAttachment.value) : [])
const selectedAttachmentUpgradeCost = computed(() => (selectedAttachment.value ? attachmentUpgradeCost(selectedAttachment.value) : 0))
const selectedAttachmentReforgeCost = computed<AttachmentReforgeCost>(() => (selectedAttachment.value ? reforgeCostFor(selectedAttachment.value) : { parts: 0, gold: 0, alloy: 0 }))
const canUpgradeSelectedAttachment = computed(() => Boolean(selectedAttachment.value && mode.value !== 'battle' && resources.parts >= selectedAttachmentUpgradeCost.value && (selectedAttachment.value.level ?? 0) < attachmentMaxLevel(selectedAttachment.value)))
const canReforgeSelectedAttachment = computed(() => Boolean(selectedAttachment.value && mode.value !== 'battle' && (canAffordAttachmentReforge(resources, selectedAttachmentReforgeCost.value) || advancedResources.reforgeChips > 0)))
const selectedEquippedAttachment = computed(() => selectedAttachment.value && isAttachmentEquipped(selectedAttachment.value) ? selectedAttachment.value : null)
const postBattleChoices = computed<PostBattleChoice[]>(() => [
  {
    name: '修复生命',
    desc: '回复 45% 最大生命，适合直接连战。',
    disabled: postBattleChoiceTaken.value || player.hp >= player.maxHp,
    apply: () => {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.45))
      bannerText.value = '生命修复完成'
      saveGame()
    }
  },
  {
    name: '拆解零件',
    desc: '把 1 个零件转成 24 金币，方便整理背包资源。',
    disabled: postBattleChoiceTaken.value || resources.parts < 1,
    apply: () => {
      resources.parts -= 1
      resources.gold += 24
      bannerText.value = '零件已拆解'
      saveGame()
    }
  }
])

const canRedeemMythicShards = computed(() => mode.value !== 'battle' && highestCleared.value >= 7000 && dropPity.mythicShards >= 10)

function equipWeapon(next: WeaponDefinition) {
  if (mode.value === 'battle' || player.level < next.unlockLevel || next.key === selectedWeaponKey.value) return
  selectedWeaponKey.value = next.key
  if (selectedSupportWeaponKey.value === next.key) selectedSupportWeaponKey.value = null
  const progressed = applyWeaponProgress(next, weaponProgress[next.key])
  Object.assign(weapon, progressed)
  weaponAmmo.value = weapon.magazineSize
  weaponReloadTimer.value = 0
  weaponChargeTimer.value = 0
  weaponCharging.value = false
  applyBaseStats()
  bannerText.value = `主武器已切换为 ${next.name}`
  saveGame()
}

function upgradeCurrentWeapon() {
  if (mode.value === 'battle') return
  const progress = currentWeaponProgress.value
  const cost = currentWeaponUpgradeCost.value
  if (progress.level >= weapon.maxLevel || resources.gold < cost.gold || resources.parts < cost.parts) return
  resources.gold -= cost.gold
  resources.parts -= cost.parts
  progress.level += 1
  Object.assign(weapon, applyWeaponProgress(weaponCatalog.find((item) => item.key === selectedWeaponKey.value) ?? starterWeapon, progress))
  recordAllTaskEvents('upgrade')
  bannerText.value = `${weapon.name} 已强化至 Lv.${progress.level}`
  saveGame()
}

function starCurrentWeapon() {
  if (mode.value === 'battle') return
  const progress = currentWeaponProgress.value
  const cost = currentWeaponStarCost.value
  if (progress.stars >= weapon.maxStars || resources.alloy < cost.alloy || resources.parts < cost.parts) return
  resources.alloy -= cost.alloy
  resources.parts -= cost.parts
  progress.stars += 1
  Object.assign(weapon, applyWeaponProgress(weaponCatalog.find((item) => item.key === selectedWeaponKey.value) ?? starterWeapon, progress))
  recordAllTaskEvents('upgrade')
  bannerText.value = `${weapon.name} 已提升至 ${progress.stars} 星`
  saveGame()
}

function equipSupportWeapon(next: WeaponDefinition | null) {
  if (mode.value === 'battle') return
  if (next && (player.level < next.unlockLevel || next.key === selectedWeaponKey.value)) return
  selectedSupportWeaponKey.value = next?.key ?? null
  supportWeaponTimer = 0
  bannerText.value = next ? `支援武器已切换为 ${next.name}` : '支援武器已卸下'
  saveGame()
}

function breakthroughCurrentWeapon() {
  if (mode.value === 'battle' || !weaponCanBreakthrough(weapon, currentWeaponProgress.value)) return
  if (advancedResources.energyCores < weaponBreakthroughCost.energyCores || advancedResources.precision < weaponBreakthroughCost.precision) return
  advancedResources.energyCores -= weaponBreakthroughCost.energyCores
  advancedResources.precision -= weaponBreakthroughCost.precision
  weaponProgress[selectedWeaponKey.value] = breakthroughWeapon(currentWeaponProgress.value, gameplayRandom)
  Object.assign(weapon, applyWeaponProgress(weaponCatalog.find((item) => item.key === selectedWeaponKey.value) ?? starterWeapon, weaponProgress[selectedWeaponKey.value]))
  bannerText.value = `${weapon.name} 突破完成 · 第三词条已解锁`
  saveGame()
}

function reforgeCurrentWeapon() {
  if (mode.value === 'battle' || advancedResources.reforgeChips < weaponReforgeCost.reforgeChips) return
  advancedResources.reforgeChips -= weaponReforgeCost.reforgeChips
  weaponProgress[selectedWeaponKey.value] = reforgeWeapon(currentWeaponProgress.value, gameplayRandom)
  Object.assign(weapon, applyWeaponProgress(weaponCatalog.find((item) => item.key === selectedWeaponKey.value) ?? starterWeapon, weaponProgress[selectedWeaponKey.value]))
  bannerText.value = `${weapon.name} 随机词条已重铸`
  saveGame()
}

function openWeaponCrate() {
  if (mode.value === 'battle' || resources.gold < 600) return
  resources.gold -= 600
  const rolled = rollWeaponCrate(weaponCatalog.filter((item) => player.level >= item.unlockLevel), gameplayRandom)
  const progress = weaponProgress[rolled.key]
  progress.level = Math.min(rolled.maxLevel, progress.level + 5)
  if (rolled.key === selectedWeaponKey.value) Object.assign(weapon, applyWeaponProgress(rolled, progress))
  advancedResources.precision += 2
  bannerText.value = `武器箱开出 ${rolled.name} · 强化等级 +5 / 精密件 +2`
  saveGame()
}

function upgradeTalent(id: TalentNodeId) {
  const node = talentNodes.find((item) => item.id === id)
  if (!node || talentPointsAvailable.value <= 0 || !canUpgradeTalent(node, talentLevels) || mode.value === 'battle') return
  talentLevels[id] += 1
  applyBaseStats()
  bannerText.value = `${node.branch}天赋「${node.name}」提升至 ${talentLevels[id]} 级`
  saveGame()
}

function claimOfflineReward() {
  const reward = pendingOfflineReward.value
  if (!reward || reward.cappedSeconds < 60) return
  resources.gold += reward.gold
  resources.alloy += reward.alloy
  resources.parts += reward.parts
  grantExp(reward.exp)
  pendingOfflineReward.value = null
  lastSeenAt.value = Date.now()
  bannerText.value = `离线收益已领取：金币 +${reward.gold} / 经验 +${reward.exp}`
  saveGame()
}

function claimTask(task: GameTask) {
  const source = task.period === 'daily' ? dailyTasks.value : task.period === 'weekly' ? weeklyTasks.value : achievements.value
  const current = source.find((item) => item.id === task.id)
  if (!current || current.claimed || current.progress < current.target) return
  current.claimed = true
  resources.gold += current.reward.gold
  resources.alloy += current.reward.alloy
  resources.parts += current.reward.parts
  bannerText.value = `任务完成：${current.label}`
  saveGame()
}

function redeemMythicShards() {
  if (!canRedeemMythicShards.value) return
  dropPity.mythicShards -= 10
  const [item] = grantAttachmentDrops(1, { 普通: 0, 精良: 0, 稀有: 0, 史诗: 0, 传说: 0, 神话: 1 }, '神话')
  bannerText.value = item ? `神话碎片已兑换：${item.name}` : '神话碎片兑换完成'
  saveGame()
}

const claimDailyTask = claimTask

function recordAllTaskEvents(event: GameTask['event'], amount = 1) {
  recordTaskEvent(dailyTasks.value, event, amount)
  recordTaskEvent(weeklyTasks.value, event, amount)
  recordTaskEvent(achievements.value, event, amount)
}

function getAttachmentDropProfile(level: number) {
  if (level >= 7001) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 0, 精良: 0, 稀有: 5, 史诗: 35, 传说: 45, 神话: 15 } satisfies Record<AttachmentRarity, number>
    }
  }
  if (level >= 3001) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 0, 精良: 5, 稀有: 20, 史诗: 55, 传说: 20, 神话: 0 } satisfies Record<AttachmentRarity, number>
    }
  }
  if (level % 10 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 0, 精良: 22, 稀有: 58, 史诗: 20, 传说: 0, 神话: 0 } satisfies Record<AttachmentRarity, number>
    }
  }
  if (level % 5 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 8, 精良: 42, 稀有: 45, 史诗: 5, 传说: 0, 神话: 0 } satisfies Record<AttachmentRarity, number>
    }
  }
  return {
    dropChance: 0.38,
    rarityWeights: { 普通: 25, 精良: 45, 稀有: 30, 史诗: 0, 传说: 0, 神话: 0 } satisfies Record<AttachmentRarity, number>
  }
}

function rollWeightedRarity(weights: Record<AttachmentRarity, number>) {
  const shift = luckRarityShift(player.luck)
  const adjusted = Object.fromEntries(attachmentRarities.map((rarity, index) => [rarity, weights[rarity] * Math.max(0.15, 1 + shift * (index - 2))])) as Record<AttachmentRarity, number>
  const total = attachmentRarities.reduce((sum, rarity) => sum + adjusted[rarity], 0)
  let cursor = gameplayRandom() * total
  for (const rarity of attachmentRarities) {
    cursor -= adjusted[rarity]
    if (cursor <= 0) return rarity
  }
  return attachmentRarities[attachmentRarities.length - 1]
}

function attachmentKey(item: Attachment) {
  return item.id ?? `${item.templateKey ?? item.name}:${item.name}`
}

function sameAttachment(a: Attachment, b: Attachment) {
  return attachmentKey(a) === attachmentKey(b)
}

function nextAttachmentId(source: string) {
  attachmentInstanceCursor += 1
  const timeToken = replayRuntime.running ? `r3-${replayRuntime.plan[replayRuntime.planIndex]?.seed ?? 0}` : Date.now().toString(36)
  return `${source}-${timeToken}-${attachmentInstanceCursor.toString(36)}`
}

function createAttachmentInstance(template: Attachment, source: string, rarity = template.rarity, fixedRoll?: number): Attachment {
  const roll = fixedRoll ?? Math.round((0.82 + gameplayRandom() * 0.36) * 100) / 100
  const mainAffix = createMainAffix(template, rarity, roll)
  const subAffixes = rollSubAffixes(rarity, mainAffix.key, source === 'starter' ? () => 0.5 : gameplayRandom)
  const bonuses = combineAffixBonuses(mainAffix, subAffixes)
  const id = template.id ?? nextAttachmentId(source)
  const suffix = source === 'starter' ? '' : ` #${attachmentInstanceCursor.toString().padStart(3, '0')}`
  return {
    ...template,
    id,
    templateKey: template.templateKey ?? template.name,
    roll,
    level: 0,
    mainAffix,
    subAffixes,
    rarity,
    name: source === 'starter' ? template.name : `${template.name}${suffix}`,
    bonuses,
    effect: formatAttachmentEffect(bonuses)
  }
}

function reviveAttachment(saved: string | Attachment | undefined, source: string) {
  if (!saved) return undefined
  if (typeof saved === 'string') {
    const template = attachmentByName.get(saved === '吸血模块' ? '生命模块' : saved)
    return template ? createAttachmentInstance(template, source, template.rarity, 1) : undefined
  }
  const migrated = migrateAttachmentIdentity(saved)
  if (!migrated.name && !migrated.templateKey) return undefined
  const template = attachmentByName.get(migrated.templateKey ?? migrated.name)
  const base = template ?? migrated
  const revived = {
    ...base,
    ...migrated,
    id: migrated.id ?? nextAttachmentId(source),
    templateKey: migrated.templateKey ?? base.templateKey ?? base.name
  }
  const mainAffix = revived.mainAffix ?? createLegacyMainAffix(revived)
  const migrateStarterAffixes = String(revived.id ?? '').startsWith('starter-') && (revived.subAffixes?.length ?? 0) === 0
  const subAffixes = migrateStarterAffixes ? rollSubAffixes(revived.rarity, mainAffix.key, () => 0.5) : revived.subAffixes ?? []
  const bonuses = combineAffixBonuses(mainAffix, subAffixes)
  return {
    ...revived,
    level: migrated.level ?? 0,
    mainAffix,
    subAffixes,
    bonuses,
    effect: formatAttachmentEffect(bonuses)
  }
}

const attachmentIconIndex: Record<string, number> = {
  聚束枪口: 0,
  快速弹匣: 1,
  穿甲枪管: 2,
  训练芯片: 3,
  燃烧弹芯: 4,
  吸血模块: 5,
  生命模块: 5,
  红点瞄具: 6,
  稳定枪托: 7,
  回收磁环: 8,
  军规模块: 9,
  重型枪托: 10,
  高压弹头: 11,
  贯通线圈: 12,
  战术记录仪: 13
}

function createLegacyMainAffix(item: Attachment) {
  const entry = (Object.entries(item.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>)[0]
  return createAffix(entry?.[0] ?? 'damage', entry?.[1] ?? 0.04, '主词条')
}

function iconSheetStyle(url: string, index: number, columns: number, rows: number) {
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${col * (100 / Math.max(1, columns - 1))}% ${row * (100 / Math.max(1, rows - 1))}%`
  }
}

function equipmentIconStyle(item: Attachment | undefined, fallbackSlotIndex: number) {
  const templateName = item?.templateKey ?? item?.name
  const itemIconIndex = templateName ? attachmentIconIndex[templateName] : undefined
  return itemIconIndex === undefined ? iconSheetStyle(equipmentIconsSheetUrl, fallbackSlotIndex, 4, 2) : iconSheetStyle(attachmentIconsSheetUrl, itemIconIndex, 4, 4)
}

function formatRoll(roll?: number) {
  return `${Math.round((roll ?? 1) * 100)}%`
}

function attachmentInstanceLabel(item: Attachment) {
  return (item.id ?? attachmentKey(item)).split('-').slice(-2).join('-').toUpperCase()
}

equippedParts.splice(0, equippedParts.length, ...starterAttachments.map((item) => createAttachmentInstance(item, 'starter', item.rarity, 1)))

function attachmentDecisionFor(item: Attachment) {
  return buildAttachmentDecision(currentAttachmentFor(item), item)
}

function attachmentDimensionsFor(item: Attachment) {
  return buildAttachmentDimensions(currentAttachmentFor(item), item)
}

function hasSpecialEffect(key: AttachmentSpecialEffectKey) {
  return activeSpecialEffects.value.has(key)
}

function isAttachmentActive(item: Attachment) {
  return activeEquippedParts.value.some((part) => sameAttachment(part, item))
}

function canEquipAttachment(item: Attachment) {
  return Boolean(currentAttachmentFor(item) || equippedParts.length < weapon.slotCount)
}

function currentAttachmentFor(item: Attachment) {
  return equippedParts.find((part) => part.slot === item.slot)
}

function attachmentComparisonFor(item: Attachment) {
  return buildAttachmentComparison(currentAttachmentFor(item), item)
}

function isAttachmentInInventory(item: Attachment) {
  return inventory.value.some((part) => sameAttachment(part, item))
}

function isAttachmentEquipped(item: Attachment) {
  return equippedParts.some((part) => sameAttachment(part, item))
}

function isAttachmentAutoRecycled(item: Attachment) {
  return Boolean(overflowSalvageNotice.value?.items.some((part) => sameAttachment(part, item)))
}

function settlementLootLabel(item: Attachment) {
  if (isAttachmentInInventory(item)) return attachmentDecisionFor(item).actionLabel
  if (isAttachmentEquipped(item)) return '已装备'
  if (isAttachmentAutoRecycled(item)) return '已回收'
  return '已处理'
}

function settlementLootTone(item: Attachment) {
  if (isAttachmentInInventory(item)) return `tone-${attachmentDecisionFor(item).tone}`
  return isAttachmentEquipped(item) ? 'tone-survival' : 'tone-downgrade'
}

function settlementLootStatus(item: Attachment) {
  if (isAttachmentInInventory(item)) return '保留到背包'
  if (isAttachmentEquipped(item)) return '已装备'
  if (isAttachmentAutoRecycled(item)) return '已自动回收'
  return '已处理'
}

function formatEnemyKinds(kinds: string[]) {
  return kinds.map((kind) => enemyKindLabels[kind as EnemyKind] ?? kind).join(' / ')
}

function slotRank(item: Attachment) {
  return attachmentSlots.indexOf(item.slot)
}

function attachmentOrder(item: Attachment) {
  return attachmentAcquireOrder[attachmentKey(item)] ?? 0
}

function compareInventoryAttachments(a: Attachment, b: Attachment) {
  if (selectedInventorySort.value === '槽位整理') {
    return slotRank(a) - slotRank(b) || attachmentRarityRank(b) - attachmentRarityRank(a) || attachmentOrder(b) - attachmentOrder(a)
  }
  if (selectedInventorySort.value === '品质优先') {
    return attachmentRarityRank(b) - attachmentRarityRank(a) || slotRank(a) - slotRank(b) || attachmentOrder(b) - attachmentOrder(a)
  }
  return attachmentOrder(b) - attachmentOrder(a) || attachmentRarityRank(b) - attachmentRarityRank(a) || slotRank(a) - slotRank(b)
}

function isRecommendedAttachment(item: Attachment) {
  return attachmentDecisionFor(item).actionLabel === '推荐装备'
}

function isReplaceableAttachment(item: Attachment) {
  return attachmentDecisionFor(item).tone !== 'downgrade'
}

function isLowQualityAttachment(item: Attachment) {
  const current = currentAttachmentFor(item)
  const currentRank = current ? attachmentRarityRank(current) : -1
  return attachmentRarityRank(item) <= attachmentRarities.indexOf('精良') || attachmentRarityRank(item) < currentRank || attachmentDecisionFor(item).tone === 'downgrade'
}

function recycleAttachmentValue(item: Attachment) {
  return getAttachmentRecycleValue(item)
}

function markAttachmentAcquired(item: Attachment) {
  attachmentAcquireCursor += 1
  attachmentAcquireOrder[attachmentKey(item)] = attachmentAcquireCursor
}

function ensureAttachmentOrder(item: Attachment, fallback = 0) {
  const key = attachmentKey(item)
  if (attachmentAcquireOrder[key] === undefined) {
    attachmentAcquireOrder[key] = fallback
  }
  attachmentAcquireCursor = Math.max(attachmentAcquireCursor, attachmentAcquireOrder[key] ?? 0)
}

function isSaleSelected(item: Attachment) {
  return saleSelection.has(attachmentKey(item))
}

function lockedAffixFor(item: Attachment) {
  const lock = lockedReforgeAffix.value
  if (!lock || lock.attachmentKey !== attachmentKey(item)) return undefined
  return item.subAffixes?.find((affix) => affix.key === lock.affixKey)
}

function isReforgeAffixLocked(item: Attachment, affix: AttachmentAffix) {
  return lockedAffixFor(item)?.key === affix.key
}

function toggleReforgeAffixLock(item: Attachment, affix: AttachmentAffix) {
  if (mode.value === 'battle' || (!isAttachmentInInventory(item) && !isAttachmentEquipped(item))) return
  selectAttachment(item)
  if (isReforgeAffixLocked(item, affix)) lockedReforgeAffix.value = null
  else lockedReforgeAffix.value = { attachmentKey: attachmentKey(item), affixKey: affix.key }
}

function toggleAttachmentFavorite(item: Attachment) {
  if (mode.value === 'battle' || !isAttachmentInInventory(item)) return
  item.favorite = !item.favorite
  if (item.favorite) saleSelection.delete(attachmentKey(item))
  if (!item.favorite && inventoryOverCapacity.value) applyInventoryCapacity()
  else bannerText.value = item.favorite ? `${item.name} 已加入收藏保护` : `${item.name} 已取消收藏保护`
  saveGame()
}

function toggleSaleMode() {
  if (mode.value === 'battle' || !inventory.value.length) return
  isSaleMode.value = !isSaleMode.value
  clearSaleSelection()
}

function clearSaleSelection() {
  saleSelection.clear()
}

function toggleSaleSelection(item: Attachment) {
  if (!isSaleMode.value || mode.value === 'battle' || item.favorite || !isAttachmentInInventory(item)) return
  const key = attachmentKey(item)
  if (saleSelection.has(key)) saleSelection.delete(key)
  else saleSelection.add(key)
}

function toggleFilteredSaleSelection() {
  if (!isSaleMode.value || mode.value === 'battle') return
  if (allFilteredSelected.value) {
    sellableFilteredInventory.value.forEach((item) => saleSelection.delete(attachmentKey(item)))
  } else {
    sellableFilteredInventory.value.forEach((item) => saleSelection.add(attachmentKey(item)))
  }
}

function handleInventoryItemClick(item: Attachment) {
  if (isSaleMode.value) toggleSaleSelection(item)
  else selectAttachment(item)
}

function sellSelectedAttachments() {
  if (!isSaleMode.value || mode.value === 'battle' || !saleItems.value.length) return
  const soldItems = saleItems.value.filter((item) => !item.favorite)
  if (!soldItems.length) return
  const soldKeys = new Set(soldItems.map(attachmentKey))
  const reward = { ...saleReward.value }
  inventory.value = inventory.value.filter((item) => !soldKeys.has(attachmentKey(item)))
  soldKeys.forEach((key) => {
    saleSelection.delete(key)
    delete attachmentAcquireOrder[key]
  })
  resources.gold += reward.gold
  resources.parts += reward.parts
  if (!filteredInventory.value.length && inventory.value.length) {
    selectedInventoryFilter.value = '全部'
    selectedSlot.value = '全部'
    selectedRarity.value = '全部'
  }
  if (selectedAttachment.value && soldKeys.has(attachmentKey(selectedAttachment.value))) {
    selectedAttachment.value = filteredInventory.value[0] ?? inventory.value[0] ?? null
  }
  if (lockedReforgeAffix.value && soldKeys.has(lockedReforgeAffix.value.attachmentKey)) lockedReforgeAffix.value = null
  isSaleMode.value = false
  bannerText.value = `出售 ${soldItems.length} 件配件，获得 ${reward.gold} 金币 / ${reward.parts} 零件`
  saveGame()
}

function reforgeCostFor(item: Attachment) {
  return getAttachmentReforgeCost(item, Boolean(lockedAffixFor(item)))
}

function formatReforgeCost(item: Attachment) {
  const cost = reforgeCostFor(item)
  return `${cost.parts}零件 · ${cost.gold}金币${cost.alloy ? ` · ${cost.alloy}合金` : ''}，或 1 芯片`
}

function reforgeShortageText(item: Attachment) {
  const cost = reforgeCostFor(item)
  const shortages: string[] = []
  if (resources.parts < cost.parts) shortages.push(`零件差 ${cost.parts - resources.parts}`)
  if (resources.gold < cost.gold) shortages.push(`金币差 ${cost.gold - resources.gold}`)
  if (resources.alloy < cost.alloy) shortages.push(`合金差 ${cost.alloy - resources.alloy}`)
  if (shortages.length && advancedResources.reforgeChips > 0) return '可消耗 1 枚重铸芯片替代全部材料'
  return shortages.length ? `无法重铸：${shortages.join('，')}` : ''
}

function rebuildAttachmentBonuses(item: Attachment) {
  item.bonuses = combineAffixBonuses(item.mainAffix, item.subAffixes)
  item.effect = formatAttachmentEffect(item.bonuses)
}

function upgradeSelectedAttachment() {
  const item = selectedAttachment.value
  if (!item || !canUpgradeSelectedAttachment.value || !item.mainAffix) return
  resources.parts -= selectedAttachmentUpgradeCost.value
  item.level = (item.level ?? 0) + 1
  item.mainAffix.value = normalizeBonus(item.mainAffix.key, item.mainAffix.value * 1.08)
  rebuildAttachmentBonuses(item)
  applyBaseStats()
  recordAllTaskEvents('upgrade')
  bannerText.value = `${item.name} 强化至 +${item.level}`
  saveGame()
}

function reforgeSelectedAttachment() {
  const item = selectedAttachment.value
  if (!item || !canReforgeSelectedAttachment.value || !item.mainAffix) return
  const cost = selectedAttachmentReforgeCost.value
  const lockedAffix = lockedAffixFor(item)
  const useChip = !canAffordAttachmentReforge(resources, cost) && advancedResources.reforgeChips > 0
  if (useChip) advancedResources.reforgeChips -= 1
  else {
    resources.parts -= cost.parts
    resources.gold -= cost.gold
    resources.alloy -= cost.alloy
  }
  item.subAffixes = rollSubAffixes(item.rarity, item.mainAffix.key, gameplayRandom, lockedAffix)
  rebuildAttachmentBonuses(item)
  applyBaseStats()
  recordAllTaskEvents('reforge')
  bannerText.value = useChip ? `${item.name} 已使用 1 枚重铸芯片` : lockedAffix ? `${item.name} 已保留「${lockedAffix.label}」并完成重铸` : `${item.name} 副词条已重铸`
  saveGame()
}

function canStarAttachment(item: Attachment) {
  const cost = attachmentStarCost(item)
  return mode.value !== 'battle' && attachmentCanStar(item) && resources.gold >= cost.gold && advancedResources.precision >= cost.precision
}

function starAttachment(item: Attachment) {
  if (!canStarAttachment(item)) return
  const cost = attachmentStarCost(item)
  resources.gold -= cost.gold
  advancedResources.precision -= cost.precision
  item.stars = (item.stars ?? 0) + 1
  applyBaseStats()
  bannerText.value = `${item.name} 升至 ${item.stars} 星`
  saveGame()
}

function canBreakthroughAttachment(item: Attachment) {
  const cost = attachmentBreakthroughCost(item)
  return mode.value !== 'battle' && attachmentCanBreakthrough(item, attachmentMaxLevel(item)) && advancedResources.precision >= cost.precision && advancedResources.energyCores >= cost.energyCores
}

function breakthroughAttachment(item: Attachment) {
  if (!canBreakthroughAttachment(item)) return
  const cost = attachmentBreakthroughCost(item)
  advancedResources.precision -= cost.precision
  advancedResources.energyCores -= cost.energyCores
  item.breakthrough = true
  applyBaseStats()
  bannerText.value = `${item.name} 已完成突破`
  saveGame()
}

function upgradeSkill(key: SkillKey) {
  const level = skillProgress[key]
  const cost = skillUpgradeCost(level)
  if (level >= 5 || resources.gold < cost.gold || advancedResources.precision < cost.precision) return
  resources.gold -= cost.gold
  advancedResources.precision -= cost.precision
  skillProgress[key] += 1
  bannerText.value = `${skills.find((skill) => skill.key === key)?.name ?? '技能'} 升至 ${skillProgress[key]} 级`
  saveGame()
}

function buyShopOffer(id: ShopOfferId) {
  const offer = shopOffers.find((item) => item.id === id)
  if (!offer || shopState.stock[id] <= 0 || resources.gold < offer.cost.gold || advancedResources.honor < offer.cost.honor) return
  resources.gold -= offer.cost.gold
  advancedResources.honor -= offer.cost.honor
  advancedResources.precision += offer.grant.precision
  advancedResources.reforgeChips += offer.grant.reforgeChips
  shopState.stock[id] -= 1
  if (id === 'attachment-crate') grantAttachmentDrops(1, { 普通: 0, 精良: 0, 稀有: 0, 史诗: 0.65, 传说: 0.3, 神话: 0.05 }, '史诗')
  bannerText.value = `${offer.label} 已购入`
  saveGame()
}

function commitStageDraft() {
  stage.value = clamp(Math.round(Number(stageDraft.value) || 1), 1, maxSelectableStage.value)
  stageDraft.value = stage.value
  saveGame()
}

function adjustStage(amount: number) {
  stageDraft.value = clamp(stage.value + amount, 1, maxSelectableStage.value)
  commitStageDraft()
}

function selectOperation(operation: OperationMode) {
  if (mode.value !== 'base' || (!debugStageSelection && !operationUnlocked(operation, highestCleared.value))) return
  selectedOperationMode.value = operation
  bannerText.value = `${getOperationDefinition(operation).label}已就绪`
}

function getEquippedBonuses(): EquippedBonusTotals {
  return activeEquippedParts.value.reduce(
    (total, part) => {
      const growth = 1 + (part.stars ?? 0) * 0.08 + (part.breakthrough ? 0.12 : 0)
      return {
        damage: total.damage + (part.bonuses?.damage ?? 0) * growth,
        fireRate: total.fireRate + (part.bonuses?.fireRate ?? 0) * growth,
        maxHp: total.maxHp + (part.bonuses?.maxHp ?? 0) * growth,
        pickup: total.pickup + (part.bonuses?.pickup ?? 0) * growth,
        speed: total.speed + (part.bonuses?.speed ?? 0) * growth,
        pierce: total.pierce + (part.bonuses?.pierce ?? 0) * growth,
        expGain: total.expGain + (part.bonuses?.expGain ?? 0) * growth,
        critRate: total.critRate + (part.bonuses?.critRate ?? 0) * growth
      }
    },
    { damage: 0, fireRate: 0, maxHp: 0, pickup: 0, speed: 0, pierce: 0, expGain: 0, critRate: 0 }
  )
}

function applyBaseStats() {
  const gear = getEquippedBonuses()
  const talents = talentBonuses(talentLevels)
  const sets = combinedSetBonuses(activeEquippedParts.value, hasSpecialEffect('dominant-set'))
  const campaignGrowth = r5CampaignGrowthForHighestCleared(highestCleared.value)
  player.maxHp = 120 + (player.level - 1) * 12 + gear.maxHp + talents.maxHp + sets.maxHp + campaignGrowth.maxHpBonus
  player.hp = Math.min(player.maxHp, player.hp)
  player.defense = Math.floor((player.level - 1) * 0.8 + talents.damageReduction * 120 + activeEquippedParts.value.length * 2)
  player.maxArmor = Math.round(player.maxHp * 0.25 + player.defense * 2)
  player.armor = Math.min(player.maxArmor, player.armor)
  player.luck = Math.min(60, Math.floor(player.level / 10 + talents.dropRate * 100 + gear.expGain * 10))
  modifiers.damage = (1 + gear.damage + talents.damage + sets.damage) * campaignGrowth.damageMultiplier
  modifiers.fireRate = 1 + gear.fireRate + talents.fireRate + sets.fireRate
  modifiers.speed = 1 + gear.speed + talents.speed
  modifiers.pickup = 70 + gear.pickup + talents.pickup
  modifiers.pierceBonus = gear.pierce + talents.pierce + sets.pierce
  modifiers.expGain = 1 + gear.expGain + talents.expGain
  modifiers.critRate = Math.min(0.75, gear.critRate + talents.critRate)
  modifiers.statusPower = 1 + talents.statusPower + sets.statusPower
  modifiers.statusChance = talents.statusChance
  modifiers.shockChance = sets.shockChance
  modifiers.statusDuration = 1 + talents.statusDuration
  modifiers.goldGain = 1 + talents.goldGain + sets.goldGain + (hasSpecialEffect('gold-conversion') ? 0.15 : 0)
  modifiers.offlineGain = 1 + talents.offlineGain
  modifiers.offlineCapHours = 8 + talents.offlineCapHours
  modifiers.dropRate = talents.dropRate
  modifiers.damageReduction = Math.min(0.7, talents.damageReduction)
  modifiers.healthRegen = talents.healthRegen
  modifiers.lifesteal = talents.lifesteal + sets.lifesteal
  modifiers.dodge = Math.min(0.65, talents.dodge)
  modifiers.cooldownReduction = Math.min(0.6, talents.cooldownReduction)
  modifiers.eliteDamage = sets.eliteDamage
  modifiers.extraChains = sets.extraChains
  modifiers.noPierceFalloff = sets.noPierceFalloff || hasSpecialEffect('no-pierce-falloff')
  modifiers.burnExplosion = sets.burnExplosion
  modifiers.lowHealthLifesteal = sets.lowHealthLifesteal
  modifiers.doubleRewardChance = sets.doubleRewardChance
  modifiers.eliteKillBuff = sets.eliteKillBuff
  modifiers.fireDamage = sets.fireDamage
  modifiers.voidAmmo = hasSpecialEffect('void-ammo')
  modifiers.phaseDodge = hasSpecialEffect('phase-dodge')
  modifiers.fortress = hasSpecialEffect('fortress')
  modifiers.statusSpread = hasSpecialEffect('status-spread')
  modifiers.stormImpact = hasSpecialEffect('storm-impact')
  modifiers.quantumMagazine = hasSpecialEffect('quantum-magazine')
  modifiers.goldConversion = hasSpecialEffect('gold-conversion')
  modifiers.lastStand = hasSpecialEffect('last-stand')
  modifiers.blackHole = hasSpecialEffect('black-hole')
  modifiers.threatTargeting = hasSpecialEffect('threat-targeting')
  modifiers.eliteOverdrive = hasSpecialEffect('elite-overdrive')
}

function buildSavePayload(): SaveData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    stage: stage.value,
    highestCleared: highestCleared.value,
    resources: { ...resources },
    base: { ...base },
    player: { level: player.level, exp: player.exp, hp: player.hp, armor: player.armor },
    equipped: equippedParts.map((item) => ({ ...item })),
    inventory: inventory.value.map((item) => ({ ...item })),
    acquireOrder: { ...attachmentAcquireOrder },
    selectedWeaponKey: selectedWeaponKey.value,
    selectedSupportWeaponKey: selectedSupportWeaponKey.value,
    weaponProgress: Object.fromEntries(Object.entries(weaponProgress).map(([key, value]) => [key, { ...value, affixes: value.affixes.map((affix) => ({ ...affix })) }])),
    talents: { ...talentLevels },
    daily: { key: dailyKey.value, tasks: dailyTasks.value.map((task) => ({ ...task, reward: { ...task.reward } })) },
    weekly: { key: weeklyKey.value, tasks: weeklyTasks.value.map((task) => ({ ...task, reward: { ...task.reward } })) },
    achievements: achievements.value.map((task) => ({ ...task, reward: { ...task.reward } })),
    dropPity: { ...dropPity },
    advancedResources: { ...advancedResources },
    skillProgress: { ...skillProgress },
    shop: { stock: { ...shopState.stock } },
    season: { ...seasonState },
    lastSeenAt: Date.now(),
    savedAt: Date.now()
  }
}

function saveGame() {
  if (!canPersist || replayPersistenceSuppressed) return
  const payload = buildSavePayload()
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  cloud.queueSync(payload)
}

function applySaveData(saved: Partial<SaveData>) {
  const restoredProgression = restoreProgression(saved, debugStageSelection)
  highestCleared.value = restoredProgression.highestCleared
  stage.value = restoredProgression.stage
  stageDraft.value = stage.value
  Object.assign(resources, { gold: saved.resources?.gold ?? 80, alloy: saved.resources?.alloy ?? 3, parts: saved.resources?.parts ?? 0 })
  Object.assign(base, emptyLegacyBase())
  player.level = Math.max(1, Number(saved.player?.level) || 1)
  player.exp = Math.max(0, Number(saved.player?.exp) || 0)
  player.hp = Math.max(1, Number(saved.player?.hp) || player.hp)
  player.armor = Math.max(0, Number(saved.player?.armor) || 0)
  Object.assign(weaponProgress, normalizeWeaponProgress(saved.weaponProgress))
  Object.assign(talentLevels, normalizeTalentLevels(saved.talents))
  const savedWeapon = weaponCatalog.find((item) => item.key === saved.selectedWeaponKey && player.level >= item.unlockLevel) ?? starterWeapon
  selectedWeaponKey.value = savedWeapon.key
  const savedSupport = weaponCatalog.find((item) => item.key === saved.selectedSupportWeaponKey && item.key !== savedWeapon.key && player.level >= item.unlockLevel)
  selectedSupportWeaponKey.value = savedSupport?.key ?? null
  Object.assign(weapon, applyWeaponProgress(savedWeapon, weaponProgress[savedWeapon.key]))
  weaponAmmo.value = weapon.magazineSize
  weaponReloadTimer.value = 0
  weaponChargeTimer.value = 0
  weaponCharging.value = false
  const today = dailyTaskKey()
  dailyKey.value = today
  dailyTasks.value = saved.daily?.key === today ? normalizeDailyTasks(saved.daily.tasks) : createDailyTasks()
  const thisWeek = weeklyTaskKey()
  weeklyKey.value = thisWeek
  weeklyTasks.value = saved.weekly?.key === thisWeek ? normalizeWeeklyTasks(saved.weekly.tasks) : createWeeklyTasks()
  achievements.value = normalizeAchievements(saved.achievements)
  Object.assign(dropPity, normalizeDropPity(saved.dropPity))
  Object.assign(advancedResources, normalizeAdvancedResources(saved.advancedResources))
  Object.assign(skillProgress, normalizeSkillProgress(saved.skillProgress))
  Object.assign(shopState, normalizeShopState(saved.shop))
  Object.assign(seasonState, normalizeSeasonState(saved.season))
  if (!replayRuntime.running && saved.lastSeenAt) {
    const bonuses = talentBonuses(talentLevels)
    const reward = calculateOfflineReward(saved.lastSeenAt, Date.now(), highestCleared.value, 1 + bonuses.offlineGain, 8 + bonuses.offlineCapHours)
    pendingOfflineReward.value = reward.cappedSeconds >= 60 ? reward : null
  }
  lastSeenAt.value = Date.now()
  const savedEquipped = (saved.equipped ?? starterAttachments.map((item) => createAttachmentInstance(item, 'starter', item.rarity, 1))).map((item) => reviveAttachment(item, 'equipped')).filter(Boolean) as Attachment[]
  const savedInventoryNames = saved.inventory ?? []
  const savedInventory = savedInventoryNames.map((item) => reviveAttachment(item, 'inventory')).filter(Boolean) as Attachment[]
  equippedParts.splice(0, equippedParts.length, ...savedEquipped)
  inventory.value = savedInventory
  Object.keys(attachmentAcquireOrder).forEach((name) => delete attachmentAcquireOrder[name])
  inventory.value.forEach((item, index) => ensureAttachmentOrder(item, saved.acquireOrder?.[attachmentKey(item)] ?? saved.acquireOrder?.[item.name] ?? inventory.value.length - index))
  applyInventoryCapacity()
  selectedSlot.value = '全部'
  selectedRarity.value = '全部'
  selectedBuildTag.value = '全部'
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return
  try {
    applySaveData(JSON.parse(raw) as Partial<SaveData>)
  } catch {
    localStorage.removeItem(SAVE_KEY)
  }
}

const cloud = useCloudSave<SaveData>({
  getLocal: buildSavePayload,
  applyRemote: (payload) => {
    applySaveData(payload)
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
    applyBaseStats()
  }
})
const cloudSyncState = cloud.state
const cloudUsername = cloud.username
const cloudPassword = cloud.password
const cloudHasSession = cloud.hasSession
const cloudConflict = cloud.conflict
const cloudLogin = cloud.login
const cloudRegister = cloud.register
const cloudLogout = cloud.logout
const syncCloudSave = cloud.pullAndMerge
const keepLocalCloudSave = cloud.keepLocalVersion
const useRemoteCloudSave = cloud.useCloudVersion
const onlineLiveOps = ref<null | {
  serverNow: string
  season: { id: string; index: number; startsAt: string; endsAt: string }
  activity: { id: string; label: string; operation: string; bonus: string; startsAt: string; endsAt: string }
  nextActivity: { id: string; label: string; operation: string; bonus: string; startsAt: string }
}>(null)
const leaderboardMetric = ref<LeaderboardMetric>('event-score')
const onlineLeaderboard = ref<Array<{ username: string; score: number; rank: number; currentUser: boolean }>>([])
const onlineCurrentRank = ref<number | null>(null)
const onlineSeasonStatus = reactive({ loading: false, label: '尚未同步联网赛季', error: '' })

async function refreshLiveOps() {
  try {
    onlineLiveOps.value = await cloud.apiRequest('/api/live-ops')
  } catch (error) {
    onlineSeasonStatus.error = error instanceof Error ? error.message : '活动日历读取失败'
  }
}

async function refreshLeaderboard(metric: LeaderboardMetric = leaderboardMetric.value) {
  leaderboardMetric.value = metric
  if (!cloudHasSession.value) {
    onlineSeasonStatus.label = '登录云存档账号后可查看联网排行'
    return
  }
  onlineSeasonStatus.loading = true
  onlineSeasonStatus.error = ''
  try {
    const result = await cloud.apiRequest<{ entries: Array<{ username: string; score: number; rank: number; currentUser: boolean }>; currentRank: number | null }>(`/api/leaderboard?metric=${encodeURIComponent(metric)}`)
    onlineLeaderboard.value = result.entries
    onlineCurrentRank.value = result.currentRank
    onlineSeasonStatus.label = result.currentRank ? `当前全服排名 #${result.currentRank}` : '本赛季尚未上榜'
  } catch (error) {
    onlineSeasonStatus.error = error instanceof Error ? error.message : '排行榜读取失败'
  } finally {
    onlineSeasonStatus.loading = false
  }
}

async function syncOnlineSeason() {
  if (!cloudHasSession.value) {
    onlineSeasonStatus.label = '请先登录云存档账号'
    return
  }
  onlineSeasonStatus.loading = true
  onlineSeasonStatus.error = ''
  try {
    await cloud.push(buildSavePayload())
    if (cloudConflict.value) throw new Error('云存档存在版本冲突，请先选择保留本地或云端版本')
    const result = await cloud.apiRequest<{ seasonId: string }>('/api/season/submit', 'POST')
    onlineSeasonStatus.label = `${result.seasonId} 成绩已由云存档校验并同步`
    await refreshLeaderboard()
  } catch (error) {
    onlineSeasonStatus.error = error instanceof Error ? error.message : '赛季同步失败'
  } finally {
    onlineSeasonStatus.loading = false
  }
}

function selectAttachment(item: Attachment) {
  selectedAttachment.value = item
  selectedSlot.value = item.slot
}

function selectEquippedAttachment(item: Attachment) {
  if (!isAttachmentEquipped(item)) return
  selectAttachment(item)
}

function canUpgradeAttachment(item: Attachment) {
  return Boolean(item.mainAffix && mode.value !== 'battle' && resources.parts >= attachmentUpgradeCost(item) && (item.level ?? 0) < attachmentMaxLevel(item))
}

function canReforgeAttachment(item: Attachment) {
  return Boolean(item.mainAffix && mode.value !== 'battle' && (canAffordAttachmentReforge(resources, reforgeCostFor(item)) || advancedResources.reforgeChips > 0))
}

function equipInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  equipSelectedAttachment()
}

function upgradeInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  upgradeSelectedAttachment()
}

function reforgeInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  reforgeSelectedAttachment()
}

function equipSelectedAttachment() {
  if (!selectedAttachment.value) return
  equipAttachment(selectedAttachment.value)
}

function equipAttachment(item: Attachment) {
  if (!canSwapAttachment.value || !isAttachmentInInventory(item)) return
  const currentIndex = equippedParts.findIndex((part) => part.slot === item.slot)
  if (currentIndex < 0 && !canEquipAttachment(item)) {
    bannerText.value = `${weapon.name} 仅支持 ${weapon.slotCount} 个配件槽，请先替换已有槽位或切换武器`
    return
  }
  const replaced = currentIndex >= 0 ? equippedParts[currentIndex] : undefined
  inventory.value = inventory.value.filter((part) => !sameAttachment(part, item))
  if (currentIndex >= 0) {
    ensureAttachmentOrder(equippedParts[currentIndex])
    inventory.value = [equippedParts[currentIndex], ...inventory.value]
    equippedParts[currentIndex] = item
  } else {
    equippedParts.push(item)
  }
  selectedAttachment.value = inventory.value.find((part) => part.slot === item.slot) ?? null
  applyBaseStats()
  recordAllTaskEvents('build', Math.max(0, ...summarizeSets(activeEquippedParts.value).map((set) => set.count)))
  saveGame()
  return replaced
}

function equipSettlementAttachment(item: Attachment) {
  const replaced = equipAttachment(item)
  settlementEquipNotice.value = { equipped: item.name, replaced: replaced?.name }
  bannerText.value = replaced ? `${item.name} 已装备，替换下 ${replaced.name}` : `${item.name} 已装备`
}

function rollAttachment(rarityWeights: Record<AttachmentRarity, number>, guaranteedRarity?: AttachmentRarity | null) {
  const desiredRarity = guaranteedRarity ?? rollWeightedRarity(rarityWeights)
  const rarityPool = attachmentPool.filter((item) => item.rarity === desiredRarity)
  const pool = rarityPool.length ? rarityPool : attachmentPool
  return createAttachmentInstance(pool[Math.floor(gameplayRandom() * pool.length)], 'drop', desiredRarity)
}

function applyInventoryCapacity(protectedItems: Attachment[] = []) {
  const protectedKeys = new Set([...inventory.value.filter((item) => item.favorite), ...protectedItems].map(attachmentKey))
  const resolved = resolveAttachmentOverflow(inventory.value, protectedKeys, BASE_INVENTORY_CAPACITY)
  inventory.value = resolved.inventory
  const reward = resolved.overflow.reduce(
    (total, item) => {
      const value = recycleAttachmentValue(item)
      total.gold += value.gold
      total.parts += value.parts
      delete attachmentAcquireOrder[attachmentKey(item)]
      return total
    },
    { gold: 0, parts: 0 }
  )
  resources.gold += reward.gold
  resources.parts += reward.parts
  overflowSalvageNotice.value = resolved.overflow.length ? { items: resolved.overflow, ...reward } : null
  if (resolved.unresolvedCount > 0) bannerText.value = `收藏或新掉落受保护，背包超出容量 ${resolved.unresolvedCount} 件`
  else if (resolved.overflow.length) bannerText.value = `背包已满，自动回收 ${resolved.overflow.length} 件配件`
}

function grantAttachmentDrops(count: number, rarityWeights: Record<AttachmentRarity, number>, guaranteedRarity?: AttachmentRarity | null) {
  const drops: Attachment[] = []
  for (let i = 0; i < count; i++) {
    const item = rollAttachment(rarityWeights, i === 0 ? guaranteedRarity : null)
    markAttachmentAcquired(item)
    drops.push(item)
    if (rarityRank(item.rarity) >= rarityRank('史诗')) recordAllTaskEvents('rarity', Math.max(1, rarityRank(item.rarity) - rarityRank('稀有')))
  }
  inventory.value = [...drops, ...inventory.value]
  applyInventoryCapacity(drops)
  const firstRetainedDrop = drops.find((item) => isAttachmentInInventory(item))
  if (firstRetainedDrop) {
    selectedAttachment.value = firstRetainedDrop
    selectedSlot.value = firstRetainedDrop.slot
  }
  return drops
}

function choosePostBattle(choice: PostBattleChoice) {
  if (choice.disabled || postBattleChoiceTaken.value) return
  postBattleChoiceTaken.value = true
  choice.apply()
}

function setTouchMovement(x: number, y: number) {
  const length = Math.hypot(x, y)
  if (length <= 0.05) {
    touchMovement.x = 0
    touchMovement.y = 0
    return
  }
  touchMovement.x = x / Math.max(1, length)
  touchMovement.y = y / Math.max(1, length)
}

function clearTouchMovement() {
  touchMovement.x = 0
  touchMovement.y = 0
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function gameplayRandom() {
  return replayRuntime.running ? replayRuntime.random() : Math.random()
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatPreciseClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  const tenths = Math.floor((totalSeconds % 1) * 10)
  return `${minutes}:${seconds}.${tenths}`
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
  if (replayRuntime.running) {
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '1', '2', '3'].includes(key)) markReplayIssue(`检测到人工按键：${key}`)
    return
  }
  if (upgradeChoices.value.length && ['1', '2', '3'].includes(key)) {
    const choice = upgradeChoices.value[Number(key) - 1]
    if (choice) chooseUpgrade(choice)
    return
  }
  keys.add(key)
  if (key === '1') useSkill('dash')
  if (key === '2') useSkill('overload')
  if (key === '3') useSkill('pulse')
}

function handleKeyup(event: KeyboardEvent) {
  if (replayRuntime.running) return
  keys.delete(event.key.toLowerCase())
}

function inputVector(): Vec {
  if (replayRuntime.running) {
    const canvas = canvasRef.value
    if (!canvas) {
      markReplayIssue('画布不可用，无法生成固定路线输入')
      return { x: 0, y: 0 }
    }
    const patrol = clockwisePatrolVector(player, getPlayArea(canvas.clientWidth, canvas.clientHeight), replayRuntime.waypointIndex)
    replayRuntime.waypointIndex = patrol.waypointIndex
    return patrol.vector
  }
  const keyboardX = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
  const keyboardY = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
  const x = keyboardX || touchMovement.x
  const y = keyboardY || touchMovement.y
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

function announceBanner(text: string, tone: 'normal' | 'elite' | 'victory' = 'normal') {
  bannerTone.value = tone
  bannerText.value = text
}

function playSound(kind: 'hit' | 'critical' | 'kill' | 'pickup' | 'wave' | 'elite' | 'hurt' | 'victory') {
  if (typeof window === 'undefined' || replayRuntime.running) return
  try {
    audioContext ??= new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime
    const settings = {
      hit: [150, 0.025, 0.015], critical: [480, 0.05, 0.04], kill: [260, 0.07, 0.035], pickup: [720, 0.08, 0.03],
      wave: [340, 0.13, 0.045], elite: [95, 0.28, 0.07], hurt: [72, 0.16, 0.07], victory: [620, 0.42, 0.06]
    } as const
    const [frequency, duration, volume] = settings[kind]
    oscillator.type = kind === 'hurt' || kind === 'elite' ? 'sawtooth' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * (kind === 'victory' ? 1.8 : 0.72)), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch {
    // 浏览器禁用音频时仍保留全部视觉反馈。
  }
}

function spawnEnemy(options: { boss?: boolean; elite?: boolean; kind?: EnemyKind; waveIndex?: number; spawnIndex?: number; hpMultiplier?: number; label?: string } = {}) {
  const canvas = canvasRef.value
  if (!canvas) return
  const forceBoss = Boolean(options.boss)
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  const edge = Math.floor(gameplayRandom() * 4)
  const spawnInset = forceBoss ? 28 : 18
  const x = edge === 1 ? area.x + area.width - spawnInset : edge === 3 ? area.x + spawnInset : area.x + gameplayRandom() * area.width
  const y = edge === 0 ? area.y + spawnInset : edge === 2 ? area.y + area.height - spawnInset : area.y + gameplayRandom() * area.height
  const kind = forceBoss ? levelTuning.boss.kind : options.kind ?? 'grunt'
  const faction = enemyFactionFor(stage.value, kind)
  const bossDefinition = bossDefinitionForStage(stage.value)
  const stats = scaleEnemyStats(stage.value, kind)
  const elite = forceBoss || Boolean(options.elite)
  const affixes = elite && !forceBoss
    ? stage.value >= 501
      ? resolveR5EliteAffixes(stage.value, options.waveIndex ?? currentWave.value, options.spawnIndex ?? 0, kind)
      : resolveEliteAffixes(stage.value, options.waveIndex ?? currentWave.value, options.spawnIndex ?? 0, kind)
    : []
  const affixModifiers = stage.value >= 501 ? r5EliteAffixCombatModifiers(affixes) : eliteAffixCombatModifiers(affixes as EliteAffixId[])
  const affixNames = stage.value >= 501 ? r5EliteAffixLabels(affixes) : eliteAffixLabels(affixes as EliteAffixId[])
  const multipliers = forceBoss ? levelTuning.boss.multipliers : elite ? levelTuning.elite.multipliers : { hp: 1, damage: 1, speed: 1, radius: 1 }
  const maxHp = stats.hp * multipliers.hp * (forceBoss ? r5BossHpMultiplierForStage(stage.value) : 1) * (options.hpMultiplier ?? 1)
  const armorRatio = forceBoss ? bossDefinition.shieldRatio : (kind === 'heavy' ? levelTuning.enemyWarnings.heavyArmorRatio : kind === 'warden' || kind === 'shield' ? 0.55 : 0) + affixModifiers.armorRatio
  const maxArmor = maxHp * armorRatio

  const spawned: Enemy = {
    id: nextEnemyId++,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.atan2(player.y - y, player.x - x),
    wobble: gameplayRandom() * Math.PI * 2,
    hp: maxHp,
    maxHp,
    speed: Math.min(r4Tuning.maxEnemySpeed, stats.speed * multipliers.speed * affixModifiers.speedMultiplier),
    damage: stats.damage * multipliers.damage,
    radius: 13 * multipliers.radius,
    elite,
    boss: forceBoss,
    kind,
    label: options.label ?? (forceBoss ? bossDefinition.label : elite ? `${affixNames.length ? `${affixNames.join('·')} · ` : ''}精英${stats.label}` : stats.label),
    affixes,
    faction,
    formationActive: false,
    formationIncomingMultiplier: 1,
    attackTimer: 0.65 + gameplayRandom() * 0.5,
    aimTime: 0,
    aimAngle: Math.atan2(player.y - y, player.x - x),
    chargeCooldown: 1.4 + gameplayRandom(),
    chargeWindup: 0,
    chargeTime: 0,
    chargeHit: false,
    armor: maxArmor,
    maxArmor,
    armorBreakFlash: 0,
    damageIdleSeconds: 0,
    contactDetonated: false,
    bossPhase: 0,
    statuses: emptyEnemyStatus(),
    spawnedAt: stageTimer.value,
    bossArchetype: forceBoss ? bossDefinition.id : undefined,
    abilityCooldown: 4.5,
    summonCooldown: 4.5,
    barrierCooldown: 3,
    revealedUntil: 0,
    laserSweepShotsRemaining: 0,
    laserSweepTimer: 0,
    laserSweepAngle: 0,
    laserSweepStep: 0,
    enraged: false
  }
  enemies.push(spawned)
  if (elite && !forceBoss) recordAffixCombination(r4Telemetry, affixNames)
  spawnedEnemyCount.value += 1
  if (forceBoss) {
    announceBanner('⚠ 首领进入交战区', 'elite')
    playSound('elite')
    screenShake = 0.4
  } else if (elite) {
    announceBanner(`高威胁目标 · ${affixNames.length ? `${affixNames.join('·')} ` : ''}精英${stats.label}`, 'elite')
    playSound('elite')
    screenShake = Math.max(screenShake, 0.22)
  }
  return spawned
}

function shootNearest() {
  if (!enemies.length) return false
  const target = enemies.reduce((nearest, enemy) => {
    const a = Math.hypot(nearest.x - player.x, nearest.y - player.y)
    const b = Math.hypot(enemy.x - player.x, enemy.y - player.y)
    if (modifiers.threatTargeting) {
      const threat = (unit: Enemy) => (unit.boss ? 1000 : unit.elite ? 600 : unit.kind === 'ranged' ? 420 : unit.kind === 'bomber' ? 360 : unit.kind === 'heavy' ? 300 : 100) - Math.hypot(unit.x - player.x, unit.y - player.y) * 0.2
      return threat(enemy) > threat(nearest) ? enemy : nearest
    }
    if (enemy.boss && b < weapon.range) return enemy
    return b < a ? enemy : nearest
  })
  if (weapon.attackPattern === 'beam') {
    if (lastLockedTargetId === target.id) lockedTargetHits = Math.min(20, lockedTargetHits + 1)
    else { lastLockedTargetId = target.id; lockedTargetHits = 1 }
  } else {
    lastLockedTargetId = 0
    lockedTargetHits = 0
  }
  if (weapon.key === 'light-machine-gun') sustainedFireStacks = Math.min(20, sustainedFireStacks + 1)
  else sustainedFireStacks = 0
  const angle = Math.atan2(target.y - player.y, target.x - player.x)
  const projectileMiddle = (weapon.projectiles - 1) / 2
  for (let projectile = 0; projectile < weapon.projectiles; projectile += 1) {
    const spreadOffset = weapon.projectiles > 1 ? (projectile - projectileMiddle) * (weapon.spread / Math.max(1, projectileMiddle)) : (gameplayRandom() - 0.5) * weapon.spread
    const finalAngle = angle + spreadOffset
    const firstRoundBonus = weapon.key === 'pistol' && weaponAmmo.value === weapon.magazineSize ? weapon.critRate : 0
    const bossCritBonus = weapon.key === 'frost-sniper' && target.boss ? 0.12 : 0
    const eliteBuffBonus = eliteSetBuffTimer > 0 ? 0.25 : 0
    const critical = gameplayRandom() < Math.min(0.9, modifiers.critRate + weapon.critRate + firstRoundBonus + bossCritBonus + eliteBuffBonus)
    const lockMultiplier = weapon.attackPattern === 'beam' ? 1 + lockedTargetHits * 0.025 : 1
    const criticalMultiplier = critical ? weapon.critDamage + (weapon.key === 'frost-sniper' && target.boss ? 0.5 : 0) : 1
    const quantumMultiplier = quantumShotActive ? 1.35 : 1
    const fortressMultiplier = stationarySeconds >= 1 && modifiers.fortress ? 1.15 : 1
    const lastStandMultiplier = lastStandBuffTimer > 0 ? 1.3 : 1
    const fireMultiplier = weapon.element === '火焰' ? 1 + modifiers.fireDamage : 1
    const goldMultiplier = modifiers.goldConversion ? 1 + Math.min(0.2, Math.floor(resources.gold / 500) * 0.01) : 1
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(finalAngle) * weapon.bulletSpeed,
      vy: Math.sin(finalAngle) * weapon.bulletSpeed,
      damage: weapon.damage * modifiers.damage * criticalMultiplier * lockMultiplier * quantumMultiplier * fortressMultiplier * lastStandMultiplier * fireMultiplier * goldMultiplier,
      life: weapon.range / weapon.bulletSpeed,
      pierce: weapon.pierce + modifiers.pierceBonus,
      critical,
      element: weapon.element,
      statusChance: Math.min(0.95, weapon.statusChance + modifiers.statusChance + (weapon.element === '电击' ? modifiers.shockChance : 0)),
      explosionRadius: weapon.explosionRadius,
      chainCount: weapon.chainCount + modifiers.extraChains,
      knockback: weapon.knockback,
      hitEnemyIds: new Set<number>()
    })
  }
  return true
}

function fireSupportWeapon() {
  const support = supportWeapon.value
  if (!support || !enemies.length) return
  const target = enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0]
  if (!target) return
  const applied = dealDamage(target, support.damage * modifiers.damage * 0.35, false, support.pierce, support.element, support.statusChance * 0.6)
  hitTexts.push({ x: target.x, y: target.y - target.radius - 30, value: `支援 ${support.name} ${Math.round(applied)}`, life: 0.65, maxLife: 0.65, color: '#73cfe8', critical: true })
  if (target.hp <= 0) {
    const index = enemies.findIndex((enemy) => enemy.id === target.id)
    if (index >= 0) killEnemy(index)
  }
}

function grantExp(amount: number) {
  const gained = Math.round(amount * modifiers.expGain)
  player.exp += gained
  if (mode.value === 'battle') runStats.expEarned += gained
  while (player.exp >= nextLevelExp.value) {
    player.exp -= nextLevelExp.value
    player.level += 1
    player.maxHp += 12
    player.hp = Math.min(player.maxHp, player.hp + 12)
    announceBanner(`等级提升 · Lv.${player.level}`, 'victory')
    playSound('wave')
  }
}

function recordDamage(amount: number) {
  if (amount <= 0) return
  runStats.totalDamage += amount
  runStats.highestHit = Math.max(runStats.highestHit, amount)
  damageEvents.push({ time: stageTimer.value, amount })
}

function shieldLinkPartner(enemy: Enemy) {
  return enemies.find((candidate) => candidate.id !== enemy.id
    && candidate.hp > 0
    && r5ShieldLinkPairEligible(stage.value, enemy.kind, enemy.affixes, candidate.kind, candidate.affixes)
    && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= r5Tuning.linkedRange)
}

function medicRepairTargets(enemy: Enemy) {
  return enemies
    .filter((candidate) => candidate.id !== enemy.id
      && candidate.hp > 0
      && candidate.hp < candidate.maxHp
      && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= 170)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
}

function wardenProtector(enemy: Enemy) {
  if (enemy.kind === 'warden') return null
  return enemies.find((candidate) => candidate.kind === 'warden'
    && candidate.hp > 0
    && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= 145) ?? null
}

function applyPlayerArmorDamage(rawDamage: number, armorEfficiency = 1) {
  const mitigated = Math.max(0, rawDamage) * defenseDamageMultiplier(player.defense)
  const result = absorbWithArmor(mitigated, player.armor, armorEfficiency)
  player.armor = result.armorAfter
  player.hp -= result.hpDamage
  runStats.damageTaken += result.hpDamage
  return result
}

function dealDamage(enemy: Enemy, rawDamage: number, critical = false, pierce = 0, element: WeaponElement = '物理', statusChance = 0) {
  let multiplier = 1
  const armoredEnemy = !enemy.boss && enemy.armor > 0
  const armorBreakScale = element === '能量' ? 0.35 : enemy.statuses.armorBreakSeconds > 0 ? 0.55 : 1
  const multiplierWithoutPierce = armoredEnemy ? Math.min(1, 1 - 0.5 * armorBreakScale + (critical ? 0.12 : 0)) : enemy.boss ? 0.76 : 1
  if (armoredEnemy) multiplier = Math.min(1, 1 - 0.5 * armorBreakScale + pierce * 0.13 + (critical ? 0.12 : 0))
  if (armoredEnemy && modifiers.voidAmmo) multiplier = Math.max(multiplier, 0.75)
  if (enemy.boss) multiplier = Math.min(1, 0.76 + pierce * 0.055)
  const hpBefore = enemy.hp
  const statusDamageMultiplier = (enemy.statuses.shockSeconds > 0 ? 1.12 : 1) * (enemy.statuses.vulnerableSeconds > 0 ? 1.18 : 1)
  const eliteMultiplier = enemy.elite || enemy.boss ? 1 + modifiers.eliteDamage : 1
  const setBuffMultiplier = eliteSetBuffTimer > 0 ? 1.25 : 1
  const guardMultiplier = wardenProtector(enemy) ? 0.75 : 1
  const incomingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
  const shieldFacing = enemy.kind === 'shield' && Math.abs(Math.atan2(Math.sin(incomingAngle - enemy.angle), Math.cos(incomingAngle - enemy.angle))) <= Math.PI / 3
  const shieldMultiplier = shieldFacing ? 0.45 : 1
  const factionMultiplier = factionDamageMultiplier(enemy.faction, element) * enemy.formationIncomingMultiplier
  const weakpointMultiplier = enemy.boss && enemy.revealedUntil > stageTimer.value ? 1.35 : 1
  const applied = Math.min(hpBefore, rawDamage * multiplier * statusDamageMultiplier * eliteMultiplier * setBuffMultiplier * guardMultiplier * shieldMultiplier * factionMultiplier * weakpointMultiplier)
  if (armoredEnemy && enemy.kind === 'heavy' && pierce > 0) {
    runStats.heavyPierceDamage += Math.min(applied, Math.max(0, rawDamage * (multiplier - multiplierWithoutPierce)))
  }
  if (critical) {
    runStats.criticalTriggers += 1
    const baseRawDamage = rawDamage / weapon.critDamage
    const nonCriticalMultiplier = armoredEnemy ? Math.min(1, 0.5 + pierce * 0.13) : multiplier
    const nonCriticalApplied = Math.min(hpBefore, baseRawDamage * nonCriticalMultiplier)
    runStats.criticalExtraDamage += Math.max(0, applied - nonCriticalApplied)
    recordAllTaskEvents('critical', Math.round(applied))
  }
  enemy.hp -= applied
  if (enemy.kind === 'stealth') enemy.revealedUntil = stageTimer.value + 2
  const linked = shieldLinkPartner(enemy)
  if (linked) {
    const shared = Math.min(linked.hp, applied * r5Tuning.linkedDamageShare)
    linked.hp -= shared
    linked.damageIdleSeconds = 0
    recordDamage(shared)
  }
  enemy.damageIdleSeconds = 0
  const leechRate = (modifiers.lifesteal + (lastStandBuffTimer > 0 ? 0.05 : 0)) * (modifiers.lowHealthLifesteal && player.hp / player.maxHp < 0.3 ? 2 : 1)
  if (leechRate > 0) {
    const cap = player.maxHp * 0.08
    const recovered = Math.min(applied * leechRate, cap - lifestealRecoveredInWindow, player.maxHp - player.hp)
    if (recovered > 0) {
      player.hp += recovered
      lifestealRecoveredInWindow += recovered
      runStats.lifestealHealing += recovered
    }
  }
  const resistanceMultiplier = enemy.affixes.includes('resistant') ? r5Tuning.resistantStatusDurationMultiplier : 1
  const appliedStatus = applyElementStatus(enemy.statuses, element, statusChance, rawDamage, modifiers.statusPower, gameplayRandom, modifiers.statusDuration * factionStatusDurationMultiplier(enemy.faction) * resistanceMultiplier)
  const statusColors: Record<WeaponElement, string> = { 物理: '#d8c8ad', 爆炸: '#ffb257', 火焰: '#f08a45', 电击: '#79d9ff', 毒素: '#91cf62', 冰霜: '#9ed7ee', 能量: '#c495ff' }
  if (appliedStatus) hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 28, value: appliedStatus, life: 0.65, maxLife: 0.65, color: statusColors[element] })
  if (armoredEnemy) {
    enemy.armor = Math.max(0, enemy.armor - rawDamage * (0.35 + pierce * 0.25))
    if (enemy.armor <= 0) {
      enemy.armorBreakFlash = 0.9
      hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 24, value: '护甲击破', life: 0.9, maxLife: 0.9, color: '#9ed7ee', critical: true })
      screenShake = Math.max(screenShake, 0.16)
    }
  }
  recordDamage(applied)
  if (enemy.affixes.includes('reflective') && applied > 0) {
    const reflected = Math.min(player.maxHp * r5Tuning.reflectMaxHpCap, applied * r5Tuning.reflectRatio)
    const reflectedResult = applyPlayerArmorDamage(reflected)
    hitTexts.push({ x: player.x, y: player.y - 28, value: `反伤 ${Math.round(reflectedResult.armorDamage)}甲 / ${Math.round(reflectedResult.hpDamage)}血`, life: 0.55, maxLife: 0.55, color: '#f07b68', critical: true })
  }
  return applied
}

function triggerBulletSecondary(bullet: Bullet, primary: Enemy) {
  if (bullet.explosionRadius > 0) {
    for (const enemy of enemies) {
      if (enemy.id === primary.id || Math.hypot(enemy.x - primary.x, enemy.y - primary.y) > bullet.explosionRadius) continue
      dealDamage(enemy, bullet.damage * 0.68, false, bullet.pierce, bullet.element, bullet.statusChance * 0.7)
    }
  }
  if (weaponHitCanChain(weapon, primary.statuses.shockSeconds, bullet.chainCount)) {
    let source = primary
    for (let chain = 0; chain < bullet.chainCount; chain += 1) {
      const next = enemies
        .filter((enemy) => !bullet.hitEnemyIds.has(enemy.id) && enemy.hp > 0 && Math.hypot(enemy.x - source.x, enemy.y - source.y) <= 190)
        .sort((a, b) => Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y))[0]
      if (!next) break
      bullet.hitEnemyIds.add(next.id)
      dealDamage(next, bullet.damage * Math.pow(0.72, chain + 1), false, 0, '电击', bullet.statusChance)
      hitTexts.push({ x: next.x, y: next.y - next.radius - 12, value: `连锁 ${chain + 1}`, life: 0.45, maxLife: 0.45, color: '#79d9ff' })
      source = next
    }
  }
}

function triggerStormImpact(primary: Enemy) {
  if (!modifiers.stormImpact) return
  stormHitCounter += 1
  if (stormHitCounter % 8 !== 0) return
  for (const enemy of enemies) {
    if (enemy.id === primary.id || Math.hypot(enemy.x - primary.x, enemy.y - primary.y) > 150) continue
    dealDamage(enemy, weapon.damage * modifiers.damage * 0.65, false, 0, '电击', 1)
  }
  hitTexts.push({ x: primary.x, y: primary.y - 24, value: '风暴冲击', life: 0.7, maxLife: 0.7, color: '#79d9ff', critical: true })
}

function updateDpsStats() {
  const cutoff = stageTimer.value - 3
  while (damageEvents.length && damageEvents[0].time < cutoff) damageEvents.shift()
  const windowSeconds = Math.min(3, Math.max(0.5, stageTimer.value))
  runStats.currentDps = damageEvents.reduce((sum, event) => sum + event.amount, 0) / windowSeconds
  runStats.peakDps = Math.max(runStats.peakDps, runStats.currentDps)
}

function snapshotRunStats(victory: boolean): RunStatsSnapshot {
  const duration = Math.max(0.01, stageTimer.value)
  const averageDps = runStats.totalDamage / duration
  const waves = waveRecords.map((wave) => ({ ...wave, enemyKinds: [...wave.enemyKinds] }))
  const activeWave = currentWaveDefinition.value
  if (activeWave && !recordedWaveIndexes.has(activeWave.index)) {
    waves.push({
      wave: activeWave.index,
      phase: activeWave.phase,
      label: activeWave.label,
      duration: Math.max(0, stageTimer.value - waveStartTime),
      enemyKinds: [...new Set(activeWave.kinds)],
      cleared: false
    })
  }
  return {
    duration,
    kills: kills.value,
    totalDamage: runStats.totalDamage,
    averageDps,
    peakDps: runStats.peakDps,
    highestHit: runStats.highestHit,
    goldEarned: runStats.goldEarned,
    expEarned: runStats.expEarned,
    hitCount: runStats.hitCount,
    damageTaken: runStats.damageTaken,
    lifestealHealing: runStats.lifestealHealing,
    waves,
    deathCombination: runStats.deathCombination,
    dpsGapPercent: dpsGapPercent(runStats.peakDps, averageDps),
    durationVerdict: victory ? operationVictoryVerdict(activeOperationMode.value, durationVerdict(duration)) : '未完成 · 不计行动目标',
    contribution: {
      heavyPierceDamage: runStats.heavyPierceDamage,
      criticalTriggers: runStats.criticalTriggers,
      criticalExtraDamage: runStats.criticalExtraDamage,
      dodgedCharges: runStats.dodgedCharges,
      totalChargeAttempts: runStats.totalChargeAttempts
    },
    loadoutBonuses: { ...getEquippedBonuses() },
    r4Telemetry: {
      affixCombinations: { ...r4Telemetry.affixCombinations },
      deathZoneHits: r4Telemetry.deathZoneHits,
      armorRecovered: r4Telemetry.armorRecovered,
      coordinationCoverageSeconds: r4Telemetry.coordinationCoverageSeconds,
      eliteKillDurations: [...r4Telemetry.eliteKillDurations],
      trackingZoneHits: r4Telemetry.trackingZoneHits,
      shieldLinkSeconds: r4Telemetry.shieldLinkSeconds,
      commandPulseSeconds: r4Telemetry.commandPulseSeconds,
      suppressionHits: r4Telemetry.suppressionHits,
      bossPhaseReached: r4Telemetry.bossPhaseReached
    }
  }
}

function maybeOfferUpgrade() {
  if (upgradeTakenForStage.value === stage.value || kills.value < 10 || upgradeChoices.value.length) return
  const currentPierce = totalPiercePreview.value
  const currentDamage = damagePreview.value
  const nextDamage = Math.round(weapon.damage * modifiers.damage * 1.18)
  const currentSpeed = moveSpeedPreview.value
  const nextSpeed = Math.round(player.speed * modifiers.speed * 1.12)
  const currentPickup = Math.round(modifiers.pickup)
  upgradeChoices.value = [
    { name: '穿透校准', desc: '更适合重甲与密集纵队', tag: '穿透', comparison: `${currentPierce} → ${currentPierce + 1}`, apply: () => { modifiers.pierceBonus += 1 } },
    { name: '火力压制', desc: '稳定提高所有目标输出', tag: '输出', comparison: `单发 ${currentDamage} → ${nextDamage}`, apply: () => { modifiers.damage *= 1.18 } },
    { name: '机动回收', desc: '强化走位与资源收集', tag: '机动 / 拾取', comparison: `移速 ${currentSpeed} → ${nextSpeed} · 拾取 ${currentPickup} → ${currentPickup + 24}`, apply: () => { modifiers.speed *= 1.12; modifiers.pickup += 24 } }
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

function drawWarzoneMotif(ctx: CanvasRenderingContext2D, area: PlayArea, theme: R5WarzoneTheme) {
  const centerX = area.x + area.width / 2
  const centerY = area.y + area.height / 2
  ctx.save()
  ctx.strokeStyle = theme.accent
  ctx.fillStyle = theme.accent
  ctx.globalAlpha = 0.18
  ctx.lineWidth = 3

  if (theme.motif === 'assembly-lines') {
    for (let lane = 1; lane < 5; lane++) {
      const y = area.y + area.height * lane / 5
      ctx.setLineDash([22, 12])
      ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.width, y); ctx.stroke()
    }
  } else if (theme.motif === 'hunting-arcs') {
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath(); ctx.arc(centerX, centerY, Math.min(area.width, area.height) * ring * 0.13, -0.8, Math.PI * 1.45); ctx.stroke()
    }
  } else if (theme.motif === 'storm-cuts') {
    ctx.setLineDash([28, 10])
    for (let offset = -area.height; offset < area.width; offset += 76) {
      ctx.beginPath(); ctx.moveTo(area.x + offset, area.y + area.height); ctx.lineTo(area.x + offset + area.height, area.y); ctx.stroke()
    }
  } else if (theme.motif === 'fortress-cross') {
    const size = Math.min(area.width, area.height) * 0.3
    ctx.strokeRect(centerX - size / 2, centerY - size / 2, size, size)
    ctx.beginPath(); ctx.moveTo(area.x, centerY); ctx.lineTo(area.x + area.width, centerY); ctx.moveTo(centerX, area.y); ctx.lineTo(centerX, area.y + area.height); ctx.stroke()
  } else if (theme.motif === 'radiation-blocks') {
    for (let index = 0; index < 7; index++) {
      const blockWidth = area.width * 0.12
      const blockHeight = area.height * 0.16
      const x = area.x + ((index * 37) % 83) / 100 * (area.width - blockWidth)
      const y = area.y + ((index * 53) % 79) / 100 * (area.height - blockHeight)
      ctx.fillRect(x, y, blockWidth, blockHeight)
    }
  } else if (theme.motif === 'deep-trenches') {
    for (let lane = 1; lane < 5; lane++) {
      const y = area.y + area.height * lane / 5
      ctx.fillRect(area.x, y - 7, area.width, 14)
    }
  } else if (theme.motif === 'black-rings') {
    ctx.setLineDash([9, 11])
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath(); ctx.arc(centerX, centerY, Math.min(area.width, area.height) * ring * 0.105, 0, Math.PI * 2); ctx.stroke()
    }
  } else {
    for (let ray = 0; ray < 8; ray++) {
      const angle = ray * Math.PI / 4
      ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX + Math.cos(angle) * area.width, centerY + Math.sin(angle) * area.height); ctx.stroke()
    }
  }
  ctx.restore()
}

function drawPlayArea(ctx: CanvasRenderingContext2D, area: PlayArea, width: number, height: number, theme: R5WarzoneTheme | null) {
  ctx.save()
  ctx.fillStyle = 'rgba(7, 7, 6, 0.38)'
  ctx.fillRect(0, 0, width, area.y)
  ctx.fillRect(0, area.y + area.height, width, height - area.y - area.height)
  ctx.fillRect(0, area.y, area.x, area.height)
  ctx.fillRect(area.x + area.width, area.y, width - area.x - area.width, area.height)

  ctx.save()
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.width, area.height)
  ctx.clip()
  if (theme) {
    ctx.globalAlpha = 0.58
    ctx.fillStyle = theme.floor
    ctx.fillRect(area.x, area.y, area.width, area.height)
    ctx.globalAlpha = 1
    drawWarzoneMotif(ctx, area, theme)
  }
  ctx.strokeStyle = theme ? theme.grid : 'rgba(119, 183, 215, 0.12)'
  ctx.globalAlpha = theme ? 0.28 : 1
  ctx.lineWidth = 1
  ctx.setLineDash([3, 9])
  for (let column = 1; column < 6; column++) {
    const x = area.x + area.width * column / 6
    ctx.beginPath()
    ctx.moveTo(x, area.y)
    ctx.lineTo(x, area.y + area.height)
    ctx.stroke()
  }
  for (let row = 1; row < 4; row++) {
    const y = area.y + area.height * row / 4
    ctx.beginPath()
    ctx.moveTo(area.x, y)
    ctx.lineTo(area.x + area.width, y)
    ctx.stroke()
  }
  ctx.setLineDash([10, 12])
  ctx.strokeStyle = 'rgba(119, 183, 215, 0.22)'
  ctx.beginPath()
  ctx.moveTo(area.x, area.y + area.height / 2)
  ctx.lineTo(area.x + area.width, area.y + area.height / 2)
  ctx.stroke()
  ctx.restore()

  ctx.globalAlpha = 1

  const inset = Math.max(5, Math.min(area.width, area.height) * 0.018)
  ctx.setLineDash([8, 7])
  ctx.strokeStyle = 'rgba(119, 183, 215, 0.34)'
  ctx.lineWidth = 1
  ctx.strokeRect(area.x + inset, area.y + inset, area.width - inset * 2, area.height - inset * 2)

  ctx.setLineDash([])
  ctx.shadowColor = 'rgba(229, 184, 75, 0.32)'
  ctx.shadowBlur = 9
  ctx.strokeStyle = theme?.boundary ?? 'rgba(229, 184, 75, 0.68)'
  ctx.lineWidth = 2
  ctx.strokeRect(area.x, area.y, area.width, area.height)

  ctx.shadowBlur = 0
  ctx.strokeStyle = '#f0bf57'
  ctx.lineWidth = 3
  const corner = Math.max(14, Math.min(28, Math.min(area.width, area.height) * 0.09))
  const corners = [
    [area.x, area.y, 1, 1],
    [area.x + area.width, area.y, -1, 1],
    [area.x, area.y + area.height, 1, -1],
    [area.x + area.width, area.y + area.height, -1, -1]
  ] as const
  for (const [x, y, horizontal, vertical] of corners) {
    ctx.beginPath()
    ctx.moveTo(x + horizontal * corner, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + vertical * corner)
    ctx.stroke()
  }

  const compact = width <= 520
  const label = theme ? (compact ? theme.landmark : `${theme.landmark} / ${theme.positioningRule}`) : compact ? '行动区' : '行动区域 / ACTIVE FIELD'
  ctx.font = `800 ${compact ? 11 : 12}px system-ui, sans-serif`
  const labelWidth = ctx.measureText(label).width + 18
  const labelX = compact ? area.x + area.width - labelWidth - 9 : area.x + 9
  const labelY = compact ? area.y + 50 : area.y + area.height - 33
  ctx.fillStyle = 'rgba(7, 10, 11, 0.86)'
  ctx.fillRect(labelX, labelY, labelWidth, 24)
  ctx.fillStyle = theme?.boundary ?? '#f5d57c'
  ctx.textAlign = 'left'
  ctx.fillText(label, labelX + 9, labelY + 16)
  ctx.restore()
}

function enemySprite(enemy: Enemy) {
  if (enemy.bossArchetype === 'assault-lord') return sprites.bossAssaultLord
  if (enemy.bossArchetype === 'fortress-colossus') return sprites.bossFortressColossus
  if (enemy.bossArchetype === 'warzone-commander') return sprites.bossWarzoneCommander
  if (enemy.bossArchetype === 'final-core') return sprites.bossFinalCore
  if (enemy.boss) return sprites.enemyBoss
  if (enemy.kind === 'shield') return sprites.enemyShield
  if (enemy.kind === 'commander') return sprites.enemyCommander
  if (enemy.kind === 'splitter') return sprites.enemySplitter
  if (enemy.kind === 'stealth') return sprites.enemyStealth
  if (enemy.kind === 'fast' || enemy.kind === 'sniper') return sprites.enemyFast
  if (enemy.kind === 'heavy' || enemy.kind === 'warden') return sprites.enemyHeavy
  if (enemy.kind === 'bomber') return sprites.enemyBomber
  return sprites.enemyGrunt
}

function battlefieldSprite() {
  switch (getR5WarzoneTheme(stage.value)?.bandId) {
    case 'industrial-blockade': return sprites.warzoneIndustrialBlockade
    case 'wasteland-hunt': return sprites.warzoneWastelandHunt
    case 'wasteland-storm': return sprites.warzoneWastelandStorm
    case 'alloy-fortress': return sprites.warzoneAlloyFortress
    case 'radiation-city': return sprites.warzoneRadiationCity
    case 'deep-front': return sprites.warzoneDeepFront
    case 'black-domain': return sprites.warzoneBlackDomain
    case 'end-war': return sprites.warzoneEndWar
    default: return sprites.battlefield
  }
}

function useSkill(key: SkillKey) {
  const skill = skills.find((item) => item.key === key)
  if (!skill || skill.cooldown > 0 || mode.value !== 'battle' || upgradeChoices.value.length) return
  if (key === 'dash') {
    const duration = 0.55 + (skillProgress.dash - 1) * 0.05 + (skillBuildLinks.value.dash ? 0.1 : 0)
    dashTimer = duration
    player.invuln = Math.max(player.invuln, duration)
    const input = inputVector()
    player.vx += input.x * (520 + (skillProgress.dash - 1) * 40)
    player.vy += input.y * (520 + (skillProgress.dash - 1) * 40)
    skill.cooldown = (6 - (skillProgress.dash - 1) * 0.25) * (1 - modifiers.cooldownReduction)
  }
  if (key === 'overload') {
    overloadTimer = 4 + (skillProgress.overload - 1) * 0.5
    skill.cooldown = (12 - (skillProgress.overload - 1) * 0.4) * (1 - modifiers.cooldownReduction)
  }
  if (key === 'pulse') {
    const pulseRange = 190 + (skillProgress.pulse - 1) * 15 + (skillBuildLinks.value.pulse ? 30 : 0)
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < pulseRange) {
        const damage = dealDamage(enemy, (85 + (skillProgress.pulse - 1) * 15) * modifiers.damage, false, totalPiercePreview.value)
        hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 10, value: `脉冲 ${Math.round(damage)}`, life: 0.48, maxLife: 0.48, color: '#7ac7d9' })
        if (enemy.hp <= 0) killEnemy(i)
      }
    }
    skill.cooldown = (9 - (skillProgress.pulse - 1) * 0.3) * (1 - modifiers.cooldownReduction)
  }
}

function killEnemy(index: number) {
  const enemy = enemies[index]
  if (!enemy) return
  if (enemy.elite && !enemy.boss) r4Telemetry.eliteKillDurations.push(Math.max(0, stageTimer.value - enemy.spawnedAt))
  kills.value += 1
  if (activeOperationMode.value === 'bounty' && enemy.kind === bountyObjective.value.target) {
    bountyTargetKills.value += 1
    announceBanner(`悬赏确认 · ${bountyObjective.value.targetLabel} ${Math.min(bountyTargetKills.value, bountyObjective.value.requiredKills)}/${bountyObjective.value.requiredKills}`, bountyObjectiveCompleted(bountyTargetKills.value, bountyObjective.value.requiredKills) ? 'victory' : 'elite')
  }
  recordAllTaskEvents('kill')
  if (enemy.boss) recordAllTaskEvents('boss')
  if (enemy.elite && (modifiers.eliteKillBuff || modifiers.eliteOverdrive)) eliteSetBuffTimer = 6
  const r4Mechanics = r4EnemyMechanicsForStage(stage.value)
  const r5Mechanics = r5EnemyMechanicsForStage(stage.value)
  const createsDeathZone = (r4Mechanics.bomberDeathZone && enemy.kind === 'bomber') || enemy.affixes.includes('volatile')
  if (!enemy.boss && !enemy.contactDetonated && createsDeathZone) {
    enemyHazards.push({
      x: enemy.x,
      y: enemy.y,
      radius: r4Tuning.deathZone.radius,
      warningSeconds: r4Tuning.deathZone.warningSeconds,
      totalWarningSeconds: r4Tuning.deathZone.warningSeconds,
      damage: enemy.damage * r4Tuning.deathZone.damageMultiplier,
      sourceKind: enemy.kind,
      tracking: r5Mechanics.trackingDeathZone
    })
  }
  if (modifiers.statusSpread && (enemy.statuses.burnSeconds > 0 || enemy.statuses.shockSeconds > 0 || enemy.statuses.poisonSeconds > 0 || enemy.statuses.chillSeconds > 0 || enemy.statuses.bleedSeconds > 0 || enemy.statuses.armorBreakSeconds > 0 || enemy.statuses.vulnerableSeconds > 0)) {
    for (const nearby of enemies) {
      if (nearby.id === enemy.id || Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) > 150) continue
      nearby.statuses.burnSeconds = Math.max(nearby.statuses.burnSeconds, enemy.statuses.burnSeconds * 0.7)
      nearby.statuses.burnDps = Math.max(nearby.statuses.burnDps, enemy.statuses.burnDps * 0.7)
      nearby.statuses.burnStacks = Math.max(nearby.statuses.burnStacks, Math.min(3, enemy.statuses.burnStacks))
      nearby.statuses.shockSeconds = Math.max(nearby.statuses.shockSeconds, enemy.statuses.shockSeconds * 0.7)
      nearby.statuses.poisonSeconds = Math.max(nearby.statuses.poisonSeconds, enemy.statuses.poisonSeconds * 0.7)
      nearby.statuses.poisonDps = Math.max(nearby.statuses.poisonDps, enemy.statuses.poisonDps * 0.7)
      nearby.statuses.poisonStacks = Math.max(nearby.statuses.poisonStacks, Math.min(3, enemy.statuses.poisonStacks))
      nearby.statuses.chillSeconds = Math.max(nearby.statuses.chillSeconds, enemy.statuses.chillSeconds * 0.7)
      nearby.statuses.bleedSeconds = Math.max(nearby.statuses.bleedSeconds, enemy.statuses.bleedSeconds * 0.7)
      nearby.statuses.bleedDps = Math.max(nearby.statuses.bleedDps, enemy.statuses.bleedDps * 0.7)
      nearby.statuses.armorBreakSeconds = Math.max(nearby.statuses.armorBreakSeconds, enemy.statuses.armorBreakSeconds * 0.7)
      nearby.statuses.vulnerableSeconds = Math.max(nearby.statuses.vulnerableSeconds, enemy.statuses.vulnerableSeconds * 0.7)
    }
    hitTexts.push({ x: enemy.x, y: enemy.y, value: '异常扩散', life: 0.65, maxLife: 0.65, color: '#c495ff', critical: true })
  }
  if (modifiers.burnExplosion && enemy.statuses.burnSeconds > 0) {
    for (const nearby of enemies) {
      if (nearby.id === enemy.id || Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) > 120) continue
      dealDamage(nearby, enemy.maxHp * 0.08, false, 0, '火焰', 0.45)
    }
    hitTexts.push({ x: enemy.x, y: enemy.y, value: '爆燃', life: 0.6, maxLife: 0.6, color: '#f08a45', critical: true })
  }
  grantExp(enemy.elite ? 7 : 3)
  drops.push({ x: enemy.x, y: enemy.y, value: enemy.elite ? 9 : 3, radius: 6, kind: 'gold' })
  if (enemy.elite) drops.push({ x: enemy.x + 10, y: enemy.y - 8, value: 5, radius: 5, kind: 'exp' })
  killNotice.value = enemy.boss ? '首领击破' : enemy.elite ? `精英击破 · ${enemy.label}` : `击杀确认 · ${enemy.label}`
  killNoticeTimer = enemy.elite ? 1.45 : 0.72
  hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 24, value: enemy.elite ? '精英击破' : '击杀 +1', life: 0.7, maxLife: 0.7, color: enemy.elite ? '#e5b84b' : '#b6d68b', critical: enemy.elite })
  playSound(enemy.elite ? 'elite' : 'kill')
  if (enemy.boss) bossHud.visible = false
  enemies.splice(index, 1)
  if (enemy.kind === 'splitter' && mode.value === 'battle') {
    for (let childIndex = 0; childIndex < 2; childIndex += 1) {
      const child = spawnEnemy({ kind: 'grunt', hpMultiplier: 0.32, label: '分裂体' })
      if (child) {
        child.x = enemy.x + (childIndex ? 18 : -18)
        child.y = enemy.y + (childIndex ? -10 : 10)
      }
    }
    hitTexts.push({ x: enemy.x, y: enemy.y, value: '分裂 ×2', life: 0.75, maxLife: 0.75, color: '#c495ff', critical: true })
  }
}

function damagePlayer(rawDamage: number, sourceX: number, sourceY: number, sourceKind: EnemyKind | 'boss' = 'grunt', sourceAffixes: readonly R5EliteAffixId[] = []) {
  if (player.invuln > 0) return
  if (modifiers.phaseDodge && player.hp / player.maxHp < 0.3 && phaseDodgeCooldown <= 0) {
    phaseDodgeCooldown = 8
    player.invuln = 0.8
    hitTexts.push({ x: player.x, y: player.y - 24, value: '相位闪避', life: 0.75, maxLife: 0.75, color: '#9ed7ee', critical: true })
    return
  }
  if (gameplayRandom() < modifiers.dodge) {
    hitTexts.push({ x: player.x, y: player.y - 24, value: '闪避', life: 0.5, maxLife: 0.5, color: '#9ed7ee' })
    player.invuln = 0.16
    return
  }
  const damage = rawDamage * (1 - modifiers.damageReduction)
  const shieldAbsorbed = Math.min(fortressShield, damage)
  fortressShield -= shieldAbsorbed
  const damageResult = applyPlayerArmorDamage(damage - shieldAbsorbed, sourceKind === 'boss' ? 0.8 : 1)
  const hpDamage = damageResult.hpDamage
  if (sourceAffixes.includes('suppression')) {
    for (const skill of skills) skill.cooldown += r5Tuning.suppressionCooldownPenalty
    r4Telemetry.suppressionHits += 1
  }
  if (sourceAffixes.includes('toxic')) {
    playerPoisonSeconds = Math.max(playerPoisonSeconds, r5Tuning.toxicDuration)
    playerPoisonDps = Math.max(playerPoisonDps, rawDamage * r5Tuning.toxicDamageRatio)
  }
  if (sourceAffixes.includes('chilling')) playerChillSeconds = Math.max(playerChillSeconds, r5Tuning.chillingDuration)
  runStats.hitCount += 1
  playerHitFlash = 0.28
  screenShake = Math.max(screenShake, 0.18)
  damageDirection.angle = Math.atan2(sourceY - player.y, sourceX - player.x) + Math.PI / 2
  damageDirection.life = 0.65
  const absorptionText = `${shieldAbsorbed > 0 ? `盾 ${Math.round(shieldAbsorbed)} · ` : ''}甲 ${Math.round(damageResult.armorDamage)} · 血 ${Math.round(hpDamage)}`
  hitTexts.push({ x: player.x, y: player.y - 24, value: absorptionText, life: 0.55, maxLife: 0.55, color: shieldAbsorbed > 0 || damageResult.armorDamage > 0 ? '#9ed7ee' : '#da4c3d', critical: true })
  player.invuln = 0.35
  playSound('hurt')
  if (player.hp <= 0) {
    const threatLabels: Record<EnemyKind | 'boss', string> = { grunt: '暴徒', ranged: '火力手', fast: '迅捷兵', heavy: '重装兵', bomber: '爆破兵', sniper: '狙击手', medic: '维修兵', warden: '护卫兵', shield: '护盾兵', commander: '指挥兵', splitter: '分裂兵', stealth: '隐形兵', boss: 'Boss' }
    const nearby = enemies
      .filter((enemy) => Math.hypot(enemy.x - player.x, enemy.y - player.y) < 320)
      .map((enemy) => enemy.boss ? 'boss' as const : enemy.kind)
    runStats.deathCombination = [...new Set([sourceKind, ...nearby])].map((kind) => threatLabels[kind]).join(' + ')
  }
}

function fireEnemyProjectile(enemy: Enemy, spread = 0, lockedAngle?: number, damageMultiplier?: number) {
  const angle = (lockedAngle ?? Math.atan2(player.y - enemy.y, player.x - enemy.x)) + spread
  const speed = enemy.boss ? levelTuning.boss.projectileSpeed : enemy.kind === 'sniper' ? 315 : levelTuning.enemyWarnings.rangedProjectileSpeed
  enemyProjectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage: enemy.damage * (enemy.enraged ? 1.2 : 1) * (damageMultiplier ?? (enemy.boss ? levelTuning.boss.projectileDamageMultiplier : 0.78)),
    life: 3,
    radius: enemy.boss ? 6 : 4,
    sourceKind: enemy.boss ? 'boss' : enemy.kind,
    sourceAffixes: [...enemy.affixes]
  })
}

function fireBossVolley(enemy: Enemy) {
  const phases = resolvedBossPhases(stage.value)
  const phase = phases[enemy.bossPhase] ?? phases[0]
  const middle = (phase.projectileCount - 1) / 2
  for (let index = 0; index < phase.projectileCount; index += 1) {
    fireEnemyProjectile(enemy, (index - middle) * phase.spread, enemy.aimAngle)
  }
}

function fireBossRadialBarrage(enemy: Enemy, projectileCount = 12) {
  for (let index = 0; index < projectileCount; index += 1) fireEnemyProjectile(enemy, 0, index / projectileCount * Math.PI * 2, 1.05)
  hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 28, value: `圆形弹幕 ×${projectileCount}`, life: 0.8, maxLife: 0.8, color: '#ffb257', critical: true })
}

function completeVictory() {
  const independent = !operationAdvancesCampaign(activeOperationMode.value)
  const operation = getOperationDefinition(activeOperationMode.value)
  let objectiveSummary: string | undefined
  if (!independent) {
    highestCleared.value = Math.max(highestCleared.value, stage.value)
    recordAllTaskEvents('clear')
    recordAllTaskEvents('stage', stage.value)
    if (stage.value % 25 === 0) recordAllTaskEvents('resource')
    if (stage.value >= 3000 && stage.value % 50 === 0) recordAllTaskEvents('challenge')
  } else {
    recordAllTaskEvents('challenge')
  }
  const stageReward = rewardForStage(stage.value, kills.value)
  const profile = getAttachmentDropProfile(stage.value)
  const bossDefeated = activeOperationMode.value === 'challenge' || stage.value % 10 === 0
  const guaranteedRarity = guaranteedDropRarity(stage.value, dropPity, bossDefeated)
  const shouldDrop = gameplayRandom() < Math.min(1, profile.dropChance * (1 + modifiers.dropRate) * luckDropMultiplier(player.luck))
  const dropCount = attachmentDropCount(shouldDrop, guaranteedRarity)
  const attachmentDrops = grantAttachmentDrops(dropCount, profile.rarityWeights, guaranteedRarity)
  const bestRarity = attachmentDrops.reduce<AttachmentRarity>((best, item) => rarityRank(item.rarity) > rarityRank(best) ? item.rarity : best, '普通')
  recordPityDrop(dropPity, stage.value, bestRarity, bossDefeated)
  const rewardDoubled = gameplayRandom() < modifiers.doubleRewardChance
  const rewardMultiplier = (rewardDoubled ? 2 : 1) * operation.rewardMultiplier
  const reward: Reward = {
    ...stageReward,
    gold: Math.round(stageReward.gold * modifiers.goldGain * rewardMultiplier),
    alloy: Math.round(stageReward.alloy * rewardMultiplier),
    parts: Math.round(stageReward.parts * rewardMultiplier),
    exp: Math.round(stageReward.exp * rewardMultiplier),
    attachments: attachmentDrops
  }
  resources.gold += reward.gold
  runStats.goldEarned += reward.gold
  resources.alloy += reward.alloy
  resources.parts += reward.parts
  if (activeOperationMode.value === 'bounty') {
    advancedResources.honor += Math.min(24, 8 + Math.floor(stage.value / 1000) * 2)
    advancedResources.reforgeChips += 1
    seasonState.score += 35
    seasonState.bestBountySeconds = seasonState.bestBountySeconds == null ? stageTimer.value : Math.min(seasonState.bestBountySeconds, stageTimer.value)
    objectiveSummary = `悬赏目标：${bountyObjective.value.targetLabel} ${bountyTargetKills.value}/${bountyObjective.value.requiredKills} · 荣誉与重铸芯片已入账`
  }
  if (activeOperationMode.value === 'event') {
    const eventRewards = eventClearRewards(seasonState.eventClears)
    advancedResources.precision += eventRewards.precision
    advancedResources.energyCores += eventRewards.energyCores
    seasonState.score += eventRewards.seasonScore
    seasonState.eventClears += 1
    objectiveSummary = eventRewards.firstClear
      ? '战区突袭首通：赛季积分 +100、能量核心 +1、精密元件 +2'
      : '战区突袭重复完成：基础奖励与精密元件 +2；首通奖励不重复发放'
  }
  if (activeOperationMode.value === 'survival') {
    seasonState.score += 25
    seasonState.bestSurvivalKills = Math.max(seasonState.bestSurvivalKills, kills.value)
  }
  if (bossDefeated && activeOperationMode.value === 'campaign') advancedResources.precision += 1
  if (stage.value === 10000 && bossDefeated) advancedResources.energyCores += 2
  grantExp(reward.exp)
  settlementEquipNotice.value = null
  lastRun.value = {
    title: independent ? `${operation.label}完成` : `第 ${stage.value} 关清场`,
    body: attachmentDrops.length
      ? `${rewardDoubled ? '黄金后勤触发奖励翻倍；' : ''}缴获 ${attachmentDrops.map((item) => item.name).join('、')}，回基地可替换构筑。`
      : independent ? `${operation.label}完成，本次行动不推进主线关卡。` : `${stageMeta.value.name} 已压制，本次未发现可用配件。`,
    objectiveSummary,
    victory: true,
    reward,
    stats: snapshotRunStats(true)
  }
  announceBanner(attachmentDrops.length ? `缴获配件 · ${attachmentDrops[0].name}` : `${operation.label}完成`, 'victory')
  playSound('victory')
  clearCombatFeedback()
  mode.value = 'settlement'
  saveGame()
}

function update(delta: number) {
  if (mode.value !== 'battle') {
    clearCombatFeedback()
    return
  }
  if (replayRuntime.running) {
    if (upgradeChoices.value.length) chooseUpgrade(upgradeChoices.value[0])
    useSkill('dash')
    useSkill('overload')
    useSkill('pulse')
  }
  if (upgradeChoices.value.length) {
    screenShake = Math.max(0, screenShake - delta)
    playerHitFlash = Math.max(0, playerHitFlash - delta)
    return
  }
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  stageTimer.value += delta
  spawnTimer -= delta
  player.fireTimer -= delta
  player.invuln = Math.max(0, player.invuln - delta)
  playerPoisonSeconds = Math.max(0, playerPoisonSeconds - delta)
  playerChillSeconds = Math.max(0, playerChillSeconds - delta)
  if (playerPoisonSeconds > 0) {
    const poisonDamage = playerPoisonDps * defenseDamageMultiplier(player.defense) * delta
    player.hp -= poisonDamage
    runStats.damageTaken += poisonDamage
  } else {
    playerPoisonDps = 0
  }
  overloadTimer = Math.max(0, overloadTimer - delta)
  dashTimer = Math.max(0, dashTimer - delta)
  eliteSetBuffTimer = Math.max(0, eliteSetBuffTimer - delta)
  dualMoveBuffTimer = Math.max(0, dualMoveBuffTimer - delta)
  phaseDodgeCooldown = Math.max(0, phaseDodgeCooldown - delta)
  lastStandBuffTimer = Math.max(0, lastStandBuffTimer - delta)
  lastStandCooldown = Math.max(0, lastStandCooldown - delta)
  lifestealWindowSeconds -= delta
  if (lifestealWindowSeconds <= 0) {
    lifestealWindowSeconds = 1
    lifestealRecoveredInWindow = 0
  }
  if (modifiers.lastStand && player.hp / player.maxHp < 0.25 && lastStandCooldown <= 0) {
    lastStandBuffTimer = 5
    lastStandCooldown = 15
    announceBanner('死线增幅启动 · 伤害与吸血提高', 'elite')
  }
  weaponReloadTimer.value = Math.max(0, weaponReloadTimer.value - delta)
  if (weaponReloadTimer.value <= 0 && weaponAmmo.value <= 0) weaponAmmo.value = weapon.magazineSize
  if (weaponCharging.value) weaponChargeTimer.value = Math.max(0, weaponChargeTimer.value - delta)
  if (modifiers.healthRegen > 0) player.hp = Math.min(player.maxHp, player.hp + modifiers.healthRegen * delta)
  supportWeaponTimer = Math.max(0, supportWeaponTimer - delta)
  if (supportWeapon.value && enemies.length && supportWeaponTimer <= 0) {
    fireSupportWeapon()
    supportWeaponTimer = 2.5
  }
  damageDirection.life = Math.max(0, damageDirection.life - delta)
  killNoticeTimer = Math.max(0, killNoticeTimer - delta)
  if (killNoticeTimer <= 0) killNotice.value = ''
  for (const skill of skills) skill.cooldown = Math.max(0, skill.cooldown - delta)

  if (waveTransitionPending.value) {
    waveTransitionSeconds.value = Math.max(0, waveTransitionSeconds.value - delta)
    if (waveTransitionSeconds.value <= 0 && currentWave.value < totalWaves.value) {
      currentWave.value += 1
      waveSpawnedCount.value = 0
      waveTransitionPending.value = false
      spawnTimer = 0
      waveStartTime = stageTimer.value
      announceBanner(`第 ${currentWave.value} 波 · ${currentWaveDefinition.value?.label}`, currentWave.value === totalWaves.value ? 'elite' : 'normal')
      playSound('wave')
    }
  }

  const movement = inputVector()
  const moving = Math.hypot(movement.x, movement.y) > 0.1
  if (moving) {
    movementIdleSeconds = 0
    hasMovedThisRun = true
    stationarySeconds = 0
    fortressShield = 0
  } else {
    movementIdleSeconds += delta
    const wasFortified = stationarySeconds >= 1
    stationarySeconds += delta
    if (!wasFortified && stationarySeconds >= 1 && modifiers.fortress) fortressShield = player.maxHp * 0.18
  }
  const eliteSpeedMultiplier = eliteSetBuffTimer > 0 ? 1.25 : 1
  const chillMultiplier = playerChillSeconds > 0 ? r5Tuning.chillingSpeedMultiplier : 1
  const targetSpeed = player.speed * modifiers.speed * eliteSpeedMultiplier * chillMultiplier * (dashTimer > 0 ? 2.2 : 1) * (dualMoveBuffTimer > 0 ? 1.18 : 1)
  player.vx = lerp(player.vx, movement.x * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.vy = lerp(player.vy, movement.y * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.x = clamp(player.x + player.vx * delta, area.x + player.radius, area.x + area.width - player.radius)
  player.y = clamp(player.y + player.vy * delta, area.y + player.radius, area.y + area.height - player.radius)
  player.visualX = lerp(player.visualX, player.x, 18 * delta)
  player.visualY = lerp(player.visualY, player.y, 18 * delta)
  player.bob += Math.hypot(player.vx, player.vy) * delta * 0.045
  player.afterimageTimer -= delta

  const aimTarget = enemies.filter((enemy) => enemy.kind !== 'stealth' || enemy.revealedUntil > stageTimer.value || Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 155).reduce<Enemy | null>((nearest, enemy) => {
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

  const wave = currentWaveDefinition.value
  const r4Mechanics = r4EnemyMechanicsForStage(stage.value)
  const r5Mechanics = r5EnemyMechanicsForStage(stage.value)
  if (!waveTransitionPending.value && wave && spawnTimer <= 0 && waveSpawnedCount.value < wave.count) {
    const spawnIndex = waveSpawnedCount.value
    const isBoss = wave.boss && spawnIndex === wave.count - 1
    const isElite = !isBoss && wave.eliteCount > 0 && spawnIndex >= wave.count - wave.eliteCount
    spawnEnemy({ boss: isBoss, elite: isElite, kind: enemyKindForWave(wave, spawnIndex), waveIndex: wave.index, spawnIndex })
    if (isBoss) bossSpawned = true
    waveSpawnedCount.value += 1
    spawnTimer = resolvedSpawnInterval(stage.value, wave)
  }

  if (!enemies.length && weaponCharging.value) {
    weaponCharging.value = false
    weaponChargeTimer.value = 0
  }
  if (enemies.length > 0 && player.fireTimer <= 0 && weaponReloadTimer.value <= 0 && weaponAmmo.value > 0) {
    if (weaponRequiresCharge(weapon) && !weaponCharging.value) {
      weaponCharging.value = true
      weaponChargeTimer.value = weapon.chargeTime
    } else if (!weaponRequiresCharge(weapon) || weaponChargeTimer.value <= 0) {
      shotsFiredThisRun += 1
      quantumShotActive = modifiers.quantumMagazine && shotsFiredThisRun % 6 === 0
      const fired = shootNearest()
      if (fired) {
        if (!quantumShotActive) weaponAmmo.value -= 1
        const eliteFireRateMultiplier = eliteSetBuffTimer > 0 ? 1.25 : 1
        const overloadMultiplier = overloadTimer > 0 ? 1.75 + (skillProgress.overload - 1) * 0.08 + (skillBuildLinks.value.overload ? 0.15 : 0) : 1
        player.fireTimer = 1 / (weapon.fireRate * modifiers.fireRate * eliteFireRateMultiplier * overloadMultiplier * (1 + sustainedFireStacks * 0.015))
        if (weaponAmmo.value <= 0) weaponReloadTimer.value = weapon.reloadTime
      }
      weaponCharging.value = false
      weaponChargeTimer.value = 0
      quantumShotActive = false
    }
  }

  if (modifiers.blackHole) {
    blackHoleTimer -= delta
    if (blackHoleTimer <= 0) {
      blackHoleTimer = 8
      for (const enemy of enemies) {
        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y)
        if (distance > 360) continue
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
        enemy.x += Math.cos(angle) * Math.min(90, distance * 0.35)
        enemy.y += Math.sin(angle) * Math.min(90, distance * 0.35)
        dealDamage(enemy, 60 * modifiers.damage, false, 0, '能量', 0.5)
      }
      announceBanner('黑洞模块 · 牵引爆发', 'elite')
    }
  }

  let coordinationActive = false
  let shieldLinkActive = false
  let commandPulseActive = false
  for (const enemy of enemies) {
    const statusTick = tickEnemyStatus(enemy.statuses, delta)
    if (statusTick.dotDamage > 0) {
      const appliedDot = Math.min(enemy.hp, statusTick.dotDamage)
      enemy.hp -= appliedDot
      recordDamage(appliedDot)
    }
    if (statusTick.knockbackForce > 0) {
      const away = Math.atan2(enemy.y - player.y, enemy.x - player.x)
      enemy.x += Math.cos(away) * Math.min(80, statusTick.knockbackForce)
      enemy.y += Math.sin(away) * Math.min(80, statusTick.knockbackForce)
    }
    enemy.damageIdleSeconds += delta
    const coordinated = r4Mechanics.eliteCoordination && !enemy.elite && enemies.some((candidate) => candidate.elite && !candidate.boss && candidate.hp > 0 && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= r4Tuning.coordination.range)
    coordinationActive ||= coordinated
    const hpRatio = enemy.hp / enemy.maxHp
    const affixModifiers = stage.value >= 501 ? r5EliteAffixCombatModifiers(enemy.affixes, hpRatio) : eliteAffixCombatModifiers(enemy.affixes as EliteAffixId[])
    const nearbySameFaction = enemies.filter((candidate) => candidate.id !== enemy.id && candidate.hp > 0 && candidate.faction === enemy.faction && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= 180).length
    const formation = factionFormationBonus(enemy.faction, nearbySameFaction, hpRatio)
    enemy.formationActive = formation.active
    enemy.formationIncomingMultiplier = formation.incomingDamageMultiplier
    const commandPulse = r5Mechanics.commandPulse && !enemy.elite && enemies.some((candidate) => candidate.elite && !candidate.boss && candidate.hp > 0 && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= r4Tuning.coordination.range)
    const shieldLinked = Boolean(shieldLinkPartner(enemy))
    shieldLinkActive ||= shieldLinked
    commandPulseActive ||= commandPulse
    const commanded = enemy.kind !== 'commander' && enemies.some((candidate) => candidate.kind === 'commander' && candidate.hp > 0 && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= 180)
    const actionRate = affixModifiers.actionRateMultiplier * formation.actionRateMultiplier * (enemy.enraged ? 1.25 : 1) * (coordinated ? r4Tuning.coordination.actionRateMultiplier : 1) * (commandPulse ? r5Tuning.commandActionRate : 1) * (commanded ? 1.12 : 1)
    enemy.wobble += delta * (enemy.kind === 'fast' ? 8 : 4)
    enemy.attackTimer -= delta * actionRate
    enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - delta * actionRate)
    enemy.summonCooldown = Math.max(0, enemy.summonCooldown - delta * actionRate)
    enemy.barrierCooldown = Math.max(0, enemy.barrierCooldown - delta * actionRate)
    enemy.chargeCooldown -= delta * actionRate
    enemy.armorBreakFlash = Math.max(0, enemy.armorBreakFlash - delta)
    if (r4Mechanics.heavyArmorRecovery && enemy.kind === 'heavy' && enemy.damageIdleSeconds >= r4Tuning.heavyArmorRecovery.delaySeconds && enemy.armor < enemy.maxArmor) {
      const armorBefore = enemy.armor
      enemy.armor = Math.min(enemy.maxArmor, enemy.armor + enemy.maxArmor * r4Tuning.heavyArmorRecovery.ratioPerSecond * delta)
      r4Telemetry.armorRecovered += enemy.armor - armorBefore
    }
    if (enemy.affixes.includes('regeneration') && enemy.damageIdleSeconds >= r4Tuning.regeneration.delaySeconds && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * r4Tuning.regeneration.hpRatioPerSecond * delta)
    }
    if (!enemy.boss && enemy.affixes.includes('summoner') && enemy.summonCooldown <= 0) {
      const summoned = spawnEnemy({ kind: 'grunt', hpMultiplier: 0.42, label: `${enemyFactionDefinitions[enemy.faction].label}增援` })
      if (summoned) {
        summoned.x = enemy.x + (enemy.id % 2 ? 22 : -22)
        summoned.y = enemy.y + (enemy.id % 3 ? 12 : -12)
      }
      enemy.summonCooldown = r5Tuning.summonCooldown
      hitTexts.push({ x: enemy.x, y: enemy.y - 24, value: '召唤增援', life: 0.7, maxLife: 0.7, color: '#c394ef', critical: true })
    }
    if (!enemy.boss && enemy.affixes.includes('barrier') && enemy.barrierCooldown <= 0) {
      const restored = enemy.maxHp * r5Tuning.barrierArmorRatio
      enemy.maxArmor = Math.max(enemy.maxArmor, restored)
      enemy.armor = Math.min(enemy.maxArmor, enemy.armor + restored)
      enemy.barrierCooldown = r5Tuning.barrierCooldown
      hitTexts.push({ x: enemy.x, y: enemy.y - 24, value: `屏障 +${Math.round(restored)}`, life: 0.7, maxLife: 0.7, color: '#f2c968', critical: true })
    }
    const previousAimTime = enemy.aimTime
    enemy.aimTime = Math.max(0, enemy.aimTime - delta)
    const previousWindup = enemy.chargeWindup
    enemy.chargeWindup = Math.max(0, enemy.chargeWindup - delta)
    const previousChargeTime = enemy.chargeTime
    enemy.chargeTime = Math.max(0, enemy.chargeTime - delta)
    if (previousChargeTime > 0 && enemy.chargeTime <= 0 && !enemy.chargeHit && modifiers.speed > 1) runStats.dodgedCharges += 1
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    const directAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
    let moveAngle = directAngle + Math.sin(enemy.wobble) * (enemy.kind === 'fast' ? 0.32 : 0.12)
    let speedScale = 1

    if (enemy.kind === 'sniper') {
      if (distance < 280) moveAngle = directAngle + Math.PI
      else if (distance < 430) moveAngle = directAngle + Math.PI / 2 * (enemy.id % 2 ? 1 : -1)
      speedScale = enemy.aimTime > 0 ? 0.04 : distance > 430 || distance < 280 ? 0.78 : 0.28
      if (statusTick.canAct && previousAimTime > 0 && enemy.aimTime <= 0) {
        fireEnemyProjectile(enemy, 0, enemy.aimAngle, 0.92)
        enemy.attackTimer = enemy.elite ? 1.65 : 2.3
      } else if (statusTick.canAct && enemy.attackTimer <= 0 && enemy.aimTime <= 0 && distance < 540) {
        enemy.aimAngle = directAngle
        enemy.aimTime = 1.15
      }
    } else if (enemy.kind === 'medic') {
      const injuredAllies = medicRepairTargets(enemy)
      const focus = injuredAllies[0]
      if (focus) {
        const focusDistance = Math.hypot(focus.x - enemy.x, focus.y - enemy.y)
        moveAngle = Math.atan2(focus.y - enemy.y, focus.x - enemy.x)
        speedScale = focusDistance > 115 ? 0.72 : 0.18
      } else if (distance < 170) {
        moveAngle = directAngle + Math.PI
        speedScale = 0.72
      } else {
        speedScale = 0.42
      }
      if (statusTick.canAct && enemy.attackTimer <= 0) {
        let healed = 0
        for (const ally of injuredAllies) {
          const amount = Math.min(ally.maxHp - ally.hp, ally.maxHp * 0.09)
          ally.hp += amount
          healed += amount
        }
        if (healed > 0) {
          hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 18, value: `编队修复 +${Math.round(healed)}`, life: 0.75, maxLife: 0.75, color: '#7bd49a' })
          enemy.attackTimer = 4
        } else {
          enemy.attackTimer = 0.6
        }
      }
    } else if (enemy.kind === 'commander') {
      if (distance < 210) moveAngle = directAngle + Math.PI
      else if (distance < 300) moveAngle = directAngle + Math.PI / 2 * (enemy.id % 2 ? 1 : -1)
      speedScale = distance < 300 ? 0.48 : 0.7
    } else if (enemy.kind === 'shield') {
      moveAngle = directAngle
      speedScale = 0.72
      enemy.angle = directAngle
    } else if (enemy.kind === 'stealth') {
      speedScale = distance > 155 ? 1.08 : 0.82
      if (distance <= 155) enemy.revealedUntil = stageTimer.value + 1.5
    } else if (enemy.kind === 'ranged') {
      if (distance < 145) moveAngle = directAngle + Math.PI
      else if (distance < 235) moveAngle = directAngle + Math.PI / 2 * (enemy.id % 2 ? 1 : -1)
      speedScale = enemy.aimTime > 0 ? 0.18 : distance > 235 || distance < 145 ? 0.92 : 0.56
      if (statusTick.canAct && previousAimTime > 0 && enemy.aimTime <= 0) {
        if (r4Mechanics.rangedBurst) {
          fireEnemyProjectile(enemy, -r4Tuning.rangedBurst.spread, enemy.aimAngle, r4Tuning.rangedBurst.projectileDamageMultiplier)
          fireEnemyProjectile(enemy, r4Tuning.rangedBurst.spread, enemy.aimAngle, r4Tuning.rangedBurst.projectileDamageMultiplier)
        } else {
          fireEnemyProjectile(enemy, 0, enemy.aimAngle)
        }
        enemy.attackTimer = enemy.elite ? 1.1 : 1.65
      } else if (statusTick.canAct && enemy.attackTimer <= 0 && enemy.aimTime <= 0 && distance < levelTuning.enemyWarnings.rangedRange) {
        enemy.aimAngle = directAngle
        enemy.aimTime = levelTuning.enemyWarnings.rangedAimSeconds
      }
    } else if (enemy.kind === 'fast') {
      if (enemy.chargeTime > 0) {
        speedScale = levelTuning.enemyWarnings.fastChargeSpeedMultiplier
        moveAngle = Math.atan2(enemy.vy, enemy.vx)
      } else if (statusTick.canAct && previousWindup > 0 && enemy.chargeWindup <= 0) {
        enemy.chargeTime = levelTuning.enemyWarnings.fastChargeSeconds
        enemy.chargeHit = false
        const chargeSpeed = Math.min(r4Tuning.maxChargeSpeed, enemy.speed * levelTuning.enemyWarnings.fastChargeSpeedMultiplier)
        enemy.vx = Math.cos(enemy.aimAngle) * chargeSpeed
        enemy.vy = Math.sin(enemy.aimAngle) * chargeSpeed
      } else if (enemy.chargeWindup > 0) {
        speedScale = 0.08
      } else if (statusTick.canAct && enemy.chargeCooldown <= 0 && distance < levelTuning.enemyWarnings.fastChargeRange) {
        enemy.chargeWindup = levelTuning.enemyWarnings.fastWindupSeconds
        enemy.chargeCooldown = enemy.elite ? 1.7 : 2.6
        enemy.aimAngle = directAngle
        runStats.totalChargeAttempts += 1
      }
    }

    if (enemy.boss) {
      const bossDefinition = bossDefinitionForStage(stage.value)
      const bossPhases = resolvedBossPhases(stage.value)
      let nextPhase = 0
      bossPhases.forEach((phase, index) => {
        if (hpRatio <= phase.hpThreshold) nextPhase = index
      })
      if (nextPhase !== enemy.bossPhase) {
        enemy.bossPhase = nextPhase
        const phaseAbilityPlan = bossAbilityPlanForStage(stage.value, nextPhase)
        if (phaseAbilityPlan.phaseShieldRatio > 0) {
          const phaseShield = enemy.maxHp * phaseAbilityPlan.phaseShieldRatio
          enemy.maxArmor = Math.max(enemy.maxArmor, phaseShield)
          enemy.armor = Math.max(enemy.armor, phaseShield)
          hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 22, value: `阶段护盾 +${Math.round(phaseShield)}`, life: 0.9, maxLife: 0.9, color: '#8fd7f0', critical: true })
        }
        announceBanner(`Boss 阶段 ${nextPhase + 1} · ${bossPhases[nextPhase].label}`, 'elite')
      }
      r4Telemetry.bossPhaseReached = Math.max(r4Telemetry.bossPhaseReached, enemy.bossPhase + 1)
      const phase = bossPhases[enemy.bossPhase]
      const abilityPlan = bossAbilityPlanForStage(stage.value, enemy.bossPhase)
      if (!enemy.enraged && hpRatio <= abilityPlan.enrageThreshold) {
        enemy.enraged = true
        announceBanner(`${bossDefinition.label} · 狂暴阶段`, 'elite')
        hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 28, value: '狂暴：行动 +25% / 伤害 +20%', life: 1.2, maxLife: 1.2, color: '#ff5b42', critical: true })
      }

      if (abilityPlan.charge) {
        if (enemy.chargeTime > 0) {
          speedScale = 2.45
          moveAngle = Math.atan2(enemy.vy, enemy.vx)
        } else if (statusTick.canAct && previousWindup > 0 && enemy.chargeWindup <= 0) {
          enemy.chargeTime = 0.62
          enemy.chargeHit = false
          const chargeSpeed = Math.min(r4Tuning.maxChargeSpeed, enemy.speed * 3.4)
          enemy.vx = Math.cos(enemy.aimAngle) * chargeSpeed
          enemy.vy = Math.sin(enemy.aimAngle) * chargeSpeed
        } else if (enemy.chargeWindup > 0) {
          speedScale = 0.04
        }
      }

      enemy.laserSweepTimer = Math.max(0, enemy.laserSweepTimer - delta * actionRate)
      if (enemy.laserSweepShotsRemaining > 0 && enemy.laserSweepTimer <= 0) {
        fireEnemyProjectile(enemy, 0, enemy.laserSweepAngle, 1.35)
        enemy.laserSweepAngle += enemy.laserSweepStep
        enemy.laserSweepShotsRemaining -= 1
        enemy.laserSweepTimer = 0.14
      }

      const hasTriggeredAbility = abilityPlan.charge || Boolean(abilityPlan.summonKind) || abilityPlan.laserSweepShots > 0 || abilityPlan.clones > 0 || abilityPlan.pressureRing || abilityPlan.radialBarrageProjectiles > 0
      if (enemy.abilityCooldown <= 0 && hasTriggeredAbility) {
        if (abilityPlan.charge && enemy.chargeWindup <= 0 && enemy.chargeTime <= 0) {
          enemy.aimAngle = directAngle
          enemy.chargeWindup = 0.9
          runStats.totalChargeAttempts += 1
        }
        if (abilityPlan.summonKind) {
          for (let summonIndex = 0; summonIndex < (bossDefinition.id === 'final-core' ? 2 : 1); summonIndex += 1) {
            spawnEnemy({ kind: abilityPlan.summonKind, hpMultiplier: 0.7, label: `${bossDefinition.label}增援` })
          }
        }
        if (abilityPlan.laserSweepShots > 0) {
          enemy.laserSweepShotsRemaining = abilityPlan.laserSweepShots
          enemy.laserSweepAngle = directAngle - 0.36
          enemy.laserSweepStep = 0.72 / Math.max(1, abilityPlan.laserSweepShots - 1)
          enemy.laserSweepTimer = 0
        }
        if (abilityPlan.clones > 0) {
          for (let cloneIndex = 0; cloneIndex < abilityPlan.clones; cloneIndex += 1) spawnEnemy({ kind: 'stealth', elite: true, hpMultiplier: 0.55, label: '终焉分身' })
        }
        if (abilityPlan.pressureRing) enemyHazards.push({ x: player.x, y: player.y, radius: 120, warningSeconds: 1.1, totalWarningSeconds: 1.1, damage: enemy.damage * 1.15, sourceKind: enemy.kind, tracking: true })
        if (abilityPlan.radialBarrageProjectiles > 0) fireBossRadialBarrage(enemy, abilityPlan.radialBarrageProjectiles)
        enemy.revealedUntil = stageTimer.value + abilityPlan.weakpointSeconds
        hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 42, value: `弱点暴露 ${abilityPlan.weakpointSeconds.toFixed(1)}s · 受伤 +35%`, life: abilityPlan.weakpointSeconds, maxLife: abilityPlan.weakpointSeconds, color: '#f2e38a', critical: true })
        enemy.abilityCooldown = Math.max(5.5, 10 - enemy.bossPhase)
        announceBanner(`${bossDefinition.label} · ${bossDefinition.summary}`, 'elite')
      }
      if (enemy.chargeWindup <= 0 && enemy.chargeTime <= 0) {
        if (statusTick.canAct && previousAimTime > 0 && enemy.aimTime <= 0) {
          fireBossVolley(enemy)
          enemy.attackTimer = phase.attackInterval
        } else if (statusTick.canAct && enemy.attackTimer <= 0 && enemy.aimTime <= 0 && distance < phase.warningRange) {
          enemy.aimAngle = directAngle
          enemy.aimTime = phase.warningSeconds
        }
      }
    }

    speedScale *= statusTick.speedMultiplier * formation.speedMultiplier * (coordinated ? r4Tuning.coordination.speedMultiplier : 1)
    if (!((enemy.kind === 'fast' || enemy.boss) && enemy.chargeTime > 0)) {
      enemy.vx = lerp(enemy.vx, Math.cos(moveAngle) * enemy.speed * speedScale, 5.5 * delta)
      enemy.vy = lerp(enemy.vy, Math.sin(moveAngle) * enemy.speed * speedScale, 5.5 * delta)
    }
    enemy.x = clamp(enemy.x + enemy.vx * delta, area.x + enemy.radius, area.x + area.width - enemy.radius)
    enemy.y = clamp(enemy.y + enemy.vy * delta, area.y + enemy.radius, area.y + area.height - enemy.radius)
    enemy.angle = lerpAngle(enemy.angle, Math.atan2(enemy.vy, enemy.vx), 8 * delta)
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius && player.invuln <= 0) {
      damagePlayer(enemy.damage * (enemy.enraged ? 1.2 : 1) * (enemy.chargeTime > 0 ? 1.55 : 1), enemy.x, enemy.y, enemy.boss ? 'boss' : enemy.kind, enemy.affixes)
      if (enemy.kind === 'fast' && enemy.chargeTime > 0) enemy.chargeHit = true
      if (enemy.kind === 'bomber') {
        enemy.contactDetonated = true
        enemy.hp = 0
      }
    }
  }

  if (coordinationActive) r4Telemetry.coordinationCoverageSeconds += delta
  if (shieldLinkActive) r4Telemetry.shieldLinkSeconds += delta
  if (commandPulseActive) r4Telemetry.commandPulseSeconds += delta

  for (let i = enemyHazards.length - 1; i >= 0; i--) {
    const hazard = enemyHazards[i]
    hazard.warningSeconds -= delta
    if (hazard.tracking && hazard.warningSeconds > hazard.totalWarningSeconds * (1 - r5Tuning.trackingRatio)) {
      const angle = Math.atan2(player.y - hazard.y, player.x - hazard.x)
      hazard.x += Math.cos(angle) * 42 * delta
      hazard.y += Math.sin(angle) * 42 * delta
    }
    if (hazard.warningSeconds > 0) continue
    if (Math.hypot(hazard.x - player.x, hazard.y - player.y) <= hazard.radius + player.radius) {
      r4Telemetry.deathZoneHits += 1
      if (hazard.tracking) r4Telemetry.trackingZoneHits += 1
      damagePlayer(hazard.damage, hazard.x, hazard.y, hazard.sourceKind)
    }
    hitTexts.push({ x: hazard.x, y: hazard.y, value: '爆区引爆', life: 0.55, maxLife: 0.55, color: '#e36b4f', critical: true })
    screenShake = Math.max(screenShake, 0.2)
    enemyHazards.splice(i, 1)
  }

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const projectile = enemyProjectiles[i]
    projectile.x += projectile.vx * delta
    projectile.y += projectile.vy * delta
    projectile.life -= delta
    if (Math.hypot(projectile.x - player.x, projectile.y - player.y) <= projectile.radius + player.radius) {
      damagePlayer(projectile.damage, projectile.x, projectile.y, projectile.sourceKind, projectile.sourceAffixes)
      enemyProjectiles.splice(i, 1)
    } else if (projectile.life <= 0) {
      enemyProjectiles.splice(i, 1)
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
      if (!bullet.hitEnemyIds.has(enemy.id) && Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) <= enemy.radius + 4) {
        bullet.hitEnemyIds.add(enemy.id)
        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y)
        const closeRangeMultiplier = weapon.attackPattern === 'spread' ? 1 + Math.max(0, 1 - distance / weapon.range) * 0.5 : 1
        const damage = dealDamage(enemy, bullet.damage * closeRangeMultiplier, bullet.critical, totalPiercePreview.value, bullet.element, bullet.statusChance)
        if (weapon.attackPattern === 'dual') dualMoveBuffTimer = 2
        enemy.statuses.knockbackForce = Math.max(enemy.statuses.knockbackForce, bullet.knockback)
        triggerBulletSecondary(bullet, enemy)
        triggerStormImpact(enemy)
        hitTexts.push({ x: enemy.x + (Math.random() - 0.5) * 12, y: enemy.y - enemy.radius - 10, value: bullet.critical ? `暴击 ${Math.round(damage)}!` : Math.round(damage).toString(), life: bullet.critical ? 0.62 : 0.42, maxLife: bullet.critical ? 0.62 : 0.42, color: bullet.critical ? '#f2c14f' : enemy.boss ? '#e5b84b' : '#f3efe5', critical: bullet.critical })
        playSound(bullet.critical ? 'critical' : 'hit')
        bullet.pierce -= 1
        if (!modifiers.noPierceFalloff) bullet.damage *= 0.82
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
  updateDpsStats()
  const boss = enemies.find((enemy) => enemy.boss)
  bossHud.visible = Boolean(boss)
  if (boss) {
    bossHud.label = boss.label
    bossHud.hp = boss.hp
    bossHud.maxHp = boss.maxHp
    bossHud.hpPercent = clamp((boss.hp / boss.maxHp) * 100, 0, 100)
    bossHud.phaseLabel = `${resolvedBossPhases(stage.value)[boss.bossPhase]?.label ?? ''}${boss.enraged ? ' · 狂暴' : ''}${boss.revealedUntil > stageTimer.value ? ' · 弱点暴露' : ''}`
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i]
    if (Math.hypot(drop.x - player.x, drop.y - player.y) < modifiers.pickup) {
      let pickupValue = drop.value
      if (drop.kind === 'gold') {
        const gainedGold = Math.max(1, Math.round(drop.value * modifiers.goldGain))
        resources.gold += gainedGold
        runStats.goldEarned += gainedGold
        pickupValue = gainedGold
      }
      if (drop.kind === 'exp') grantExp(drop.value)
      hitTexts.push({ x: player.x, y: player.y - 30, value: drop.kind === 'gold' ? `金币 +${pickupValue}` : `经验 +${pickupValue}`, life: 0.55, maxLife: 0.55, color: drop.kind === 'gold' ? '#e5b84b' : '#7ac7d9' })
      playSound('pickup')
      drops.splice(i, 1)
    }
  }

  if (activeOperationMode.value === 'bounty' && bountyObjectiveCompleted(bountyTargetKills.value, bountyObjective.value.requiredKills)) {
    completeVictory()
    return
  }

  maybeOfferUpgrade()

  if (player.hp <= 0) {
    const failureBody = activeOperationMode.value === 'survival'
      ? `生存至 ${formatPreciseClock(stageTimer.value)}，距完成还差 ${Math.ceil(operationTimeRemaining.value)} 秒。保留已拾取资源。`
      : activeOperationMode.value === 'bounty'
        ? `已清剿 ${bountyObjective.value.targetLabel} ${bountyTargetKills.value}/${bountyObjective.value.requiredKills}，目标未完成。保留已拾取资源。`
      : `倒在第 ${currentWave.value} 波，剩余 ${Math.max(0, targetKills.value - kills.value)} 名敌人。保留已拾取资源。`
    lastRun.value = { title: `${getOperationDefinition(activeOperationMode.value).shortLabel}撤离失败`, body: failureBody, victory: false, stats: snapshotRunStats(false) }
    clearCombatFeedback()
    mode.value = 'settlement'
    saveGame()
    return
  }

  if (activeOperationMode.value === 'survival' && operationTimeRemaining.value <= 0) {
    completeVictory()
    return
  }

  const currentWaveCleared = wave && waveSpawnedCount.value >= wave.count && enemies.length === 0 && enemyHazards.length === 0
  if (currentWaveCleared && !recordedWaveIndexes.has(wave.index)) {
    recordedWaveIndexes.add(wave.index)
    waveRecords.push({
      wave: wave.index,
      phase: wave.phase,
      label: wave.label,
      duration: Math.max(0, stageTimer.value - waveStartTime),
      enemyKinds: [...new Set(wave.kinds)],
      cleared: true
    })
  }
  if (currentWaveCleared && currentWave.value < totalWaves.value && !waveTransitionPending.value) {
    waveTransitionPending.value = true
    waveTransitionSeconds.value = wave.restAfter
    announceBanner(`第 ${currentWave.value} 波肃清`, 'victory')
    playSound('wave')
  }

  const allWavesCleared = currentWaveCleared && currentWave.value === totalWaves.value
  if (allWavesCleared && activeOperationMode.value === 'survival') {
    waveSpawnedCount.value = 0
    spawnTimer = 0
    recordedWaveIndexes.delete(currentWave.value)
    waveStartTime = stageTimer.value
    announceBanner('终段压力持续 · 坚守至倒计时结束', 'elite')
  } else if (allWavesCleared) {
    completeVictory()
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = context
  if (!canvas || !ctx) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const compactViewport = width <= 520
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (mode.value === 'battle' && screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake * 16, (Math.random() - 0.5) * screenShake * 16)
  const background = battlefieldSprite()
  if (background?.complete) drawCoverImage(ctx, background, width, height)
  drawPlayArea(ctx, getPlayArea(width, height), width, height, getR5WarzoneTheme(stage.value))

  for (const drop of drops) {
    drawShadow(ctx, drop.x, drop.y + 7, drop.radius * 3, 0.18)
    const pickupScale = 1 + Math.sin(stageTimer.value * 6 + drop.x) * 0.09
    drawSprite(ctx, drop.kind === 'gold' ? sprites.pickupGold : sprites.pickupExp, drop.x, drop.y - 3 + Math.sin(stageTimer.value * 4 + drop.y) * 3, drop.radius * 4 * pickupScale)
  }
  for (const bullet of bullets) drawSprite(ctx, sprites.bullet, bullet.x, bullet.y, overloadTimer > 0 ? 34 : 26, Math.atan2(bullet.vy, bullet.vx))
  for (const projectile of enemyProjectiles) {
    ctx.save()
    ctx.fillStyle = '#d95743'
    ctx.shadowColor = '#d95743'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  for (const hazard of enemyHazards) {
    const progress = 1 - hazard.warningSeconds / r4Tuning.deathZone.warningSeconds
    const warningColor = progress > 0.72 ? '#ff5b42' : compactViewport ? '#ffe08b' : '#e5b84b'
    ctx.save()
    if (compactViewport) {
      ctx.strokeStyle = 'rgba(5, 7, 8, 0.9)'
      ctx.lineWidth = 8 + progress * 2
      ctx.setLineDash([7, 5])
      ctx.beginPath()
      ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowColor = warningColor
      ctx.shadowBlur = 12 + progress * 10
    }
    ctx.fillStyle = `rgba(211, 71, 44, ${compactViewport ? 0.22 + progress * 0.3 : 0.08 + progress * 0.16})`
    ctx.strokeStyle = warningColor
    ctx.lineWidth = (compactViewport ? 3.5 : 2) + progress * 2
    ctx.setLineDash(compactViewport ? [7, 5] : [10, 7])
    ctx.beginPath()
    ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (compactViewport) {
      ctx.shadowBlur = 0
      ctx.setLineDash([])
      ctx.strokeStyle = warningColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(hazard.x, hazard.y, hazard.radius * (0.82 - progress * 0.12), 0, Math.PI * 2)
      ctx.stroke()

      const warningLabel = `${progress > 0.72 ? '立即撤离' : '爆区'} ${Math.max(0, hazard.warningSeconds).toFixed(1)}s`
      ctx.font = '900 13px Trebuchet MS'
      ctx.textAlign = 'center'
      const labelWidth = ctx.measureText(warningLabel).width + 18
      const labelBaseline = Math.max(22, hazard.y - hazard.radius - 10)
      ctx.fillStyle = 'rgba(5, 7, 8, 0.92)'
      ctx.fillRect(hazard.x - labelWidth / 2, labelBaseline - 17, labelWidth, 23)
      ctx.strokeStyle = warningColor
      ctx.lineWidth = 2
      ctx.strokeRect(hazard.x - labelWidth / 2, labelBaseline - 17, labelWidth, 23)
      ctx.fillStyle = '#fff5d6'
      ctx.fillText(warningLabel, hazard.x, labelBaseline)
    }
    ctx.restore()
  }

  ctx.font = compactViewport ? '700 14px Trebuchet MS' : '12px Trebuchet MS'
  ctx.textAlign = 'center'
  ctx.save()
  ctx.strokeStyle = 'rgba(105, 174, 232, 0.9)'
  ctx.lineWidth = compactViewport ? 3 : 2
  ctx.setLineDash([8, 6])
  for (const enemy of enemies) {
    const linked = shieldLinkPartner(enemy)
    if (!linked || enemy.id > linked.id) continue
    ctx.beginPath()
    ctx.moveTo(enemy.x, enemy.y)
    ctx.lineTo(linked.x, linked.y)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(114, 201, 151, 0.88)'
  ctx.lineWidth = compactViewport ? 3.5 : 2.5
  ctx.setLineDash([5, 4])
  for (const enemy of enemies) {
    if (enemy.kind !== 'medic') continue
    const repairTarget = medicRepairTargets(enemy)[0]
    if (!repairTarget) continue
    ctx.beginPath()
    ctx.moveTo(enemy.x, enemy.y)
    ctx.lineTo(repairTarget.x, repairTarget.y)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(104, 190, 225, 0.78)'
  ctx.setLineDash([4, 5])
  for (const enemy of enemies) {
    const protector = wardenProtector(enemy)
    if (!protector) continue
    ctx.beginPath()
    ctx.moveTo(enemy.x, enemy.y)
    ctx.lineTo(protector.x, protector.y)
    ctx.stroke()
  }
  ctx.restore()
  for (const enemy of enemies) {
    const size = enemy.radius * (enemy.boss ? 3.6 : 3.2)
    const kindColor: Record<EnemyKind, string> = { grunt: '#c66a4d', ranged: '#6f9eb2', fast: '#d2aa48', heavy: '#8d9b89', bomber: '#cf7040', sniper: '#e75f68', medic: '#72c997', warden: '#69b9d8', shield: '#67b7de', commander: '#e7a958', splitter: '#b178d6', stealth: '#9d94c7' }
    const outline = enemy.elite ? '#e5b84b' : enemyFactionDefinitions[enemy.faction].color ?? kindColor[enemy.kind]
    drawShadow(ctx, enemy.x, enemy.y, size, enemy.boss ? 0.45 : 0.3)
    ctx.save()
    ctx.strokeStyle = outline
    ctx.globalAlpha = enemy.elite ? 0.9 : 0.62
    ctx.lineWidth = enemy.elite ? 3 : enemy.kind === 'heavy' ? 2.5 : 1.5
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, enemy.radius + (enemy.elite ? 6 + Math.sin(stageTimer.value * 5) * 2 : 3), 0, Math.PI * 2)
    ctx.stroke()
    if (enemy.formationActive) {
      ctx.strokeStyle = enemyFactionDefinitions[enemy.faction].color
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (enemy.boss && enemy.revealedUntil > stageTimer.value) {
      ctx.strokeStyle = '#f2e38a'
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 14 + Math.sin(stageTimer.value * 10) * 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (r4EnemyMechanicsForStage(stage.value).eliteCoordination && enemy.elite && !enemy.boss) {
      ctx.strokeStyle = compactViewport ? 'rgba(242, 193, 79, 0.62)' : 'rgba(229, 184, 75, 0.34)'
      ctx.lineWidth = compactViewport ? 3 : 1.5
      ctx.setLineDash(compactViewport ? [7, 6] : [8, 10])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, r4Tuning.coordination.range, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (enemy.kind === 'ranged' || enemy.kind === 'sniper') {
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 8, -0.65, 0.65)
      ctx.stroke()
      if (enemy.aimTime > 0) {
        const aimProgress = 1 - enemy.aimTime / (enemy.kind === 'sniper' ? 1.15 : levelTuning.enemyWarnings.rangedAimSeconds)
        ctx.strokeStyle = enemy.kind === 'sniper' ? '#ff5f67' : aimProgress > 0.72 ? '#ff6b4a' : '#f2c14f'
        ctx.lineWidth = 1.5 + aimProgress * 2
        ctx.globalAlpha = 0.48 + aimProgress * 0.42
        ctx.setLineDash([10, 6])
        ctx.beginPath()
        ctx.moveTo(enemy.x, enemy.y)
        const aimRange = enemy.kind === 'sniper' ? 540 : levelTuning.enemyWarnings.rangedRange
        ctx.lineTo(enemy.x + Math.cos(enemy.aimAngle) * aimRange, enemy.y + Math.sin(enemy.aimAngle) * aimRange)
        ctx.stroke()
      }
    }
    if (enemy.kind === 'heavy') {
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 6, enemy.angle - 0.8, enemy.angle + 0.8)
      ctx.stroke()
    }
    if ((enemy.kind === 'fast' || enemy.boss) && enemy.chargeWindup > 0) {
      const warningDuration = enemy.boss ? 0.9 : levelTuning.enemyWarnings.fastWindupSeconds
      const warningProgress = 1 - enemy.chargeWindup / warningDuration
      ctx.strokeStyle = '#ffb24c'
      ctx.lineWidth = 2 + warningProgress * 2
      ctx.globalAlpha = 0.52 + warningProgress * 0.42
      ctx.setLineDash([8, 5])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10 + warningProgress * 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(enemy.x + Math.cos(enemy.aimAngle) * 190, enemy.y + Math.sin(enemy.aimAngle) * 190)
      ctx.stroke()
    } else if (enemy.kind === 'fast' && enemy.chargeTime > 0) {
      ctx.globalAlpha = 0.72
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 68, enemy.y + Math.sin(enemy.angle) * 68)
      ctx.stroke()
    }
    if (enemy.boss && enemy.aimTime > 0) {
      const phase = resolvedBossPhases(stage.value)[enemy.bossPhase]
      const halfArc = Math.max(0.18, phase.spread * (phase.projectileCount - 1) / 2)
      ctx.strokeStyle = '#ff5b42'
      ctx.fillStyle = 'rgba(210, 54, 35, 0.12)'
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.82
      ctx.setLineDash([12, 7])
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.arc(enemy.x, enemy.y, phase.warningRange, enemy.aimAngle - halfArc, enemy.aimAngle + halfArc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    const stealthHidden = enemy.kind === 'stealth' && enemy.revealedUntil <= stageTimer.value && Math.hypot(enemy.x - player.x, enemy.y - player.y) > 155
    ctx.save()
    if (stealthHidden) ctx.globalAlpha = 0.22
    drawSprite(ctx, enemySprite(enemy), enemy.x, enemy.y, size, enemy.angle)
    ctx.restore()
    if (enemy.kind === 'shield') {
      ctx.save(); ctx.strokeStyle = '#79cbed'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 10, enemy.angle - Math.PI / 3, enemy.angle + Math.PI / 3); ctx.stroke(); ctx.restore()
    }
    if (enemy.kind === 'commander') {
      ctx.save(); ctx.strokeStyle = 'rgba(231,169,88,.55)'; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 180, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }
    if (['sniper', 'medic', 'warden', 'shield', 'commander', 'splitter', 'stealth'].includes(enemy.kind)) {
      const marker = enemy.kind === 'sniper' ? '◎' : enemy.kind === 'medic' ? '+' : enemy.kind === 'warden' ? '◆' : enemy.kind === 'shield' ? '◖' : enemy.kind === 'commander' ? '!' : enemy.kind === 'splitter' ? '◇' : '◌'
      ctx.save()
      ctx.fillStyle = kindColor[enemy.kind]
      ctx.strokeStyle = 'rgba(7, 9, 10, 0.9)'
      ctx.lineWidth = 3
      ctx.font = `900 ${compactViewport ? 15 : 13}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.strokeText(marker, enemy.x, enemy.y - enemy.radius - 34)
      ctx.fillText(marker, enemy.x, enemy.y - enemy.radius - 34)
      ctx.restore()
    }
    ctx.fillStyle = '#15120d'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 4)
    ctx.fillStyle = '#78a866'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2 * Math.max(enemy.hp / enemy.maxHp, 0), 4)
    if (enemy.maxArmor > 0) {
      ctx.fillStyle = '#142129'
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 5, enemy.radius * 2, 3)
      ctx.fillStyle = enemy.armor > 0 ? '#7fc3df' : '#d66a4f'
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 5, enemy.radius * 2 * Math.max(enemy.armor / enemy.maxArmor, 0), 3)
    }
    if (enemy.elite || enemy.boss || ['sniper', 'medic', 'warden', 'shield', 'commander', 'splitter', 'stealth'].includes(enemy.kind)) {
      const labelWidth = ctx.measureText(enemy.label).width
      const labelY = enemy.y - enemy.radius - 15
      ctx.fillStyle = 'rgba(12, 12, 10, 0.82)'
      ctx.fillRect(enemy.x - labelWidth / 2 - 5, labelY - (compactViewport ? 13 : 11), labelWidth + 10, compactViewport ? 18 : 15)
      if (enemy.affixes.length) {
        ctx.strokeStyle = r5EliteAffixColor(enemy.affixes[0])
        ctx.lineWidth = compactViewport ? 2 : 1
        ctx.strokeRect(enemy.x - labelWidth / 2 - 5, labelY - (compactViewport ? 13 : 11), labelWidth + 10, compactViewport ? 18 : 15)
      }
      ctx.fillStyle = '#f3efe5'
      ctx.fillText(enemy.label, enemy.x, labelY)
    }
  }

  ctx.font = '700 13px Trebuchet MS'
  ctx.textAlign = 'center'
  for (const text of hitTexts) {
    ctx.font = text.critical ? '900 17px Trebuchet MS' : '700 13px Trebuchet MS'
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1)
    if (text.critical) {
      ctx.strokeStyle = 'rgba(27, 18, 8, 0.9)'
      ctx.lineWidth = 4
      ctx.strokeText(text.value, text.x, text.y)
    }
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

function markReplayIssue(issue: string) {
  if (!replayRuntime.running) return
  replayRuntime.issues.add(issue)
  replayUi.message = issue
}

function replayStatus(): ReplayStatus {
  return {
    status: replayUi.status,
    currentLabel: replayUi.currentLabel,
    validSamples: replayRuntime.samples.length,
    rejectedSamples: replayRuntime.rejected.length,
    message: replayUi.message,
    samples: replayRuntime.samples.map((sample) => ({ ...sample })),
    rejected: replayRuntime.rejected.map((sample) => ({ ...sample }))
  }
}

function stopReplay() {
  replayRuntime.running = false
  replayUi.status = 'stopped'
  replayUi.message = '回放已停止；刷新页面可恢复原存档状态'
  keys.clear()
}

function beginReplayAttempt() {
  const entry = replayRuntime.plan[replayRuntime.planIndex]
  const createFixture = replayRuntime.fixtureFactory
  if (!entry || !createFixture) {
    replayRuntime.running = false
    replayUi.status = 'complete'
    replayUi.currentLabel = ''
    replayUi.message = `${replayRuntime.plan.length} 局有效样本完成，剔除并重跑 ${replayRuntime.rejected.length} 局`
    return
  }

  const fixture = structuredClone(createFixture(entry.stage))
  mode.value = 'base'
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  applySaveData(fixture)
  nextEnemyId = 1
  attachmentInstanceCursor = 0
  attachmentAcquireCursor = 0
  replayRuntime.random = createSeededRandom(entry.seed)
  replayRuntime.waypointIndex = 0
  replayRuntime.issues.clear()
  replayRuntime.maxFrameGapMs = 0
  replayRuntime.previousFrameAt = performance.now()
  replayRuntime.wallStartedAt = performance.now()
  replayRuntime.startResources = { ...resources }
  replayUi.status = 'running'
  replayUi.currentLabel = `第 ${entry.stage} 关 · 第 ${entry.run}/3 局 · 尝试 ${replayRuntime.attempt}`
  replayUi.message = `固定种子 ${entry.seed} · ${replayRuntime.speed}× 固定步长`
  if (document.hidden) markReplayIssue('启动时页面处于隐藏状态')
  startStage()
}

function finishReplayAttempt() {
  const entry = replayRuntime.plan[replayRuntime.planIndex]
  const result = lastRun.value
  if (!entry) return
  if (!result) markReplayIssue('结算对象缺失')
  const issueText = [...replayRuntime.issues].join('；')
  const common = {
    ...entry,
    attempt: replayRuntime.attempt,
    valid: Boolean(result) && !issueText,
    result: (result?.victory ? '通关' : '失败') as '通关' | '失败',
    duration: Math.round((result?.stats.duration ?? stageTimer.value) * 1000) / 1000,
    wallDuration: Math.round(((performance.now() - replayRuntime.wallStartedAt) / 1000) * 1000) / 1000,
    inputOrSamplingIssue: issueText || '无',
    maxFrameGapMs: Math.round(replayRuntime.maxFrameGapMs * 100) / 100
  }
  let sample: ReplaySample
  if (replayRuntime.mode === 'r5') {
    const telemetry = result?.stats.r4Telemetry ?? emptyR5CombatTelemetry()
    const profile = replayRuntime.buildProfileFactory?.(entry.stage) ?? { id: 'unknown', expectedDps: 0, expectedMaxHp: 0 }
    const goldIncome = resources.gold - replayRuntime.startResources.gold
    const alloyIncome = resources.alloy - replayRuntime.startResources.alloy
    const partsIncome = resources.parts - replayRuntime.startResources.parts
    const reforgeSupport = supportedRareReforges(goldIncome, alloyIncome)
    sample = {
      ...common,
      waveDurations: (result?.stats.waves ?? []).map((wave) => ({ wave: wave.wave, label: wave.label, duration: Math.round(wave.duration * 1000) / 1000, cleared: wave.cleared })),
      deathCombination: result?.victory ? '—' : result?.stats.deathCombination || `第 ${currentWave.value} 波生命归零`,
      affixCombinations: { ...telemetry.affixCombinations },
      deathZoneHits: telemetry.deathZoneHits,
      trackingZoneHits: telemetry.trackingZoneHits,
      armorRecovered: Math.round(telemetry.armorRecovered * 100) / 100,
      coordinationCoverageSeconds: Math.round(telemetry.coordinationCoverageSeconds * 1000) / 1000,
      shieldLinkSeconds: Math.round(telemetry.shieldLinkSeconds * 1000) / 1000,
      commandPulseSeconds: Math.round(telemetry.commandPulseSeconds * 1000) / 1000,
      suppressionHits: telemetry.suppressionHits,
      bossPhaseReached: telemetry.bossPhaseReached,
      eliteKillDurations: telemetry.eliteKillDurations.map((duration) => Math.round(duration * 1000) / 1000),
      goldIncome,
      alloyIncome,
      partsIncome,
      unlockedReforges: reforgeSupport.unlocked,
      lockedReforges: reforgeSupport.locked,
      buildProfileId: profile.id,
      buildExpectedDps: profile.expectedDps,
      buildExpectedMaxHp: profile.expectedMaxHp ?? 0
    } as R5ReplaySample
  } else if (replayRuntime.mode === 'r4') {
    const telemetry = result?.stats.r4Telemetry ?? emptyR5CombatTelemetry()
    const profile = replayRuntime.buildProfileFactory?.(entry.stage) ?? { id: 'unknown', expectedDps: 0 }
    sample = {
      ...common,
      waveDurations: (result?.stats.waves ?? []).map((wave) => ({ wave: wave.wave, label: wave.label, duration: Math.round(wave.duration * 1000) / 1000, cleared: wave.cleared })),
      deathCombination: result?.victory ? '—' : result?.stats.deathCombination || `第 ${currentWave.value} 波生命归零`,
      affixCombinations: { ...telemetry.affixCombinations },
      deathZoneHits: telemetry.deathZoneHits,
      armorRecovered: Math.round(telemetry.armorRecovered * 100) / 100,
      coordinationCoverageSeconds: Math.round(telemetry.coordinationCoverageSeconds * 1000) / 1000,
      eliteKillDurations: telemetry.eliteKillDurations.map((duration) => Math.round(duration * 1000) / 1000),
      buildProfileId: profile.id,
      buildExpectedDps: profile.expectedDps
    } as R4ReplaySample
  } else {
    const goldIncome = resources.gold - replayRuntime.startResources.gold
    const alloyIncome = resources.alloy - replayRuntime.startResources.alloy
    const partsIncome = resources.parts - replayRuntime.startResources.parts
    const reforgeSupport = supportedRareReforges(goldIncome, alloyIncome)
    sample = {
      ...common,
      goldIncome,
      alloyIncome,
      partsIncome,
      unlockedReforges: reforgeSupport.unlocked,
      lockedReforges: reforgeSupport.locked,
      deathReason: result?.victory ? '—' : result?.stats.deathCombination || `第 ${currentWave.value} 波生命归零`,
      inventoryCount: inventory.value.length,
      protectedOverflow: inventoryOverCapacity.value
    } as R3ReplaySample
  }

  if (!sample.valid) {
    replayRuntime.rejected.push(sample)
    replayUi.rejectedSamples = replayRuntime.rejected.length
    replayRuntime.attempt += 1
    if (replayRuntime.attempt > 5) {
      replayRuntime.running = false
      replayUi.status = 'error'
      replayUi.message = `${replayUi.currentLabel} 连续 5 次无效，批次停止`
      return
    }
    replayUi.message = `样本无效并自动重跑：${sample.inputOrSamplingIssue}`
    beginReplayAttempt()
    return
  }

  replayRuntime.samples.push(sample)
  replayUi.validSamples = replayRuntime.samples.length
  replayRuntime.planIndex += 1
  replayRuntime.attempt = 1
  replayUi.message = `${sample.result} · ${sample.duration.toFixed(3)} 秒`
  beginReplayAttempt()
}

function prepareReplay(mode: 'r3' | 'r4' | 'r5', plan: ReplayPlanEntry[], options: ReplayBatchOptions) {
  replayRuntime.mode = mode
  replayRuntime.plan = plan
  replayRuntime.planIndex = 0
  replayRuntime.attempt = 1
  replayRuntime.speed = clamp(Math.round(options.speed ?? 12), 1, 60)
  replayRuntime.samples = []
  replayRuntime.rejected = []
  replayRuntime.running = true
  replayPersistenceSuppressed = true
  replayUi.phaseLabel = mode.toUpperCase()
  replayUi.targetSamples = plan.length
  replayUi.validSamples = 0
  replayUi.rejectedSamples = 0
  keys.clear()
  beginReplayAttempt()
}

async function startR3Replay(options: ReplayBatchOptions = {}) {
  if (!import.meta.dev) throw new Error('R3 回放器仅在开发/测试环境可用')
  if (replayRuntime.running) throw new Error('R3 回放批次已在运行')
  replayUi.visible = true
  replayUi.status = 'loading'
  replayUi.message = '正在载入 R2 固定构筑夹具'
  const fixtures = await import('~/tests/fixtures/r2')
  replayRuntime.fixtureFactory = (targetStage) => fixtures.createR2BalanceSave(targetStage as Parameters<typeof fixtures.createR2BalanceSave>[0]) as SaveData
  replayRuntime.buildProfileFactory = null
  prepareReplay('r3', createR3ReplayPlan(options.baseSeed), options)
}

async function startR4Replay(options: ReplayBatchOptions = {}) {
  if (!import.meta.dev) throw new Error('R4 回放器仅在开发/测试环境可用')
  if (replayRuntime.running) throw new Error('回放批次已在运行')
  replayUi.visible = true
  replayUi.status = 'loading'
  replayUi.message = '正在载入 R4 四段固定构筑夹具'
  const fixtures = await import('~/tests/fixtures/r4')
  replayRuntime.fixtureFactory = (targetStage) => fixtures.createR4BalanceSave(targetStage as Parameters<typeof fixtures.createR4BalanceSave>[0]) as SaveData
  replayRuntime.buildProfileFactory = (targetStage) => {
    const profile = fixtures.getR4BuildProfile(targetStage)
    return { id: profile.id, expectedDps: profile.expectedDps }
  }
  prepareReplay('r4', createR4ReplayPlan(options.baseSeed), options)
}

async function startR5Replay(options: ReplayBatchOptions = {}) {
  if (!import.meta.dev) throw new Error('R5 回放器仅在开发/测试环境可用')
  if (replayRuntime.running) throw new Error('回放批次已在运行')
  replayUi.visible = true
  replayUi.status = 'loading'
  replayUi.message = '正在载入 R5 八节点长期构筑夹具'
  const fixtures = await import('~/tests/fixtures/r5')
  replayRuntime.fixtureFactory = (targetStage) => fixtures.createR5BalanceSave(targetStage as Parameters<typeof fixtures.createR5BalanceSave>[0]) as SaveData
  replayRuntime.buildProfileFactory = (targetStage) => {
    const profile = fixtures.getR5BuildProfile(targetStage)
    return { id: profile.id, expectedDps: profile.expectedDps, expectedMaxHp: profile.expectedMaxHp }
  }
  prepareReplay('r5', createR5ReplayPlan(options.baseSeed), options)
}

function handleReplayBlur() {
  markReplayIssue('窗口失焦')
}

function handleReplayVisibility() {
  if (document.hidden) markReplayIssue('页面隐藏')
}

function loop(now: number) {
  if (replayRuntime.running) {
    const frameGapMs = Math.max(0, now - replayRuntime.previousFrameAt)
    replayRuntime.previousFrameAt = now
    replayRuntime.maxFrameGapMs = Math.max(replayRuntime.maxFrameGapMs, frameGapMs)
    if (frameGapMs > 1000) markReplayIssue(`帧输入中断 ${Math.round(frameGapMs)}ms`)
    for (let step = 0; step < replayRuntime.speed; step += 1) {
      update(R3_REPLAY_FIXED_DELTA)
      if (mode.value === 'settlement') {
        finishReplayAttempt()
        break
      }
    }
    lastTime = now
  } else {
    const delta = Math.min((now - lastTime) / 1000 || 0, 0.05)
    lastTime = now
    update(delta)
  }
  draw()
  animationFrame = requestAnimationFrame(loop)
}

function resetRunState(restoreHp = true) {
  kills.value = 0
  bountyTargetKills.value = 0
  spawnedEnemyCount.value = 0
  currentWave.value = 1
  waveSpawnedCount.value = 0
  waveTransitionSeconds.value = 0
  waveTransitionPending.value = false
  stageTimer.value = 0
  waveStartTime = 0
  spawnTimer = 0
  overloadTimer = 0
  dashTimer = 0
  eliteSetBuffTimer = 0
  dualMoveBuffTimer = 0
  phaseDodgeCooldown = 0
  lastStandBuffTimer = 0
  lastStandCooldown = 0
  blackHoleTimer = 8
  stationarySeconds = 0
  fortressShield = 0
  shotsFiredThisRun = 0
  stormHitCounter = 0
  quantumShotActive = false
  lifestealWindowSeconds = 1
  lifestealRecoveredInWindow = 0
  movementIdleSeconds = 0
  hasMovedThisRun = false
  postBattleChoiceTaken.value = false
  clearTouchMovement()
  sustainedFireStacks = 0
  lastLockedTargetId = 0
  lockedTargetHits = 0
  weaponAmmo.value = weapon.magazineSize
  weaponReloadTimer.value = 0
  weaponChargeTimer.value = 0
  weaponCharging.value = false
  bossSpawned = false
  upgradeTakenForStage.value = 0
  upgradeChoices.value = []
  enemies.splice(0)
  bullets.splice(0)
  enemyProjectiles.splice(0)
  enemyHazards.splice(0)
  drops.splice(0)
  afterimages.splice(0)
  hitTexts.splice(0)
  damageEvents.splice(0)
  waveRecords.splice(0)
  recordedWaveIndexes.clear()
  runStats.currentDps = 0
  runStats.peakDps = 0
  runStats.totalDamage = 0
  runStats.highestHit = 0
  runStats.goldEarned = 0
  runStats.expEarned = 0
  runStats.hitCount = 0
  runStats.damageTaken = 0
  runStats.lifestealHealing = 0
  runStats.heavyPierceDamage = 0
  runStats.criticalTriggers = 0
  runStats.criticalExtraDamage = 0
  runStats.dodgedCharges = 0
  runStats.totalChargeAttempts = 0
  runStats.deathCombination = ''
  Object.assign(r4Telemetry, emptyR5CombatTelemetry())
  bossHud.visible = false
  damageDirection.life = 0
  killNotice.value = ''
  killNoticeTimer = 0
  for (const skill of skills) skill.cooldown = 0
  if (restoreHp) {
    player.hp = player.maxHp
    player.armor = player.maxArmor
  }
  playerPoisonSeconds = 0
  playerPoisonDps = 0
  playerChillSeconds = 0
  supportWeaponTimer = 0
  player.vx = 0
  player.vy = 0
  movePlayerToAreaCenter()
  clearCombatFeedback()
}

function clearCombatFeedback() {
  screenShake = 0
  playerHitFlash = 0
  damageDirection.life = 0
  bossHud.visible = false
}

function startStage() {
  startStageWithHealth(true)
}

function startStageWithHealth(restoreHp: boolean) {
  if (inventoryOverCapacity.value) {
    bannerText.value = '背包超出容量，请先返回基地整理受保护配件'
    return
  }
  const nextOperation = replayRuntime.running ? 'campaign' : selectedOperationMode.value
  if (!debugStageSelection && !operationUnlocked(nextOperation, highestCleared.value)) {
    bannerText.value = operationUnlockText(nextOperation)
    selectedOperationMode.value = 'campaign'
    return
  }
  activeOperationMode.value = nextOperation
  applyBaseStats()
  resetRunState(restoreHp)
  mode.value = 'battle'
  announceBanner(`${getOperationDefinition(activeOperationMode.value).shortLabel} · 第 1 波 · ${currentWaveDefinition.value?.label}`, 'normal')
  playSound('wave')
}

function returnToBase() {
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  stageDraft.value = stage.value
  applyBaseStats()
  resetRunState()
  mode.value = 'base'
  saveGame()
}

function advanceAndStart() {
  if (inventoryOverCapacity.value) {
    bannerText.value = '背包超出容量，请先返回基地整理受保护配件'
    return
  }
  if (!canAdvanceToNextStage.value) return
  stage.value = nextStageAfterVictory(stage.value, true, debugStageSelection)
  stageDraft.value = stage.value
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  saveGame()
  startStageWithHealth(false)
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
  cloud.initialize()
  void refreshLiveOps()
  watch(stage, (value) => {
    stageDraft.value = value
  })
  watch([stage, inventory, () => ({ ...attachmentAcquireOrder }), () => ({ ...resources }), () => ({ ...base }), () => ({ level: player.level, exp: player.exp, hp: player.hp }), () => equippedParts.map(attachmentKey)], saveGame, { deep: true })
  watch(bannerText, (text) => {
    if (!text) return
    window.setTimeout(() => {
      if (bannerText.value === text) bannerText.value = ''
    }, 1500)
  })
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  if (import.meta.dev) {
    window.__gunfightR3Replay = { start: startR3Replay, stop: stopReplay, getStatus: replayStatus }
    window.__gunfightR4Replay = { start: startR4Replay, stop: stopReplay, getStatus: replayStatus }
    window.__gunfightR5Replay = { start: startR5Replay, stop: stopReplay, getStatus: replayStatus }
    window.addEventListener('blur', handleReplayBlur)
    document.addEventListener('visibilitychange', handleReplayVisibility)
    const params = new URLSearchParams(window.location.search)
    if (params.get('r3-replay') === '1') {
      const speed = Number(params.get('speed')) || 12
      const baseSeed = Number(params.get('seed')) || undefined
      void startR3Replay({ speed, baseSeed }).catch((error: unknown) => {
        replayRuntime.running = false
        replayUi.visible = true
        replayUi.status = 'error'
        replayUi.message = error instanceof Error ? error.message : String(error)
      })
    }
    if (params.get('r4-replay') === '1') {
      const speed = Number(params.get('speed')) || 12
      const baseSeed = Number(params.get('seed')) || undefined
      void startR4Replay({ speed, baseSeed }).catch((error: unknown) => {
        replayRuntime.running = false
        replayUi.visible = true
        replayUi.status = 'error'
        replayUi.message = error instanceof Error ? error.message : String(error)
      })
    }
    if (params.get('r5-replay') === '1') {
      const speed = Number(params.get('speed')) || 12
      const baseSeed = Number(params.get('seed')) || undefined
      void startR5Replay({ speed, baseSeed }).catch((error: unknown) => {
        replayRuntime.running = false
        replayUi.visible = true
        replayUi.status = 'error'
        replayUi.message = error instanceof Error ? error.message : String(error)
      })
    }
  }
  animationFrame = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
  if (import.meta.dev) {
    window.removeEventListener('blur', handleReplayBlur)
    document.removeEventListener('visibilitychange', handleReplayVisibility)
    delete window.__gunfightR3Replay
    delete window.__gunfightR4Replay
    delete window.__gunfightR5Replay
  }
})

  return {
    canvasRef, mode, highestCleared, replayUi, replayResultsJson, bannerText, bannerTone,
    resources, returnToBase, player, hpPercent, damagePreview, kills, targetKills,
    nextLevelExp, runStats, currentWave, totalWaves, currentWaveDefinition, wavePlan,
    waveStatusText, bossHud, damageDirection, killNotice, elapsedSeconds, formatClock,
    skills, useSkill, upgradeChoices, chooseUpgrade,
    combatPower, fireRatePreview, nextEnemyPreview, stageType, adjustStage, stageDraft,
    selectedOperationMode, operationDefinition, operationOptions, selectOperation,
    operationObjectiveText, operationProgressText, operationTimeRemaining, isIndependentOperation,
    maxSelectableStage, commitStageDraft, debugStageSelection, stageRewardPreview,
    dropProfile, inventoryOverCapacity, startStage, stageLabel, expToNextLevel,
    expPercent, characterStats, isSaleMode, attachmentSwapLabel, inventoryNearCapacity,
    inventoryCapacityLabel, favoriteAttachmentCount, filteredInventory, inventory,
    toggleSaleMode, selectedInventorySort, inventorySortOptions, inventoryFilterOptions,
    selectedInventoryFilter, selectedRarity, attachmentRarityFilters, inventoryByRarity,
    selectedBuildTag, attachmentBuildTags, buildAttachmentTags, recycleAttachmentValue,
    selectedSlot, attachmentSlotFilters, inventoryBySlot, saleItems, saleReward,
    sellableFilteredInventory, toggleFilteredSaleSelection, allFilteredSelected,
    clearSaleSelection, sellSelectedAttachments, attachmentKey, isSaleSelected,
    selectedAttachment, selectedEquippedAttachment, selectEquippedAttachment, sameAttachment, canSwapAttachment, handleInventoryItemClick,
    equipmentIconStyle, attachmentSlots, formatRoll, attachmentDecisionFor,
    attachmentDimensionsFor, selectedAttachmentDimensions, canEquipAttachment,
    isReforgeAffixLocked, toggleReforgeAffixLock, formatAffix, reforgeShortageText,
    formatReforgeCost, currentAttachmentFor, attachmentComparisonFor,
    equipInventoryAttachment, toggleAttachmentFavorite, canUpgradeAttachment,
    upgradeInventoryAttachment, attachmentUpgradeCost, canReforgeAttachment,
    reforgeInventoryAttachment, overflowSalvageNotice, equipmentLeftSlots,
    equipmentRightSlots, equippedParts, activeEquippedParts, activeEquipmentLabel, isAttachmentActive, weapon, lastRun, formatPreciseClock,
    formatEnemyKinds, lastRunStrategyInsights, settlementLootTone, settlementLootLabel,
    isAttachmentInInventory, isAttachmentEquipped, settlementLootStatus,
    equipSettlementAttachment, settlementEquipNotice, postBattleChoices,
    choosePostBattle, postBattleChoiceTaken, canAdvanceToNextStage, advanceAndStart, weaponOptions, equipWeapon, weaponAmmo, weaponReloadTimer, weaponChargeTimer, weaponCharging,
    currentWeaponProgress, currentWeaponUpgradeCost, currentWeaponStarCost, upgradeCurrentWeapon, starCurrentWeapon,
    supportWeaponOptions, selectedSupportWeaponKey, equipSupportWeapon, breakthroughCurrentWeapon, reforgeCurrentWeapon, openWeaponCrate,
    weaponBreakthroughCost, weaponReforgeCost,
    talentCards,
    talentPointsTotal, talentPointsSpent, talentPointsAvailable, upgradeTalent,
    setProgress, pendingOfflineReward, claimOfflineReward, dailyTasks, weeklyTasks, achievements,
    completedDailyTasks, completedWeeklyTasks, completedAchievements, claimDailyTask, claimTask, dropPity,
    canRedeemMythicShards, redeemMythicShards,
    advancedResources, skillProgress, skillUpgradeCost, upgradeSkill, skillBuildLinks,
    shopState, shopOffers, buyShopOffer, seasonState, currentSeasonTier,
    attachmentStarCost, canStarAttachment, starAttachment,
    attachmentBreakthroughCost, canBreakthroughAttachment, breakthroughAttachment,
    cloudSyncState, cloudUsername, cloudPassword, cloudHasSession, cloudConflict,
    cloudLogin, cloudRegister, cloudLogout, syncCloudSave, keepLocalCloudSave, useRemoteCloudSave,
    onlineLiveOps, leaderboardMetrics, leaderboardMetric, onlineLeaderboard, onlineCurrentRank, onlineSeasonStatus, refreshLeaderboard, syncOnlineSeason,
    showMovementHint, touchMovement, setTouchMovement, clearTouchMovement
  }
}

export type GameCanvasContext = ReturnType<typeof useGameCanvas>
