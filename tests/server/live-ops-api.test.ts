import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3Mocks = vi.hoisted(() => ({ getQuery: vi.fn(), readBody: vi.fn() }))
const databaseMocks = vi.hoisted(() => ({ ensureCloudSchema: vi.fn(), query: vi.fn() }))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return { ...actual, getQuery: h3Mocks.getQuery, readBody: h3Mocks.readBody }
})
vi.mock('../../server/utils/auth', () => ({ requireCloudUser: () => ({ sub: 'user-1', username: 'player_1' }) }))
vi.mock('../../server/utils/database', () => ({
  createUserId: () => 'run-issued-1',
  ensureCloudSchema: databaseMocks.ensureCloudSchema,
  database: () => ({ query: databaseMocks.query })
}))
vi.mock('../../server/utils/validation', () => ({ isValidCloudSavePayload: () => true }))

import liveOpsHandler from '../../server/api/live-ops.get'
import leaderboardHandler from '../../server/api/leaderboard.get'
import submitSeasonHandler from '../../server/api/season/submit.post'
import startRankedRunHandler from '../../server/api/ranked-run/start.post'
import completeRankedRunHandler from '../../server/api/ranked-run/complete.post'
import { rankedRunRulesFor } from '../../shared/game/live-ops'

const event = {} as never

describe('联网赛季 API', () => {
  beforeEach(() => {
    databaseMocks.ensureCloudSchema.mockReset().mockResolvedValue(undefined)
    databaseMocks.query.mockReset()
    h3Mocks.getQuery.mockReset()
    h3Mocks.readBody.mockReset()
  })

  it('活动日历由服务端时间生成并携带赛季边界', async () => {
    const result = await liveOpsHandler(event)
    expect(result.serverNow).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.season.id).toMatch(/^S\d{2}-联合作战$/)
    expect(result.activity.startsAt).toMatch(/Z$/)
  })

  it('赛季同步只读取服务端已经验证的成绩，不再接受云存档注入分数', async () => {
    databaseMocks.query.mockResolvedValueOnce({ rows: [{ highest_stage: 1234, best_bounty_ms: 31200, survival_kills: 99, event_score: 7654, updated_at: new Date('2026-07-23T00:00:00Z') }] })

    const result = await submitSeasonHandler(event)

    expect(databaseMocks.query).toHaveBeenCalledOnce()
    expect(databaseMocks.query).toHaveBeenCalledWith(expect.stringContaining('FROM gunfight_season_scores'), ['user-1', expect.stringMatching(/^S\d{2}-联合作战$/)])
    expect(String(databaseMocks.query.mock.calls[0][0])).not.toContain('gunfight_cloud_saves')
    expect(result.score).toEqual({ highestStage: 1234, bestBountyMs: 31200, survivalKills: 99, eventScore: 7654 })
  })

  it('排位行动由服务端签发并绑定当前赛季、活动、模式与理论击杀上限', async () => {
    h3Mocks.readBody.mockResolvedValue({ mode: 'campaign', stage: 11 })
    databaseMocks.query
      .mockResolvedValueOnce({ rows: [{ highest_stage: 10 }] })
      .mockResolvedValueOnce({ rows: [] })

    const result = await startRankedRunHandler(event)

    expect(result).toMatchObject({ runId: 'run-issued-1', mode: 'campaign', stage: 11, minimumDurationMs: 6000 })
    expect(result.maxKills).toBeGreaterThan(0)
    expect(databaseMocks.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO gunfight_ranked_runs'), [
      'user-1', result.runId, result.seasonId, result.activityId, 'campaign', 11
    ])
  })

  it('排位结算原子消费一次性行动并写入服务端赛季成绩', async () => {
    const kills = rankedRunRulesFor(11, 'campaign').maxKills
    h3Mocks.readBody.mockResolvedValue({ runId: 'run-1', kills })
    const now = Date.now()
    databaseMocks.query
      .mockResolvedValueOnce({ rows: [{
        id: 'run-1', season_id: 'S01-联合作战', activity_id: 'bounty-surge', mode: 'campaign', stage: 11,
        started_at: new Date(now - 10_000), expires_at: new Date(now + 100_000)
      }] })
      .mockResolvedValueOnce({ rows: [{ highest_stage: 11, best_bounty_ms: null, survival_kills: 0, event_score: 0, duration_ms: 10_000 }] })

    const result = await completeRankedRunHandler(event)

    expect(databaseMocks.query).toHaveBeenNthCalledWith(2, expect.stringContaining("status = 'completed'"), ['run-1', 'user-1', kills, 0])
    expect(result.score.highestStage).toBe(11)
    expect(result.durationMs).toBe(10_000)
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
