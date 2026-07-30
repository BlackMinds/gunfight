import { createApp, nextTick, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GameCanvas from '../../components/game/GameCanvas.vue'
import { GAME_SAVE_KEY, createR2InventorySave, serializeGameSave, type GameSaveFixture } from '../fixtures/r2'

vi.mock('../../components/game/Operator3D.vue', () => ({
  default: { name: 'Operator3DStub', render: () => null }
}))

type MountedGame = { app: App; host: HTMLElement }
let mounted: MountedGame | null = null

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`找不到 UI 元素：${selector}`)
  return element
}

function attachmentShell(root: ParentNode, id: string) {
  return query<HTMLElement>(root, `[data-attachment-id="${id}"]`)
}

async function mountGame(fixture?: GameSaveFixture) {
  if (fixture) localStorage.setItem(GAME_SAVE_KEY, serializeGameSave(fixture))
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(GameCanvas)
  mounted = { app, host }
  app.mount(host)
  await nextTick()
  await nextTick()
  return host
}

async function flushPendingPromises(rounds = 12) {
  for (let index = 0; index < rounds; index += 1) await Promise.resolve()
  await nextTick()
}

async function openWorkspace(host: HTMLElement, workspace: 'mission' | 'equipment' | 'growth') {
  query<HTMLButtonElement>(host, `[data-testid="workspace-${workspace}"]`).click()
  await nextTick()
}

function unmountGame() {
  mounted?.app.unmount()
  mounted?.host.remove()
  mounted = null
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})

