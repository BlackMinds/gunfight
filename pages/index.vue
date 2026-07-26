<template>
  <main class="entry-shell">
    <section class="entry-hero">
      <div class="entry-copy">
        <p class="eyebrow">外围基地 001 · 接入终端</p>
        <h1>枪火<br>放置</h1>
        <p>先确认作战身份，再进入基地完成行动部署、配件整备与长期成长。</p>
        <div class="entry-status">
          <span aria-hidden="true" />
          <b>云端身份校验</b>
          <small>注册或登录后方可进入基地</small>
        </div>
      </div>

      <section class="access-terminal" aria-labelledby="access-title">
        <header>
          <p>身份校验 / ACCESS</p>
          <h2 id="access-title">{{ storedSession ? '欢迎归队' : '进入作战区' }}</h2>
        </header>

        <template v-if="storedSession && !switchingAccount">
          <div class="recognized-account">
            <span aria-hidden="true">{{ storedSession.username.slice(0, 1).toUpperCase() }}</span>
            <div>
              <small>已识别云存档账号</small>
              <b>{{ storedSession.username }}</b>
            </div>
          </div>
          <NuxtLink class="terminal-primary" to="/game">继续进入基地</NuxtLink>
          <button type="button" class="terminal-secondary" @click="switchingAccount = true">使用其他账号</button>
        </template>

        <form v-else class="auth-form" @submit.prevent="submitAuth">
          <div class="auth-tabs" role="tablist" aria-label="账号操作">
            <button
              type="button"
              role="tab"
              :aria-selected="authMode === 'login'"
              :class="{ active: authMode === 'login' }"
              @click="authMode = 'login'"
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="authMode === 'register'"
              :class="{ active: authMode === 'register' }"
              @click="authMode = 'register'"
            >
              注册
            </button>
          </div>

          <label>
            <span>账号</span>
            <input
              v-model.trim="username"
              autocomplete="username"
              name="username"
              placeholder="字母、数字或下划线"
              required
            >
          </label>
          <label>
            <span>密码</span>
            <input
              v-model="password"
              :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
              minlength="8"
              name="password"
              placeholder="至少 8 位"
              required
              type="password"
            >
          </label>

          <p v-if="authState.message" class="auth-message" :class="`tone-${authState.tone}`" role="status">
            {{ authState.message }}
          </p>
          <button class="terminal-primary" type="submit" :disabled="authState.loading">
            {{ authState.loading ? '正在校验…' : authMode === 'login' ? '登录并进入基地' : '创建账号并进入基地' }}
          </button>
          <button v-if="storedSession" type="button" class="terminal-secondary" @click="switchingAccount = false">返回已登录账号</button>
        </form>

        <small class="entry-note">游戏进度绑定云端账号；未登录时无法进入基地。</small>
      </section>
    </section>

    <section class="entry-route" aria-label="基地工作区预览">
      <article v-for="(item, index) in baseRoutes" :key="item.name">
        <span>0{{ index + 1 }}</span>
        <div><b>{{ item.name }}</b><small>{{ item.summary }}</small></div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { readCloudSession, writeCloudSession, type CloudSession } from '~/shared/cloud/session'

const authMode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const storedSession = ref<CloudSession | null>(null)
const switchingAccount = ref(false)
const authState = reactive({ loading: false, message: '', tone: 'normal' as 'normal' | 'error' })

const baseRoutes = [
  { name: '行动部署', summary: '敌情、关卡与奖励集中确认' },
  { name: '配件整备', summary: '装备、背包与词条独立管理' },
  { name: '成长中枢', summary: '武器、天赋、任务与赛季' }
]

onMounted(() => {
  storedSession.value = readCloudSession(localStorage)
  username.value = storedSession.value?.username ?? ''
})

