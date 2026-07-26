<template>
  <div
    v-if="settingsOpen"
    class="settings-backdrop"
    data-testid="settings-backdrop"
    @click.self="closeSettings"
  >
    <section
      ref="panelRef"
      class="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      tabindex="-1"
    >
      <header class="settings-panel__head">
        <div>
          <p class="panel-kicker">基地终端</p>
          <h2 id="settings-title">设置</h2>
        </div>
        <button type="button" aria-label="关闭设置" @click="closeSettings">关闭 ×</button>
      </header>

      <div class="settings-group">
        <div>
          <b>战斗反馈</b>
          <span>这些偏好只保存在当前设备。</span>
        </div>
        <label class="settings-switch">
          <span><b>战斗音效</b><small>命中、拾取、波次与结算提示音</small></span>
          <input v-model="soundEnabled" data-testid="sound-setting" type="checkbox">
          <i aria-hidden="true" />
        </label>
        <label class="settings-switch">
          <span><b>减少动态效果</b><small>缩短界面动画，降低视觉干扰</small></span>
          <input v-model="reducedMotion" data-testid="motion-setting" type="checkbox">
          <i aria-hidden="true" />
        </label>
      </div>

      <div class="settings-group">
        <div>
          <b>账号与云存档</b>
          <span>游戏进度绑定当前云端账号；退出后将返回登录入口。</span>
        </div>
        <div class="settings-account" :class="`status-${cloudSyncState.status}`">
          <span class="settings-account__mark" aria-hidden="true">{{ cloudHasSession ? '●' : '○' }}</span>
          <div>
            <b>{{ cloudSyncState.label }}</b>
            <small>{{ cloudSyncState.detail }}</small>
          </div>
        </div>
        <div v-if="cloudHasSession" class="settings-actions">
          <button type="button" @click="syncCloudSave">立即同步</button>
          <button type="button" class="danger-quiet" @click="logoutAndReturn">退出账号</button>
        </div>
        <div v-else class="settings-actions">
          <a class="settings-link" href="/">返回入口登录或注册</a>
        </div>
        <div v-if="cloudConflict" class="cloud-conflict">
          <b>当前进度与云端修订发生冲突</b>
          <button type="button" @click="keepLocalCloudSave">上传当前进度</button>
          <button type="button" @click="useRemoteCloudSave">重新载入云端</button>
        </div>
      </div>

      <footer class="settings-panel__foot">
        <span>按 Esc 也可关闭；战斗中打开设置会暂停行动。</span>
        <button type="button" class="primary" @click="closeSettings">完成</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'

const {
  settingsOpen, closeSettings, soundEnabled, reducedMotion,
  cloudSyncState, cloudHasSession, cloudConflict, cloudLogout,
  syncCloudSave, keepLocalCloudSave, useRemoteCloudSave
} = useGameCanvasContext()

const panelRef = ref<HTMLElement | null>(null)

watch(settingsOpen, async (open) => {
  if (!open) return
  await nextTick()
  panelRef.value?.focus()
})

async function logoutAndReturn() {
  cloudLogout()
  await navigateTo('/')
}
</script>