afterEach(() => {
  unmountGame()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('R2 经济闭环 UI 注入', () => {
  it('未登录时由云端存档门禁阻止进入游戏', async () => {
    const host = await mountGame()
    const gate = query(host, '[data-testid="cloud-access-gate"]')

    expect(gate.textContent).toContain('需要登录后才能进入')
    expect(gate.textContent).toContain('注册或登录云端账号后才能进入游戏')
    expect(host.querySelector('a[href*="local=1"]')).toBeNull()
  })

  it('战斗 HUD 合并击杀与时间，并提供移动端触控摇杆', async () => {
    const host = await mountGame()
    query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]').click()
    await flushPendingPromises()

    expect(query(host, '.wave-command').textContent).toContain('击杀 0/')
    expect(query(host, '.wave-command').textContent).toContain('00:00')
    expect(query(host, '.hud-left .stat-board').textContent).not.toContain('击杀数')
    expect(query(host, '.hud-right').textContent).not.toContain('总伤害')
    expect(query(host, '[data-testid="ranked-run-notice"]').textContent).toContain('本地行动，不计入排行榜')
    expect(query(host, '.mobile-joystick').getAttribute('aria-label')).toBe('触控移动摇杆')
    expect(host.querySelectorAll('.skill-bar button')).toHaveLength(3)
  })

  it('数字小键盘关闭 NumLock 时仍能用 1/2/3 触发技能', async () => {
    const host = await mountGame()
    query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]').click()
    await flushPendingPromises()

    const skillButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.skill-bar button'))
    expect(skillButtons).toHaveLength(3)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', code: 'Numpad1' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'Numpad2' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', code: 'Numpad3' }))
    await nextTick()

    expect(skillButtons.every((button) => button.disabled)).toBe(true)
    expect(skillButtons.every((button) => button.textContent?.includes('秒'))).toBe(true)
  })

  it('登录玩家等待服务端票据后才进入战斗，开票期间禁用重复部署', async () => {
    localStorage.setItem('gunfight-cloud-token', 'test-token')
    localStorage.setItem('gunfight-cloud-user', 'player_1')
    let resolveTicket!: (response: Response) => void
    const pendingTicket = new Promise<Response>((resolve) => {
      resolveTicket = resolve
    })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/cloud-save') return Promise.resolve(new Response(JSON.stringify({ revision: 0, payload: null, savedAt: null }), { status: 200 }))
      if (path === '/api/live-ops') {
        return Promise.resolve(new Response(JSON.stringify({
          serverNow: '2026-07-26T00:00:00.000Z',
          season: { id: 'S01-联合作战', index: 1, startsAt: '2026-07-01T00:00:00.000Z', endsAt: '2026-08-01T00:00:00.000Z' },
          activity: { id: 'boss-hunt', label: '首领猎杀', operation: 'challenge', bonus: '精密元件 +1', startsAt: '2026-07-22T00:00:00.000Z', endsAt: '2026-07-29T00:00:00.000Z' },
          nextActivity: { id: 'bounty-surge', label: '悬赏增援', operation: 'bounty', bonus: '荣誉币 +25%', startsAt: '2026-07-29T00:00:00.000Z' }
        }), { status: 200 }))
      }
      if (path === '/api/ranked-run/start') return pendingTicket
      return Promise.reject(new Error(`unexpected fetch: ${path}`))
    }))
    const host = await mountGame()

    const deploy = query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]')
    deploy.click()
    await nextTick()

    expect(host.querySelector('.wave-command')).toBeNull()
    expect(deploy.disabled).toBe(true)
    expect(deploy.textContent).toContain('正在取得排位票据')
    expect(query(host, '[data-testid="ranked-ticket-pending"]').textContent).toContain('票据后开始')

    resolveTicket(new Response(JSON.stringify({
      runId: 'run-ui-1',
      seasonId: 'S01-联合作战',
      activityId: 'boss-hunt',
      mode: 'campaign',
      stage: 1
    }), { status: 200 }))
    await flushPendingPromises()

    expect(query(host, '.wave-command').textContent).toContain('第 1 /')
    expect(query(host, '[data-testid="ranked-run-notice"]').textContent).toContain('已取得服务端票据')
  })

  it('登录玩家开票失败后明确降级为本地行动并正常进入战斗', async () => {
    localStorage.setItem('gunfight-cloud-token', 'test-token')
    localStorage.setItem('gunfight-cloud-user', 'player_1')
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/cloud-save') return Promise.resolve(new Response(JSON.stringify({ revision: 0, payload: null, savedAt: null }), { status: 200 }))
      if (path === '/api/live-ops') return Promise.reject(new Error('offline live ops'))
      if (path === '/api/ranked-run/start') return Promise.resolve(new Response(JSON.stringify({ statusMessage: '排位行动服务暂时不可用' }), { status: 503 }))
      return Promise.reject(new Error(`unexpected fetch: ${path}`))
    }))
    const host = await mountGame()

    query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]').click()
    await flushPendingPromises()

    const notice = query(host, '[data-testid="ranked-run-notice"]').textContent ?? ''
    expect(notice).toContain('排位票据获取失败')
    expect(notice).toContain('本地行动，不计入排行榜')
    expect(query(host, '.wave-command')).not.toBeNull()
  })

  it('基地按行动、配件、成长分区呈现，并提供独立设置', async () => {
    const host = await mountGame()
    const briefing = query(host, '[data-testid="mission-briefing"]')
    const deploy = query(host, '[data-testid="deploy-stage"]')

    expect(briefing.getAttribute('aria-labelledby')).toBe('mission-briefing-title')
    expect(briefing.querySelector('h2')?.textContent).toContain('部署简报')
    expect(briefing.querySelectorAll('.stage-picker button')).toHaveLength(4)
    expect(briefing.querySelectorAll('.reward-preview article')).toHaveLength(4)
    expect(query(host, '.battlefield').getAttribute('aria-label')).toContain('金色边界')
    expect(deploy).not.toBeNull()
    expect(host.querySelector('.base-backpack')).toBeNull()
    expect(host.querySelector('.progression-panel')).toBeNull()

    await openWorkspace(host, 'equipment')
    expect(query(host, '[data-testid="equipment-workspace"]')).not.toBeNull()
    expect(query(host, '.equipment-dock')).not.toBeNull()
    expect(host.querySelector('[data-testid="mission-workspace"]')).toBeNull()

    await openWorkspace(host, 'growth')
    const progression = query(host, '[data-testid="growth-workspace"]')
    expect(progression.textContent).toContain('军械与行动中枢')
    expect(progression.querySelector('.cloud-auth-form')).toBeNull()
    expect(progression.querySelector('input[autocomplete="username"]')).toBeNull()

    query<HTMLButtonElement>(host, '[data-testid="workspace-settings"]').click()
    await nextTick()
    expect(query(host, '[role="dialog"]').textContent).toContain('账号与云存档')
    const soundSetting = query<HTMLInputElement>(host, '[data-testid="sound-setting"]')
    const motionSetting = query<HTMLInputElement>(host, '[data-testid="motion-setting"]')
    expect(soundSetting.checked).toBe(true)
    soundSetting.click()
    motionSetting.click()
    await nextTick()
    expect(localStorage.getItem('gunfight-setting-sound')).toBe('false')
    expect(query(host, '.game-screen').classList.contains('reduce-motion')).toBe(true)
  })

  it('已装备配件可直接选择并强化', async () => {
    const fixture = createR2InventorySave({ count: 0, resources: { gold: 500, alloy: 10, parts: 50 } })
    fixture.equipped[0].id = 'starter-legacy'
    fixture.equipped[0].subAffixes = []
    const host = await mountGame(fixture)
    await openWorkspace(host, 'equipment')
    query<HTMLButtonElement>(host, '.equipment-manage-trigger').click()
    await nextTick()

    const cultivation = query(host, '[data-testid="equipped-cultivation"]')
    expect(cultivation.textContent).toContain('已装备配件培养')
    expect(cultivation.querySelectorAll('.equipment-affix-locks button')).toHaveLength(3)
    query<HTMLButtonElement>(cultivation, '.equipment-cultivation-actions button').click()
    await nextTick()
    expect(cultivation.textContent).toContain('+1')
    const saved = JSON.parse(localStorage.getItem(GAME_SAVE_KEY)!) as GameSaveFixture
    expect(saved.equipped[0].level).toBe(1)
  })

  it('注入 30 件时展示 6 件自动回收明细，出售全选跳过 6 件收藏', async () => {
    const host = await mountGame(createR2InventorySave({ count: 30, favoriteIndexes: [24, 25, 26, 27, 28, 29] }))
    await openWorkspace(host, 'equipment')

    expect(query(host, '[data-testid="inventory-capacity"]').textContent).toContain('容量 24 / 24 · 收藏 6')
    const overflow = query(host, '[data-testid="overflow-salvage-base"]')
    expect(overflow.textContent).toContain('自动回收 6 件')
    expect(overflow.textContent).toContain('聚束枪口 · R2-01')
    expect(overflow.textContent).toContain('返还金币 +108 / 零件 +0')

    query<HTMLButtonElement>(host, '[data-testid="sale-mode-toggle"]').click()
    await nextTick()
    query<HTMLButtonElement>(host, '[data-testid="sale-select-all"]').click()
    await nextTick()
    expect(query(host, '[data-testid="sale-toolbar"]').textContent).toContain('已选择 18 件')
    expect(query<HTMLButtonElement>(attachmentShell(host, 'r2-item-24'), '[data-testid="inventory-item-button"]').disabled).toBe(true)

    query<HTMLButtonElement>(host, '[data-testid="sale-confirm"]').click()
    await nextTick()
    const saved = JSON.parse(localStorage.getItem(GAME_SAVE_KEY)!) as GameSaveFixture
    expect(saved.inventory).toHaveLength(6)
    expect(saved.inventory.every((item) => item.favorite)).toBe(true)
    expect(saved.resources.gold).toBe(432)
  })

  it('收藏状态保存后重载仍受出售保护', async () => {
    let host = await mountGame(createR2InventorySave({ count: 24, resources: { gold: 500, alloy: 10, parts: 50 } }))
    await openWorkspace(host, 'equipment')
    const target = attachmentShell(host, 'r2-item-23')
    query<HTMLButtonElement>(target, '[data-testid="favorite-toggle"]').click()
    await nextTick()

    const savedAfterFavorite = JSON.parse(localStorage.getItem(GAME_SAVE_KEY)!) as GameSaveFixture
    expect(savedAfterFavorite.inventory.find((item) => item.id === 'r2-item-23')?.favorite).toBe(true)

    unmountGame()
    host = await mountGame()
    await openWorkspace(host, 'equipment')
    expect(query<HTMLButtonElement>(attachmentShell(host, 'r2-item-23'), '[data-testid="favorite-toggle"]').textContent).toContain('取消收藏')
    query<HTMLButtonElement>(host, '[data-testid="sale-mode-toggle"]').click()
    await nextTick()
    expect(query<HTMLButtonElement>(attachmentShell(host, 'r2-item-23'), '[data-testid="inventory-item-button"]').disabled).toBe(true)
  })

  it('注入 25 件后锁定副词条会显示零件、金币、合金三项缺口并阻止重铸', async () => {
    const host = await mountGame(createR2InventorySave({ count: 25, favoriteIndexes: [24] }))
    await openWorkspace(host, 'equipment')
    const target = attachmentShell(host, 'r2-item-24')
    const lockButton = query<HTMLButtonElement>(target, '[data-testid="affix-lock"]')
    lockButton.click()
    await nextTick()

    expect(lockButton.getAttribute('aria-pressed')).toBe('true')
    const shortage = query(target, '[data-testid="reforge-cost-status"]').textContent ?? ''
    expect(shortage).toContain('零件差 10')
    expect(shortage).toContain('金币差 142')
    expect(shortage).toContain('合金差 3')
    expect(query<HTMLButtonElement>(target, '[data-testid="reforge-action"]').disabled).toBe(true)
  })

  it('27 件全部收藏时保持实例并阻断部署与出售', async () => {
    const host = await mountGame(createR2InventorySave({ count: 27, favoriteIndexes: Array.from({ length: 27 }, (_, index) => index) }))

    expect(query(host, '[data-testid="inventory-capacity-blocker"]').textContent).toContain('背包超出容量')
    expect(query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]').disabled).toBe(true)

    await openWorkspace(host, 'equipment')
    expect(query(host, '[data-testid="inventory-capacity"]').textContent).toContain('容量 27 / 24 · 收藏 27')
    query<HTMLButtonElement>(host, '[data-testid="sale-mode-toggle"]').click()
    await nextTick()
    expect(query<HTMLButtonElement>(host, '[data-testid="sale-select-all"]').disabled).toBe(true)
    const disabledInventoryButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-testid="inventory-item-button"]')).filter((button) => button.disabled)
    expect(disabledInventoryButtons).toHaveLength(27)
  })
})
