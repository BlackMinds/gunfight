import { describe, expect, it } from 'vitest'
import {
  CLOUD_TOKEN_KEY,
  CLOUD_USER_KEY,
  clearCloudSession,
  readCloudSession,
  writeCloudSession
} from '../../shared/cloud/session'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  }
}

describe('入口云会话', () => {
  it('只有 token 与账号同时存在时才恢复会话', () => {
    const storage = createStorage()
    storage.setItem(CLOUD_TOKEN_KEY, 'token-1')
    expect(readCloudSession(storage)).toBeNull()
    storage.setItem(CLOUD_USER_KEY, 'player_1')
    expect(readCloudSession(storage)).toEqual({ token: 'token-1', username: 'player_1' })
  })

  it('可由入口写入并在退出账号时完整清除', () => {
    const storage = createStorage()
    writeCloudSession(storage, { token: 'token-2', username: 'player_2' })
    expect(readCloudSession(storage)?.username).toBe('player_2')
    clearCloudSession(storage)
    expect(readCloudSession(storage)).toBeNull()
  })
})
