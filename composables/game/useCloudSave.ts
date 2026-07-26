import { computed, reactive, ref, shallowRef } from 'vue'
import { clearCloudSession, readCloudSession, writeCloudSession } from '~/shared/cloud/session'

type TimestampedSave = { savedAt?: number }
type CloudConflict<T> = { revision: number; payload: T | null; savedAt: string | null }

export function useCloudSave<T extends TimestampedSave>(options: { getLocal: () => T; applyRemote: (payload: T) => void }) {
  const username = ref('')
  const password = ref('')
  const token = ref('')
  const revision = ref(0)
  const conflict = shallowRef<CloudConflict<T> | null>(null)
  const accessReady = ref(false)
  const state = reactive({ status: 'signed-out' as 'signed-out' | 'syncing' | 'ready' | 'conflict' | 'error', label: '需要登录', detail: '注册或登录云端账号后才能进入游戏。' })
  const hasSession = computed(() => Boolean(token.value))
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let queuedPayload: T | null = null
  let pushQueue = Promise.resolve()
  let sessionVersion = 0

  async function request<R>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, sessionToken = token.value): Promise<R> {
    const response = await fetch(path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    })
    const result = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error(String(result.statusMessage || result.message || `云服务请求失败（${response.status}）`))
    return result as R
  }

  function setReady(detail = `账号 ${username.value} · 已同步修订 ${revision.value}`) {
    accessReady.value = true
    state.status = 'ready'
    state.label = '云存档已连接'
    state.detail = detail
  }

  function setError(error: unknown) {
    state.status = 'error'
    state.label = '云存档同步失败'
    state.detail = error instanceof Error ? error.message : '未知云存档错误'
  }

  async function performPush(payload: T, baseRevision: number | undefined, queuedSession: number, sessionToken: string) {
    if (!sessionToken || queuedSession !== sessionVersion || conflict.value) return
    state.status = 'syncing'
    state.label = '云存档同步中'
    state.detail = '正在安全写入云端……'
    try {
      const result = await request<{ conflict: boolean; revision: number; payload?: T | null; savedAt: string | null }>('/api/cloud-save', 'PUT', { baseRevision: baseRevision ?? revision.value, payload }, sessionToken)
      if (queuedSession !== sessionVersion) return
      if (result.conflict) {
        conflict.value = { revision: result.revision, payload: result.payload ?? null, savedAt: result.savedAt }
        state.status = 'conflict'
        state.label = '检测到存档冲突'
        state.detail = '当前设备进度与云端修订冲突，请选择继续上传当前进度或重新载入云端。'
        return
      }
      revision.value = result.revision
      conflict.value = null
      setReady()
    } catch (error) {
      if (queuedSession === sessionVersion) setError(error)
    }
  }

  function push(payload = options.getLocal(), baseRevision?: number) {
    const queuedSession = sessionVersion
    const sessionToken = token.value
    const operation = pushQueue.then(() => performPush(payload, baseRevision, queuedSession, sessionToken))
    pushQueue = operation.catch(() => undefined)
    return operation
  }

  async function pullAndMerge() {
    if (!token.value) return
    const pullingSession = sessionVersion
    const sessionToken = token.value
    state.status = 'syncing'
    state.label = '正在读取云存档'
    try {
      const remote = await request<{ revision: number; payload: T | null; savedAt: string | null }>('/api/cloud-save', 'GET', undefined, sessionToken)
      if (pullingSession !== sessionVersion) return
      revision.value = remote.revision
      if (!remote.payload) {
        await push(options.getLocal(), 0)
        return
      }
      options.applyRemote(remote.payload)
      setReady('已读取并应用云端存档')
    } catch (error) {
      if (pullingSession === sessionVersion) setError(error)
    }
  }

  async function authenticate(mode: 'login' | 'register') {
    state.status = 'syncing'
    state.label = mode === 'login' ? '正在登录' : '正在创建账号'
    try {
      const result = await request<{ token: string; username: string }>(`/api/auth/${mode}`, 'POST', { username: username.value, password: password.value })
      sessionVersion += 1
      token.value = result.token
      username.value = result.username
      password.value = ''
      writeCloudSession(localStorage, result)
      await pullAndMerge()
    } catch (error) {
      setError(error)
    }
  }

  const login = () => authenticate('login')
  const register = () => authenticate('register')

  function logout() {
    if (syncTimer) clearTimeout(syncTimer)
    sessionVersion += 1
    token.value = ''
    password.value = ''
    revision.value = 0
    conflict.value = null
    accessReady.value = false
    clearCloudSession(localStorage)
    state.status = 'signed-out'
    state.label = '需要登录'
    state.detail = '已退出账号，请重新登录后继续游戏。'
  }

  function queueSync(payload: T) {
    if (!token.value || state.status === 'conflict') return
    queuedPayload = payload
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      const next = queuedPayload
      queuedPayload = null
      if (next) void push(next)
    }, 1200)
  }

  async function keepLocalVersion() {
    const pending = conflict.value
    if (!pending) return
    conflict.value = null
    await push(options.getLocal(), pending.revision)
  }

  function useCloudVersion() {
    const pending = conflict.value
    if (!pending) return
    if (!pending.payload) {
      setError(new Error('云端没有可采用的有效存档，请继续上传当前进度'))
      return
    }
    options.applyRemote(pending.payload)
    revision.value = pending.revision
    conflict.value = null
    setReady('已重新载入云端存档')
  }

  function initialize() {
    const storedSession = readCloudSession(localStorage)
    token.value = storedSession?.token ?? ''
    username.value = storedSession?.username ?? ''
    if (token.value) {
      sessionVersion += 1
      void pullAndMerge()
    }
  }

  function apiRequest<R>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown) {
    return request<R>(path, method, body)
  }

  return { username, password, revision, conflict, state, hasSession, accessReady, login, register, logout, push, pullAndMerge, queueSync, keepLocalVersion, useCloudVersion, initialize, apiRequest }
}
