import { computed, reactive, ref, shallowRef } from 'vue'

type TimestampedSave = { savedAt?: number }
type CloudConflict<T> = { revision: number; payload: T | null; savedAt: string | null }

const TOKEN_KEY = 'gunfight-cloud-token'
const USER_KEY = 'gunfight-cloud-user'

export function useCloudSave<T extends TimestampedSave>(options: { getLocal: () => T; applyRemote: (payload: T) => void }) {
  const username = ref('')
  const password = ref('')
  const token = ref('')
  const revision = ref(0)
  const conflict = shallowRef<CloudConflict<T> | null>(null)
  const state = reactive({ status: 'signed-out' as 'signed-out' | 'syncing' | 'ready' | 'conflict' | 'error', label: '云存档未登录', detail: '登录后自动同步，发生版本冲突时由玩家选择保留版本。' })
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
        state.detail = '本地和云端都发生了更新，请选择保留哪一个版本。'
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
      const local = options.getLocal()
      if ((remote.payload.savedAt ?? 0) > (local.savedAt ?? 0)) {
        options.applyRemote(remote.payload)
        setReady('已下载并应用较新的云端存档')
      } else if ((local.savedAt ?? 0) > (remote.payload.savedAt ?? 0)) {
        await push(local, remote.revision)
      } else {
        setReady()
      }
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
      localStorage.setItem(TOKEN_KEY, result.token)
      localStorage.setItem(USER_KEY, result.username)
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
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    state.status = 'signed-out'
    state.label = '云存档未登录'
    state.detail = '本地存档继续可用；登录后恢复自动同步。'
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
      setError(new Error('云端没有可采用的有效存档，请保留本地版本'))
      return
    }
    options.applyRemote(pending.payload)
    revision.value = pending.revision
    conflict.value = null
    setReady('已采用云端版本并覆盖本地存档')
  }

  function initialize() {
    token.value = localStorage.getItem(TOKEN_KEY) ?? ''
    username.value = localStorage.getItem(USER_KEY) ?? ''
    if (token.value) {
      sessionVersion += 1
      void pullAndMerge()
    }
  }

  function apiRequest<R>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown) {
    return request<R>(path, method, body)
  }

  return { username, password, revision, conflict, state, hasSession, login, register, logout, push, pullAndMerge, queueSync, keepLocalVersion, useCloudVersion, initialize, apiRequest }
}