async function submitAuth() {
  if (authState.loading) return
  authState.loading = true
  authState.message = ''
  try {
    const response = await fetch(`/api/auth/${authMode.value}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const result = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error(String(result.statusMessage || result.message || `账号服务请求失败（${response.status}）`))
    const session = { token: String(result.token ?? ''), username: String(result.username ?? '') }
    if (!session.token || !session.username) throw new Error('账号服务返回了无效会话，请稍后重试')
    writeCloudSession(localStorage, session)
    storedSession.value = session
    password.value = ''
    await navigateTo('/game')
  } catch (error) {
    authState.tone = 'error'
    authState.message = error instanceof Error ? error.message : '账号校验失败，请稍后重试'
  } finally {
    authState.loading = false
  }
}
</script>

<style scoped>
.entry-shell {
  min-height: 100vh;
  padding: clamp(14px, 3.5vw, 48px);
  display: grid;
  align-content: center;
  gap: 12px;
  overflow: hidden;
}

.entry-hero {
  position: relative;
  min-height: min(72vh, 760px);
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(340px, 0.75fr);
  align-items: stretch;
  overflow: hidden;
  border: 1px solid rgba(229, 184, 75, 0.3);
  background:
    linear-gradient(90deg, rgba(10, 12, 12, 0.94) 0 42%, rgba(10, 12, 12, 0.42) 69%, rgba(10, 12, 12, 0.88)),
    url('~/assets/images/training-zone.webp') center / cover,
    #171816;
}

.entry-hero::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 5px;
  background: repeating-linear-gradient(90deg, var(--hazard) 0 46px, transparent 46px 58px);
  opacity: 0.72;
}

.entry-copy {
  position: relative;
  z-index: 1;
  padding: clamp(30px, 6vw, 76px);
  display: grid;
  align-content: center;
  justify-items: start;
}

.eyebrow,
.access-terminal header p {
  margin: 0;
  color: var(--hazard);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.entry-copy h1 {
  margin: 20px 0 16px;
  font-size: clamp(68px, 10vw, 142px);
  line-height: 0.78;
  letter-spacing: -0.07em;
}

.entry-copy > p:not(.eyebrow) {
  max-width: 510px;
  margin: 0;
  color: #c1c1b8;
  font-size: clamp(16px, 1.7vw, 21px);
  line-height: 1.65;
}

.entry-status {
  margin-top: clamp(28px, 5vw, 64px);
  padding: 10px 0;
  display: grid;
  grid-template-columns: 10px auto;
  gap: 1px 10px;
  align-items: center;
}

.entry-status > span {
  grid-row: 1 / span 2;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #84b875;
  box-shadow: 0 0 0 5px rgba(132, 184, 117, 0.12);
}

.entry-status small { color: var(--muted); }

.access-terminal {
  position: relative;
  z-index: 2;
  margin: clamp(16px, 3vw, 42px);
  padding: clamp(22px, 3vw, 34px);
  display: grid;
  align-content: center;
  gap: 18px;
  border: 1px solid rgba(225, 213, 174, 0.18);
  border-top-color: rgba(240, 191, 87, 0.62);
  background:
    linear-gradient(135deg, rgba(240, 191, 87, 0.07), transparent 28%),
    rgba(11, 15, 16, 0.94);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.44);
}

.access-terminal header h2 {
  margin: 6px 0 0;
  font-size: clamp(28px, 3vw, 42px);
}

.recognized-account {
  padding: 16px;
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(119, 183, 215, 0.24);
  background: rgba(119, 183, 215, 0.07);
}

.recognized-account > span {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  color: #101313;
  background: #d7c48a;
  font-size: 22px;
  font-weight: 950;
}

.recognized-account div { display: grid; gap: 4px; }
.recognized-account small,
.entry-note { color: var(--muted); line-height: 1.55; }

.auth-form { display: grid; gap: 12px; }

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid rgba(243, 239, 229, 0.12);
}

.auth-tabs button {
  min-height: 42px;
  color: var(--muted);
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
}

.auth-tabs button.active {
  color: #f4d47d;
  border-bottom-color: var(--hazard);
}

.auth-form label { display: grid; gap: 6px; }
.auth-form label span { color: #c9c4b5; font-size: 12px; font-weight: 800; }

.auth-form input {
  min-height: 46px;
  padding: 0 13px;
  color: var(--ink);
  border: 1px solid rgba(243, 239, 229, 0.16);
  background: rgba(3, 6, 7, 0.76);
  font: inherit;
}

.auth-form input:focus {
  border-color: var(--hazard);
  outline: 2px solid rgba(240, 191, 87, 0.18);
  outline-offset: 2px;
}

.terminal-primary,
.terminal-secondary {
  min-height: 46px;
  padding: 0 14px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(243, 239, 229, 0.16);
  color: var(--ink);
  background: rgba(243, 239, 229, 0.06);
  font: inherit;
  font-weight: 900;
  text-decoration: none;
}

.terminal-primary {
  color: #17130b;
  border-color: #f3d77e;
  background: linear-gradient(180deg, #ffe08b, #efb94d 64%, #b66f45);
}

.terminal-primary:disabled { filter: grayscale(0.7); opacity: 0.7; }
.terminal-secondary:hover { border-color: rgba(240, 191, 87, 0.55); color: #f4d47d; }

.auth-message {
  margin: 0;
  padding: 9px 10px;
  font-size: 12px;
}

.auth-message.tone-error {
  color: #ffb29c;
  border: 1px solid rgba(219, 103, 72, 0.34);
  background: rgba(91, 31, 22, 0.34);
}

.entry-route {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.entry-route article {
  min-height: 74px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(243, 239, 229, 0.1);
  background: rgba(15, 18, 18, 0.84);
}

.entry-route article > span { color: var(--hazard); font-size: 12px; font-weight: 900; }
.entry-route article div { display: grid; gap: 3px; }
.entry-route article small { color: var(--muted); }

@media (max-width: 820px) {
  .entry-shell {
    min-height: 100dvh;
    padding: 8px;
    align-content: start;
    overflow: visible;
  }

  .entry-hero {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .entry-copy { padding: 28px 22px 8px; }
  .entry-copy h1 { margin-block: 14px 10px; font-size: clamp(58px, 20vw, 92px); }
  .entry-copy > p:not(.eyebrow) { font-size: 14px; }
  .entry-status { display: none; }
  .access-terminal { margin: 14px; padding: 20px; }
  .entry-route { grid-template-columns: 1fr; }
  .entry-route article { min-height: 58px; }
}

</style>
