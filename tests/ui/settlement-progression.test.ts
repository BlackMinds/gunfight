import { createApp, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GameSettlementPanel from '../../components/game/canvas/GameSettlementPanel.vue'

let currentContext: ReturnType<typeof createContext>

vi.mock('../../composables/game/gameCanvasContext', () => ({
  useGameCanvasContext: () => currentContext
}))

function createContext(canAdvance: boolean, objectiveSummary?: string) {
  return {
    mode: ref('settlement'),
    lastRun: ref({ title: '终局结算', body: '测试结算', objectiveSummary, victory: true }),
    formatPreciseClock: vi.fn(),
    formatEnemyKinds: vi.fn(),
    overflowSalvageNotice: ref(null),
    lastRunStrategyInsights: ref([]),
    attachmentKey: vi.fn(),
    settlementLootTone: vi.fn(),
    settlementLootLabel: vi.fn(),
    currentAttachmentFor: vi.fn(),
    isAttachmentInInventory: vi.fn(),
    attachmentDecisionFor: vi.fn(),
    attachmentDimensionsFor: vi.fn(() => []),
    isAttachmentEquipped: vi.fn(),
    attachmentComparisonFor: vi.fn(() => []),
    settlementLootStatus: vi.fn(),
    canEquipAttachment: vi.fn(),
    weapon: ref({ slotCount: 8 }),
    equipSettlementAttachment: vi.fn(),
    settlementEquipNotice: ref(null),
    postBattleChoices: ref([]),
    choosePostBattle: vi.fn(),
    postBattleChoiceTaken: ref(false),
    returnToBase: vi.fn(),
    inventoryOverCapacity: ref(false),
    canAdvanceToNextStage: ref(canAdvance),
    isIndependentOperation: ref(false),
    operationDefinition: ref({ id: 'campaign', shortLabel: '主线' }),
    advanceAndStart: vi.fn(),
    startStage: vi.fn()
  }
}

let app: App | null = null
let host: HTMLElement | null = null

async function mountSettlement() {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(GameSettlementPanel)
  app.mount(host)
  await nextTick()
  return host
}

beforeEach(() => {
  currentContext = createContext(true)
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('结算关卡推进', () => {
  it('未到正式上限时保留直接下一关操作', async () => {
    const root = await mountSettlement()
    const advance = root.querySelector<HTMLButtonElement>('[data-testid="advance-next-stage"]')

    expect(advance?.disabled).toBe(false)
    advance?.click()
    expect(currentContext.advanceAndStart).toHaveBeenCalledTimes(1)
  })

  it('到达第 10000 关后显示终局上限且不提供下一关操作', async () => {
    currentContext = createContext(false)
    const root = await mountSettlement()
    const cap = root.querySelector<HTMLButtonElement>('[data-testid="stage-cap-reached"]')

    expect(cap?.disabled).toBe(true)
    expect(cap?.textContent).toContain('已达第 10000 关上限')
    expect(root.querySelector('[data-testid="advance-next-stage"]')).toBeNull()
  })

  it('独立行动结算展示目标和首通奖励摘要', async () => {
    currentContext = createContext(true, '战区突袭首通：赛季积分 +100、能量核心 +1')
    const root = await mountSettlement()

    expect(root.querySelector('[data-testid="operation-objective-summary"]')?.textContent).toContain('能量核心 +1')
  })
})
