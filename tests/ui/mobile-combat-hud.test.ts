import { createApp, nextTick, reactive, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GameCombatHud from '../../components/game/canvas/GameCombatHud.vue'

let currentContext: ReturnType<typeof createContext>

vi.mock('../../composables/game/gameCanvasContext', () => ({
  useGameCanvasContext: () => currentContext
}))

function createContext() {
  const touchMovement = reactive({ x: 0, y: 0 })
  const setTouchMovement = vi.fn((x: number, y: number) => {
    const length = Math.hypot(x, y)
    touchMovement.x = length > 0.05 ? x / Math.max(1, length) : 0
    touchMovement.y = length > 0.05 ? y / Math.max(1, length) : 0
  })
  const clearTouchMovement = vi.fn(() => {
    touchMovement.x = 0
    touchMovement.y = 0
  })

  return {
    mode: ref('battle'),
    resources: reactive({ gold: 0, alloy: 0 }),
    returnToBase: vi.fn(),
    player: reactive({ level: 1, hp: 100, maxHp: 100, exp: 0 }),
    hpPercent: ref(100),
    damagePreview: ref(10),
    kills: ref(0),
    targetKills: ref(10),
    nextLevelExp: ref(100),
    runStats: reactive({ currentDps: 0 }),
    currentWave: ref(1),
    totalWaves: ref(1),
    currentWaveDefinition: ref({ label: '测试波次' }),
    wavePlan: ref([]),
    waveStatusText: ref('交战中'),
    nextEnemyPreview: ref({ stageBandLabel: '终局战争', eliteAffixCount: 4, bossPhaseCount: 5 }),
    bossHud: reactive({ visible: false, phaseLabel: '', label: '', hpPercent: 0, hp: 0, maxHp: 0 }),
    damageDirection: reactive({ life: 0, angle: 0 }),
    killNotice: ref(''),
    elapsedSeconds: ref(0),
    formatClock: () => '00:00',
    skills: ref([]),
    useSkill: vi.fn(),
    upgradeChoices: ref([
      { tag: '生存', name: '应急护盾', desc: '获得临时护盾。', comparison: '护盾 +20%' }
    ]),
    chooseUpgrade: vi.fn(),
    weapon: reactive({ name: '测试武器', element: '动能', magazineSize: 10 }),
    weaponAmmo: ref(10),
    weaponReloadTimer: ref(0),
    weaponChargeTimer: ref(0),
    weaponCharging: ref(false),
    showMovementHint: ref(false),
    touchMovement,
    setTouchMovement,
    clearTouchMovement
  }
}

let app: App | null = null
let host: HTMLElement | null = null

async function mountHud() {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(GameCombatHud)
  app.mount(host)
  await nextTick()
  return host
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

beforeEach(() => {
  currentContext = createContext()
})

describe('移动端战斗 HUD', () => {
  it('以单行摘要呈现高关战区、词缀数和 Boss 阶段', async () => {
    const root = await mountHud()
    const intel = root.querySelector<HTMLElement>('[data-testid="combat-stage-intel"]')
    expect(intel?.textContent).toContain('终局战争')
    expect(intel?.textContent).toContain('4 词缀')
    expect(intel?.textContent).toContain('Boss 5 阶段')
  })

  it('升级选择出现时让角色 HUD 退出点击层，并将完整卡片作为模态选择项', async () => {
    const root = await mountHud()
    const panel = root.querySelector<HTMLElement>('[data-testid="upgrade-choice-panel"]')
    const choice = root.querySelector<HTMLButtonElement>('[data-testid="upgrade-choice"]')

    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.getAttribute('aria-modal')).toBe('true')
    expect(root.querySelector('.hud-left')?.classList.contains('is-upgrade-obscured')).toBe(true)
    expect(choice).not.toBeNull()

    choice!.click()
    expect(currentContext.chooseUpgrade).toHaveBeenCalledTimes(1)
  })

  it('摇杆捕获后持续保留移动向量，忽略第二触点，并在抬起时立即归零', async () => {
    const root = await mountHud()
    const joystick = root.querySelector<HTMLElement>('[data-testid="mobile-joystick"]')!
    joystick.getBoundingClientRect = () => ({
      x: 16, y: 690, left: 16, top: 690, right: 152, bottom: 826, width: 136, height: 136,
      toJSON: () => ({})
    })
    joystick.setPointerCapture = vi.fn()
    joystick.hasPointerCapture = vi.fn(() => true)
    joystick.releasePointerCapture = vi.fn()

    joystick.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 132, clientY: 758 }))
    await nextTick()
    expect(currentContext.touchMovement.x).toBeGreaterThan(0.7)
    expect(currentContext.touchMovement.y).toBe(0)
    expect(joystick.classList.contains('active')).toBe(true)

    const heldX = currentContext.touchMovement.x
    joystick.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 8, clientX: 84, clientY: 710 }))
    await nextTick()
    expect(currentContext.touchMovement.x).toBe(heldX)
    expect(currentContext.touchMovement.y).toBe(0)

    joystick.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 132, clientY: 758 }))
    await nextTick()
    expect(currentContext.touchMovement).toEqual({ x: 0, y: 0 })
    expect(currentContext.clearTouchMovement).toHaveBeenCalledTimes(1)
    expect(joystick.classList.contains('active')).toBe(false)
  })
})
