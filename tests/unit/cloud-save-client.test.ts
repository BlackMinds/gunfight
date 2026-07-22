import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCloudSave } from '../../composables/game/useCloudSave'
import { createCloudSave } from '../fixtures/cloud'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

async function flushPromises() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

describe('云存档客户端同步队列', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('连续保存严格串行，后一个请求使用前一个请求返回的新修订号', async () => {
    let resolveFirstWrite!: (response: Response) => void
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'session-token', username: 'player_1' }))
      .mockResolvedValueOnce(jsonResponse({ revision: 5, payload: createCloudSave({ savedAt: 100 }), savedAt: '2026-07-22T08:00:00.000Z' }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirstWrite = resolve }))
      .mockResolvedValueOnce(jsonResponse({ conflict: false, revision: 7, savedAt: '2026-07-22T08:02:00.000Z' }))
    vi.stubGlobal('fetch', fetchMock)
    const cloud = useCloudSave({ getLocal: () => createCloudSave({ savedAt: 100 }), applyRemote: vi.fn() })
    cloud.username.value = 'player_1'
    cloud.password.value = 'password-123'
    await cloud.login()

    cloud.queueSync(createCloudSave({ savedAt: 200 }))
    await vi.advanceTimersByTimeAsync(1200)
    await flushPromises()
    cloud.queueSync(createCloudSave({ savedAt: 300 }))
    await vi.advanceTimersByTimeAsync(1200)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(3)

    resolveFirstWrite(jsonResponse({ conflict: false, revision: 6, savedAt: '2026-07-22T08:01:00.000Z' }))
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    const firstWrite = JSON.parse(String(fetchMock.mock.calls[2][1]?.body))
    const secondWrite = JSON.parse(String(fetchMock.mock.calls[3][1]?.body))
    expect(firstWrite.baseRevision).toBe(5)
    expect(secondWrite.baseRevision).toBe(6)
    expect(secondWrite.payload.savedAt).toBe(300)
    await flushPromises()
    expect(cloud.revision.value).toBe(7)
  })

  it('冲突只记录云端快照，不会自动覆盖本地有效存档', async () => {
    const applyRemote = vi.fn()
    const cloudPayload = createCloudSave({ savedAt: 500 })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'session-token', username: 'player_1' }))
      .mockResolvedValueOnce(jsonResponse({ revision: 2, payload: createCloudSave({ savedAt: 100 }), savedAt: '2026-07-22T08:00:00.000Z' }))
      .mockResolvedValueOnce(jsonResponse({ conflict: true, revision: 3, payload: cloudPayload, savedAt: '2026-07-22T08:03:00.000Z' }))
    vi.stubGlobal('fetch', fetchMock)
    const cloud = useCloudSave({ getLocal: () => createCloudSave({ savedAt: 100 }), applyRemote })
    cloud.username.value = 'player_1'
    cloud.password.value = 'password-123'
    await cloud.login()

    await cloud.push(createCloudSave({ savedAt: 200 }))

    expect(cloud.state.status).toBe('conflict')
    expect(cloud.conflict.value).toEqual({ revision: 3, payload: cloudPayload, savedAt: '2026-07-22T08:03:00.000Z' })
    expect(applyRemote).not.toHaveBeenCalled()
    expect(cloud.revision.value).toBe(2)
  })

  it('失败请求保留当前修订号并显示服务端的稳定错误', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'session-token', username: 'player_1' }))
      .mockResolvedValueOnce(jsonResponse({ revision: 4, payload: createCloudSave({ savedAt: 100 }), savedAt: '2026-07-22T08:00:00.000Z' }))
      .mockResolvedValueOnce(jsonResponse({ message: '云存档服务暂时不可用，请稍后重试' }, 503))
    vi.stubGlobal('fetch', fetchMock)
    const cloud = useCloudSave({ getLocal: () => createCloudSave({ savedAt: 100 }), applyRemote: vi.fn() })
    cloud.username.value = 'player_1'
    cloud.password.value = 'password-123'
    await cloud.login()

    await cloud.push(createCloudSave({ savedAt: 200 }))

    expect(cloud.revision.value).toBe(4)
    expect(cloud.state.status).toBe('error')
    expect(cloud.state.detail).toBe('云存档服务暂时不可用，请稍后重试')
  })

  it('退出账号后忽略旧同步请求的迟到失败', async () => {
    let rejectWrite!: (error: Error) => void
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'session-token', username: 'player_1' }))
      .mockResolvedValueOnce(jsonResponse({ revision: 1, payload: createCloudSave({ savedAt: 100 }), savedAt: '2026-07-22T08:00:00.000Z' }))
      .mockImplementationOnce(() => new Promise<Response>((_resolve, reject) => { rejectWrite = reject }))
    vi.stubGlobal('fetch', fetchMock)
    const cloud = useCloudSave({ getLocal: () => createCloudSave({ savedAt: 100 }), applyRemote: vi.fn() })
    cloud.username.value = 'player_1'
    cloud.password.value = 'password-123'
    await cloud.login()

    const pending = cloud.push(createCloudSave({ savedAt: 200 }))
    await flushPromises()
    cloud.logout()
    rejectWrite(new Error('late network failure'))
    await pending

    expect(cloud.state.status).toBe('signed-out')
    expect(cloud.state.detail).toBe('本地存档继续可用；登录后恢复自动同步。')
  })
})
