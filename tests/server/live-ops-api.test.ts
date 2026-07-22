import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3Mocks = vi.hoisted(() => ({ getQuery: vi.fn() }))
const databaseMocks = vi.hoisted(() => ({ ensureCloudSchema: vi.fn(), query: vi.fn() }))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return { ...actual, getQuery: h3Mocks.getQuery }
})
vi.mock('../../server/utils/auth', () => ({ requireCloudUser: () => ({ sub: 'user-1', username: 'player_1' }) }))
vi.mock('../../server/utils/database', () => ({ ensureCloudSchema: databaseMocks.ensureCloudSchema, database: () => ({ query: databaseMocks.query }) }))
vi.mock('../../server/utils/validation', () => ({ isValidCloudSavePayload: () => true }))

import liveOpsHandler from '../../server/api/live-ops.get'
import leaderboardHandler from '../../server/api/leaderboard.get'
import submitSeasonHandler from '../../server/api/season/submit.post'

const event = {} as never

describe('联网赛季 API', () => {
  beforeEach(() => {
    databaseMocks.ensureCloudSchema.mockReset().mockResolvedValue(undefined)
    databaseMocks.query.mockReset()
    h3Mocks.getQuery.mockReset()
  })

  it('活动日历由服务端时间生成并携带赛季边界', async () => {
    const result = await liveOpsHandler(event)
    expect(result.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.season.id).toMatch(/^S\d{2}-联合作战$/)
    expect(result.activity.startsAt).toMatch(/Z$/)
  })

  it('赛季提交从云存档提取成绩并执行单调最佳值 upsert', async () => {
    databaseMocks.query
      .mockResolvedValueOnce({ rows: [{ payload: { saveVersion: 9, highestCleared: 1234, season: { bestBountySeconds: 31.2, bestSurvivalKills: 99, score: 7654 } } }] })
      .mockResolvedValueOnce({ rows: [{ highest_stage: 1234, best_bounty_ms: 31200, survival_kills: 99, event_score: 7654, updated_at: new Date('2026-07-23T00:00:00Z') }] })

    const result = await submitSeasonHandler(event)

    expect(databaseMocks.query).toHaveBeenNthCalledWith(2, expect.stringContaining('GREATEST(gunfight_season_scores.highest_stage'), ['user-1', expect.stringMatching(/^S\d{2}-联合作战$/), 1234, 31200, 99, 7654])
    expect(result.score).toEqual({ highestStage: 1234, bestBountyMs: 31200, survivalKills: 99, eventScore: 7654 })
  })

  it('排行榜只使用白名单指标并同时返回 Top 50 与本人名次', async () => {
    h3Mocks.getQuery.mockReturnValue({ metric: 'highest-stage; DROP TABLE gunfight_users' })
    databaseMocks.query.mockResolvedValue({ rows: [
      { user_id: 'user-2', username: 'leader', score: 9000, rank: 1 },
      { user_id: 'user-1', username: 'player_1', score: 1234, rank: 88 }
    ] })

    const result = await leaderboardHandler(event)

    expect(result.metric).toBe('event-score')
    expect(result.entries).toEqual([{ username: 'leader', score: 9000, rank: 1, currentUser: false }])
    expect(result.currentRank).toBe(88)
    expect(databaseMocks.query.mock.calls[0][0]).toContain('scores.event_score')
    expect(databaseMocks.query.mock.calls[0][0]).not.toContain('DROP TABLE')
    expect(databaseMocks.query.mock.calls[0][0]).toContain('ROW_NUMBER()')
    expect(databaseMocks.query.mock.calls[0][0]).toContain('rank <= 50 OR user_id = $2')
  })

  it.each([
    ['highest-stage', 'highest_stage', 'DESC'],
    ['bounty-time', 'best_bounty_ms', 'ASC'],
    ['survival-kills', 'survival_kills', 'DESC'],
    ['event-score', 'event_score', 'DESC']
  ])('%s 使用固定列与排序方向', async (metric, column, direction) => {
    h3Mocks.getQuery.mockReturnValue({ metric })
    databaseMocks.query.mockResolvedValue({ rows: [] })

    await leaderboardHandler(event)

    const sql = String(databaseMocks.query.mock.calls[0][0])
    expect(sql).toContain(`scores.${column}`)
    expect(sql).toContain(`scores.${column} ${direction}`)
    if (metric === 'bounty-time') expect(sql).toContain('best_bounty_ms IS NOT NULL')
  })
})
