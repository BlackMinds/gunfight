<template>
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">外围基地 001</p>
        <h1>枪火放置</h1>
        <p class="copy">
          俯视角自动射击原型：走位拉扯、清场推进、首领节点、战后结算和基地强化已经串成闭环。
        </p>
      </div>
      <NuxtLink class="start" to="/game">进入基地</NuxtLink>
    </section>
    <section class="loadout-strip" aria-label="初始构筑">
      <article v-for="item in starterLoadout" :key="item.name">
        <span :style="{ background: item.color }" />
        <strong>{{ item.name }}</strong>
        <small>{{ item.effect }}</small>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
const starterLoadout = [
  { name: '突击步枪', effect: '均衡扫射', color: '#d7c48a' },
  { name: '穿甲枪管', effect: '穿透 +1', color: '#6ea6c9' },
  { name: '快速弹匣', effect: '射速加成', color: '#78a866' }
]
</script>

<style scoped>
.shell {
  min-height: 100vh;
  padding: clamp(18px, 4vw, 56px);
  display: grid;
  align-content: center;
  gap: 22px;
}

.hero {
  min-height: min(64vh, 680px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 24px;
  padding: clamp(26px, 6vw, 72px);
  border: 1px solid rgba(229, 184, 75, 0.28);
  background:
    linear-gradient(90deg, rgba(17, 17, 16, 0.86), rgba(17, 17, 16, 0.18)),
    url('~/assets/images/training-zone.png') center / cover,
    repeating-linear-gradient(135deg, rgba(229, 184, 75, 0.12) 0 2px, transparent 2px 22px),
    linear-gradient(160deg, #2b2a25, #151512 65%);
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: "";
  position: absolute;
  inset: auto -8% 12% 48%;
  height: 26%;
  background:
    linear-gradient(90deg, transparent, rgba(229, 184, 75, 0.2), transparent),
    repeating-linear-gradient(90deg, transparent 0 28px, rgba(243, 239, 229, 0.24) 28px 42px);
  transform: rotate(-8deg);
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--hazard);
  letter-spacing: 0.16em;
}

h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(56px, 10vw, 132px);
  line-height: 0.9;
}

.copy {
  max-width: 560px;
  margin: 22px 0 0;
  color: var(--muted);
  font-size: clamp(16px, 2vw, 21px);
}

.start {
  z-index: 1;
  align-self: end;
  padding: 14px 20px;
  border: 1px solid var(--hazard);
  color: #15120d;
  background: var(--hazard);
  text-decoration: none;
  font-weight: 800;
}

.loadout-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.loadout-strip article {
  min-height: 78px;
  padding: 14px;
  background: rgba(25, 24, 21, 0.8);
  border: 1px solid rgba(243, 239, 229, 0.12);
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 6px 10px;
  align-items: center;
}

.loadout-strip span {
  width: 12px;
  height: 42px;
}

.loadout-strip small {
  grid-column: 2;
  color: var(--muted);
}

@media (max-width: 720px) {
  .hero,
  .loadout-strip {
    grid-template-columns: 1fr;
  }

  .start {
    justify-self: start;
  }
}
</style>
