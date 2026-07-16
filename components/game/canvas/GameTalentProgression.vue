<template>
  <section class="progression-section talent-section">
    <div class="progression-title"><b>完整天赋树 · 5 分支 / 25 节点</b><span>可用 {{ talentPointsAvailable }} / 总计 {{ talentPointsTotal }}</span></div>
    <div class="talent-branches">
      <article v-for="branch in talentBranches" :key="branch.name" class="talent-branch">
        <h3>{{ branch.name }}</h3>
        <div class="talent-grid">
          <button v-for="talent in branch.nodes" :key="talent.id" type="button" :class="{ locked: !talent.requirementMet }" :disabled="!talent.canUpgrade" @click="upgradeTalent(talent.id)">
            <small>{{ talent.requirementMet ? '可投入' : `前置：${talent.requires?.level ?? 0} 级` }}</small>
            <b>{{ talent.name }} · {{ talent.level }}/{{ talent.maxLevel }}</b>
            <span>{{ talent.description }}</span>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameCanvasContext } from '~/composables/game/gameCanvasContext'
const { talentCards, talentPointsAvailable, talentPointsTotal, upgradeTalent } = useGameCanvasContext()
const talentBranches = computed(() => ['火力', '生存', '机动', '工程', '后勤'].map((name) => ({ name, nodes: talentCards.value.filter((node) => node.branch === name) })))
</script>
