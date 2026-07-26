<template>
  <div v-if="cloudAccessBlocked" class="cloud-gate" data-testid="cloud-access-gate">
    <section role="status" aria-live="polite">
      <p class="panel-kicker">云端作战档案</p>
      <div class="cloud-gate__signal" :class="`status-${cloudSyncState.status}`" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
      <h1>{{ gateTitle }}</h1>
      <p>{{ cloudSyncState.detail }}</p>
      <small v-if="cloudHasSession">账号 {{ cloudUsername }} · 完成同步后自动进入基地</small>
      <div v-if="cloudSyncState.status === 'error'" class="cloud-gate__actions">
        <button type="button" class="primary" @click="syncCloudSave">重新读取云存档</button>
        <button type="button" @click="logoutAndReturn">退出并返回登录</button>
      </div>
      <button v-else-if="!cloudHasSession" type="button" class="primary" @click="logoutAndReturn">返回登录或注册</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  cloudAccessBlocked, cloudSyncState, cloudHasSession, cloudUsername,
  cloudLogout, syncCloudSave
} = useGameCanvasContext()

const gateTitle = computed(() => {
  if (!cloudHasSession.value) return '需要登录后才能进入'
  if (cloudSyncState.status === 'error') return '云存档读取失败'
  return '正在载入云端进度'
})

async function logoutAndReturn() {
  cloudLogout()
  await navigateTo('/')
}
</script>
