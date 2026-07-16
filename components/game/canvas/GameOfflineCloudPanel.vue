<template>
  <section class="progression-section offline-section">
    <div class="progression-title"><b>离线与云存档</b><span>基础 8 小时，后勤天赋可扩至 16 小时</span></div>
    <template v-if="pendingOfflineReward">
      <p>已累计 {{ Math.floor(pendingOfflineReward.cappedSeconds / 60) }} 分钟</p>
      <strong>金币 +{{ pendingOfflineReward.gold }} · 经验 +{{ pendingOfflineReward.exp }} · 合金 +{{ pendingOfflineReward.alloy }} · 零件 +{{ pendingOfflineReward.parts }}</strong>
      <button type="button" data-testid="claim-offline" @click="claimOfflineReward">领取离线收益</button>
    </template>
    <p v-else>当前没有待领取收益。离开游戏一分钟后开始累计。</p>

    <div class="cloud-state" :class="`status-${cloudSyncState.status}`"><b>{{ cloudSyncState.label }}</b><span>{{ cloudSyncState.detail }}</span></div>
    <div v-if="!cloudHasSession" class="cloud-auth-form">
      <input v-model="cloudUsername" aria-label="云存档账号" autocomplete="username" placeholder="账号（字母/数字/下划线）">
      <input v-model="cloudPassword" aria-label="云存档密码" autocomplete="current-password" type="password" placeholder="密码（至少 8 位）">
      <button type="button" @click="cloudLogin">登录</button><button type="button" @click="cloudRegister">注册</button>
    </div>
    <div v-else class="cloud-actions"><button type="button" @click="syncCloudSave">立即同步</button><button type="button" @click="cloudLogout">退出账号</button></div>
    <div v-if="cloudConflict" class="cloud-conflict"><b>选择要保留的存档</b><button type="button" @click="keepLocalCloudSave">保留本地</button><button type="button" @click="useRemoteCloudSave">采用云端</button></div>
  </section>
</template>

<script setup lang="ts">
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { pendingOfflineReward, claimOfflineReward, cloudSyncState, cloudUsername, cloudPassword, cloudHasSession, cloudConflict, cloudLogin, cloudRegister, cloudLogout, syncCloudSave, keepLocalCloudSave, useRemoteCloudSave } = useGameCanvasContext()
</script>
