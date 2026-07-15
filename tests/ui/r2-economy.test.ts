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
})

describe('R2 经济闭环 UI 注入', () => {
  it('注入 30 件时展示 6 件自动回收明细，出售全选跳过 6 件收藏', async () => {
    const host = await mountGame(createR2InventorySave({ count: 30, favoriteIndexes: [24, 25, 26, 27, 28, 29] }))

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
    const target = attachmentShell(host, 'r2-item-23')
    query<HTMLButtonElement>(target, '[data-testid="favorite-toggle"]').click()
    await nextTick()

    const savedAfterFavorite = JSON.parse(localStorage.getItem(GAME_SAVE_KEY)!) as GameSaveFixture
    expect(savedAfterFavorite.inventory.find((item) => item.id === 'r2-item-23')?.favorite).toBe(true)

    unmountGame()
    host = await mountGame()
    expect(query<HTMLButtonElement>(attachmentShell(host, 'r2-item-23'), '[data-testid="favorite-toggle"]').textContent).toContain('取消收藏')
    query<HTMLButtonElement>(host, '[data-testid="sale-mode-toggle"]').click()
    await nextTick()
    expect(query<HTMLButtonElement>(attachmentShell(host, 'r2-item-23'), '[data-testid="inventory-item-button"]').disabled).toBe(true)
  })

  it('注入 25 件后锁定副词条会显示零件、金币、合金三项缺口并阻止重铸', async () => {
    const host = await mountGame(createR2InventorySave({ count: 25, favoriteIndexes: [24] }))
    const target = attachmentShell(host, 'r2-item-24')
    const lockButton = query<HTMLButtonElement>(target, '[data-testid="affix-lock"]')
    lockButton.click()
    await nextTick()

    expect(lockButton.getAttribute('aria-pressed')).toBe('true')
    const shortage = query(target, '[data-testid="reforge-cost-status"]').textContent ?? ''
    expect(shortage).toContain('零件差 9')
    expect(shortage).toContain('金币差 142')
    expect(shortage).toContain('合金差 3')
    expect(query<HTMLButtonElement>(target, '[data-testid="reforge-action"]').disabled).toBe(true)
  })

  it('27 件全部收藏时保持实例并阻断部署与出售', async () => {
    const host = await mountGame(createR2InventorySave({ count: 27, favoriteIndexes: Array.from({ length: 27 }, (_, index) => index) }))

    expect(query(host, '[data-testid="inventory-capacity"]').textContent).toContain('容量 27 / 24 · 收藏 27')
    expect(query(host, '[data-testid="inventory-capacity-blocker"]').textContent).toContain('背包超出容量')
    expect(query<HTMLButtonElement>(host, '[data-testid="deploy-stage"]').disabled).toBe(true)

    query<HTMLButtonElement>(host, '[data-testid="sale-mode-toggle"]').click()
    await nextTick()
    expect(query<HTMLButtonElement>(host, '[data-testid="sale-select-all"]').disabled).toBe(true)
    const disabledInventoryButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-testid="inventory-item-button"]')).filter((button) => button.disabled)
    expect(disabledInventoryButtons).toHaveLength(27)
  })
})
