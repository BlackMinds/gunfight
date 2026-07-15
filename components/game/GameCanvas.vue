<template>
  <main class="game-screen" :class="`mode-${mode}`">
    <canvas ref="canvasRef" class="battlefield" aria-label="枪火放置战斗画面" />

    <section v-if="replayUi.visible" class="r3-replay-status" data-testid="r3-replay-status" aria-live="polite">
      <small>R3 开发回放 · {{ replayUi.status }}</small>
      <b>{{ replayUi.currentLabel || '等待启动' }}</b>
      <span>有效 {{ replayUi.validSamples }} / 12 · 剔除 {{ replayUi.rejectedSamples }}</span>
      <span>{{ replayUi.message }}</span>
      <output data-testid="r3-replay-results" hidden>{{ replayResultsJson }}</output>
    </section>

    <section class="top-actions" aria-label="资源与菜单">
      <div class="currency-chip">
        <span>●</span>
        <b>{{ resources.gold }}</b>
      </div>
      <button type="button" disabled title="设置功能开发中">⚙ 设置</button>
      <button type="button" @click="returnToBase">⇥ 退出</button>
    </section>

    <aside class="hud hud-left">
      <div class="profile-card">
        <div class="rank-mark" aria-hidden="true">◆</div>
        <div>
          <div class="profile-line">
            <b>训练者</b>
            <span>Lv.{{ player.level }}</span>
          </div>
          <div class="bar hp">
            <span :style="{ width: `${hpPercent}%` }" />
          </div>
          <small>{{ Math.ceil(player.hp) }} / {{ player.maxHp }}</small>
        </div>
      </div>
      <div class="stat-board">
        <p class="panel-kicker">基础属性</p>
        <div class="stat-row">
          <span>攻击力</span>
          <b>{{ damagePreview }}</b>
        </div>
        <div class="stat-row">
          <span>生命值</span>
          <b>{{ Math.ceil(player.hp) }} / {{ player.maxHp }}</b>
        </div>
        <div class="stat-row">
          <span>击杀数</span>
          <b>{{ kills }} / {{ targetKills }}</b>
        </div>
        <div class="stat-row">
          <span>经验值</span>
          <b>{{ player.exp }} / {{ nextLevelExp }}</b>
        </div>
        <div class="stat-row">
          <span>合金</span>
          <b>{{ resources.alloy }}</b>
        </div>
      </div>
    </aside>

    <aside class="hud hud-right dps-hud">
      <p class="panel-kicker">实时输出</p>
      <div class="dps-readout">
        <span>最近 3 秒实际 DPS</span>
        <b>{{ Math.round(runStats.currentDps) }}</b>
        <small>仅统计实际造成伤害</small>
      </div>
      <div class="combat-metrics">
        <span><small>本关最高</small><b>{{ Math.round(runStats.peakDps) }}</b></span>
        <span><small>总伤害</small><b>{{ Math.round(runStats.totalDamage) }}</b></span>
      </div>
    </aside>

    <section v-if="mode === 'battle'" class="wave-command" aria-label="波次进度">
      <div class="wave-command__title">
        <span>第 {{ currentWave }} / {{ totalWaves }} 波</span>
        <b>{{ currentWaveDefinition?.label }}</b>
      </div>
      <div class="wave-ticks">
        <i v-for="wave in wavePlan" :key="wave.index" :class="{ active: wave.index === currentWave, cleared: wave.index < currentWave }" />
      </div>
      <small>{{ waveStatusText }}</small>
    </section>

    <section v-if="bossHud.visible" class="boss-hud" aria-label="首领生命">
      <span>高威胁目标 · {{ bossHud.phaseLabel }}</span>
      <b>{{ bossHud.label }}</b>
      <div><i :style="{ transform: `scaleX(${bossHud.hpPercent / 100})` }" /></div>
      <small>{{ Math.ceil(bossHud.hp) }} / {{ Math.ceil(bossHud.maxHp) }}</small>
    </section>

    <div v-if="damageDirection.life > 0 && mode === 'battle'" class="damage-direction" :style="{ transform: `rotate(${damageDirection.angle}rad)` }" aria-hidden="true">⌃</div>
    <div v-if="killNotice" class="kill-notice">{{ killNotice }}</div>

    <section class="objective-strip">
      <div>
        <span class="objective-icon">☠</span>
        <small>击杀进度</small>
        <b>{{ Math.min(kills, targetKills) }} / {{ targetKills }}</b>
      </div>
      <div>
        <span class="objective-icon">⏱</span>
        <small>关卡用时</small>
        <b>{{ formatClock(elapsedSeconds) }}</b>
      </div>
      <div>
        <span class="objective-icon">⌨</span>
        <small>移动控制</small>
        <b>WASD / 方向键</b>
      </div>
    </section>

    <section class="skill-bar" aria-label="战术技能">
      <button v-for="skill in skills" :key="skill.key" type="button" :aria-label="`${skill.shortcut}：${skill.name}`" :disabled="skill.cooldown > 0 || mode !== 'battle'" @click="useSkill(skill.key)">
        <kbd>{{ skill.shortcut }}</kbd>
        <img :src="skill.icon" alt="" aria-hidden="true" />
        <span>
          <b>{{ skill.name }}</b>
          <small>{{ skill.cooldown > 0 ? `${skill.cooldown.toFixed(1)} 秒` : skill.hint }}</small>
        </span>
      </button>
    </section>

    <section v-if="upgradeChoices.length && mode === 'battle'" class="choice-panel">
      <p class="panel-kicker">局内升级</p>
      <h2>选择一项临时强化</h2>
      <div>
        <button v-for="(choice, index) in upgradeChoices" :key="choice.name" type="button" @click="chooseUpgrade(choice)">
          <kbd>{{ index + 1 }}</kbd>
          <small>{{ choice.tag }}</small>
          <b>{{ choice.name }}</b>
          <span>{{ choice.desc }}</span>
          <strong>{{ choice.comparison }}</strong>
        </button>
      </div>
    </section>

    <section v-if="mode === 'base'" class="base-panel">
      <div class="base-hero">
        <p class="panel-kicker">外围基地</p>
        <h1>配件整备台已开启</h1>
        <p>挑选更好的词条底子，整理背包后再推进下一关。</p>
        <div class="resource-rail">
          <span>
            <small>重铸手续费</small>
            金币 <b>{{ resources.gold }}</b>
          </span>
          <span>
            <small>锁定副词条</small>
            合金 <b>{{ resources.alloy }}</b>
          </span>
          <span>
            <small>强化 / 重铸</small>
            零件 <b>{{ resources.parts }}</b>
          </span>
          <span>
            <small>成长等级</small>
            角色 Lv.<b>{{ player.level }}</b>
          </span>
        </div>
        <div class="base-intel">
          <article>
            <span>当前战力</span>
            <b>{{ combatPower }}</b>
            <small>伤害 {{ damagePreview }} · 射速 {{ fireRatePreview }}/秒 · 生命 {{ player.maxHp }}</small>
          </article>
          <article>
            <span>下一关敌情</span>
            <b>{{ nextEnemyPreview.label }}</b>
            <small>生命 {{ nextEnemyPreview.hp }} · 伤害 {{ nextEnemyPreview.damage }} · {{ stageType }}</small>
          </article>
        </div>
        <div class="stage-picker" aria-label="关卡选择">
          <button type="button" @click="adjustStage(-10)">-10</button>
          <button type="button" @click="adjustStage(-1)">-1</button>
          <label>
            <span>目标关卡</span>
            <input v-model.number="stageDraft" type="number" min="1" :max="maxSelectableStage" @change="commitStageDraft" />
          </label>
          <button type="button" @click="adjustStage(1)">+1</button>
          <button type="button" @click="adjustStage(10)">+10</button>
        </div>
        <p v-if="debugStageSelection" class="debug-stage-note">开发调试选关已开启 · 第 11～10000 关尚未完成平衡验证</p>
        <div class="reward-preview" aria-label="奖励预览">
          <article>
            <span>预计金币</span>
            <b>{{ stageRewardPreview.gold }}</b>
          </article>
          <article>
            <span>预计合金</span>
            <b>{{ stageRewardPreview.alloy }}</b>
          </article>
          <article>
            <span>配件概率</span>
            <b>{{ dropProfile.dropChance }}%</b>
          </article>
          <article>
            <span>可能品质</span>
            <b>{{ dropProfile.raritySummary }}</b>
          </article>
        </div>
        <div class="base-actions">
          <button type="button" class="primary" data-testid="deploy-stage" :disabled="inventoryOverCapacity" @click="startStage">部署第 {{ stageLabel }} 关</button>
          <p v-if="inventoryOverCapacity" class="capacity-blocker" data-testid="inventory-capacity-blocker" role="alert">背包超出容量：请取消部分收藏保护、装备或出售配件后再部署。</p>
        </div>
        <div class="character-panel" aria-label="角色属性">
          <div class="character-level">
            <span>角色等级</span>
            <b>Lv.{{ player.level }}</b>
            <small>经验 {{ player.exp }} / {{ nextLevelExp }}，还差 {{ expToNextLevel }} 点升级</small>
            <div class="bar exp">
              <span :style="{ width: `${expPercent}%` }" />
            </div>
          </div>
          <div class="character-stats" aria-label="完整战斗属性">
            <article v-for="stat in characterStats" :key="stat.key" :class="`tone-${stat.tone}`" :title="stat.hint">
              <span>{{ stat.label }}</span>
              <b>{{ stat.value }}</b>
            </article>
          </div>
        </div>
      </div>

      <div class="base-backpack" :class="{ 'sale-mode': isSaleMode }">
        <div class="base-backpack-head">
          <div>
            <p class="panel-kicker">配件背包</p>
            <h3>{{ attachmentSwapLabel }}</h3>
          </div>
          <div class="backpack-summary">
            <span data-testid="inventory-capacity" :class="{ warning: inventoryNearCapacity }">容量 {{ inventoryCapacityLabel }} · 收藏 {{ favoriteAttachmentCount }} · 当前显示 {{ filteredInventory.length }}</span>
            <button type="button" data-testid="sale-mode-toggle" :class="{ active: isSaleMode }" :disabled="!inventory.length" @click="toggleSaleMode">
              {{ isSaleMode ? '退出出售' : '出售配件' }}
            </button>
          </div>
        </div>
        <div v-if="inventory.length" class="backpack-toolbar">
          <label>
            <span>排序</span>
            <select v-model="selectedInventorySort">
              <option v-for="option in inventorySortOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <div class="inventory-filter" aria-label="配件状态筛选">
            <button v-for="option in inventoryFilterOptions" :key="option" type="button" :class="{ active: selectedInventoryFilter === option }" @click="selectedInventoryFilter = option">
              {{ option }}
            </button>
          </div>
          <label>
            <span>品质</span>
            <select v-model="selectedRarity">
              <option v-for="rarity in attachmentRarityFilters" :key="rarity" :value="rarity">
                {{ rarity }}（{{ rarity === '全部' ? inventory.length : inventoryByRarity[rarity] ?? 0 }}）
              </option>
            </select>
          </label>
        </div>
        <div v-if="inventory.length" class="slot-filter-block">
          <div class="filter-caption">
            <span>装备槽位</span>
            <b>{{ selectedSlot }}</b>
          </div>
          <div class="slot-filter" aria-label="装备槽位筛选">
            <button v-for="slot in attachmentSlotFilters" :key="slot" type="button" :class="{ active: selectedSlot === slot }" @click="selectedSlot = slot">
              <b>{{ slot }}</b>
              <span>{{ slot === '全部' ? inventory.length : inventoryBySlot[slot]?.length ?? 0 }}</span>
            </button>
          </div>
        </div>
        <div v-if="isSaleMode" class="sale-toolbar" data-testid="sale-toolbar" aria-label="出售操作">
          <div>
            <span>已选择 {{ saleItems.length }} 件</span>
            <b>预计获得：金币 +{{ saleReward.gold }} / 零件 +{{ saleReward.parts }}</b>
          </div>
          <button type="button" data-testid="sale-select-all" :disabled="!sellableFilteredInventory.length" @click="toggleFilteredSaleSelection">
            {{ allFilteredSelected ? '取消当前' : '全选当前' }}
          </button>
          <button type="button" :disabled="!saleItems.length" @click="clearSaleSelection">清空</button>
          <button type="button" class="sale-confirm" data-testid="sale-confirm" :disabled="!saleItems.length" @click="sellSelectedAttachments">
            出售 {{ saleItems.length }} 件
          </button>
        </div>
        <div class="base-backpack-layout">
          <div class="base-backpack-list">
          <p v-if="!inventory.length" class="empty-backpack">打关卡有概率掉落配件，获得后会进入这里。</p>
          <p v-else-if="!filteredInventory.length" class="empty-backpack">当前整理条件下没有可用配件。</p>
          <article
            v-for="item in filteredInventory"
            :key="attachmentKey(item)"
            class="inventory-icon-shell"
            data-testid="inventory-item-shell"
            :data-attachment-id="attachmentKey(item)"
            :class="{ 'sale-selected': isSaleSelected(item), 'favorite-protected': item.favorite }"
          >
            <button
              type="button"
              class="inventory-icon-item"
              data-testid="inventory-item-button"
              :class="[`rarity-${item.rarity}`, { selected: !isSaleMode && selectedAttachment && sameAttachment(selectedAttachment, item) }]"
              :aria-label="`${item.name}，${item.slot}，${item.rarity}，${item.effect}${item.favorite ? '，已收藏保护' : ''}`"
              :aria-pressed="isSaleMode ? isSaleSelected(item) : undefined"
              :disabled="!canSwapAttachment || (isSaleMode && item.favorite)"
              @click="handleInventoryItemClick(item)"
            >
              <span class="inventory-item-art" :style="equipmentIconStyle(item, Math.max(0, attachmentSlots.indexOf(item.slot)))" aria-hidden="true" />
              <span class="inventory-item-level">+{{ item.level ?? 0 }}</span>
              <span class="inventory-item-slot">{{ item.slot }}</span>
              <span v-if="item.favorite" class="inventory-favorite-mark" aria-hidden="true">★</span>
              <span v-if="isSaleMode" class="inventory-sale-check" :class="{ protected: item.favorite }" aria-hidden="true">{{ item.favorite ? '锁' : isSaleSelected(item) ? '✓' : '' }}</span>
            </button>
            <div v-if="!isSaleMode" class="inventory-item-tooltip" role="tooltip">
              <div class="inventory-tooltip-head">
                <div>
                  <b>{{ item.name }}</b>
                  <small>{{ item.slot }} · {{ item.rarity }} · Roll {{ formatRoll(item.roll) }}</small>
                </div>
                <strong :class="`tone-${attachmentDecisionFor(item).tone}`">{{ attachmentDecisionFor(item).actionLabel }}</strong>
              </div>
              <em>{{ item.effect }}</em>
              <div v-if="item.subAffixes?.length" class="inventory-tooltip-affixes" aria-label="副词条锁定">
                <button
                  v-for="affix in item.subAffixes"
                  :key="affix.key"
                  type="button"
                  data-testid="affix-lock"
                  :class="{ locked: isReforgeAffixLocked(item, affix) }"
                  :aria-pressed="isReforgeAffixLocked(item, affix)"
                  @click.stop="toggleReforgeAffixLock(item, affix)"
                >
                  <span>{{ isReforgeAffixLocked(item, affix) ? '已锁定' : '锁定' }}</span>
                  <b>{{ formatAffix(affix) }}</b>
                </button>
              </div>
              <p class="reforge-cost-note" data-testid="reforge-cost-status" :class="{ shortage: reforgeShortageText(item) }">
                {{ reforgeShortageText(item) || `重铸消耗 ${formatReforgeCost(item)}` }}
              </p>
              <div class="inventory-tooltip-names">
                <span>当前 <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b></span>
                <span>替换 <b>{{ item.name }}</b></span>
              </div>
              <div class="inventory-tooltip-compare">
                <div v-for="row in attachmentComparisonFor(item)" :key="row.label">
                  <span>{{ row.label }}</span>
                  <b>{{ row.current }}</b>
                  <strong>→</strong>
                  <b>{{ row.next }}</b>
                </div>
              </div>
              <div class="inventory-tooltip-actions">
                <button type="button" :disabled="!canSwapAttachment" @click.stop="equipInventoryAttachment(item)">装备 {{ item.slot }}</button>
                <button type="button" data-testid="favorite-toggle" :class="{ active: item.favorite }" :aria-pressed="Boolean(item.favorite)" @click.stop="toggleAttachmentFavorite(item)">{{ item.favorite ? '取消收藏' : '收藏保护' }}</button>
                <button type="button" :disabled="!canUpgradeAttachment(item)" @click.stop="upgradeInventoryAttachment(item)">强化 {{ attachmentUpgradeCost(item) }} 零件</button>
                <button type="button" data-testid="reforge-action" :disabled="!canReforgeAttachment(item)" @click.stop="reforgeInventoryAttachment(item)">重铸 {{ formatReforgeCost(item) }}</button>
              </div>
            </div>
          </article>
          </div>
        </div>
        <div v-if="overflowSalvageNotice" class="overflow-salvage-notice base-overflow-salvage-notice" data-testid="overflow-salvage-base" role="status">
          <b>背包已满，自动回收 {{ overflowSalvageNotice.items.length }} 件低优先级配件</b>
          <span>{{ overflowSalvageNotice.items.map((item) => item.name).join('、') }}</span>
          <strong>返还金币 +{{ overflowSalvageNotice.gold }} / 零件 +{{ overflowSalvageNotice.parts }}</strong>
        </div>
      </div>
    </section>

    <section v-if="mode === 'base'" class="equipment-panel equipment-dock" aria-label="角色装备界面">
      <div class="equipment-head">
        <div>
          <p class="panel-kicker">角色装备</p>
          <h2>训练者 Lv.{{ player.level }}</h2>
        </div>
        <div class="equipment-power" aria-label="综合战力">
          <span>综合战力</span>
          <b>{{ combatPower }}</b>
        </div>
      </div>
      <div class="equipment-layout">
        <div class="equipment-slots left">
          <article v-for="card in equipmentLeftSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
            </div>
          </article>
        </div>
        <div class="operator-card">
          <Operator3D :equipment="equippedParts" />
          <div class="operator-loadout">
            <span>已装备 {{ equippedParts.length }} / {{ attachmentSlots.length }}</span>
            <b>{{ weapon?.name ?? '突击步枪' }}</b>
          </div>
        </div>
        <div class="equipment-slots right">
          <article v-for="card in equipmentRightSlots" :key="card.slot" class="equipment-slot" :class="{ empty: !card.item }">
            <span class="equipment-icon" :style="equipmentIconStyle(card.item, card.index)" aria-hidden="true" />
            <div>
              <small>{{ card.slot }}</small>
              <b>{{ card.item?.name ?? '未装备' }}</b>
              <span>{{ card.item ? `${card.item.rarity} · ${card.item.effect}` : '等待配件掉落' }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="mode === 'settlement'" class="settlement-panel">
      <p class="panel-kicker">{{ lastRun?.victory ? '关卡结算' : '撤离结算' }}</p>
      <h2>{{ lastRun?.title }}</h2>
      <p>{{ lastRun?.body }}</p>
      <div v-if="lastRun?.reward" class="reward-grid">
        <span>金币 +{{ lastRun.reward.gold }}</span>
        <span>经验 +{{ lastRun.reward.exp }}</span>
        <span>合金 +{{ lastRun.reward.alloy }}</span>
        <span>零件 +{{ lastRun.reward.parts }}</span>
      </div>
      <div v-if="lastRun?.stats" class="run-report" aria-label="本关战斗数据">
        <article><span>{{ lastRun.victory ? '通关时间' : '撤离时间' }}</span><b>{{ formatPreciseClock(lastRun.stats.duration) }}</b></article>
        <article><span>时长目标</span><b>{{ lastRun.stats.durationVerdict }}</b></article>
        <article><span>击杀数量</span><b>{{ lastRun.stats.kills }}</b></article>
        <article><span>受伤次数</span><b>{{ lastRun.stats.hitCount }} 次</b></article>
        <article><span>总伤害</span><b>{{ Math.round(lastRun.stats.totalDamage) }}</b></article>
        <article><span>平均 DPS</span><b>{{ Math.round(lastRun.stats.averageDps) }}</b></article>
        <article><span>最高 3 秒 DPS</span><b>{{ Math.round(lastRun.stats.peakDps) }}</b></article>
        <article><span>峰值 / 均值差距</span><b>{{ lastRun.stats.dpsGapPercent }}%</b></article>
        <article><span>最高单次伤害</span><b>{{ Math.round(lastRun.stats.highestHit) }}</b></article>
        <article><span>本关金币</span><b>+{{ lastRun.stats.goldEarned }}</b></article>
        <article><span>本关经验</span><b>+{{ lastRun.stats.expEarned }}</b></article>
        <article v-if="lastRun.stats.deathCombination"><span>致命敌人组合</span><b>{{ lastRun.stats.deathCombination }}</b></article>
      </div>
      <div v-if="lastRun?.stats" class="wave-run-report" aria-label="逐波清理时间">
        <article v-for="wave in lastRun.stats.waves" :key="wave.wave">
          <span>第 {{ wave.wave }} 波 · {{ wave.label }}</span>
          <b>{{ wave.cleared ? '' : '未清 · ' }}{{ wave.duration.toFixed(1) }} 秒</b>
          <small>{{ formatEnemyKinds(wave.enemyKinds) }}</small>
        </article>
      </div>
      <div v-if="overflowSalvageNotice" class="overflow-salvage-notice" data-testid="overflow-salvage-settlement" role="status">
        <b>背包已满，自动回收 {{ overflowSalvageNotice.items.length }} 件低优先级配件</b>
        <span>{{ overflowSalvageNotice.items.map((item) => item.name).join('、') }}</span>
        <strong>返还金币 +{{ overflowSalvageNotice.gold }} / 零件 +{{ overflowSalvageNotice.parts }}</strong>
      </div>
      <section v-if="lastRun?.stats" class="strategy-report" aria-label="配件战术贡献">
        <div class="strategy-report__head">
          <div><p class="panel-kicker">配件策略复盘</p><h3>这套构筑实际做了什么</h3></div>
          <span>按本关命中与闪避实时统计</span>
        </div>
        <div class="strategy-report__grid">
          <article v-for="insight in lastRunStrategyInsights" :key="insight.key" :class="{ muted: !insight.effective }">
            <span>{{ insight.label }}</span>
            <b>{{ insight.value }}</b>
            <small>{{ insight.fit }}</small>
            <em v-if="!insight.effective">本关收益不明显</em>
          </article>
        </div>
      </section>
      <div v-if="lastRun?.reward?.attachments.length" class="loot-card-grid">
        <article v-for="item in lastRun.reward.attachments" :key="attachmentKey(item)" class="loot-card" :class="`rarity-${item.rarity}`">
          <span class="new-tag">新获得</span>
          <span class="recommend-tag" :class="settlementLootTone(item)">{{ settlementLootLabel(item) }}</span>
          <p>{{ item.slot }} · {{ item.rarity }}</p>
          <h3>{{ item.name }}</h3>
          <strong>{{ item.effect }}</strong>
          <div class="equipped-now">
            <span>当前已装备</span>
            <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b>
          </div>
          <div class="loot-compare">
            <div v-if="isAttachmentInInventory(item)" class="decision-hint compact" :class="`tone-${attachmentDecisionFor(item).tone}`">
              <b>{{ attachmentDecisionFor(item).label }}</b>
              <span>{{ attachmentDecisionFor(item).summary }}</span>
            </div>
            <div v-else-if="isAttachmentEquipped(item)" class="decision-hint compact tone-survival">
              <b>已完成替换</b>
              <span>当前同槽已同步为这件配件。</span>
            </div>
            <div v-else class="decision-hint compact tone-downgrade">
              <b>已自动回收</b>
              <span>背包满时转为金币和零件，返还明细见上方提示。</span>
            </div>
            <div class="compare-title">
              <div>
                <span>当前已装备</span>
                <b>{{ currentAttachmentFor(item)?.name ?? '空槽位' }}</b>
              </div>
              <div>
                <span>本次掉落</span>
                <b>{{ item.name }}</b>
              </div>
            </div>
            <div class="compare-lines compact">
              <div v-for="row in attachmentComparisonFor(item)" :key="row.label">
                <span>{{ row.label }}</span>
                <b>{{ row.current }}</b>
                <strong>→</strong>
                <b>{{ row.next }}</b>
              </div>
            </div>
          </div>
          <div class="loot-card-actions">
            <span :class="{ equipped: isAttachmentEquipped(item) }">{{ settlementLootStatus(item) }}</span>
            <button type="button" :disabled="!isAttachmentInInventory(item)" @click="equipSettlementAttachment(item)">立即装备</button>
          </div>
        </article>
      </div>
      <p v-if="settlementEquipNotice" class="settlement-equip-notice">
        <span><b>{{ settlementEquipNotice.equipped }}</b> 已装备</span>
        <span v-if="settlementEquipNotice.replaced">替换下的 <b>{{ settlementEquipNotice.replaced }}</b> 已回背包</span>
      </p>
      <div v-if="lastRun?.victory" class="post-battle-grid">
        <button v-for="choice in postBattleChoices" :key="choice.name" type="button" :disabled="choice.disabled" @click="choosePostBattle(choice)">
          <b>{{ choice.name }}</b>
          <span>{{ choice.desc }}</span>
        </button>
      </div>
      <div class="settlement-actions">
        <button type="button" @click="returnToBase">返回基地整备</button>
        <button v-if="lastRun?.victory" type="button" class="primary" :disabled="inventoryOverCapacity" @click="advanceAndStart">直接下一关</button>
        <button v-else type="button" class="primary" @click="startStage">重新挑战</button>
      </div>
    </section>

    <div v-if="bannerText" class="combat-banner" :class="`tone-${bannerTone}`">{{ bannerText }}</div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Operator3D from './Operator3D.vue'
import battlefieldUrl from '~/assets/images/generated/battlefield.png'
import bulletUrl from '~/assets/images/generated/bullet.png'
import enemyBomberUrl from '~/assets/images/generated/enemy-bomber.png'
import enemyBossUrl from '~/assets/images/generated/enemy-boss.png'
import enemyFastUrl from '~/assets/images/generated/enemy-fast.png'
import enemyGruntUrl from '~/assets/images/generated/enemy-grunt.png'
import enemyHeavyUrl from '~/assets/images/generated/enemy-heavy.png'
import attachmentIconsSheetUrl from '~/assets/images/generated/attachment-icons-sheet.png'
import equipmentIconsSheetUrl from '~/assets/images/generated/equipment-icons-sheet.png'
import pickupExpUrl from '~/assets/images/generated/pickup-exp.png'
import pickupGoldUrl from '~/assets/images/generated/pickup-gold.png'
import playerUrl from '~/assets/images/generated/player.png'
import skillDashUrl from '~/assets/images/generated/skill-dash.png'
import skillOverloadUrl from '~/assets/images/generated/skill-overload.png'
import skillPulseUrl from '~/assets/images/generated/skill-pulse.png'
import { getStageMeta, rewardForStage, scaleEnemyStats, type EnemyKind } from '~/shared/game/formulas'
import { BASE_INVENTORY_CAPACITY, canAffordAttachmentReforge, getAttachmentReforgeCost, resolveAttachmentOverflow, type AttachmentReforgeCost } from '~/shared/game/inventory'
import { enemyKindLabels, getEnemyPreview, getStageTypeLabel } from '~/shared/game/presentation'
import { CURRENT_SAVE_VERSION, emptyLegacyBase, migrateAttachmentIdentity } from '~/shared/game/save'
import { R3_REPLAY_FIXED_DELTA, clockwisePatrolVector, createR3ReplayPlan, createSeededRandom, supportedRareReforges, type R3ReplayPlanEntry, type R3ReplaySample, type R3ReplayStage } from '~/shared/game/replay'
import { countWaveEnemies, createWavePlan, enemyKindForWave, levelTuning, resolvedSpawnInterval } from '~/shared/game/waves'
import { buildStrategyInsights, dpsGapPercent, durationVerdict, type AttachmentContribution, type WaveRunRecord } from '~/shared/game/telemetry'
import { attachmentPool, attachmentRarities, attachmentSlots, starterAttachments, starterWeapon, type Attachment, type AttachmentAffix, type AttachmentBonusKey, type AttachmentRarity, type AttachmentSlot } from '~/shared/game/weapons'

type Vec = { x: number; y: number }
type Enemy = Vec & {
  id: number
  vx: number
  vy: number
  angle: number
  wobble: number
  hp: number
  maxHp: number
  speed: number
  radius: number
  damage: number
  elite: boolean
  boss: boolean
  kind: EnemyKind
  label: string
  attackTimer: number
  aimTime: number
  aimAngle: number
  chargeCooldown: number
  chargeWindup: number
  chargeTime: number
  chargeHit: boolean
  armor: number
  maxArmor: number
  armorBreakFlash: number
  bossPhase: number
}
type Bullet = Vec & { vx: number; vy: number; damage: number; life: number; pierce: number; critical: boolean; hitEnemyIds: Set<number> }
type EnemyProjectile = Vec & { vx: number; vy: number; damage: number; life: number; radius: number; sourceKind: EnemyKind | 'boss' }
type Drop = Vec & { value: number; radius: number; kind: 'gold' | 'exp' }
type Afterimage = Vec & { angle: number; life: number; maxLife: number; size: number }
type StageReward = ReturnType<typeof rewardForStage>
type Reward = StageReward & { attachments: Attachment[] }
type Upgrade = { name: string; desc: string; tag: string; comparison: string; apply: () => void }
type PostBattleChoice = { name: string; desc: string; disabled: boolean; apply: () => void }
type HitText = Vec & { value: string; life: number; maxLife: number; color: string; critical?: boolean }
type RunStatsSnapshot = {
  duration: number
  kills: number
  totalDamage: number
  averageDps: number
  peakDps: number
  highestHit: number
  goldEarned: number
  expEarned: number
  hitCount: number
  damageTaken: number
  waves: WaveRunRecord[]
  deathCombination: string
  dpsGapPercent: number
  durationVerdict: string
  contribution: AttachmentContribution
  loadoutBonuses: AttachmentBonusMap
}
type SkillKey = 'dash' | 'overload' | 'pulse'
type CompareRow = { label: string; current: string; next: string }
type AttachmentBonusMap = NonNullable<Attachment['bonuses']>
type EquippedBonusTotals = Record<AttachmentBonusKey, number>
type AttachmentDecisionTone = 'offense' | 'survival' | 'utility' | 'downgrade'
type AttachmentDecision = {
  label: string
  summary: string
  actionLabel: '推荐装备' | '适合保留'
  tone: AttachmentDecisionTone
}
type InventorySortMode = '最近获得' | '品质优先' | '槽位整理'
type InventoryFilterMode = '全部' | '收藏' | '推荐' | '可替换' | '低品质'
type AttachmentSlotFilter = AttachmentSlot | '全部'
type AttachmentRarityFilter = AttachmentRarity | '全部'
type CharacterStatTone = 'offense' | 'survival' | 'mobility' | 'growth'
type CharacterStat = { key: string; label: string; value: string | number; hint: string; tone: CharacterStatTone }
type Mode = 'base' | 'battle' | 'settlement'
type PlayArea = { x: number; y: number; width: number; height: number }
type SaveData = {
  saveVersion: number
  stage: number
  highestCleared?: number
  resources: typeof resources
  base: typeof base
  player: Pick<typeof player, 'level' | 'exp' | 'hp'>
  equipped: Array<string | Attachment>
  inventory: Array<string | Attachment>
  acquireOrder?: Record<string, number>
}

type R3ReplayBatchOptions = { speed?: number; baseSeed?: number }
type R3ReplayStatus = {
  status: string
  currentLabel: string
  validSamples: number
  rejectedSamples: number
  message: string
  samples: R3ReplaySample[]
  rejected: R3ReplaySample[]
}

declare global {
  interface Window {
    __gunfightR3Replay?: {
      start: (options?: R3ReplayBatchOptions) => Promise<void>
      stop: () => void
      getStatus: () => R3ReplayStatus
    }
  }
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const SAVE_KEY = 'gunfight-growth-save-v1'
const keys = new Set<string>()
const mode = ref<Mode>('base')
const stage = ref(1)
const stageDraft = ref(1)
const highestCleared = ref(0)
const kills = ref(0)
const spawnedEnemyCount = ref(0)
const upgradeChoices = ref<Upgrade[]>([])
const upgradeTakenForStage = ref(0)
const resources = reactive({ gold: 80, alloy: 3, parts: 0 })
const base = reactive({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })
const lastRun = ref<{ title: string; body: string; victory: boolean; reward?: Reward; stats: RunStatsSnapshot } | null>(null)
const bannerText = ref('')
const bannerTone = ref<'normal' | 'elite' | 'victory'>('normal')
const killNotice = ref('')
const currentWave = ref(1)
const waveSpawnedCount = ref(0)
const waveTransitionSeconds = ref(0)
const waveTransitionPending = ref(false)
const bossHud = reactive({ visible: false, label: '', phaseLabel: '', hp: 0, maxHp: 1, hpPercent: 0 })
const damageDirection = reactive({ angle: 0, life: 0 })
const runStats = reactive({
  currentDps: 0,
  peakDps: 0,
  totalDamage: 0,
  highestHit: 0,
  goldEarned: 0,
  expEarned: 0,
  hitCount: 0,
  damageTaken: 0,
  heavyPierceDamage: 0,
  criticalTriggers: 0,
  criticalExtraDamage: 0,
  dodgedCharges: 0,
  totalChargeAttempts: 0,
  deathCombination: ''
})
const settlementEquipNotice = ref<{ equipped: string; replaced?: string } | null>(null)
const overflowSalvageNotice = ref<{ items: Attachment[]; gold: number; parts: number } | null>(null)
const replayUi = reactive({
  visible: false,
  status: 'idle',
  currentLabel: '',
  validSamples: 0,
  rejectedSamples: 0,
  message: ''
})
const replayResultsJson = computed(() => {
  void replayUi.validSamples
  void replayUi.rejectedSamples
  void replayUi.status
  void replayUi.message
  return JSON.stringify(replayStatus())
})
const player = reactive({
  x: 0,
  y: 0,
  visualX: 0,
  visualY: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  bob: 0,
  afterimageTimer: 0,
  hp: 120,
  maxHp: 120,
  speed: 235,
  radius: 17,
  fireTimer: 0,
  invuln: 0,
  level: 1,
  exp: 0
})
const modifiers = reactive({ damage: 1, fireRate: 1, speed: 1, pickup: 70, pierceBonus: 0, expGain: 1, critRate: 0 })
const skills = reactive([
  { key: 'dash' as SkillKey, shortcut: '1', name: '战术冲刺', hint: '瞬间拉开', cooldown: 0, icon: skillDashUrl },
  { key: 'overload' as SkillKey, shortcut: '2', name: '过载火力', hint: '短时射速', cooldown: 0, icon: skillOverloadUrl },
  { key: 'pulse' as SkillKey, shortcut: '3', name: '磁暴脉冲', hint: '清近身怪', cooldown: 0, icon: skillPulseUrl }
])

const assetUrls = {
  battlefield: battlefieldUrl,
  player: playerUrl,
  bullet: bulletUrl,
  enemyGrunt: enemyGruntUrl,
  enemyFast: enemyFastUrl,
  enemyHeavy: enemyHeavyUrl,
  enemyBomber: enemyBomberUrl,
  enemyBoss: enemyBossUrl,
  pickupGold: pickupGoldUrl,
  pickupExp: pickupExpUrl
}
const sprites: Partial<Record<keyof typeof assetUrls, HTMLImageElement>> = {}
const weapon = starterWeapon
const attachmentByName = new Map(attachmentPool.map((item) => [item.name, item]))
let attachmentInstanceCursor = 0
const equippedParts = reactive<Attachment[]>([])
const inventory = ref<Attachment[]>([])
const inventorySortOptions: InventorySortMode[] = ['最近获得', '品质优先', '槽位整理']
const inventoryFilterOptions: InventoryFilterMode[] = ['全部', '收藏', '推荐', '可替换', '低品质']
const attachmentSlotFilters = ['全部', ...attachmentSlots] as const
const attachmentRarityFilters = ['全部', ...attachmentRarities] as const
const selectedInventorySort = ref<InventorySortMode>('最近获得')
const selectedInventoryFilter = ref<InventoryFilterMode>('全部')
const selectedSlot = ref<AttachmentSlotFilter>('全部')
const selectedRarity = ref<AttachmentRarityFilter>('全部')
const selectedAttachment = ref<Attachment | null>(null)
const lockedReforgeAffix = ref<{ attachmentKey: string; affixKey: AttachmentBonusKey } | null>(null)
const isSaleMode = ref(false)
const saleSelection = reactive(new Set<string>())
const attachmentAcquireOrder = reactive<Record<string, number>>({})
const enemies: Enemy[] = []
const bullets: Bullet[] = []
const enemyProjectiles: EnemyProjectile[] = []
const drops: Drop[] = []
const afterimages: Afterimage[] = []
const hitTexts: HitText[] = []
let nextEnemyId = 1
let animationFrame = 0
let lastTime = 0
let spawnTimer = 0
const stageTimer = ref(0)
let overloadTimer = 0
let dashTimer = 0
let playerHitFlash = 0
let screenShake = 0
let bossSpawned = false
let audioContext: AudioContext | null = null
let killNoticeTimer = 0
const damageEvents: Array<{ time: number; amount: number }> = []
const waveRecords: WaveRunRecord[] = []
const recordedWaveIndexes = new Set<number>()
let waveStartTime = 0
let context: CanvasRenderingContext2D | null = null
let canPersist = false
let attachmentAcquireCursor = 0
let replayPersistenceSuppressed = false
const replayRuntime = {
  running: false,
  plan: [] as R3ReplayPlanEntry[],
  planIndex: 0,
  attempt: 1,
  speed: 1,
  random: Math.random as () => number,
  waypointIndex: 0,
  samples: [] as R3ReplaySample[],
  rejected: [] as R3ReplaySample[],
  issues: new Set<string>(),
  maxFrameGapMs: 0,
  previousFrameAt: 0,
  wallStartedAt: 0,
  startResources: { gold: 0, alloy: 0, parts: 0 },
  fixtureFactory: null as null | ((stage: R3ReplayStage) => SaveData)
}

const stageMeta = computed(() => getStageMeta(stage.value))
const stageLabel = computed(() => stage.value.toString().padStart(4, '0'))
const debugStageSelection = import.meta.dev
const maxSelectableStage = computed(() => debugStageSelection ? 10000 : Math.min(10000, highestCleared.value + 1))
const wavePlan = computed(() => createWavePlan(stage.value))
const totalWaves = computed(() => wavePlan.value.length)
const currentWaveDefinition = computed(() => wavePlan.value[currentWave.value - 1])
const targetKills = computed(() => countWaveEnemies(wavePlan.value))
const nextLevelExp = computed(() => player.level * 100)
const expToNextLevel = computed(() => Math.max(0, nextLevelExp.value - player.exp))
const hpPercent = computed(() => Math.max(0, Math.round((player.hp / player.maxHp) * 100)))
const expPercent = computed(() => Math.min(100, Math.round((player.exp / nextLevelExp.value) * 100)))
const elapsedSeconds = computed(() => Math.floor(stageTimer.value))
const damagePreview = computed(() => Math.round(weapon.damage * modifiers.damage))
const fireRatePreview = computed(() => (weapon.fireRate * modifiers.fireRate).toFixed(1))
const moveSpeedPreview = computed(() => Math.round(player.speed * modifiers.speed))
const critRatePreview = computed(() => Math.round(modifiers.critRate * 100))
const expGainPreview = computed(() => Math.round(modifiers.expGain * 100))
const expGainBonusPreview = computed(() => Math.round((modifiers.expGain - 1) * 100))
const totalPiercePreview = computed(() => weapon.pierce + modifiers.pierceBonus)
const damageReductionPreview = computed(() => 0)
const expectedDpsPreview = computed(() => Math.round(Number(damagePreview.value) * Number(fireRatePreview.value) * (1 + modifiers.critRate * 0.75)))
const combatPower = computed(() => {
  const offense = weapon.damage * modifiers.damage * weapon.fireRate * modifiers.fireRate * (1 + modifiers.critRate * 0.55) * (1 + (weapon.pierce + modifiers.pierceBonus) * 0.18)
  const survival = player.maxHp
  return Math.round(offense * 7 + survival * 2 + modifiers.pickup * 0.8)
})
const characterStats = computed<CharacterStat[]>(() => [
  { key: 'damage', label: '单发伤害', value: damagePreview.value, hint: '每颗子弹未暴击时造成的伤害。', tone: 'offense' },
  { key: 'dps', label: '秒伤预估', value: expectedDpsPreview.value, hint: '按当前射速和暴击率计算的持续输出预估。', tone: 'offense' },
  { key: 'fireRate', label: '攻击频率', value: `${fireRatePreview.value}/秒`, hint: '每秒发射的子弹数量。', tone: 'offense' },
  { key: 'pierce', label: '子弹穿透', value: totalPiercePreview.value, hint: '一颗子弹可额外穿过的敌人数量。', tone: 'offense' },
  { key: 'critRate', label: '暴击率', value: `${critRatePreview.value}%`, hint: '每次命中触发暴击的概率。', tone: 'offense' },
  { key: 'critDamage', label: '暴击伤害', value: '175%', hint: '暴击命中造成的固定伤害倍率。', tone: 'offense' },
  { key: 'health', label: '生命', value: `${Math.ceil(player.hp)}/${player.maxHp}`, hint: '当前生命与最大生命。', tone: 'survival' },
  { key: 'reduction', label: '接触减伤', value: `${damageReductionPreview.value}%`, hint: '当前构筑提供的敌人接触伤害减免。', tone: 'survival' },
  { key: 'speed', label: '移动速度', value: moveSpeedPreview.value, hint: '角色每秒移动距离。', tone: 'mobility' },
  { key: 'pickup', label: '拾取范围', value: Math.round(modifiers.pickup), hint: '自动吸取金币和经验的半径。', tone: 'mobility' },
  { key: 'range', label: '武器射程', value: weapon.range, hint: '子弹的最大有效飞行距离。', tone: 'mobility' },
  { key: 'expGain', label: '经验获取', value: `${expGainBonusPreview.value >= 0 ? '+' : ''}${expGainBonusPreview.value}%`, hint: `当前经验收益倍率为 ${expGainPreview.value}%。`, tone: 'growth' }
])
const stageType = computed(() => getStageTypeLabel(stage.value))
const nextEnemyPreview = computed(() => getEnemyPreview(stage.value))
const inventoryCapacityLabel = computed(() => `${inventory.value.length} / ${BASE_INVENTORY_CAPACITY}`)
const inventoryNearCapacity = computed(() => inventory.value.length >= Math.floor(BASE_INVENTORY_CAPACITY * 0.8))
const inventoryOverCapacity = computed(() => inventory.value.length > BASE_INVENTORY_CAPACITY)
const favoriteAttachmentCount = computed(() => inventory.value.filter((item) => item.favorite).length)
const stageRewardPreview = computed(() => rewardForStage(stage.value, targetKills.value))
const dropProfile = computed(() => {
  const profile = getAttachmentDropProfile(stage.value)
  const raritySummary = attachmentRarities.filter((rarity) => profile.rarityWeights[rarity] > 0).join(' / ')
  return {
    ...profile,
    raritySummary,
    dropChance: Math.round(profile.dropChance * 100)
  }
})
const waveStatusText = computed(() => {
  void kills.value
  const wave = currentWaveDefinition.value
  if (!wave) return '区域已清空'
  if (waveTransitionPending.value) return `威胁已清除 · ${Math.max(0, waveTransitionSeconds.value).toFixed(1)} 秒后接敌`
  return `已投入 ${waveSpawnedCount.value} / ${wave.count} · 场上 ${enemies.length}`
})
const lastRunStrategyInsights = computed(() => {
  const stats = lastRun.value?.stats
  return stats ? buildStrategyInsights(stats.contribution, stats.loadoutBonuses) : []
})
const canSwapAttachment = computed(() => mode.value !== 'battle' && inventory.value.length > 0)
const attachmentSwapLabel = computed(() => {
  if (mode.value === 'battle') return '配件背包 · 战斗中锁定'
  if (!inventory.value.length) return '配件背包 · 等待掉落'
  return '配件背包 · 点击替换'
})
const inventoryBySlot = computed(() => {
  return attachmentSlots.reduce(
    (groups, slot) => {
      groups[slot] = inventory.value.filter((item) => item.slot === slot)
      return groups
    },
    {} as Record<AttachmentSlot, Attachment[]>
  )
})
const inventoryByRarity = computed(() =>
  attachmentRarities.reduce(
    (counts, rarity) => {
      counts[rarity] = inventory.value.filter((item) => item.rarity === rarity).length
      return counts
    },
    {} as Record<AttachmentRarity, number>
  )
)
const equipmentSlotCards = computed(() =>
  attachmentSlots.map((slot, index) => ({
    slot,
    index,
    item: equippedParts.find((part) => part.slot === slot)
  }))
)
const equipmentLeftSlots = computed(() => equipmentSlotCards.value.slice(0, 4))
const equipmentRightSlots = computed(() => equipmentSlotCards.value.slice(4))
const filteredInventory = computed(() => {
  const bySlot = selectedSlot.value === '全部' ? inventory.value : inventoryBySlot.value[selectedSlot.value] ?? []
  return [...bySlot]
    .filter((item) => {
      if (selectedRarity.value !== '全部' && item.rarity !== selectedRarity.value) return false
      if (selectedInventoryFilter.value === '收藏') return Boolean(item.favorite)
      if (selectedInventoryFilter.value === '推荐') return isRecommendedAttachment(item)
      if (selectedInventoryFilter.value === '可替换') return isReplaceableAttachment(item)
      if (selectedInventoryFilter.value === '低品质') return isLowQualityAttachment(item)
      return true
    })
    .sort(compareInventoryAttachments)
})
const saleItems = computed(() => inventory.value.filter((item) => !item.favorite && saleSelection.has(attachmentKey(item))))
const sellableFilteredInventory = computed(() => filteredInventory.value.filter((item) => !item.favorite))
const saleReward = computed(() => {
  return saleItems.value.reduce(
    (total, item) => {
      const reward = recycleAttachmentValue(item)
      total.gold += reward.gold
      total.parts += reward.parts
      return total
    },
    { gold: 0, parts: 0 }
  )
})
const allFilteredSelected = computed(() => Boolean(sellableFilteredInventory.value.length) && sellableFilteredInventory.value.every((item) => saleSelection.has(attachmentKey(item))))
const currentAttachmentForSelected = computed(() => (selectedAttachment.value ? equippedParts.find((part) => part.slot === selectedAttachment.value?.slot) : undefined))
const selectedAttachmentCompare = computed<CompareRow[]>(() => {
  if (!selectedAttachment.value) return []
  return buildAttachmentComparison(currentAttachmentForSelected.value, selectedAttachment.value)
})
const selectedAttachmentDecision = computed<AttachmentDecision>(() => {
  if (!selectedAttachment.value) {
    return { label: '功能向替换', summary: '选择配件后显示换装判断。', actionLabel: '适合保留', tone: 'utility' }
  }
  return buildAttachmentDecision(currentAttachmentForSelected.value, selectedAttachment.value)
})
const selectedAttachmentUpgradeCost = computed(() => (selectedAttachment.value ? attachmentUpgradeCost(selectedAttachment.value) : 0))
const selectedAttachmentReforgeCost = computed<AttachmentReforgeCost>(() => (selectedAttachment.value ? reforgeCostFor(selectedAttachment.value) : { parts: 0, gold: 0, alloy: 0 }))
const canUpgradeSelectedAttachment = computed(() => Boolean(selectedAttachment.value && canSwapAttachment.value && resources.parts >= selectedAttachmentUpgradeCost.value && (selectedAttachment.value.level ?? 0) < attachmentMaxLevel(selectedAttachment.value)))
const canReforgeSelectedAttachment = computed(() => Boolean(selectedAttachment.value && canSwapAttachment.value && canAffordAttachmentReforge(resources, selectedAttachmentReforgeCost.value)))
const postBattleChoices = computed<PostBattleChoice[]>(() => [
  {
    name: '修复生命',
    desc: '回复 45% 最大生命，适合直接连战。',
    disabled: player.hp >= player.maxHp,
    apply: () => {
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.45))
      bannerText.value = '生命修复完成'
      saveGame()
    }
  },
  {
    name: '拆解零件',
    desc: '把 1 个零件转成 24 金币，方便整理背包资源。',
    disabled: resources.parts < 1,
    apply: () => {
      resources.parts -= 1
      resources.gold += 24
      bannerText.value = '零件已拆解'
      saveGame()
    }
  }
])

function getAttachmentDropProfile(level: number) {
  if (level % 10 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 0, 精良: 22, 稀有: 58, 史诗: 20 } satisfies Record<AttachmentRarity, number>
    }
  }
  if (level % 5 === 0) {
    return {
      dropChance: 1,
      rarityWeights: { 普通: 8, 精良: 42, 稀有: 45, 史诗: 5 } satisfies Record<AttachmentRarity, number>
    }
  }
  return {
    dropChance: 0.38,
    rarityWeights: { 普通: 25, 精良: 45, 稀有: 30, 史诗: 0 } satisfies Record<AttachmentRarity, number>
  }
}

function rollWeightedRarity(weights: Record<AttachmentRarity, number>) {
  const total = attachmentRarities.reduce((sum, rarity) => sum + weights[rarity], 0)
  let cursor = gameplayRandom() * total
  for (const rarity of attachmentRarities) {
    cursor -= weights[rarity]
    if (cursor <= 0) return rarity
  }
  return attachmentRarities[attachmentRarities.length - 1]
}

function attachmentKey(item: Attachment) {
  return item.id ?? `${item.templateKey ?? item.name}:${item.name}`
}

function sameAttachment(a: Attachment, b: Attachment) {
  return attachmentKey(a) === attachmentKey(b)
}

function nextAttachmentId(source: string) {
  attachmentInstanceCursor += 1
  const timeToken = replayRuntime.running ? `r3-${replayRuntime.plan[replayRuntime.planIndex]?.seed ?? 0}` : Date.now().toString(36)
  return `${source}-${timeToken}-${attachmentInstanceCursor.toString(36)}`
}

const bonusLabels: Record<AttachmentBonusKey, string> = {
  damage: '伤害',
  fireRate: '射速',
  maxHp: '最大生命',
  pickup: '拾取',
  speed: '移速',
  pierce: '穿透',
  expGain: '经验',
  critRate: '暴击率'
}

const subAffixBase: Record<AttachmentBonusKey, number> = {
  damage: 0.025,
  fireRate: 0.025,
  maxHp: 10,
  pickup: 12,
  speed: 0.025,
  pierce: 1,
  expGain: 0.03,
  critRate: 0.03
}

const bonusKeys = Object.keys(bonusLabels) as AttachmentBonusKey[]

function normalizeBonus(key: AttachmentBonusKey, value: number) {
  if (key === 'maxHp' || key === 'pickup') return Math.max(1, Math.round(value))
  if (key === 'pierce') return Math.max(1, Math.round(value))
  return Math.round(value * 1000) / 1000
}

function rarityScaleFor(rarity: AttachmentRarity) {
  return [0.78, 1, 1.28, 1.68][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
}

function subAffixCountFor(rarity: AttachmentRarity) {
  return [1, 2, 3, 4][Math.max(0, attachmentRarities.indexOf(rarity))] ?? 1
}

function createAffix(key: AttachmentBonusKey, value: number, tier: AttachmentAffix['tier']): AttachmentAffix {
  return { key, label: bonusLabels[key], value: normalizeBonus(key, value), tier }
}

function rollSubAffixes(rarity: AttachmentRarity, mainKey: AttachmentBonusKey, lockedAffix?: AttachmentAffix) {
  const rank = Math.max(0, attachmentRarities.indexOf(rarity))
  const available = bonusKeys.filter((key) => key !== mainKey && key !== lockedAffix?.key)
  const affixes: AttachmentAffix[] = lockedAffix ? [{ ...lockedAffix }] : []
  for (let i = affixes.length; i < subAffixCountFor(rarity); i++) {
    const key = available.splice(Math.floor(gameplayRandom() * available.length), 1)[0] ?? mainKey
    const roll = 0.78 + gameplayRandom() * 0.44
    const rankScale = 0.82 + rank * 0.22
    affixes.push(createAffix(key, subAffixBase[key] * rankScale * roll, '副词条'))
  }
  return affixes
}

function combineAffixBonuses(mainAffix: AttachmentAffix | undefined, subAffixes: AttachmentAffix[] | undefined) {
  const bonuses: AttachmentBonusMap = {}
  for (const affix of [mainAffix, ...(subAffixes ?? [])]) {
    if (!affix) continue
    bonuses[affix.key] = normalizeBonus(affix.key, (bonuses[affix.key] ?? 0) + affix.value)
  }
  return bonuses
}

function createAttachmentInstance(template: Attachment, source: string, rarity = template.rarity, fixedRoll?: number): Attachment {
  const roll = fixedRoll ?? Math.round((0.82 + gameplayRandom() * 0.36) * 100) / 100
  const templateRank = Math.max(0, attachmentRarities.indexOf(template.rarity))
  const targetRank = Math.max(0, attachmentRarities.indexOf(rarity))
  const rarityScale = rarityScaleFor(rarity) / (rarityScaleFor(template.rarity) || 1)
  const mainEntry = (Object.entries(template.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>)[0]
  const mainKey = mainEntry?.[0] ?? 'damage'
  const mainAffix = createAffix(mainKey, (mainEntry?.[1] ?? subAffixBase[mainKey]) * rarityScale * roll, '主词条')
  const subAffixes = source === 'starter' ? [] : rollSubAffixes(rarity, mainKey)
  const bonuses = combineAffixBonuses(mainAffix, subAffixes)
  const id = template.id ?? nextAttachmentId(source)
  const suffix = source === 'starter' ? '' : ` #${attachmentInstanceCursor.toString().padStart(3, '0')}`
  return {
    ...template,
    id,
    templateKey: template.templateKey ?? template.name,
    roll,
    level: 0,
    mainAffix,
    subAffixes,
    rarity,
    name: source === 'starter' ? template.name : `${template.name}${suffix}`,
    bonuses,
    effect: formatAttachmentEffect(bonuses)
  }
}

function reviveAttachment(saved: string | Attachment | undefined, source: string) {
  if (!saved) return undefined
  if (typeof saved === 'string') {
    const template = attachmentByName.get(saved === '吸血模块' ? '生命模块' : saved)
    return template ? createAttachmentInstance(template, source, template.rarity, 1) : undefined
  }
  const migrated = migrateAttachmentIdentity(saved)
  if (!migrated.name && !migrated.templateKey) return undefined
  const template = attachmentByName.get(migrated.templateKey ?? migrated.name)
  const base = template ?? migrated
  const revived = {
    ...base,
    ...migrated,
    id: migrated.id ?? nextAttachmentId(source),
    templateKey: migrated.templateKey ?? base.templateKey ?? base.name
  }
  const mainAffix = revived.mainAffix ?? createLegacyMainAffix(revived)
  const subAffixes = revived.subAffixes ?? []
  const bonuses = combineAffixBonuses(mainAffix, subAffixes)
  return {
    ...revived,
    level: migrated.level ?? 0,
    mainAffix,
    subAffixes,
    bonuses,
    effect: formatAttachmentEffect(bonuses)
  }
}

const attachmentIconIndex: Record<string, number> = {
  聚束枪口: 0,
  快速弹匣: 1,
  穿甲枪管: 2,
  训练芯片: 3,
  燃烧弹芯: 4,
  吸血模块: 5,
  生命模块: 5,
  红点瞄具: 6,
  稳定枪托: 7,
  回收磁环: 8,
  军规模块: 9,
  重型枪托: 10,
  高压弹头: 11,
  贯通线圈: 12,
  战术记录仪: 13
}

function createLegacyMainAffix(item: Attachment) {
  const entry = (Object.entries(item.bonuses ?? {}) as Array<[AttachmentBonusKey, number]>)[0]
  return createAffix(entry?.[0] ?? 'damage', entry?.[1] ?? 0.04, '主词条')
}

function iconSheetStyle(url: string, index: number, columns: number, rows: number) {
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${col * (100 / Math.max(1, columns - 1))}% ${row * (100 / Math.max(1, rows - 1))}%`
  }
}

function equipmentIconStyle(item: Attachment | undefined, fallbackSlotIndex: number) {
  const templateName = item?.templateKey ?? item?.name
  const itemIconIndex = templateName ? attachmentIconIndex[templateName] : undefined
  return itemIconIndex === undefined ? iconSheetStyle(equipmentIconsSheetUrl, fallbackSlotIndex, 4, 2) : iconSheetStyle(attachmentIconsSheetUrl, itemIconIndex, 4, 4)
}

function formatAttachmentEffect(bonuses: Attachment['bonuses']) {
  if (!bonuses) return ''
  return (Object.entries(bonuses) as Array<[AttachmentBonusKey, number]>)
    .filter(([, value]) => value)
    .map(([key, value]) => formatBonusValue(key, value))
    .join(' / ')
}

function formatBonusValue(key: AttachmentBonusKey, value?: number) {
  if (!value) return key === 'pierce' ? '无穿透' : '无'
  if (key === 'damage') return `伤害 +${Math.round(value * 100)}%`
  if (key === 'fireRate') return `射速 +${Math.round(value * 100)}%`
  if (key === 'maxHp') return `最大生命 +${value}`
  if (key === 'pickup') return `拾取 +${value}`
  if (key === 'speed') return `移速 +${Math.round(value * 100)}%`
  if (key === 'pierce') return `穿透 +${value}`
  if (key === 'critRate') return `暴击率 +${Math.round(value * 100)}%`
  return `经验 +${Math.round(value * 100)}%`
}

function formatAffix(affix: AttachmentAffix) {
  return formatBonusValue(affix.key, affix.value)
}

function formatRoll(roll?: number) {
  return `${Math.round((roll ?? 1) * 100)}%`
}

function attachmentInstanceLabel(item: Attachment) {
  return (item.id ?? attachmentKey(item)).split('-').slice(-2).join('-').toUpperCase()
}

equippedParts.splice(0, equippedParts.length, ...starterAttachments.map((item) => createAttachmentInstance(item, 'starter', item.rarity, 1)))

function buildAttachmentComparison(current: Attachment | undefined, next: Attachment) {
  const keys = ['damage', 'fireRate', 'critRate', 'maxHp', 'pickup', 'speed', 'pierce', 'expGain'] as const
  return keys
    .filter((key) => (current?.bonuses?.[key] ?? 0) !== 0 || (next.bonuses?.[key] ?? 0) !== 0)
    .map((key) => ({
      label: {
        damage: '伤害',
        fireRate: '射速',
        critRate: '暴击',
        maxHp: '生命',
        pickup: '拾取',
        speed: '移速',
        pierce: '穿透',
        expGain: '经验'
      }[key],
      current: formatBonusValue(key, current?.bonuses?.[key]),
      next: formatBonusValue(key, next.bonuses?.[key])
    }))
}

function attachmentDecisionFor(item: Attachment) {
  return buildAttachmentDecision(currentAttachmentFor(item), item)
}

function buildAttachmentDecision(current: Attachment | undefined, next: Attachment): AttachmentDecision {
  const currentBonus = current?.bonuses ?? {}
  const nextBonus = next.bonuses ?? {}
  const delta = {
    damage: (nextBonus.damage ?? 0) - (currentBonus.damage ?? 0),
    fireRate: (nextBonus.fireRate ?? 0) - (currentBonus.fireRate ?? 0),
    maxHp: (nextBonus.maxHp ?? 0) - (currentBonus.maxHp ?? 0),
    pickup: (nextBonus.pickup ?? 0) - (currentBonus.pickup ?? 0),
    speed: (nextBonus.speed ?? 0) - (currentBonus.speed ?? 0),
    pierce: (nextBonus.pierce ?? 0) - (currentBonus.pierce ?? 0),
    expGain: (nextBonus.expGain ?? 0) - (currentBonus.expGain ?? 0),
    critRate: (nextBonus.critRate ?? 0) - (currentBonus.critRate ?? 0)
  }
  const rarityDelta = attachmentRarities.indexOf(next.rarity) - (current ? attachmentRarities.indexOf(current.rarity) : -1)
  const offenseScore = delta.damage * 100 + delta.fireRate * 80 + delta.critRate * 90 + delta.pierce * 16
  const survivalScore = delta.maxHp + delta.speed * 120
  const utilityScore = delta.pickup * 0.7 + delta.expGain * 120
  const hasMajorGain = rarityDelta > 0 || delta.damage >= 0.04 || delta.fireRate >= 0.06 || delta.critRate >= 0.03 || delta.pierce >= 1 || delta.maxHp >= 15 || delta.pickup >= 18 || delta.expGain >= 0.05 || delta.speed >= 0.06
  const hasAnyGain = offenseScore > 0 || survivalScore > 0 || utilityScore > 0
  const mostlyLoss = rarityDelta < 0 && offenseScore <= 0 && survivalScore <= 0 && utilityScore <= 0

  if (mostlyLoss || (!hasAnyGain && rarityDelta <= 0 && current)) {
    return {
      label: '可能降级',
      summary: rarityDelta < 0 ? `品质低于当前 ${current?.rarity ?? '装备'}，建议先留背包。` : '关键属性没有明显增益，暂时不急着换。',
      actionLabel: '适合保留',
      tone: 'downgrade'
    }
  }

  if (offenseScore >= survivalScore && offenseScore >= utilityScore && offenseScore > 0) {
    return {
      label: '输出提升',
      summary: delta.pierce > 0 ? '穿透或火力更强，清怪效率会更好。' : '伤害、射速或暴击更高，适合直接强化火力。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'offense'
    }
  }

  if (survivalScore >= utilityScore && survivalScore > 0) {
    return {
      label: '生存提升',
      summary: delta.maxHp > 0 ? '最大生命更高，容错会更稳。' : '机动性更好，走位压力会降低。',
      actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
      tone: 'survival'
    }
  }

  return {
    label: '功能向替换',
    summary: delta.expGain > 0 ? '偏向经验收益，适合刷成长。' : '偏向拾取或节奏收益，适合特定推关需求。',
    actionLabel: hasMajorGain ? '推荐装备' : '适合保留',
    tone: 'utility'
  }
}

function currentAttachmentFor(item: Attachment) {
  return equippedParts.find((part) => part.slot === item.slot)
}

function attachmentComparisonFor(item: Attachment) {
  return buildAttachmentComparison(currentAttachmentFor(item), item)
}

function isAttachmentInInventory(item: Attachment) {
  return inventory.value.some((part) => sameAttachment(part, item))
}

function isAttachmentEquipped(item: Attachment) {
  return equippedParts.some((part) => sameAttachment(part, item))
}

function isAttachmentAutoRecycled(item: Attachment) {
  return Boolean(overflowSalvageNotice.value?.items.some((part) => sameAttachment(part, item)))
}

function settlementLootLabel(item: Attachment) {
  if (isAttachmentInInventory(item)) return attachmentDecisionFor(item).actionLabel
  if (isAttachmentEquipped(item)) return '已装备'
  if (isAttachmentAutoRecycled(item)) return '已回收'
  return '已处理'
}

function settlementLootTone(item: Attachment) {
  if (isAttachmentInInventory(item)) return `tone-${attachmentDecisionFor(item).tone}`
  return isAttachmentEquipped(item) ? 'tone-survival' : 'tone-downgrade'
}

function settlementLootStatus(item: Attachment) {
  if (isAttachmentInInventory(item)) return '保留到背包'
  if (isAttachmentEquipped(item)) return '已装备'
  if (isAttachmentAutoRecycled(item)) return '已自动回收'
  return '已处理'
}

function formatEnemyKinds(kinds: string[]) {
  return kinds.map((kind) => enemyKindLabels[kind as EnemyKind] ?? kind).join(' / ')
}

function rarityRank(item: Attachment) {
  return attachmentRarities.indexOf(item.rarity)
}

function slotRank(item: Attachment) {
  return attachmentSlots.indexOf(item.slot)
}

function attachmentOrder(item: Attachment) {
  return attachmentAcquireOrder[attachmentKey(item)] ?? 0
}

function compareInventoryAttachments(a: Attachment, b: Attachment) {
  if (selectedInventorySort.value === '槽位整理') {
    return slotRank(a) - slotRank(b) || rarityRank(b) - rarityRank(a) || attachmentOrder(b) - attachmentOrder(a)
  }
  if (selectedInventorySort.value === '品质优先') {
    return rarityRank(b) - rarityRank(a) || slotRank(a) - slotRank(b) || attachmentOrder(b) - attachmentOrder(a)
  }
  return attachmentOrder(b) - attachmentOrder(a) || rarityRank(b) - rarityRank(a) || slotRank(a) - slotRank(b)
}

function isRecommendedAttachment(item: Attachment) {
  return attachmentDecisionFor(item).actionLabel === '推荐装备'
}

function isReplaceableAttachment(item: Attachment) {
  return attachmentDecisionFor(item).tone !== 'downgrade'
}

function isLowQualityAttachment(item: Attachment) {
  const current = currentAttachmentFor(item)
  const currentRank = current ? rarityRank(current) : -1
  return rarityRank(item) <= attachmentRarities.indexOf('精良') || rarityRank(item) < currentRank || attachmentDecisionFor(item).tone === 'downgrade'
}

function recycleAttachmentValue(item: Attachment) {
  const goldByRarity = [18, 32, 58, 96]
  const partsByRarity = [0, 1, 2, 4]
  const rank = rarityRank(item)
  return { gold: goldByRarity[rank] ?? 18, parts: (partsByRarity[rank] ?? 0) + Math.floor((item.level ?? 0) / 2) }
}

function markAttachmentAcquired(item: Attachment) {
  attachmentAcquireCursor += 1
  attachmentAcquireOrder[attachmentKey(item)] = attachmentAcquireCursor
}

function ensureAttachmentOrder(item: Attachment, fallback = 0) {
  const key = attachmentKey(item)
  if (attachmentAcquireOrder[key] === undefined) {
    attachmentAcquireOrder[key] = fallback
  }
  attachmentAcquireCursor = Math.max(attachmentAcquireCursor, attachmentAcquireOrder[key] ?? 0)
}

function isSaleSelected(item: Attachment) {
  return saleSelection.has(attachmentKey(item))
}

function lockedAffixFor(item: Attachment) {
  const lock = lockedReforgeAffix.value
  if (!lock || lock.attachmentKey !== attachmentKey(item)) return undefined
  return item.subAffixes?.find((affix) => affix.key === lock.affixKey)
}

function isReforgeAffixLocked(item: Attachment, affix: AttachmentAffix) {
  return lockedAffixFor(item)?.key === affix.key
}

function toggleReforgeAffixLock(item: Attachment, affix: AttachmentAffix) {
  if (mode.value === 'battle' || !isAttachmentInInventory(item)) return
  selectAttachment(item)
  if (isReforgeAffixLocked(item, affix)) lockedReforgeAffix.value = null
  else lockedReforgeAffix.value = { attachmentKey: attachmentKey(item), affixKey: affix.key }
}

function toggleAttachmentFavorite(item: Attachment) {
  if (mode.value === 'battle' || !isAttachmentInInventory(item)) return
  item.favorite = !item.favorite
  if (item.favorite) saleSelection.delete(attachmentKey(item))
  if (!item.favorite && inventoryOverCapacity.value) applyInventoryCapacity()
  else bannerText.value = item.favorite ? `${item.name} 已加入收藏保护` : `${item.name} 已取消收藏保护`
  saveGame()
}

function toggleSaleMode() {
  if (mode.value === 'battle' || !inventory.value.length) return
  isSaleMode.value = !isSaleMode.value
  clearSaleSelection()
}

function clearSaleSelection() {
  saleSelection.clear()
}

function toggleSaleSelection(item: Attachment) {
  if (!isSaleMode.value || mode.value === 'battle' || item.favorite || !isAttachmentInInventory(item)) return
  const key = attachmentKey(item)
  if (saleSelection.has(key)) saleSelection.delete(key)
  else saleSelection.add(key)
}

function toggleFilteredSaleSelection() {
  if (!isSaleMode.value || mode.value === 'battle') return
  if (allFilteredSelected.value) {
    sellableFilteredInventory.value.forEach((item) => saleSelection.delete(attachmentKey(item)))
  } else {
    sellableFilteredInventory.value.forEach((item) => saleSelection.add(attachmentKey(item)))
  }
}

function handleInventoryItemClick(item: Attachment) {
  if (isSaleMode.value) toggleSaleSelection(item)
  else selectAttachment(item)
}

function sellSelectedAttachments() {
  if (!isSaleMode.value || mode.value === 'battle' || !saleItems.value.length) return
  const soldItems = saleItems.value.filter((item) => !item.favorite)
  if (!soldItems.length) return
  const soldKeys = new Set(soldItems.map(attachmentKey))
  const reward = { ...saleReward.value }
  inventory.value = inventory.value.filter((item) => !soldKeys.has(attachmentKey(item)))
  soldKeys.forEach((key) => {
    saleSelection.delete(key)
    delete attachmentAcquireOrder[key]
  })
  resources.gold += reward.gold
  resources.parts += reward.parts
  if (!filteredInventory.value.length && inventory.value.length) {
    selectedInventoryFilter.value = '全部'
    selectedSlot.value = '全部'
    selectedRarity.value = '全部'
  }
  if (selectedAttachment.value && soldKeys.has(attachmentKey(selectedAttachment.value))) {
    selectedAttachment.value = filteredInventory.value[0] ?? inventory.value[0] ?? null
  }
  if (lockedReforgeAffix.value && soldKeys.has(lockedReforgeAffix.value.attachmentKey)) lockedReforgeAffix.value = null
  isSaleMode.value = false
  bannerText.value = `出售 ${soldItems.length} 件配件，获得 ${reward.gold} 金币 / ${reward.parts} 零件`
  saveGame()
}

function attachmentMaxLevel(item: Attachment) {
  return [3, 5, 7, 10][rarityRank(item)] ?? 3
}

function attachmentUpgradeCost(item: Attachment) {
  return 1 + Math.floor((item.level ?? 0) / 2) + rarityRank(item)
}

function reforgeCostFor(item: Attachment) {
  return getAttachmentReforgeCost(item, Boolean(lockedAffixFor(item)))
}

function formatReforgeCost(item: Attachment) {
  const cost = reforgeCostFor(item)
  return `${cost.parts}零件 · ${cost.gold}金币${cost.alloy ? ` · ${cost.alloy}合金` : ''}`
}

function reforgeShortageText(item: Attachment) {
  const cost = reforgeCostFor(item)
  const shortages: string[] = []
  if (resources.parts < cost.parts) shortages.push(`零件差 ${cost.parts - resources.parts}`)
  if (resources.gold < cost.gold) shortages.push(`金币差 ${cost.gold - resources.gold}`)
  if (resources.alloy < cost.alloy) shortages.push(`合金差 ${cost.alloy - resources.alloy}`)
  return shortages.length ? `无法重铸：${shortages.join('，')}` : ''
}

function rebuildAttachmentBonuses(item: Attachment) {
  item.bonuses = combineAffixBonuses(item.mainAffix, item.subAffixes)
  item.effect = formatAttachmentEffect(item.bonuses)
}

function upgradeSelectedAttachment() {
  const item = selectedAttachment.value
  if (!item || !canUpgradeSelectedAttachment.value || !item.mainAffix) return
  resources.parts -= selectedAttachmentUpgradeCost.value
  item.level = (item.level ?? 0) + 1
  item.mainAffix.value = normalizeBonus(item.mainAffix.key, item.mainAffix.value * 1.08)
  rebuildAttachmentBonuses(item)
  applyBaseStats()
  bannerText.value = `${item.name} 强化至 +${item.level}`
  saveGame()
}

function reforgeSelectedAttachment() {
  const item = selectedAttachment.value
  if (!item || !canReforgeSelectedAttachment.value || !item.mainAffix) return
  const cost = selectedAttachmentReforgeCost.value
  const lockedAffix = lockedAffixFor(item)
  resources.parts -= cost.parts
  resources.gold -= cost.gold
  resources.alloy -= cost.alloy
  item.subAffixes = rollSubAffixes(item.rarity, item.mainAffix.key, lockedAffix)
  rebuildAttachmentBonuses(item)
  applyBaseStats()
  bannerText.value = lockedAffix ? `${item.name} 已保留「${lockedAffix.label}」并完成重铸` : `${item.name} 副词条已重铸`
  saveGame()
}

function commitStageDraft() {
  stage.value = clamp(Math.round(Number(stageDraft.value) || 1), 1, maxSelectableStage.value)
  stageDraft.value = stage.value
  saveGame()
}

function adjustStage(amount: number) {
  stageDraft.value = clamp(stage.value + amount, 1, maxSelectableStage.value)
  commitStageDraft()
}

function getEquippedBonuses(): EquippedBonusTotals {
  return equippedParts.reduce(
    (total, part) => ({
      damage: total.damage + (part.bonuses?.damage ?? 0),
      fireRate: total.fireRate + (part.bonuses?.fireRate ?? 0),
      maxHp: total.maxHp + (part.bonuses?.maxHp ?? 0),
      pickup: total.pickup + (part.bonuses?.pickup ?? 0),
      speed: total.speed + (part.bonuses?.speed ?? 0),
      pierce: total.pierce + (part.bonuses?.pierce ?? 0),
      expGain: total.expGain + (part.bonuses?.expGain ?? 0),
      critRate: total.critRate + (part.bonuses?.critRate ?? 0)
    }),
    { damage: 0, fireRate: 0, maxHp: 0, pickup: 0, speed: 0, pierce: 0, expGain: 0, critRate: 0 }
  )
}

function applyBaseStats() {
  const gear = getEquippedBonuses()
  player.maxHp = 120 + (player.level - 1) * 12 + gear.maxHp
  player.hp = Math.min(player.maxHp, player.hp)
  modifiers.damage = 1 + gear.damage
  modifiers.fireRate = 1 + gear.fireRate
  modifiers.speed = 1 + gear.speed
  modifiers.pickup = 70 + gear.pickup
  modifiers.pierceBonus = gear.pierce
  modifiers.expGain = 1 + gear.expGain
  modifiers.critRate = Math.min(0.65, gear.critRate)
}

function saveGame() {
  if (!canPersist || replayPersistenceSuppressed) return
  const payload = {
    saveVersion: CURRENT_SAVE_VERSION,
    stage: stage.value,
    highestCleared: highestCleared.value,
    resources: { ...resources },
    base: { ...base },
    player: { level: player.level, exp: player.exp, hp: player.hp },
    equipped: equippedParts.map((item) => ({ ...item })),
    inventory: inventory.value.map((item) => ({ ...item })),
    acquireOrder: { ...attachmentAcquireOrder }
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

function applySaveData(saved: Partial<SaveData>) {
  highestCleared.value = clamp(Math.round(Number(saved.highestCleared) || Math.max(0, (Number(saved.stage) || 1) - 1)), 0, 10000)
  stage.value = clamp(Math.round(Number(saved.stage) || 1), 1, debugStageSelection ? 10000 : highestCleared.value + 1)
  stageDraft.value = stage.value
  Object.assign(resources, { gold: saved.resources?.gold ?? 80, alloy: saved.resources?.alloy ?? 3, parts: saved.resources?.parts ?? 0 })
  Object.assign(base, emptyLegacyBase())
  player.level = Math.max(1, Number(saved.player?.level) || 1)
  player.exp = Math.max(0, Number(saved.player?.exp) || 0)
  player.hp = Math.max(1, Number(saved.player?.hp) || player.hp)
  const savedEquipped = (saved.equipped ?? starterAttachments.map((item) => createAttachmentInstance(item, 'starter', item.rarity, 1))).map((item) => reviveAttachment(item, 'equipped')).filter(Boolean) as Attachment[]
  const savedInventoryNames = saved.inventory ?? []
  const savedInventory = savedInventoryNames.map((item) => reviveAttachment(item, 'inventory')).filter(Boolean) as Attachment[]
  equippedParts.splice(0, equippedParts.length, ...savedEquipped)
  inventory.value = savedInventory
  Object.keys(attachmentAcquireOrder).forEach((name) => delete attachmentAcquireOrder[name])
  inventory.value.forEach((item, index) => ensureAttachmentOrder(item, saved.acquireOrder?.[attachmentKey(item)] ?? saved.acquireOrder?.[item.name] ?? inventory.value.length - index))
  applyInventoryCapacity()
  selectedSlot.value = '全部'
  selectedRarity.value = '全部'
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return
  try {
    applySaveData(JSON.parse(raw) as Partial<SaveData>)
  } catch {
    localStorage.removeItem(SAVE_KEY)
  }
}

function selectAttachment(item: Attachment) {
  selectedAttachment.value = item
  selectedSlot.value = item.slot
}

function canUpgradeAttachment(item: Attachment) {
  return Boolean(item.mainAffix && canSwapAttachment.value && resources.parts >= attachmentUpgradeCost(item) && (item.level ?? 0) < attachmentMaxLevel(item))
}

function canReforgeAttachment(item: Attachment) {
  return Boolean(item.mainAffix && canSwapAttachment.value && canAffordAttachmentReforge(resources, reforgeCostFor(item)))
}

function equipInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  equipSelectedAttachment()
}

function upgradeInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  upgradeSelectedAttachment()
}

function reforgeInventoryAttachment(item: Attachment) {
  selectAttachment(item)
  reforgeSelectedAttachment()
}

function equipSelectedAttachment() {
  if (!selectedAttachment.value) return
  equipAttachment(selectedAttachment.value)
}

function equipAttachment(item: Attachment) {
  if (!canSwapAttachment.value || !isAttachmentInInventory(item)) return
  const currentIndex = equippedParts.findIndex((part) => part.slot === item.slot)
  const replaced = currentIndex >= 0 ? equippedParts[currentIndex] : undefined
  inventory.value = inventory.value.filter((part) => !sameAttachment(part, item))
  if (currentIndex >= 0) {
    ensureAttachmentOrder(equippedParts[currentIndex])
    inventory.value = [equippedParts[currentIndex], ...inventory.value]
    equippedParts[currentIndex] = item
  } else {
    equippedParts.push(item)
  }
  selectedAttachment.value = inventory.value.find((part) => part.slot === item.slot) ?? null
  applyBaseStats()
  saveGame()
  return replaced
}

function equipSettlementAttachment(item: Attachment) {
  const replaced = equipAttachment(item)
  settlementEquipNotice.value = { equipped: item.name, replaced: replaced?.name }
  bannerText.value = replaced ? `${item.name} 已装备，替换下 ${replaced.name}` : `${item.name} 已装备`
}

function rollAttachment(rarityWeights: Record<AttachmentRarity, number>) {
  const desiredRarity = rollWeightedRarity(rarityWeights)
  const rarityPool = attachmentPool.filter((item) => item.rarity === desiredRarity)
  const pool = rarityPool.length ? rarityPool : attachmentPool
  return createAttachmentInstance(pool[Math.floor(gameplayRandom() * pool.length)], 'drop', desiredRarity)
}

function applyInventoryCapacity(protectedItems: Attachment[] = []) {
  const protectedKeys = new Set([...inventory.value.filter((item) => item.favorite), ...protectedItems].map(attachmentKey))
  const resolved = resolveAttachmentOverflow(inventory.value, protectedKeys, BASE_INVENTORY_CAPACITY)
  inventory.value = resolved.inventory
  const reward = resolved.overflow.reduce(
    (total, item) => {
      const value = recycleAttachmentValue(item)
      total.gold += value.gold
      total.parts += value.parts
      delete attachmentAcquireOrder[attachmentKey(item)]
      return total
    },
    { gold: 0, parts: 0 }
  )
  resources.gold += reward.gold
  resources.parts += reward.parts
  overflowSalvageNotice.value = resolved.overflow.length ? { items: resolved.overflow, ...reward } : null
  if (resolved.unresolvedCount > 0) bannerText.value = `收藏或新掉落受保护，背包超出容量 ${resolved.unresolvedCount} 件`
  else if (resolved.overflow.length) bannerText.value = `背包已满，自动回收 ${resolved.overflow.length} 件配件`
}

function grantAttachmentDrops(count: number, rarityWeights: Record<AttachmentRarity, number>) {
  const drops: Attachment[] = []
  for (let i = 0; i < count; i++) {
    const item = rollAttachment(rarityWeights)
    markAttachmentAcquired(item)
    drops.push(item)
  }
  inventory.value = [...drops, ...inventory.value]
  applyInventoryCapacity(drops)
  const firstRetainedDrop = drops.find((item) => isAttachmentInInventory(item))
  if (firstRetainedDrop) {
    selectedAttachment.value = firstRetainedDrop
    selectedSlot.value = firstRetainedDrop.slot
  }
  return drops
}

function choosePostBattle(choice: PostBattleChoice) {
  if (choice.disabled) return
  choice.apply()
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function gameplayRandom() {
  return replayRuntime.running ? replayRuntime.random() : Math.random()
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatPreciseClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  const tenths = Math.floor((totalSeconds % 1) * 10)
  return `${minutes}:${seconds}.${tenths}`
}

function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * clamp(amount, 0, 1)
}

function lerpAngle(current: number, target: number, amount: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * clamp(amount, 0, 1)
}

function getPlayArea(width: number, height: number): PlayArea {
  if (width < 900 || height < 620) {
    return { x: width * 0.08, y: height * 0.12, width: width * 0.84, height: height * 0.68 }
  }
  return { x: width * 0.24, y: height * 0.21, width: width * 0.46, height: height * 0.57 }
}

function movePlayerToAreaCenter() {
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  player.x = area.x + area.width / 2
  player.y = area.y + area.height / 2
  player.visualX = player.x
  player.visualY = player.y
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(canvas.clientWidth * pixelRatio)
  canvas.height = Math.floor(canvas.clientHeight * pixelRatio)
  context = canvas.getContext('2d')
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
}

function handleKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (replayRuntime.running) {
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '1', '2', '3'].includes(key)) markReplayIssue(`检测到人工按键：${key}`)
    return
  }
  if (upgradeChoices.value.length && ['1', '2', '3'].includes(key)) {
    const choice = upgradeChoices.value[Number(key) - 1]
    if (choice) chooseUpgrade(choice)
    return
  }
  keys.add(key)
  if (key === '1') useSkill('dash')
  if (key === '2') useSkill('overload')
  if (key === '3') useSkill('pulse')
}

function handleKeyup(event: KeyboardEvent) {
  if (replayRuntime.running) return
  keys.delete(event.key.toLowerCase())
}

function inputVector(): Vec {
  if (replayRuntime.running) {
    const canvas = canvasRef.value
    if (!canvas) {
      markReplayIssue('画布不可用，无法生成固定路线输入')
      return { x: 0, y: 0 }
    }
    const patrol = clockwisePatrolVector(player, getPlayArea(canvas.clientWidth, canvas.clientHeight), replayRuntime.waypointIndex)
    replayRuntime.waypointIndex = patrol.waypointIndex
    return patrol.vector
  }
  const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
  const y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'))
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

function announceBanner(text: string, tone: 'normal' | 'elite' | 'victory' = 'normal') {
  bannerTone.value = tone
  bannerText.value = text
}

function playSound(kind: 'hit' | 'critical' | 'kill' | 'pickup' | 'wave' | 'elite' | 'hurt' | 'victory') {
  if (typeof window === 'undefined' || replayRuntime.running) return
  try {
    audioContext ??= new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime
    const settings = {
      hit: [150, 0.025, 0.015], critical: [480, 0.05, 0.04], kill: [260, 0.07, 0.035], pickup: [720, 0.08, 0.03],
      wave: [340, 0.13, 0.045], elite: [95, 0.28, 0.07], hurt: [72, 0.16, 0.07], victory: [620, 0.42, 0.06]
    } as const
    const [frequency, duration, volume] = settings[kind]
    oscillator.type = kind === 'hurt' || kind === 'elite' ? 'sawtooth' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * (kind === 'victory' ? 1.8 : 0.72)), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch {
    // 浏览器禁用音频时仍保留全部视觉反馈。
  }
}

function spawnEnemy(options: { boss?: boolean; elite?: boolean; kind?: EnemyKind } = {}) {
  const canvas = canvasRef.value
  if (!canvas) return
  const forceBoss = Boolean(options.boss)
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  const edge = Math.floor(gameplayRandom() * 4)
  const spawnInset = forceBoss ? 28 : 18
  const x = edge === 1 ? area.x + area.width - spawnInset : edge === 3 ? area.x + spawnInset : area.x + gameplayRandom() * area.width
  const y = edge === 0 ? area.y + spawnInset : edge === 2 ? area.y + area.height - spawnInset : area.y + gameplayRandom() * area.height
  const kind = forceBoss ? levelTuning.boss.kind : options.kind ?? 'grunt'
  const stats = scaleEnemyStats(stage.value, kind)
  const elite = forceBoss || Boolean(options.elite)
  const multipliers = forceBoss ? levelTuning.boss.multipliers : elite ? levelTuning.elite.multipliers : { hp: 1, damage: 1, speed: 1, radius: 1 }
  const maxHp = stats.hp * multipliers.hp
  const maxArmor = kind === 'heavy' && !forceBoss ? maxHp * levelTuning.enemyWarnings.heavyArmorRatio : 0

  enemies.push({
    id: nextEnemyId++,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.atan2(player.y - y, player.x - x),
    wobble: gameplayRandom() * Math.PI * 2,
    hp: maxHp,
    maxHp,
    speed: stats.speed * multipliers.speed,
    damage: stats.damage * multipliers.damage,
    radius: 13 * multipliers.radius,
    elite,
    boss: forceBoss,
    kind,
    label: forceBoss ? levelTuning.boss.label : elite ? `精英${stats.label}` : stats.label,
    attackTimer: 0.65 + gameplayRandom() * 0.5,
    aimTime: 0,
    aimAngle: Math.atan2(player.y - y, player.x - x),
    chargeCooldown: 1.4 + gameplayRandom(),
    chargeWindup: 0,
    chargeTime: 0,
    chargeHit: false,
    armor: maxArmor,
    maxArmor,
    armorBreakFlash: 0,
    bossPhase: 0
  })
  spawnedEnemyCount.value += 1
  if (forceBoss) {
    announceBanner('⚠ 首领进入交战区', 'elite')
    playSound('elite')
    screenShake = 0.4
  } else if (elite) {
    announceBanner(`高威胁目标 · 精英${stats.label}`, 'elite')
    playSound('elite')
    screenShake = Math.max(screenShake, 0.22)
  }
}

function shootNearest() {
  if (!enemies.length) return
  const target = enemies.reduce((nearest, enemy) => {
    const a = Math.hypot(nearest.x - player.x, nearest.y - player.y)
    const b = Math.hypot(enemy.x - player.x, enemy.y - player.y)
    if (enemy.boss && b < weapon.range) return enemy
    return b < a ? enemy : nearest
  })
  const angle = Math.atan2(target.y - player.y, target.x - player.x)
  const finalAngle = angle + (gameplayRandom() - 0.5) * weapon.spread
  const critical = gameplayRandom() < modifiers.critRate
  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(finalAngle) * weapon.bulletSpeed,
    vy: Math.sin(finalAngle) * weapon.bulletSpeed,
    damage: weapon.damage * modifiers.damage * (critical ? 1.75 : 1),
    life: weapon.range / weapon.bulletSpeed,
    pierce: weapon.pierce + modifiers.pierceBonus,
    critical,
    hitEnemyIds: new Set<number>()
  })
}

function grantExp(amount: number) {
  const gained = Math.round(amount * modifiers.expGain)
  player.exp += gained
  if (mode.value === 'battle') runStats.expEarned += gained
  while (player.exp >= nextLevelExp.value) {
    player.exp -= nextLevelExp.value
    player.level += 1
    player.maxHp += 12
    player.hp = Math.min(player.maxHp, player.hp + 12)
    announceBanner(`等级提升 · Lv.${player.level}`, 'victory')
    playSound('wave')
  }
}

function recordDamage(amount: number) {
  if (amount <= 0) return
  runStats.totalDamage += amount
  runStats.highestHit = Math.max(runStats.highestHit, amount)
  damageEvents.push({ time: stageTimer.value, amount })
}

function dealDamage(enemy: Enemy, rawDamage: number, critical = false, pierce = 0) {
  let multiplier = 1
  const armoredHeavy = enemy.kind === 'heavy' && !enemy.boss && enemy.armor > 0
  const multiplierWithoutPierce = armoredHeavy ? Math.min(1, 0.5 + (critical ? 0.12 : 0)) : enemy.boss ? 0.76 : 1
  if (armoredHeavy) multiplier = Math.min(1, 0.5 + pierce * 0.13 + (critical ? 0.12 : 0))
  if (enemy.boss) multiplier = Math.min(1, 0.76 + pierce * 0.055)
  const hpBefore = enemy.hp
  const applied = Math.min(hpBefore, rawDamage * multiplier)
  if (armoredHeavy && pierce > 0) {
    runStats.heavyPierceDamage += Math.min(applied, Math.max(0, rawDamage * (multiplier - multiplierWithoutPierce)))
  }
  if (critical) {
    runStats.criticalTriggers += 1
    const baseRawDamage = rawDamage / 1.75
    const nonCriticalMultiplier = armoredHeavy ? Math.min(1, 0.5 + pierce * 0.13) : multiplier
    const nonCriticalApplied = Math.min(hpBefore, baseRawDamage * nonCriticalMultiplier)
    runStats.criticalExtraDamage += Math.max(0, applied - nonCriticalApplied)
  }
  enemy.hp -= applied
  if (armoredHeavy) {
    enemy.armor = Math.max(0, enemy.armor - rawDamage * (0.35 + pierce * 0.25))
    if (enemy.armor <= 0) {
      enemy.armorBreakFlash = 0.9
      hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 24, value: '护甲击破', life: 0.9, maxLife: 0.9, color: '#9ed7ee', critical: true })
      screenShake = Math.max(screenShake, 0.16)
    }
  }
  recordDamage(applied)
  return applied
}

function updateDpsStats() {
  const cutoff = stageTimer.value - 3
  while (damageEvents.length && damageEvents[0].time < cutoff) damageEvents.shift()
  const windowSeconds = Math.min(3, Math.max(0.5, stageTimer.value))
  runStats.currentDps = damageEvents.reduce((sum, event) => sum + event.amount, 0) / windowSeconds
  runStats.peakDps = Math.max(runStats.peakDps, runStats.currentDps)
}

function snapshotRunStats(victory: boolean): RunStatsSnapshot {
  const duration = Math.max(0.01, stageTimer.value)
  const averageDps = runStats.totalDamage / duration
  const waves = waveRecords.map((wave) => ({ ...wave, enemyKinds: [...wave.enemyKinds] }))
  const activeWave = currentWaveDefinition.value
  if (activeWave && !recordedWaveIndexes.has(activeWave.index)) {
    waves.push({
      wave: activeWave.index,
      phase: activeWave.phase,
      label: activeWave.label,
      duration: Math.max(0, stageTimer.value - waveStartTime),
      enemyKinds: [...new Set(activeWave.kinds)],
      cleared: false
    })
  }
  return {
    duration,
    kills: kills.value,
    totalDamage: runStats.totalDamage,
    averageDps,
    peakDps: runStats.peakDps,
    highestHit: runStats.highestHit,
    goldEarned: runStats.goldEarned,
    expEarned: runStats.expEarned,
    hitCount: runStats.hitCount,
    damageTaken: runStats.damageTaken,
    waves,
    deathCombination: runStats.deathCombination,
    dpsGapPercent: dpsGapPercent(runStats.peakDps, averageDps),
    durationVerdict: victory ? durationVerdict(duration) : '未完成 · 不计时长目标',
    contribution: {
      heavyPierceDamage: runStats.heavyPierceDamage,
      criticalTriggers: runStats.criticalTriggers,
      criticalExtraDamage: runStats.criticalExtraDamage,
      dodgedCharges: runStats.dodgedCharges,
      totalChargeAttempts: runStats.totalChargeAttempts
    },
    loadoutBonuses: { ...getEquippedBonuses() }
  }
}

function maybeOfferUpgrade() {
  if (upgradeTakenForStage.value === stage.value || kills.value < 10 || upgradeChoices.value.length) return
  const currentPierce = totalPiercePreview.value
  const currentDamage = damagePreview.value
  const nextDamage = Math.round(weapon.damage * modifiers.damage * 1.18)
  const currentSpeed = moveSpeedPreview.value
  const nextSpeed = Math.round(player.speed * modifiers.speed * 1.12)
  const currentPickup = Math.round(modifiers.pickup)
  upgradeChoices.value = [
    { name: '穿透校准', desc: '更适合重甲与密集纵队', tag: '穿透', comparison: `${currentPierce} → ${currentPierce + 1}`, apply: () => { modifiers.pierceBonus += 1 } },
    { name: '火力压制', desc: '稳定提高所有目标输出', tag: '输出', comparison: `单发 ${currentDamage} → ${nextDamage}`, apply: () => { modifiers.damage *= 1.18 } },
    { name: '机动回收', desc: '强化走位与资源收集', tag: '机动 / 拾取', comparison: `移速 ${currentSpeed} → ${nextSpeed} · 拾取 ${currentPickup} → ${currentPickup + 24}`, apply: () => { modifiers.speed *= 1.12; modifiers.pickup += 24 } }
  ]
}

function chooseUpgrade(choice: Upgrade) {
  choice.apply()
  upgradeTakenForStage.value = stage.value
  upgradeChoices.value = []
}

function loadSprite(key: keyof typeof assetUrls, url: string) {
  const image = new Image()
  image.src = url
  sprites[key] = image
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function drawSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, angle = 0) {
  if (!image || !image.complete) return
  const ratio = image.width / image.height
  const drawWidth = ratio >= 1 ? size : size * ratio
  const drawHeight = ratio >= 1 ? size / ratio : size
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, alpha = 0.32) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, y + width * 0.16, width * 0.42, width * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSpriteTint(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, angle: number, alpha: number, tint: string) {
  if (!image || !image.complete) return
  const ratio = image.width / image.height
  const drawWidth = ratio >= 1 ? size : size * ratio
  const drawHeight = ratio >= 1 ? size / ratio : size
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = tint
  ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}

function drawPlayArea(ctx: CanvasRenderingContext2D, area: PlayArea, width: number, height: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(7, 7, 6, 0.38)'
  ctx.fillRect(0, 0, width, area.y)
  ctx.fillRect(0, area.y + area.height, width, height - area.y - area.height)
  ctx.fillRect(0, area.y, area.x, area.height)
  ctx.fillRect(area.x + area.width, area.y, width - area.x - area.width, area.height)
  ctx.strokeStyle = 'rgba(229, 184, 75, 0.45)'
  ctx.lineWidth = 2
  ctx.strokeRect(area.x, area.y, area.width, area.height)
  ctx.restore()
}

function enemySprite(enemy: Enemy) {
  if (enemy.boss) return sprites.enemyBoss
  if (enemy.kind === 'fast') return sprites.enemyFast
  if (enemy.kind === 'heavy') return sprites.enemyHeavy
  if (enemy.kind === 'bomber') return sprites.enemyBomber
  return sprites.enemyGrunt
}

function useSkill(key: SkillKey) {
  const skill = skills.find((item) => item.key === key)
  if (!skill || skill.cooldown > 0 || mode.value !== 'battle' || upgradeChoices.value.length) return
  if (key === 'dash') {
    dashTimer = 0.55
    player.invuln = Math.max(player.invuln, 0.55)
    const input = inputVector()
    player.vx += input.x * 520
    player.vy += input.y * 520
    skill.cooldown = 6
  }
  if (key === 'overload') {
    overloadTimer = 4
    skill.cooldown = 12
  }
  if (key === 'pulse') {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 190) {
        const damage = dealDamage(enemy, 85 * modifiers.damage, false, totalPiercePreview.value)
        hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 10, value: `脉冲 ${Math.round(damage)}`, life: 0.48, maxLife: 0.48, color: '#7ac7d9' })
        if (enemy.hp <= 0) killEnemy(i)
      }
    }
    skill.cooldown = 9
  }
}

function killEnemy(index: number) {
  const enemy = enemies[index]
  if (!enemy) return
  kills.value += 1
  grantExp(enemy.elite ? 7 : 3)
  drops.push({ x: enemy.x, y: enemy.y, value: enemy.elite ? 9 : 3, radius: 6, kind: 'gold' })
  if (enemy.elite) drops.push({ x: enemy.x + 10, y: enemy.y - 8, value: 5, radius: 5, kind: 'exp' })
  killNotice.value = enemy.boss ? '首领击破' : enemy.elite ? `精英击破 · ${enemy.label}` : `击杀确认 · ${enemy.label}`
  killNoticeTimer = enemy.elite ? 1.45 : 0.72
  hitTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 24, value: enemy.elite ? '精英击破' : '击杀 +1', life: 0.7, maxLife: 0.7, color: enemy.elite ? '#e5b84b' : '#b6d68b', critical: enemy.elite })
  playSound(enemy.elite ? 'elite' : 'kill')
  if (enemy.boss) bossHud.visible = false
  enemies.splice(index, 1)
}

function damagePlayer(rawDamage: number, sourceX: number, sourceY: number, sourceKind: EnemyKind | 'boss' = 'grunt') {
  if (player.invuln > 0) return
  const damage = rawDamage
  player.hp -= damage
  runStats.hitCount += 1
  runStats.damageTaken += damage
  playerHitFlash = 0.28
  screenShake = Math.max(screenShake, 0.18)
  damageDirection.angle = Math.atan2(sourceY - player.y, sourceX - player.x) + Math.PI / 2
  damageDirection.life = 0.65
  hitTexts.push({ x: player.x, y: player.y - 24, value: `-${Math.round(damage)}`, life: 0.55, maxLife: 0.55, color: '#da4c3d', critical: true })
  player.invuln = 0.35
  playSound('hurt')
  if (player.hp <= 0) {
    const threatLabels: Record<EnemyKind | 'boss', string> = { grunt: '暴徒', ranged: '远程兵', fast: '迅捷兵', heavy: '重装兵', bomber: '爆破兵', boss: 'Boss' }
    const nearby = enemies
      .filter((enemy) => Math.hypot(enemy.x - player.x, enemy.y - player.y) < 320)
      .map((enemy) => enemy.boss ? 'boss' as const : enemy.kind)
    runStats.deathCombination = [...new Set([sourceKind, ...nearby])].map((kind) => threatLabels[kind]).join(' + ')
  }
}

function fireEnemyProjectile(enemy: Enemy, spread = 0, lockedAngle?: number) {
  const angle = (lockedAngle ?? Math.atan2(player.y - enemy.y, player.x - enemy.x)) + spread
  const speed = enemy.boss ? levelTuning.boss.projectileSpeed : levelTuning.enemyWarnings.rangedProjectileSpeed
  enemyProjectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage: enemy.damage * (enemy.boss ? levelTuning.boss.projectileDamageMultiplier : 0.78),
    life: 3,
    radius: enemy.boss ? 6 : 4,
    sourceKind: enemy.boss ? 'boss' : enemy.kind
  })
}

function fireBossVolley(enemy: Enemy) {
  const phase = levelTuning.boss.phases[enemy.bossPhase] ?? levelTuning.boss.phases[0]
  const middle = (phase.projectileCount - 1) / 2
  for (let index = 0; index < phase.projectileCount; index += 1) {
    fireEnemyProjectile(enemy, (index - middle) * phase.spread, enemy.aimAngle)
  }
}

function update(delta: number) {
  if (mode.value !== 'battle') {
    clearCombatFeedback()
    return
  }
  if (replayRuntime.running) {
    if (upgradeChoices.value.length) chooseUpgrade(upgradeChoices.value[0])
    useSkill('dash')
    useSkill('overload')
    useSkill('pulse')
  }
  if (upgradeChoices.value.length) {
    screenShake = Math.max(0, screenShake - delta)
    playerHitFlash = Math.max(0, playerHitFlash - delta)
    return
  }
  const canvas = canvasRef.value
  if (!canvas) return
  const area = getPlayArea(canvas.clientWidth, canvas.clientHeight)
  stageTimer.value += delta
  spawnTimer -= delta
  player.fireTimer -= delta
  player.invuln = Math.max(0, player.invuln - delta)
  overloadTimer = Math.max(0, overloadTimer - delta)
  dashTimer = Math.max(0, dashTimer - delta)
  damageDirection.life = Math.max(0, damageDirection.life - delta)
  killNoticeTimer = Math.max(0, killNoticeTimer - delta)
  if (killNoticeTimer <= 0) killNotice.value = ''
  for (const skill of skills) skill.cooldown = Math.max(0, skill.cooldown - delta)

  if (waveTransitionPending.value) {
    waveTransitionSeconds.value = Math.max(0, waveTransitionSeconds.value - delta)
    if (waveTransitionSeconds.value <= 0 && currentWave.value < totalWaves.value) {
      currentWave.value += 1
      waveSpawnedCount.value = 0
      waveTransitionPending.value = false
      spawnTimer = 0
      waveStartTime = stageTimer.value
      announceBanner(`第 ${currentWave.value} 波 · ${currentWaveDefinition.value?.label}`, currentWave.value === totalWaves.value ? 'elite' : 'normal')
      playSound('wave')
    }
  }

  const movement = inputVector()
  const moving = Math.hypot(movement.x, movement.y) > 0.1
  const targetSpeed = player.speed * modifiers.speed * (dashTimer > 0 ? 2.2 : 1)
  player.vx = lerp(player.vx, movement.x * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.vy = lerp(player.vy, movement.y * targetSpeed, (moving ? 8.5 : 10.5) * delta)
  player.x = clamp(player.x + player.vx * delta, area.x + player.radius, area.x + area.width - player.radius)
  player.y = clamp(player.y + player.vy * delta, area.y + player.radius, area.y + area.height - player.radius)
  player.visualX = lerp(player.visualX, player.x, 18 * delta)
  player.visualY = lerp(player.visualY, player.y, 18 * delta)
  player.bob += Math.hypot(player.vx, player.vy) * delta * 0.045
  player.afterimageTimer -= delta

  const aimTarget = enemies.reduce<Enemy | null>((nearest, enemy) => {
    if (!nearest) return enemy
    return Math.hypot(enemy.x - player.x, enemy.y - player.y) < Math.hypot(nearest.x - player.x, nearest.y - player.y) ? enemy : nearest
  }, null)
  player.angle = lerpAngle(player.angle, aimTarget ? Math.atan2(aimTarget.y - player.y, aimTarget.x - player.x) : player.angle, 12 * delta)

  if ((dashTimer > 0 || Math.hypot(player.vx, player.vy) > 120) && player.afterimageTimer <= 0) {
    afterimages.push({ x: player.visualX, y: player.visualY, angle: player.angle, life: 0.18, maxLife: 0.18, size: player.radius * 3.5 })
    player.afterimageTimer = dashTimer > 0 ? 0.035 : 0.075
  }
  for (let i = afterimages.length - 1; i >= 0; i--) {
    afterimages[i].life -= delta
    if (afterimages[i].life <= 0) afterimages.splice(i, 1)
  }

  const wave = currentWaveDefinition.value
  if (!waveTransitionPending.value && wave && spawnTimer <= 0 && waveSpawnedCount.value < wave.count) {
    const spawnIndex = waveSpawnedCount.value
    const isBoss = wave.boss && spawnIndex === wave.count - 1
    const isElite = !isBoss && wave.eliteCount > 0 && spawnIndex >= wave.count - wave.eliteCount
    spawnEnemy({ boss: isBoss, elite: isElite, kind: enemyKindForWave(wave, spawnIndex) })
    if (isBoss) bossSpawned = true
    waveSpawnedCount.value += 1
    spawnTimer = resolvedSpawnInterval(stage.value, wave)
  }

  if (player.fireTimer <= 0) {
    shootNearest()
    player.fireTimer = 1 / (weapon.fireRate * modifiers.fireRate * (overloadTimer > 0 ? 1.75 : 1))
  }

  for (const enemy of enemies) {
    enemy.wobble += delta * (enemy.kind === 'fast' ? 8 : 4)
    enemy.attackTimer -= delta
    enemy.chargeCooldown -= delta
    enemy.armorBreakFlash = Math.max(0, enemy.armorBreakFlash - delta)
    const previousAimTime = enemy.aimTime
    enemy.aimTime = Math.max(0, enemy.aimTime - delta)
    const previousWindup = enemy.chargeWindup
    enemy.chargeWindup = Math.max(0, enemy.chargeWindup - delta)
    const previousChargeTime = enemy.chargeTime
    enemy.chargeTime = Math.max(0, enemy.chargeTime - delta)
    if (previousChargeTime > 0 && enemy.chargeTime <= 0 && !enemy.chargeHit && modifiers.speed > 1) runStats.dodgedCharges += 1
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    const directAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
    let moveAngle = directAngle + Math.sin(enemy.wobble) * (enemy.kind === 'fast' ? 0.32 : 0.12)
    let speedScale = 1

    if (enemy.kind === 'ranged') {
      if (distance < 145) moveAngle = directAngle + Math.PI
      else if (distance < 235) moveAngle = directAngle + Math.PI / 2 * (enemy.id % 2 ? 1 : -1)
      speedScale = enemy.aimTime > 0 ? 0.18 : distance > 235 || distance < 145 ? 0.92 : 0.56
      if (previousAimTime > 0 && enemy.aimTime <= 0) {
        fireEnemyProjectile(enemy, 0, enemy.aimAngle)
        enemy.attackTimer = enemy.elite ? 1.1 : 1.65
      } else if (enemy.attackTimer <= 0 && enemy.aimTime <= 0 && distance < levelTuning.enemyWarnings.rangedRange) {
        enemy.aimAngle = directAngle
        enemy.aimTime = levelTuning.enemyWarnings.rangedAimSeconds
      }
    } else if (enemy.kind === 'fast') {
      if (enemy.chargeTime > 0) {
        speedScale = levelTuning.enemyWarnings.fastChargeSpeedMultiplier
        moveAngle = Math.atan2(enemy.vy, enemy.vx)
      } else if (previousWindup > 0 && enemy.chargeWindup <= 0) {
        enemy.chargeTime = levelTuning.enemyWarnings.fastChargeSeconds
        enemy.chargeHit = false
        enemy.vx = Math.cos(enemy.aimAngle) * enemy.speed * levelTuning.enemyWarnings.fastChargeSpeedMultiplier
        enemy.vy = Math.sin(enemy.aimAngle) * enemy.speed * levelTuning.enemyWarnings.fastChargeSpeedMultiplier
      } else if (enemy.chargeWindup > 0) {
        speedScale = 0.08
      } else if (enemy.chargeCooldown <= 0 && distance < levelTuning.enemyWarnings.fastChargeRange) {
        enemy.chargeWindup = levelTuning.enemyWarnings.fastWindupSeconds
        enemy.chargeCooldown = enemy.elite ? 1.7 : 2.6
        enemy.aimAngle = directAngle
        runStats.totalChargeAttempts += 1
      }
    }

    if (enemy.boss) {
      const hpRatio = enemy.hp / enemy.maxHp
      let nextPhase = 0
      levelTuning.boss.phases.forEach((phase, index) => {
        if (hpRatio <= phase.hpThreshold) nextPhase = index
      })
      if (nextPhase !== enemy.bossPhase) {
        enemy.bossPhase = nextPhase
        announceBanner(`Boss 阶段 ${nextPhase + 1} · ${levelTuning.boss.phases[nextPhase].label}`, 'elite')
      }
      const phase = levelTuning.boss.phases[enemy.bossPhase]
      if (previousAimTime > 0 && enemy.aimTime <= 0) {
        fireBossVolley(enemy)
        enemy.attackTimer = phase.attackInterval
      } else if (enemy.attackTimer <= 0 && enemy.aimTime <= 0 && distance < phase.warningRange) {
        enemy.aimAngle = directAngle
        enemy.aimTime = phase.warningSeconds
      }
    }

    if (!(enemy.kind === 'fast' && enemy.chargeTime > 0)) {
      enemy.vx = lerp(enemy.vx, Math.cos(moveAngle) * enemy.speed * speedScale, 5.5 * delta)
      enemy.vy = lerp(enemy.vy, Math.sin(moveAngle) * enemy.speed * speedScale, 5.5 * delta)
    }
    enemy.x = clamp(enemy.x + enemy.vx * delta, area.x + enemy.radius, area.x + area.width - enemy.radius)
    enemy.y = clamp(enemy.y + enemy.vy * delta, area.y + enemy.radius, area.y + area.height - enemy.radius)
    enemy.angle = lerpAngle(enemy.angle, Math.atan2(enemy.vy, enemy.vx), 8 * delta)
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius && player.invuln <= 0) {
      damagePlayer(enemy.damage * (enemy.chargeTime > 0 ? 1.55 : 1), enemy.x, enemy.y, enemy.boss ? 'boss' : enemy.kind)
      if (enemy.kind === 'fast' && enemy.chargeTime > 0) enemy.chargeHit = true
      if (enemy.kind === 'bomber') enemy.hp = 0
    }
  }

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const projectile = enemyProjectiles[i]
    projectile.x += projectile.vx * delta
    projectile.y += projectile.vy * delta
    projectile.life -= delta
    if (Math.hypot(projectile.x - player.x, projectile.y - player.y) <= projectile.radius + player.radius) {
      damagePlayer(projectile.damage, projectile.x, projectile.y, projectile.sourceKind)
      enemyProjectiles.splice(i, 1)
    } else if (projectile.life <= 0) {
      enemyProjectiles.splice(i, 1)
    }
  }

  for (const bullet of bullets) {
    bullet.x += bullet.vx * delta
    bullet.y += bullet.vy * delta
    bullet.life -= delta
  }

  for (let b = bullets.length - 1; b >= 0; b--) {
    const bullet = bullets[b]
    for (let e = enemies.length - 1; e >= 0; e--) {
      const enemy = enemies[e]
      if (!bullet.hitEnemyIds.has(enemy.id) && Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) <= enemy.radius + 4) {
        bullet.hitEnemyIds.add(enemy.id)
        const damage = dealDamage(enemy, bullet.damage, bullet.critical, totalPiercePreview.value)
        hitTexts.push({ x: enemy.x + (Math.random() - 0.5) * 12, y: enemy.y - enemy.radius - 10, value: bullet.critical ? `暴击 ${Math.round(damage)}!` : Math.round(damage).toString(), life: bullet.critical ? 0.62 : 0.42, maxLife: bullet.critical ? 0.62 : 0.42, color: bullet.critical ? '#f2c14f' : enemy.boss ? '#e5b84b' : '#f3efe5', critical: bullet.critical })
        playSound(bullet.critical ? 'critical' : 'hit')
        bullet.pierce -= 1
        if (enemy.hp <= 0) killEnemy(e)
        if (bullet.pierce < 0) bullets.splice(b, 1)
        break
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) killEnemy(i)
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1)
  for (let i = hitTexts.length - 1; i >= 0; i--) {
    hitTexts[i].life -= delta
    hitTexts[i].y -= 28 * delta
    if (hitTexts[i].life <= 0) hitTexts.splice(i, 1)
  }
  playerHitFlash = Math.max(0, playerHitFlash - delta)
  screenShake = Math.max(0, screenShake - delta)
  updateDpsStats()
  const boss = enemies.find((enemy) => enemy.boss)
  bossHud.visible = Boolean(boss)
  if (boss) {
    bossHud.label = boss.label
    bossHud.hp = boss.hp
    bossHud.maxHp = boss.maxHp
    bossHud.hpPercent = clamp((boss.hp / boss.maxHp) * 100, 0, 100)
    bossHud.phaseLabel = levelTuning.boss.phases[boss.bossPhase]?.label ?? ''
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i]
    if (Math.hypot(drop.x - player.x, drop.y - player.y) < modifiers.pickup) {
      if (drop.kind === 'gold') {
        resources.gold += drop.value
        runStats.goldEarned += drop.value
      }
      if (drop.kind === 'exp') grantExp(drop.value)
      hitTexts.push({ x: player.x, y: player.y - 30, value: drop.kind === 'gold' ? `金币 +${drop.value}` : `经验 +${drop.value}`, life: 0.55, maxLife: 0.55, color: drop.kind === 'gold' ? '#e5b84b' : '#7ac7d9' })
      playSound('pickup')
      drops.splice(i, 1)
    }
  }

  maybeOfferUpgrade()

  if (player.hp <= 0) {
    lastRun.value = { title: '撤离失败', body: `倒在第 ${currentWave.value} 波，剩余 ${Math.max(0, targetKills.value - kills.value)} 名敌人。保留已拾取资源。`, victory: false, stats: snapshotRunStats(false) }
    clearCombatFeedback()
    mode.value = 'settlement'
    saveGame()
    return
  }

  const currentWaveCleared = wave && waveSpawnedCount.value >= wave.count && enemies.length === 0
  if (currentWaveCleared && !recordedWaveIndexes.has(wave.index)) {
    recordedWaveIndexes.add(wave.index)
    waveRecords.push({
      wave: wave.index,
      phase: wave.phase,
      label: wave.label,
      duration: Math.max(0, stageTimer.value - waveStartTime),
      enemyKinds: [...new Set(wave.kinds)],
      cleared: true
    })
  }
  if (currentWaveCleared && currentWave.value < totalWaves.value && !waveTransitionPending.value) {
    waveTransitionPending.value = true
    waveTransitionSeconds.value = wave.restAfter
    announceBanner(`第 ${currentWave.value} 波肃清`, 'victory')
    playSound('wave')
  }

  const allWavesCleared = currentWaveCleared && currentWave.value === totalWaves.value
  if (allWavesCleared) {
    highestCleared.value = Math.max(highestCleared.value, stage.value)
    const stageReward = rewardForStage(stage.value, kills.value)
    const profile = getAttachmentDropProfile(stage.value)
    const attachmentDropCount = gameplayRandom() < profile.dropChance ? Math.max(1, stageReward.parts) : 0
    const attachmentDrops = grantAttachmentDrops(attachmentDropCount, profile.rarityWeights)
    const reward: Reward = { ...stageReward, attachments: attachmentDrops }
    resources.gold += reward.gold
    runStats.goldEarned += reward.gold
    resources.alloy += reward.alloy
    resources.parts += reward.parts
    grantExp(reward.exp)
    settlementEquipNotice.value = null
    lastRun.value = {
      title: `第 ${stage.value} 关清场`,
      body: attachmentDrops.length ? `缴获 ${attachmentDrops.map((item) => item.name).join('、')}，回基地可替换构筑。` : `${stageMeta.value.name} 已压制，本次未发现可用配件。`,
      victory: true,
      reward,
      stats: snapshotRunStats(true)
    }
    announceBanner(attachmentDrops.length ? `缴获配件 · ${attachmentDrops[0].name}` : '任务完成 · 区域已清空', 'victory')
    playSound('victory')
    clearCombatFeedback()
    mode.value = 'settlement'
    saveGame()
  }
}

function draw() {
  const canvas = canvasRef.value
  const ctx = context
  if (!canvas || !ctx) return
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (mode.value === 'battle' && screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake * 16, (Math.random() - 0.5) * screenShake * 16)
  if (sprites.battlefield?.complete) drawCoverImage(ctx, sprites.battlefield, width, height)
  drawPlayArea(ctx, getPlayArea(width, height), width, height)

  for (const drop of drops) {
    drawShadow(ctx, drop.x, drop.y + 7, drop.radius * 3, 0.18)
    const pickupScale = 1 + Math.sin(stageTimer.value * 6 + drop.x) * 0.09
    drawSprite(ctx, drop.kind === 'gold' ? sprites.pickupGold : sprites.pickupExp, drop.x, drop.y - 3 + Math.sin(stageTimer.value * 4 + drop.y) * 3, drop.radius * 4 * pickupScale)
  }
  for (const bullet of bullets) drawSprite(ctx, sprites.bullet, bullet.x, bullet.y, overloadTimer > 0 ? 34 : 26, Math.atan2(bullet.vy, bullet.vx))
  for (const projectile of enemyProjectiles) {
    ctx.save()
    ctx.fillStyle = '#d95743'
    ctx.shadowColor = '#d95743'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.font = '12px Trebuchet MS'
  ctx.textAlign = 'center'
  for (const enemy of enemies) {
    const size = enemy.radius * (enemy.boss ? 3.6 : 3.2)
    const kindColor: Record<EnemyKind, string> = { grunt: '#c66a4d', ranged: '#6f9eb2', fast: '#d2aa48', heavy: '#8d9b89', bomber: '#cf7040' }
    const outline = enemy.elite ? '#e5b84b' : kindColor[enemy.kind]
    drawShadow(ctx, enemy.x, enemy.y, size, enemy.boss ? 0.45 : 0.3)
    ctx.save()
    ctx.strokeStyle = outline
    ctx.globalAlpha = enemy.elite ? 0.9 : 0.62
    ctx.lineWidth = enemy.elite ? 3 : enemy.kind === 'heavy' ? 2.5 : 1.5
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, enemy.radius + (enemy.elite ? 6 + Math.sin(stageTimer.value * 5) * 2 : 3), 0, Math.PI * 2)
    ctx.stroke()
    if (enemy.kind === 'ranged') {
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 8, -0.65, 0.65)
      ctx.stroke()
      if (enemy.aimTime > 0) {
        const aimProgress = 1 - enemy.aimTime / levelTuning.enemyWarnings.rangedAimSeconds
        ctx.strokeStyle = aimProgress > 0.72 ? '#ff6b4a' : '#f2c14f'
        ctx.lineWidth = 1.5 + aimProgress * 2
        ctx.globalAlpha = 0.48 + aimProgress * 0.42
        ctx.setLineDash([10, 6])
        ctx.beginPath()
        ctx.moveTo(enemy.x, enemy.y)
        ctx.lineTo(enemy.x + Math.cos(enemy.aimAngle) * levelTuning.enemyWarnings.rangedRange, enemy.y + Math.sin(enemy.aimAngle) * levelTuning.enemyWarnings.rangedRange)
        ctx.stroke()
      }
    }
    if (enemy.kind === 'heavy') {
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 6, enemy.angle - 0.8, enemy.angle + 0.8)
      ctx.stroke()
    }
    if (enemy.kind === 'fast' && enemy.chargeWindup > 0) {
      const warningProgress = 1 - enemy.chargeWindup / levelTuning.enemyWarnings.fastWindupSeconds
      ctx.strokeStyle = '#ffb24c'
      ctx.lineWidth = 2 + warningProgress * 2
      ctx.globalAlpha = 0.52 + warningProgress * 0.42
      ctx.setLineDash([8, 5])
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10 + warningProgress * 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(enemy.x + Math.cos(enemy.aimAngle) * 190, enemy.y + Math.sin(enemy.aimAngle) * 190)
      ctx.stroke()
    } else if (enemy.kind === 'fast' && enemy.chargeTime > 0) {
      ctx.globalAlpha = 0.72
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 68, enemy.y + Math.sin(enemy.angle) * 68)
      ctx.stroke()
    }
    if (enemy.boss && enemy.aimTime > 0) {
      const phase = levelTuning.boss.phases[enemy.bossPhase]
      const halfArc = Math.max(0.18, phase.spread * (phase.projectileCount - 1) / 2)
      ctx.strokeStyle = '#ff5b42'
      ctx.fillStyle = 'rgba(210, 54, 35, 0.12)'
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.82
      ctx.setLineDash([12, 7])
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.arc(enemy.x, enemy.y, phase.warningRange, enemy.aimAngle - halfArc, enemy.aimAngle + halfArc)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    drawSprite(ctx, enemySprite(enemy), enemy.x, enemy.y, size, enemy.angle)
    ctx.fillStyle = '#15120d'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 4)
    ctx.fillStyle = '#78a866'
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2 * Math.max(enemy.hp / enemy.maxHp, 0), 4)
    if (enemy.maxArmor > 0) {
      ctx.fillStyle = '#142129'
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 5, enemy.radius * 2, 3)
      ctx.fillStyle = enemy.armor > 0 ? '#7fc3df' : '#d66a4f'
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 5, enemy.radius * 2 * Math.max(enemy.armor / enemy.maxArmor, 0), 3)
    }
    if (enemy.elite || enemy.boss) {
      ctx.fillStyle = '#f3efe5'
      ctx.fillText(enemy.label, enemy.x, enemy.y - enemy.radius - 15)
    }
  }

  ctx.font = '700 13px Trebuchet MS'
  ctx.textAlign = 'center'
  for (const text of hitTexts) {
    ctx.font = text.critical ? '900 17px Trebuchet MS' : '700 13px Trebuchet MS'
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1)
    if (text.critical) {
      ctx.strokeStyle = 'rgba(27, 18, 8, 0.9)'
      ctx.lineWidth = 4
      ctx.strokeText(text.value, text.x, text.y)
    }
    ctx.fillStyle = text.color
    ctx.fillText(text.value, text.x, text.y)
    ctx.globalAlpha = 1
  }

  for (const ghost of afterimages) {
    drawSpriteTint(ctx, sprites.player, ghost.x, ghost.y, ghost.size, ghost.angle, (ghost.life / ghost.maxLife) * 0.32, dashTimer > 0 ? '#e5b84b' : '#6ea6c9')
  }
  const speed = Math.hypot(player.vx, player.vy)
  const playerSize = player.radius * 3.4 * (1 + clamp(speed / 650, 0, 0.08))
  drawShadow(ctx, player.visualX, player.visualY, playerSize, 0.36)
  if (playerHitFlash > 0) {
    drawSpriteTint(ctx, sprites.player, player.visualX, player.visualY + Math.sin(player.bob) * clamp(speed / 260, 0, 2.3), playerSize, player.angle, 0.88, '#da4c3d')
  } else {
    drawSprite(ctx, sprites.player, player.visualX, player.visualY + Math.sin(player.bob) * clamp(speed / 260, 0, 2.3), playerSize, player.angle)
  }
  ctx.restore()
}

function markReplayIssue(issue: string) {
  if (!replayRuntime.running) return
  replayRuntime.issues.add(issue)
  replayUi.message = issue
}

function replayStatus(): R3ReplayStatus {
  return {
    status: replayUi.status,
    currentLabel: replayUi.currentLabel,
    validSamples: replayRuntime.samples.length,
    rejectedSamples: replayRuntime.rejected.length,
    message: replayUi.message,
    samples: replayRuntime.samples.map((sample) => ({ ...sample })),
    rejected: replayRuntime.rejected.map((sample) => ({ ...sample }))
  }
}

function stopR3Replay() {
  replayRuntime.running = false
  replayUi.status = 'stopped'
  replayUi.message = '回放已停止；刷新页面可恢复原存档状态'
  keys.clear()
}

function beginR3ReplayAttempt() {
  const entry = replayRuntime.plan[replayRuntime.planIndex]
  const createFixture = replayRuntime.fixtureFactory
  if (!entry || !createFixture) {
    replayRuntime.running = false
    replayUi.status = 'complete'
    replayUi.currentLabel = ''
    replayUi.message = `12 局有效样本完成，剔除并重跑 ${replayRuntime.rejected.length} 局`
    return
  }

  const fixture = structuredClone(createFixture(entry.stage))
  mode.value = 'base'
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  applySaveData(fixture)
  nextEnemyId = 1
  attachmentInstanceCursor = 0
  attachmentAcquireCursor = 0
  replayRuntime.random = createSeededRandom(entry.seed)
  replayRuntime.waypointIndex = 0
  replayRuntime.issues.clear()
  replayRuntime.maxFrameGapMs = 0
  replayRuntime.previousFrameAt = performance.now()
  replayRuntime.wallStartedAt = performance.now()
  replayRuntime.startResources = { ...resources }
  replayUi.status = 'running'
  replayUi.currentLabel = `第 ${entry.stage} 关 · 第 ${entry.run}/3 局 · 尝试 ${replayRuntime.attempt}`
  replayUi.message = `固定种子 ${entry.seed} · ${replayRuntime.speed}× 固定步长`
  if (document.hidden) markReplayIssue('启动时页面处于隐藏状态')
  startStage()
}

function finishR3ReplayAttempt() {
  const entry = replayRuntime.plan[replayRuntime.planIndex]
  const result = lastRun.value
  if (!entry) return
  if (!result) markReplayIssue('结算对象缺失')
  const goldIncome = resources.gold - replayRuntime.startResources.gold
  const alloyIncome = resources.alloy - replayRuntime.startResources.alloy
  const partsIncome = resources.parts - replayRuntime.startResources.parts
  const reforgeSupport = supportedRareReforges(goldIncome, alloyIncome)
  const issueText = [...replayRuntime.issues].join('；')
  const sample: R3ReplaySample = {
    ...entry,
    attempt: replayRuntime.attempt,
    valid: Boolean(result) && !issueText,
    result: result?.victory ? '通关' : '失败',
    duration: Math.round((result?.stats.duration ?? stageTimer.value) * 1000) / 1000,
    wallDuration: Math.round(((performance.now() - replayRuntime.wallStartedAt) / 1000) * 1000) / 1000,
    goldIncome,
    alloyIncome,
    partsIncome,
    unlockedReforges: reforgeSupport.unlocked,
    lockedReforges: reforgeSupport.locked,
    deathReason: result?.victory ? '—' : result?.stats.deathCombination || `第 ${currentWave.value} 波生命归零`,
    inputOrSamplingIssue: issueText || '无',
    maxFrameGapMs: Math.round(replayRuntime.maxFrameGapMs * 100) / 100,
    inventoryCount: inventory.value.length,
    protectedOverflow: inventoryOverCapacity.value
  }

  if (!sample.valid) {
    replayRuntime.rejected.push(sample)
    replayUi.rejectedSamples = replayRuntime.rejected.length
    replayRuntime.attempt += 1
    if (replayRuntime.attempt > 5) {
      replayRuntime.running = false
      replayUi.status = 'error'
      replayUi.message = `${replayUi.currentLabel} 连续 5 次无效，批次停止`
      return
    }
    replayUi.message = `样本无效并自动重跑：${sample.inputOrSamplingIssue}`
    beginR3ReplayAttempt()
    return
  }

  replayRuntime.samples.push(sample)
  replayUi.validSamples = replayRuntime.samples.length
  replayRuntime.planIndex += 1
  replayRuntime.attempt = 1
  replayUi.message = `${sample.result} · ${sample.duration.toFixed(3)} 秒 · 金币 +${sample.goldIncome}`
  beginR3ReplayAttempt()
}

async function startR3Replay(options: R3ReplayBatchOptions = {}) {
  if (!import.meta.dev) throw new Error('R3 回放器仅在开发/测试环境可用')
  if (replayRuntime.running) throw new Error('R3 回放批次已在运行')
  replayUi.visible = true
  replayUi.status = 'loading'
  replayUi.message = '正在载入 R2 固定构筑夹具'
  const fixtures = await import('~/tests/fixtures/r2')
  replayRuntime.fixtureFactory = (targetStage) => fixtures.createR2BalanceSave(targetStage) as SaveData
  replayRuntime.plan = createR3ReplayPlan(options.baseSeed)
  replayRuntime.planIndex = 0
  replayRuntime.attempt = 1
  replayRuntime.speed = clamp(Math.round(options.speed ?? 12), 1, 60)
  replayRuntime.samples = []
  replayRuntime.rejected = []
  replayRuntime.running = true
  replayPersistenceSuppressed = true
  replayUi.validSamples = 0
  replayUi.rejectedSamples = 0
  keys.clear()
  beginR3ReplayAttempt()
}

function handleReplayBlur() {
  markReplayIssue('窗口失焦')
}

function handleReplayVisibility() {
  if (document.hidden) markReplayIssue('页面隐藏')
}

function loop(now: number) {
  if (replayRuntime.running) {
    const frameGapMs = Math.max(0, now - replayRuntime.previousFrameAt)
    replayRuntime.previousFrameAt = now
    replayRuntime.maxFrameGapMs = Math.max(replayRuntime.maxFrameGapMs, frameGapMs)
    if (frameGapMs > 1000) markReplayIssue(`帧输入中断 ${Math.round(frameGapMs)}ms`)
    for (let step = 0; step < replayRuntime.speed; step += 1) {
      update(R3_REPLAY_FIXED_DELTA)
      if (mode.value === 'settlement') {
        finishR3ReplayAttempt()
        break
      }
    }
    lastTime = now
  } else {
    const delta = Math.min((now - lastTime) / 1000 || 0, 0.05)
    lastTime = now
    update(delta)
  }
  draw()
  animationFrame = requestAnimationFrame(loop)
}

function resetRunState() {
  kills.value = 0
  spawnedEnemyCount.value = 0
  currentWave.value = 1
  waveSpawnedCount.value = 0
  waveTransitionSeconds.value = 0
  waveTransitionPending.value = false
  stageTimer.value = 0
  waveStartTime = 0
  spawnTimer = 0
  overloadTimer = 0
  dashTimer = 0
  bossSpawned = false
  upgradeTakenForStage.value = 0
  upgradeChoices.value = []
  enemies.splice(0)
  bullets.splice(0)
  enemyProjectiles.splice(0)
  drops.splice(0)
  afterimages.splice(0)
  hitTexts.splice(0)
  damageEvents.splice(0)
  waveRecords.splice(0)
  recordedWaveIndexes.clear()
  runStats.currentDps = 0
  runStats.peakDps = 0
  runStats.totalDamage = 0
  runStats.highestHit = 0
  runStats.goldEarned = 0
  runStats.expEarned = 0
  runStats.hitCount = 0
  runStats.damageTaken = 0
  runStats.heavyPierceDamage = 0
  runStats.criticalTriggers = 0
  runStats.criticalExtraDamage = 0
  runStats.dodgedCharges = 0
  runStats.totalChargeAttempts = 0
  runStats.deathCombination = ''
  bossHud.visible = false
  damageDirection.life = 0
  killNotice.value = ''
  killNoticeTimer = 0
  for (const skill of skills) skill.cooldown = 0
  player.hp = player.maxHp
  player.vx = 0
  player.vy = 0
  movePlayerToAreaCenter()
  clearCombatFeedback()
}

function clearCombatFeedback() {
  screenShake = 0
  playerHitFlash = 0
  damageDirection.life = 0
  bossHud.visible = false
}

function startStage() {
  if (inventoryOverCapacity.value) {
    bannerText.value = '背包超出容量，请先返回基地整理受保护配件'
    return
  }
  applyBaseStats()
  resetRunState()
  mode.value = 'battle'
  announceBanner(`第 1 波 · ${currentWaveDefinition.value?.label}`, 'normal')
  playSound('wave')
}

function returnToBase() {
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  stageDraft.value = stage.value
  applyBaseStats()
  resetRunState()
  mode.value = 'base'
  saveGame()
}

function advanceAndStart() {
  if (inventoryOverCapacity.value) {
    bannerText.value = '背包超出容量，请先返回基地整理受保护配件'
    return
  }
  if (lastRun.value?.victory) {
    stage.value = clamp(stage.value + 1, 1, 10000)
    stageDraft.value = stage.value
  }
  lastRun.value = null
  settlementEquipNotice.value = null
  overflowSalvageNotice.value = null
  saveGame()
  startStage()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  for (const [key, url] of Object.entries(assetUrls)) loadSprite(key as keyof typeof assetUrls, url)
  loadGame()
  resizeCanvas()
  applyBaseStats()
  movePlayerToAreaCenter()
  canPersist = true
  watch(stage, (value) => {
    stageDraft.value = value
  })
  watch([stage, inventory, () => ({ ...attachmentAcquireOrder }), () => ({ ...resources }), () => ({ ...base }), () => ({ level: player.level, exp: player.exp, hp: player.hp }), () => equippedParts.map(attachmentKey)], saveGame, { deep: true })
  watch(bannerText, (text) => {
    if (!text) return
    window.setTimeout(() => {
      if (bannerText.value === text) bannerText.value = ''
    }, 1500)
  })
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  if (import.meta.dev) {
    window.__gunfightR3Replay = { start: startR3Replay, stop: stopR3Replay, getStatus: replayStatus }
    window.addEventListener('blur', handleReplayBlur)
    document.addEventListener('visibilitychange', handleReplayVisibility)
    const params = new URLSearchParams(window.location.search)
    if (params.get('r3-replay') === '1') {
      const speed = Number(params.get('speed')) || 12
      const baseSeed = Number(params.get('seed')) || undefined
      void startR3Replay({ speed, baseSeed }).catch((error: unknown) => {
        replayRuntime.running = false
        replayUi.visible = true
        replayUi.status = 'error'
        replayUi.message = error instanceof Error ? error.message : String(error)
      })
    }
  }
  animationFrame = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
  if (import.meta.dev) {
    window.removeEventListener('blur', handleReplayBlur)
    document.removeEventListener('visibilitychange', handleReplayVisibility)
    delete window.__gunfightR3Replay
  }
})
</script>

<style scoped>
.game-screen {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #10100e;
  isolation: isolate;
}

.r3-replay-status {
  position: fixed;
  z-index: 30;
  top: 12px;
  left: 50%;
  width: min(520px, calc(100vw - 24px));
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 16px;
  padding: 10px 14px;
  border: 1px solid rgba(229, 184, 75, 0.65);
  background: rgba(12, 12, 10, 0.92);
  color: #f3efe5;
  pointer-events: none;
}

.r3-replay-status small,
.r3-replay-status span {
  color: #c8c2b5;
}

.r3-replay-status span:last-child {
  grid-column: 1 / -1;
}

.game-screen::before,
.game-screen::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.game-screen::before {
  background:
    radial-gradient(circle at 50% 47%, transparent 0 32%, rgba(7, 7, 6, 0.18) 54%, rgba(7, 7, 6, 0.68) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.44), transparent 18%, transparent 78%, rgba(0, 0, 0, 0.5));
}

.game-screen::after {
  background: repeating-linear-gradient(0deg, rgba(243, 239, 229, 0.018) 0 1px, transparent 1px 4px);
  mix-blend-mode: overlay;
  opacity: 0.55;
}

.battlefield {
  width: 100%;
  height: 100%;
  display: block;
  filter: saturate(0.9) contrast(1.08) brightness(0.72);
}

.mode-base .battlefield,
.mode-settlement .battlefield {
  filter: saturate(0.72) contrast(1.05) brightness(0.44);
}

.hud,
.top-actions,
.objective-strip,
.skill-bar,
.choice-panel,
.base-panel,
.settlement-panel,
.combat-banner {
  z-index: 3;
  border: 1px solid rgba(190, 145, 58, 0.34);
  background:
    linear-gradient(180deg, rgba(37, 34, 28, 0.9), rgba(17, 17, 15, 0.88)),
    rgba(18, 17, 15, 0.9);
  box-shadow:
    0 22px 60px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 238, 188, 0.06);
  backdrop-filter: blur(5px);
}

.top-actions {
  position: fixed;
  top: 28px;
  right: 30px;
  display: grid;
  grid-template-columns: minmax(118px, auto) auto auto;
  gap: 8px;
}

.top-actions button,
.currency-chip {
  min-height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(243, 239, 229, 0.14);
  background: rgba(15, 14, 12, 0.74);
  color: var(--muted);
  font-weight: 800;
}

.currency-chip span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #15120d;
  background: radial-gradient(circle at 35% 35%, #fff1a8, #e5b84b 55%, #9a641e);
  box-shadow: 0 0 18px rgba(229, 184, 75, 0.28);
}

.currency-chip b {
  color: var(--ink);
  font-size: 17px;
}

.hud {
  position: fixed;
  top: 30px;
  width: min(360px, calc(100vw - 36px));
  padding: 0;
  overflow: hidden;
}

.hud-left {
  left: 30px;
  display: grid;
  gap: 14px;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.hud-right {
  top: 108px;
  right: 30px;
  width: min(382px, calc(100vw - 36px));
  padding: 18px 18px 16px;
}

.dps-hud {
  width: min(240px, calc(100vw - 36px));
  padding: 14px;
}

.dps-readout {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 2px 14px;
  padding: 12px 14px;
  border: 1px solid rgba(240, 191, 87, 0.3);
  background:
    linear-gradient(135deg, rgba(240, 191, 87, 0.12), rgba(119, 183, 215, 0.06)),
    rgba(7, 9, 10, 0.72);
}

.dps-readout span,
.dps-readout small {
  color: var(--muted);
  font-size: 12px;
}

.dps-readout b {
  grid-row: 1 / span 2;
  grid-column: 2;
  color: #f8d57a;
  font-size: 32px;
  line-height: 1;
}

.mode-base .hud,
.mode-base .top-actions,
.mode-base .objective-strip,
.mode-base .skill-bar,
.mode-settlement .hud,
.mode-settlement .top-actions,
.mode-settlement .objective-strip,
.mode-settlement .skill-bar {
  display: none;
}

.profile-card,
.stat-board {
  border: 1px solid rgba(190, 145, 58, 0.3);
  background:
    linear-gradient(90deg, rgba(35, 31, 25, 0.94), rgba(16, 16, 14, 0.86)),
    rgba(18, 17, 15, 0.9);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 238, 188, 0.06);
  backdrop-filter: blur(5px);
}

.profile-card {
  min-height: 96px;
  padding: 16px;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 14px;
  align-items: center;
}

.rank-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  color: #f2d58b;
  font-size: 42px;
  text-shadow: 0 0 18px rgba(229, 184, 75, 0.38);
  border: 1px solid rgba(229, 184, 75, 0.32);
  background: radial-gradient(circle, rgba(229, 184, 75, 0.2), rgba(229, 184, 75, 0.04));
}

.profile-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.profile-line b {
  font-size: 18px;
}

.profile-line span,
.profile-card small {
  color: var(--ink);
  font-weight: 800;
}

.profile-card small {
  display: block;
  text-align: right;
  font-size: 12px;
}

.stat-board {
  padding: 0;
}

.stat-board .panel-kicker {
  margin: 0;
  padding: 13px 18px;
  border-bottom: 1px solid rgba(243, 239, 229, 0.08);
}

.stat-row {
  min-height: 39px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(243, 239, 229, 0.055);
}

.stat-row span {
  color: var(--muted);
  font-size: 13px;
}

.stat-row b {
  color: var(--ink);
  font-size: 14px;
}

.panel-kicker {
  margin: 0 0 6px;
  color: var(--hazard);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

.hud h2,
.choice-panel h2,
.settlement-panel h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.stage-line,
.stats,
li,
.objective-strip,
.skill-bar button,
.inventory-preview button,
.reward-grid,
.reward-preview,
.settlement-actions,
.resource-rail,
.power-readout {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stage-line,
.stats,
li,
.inventory-preview button span,
.skill-bar span,
.base-hero p,
.settlement-panel p,
.base-intel small,
.base-intel span,
.power-readout span {
  color: var(--muted);
}

.bar {
  height: 7px;
  margin: 10px 0 4px;
  background: rgba(9, 9, 8, 0.86);
  overflow: hidden;
  border: 1px solid rgba(229, 184, 75, 0.16);
}

.bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #d18724, #e5b84b);
  box-shadow: 0 0 16px rgba(229, 184, 75, 0.36);
}

.bar.exp span {
  background: var(--blue);
}

.stats {
  font-size: 12px;
}

.weapon-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.power-readout {
  align-items: center;
  margin: 0 0 12px;
  padding: 13px 0 12px;
  border-top: 1px solid rgba(243, 239, 229, 0.08);
  border-bottom: 1px solid rgba(243, 239, 229, 0.08);
  background: linear-gradient(90deg, transparent, rgba(229, 184, 75, 0.08), transparent);
}

.power-readout b {
  color: #ead28a;
  font-size: 24px;
}

.weapon-traits span {
  padding: 4px 9px;
  background: rgba(229, 184, 75, 0.18);
  border: 1px solid rgba(229, 184, 75, 0.14);
  color: #ead28a;
  font-size: 11px;
  font-weight: 900;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

li b {
  color: var(--ink);
}

.loadout-list li {
  display: grid;
  gap: 4px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(243, 239, 229, 0.07);
}

.inventory-preview {
  margin-top: 14px;
  display: grid;
  gap: 7px;
}

.empty-backpack {
  margin: 0;
  padding: 10px;
  color: var(--muted);
  background: rgba(243, 239, 229, 0.045);
  border: 1px dashed rgba(243, 239, 229, 0.16);
}

button {
  border: 1px solid rgba(243, 239, 229, 0.14);
  color: var(--ink);
  background: rgba(243, 239, 229, 0.06);
}

button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.inventory-preview button {
  padding: 10px;
  text-align: left;
  border-style: dashed;
  background: rgba(243, 239, 229, 0.035);
}

.inventory-preview button.selected,
.base-backpack-list button.selected {
  border-color: rgba(229, 184, 75, 0.72);
  background: rgba(229, 184, 75, 0.14);
}

.objective-strip {
  position: fixed;
  left: 50%;
  top: 44px;
  width: min(760px, calc(100vw - 760px));
  min-width: 360px;
  transform: translateX(-50%);
  padding: 0;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr 1.15fr;
  color: var(--muted);
}

.objective-strip div {
  min-height: 70px;
  padding: 12px 18px;
  display: grid;
  grid-template-columns: 34px 1fr;
  grid-template-rows: auto auto;
  gap: 2px 10px;
  align-content: center;
  border-left: 1px solid rgba(243, 239, 229, 0.08);
}

.objective-strip div:first-child {
  border-left: 0;
}

.objective-icon {
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--hazard);
  font-size: 24px;
  line-height: 1;
}

.objective-strip small {
  color: var(--muted);
  font-size: 12px;
}

.objective-strip b {
  color: var(--ink);
  font-size: clamp(14px, 1.3vw, 24px);
  line-height: 1.05;
}

.skill-bar {
  position: fixed;
  left: 50%;
  bottom: 28px;
  width: min(620px, calc(100vw - 36px));
  transform: translateX(-50%);
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}

.skill-bar button,
.choice-panel button {
  min-height: 72px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 10px;
  text-align: left;
  border-width: 0 0 0 1px;
  background: rgba(243, 239, 229, 0.035);
}

.skill-bar button:first-child,
.choice-panel button:first-child {
  border-left: 0;
}

.skill-bar img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  padding: 4px;
  border: 1px solid rgba(229, 184, 75, 0.18);
  background: rgba(5, 5, 5, 0.48);
}

.skill-bar small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
}

.skill-bar b {
  font-size: 17px;
}

.choice-panel,
.settlement-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(560px, calc(100vw - 36px));
  transform: translate(-50%, -50%);
  padding: 22px;
  z-index: 4;
}

.choice-panel > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.base-panel {
  position: fixed;
  left: 50%;
  top: clamp(64px, 8vh, 92px);
  width: min(880px, calc(100vw - 96px));
  max-height: calc(100vh - clamp(128px, 16vh, 184px));
  overflow: auto;
  transform: translateX(-50%);
  padding: clamp(14px, 1.4vw, 20px);
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  scrollbar-color: rgba(229, 184, 75, 0.48) rgba(243, 239, 229, 0.08);
}

.base-panel::-webkit-scrollbar,
.hud-right::-webkit-scrollbar {
  width: 8px;
}

.base-panel::-webkit-scrollbar-track,
.hud-right::-webkit-scrollbar-track {
  background: rgba(243, 239, 229, 0.06);
}

.base-panel::-webkit-scrollbar-thumb,
.hud-right::-webkit-scrollbar-thumb {
  background: rgba(229, 184, 75, 0.45);
}

.base-hero {
  display: grid;
  grid-template-columns: minmax(260px, 0.82fr) minmax(320px, 1fr);
  gap: 8px 14px;
  align-items: start;
}

.base-hero .panel-kicker,
.base-hero h1,
.base-hero > p,
.resource-rail {
  grid-column: 1;
}

.base-intel {
  grid-column: 2;
  grid-row: 1 / span 4;
}

.stage-picker,
.character-panel,
.reward-preview,
.base-actions {
  grid-column: 1 / -1;
}

.base-hero h1 {
  margin: 0;
  max-width: 12em;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1;
}

.base-hero > p {
  margin: 0;
}

.resource-rail {
  flex-wrap: wrap;
  margin: 12px 0 8px;
}

.resource-rail span,
.base-intel article {
  padding: 10px;
  background: rgba(243, 239, 229, 0.06);
  border: 1px solid rgba(243, 239, 229, 0.1);
}

.resource-rail span {
  display: grid;
  gap: 3px;
  min-width: 88px;
}

.resource-rail small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1;
}

.resource-rail b {
  color: #ead28a;
}

.base-intel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.base-intel article {
  display: grid;
  gap: 5px;
}

.base-intel b {
  font-size: 18px;
}

.character-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  padding: 10px;
  background: rgba(243, 239, 229, 0.04);
  border: 1px solid rgba(243, 239, 229, 0.1);
}

.character-level {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 5px 12px;
}

.character-level span,
.character-stats span {
  color: var(--muted);
  font-size: 12px;
}

.character-level b {
  color: #ead28a;
  font-size: 20px;
  line-height: 1;
}

.character-level small {
  color: var(--muted);
  text-align: right;
}

.character-level .bar {
  grid-column: 1 / -1;
  margin: 0;
}

.character-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.character-stats article {
  position: relative;
  min-height: 46px;
  padding: 7px 8px 7px 10px;
  display: grid;
  align-content: center;
  gap: 3px;
  background: rgba(25, 24, 21, 0.52);
  border: 1px solid rgba(243, 239, 229, 0.08);
  overflow: hidden;
}

.character-stats article::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--stat-accent, var(--steel));
}

.character-stats .tone-offense {
  --stat-accent: #d8a84b;
}

.character-stats .tone-survival {
  --stat-accent: #68a982;
}

.character-stats .tone-mobility {
  --stat-accent: #6aa5bf;
}

.character-stats .tone-growth {
  --stat-accent: #b58a58;
}

.character-stats b {
  color: var(--ink);
  font-size: 13px;
}

.character-stats span,
.character-stats b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-picker {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 48px 48px minmax(120px, 1fr) 48px 48px;
  gap: 8px;
  align-items: stretch;
}

.stage-picker button,
.stage-picker label {
  min-height: 42px;
}

.stage-picker label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid rgba(243, 239, 229, 0.14);
  background: rgba(243, 239, 229, 0.06);
}

.stage-picker span {
  color: var(--muted);
  font-size: 13px;
}

.stage-picker input {
  width: 100%;
  min-width: 0;
  border: 0;
  color: var(--ink);
  background: transparent;
  text-align: right;
  font-weight: 900;
}

.reward-preview {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.reward-preview article {
  padding: 10px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.1);
}

.reward-preview span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.reward-preview b {
  display: block;
  margin-top: 4px;
  color: #ead28a;
  font-size: 15px;
}

.base-actions,
.settlement-actions .primary,
.settlement-actions button:first-child {
  margin-top: 10px;
}

.base-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.base-actions button {
  padding: 12px 14px;
  font-weight: 800;
}

.base-actions .primary,
.settlement-actions .primary {
  width: fit-content;
  min-width: 160px;
  background: var(--hazard);
  color: #15120d;
}

.base-actions .primary:disabled,
.settlement-actions .primary:disabled {
  background: rgba(243, 239, 229, 0.1);
  color: var(--muted);
}

.capacity-blocker {
  flex: 1 1 280px;
  align-self: center;
  margin: 0;
  color: #ffb094;
  font-size: 13px;
  font-weight: 800;
}

.mode-base .base-panel {
  left: auto;
  right: clamp(18px, 3vw, 42px);
  width: min(860px, calc(100vw - 460px));
  transform: none;
}

.equipment-dock {
  left: clamp(18px, 3vw, 42px);
  top: clamp(18px, 4vh, 38px);
  bottom: clamp(18px, 4vh, 38px);
  width: min(350px, calc(100vw - 930px));
  min-width: 300px;
  max-height: none;
  transform: none;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
}

.equipment-dock .equipment-head h2 {
  font-size: clamp(22px, 2vw, 28px);
}

.equipment-dock .equipment-layout {
  grid-template-columns: 1fr;
  gap: 8px;
  overflow: auto;
  padding-right: 4px;
  scrollbar-color: rgba(240, 191, 87, 0.58) rgba(255, 255, 255, 0.06);
}

.equipment-dock .operator-card {
  order: -1;
  min-height: 300px;
}

.equipment-dock .equipment-slots {
  grid-template-rows: none;
  gap: 8px;
}

.equipment-dock .equipment-slot {
  min-height: 66px;
  grid-template-columns: 54px minmax(0, 1fr);
  padding: 8px;
}

.equipment-dock .equipment-icon {
  width: 54px;
}

.equipment-dock .equipment-slot b {
  font-size: 15px;
}

.equipment-dock .equipment-slot span:not(.equipment-icon) {
  font-size: 11px;
}

.base-backpack {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(243, 239, 229, 0.12);
}

.base-backpack-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
}

.base-backpack-head h3 {
  margin: 0;
  font-size: 18px;
}

.base-backpack-head > span {
  color: #ead28a;
  font-weight: 800;
}

.backpack-summary {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.backpack-summary span {
  color: #ead28a;
  font-weight: 800;
}

.backpack-summary button {
  min-height: 36px;
  padding: 0 12px;
  background: rgba(229, 184, 75, 0.92);
  color: #15120d;
  font-weight: 900;
}

.backpack-summary button:disabled {
  background: rgba(243, 239, 229, 0.1);
  color: var(--muted);
}

.backpack-summary button.active {
  border-color: rgba(225, 87, 72, 0.68);
  background: rgba(225, 87, 72, 0.16);
  color: #f1c2b9;
}

.backpack-toolbar {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr) 220px;
  gap: 8px;
  align-items: stretch;
}

.backpack-toolbar label {
  min-height: 42px;
  display: grid;
  gap: 3px;
  padding: 8px 10px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
}

.backpack-toolbar label span {
  color: var(--muted);
  font-size: 12px;
}

.backpack-toolbar select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 800;
}

.backpack-toolbar select option {
  color: #15120d;
}

.inventory-filter {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.inventory-filter button {
  min-height: 42px;
  padding: 6px;
  font-weight: 800;
}

.inventory-filter button.active {
  border-color: rgba(229, 184, 75, 0.75);
  background: rgba(229, 184, 75, 0.16);
}

.slot-filter-block {
  display: grid;
  gap: 5px;
}

.filter-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.filter-caption b {
  color: #ead28a;
  font-size: var(--font-control);
}

.slot-filter {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 6px;
}

.slot-filter button {
  min-height: 42px;
  padding: 7px 6px;
  display: grid;
  place-items: center;
  gap: 2px;
}

.slot-filter button.active {
  border-color: rgba(229, 184, 75, 0.75);
  background: rgba(229, 184, 75, 0.16);
}

.slot-filter b {
  font-size: 13px;
}

.slot-filter span {
  color: var(--muted);
  font-size: 12px;
}

.sale-toolbar {
  min-height: 54px;
  padding: 8px;
  display: grid;
  grid-template-columns: minmax(210px, 1fr) auto auto auto;
  gap: 7px;
  align-items: stretch;
  border: 1px solid rgba(225, 87, 72, 0.4);
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(93, 35, 31, 0.3), rgba(15, 18, 19, 0.86));
}

.sale-toolbar > div {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 3px;
}

.sale-toolbar span {
  color: #e9b5aa;
  font-size: var(--font-caption);
}

.sale-toolbar b {
  overflow: hidden;
  color: var(--ink);
  font-size: var(--font-control);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sale-toolbar button {
  min-width: 82px;
  padding: 6px 10px;
  font-weight: 800;
}

.sale-toolbar .sale-confirm {
  min-width: 112px;
  border-color: rgba(225, 87, 72, 0.72);
  color: #fff1ed;
  background: linear-gradient(180deg, #a9483d, #713129);
}

.base-backpack-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.base-backpack-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(66px, 1fr));
  align-content: start;
  gap: 8px;
  overflow: visible;
}

.inventory-icon-shell {
  position: relative;
  min-width: 0;
  aspect-ratio: 1;
}

.inventory-icon-shell::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 0;
  width: 10px;
  height: 100%;
}

.inventory-icon-shell.sale-selected .inventory-icon-item {
  border-color: rgba(240, 191, 87, 0.94);
  box-shadow: inset 0 0 0 2px rgba(240, 191, 87, 0.3), 0 0 14px rgba(240, 191, 87, 0.16);
}

.inventory-icon-shell.favorite-protected .inventory-icon-item {
  box-shadow: inset 0 0 0 1px rgba(240, 191, 87, 0.42);
}

.base-backpack-list .inventory-icon-item {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 72px;
  aspect-ratio: 1;
  padding: 6px;
  display: block;
  overflow: visible;
  border-color: rgba(125, 139, 146, 0.34);
  background: linear-gradient(145deg, rgba(39, 45, 48, 0.92), rgba(9, 12, 13, 0.96));
  text-align: left;
}

.inventory-item-art {
  position: absolute;
  inset: 6px;
  display: block;
  border: 1px solid rgba(240, 191, 87, 0.2);
  border-radius: 5px;
  background-repeat: no-repeat;
  filter: saturate(0.92) contrast(1.06);
}

.inventory-item-level,
.inventory-item-slot {
  position: absolute;
  z-index: 1;
  padding: 2px 4px;
  color: #f8d57a;
  background: rgba(7, 9, 10, 0.84);
  font-size: 10px;
  font-weight: 900;
  line-height: 1.15;
}

.inventory-favorite-mark {
  position: absolute;
  z-index: 2;
  top: 5px;
  left: 6px;
  color: #ffe08b;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
  font-size: 16px;
  line-height: 1;
}

.inventory-item-level {
  top: 6px;
  right: 6px;
}

.inventory-item-slot {
  left: 6px;
  bottom: 6px;
  color: #b8d9e8;
}

.inventory-sale-check {
  position: absolute;
  z-index: 2;
  right: 6px;
  bottom: 6px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(240, 191, 87, 0.65);
  border-radius: 4px;
  color: #17120b;
  background: rgba(12, 14, 15, 0.88);
  font-size: 13px;
  font-weight: 900;
}

.sale-selected .inventory-sale-check {
  background: #f0bf57;
}

.inventory-sale-check.protected {
  border-color: rgba(240, 191, 87, 0.42);
  color: #ffe08b;
  background: rgba(58, 46, 20, 0.9);
  font-size: 10px;
}

.inventory-item-tooltip {
  position: absolute;
  left: calc(100% + 9px);
  top: 0;
  bottom: auto;
  z-index: 20;
  width: 330px;
  max-height: min(520px, calc(100vh - 70px));
  padding: 10px;
  display: grid;
  gap: 8px;
  border: 1px solid rgba(240, 191, 87, 0.46);
  border-radius: 6px;
  color: var(--ink);
  background: linear-gradient(145deg, rgba(28, 34, 35, 0.99), rgba(7, 9, 10, 0.99));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.48);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-6px);
  transition: opacity 120ms ease-out, transform 120ms ease-out, visibility 120ms;
  text-align: left;
  overflow: auto;
}

.inventory-item-tooltip::after {
  content: "";
  position: absolute;
  right: 100%;
  top: 22px;
  width: 9px;
  height: 9px;
  border-left: 1px solid rgba(240, 191, 87, 0.46);
  border-bottom: 1px solid rgba(240, 191, 87, 0.46);
  background: #0b0e0f;
  transform: translate(5px, -50%) rotate(45deg);
}

.inventory-icon-shell:hover,
.inventory-icon-shell:focus-within {
  z-index: 21;
}

.inventory-icon-shell:hover .inventory-icon-item,
.inventory-icon-shell:focus-within .inventory-icon-item {
  border-color: rgba(240, 191, 87, 0.72);
}

.inventory-icon-shell:hover .inventory-item-tooltip,
.inventory-icon-shell:focus-within .inventory-item-tooltip {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(0);
}

.inventory-item-tooltip b {
  color: #f3e8cf;
  font-size: 14px;
}

.inventory-item-tooltip small {
  color: #9fb0b2;
  font-size: 11px;
}

.inventory-item-tooltip em {
  color: #d8c98e;
  font-size: 12px;
  font-style: normal;
  line-height: 1.4;
}

.inventory-tooltip-affixes {
  display: grid;
  gap: 5px;
}

.inventory-tooltip-affixes button {
  min-height: 44px;
  padding: 6px 8px;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  border-color: rgba(110, 166, 201, 0.28);
  background: rgba(110, 166, 201, 0.07);
  text-align: left;
}

.inventory-tooltip-affixes button span {
  color: #9fb0b2;
  font-size: 10px;
  font-weight: 900;
}

.inventory-tooltip-affixes button b {
  font-size: 12px;
}

.inventory-tooltip-affixes button.locked {
  border-color: rgba(240, 191, 87, 0.68);
  background: rgba(240, 191, 87, 0.14);
}

.inventory-tooltip-affixes button.locked span,
.inventory-tooltip-affixes button.locked b {
  color: #ffe08b;
}

.reforge-cost-note {
  margin: 0;
  padding: 6px 8px;
  border-left: 3px solid rgba(110, 166, 201, 0.62);
  color: #b8d9e8;
  background: rgba(110, 166, 201, 0.08);
  font-size: 11px;
  line-height: 1.35;
}

.reforge-cost-note.shortage {
  border-color: rgba(225, 87, 72, 0.72);
  color: #ffb094;
  background: rgba(225, 87, 72, 0.08);
}

.inventory-item-tooltip strong {
  width: fit-content;
  font-size: 11px;
}

.inventory-tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(125, 139, 146, 0.22);
}

.inventory-tooltip-head > div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.inventory-tooltip-head > strong {
  flex: 0 0 auto;
}

.inventory-tooltip-names {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.inventory-tooltip-names span {
  min-width: 0;
  padding: 6px 7px;
  display: grid;
  gap: 2px;
  color: #8fa0a3;
  background: rgba(255, 255, 255, 0.035);
  font-size: 10px;
}

.inventory-tooltip-names b {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inventory-tooltip-compare {
  display: grid;
  gap: 4px;
}

.inventory-tooltip-compare > div {
  min-height: 28px;
  padding: 5px 7px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  background: rgba(255, 255, 255, 0.035);
}

.inventory-tooltip-compare span {
  color: #8fa0a3;
  font-size: 10px;
}

.inventory-tooltip-compare b {
  font-size: 11px;
  text-align: right;
}

.inventory-tooltip-compare strong {
  color: #f3cc6b;
}

.inventory-tooltip-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding-top: 2px;
}

.inventory-tooltip-actions button {
  min-height: 44px;
  padding: 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 900;
}

.inventory-tooltip-actions button:first-child {
  border-color: rgba(255, 224, 139, 0.62);
  color: #191006;
  background: linear-gradient(180deg, #ffe08b, #eeb94f 56%, #a8663d);
}

.inventory-tooltip-actions button.active {
  border-color: rgba(240, 191, 87, 0.72);
  color: #ffe08b;
  background: rgba(240, 191, 87, 0.14);
}

.inventory-icon-item.rarity-精良 {
  border-color: rgba(95, 151, 106, 0.52);
}

.inventory-icon-item.rarity-稀有 {
  border-color: rgba(76, 139, 184, 0.58);
}

.inventory-icon-item.rarity-史诗 {
  border-color: rgba(164, 111, 191, 0.62);
}

.attachment-compare {
  padding: 12px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
}

.attachment-identity {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-bottom: 10px;
}

.attachment-identity div,
.affix-line {
  display: grid;
  gap: 3px;
  padding: 8px;
  background: rgba(25, 24, 21, 0.52);
  border: 1px solid rgba(243, 239, 229, 0.08);
}

.attachment-identity span,
.affix-line span {
  color: var(--muted);
  font-size: 12px;
}

.attachment-identity b,
.affix-line b {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}

.affix-stack {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
}

.affix-line {
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
}

.affix-line.main {
  border-color: rgba(229, 184, 75, 0.38);
  background: rgba(229, 184, 75, 0.1);
}

.affix-line.main b {
  color: #ead28a;
}

.compare-title {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.decision-hint {
  display: grid;
  gap: 3px;
  margin-bottom: 10px;
  padding: 9px 10px;
  background: rgba(243, 239, 229, 0.055);
  border: 1px solid rgba(243, 239, 229, 0.12);
}

.decision-hint.compact {
  margin-bottom: 8px;
  padding: 7px 8px;
}

.decision-hint b {
  font-size: 14px;
}

.decision-hint span {
  color: var(--muted);
  font-size: 12px;
}

.tone-offense {
  border-color: rgba(229, 184, 75, 0.42);
}

.tone-offense b,
.recommend-tag.tone-offense {
  color: #ead28a;
}

.tone-survival {
  border-color: rgba(120, 168, 102, 0.48);
}

.tone-survival b,
.recommend-tag.tone-survival {
  color: var(--green);
}

.tone-utility {
  border-color: rgba(110, 166, 201, 0.48);
}

.tone-utility b,
.recommend-tag.tone-utility {
  color: #9fd0f0;
}

.tone-downgrade {
  border-color: rgba(218, 76, 61, 0.42);
}

.tone-downgrade b,
.recommend-tag.tone-downgrade {
  color: #ee8f83;
}

.compare-title div {
  display: grid;
  gap: 4px;
  padding: 8px;
  background: rgba(25, 24, 21, 0.52);
}

.compare-title span,
.compare-lines span {
  color: var(--muted);
  font-size: 12px;
}

.compare-lines {
  display: grid;
  gap: 6px;
  margin: 10px 0;
}

.compare-lines div {
  display: grid;
  grid-template-columns: 54px 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: rgba(243, 239, 229, 0.04);
}

.compare-lines strong {
  color: #ead28a;
}

.attachment-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.attachment-actions button {
  min-height: 42px;
  padding: 8px;
  font-weight: 900;
}

.attachment-actions button:first-child {
  grid-column: 1 / -1;
  background: var(--hazard);
  color: #15120d;
}

.attachment-actions button:not(:first-child) {
  background: rgba(110, 166, 201, 0.14);
  border-color: rgba(110, 166, 201, 0.34);
}

.attachment-actions button:disabled {
  background: rgba(243, 239, 229, 0.08);
  color: var(--muted);
}

.settlement-panel {
  display: grid;
  gap: 12px;
  width: min(780px, calc(100vw - 36px));
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.reward-grid span {
  padding: 8px;
  background: rgba(229, 184, 75, 0.12);
}

.loot-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.loot-card {
  position: relative;
  min-height: 126px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(229, 184, 75, 0.2), rgba(110, 166, 201, 0.08));
  border: 1px solid rgba(229, 184, 75, 0.34);
}

.loot-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: var(--hazard);
}

.loot-card p {
  margin: 18px 0 6px;
  color: var(--muted);
}

.loot-card h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.loot-card strong {
  color: #ead28a;
}

.loot-compare {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(243, 239, 229, 0.12);
}

.compare-lines.compact {
  margin-bottom: 0;
}

.compare-lines.compact div {
  grid-template-columns: 46px minmax(0, 1fr) auto minmax(0, 1fr);
  padding: 6px;
  font-size: 12px;
}

.compare-title b,
.compare-lines b {
  min-width: 0;
  overflow-wrap: anywhere;
}

.loot-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.loot-card-actions span {
  color: #ead28a;
  font-size: 13px;
  font-weight: 800;
}

.loot-card-actions span.equipped {
  color: var(--green);
}

.loot-card-actions button {
  min-height: 38px;
  padding: 0 12px;
  background: var(--hazard);
  color: #15120d;
  font-weight: 900;
}

.settlement-equip-notice {
  margin: 0;
  padding: 9px 10px;
  display: grid;
  gap: 4px;
  color: #ead28a;
  background: rgba(120, 168, 102, 0.14);
  border: 1px solid rgba(120, 168, 102, 0.32);
}

.settlement-equip-notice b {
  color: var(--green);
}

.new-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 7px;
  background: #ead28a;
  color: #15120d;
  font-size: 12px;
  font-weight: 900;
}

.recommend-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 7px;
  background: rgba(25, 24, 21, 0.76);
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 900;
}

.post-battle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.post-battle-grid button {
  min-height: 82px;
  padding: 10px;
  display: grid;
  gap: 6px;
  text-align: left;
}

.post-battle-grid span {
  color: var(--muted);
  font-size: 13px;
}

.combat-banner {
  position: absolute;
  left: 50%;
  top: 98px;
  z-index: 5;
  transform: translateX(-50%);
  padding: 10px 18px;
  color: #ead28a;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  animation: banner-pop 1.5s ease-out both;
}

@keyframes banner-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -10px) scale(0.96);
  }
  18%,
  72% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -18px) scale(0.98);
  }
}

@media (max-width: 1180px) {
  .objective-strip {
    top: auto;
    bottom: 108px;
    width: min(560px, calc(100vw - 36px));
    min-width: 0;
  }
}

@media (max-height: 760px) and (min-width: 901px) {
  .base-panel {
    top: 28px;
    width: min(920px, calc(100vw - 56px));
    max-height: calc(100vh - 56px);
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }

  .base-hero h1 {
    font-size: clamp(26px, 2.7vw, 34px);
  }

  .base-hero p {
    margin: 8px 0 0;
  }

  .backpack-toolbar {
    grid-template-columns: 140px minmax(0, 1fr) 180px;
  }

  .base-backpack-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .attachment-identity {
    grid-template-columns: 1fr 1fr;
  }

  .top-actions {
    top: 18px;
    right: 22px;
  }

  .hud {
    top: 20px;
  }

  .hud-left {
    left: 22px;
  }

  .hud-right {
    top: 86px;
    right: 22px;
    max-height: calc(100vh - 206px);
    overflow: auto;
  }

  .dps-hud {
    max-height: none;
    overflow: visible;
  }

  .profile-card {
    min-height: 82px;
    padding: 12px;
    grid-template-columns: 52px 1fr;
  }

  .rank-mark {
    width: 48px;
    height: 48px;
    font-size: 34px;
  }

  .stat-row {
    min-height: 34px;
  }

  .objective-strip {
    top: 22px;
    width: min(700px, calc(100vw - 820px));
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .objective-strip div {
    min-height: 62px;
    padding: 8px 14px;
    grid-template-columns: 28px 1fr;
  }

  .objective-icon {
    font-size: 20px;
  }

  .skill-bar {
    bottom: 18px;
    width: min(560px, calc(100vw - 820px));
  }

  .skill-bar button {
    min-height: 62px;
    grid-template-columns: 44px 1fr;
  }

  .skill-bar img {
    width: 40px;
    height: 40px;
  }

  .skill-bar b {
    font-size: 15px;
  }
}

@media (max-width: 900px) {
  .equipment-dock {
    display: grid;
  }

  .base-panel {
    grid-template-columns: 1fr;
    top: 32px;
    width: min(720px, calc(100vw - 28px));
    max-height: calc(100vh - 64px);
  }

  .base-hero {
    grid-template-columns: 1fr;
  }

  .base-hero .panel-kicker,
  .base-hero h1,
  .base-hero > p,
  .resource-rail,
  .base-intel {
    grid-column: 1;
    grid-row: auto;
  }

  .base-intel,
  .character-panel,
  .stage-picker,
  .reward-preview,
  .backpack-toolbar,
  .base-backpack-layout,
  .base-backpack-list,
  .loot-card-grid,
  .post-battle-grid,
  .choice-panel > div,
  .skill-bar {
    grid-template-columns: 1fr;
  }

  .inventory-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .slot-filter {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sale-toolbar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sale-toolbar > div {
    grid-column: 1 / -1;
  }

  .character-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .base-backpack-head {
    align-items: start;
    flex-direction: column;
  }

  .backpack-summary {
    justify-content: flex-start;
  }

  .loot-card-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .character-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .character-level {
    grid-template-columns: auto 1fr;
  }

  .character-level small {
    grid-column: 1 / -1;
    text-align: left;
  }

  .game-screen {
    min-height: 100vh;
    height: auto;
    display: grid;
    grid-template-rows: 60vh auto auto auto;
  }

  .hud,
  .objective-strip,
  .skill-bar {
    position: static;
    width: auto;
    margin: 8px;
    transform: none;
  }

  .hud-right {
    display: none;
  }

  .base-panel,
  .settlement-panel,
  .choice-panel {
    position: fixed;
    top: 16px;
    width: calc(100vw - 24px);
    max-height: calc(100vh - 32px);
    overflow: auto;
  }
}

/* Commercial HUD refresh: visual-only layer, preserving existing layout and interactions. */
.game-screen {
  background:
    radial-gradient(circle at 50% 45%, rgba(240, 191, 87, 0.08), transparent 20rem),
    radial-gradient(circle at 78% 18%, rgba(119, 183, 215, 0.13), transparent 18rem),
    linear-gradient(135deg, #0d1214 0%, #181a18 46%, #0a0d0e 100%);
}

.game-screen::before {
  background:
    linear-gradient(90deg, rgba(7, 9, 10, 0.72), transparent 18%, transparent 82%, rgba(7, 9, 10, 0.72)),
    radial-gradient(circle at 50% 48%, transparent 0 34%, rgba(5, 6, 6, 0.32) 64%, rgba(4, 5, 5, 0.82) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.52), transparent 22%, transparent 76%, rgba(0, 0, 0, 0.62));
}

.game-screen::after {
  background:
    linear-gradient(rgba(255, 255, 255, 0.018) 50%, rgba(0, 0, 0, 0.03) 50%) 0 0 / 100% 4px,
    linear-gradient(90deg, transparent 0 96px, rgba(240, 191, 87, 0.045) 97px, transparent 99px) 0 0 / 148px 100%;
  mix-blend-mode: screen;
  opacity: 0.38;
}

.hud,
.top-actions,
.objective-strip,
.skill-bar,
.choice-panel,
.base-panel,
.equipment-panel,
.settlement-panel,
.combat-banner {
  border-color: rgba(240, 191, 87, 0.28);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(45, 52, 55, 0.78), rgba(13, 16, 17, 0.9)),
    linear-gradient(135deg, rgba(240, 191, 87, 0.11), transparent 36%, rgba(119, 183, 215, 0.08));
  box-shadow:
    0 18px 46px rgba(0, 0, 0, 0.48),
    inset 0 1px 0 rgba(255, 246, 214, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.035);
}

.top-actions {
  padding: 6px;
  border-color: rgba(125, 139, 146, 0.36);
}

.top-actions button,
.currency-chip,
button {
  border-radius: 6px;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, color 140ms ease;
}

.top-actions button,
.currency-chip {
  border-color: rgba(125, 139, 146, 0.34);
  background:
    linear-gradient(180deg, rgba(39, 45, 48, 0.94), rgba(15, 18, 20, 0.94));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.currency-chip {
  color: #f8d57a;
}

.currency-chip span {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #2a1a08;
  background: radial-gradient(circle at 32% 24%, #fff0a3, #f0bf57 46%, #a5632a);
  font-size: 10px;
  box-shadow: 0 0 18px rgba(240, 191, 87, 0.32);
}

button {
  border-color: rgba(125, 139, 146, 0.34);
  background:
    linear-gradient(180deg, rgba(45, 52, 55, 0.72), rgba(19, 23, 25, 0.82));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: rgba(240, 191, 87, 0.68);
  background:
    linear-gradient(180deg, rgba(58, 66, 69, 0.86), rgba(22, 27, 29, 0.94));
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.09);
}

button:not(:disabled):active {
  transform: translateY(0);
}

.profile-card,
.stat-board {
  position: relative;
  overflow: hidden;
  border-color: rgba(240, 191, 87, 0.28);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(36, 41, 42, 0.96), rgba(13, 16, 17, 0.9)),
    repeating-linear-gradient(135deg, rgba(240, 191, 87, 0.055) 0 1px, transparent 1px 15px);
}

.profile-card::before,
.stat-board::before,
.hud-right::before,
.base-panel::before,
.equipment-panel::before,
.settlement-panel::before,
.choice-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #f0bf57, #77b7d7 48%, transparent);
  opacity: 0.85;
  pointer-events: none;
}

.rank-mark {
  border-radius: 8px;
  color: #10100e;
  background:
    linear-gradient(145deg, #fff0a3, #f0bf57 42%, #9b5c2b),
    #f0bf57;
  box-shadow: 0 12px 30px rgba(240, 191, 87, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
}

.profile-line b,
.hud h2,
.choice-panel h2,
.settlement-panel h2,
.base-hero h1 {
  letter-spacing: 0;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.38);
}

.profile-line span {
  padding: 3px 8px;
  border: 1px solid rgba(104, 193, 141, 0.34);
  border-radius: 999px;
  color: #a8efc4;
  background: rgba(104, 193, 141, 0.1);
  font-size: 12px;
}

.panel-kicker {
  color: #f8d57a;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat-row {
  border-color: rgba(125, 139, 146, 0.18);
}

.stat-row b,
.power-readout b,
.resource-rail b,
.reward-preview b,
.character-level b {
  color: #f8d57a;
}

.bar {
  height: 9px;
  border-radius: 999px;
  border-color: rgba(125, 139, 146, 0.32);
  background: rgba(4, 6, 7, 0.78);
}

.bar span {
  border-radius: inherit;
  background:
    linear-gradient(90deg, #e15748, #f0bf57 62%, #fff0a3),
    #f0bf57;
  box-shadow: 0 0 16px rgba(240, 191, 87, 0.32);
}

.bar.exp span {
  background: linear-gradient(90deg, #4f9fc6, #77b7d7 58%, #b7e4f2);
  box-shadow: 0 0 16px rgba(119, 183, 215, 0.28);
}

.power-readout {
  border-radius: 8px;
  border: 1px solid rgba(240, 191, 87, 0.26);
  background:
    linear-gradient(135deg, rgba(240, 191, 87, 0.14), rgba(119, 183, 215, 0.08)),
    rgba(9, 11, 12, 0.42);
}

.weapon-traits span,
.objective-icon {
  border-radius: 6px;
  background:
    linear-gradient(180deg, rgba(240, 191, 87, 0.2), rgba(181, 101, 50, 0.14));
  border: 1px solid rgba(240, 191, 87, 0.28);
  color: #f8d57a;
}

.loadout-list li,
.inventory-preview button,
.resource-rail span,
.base-intel article,
.character-panel,
.character-stats article,
.reward-preview article,
.backpack-toolbar label,
.attachment-compare,
.attachment-identity div,
.affix-line,
.compare-title div,
.compare-lines div,
.post-battle-grid button,
.loot-card {
  border-radius: 8px;
  border-color: rgba(125, 139, 146, 0.22);
  background:
    linear-gradient(180deg, rgba(39, 45, 48, 0.68), rgba(14, 17, 18, 0.76));
}

.objective-strip {
  border-color: rgba(125, 139, 146, 0.28);
  background:
    linear-gradient(180deg, rgba(23, 29, 31, 0.88), rgba(9, 11, 12, 0.84));
}

.objective-strip div {
  border-color: rgba(125, 139, 146, 0.22);
}

.objective-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.skill-bar {
  gap: 6px;
  padding: 8px;
  border-color: rgba(125, 139, 146, 0.3);
  background: linear-gradient(180deg, rgba(22, 27, 29, 0.9), rgba(9, 11, 12, 0.88));
}

.skill-bar button,
.choice-panel button {
  border-width: 1px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(45, 52, 55, 0.74), rgba(14, 17, 18, 0.86));
}

.skill-bar img {
  border-radius: 8px;
  border-color: rgba(240, 191, 87, 0.3);
  background:
    radial-gradient(circle at 50% 35%, rgba(240, 191, 87, 0.18), transparent 58%),
    rgba(5, 7, 8, 0.74);
}

.inventory-preview button.selected,
.base-backpack-list button.selected,
.inventory-filter button.active,
.slot-filter button.active {
  border-color: rgba(240, 191, 87, 0.78);
  background:
    linear-gradient(180deg, rgba(240, 191, 87, 0.2), rgba(85, 53, 22, 0.18)),
    rgba(21, 24, 26, 0.88);
  box-shadow: inset 0 0 0 1px rgba(255, 236, 175, 0.08);
}

.base-panel {
  border-color: rgba(240, 191, 87, 0.24);
  background:
    linear-gradient(135deg, rgba(31, 37, 39, 0.96), rgba(13, 16, 17, 0.96)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 22px);
}

.base-actions .primary,
.settlement-actions .primary,
.attachment-actions button:first-child,
.loot-card-actions button,
.backpack-summary button {
  border-color: rgba(255, 224, 139, 0.64);
  color: #191006;
  background:
    linear-gradient(180deg, #ffe08b, #f0bf57 52%, #b66f45);
  box-shadow: 0 12px 28px rgba(240, 191, 87, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.36);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.22);
}

.stage-picker label,
.stage-picker button,
.inventory-filter button,
.slot-filter button,
.base-backpack-list button,
.attachment-actions button,
.settlement-actions button {
  border-radius: 6px;
}

.stage-picker input {
  color: #f8d57a;
}

.affix-line.main,
.reward-grid span {
  border-radius: 6px;
  background:
    linear-gradient(90deg, rgba(240, 191, 87, 0.18), rgba(240, 191, 87, 0.06));
}

.loot-card {
  background:
    linear-gradient(135deg, rgba(240, 191, 87, 0.18), rgba(119, 183, 215, 0.1) 48%, rgba(21, 24, 26, 0.88));
}

.new-tag,
.recommend-tag {
  border-radius: 999px;
}

.combat-banner {
  border-radius: 8px;
  color: #ffe08b;
  background:
    linear-gradient(90deg, transparent, rgba(12, 14, 15, 0.92) 14%, rgba(44, 31, 14, 0.94) 50%, rgba(12, 14, 15, 0.92) 86%, transparent);
  border-color: rgba(240, 191, 87, 0.38);
  text-shadow: 0 2px 18px rgba(240, 191, 87, 0.42);
}

.equipment-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 6;
  width: min(1060px, calc(100vw - 44px));
  max-height: calc(100vh - 44px);
  padding: 16px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  overflow: auto;
  border-color: rgba(240, 191, 87, 0.34);
  background:
    linear-gradient(135deg, rgba(25, 31, 33, 0.98), rgba(8, 10, 11, 0.99)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 22px);
  backdrop-filter: blur(8px);
  transform: translate(-50%, -50%);
}

.equipment-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.equipment-head h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1;
}

.equipment-power {
  min-width: 108px;
  padding: 5px 10px 5px 14px;
  display: grid;
  align-self: center;
  gap: 2px;
  text-align: right;
  border-left: 1px solid rgba(240, 191, 87, 0.42);
}

.equipment-power span {
  color: var(--muted);
  font-size: var(--font-caption);
}

.equipment-power b {
  color: #f8d57a;
  font-size: 20px;
  line-height: 1;
}

.equipment-head button {
  width: 42px;
  height: 42px;
  padding: 0;
  display: grid;
  place-items: center;
  color: var(--ink);
  font-size: 28px;
  line-height: 1;
}

.equipment-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(260px, 0.78fr) minmax(250px, 1fr);
  gap: 12px;
  align-items: stretch;
}

.equipment-slots {
  display: grid;
  grid-template-rows: repeat(4, minmax(86px, 1fr));
  gap: 10px;
}

.equipment-slot {
  min-width: 0;
  padding: 10px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(125, 139, 146, 0.24);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(39, 45, 48, 0.72), rgba(14, 17, 18, 0.82)),
    repeating-linear-gradient(135deg, rgba(240, 191, 87, 0.04) 0 1px, transparent 1px 18px);
}

.equipment-slot.empty {
  opacity: 0.76;
}

.equipment-icon {
  width: 72px;
  aspect-ratio: 1;
  border: 1px solid rgba(240, 191, 87, 0.26);
  border-radius: 8px;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.equipment-slot div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.equipment-slot small {
  color: #9fd0f0;
  font-size: 12px;
  font-weight: 900;
}

.equipment-slot b {
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 17px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-slot span:not(.equipment-icon) {
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-card {
  min-height: 520px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(240, 191, 87, 0.24);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 24%, rgba(119, 183, 215, 0.16), transparent 42%),
    linear-gradient(180deg, rgba(30, 35, 38, 0.86), rgba(8, 10, 11, 0.96));
}

.operator-card > :first-child {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.operator-loadout {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  z-index: 2;
  padding: 8px 10px;
  display: grid;
  gap: 4px;
  border: 1px solid rgba(240, 191, 87, 0.28);
  border-radius: 6px;
  background: rgba(10, 12, 13, 0.78);
  pointer-events: none;
}

.operator-loadout span {
  color: var(--muted);
  font-size: 12px;
}

.operator-loadout b {
  color: #f8d57a;
  font-size: 16px;
}

.settlement-panel {
  position: fixed;
  top: clamp(12px, 3vh, 26px);
  bottom: clamp(12px, 3vh, 26px);
  left: 50%;
  width: min(900px, calc(100vw - 40px));
  max-height: none;
  overflow: hidden;
  transform: translateX(-50%);
  grid-template-rows: auto auto auto auto minmax(0, 1fr) auto auto;
  gap: 8px;
  padding: 16px 18px;
}

.settlement-panel > .panel-kicker {
  margin-bottom: 0;
}

.settlement-panel h2 {
  margin-bottom: 2px;
  font-size: clamp(20px, 2.3vw, 28px);
}

.settlement-panel > p:not(.panel-kicker):not(.settlement-equip-notice) {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

.settlement-panel .reward-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.settlement-panel .reward-grid span {
  min-height: 34px;
  padding: 7px 10px;
  display: flex;
  align-items: center;
  font-weight: 900;
}

.settlement-panel .loot-card-grid {
  min-height: 0;
  overflow: auto;
  align-content: start;
  padding: 2px 6px 2px 0;
  scrollbar-color: rgba(240, 191, 87, 0.58) rgba(255, 255, 255, 0.06);
}

.settlement-panel .loot-card-grid::-webkit-scrollbar {
  width: 8px;
}

.settlement-panel .loot-card-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
}

.settlement-panel .loot-card-grid::-webkit-scrollbar-thumb {
  background: rgba(240, 191, 87, 0.58);
}

.settlement-panel .loot-card {
  min-height: 0;
  padding: 12px;
}

.settlement-panel .loot-card p {
  margin: 14px 0 2px;
  font-size: 12px;
}

.settlement-panel .loot-card h3 {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 1.1;
}

.settlement-panel .loot-card strong {
  display: block;
  font-size: 13px;
  line-height: 1.3;
}

.settlement-panel .equipped-now {
  margin-top: 8px;
  padding: 7px 9px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  border: 1px solid rgba(119, 183, 215, 0.28);
  border-radius: 6px;
  background:
    linear-gradient(90deg, rgba(119, 183, 215, 0.13), rgba(15, 18, 20, 0.56));
}

.settlement-panel .equipped-now span {
  color: #9fd0f0;
  font-size: 12px;
  font-weight: 900;
}

.settlement-panel .equipped-now b {
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settlement-panel .loot-compare {
  margin-top: 8px;
  padding-top: 8px;
}

.settlement-panel .decision-hint.compact {
  margin-bottom: 6px;
  padding: 7px 8px;
}

.settlement-panel .decision-hint.compact span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.settlement-panel .compare-title {
  gap: 6px;
}

.settlement-panel .compare-title div {
  padding: 7px 8px;
}

.settlement-panel .compare-lines {
  gap: 4px;
  margin: 6px 0 0;
}

.settlement-panel .compare-lines.compact div {
  min-height: 28px;
  padding: 5px 7px;
}

.settlement-panel .loot-card-actions {
  margin-top: 8px;
}

.settlement-panel .post-battle-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.settlement-panel .post-battle-grid button {
  min-height: 58px;
  padding: 9px 10px;
  gap: 3px;
}

.settlement-panel .settlement-actions {
  position: sticky;
  bottom: 0;
  align-items: center;
  margin-top: 0;
  padding-top: 8px;
  background: linear-gradient(180deg, transparent, rgba(13, 16, 17, 0.92) 28%);
}

@media (max-height: 760px) and (min-width: 901px) {
  .equipment-panel {
    width: min(980px, calc(100vw - 36px));
    max-height: calc(100vh - 28px);
    padding: 12px;
    gap: 8px;
  }

  .equipment-layout {
    grid-template-columns: minmax(240px, 1fr) minmax(220px, 0.72fr) minmax(240px, 1fr);
  }

  .equipment-slots {
    grid-template-rows: repeat(4, minmax(70px, 1fr));
    gap: 8px;
  }

  .equipment-slot {
    grid-template-columns: 58px minmax(0, 1fr);
    padding: 8px;
  }

  .equipment-icon {
    width: 58px;
  }

  .operator-card {
    min-height: 430px;
  }

  .settlement-panel {
    top: 10px;
    bottom: 10px;
    width: min(920px, calc(100vw - 48px));
    padding: 12px 14px;
    gap: 6px;
  }

  .settlement-panel .loot-card {
    padding: 10px;
  }

  .settlement-panel .compare-title,
  .settlement-panel .decision-hint.compact {
    display: none;
  }

  .settlement-panel .equipped-now {
    margin-top: 6px;
    padding: 6px 8px;
  }

  .settlement-panel .loot-card p {
    margin-top: 10px;
  }

  .settlement-panel .post-battle-grid button {
    min-height: 50px;
  }
}

@media (max-width: 1180px) and (min-width: 901px) {
  .equipment-dock {
    left: 14px;
    width: 300px;
    min-width: 0;
  }

  .mode-base .base-panel {
    right: 14px;
    width: calc(100vw - 342px);
  }
}

/* 基地固定为左右双工作区；角色装备区内部保持槽位 / 3D 角色 / 槽位。 */
@media (min-width: 1101px) {
  .mode-base .equipment-dock {
    left: 50%;
    right: auto;
    top: 50%;
    bottom: auto;
    width: min(720px, calc(50vw - 30px));
    height: min(760px, calc(100vh - 64px));
    min-width: 0;
    max-height: none;
    padding: 12px;
    transform: translate(calc(-100% - 8px), -50%);
    overflow: hidden;
  }

  .mode-base .base-panel {
    left: 50%;
    right: auto;
    top: 50%;
    bottom: auto;
    width: min(820px, calc(50vw - 30px));
    height: min(760px, calc(100vh - 64px));
    max-height: none;
    transform: translate(8px, -50%);
  }

  .equipment-dock .equipment-layout {
    grid-template-columns: minmax(150px, 0.86fr) minmax(220px, 1.28fr) minmax(150px, 0.86fr);
    gap: 8px;
    overflow: hidden;
    padding-right: 0;
  }

  .equipment-dock .equipment-slots {
    grid-template-rows: repeat(4, minmax(0, 1fr));
    gap: 8px;
    min-height: 0;
  }

  .equipment-dock .equipment-slot {
    min-height: 0;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 7px;
    padding: 7px;
  }

  .equipment-dock .equipment-icon {
    width: 48px;
  }

  .equipment-dock .operator-card {
    order: 0;
    min-height: 0;
  }
}

@media (min-width: 1101px) and (max-width: 1500px) {
  .equipment-dock .equipment-layout {
    grid-template-columns: minmax(116px, 0.78fr) minmax(190px, 1.2fr) minmax(116px, 0.78fr);
  }

  .equipment-dock .equipment-slot {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 6px;
  }

  .equipment-dock .equipment-icon {
    width: 40px;
  }

  .equipment-dock .equipment-slot span:not(.equipment-icon) {
    display: none;
  }
}

@media (max-width: 1100px) {
  .mode-base .equipment-dock,
  .mode-base .base-panel {
    left: 12px;
    right: 12px;
    width: auto;
    transform: none;
  }

  .mode-base .equipment-dock {
    top: 12px;
    bottom: auto;
    height: min(58vh, 610px);
  }

  .mode-base .base-panel {
    top: calc(min(58vh, 610px) + 24px);
    bottom: 12px;
  }

  .equipment-dock .equipment-layout {
    grid-template-columns: minmax(150px, 0.9fr) minmax(220px, 1.2fr) minmax(150px, 0.9fr);
    overflow: hidden;
  }

  .equipment-dock .operator-card {
    order: 0;
    min-height: 0;
  }

  .equipment-dock .equipment-slots {
    grid-template-rows: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .equipment-panel {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    padding: 12px;
  }

  .equipment-layout {
    grid-template-columns: 1fr;
  }

  .mode-base .equipment-dock {
    left: 8px;
    right: 8px;
    top: 8px;
    width: auto;
    height: min(62vh, 520px);
    max-height: none;
    padding: 9px;
  }

  .mode-base .base-panel {
    left: 8px;
    right: 8px;
    top: calc(min(62vh, 520px) + 16px);
    bottom: 8px;
    width: auto;
    max-height: none;
  }

  .equipment-dock .equipment-head h2 {
    font-size: 20px;
  }

  .equipment-dock .equipment-layout {
    grid-template-columns: minmax(92px, 0.72fr) minmax(170px, 1.15fr) minmax(92px, 0.72fr);
    gap: 5px;
    overflow: hidden;
  }

  .equipment-dock .equipment-slots {
    grid-template-rows: repeat(4, minmax(0, 1fr));
    gap: 5px;
  }

  .equipment-dock .equipment-slot {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 4px;
    padding: 4px;
  }

  .equipment-dock .equipment-icon {
    width: 32px;
  }

  .equipment-dock .equipment-slot b {
    font-size: 11px;
  }

  .equipment-dock .equipment-slot span:not(.equipment-icon) {
    display: none;
  }

  .equipment-slots {
    grid-template-rows: none;
  }

  .operator-card {
    min-height: 0;
    order: 0;
  }

  .settlement-panel {
    top: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
    padding: 12px;
  }

  .settlement-panel .reward-grid,
  .settlement-panel .loot-card-grid,
  .settlement-panel .post-battle-grid {
    grid-template-columns: 1fr;
  }

  .base-backpack-layout .base-backpack-list {
    grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
  }

  .inventory-item-tooltip {
    width: min(220px, calc(100vw - 44px));
    left: 0;
    top: calc(100% + 8px);
    transform: translateY(-6px);
  }

  .inventory-item-tooltip::after {
    right: auto;
    left: 26px;
    top: auto;
    bottom: 100%;
    border-left: 1px solid rgba(240, 191, 87, 0.46);
    border-top: 1px solid rgba(240, 191, 87, 0.46);
    border-bottom: 0;
    transform: translateY(5px) rotate(45deg);
  }

  .inventory-icon-shell:hover .inventory-item-tooltip,
  .inventory-icon-shell:focus-within .inventory-item-tooltip {
    transform: translateY(0);
  }

  .inventory-tooltip-names,
  .inventory-tooltip-actions {
    grid-template-columns: 1fr;
  }
}

/* 基地界面统一可读字号，避免旧的 10–11px 局部样式继续生效。 */
@media (min-width: 901px) {
  .mode-base .base-panel,
  .mode-base .equipment-panel {
    font-size: var(--font-body);
    line-height: 1.45;
  }

  .mode-base button,
  .mode-base select,
  .mode-base input {
    font-size: var(--font-control);
  }

  .mode-base .panel-kicker,
  .mode-base small,
  .resource-rail small,
  .base-intel span,
  .character-level > span,
  .character-stats span,
  .reward-preview span,
  .backpack-toolbar label span,
  .slot-filter span,
  .equipment-slot small,
  .inventory-item-level,
  .inventory-item-slot {
    font-size: var(--font-caption);
  }

  .base-hero > p,
  .base-intel small,
  .character-level small,
  .equipment-slot span:not(.equipment-icon) {
    font-size: 13px;
  }

  .resource-rail,
  .stage-picker,
  .reward-preview,
  .inventory-filter,
  .slot-filter {
    font-size: var(--font-control);
  }

  .resource-rail b,
  .base-intel b,
  .character-stats b,
  .reward-preview b {
    font-size: var(--font-value);
  }

  .equipment-dock .equipment-slot b {
    font-size: 15px;
  }

  .equipment-dock .equipment-slot span:not(.equipment-icon) {
    font-size: var(--font-caption);
  }

  .operator-loadout span {
    font-size: var(--font-caption);
  }

  .operator-loadout b {
    font-size: 17px;
  }

  .base-backpack-head h3 {
    font-size: 17px;
  }

  .inventory-tooltip-head b {
    font-size: 15px;
  }

  .inventory-item-tooltip small,
  .inventory-tooltip-names span,
  .inventory-tooltip-compare span,
  .inventory-tooltip-actions button {
    font-size: var(--font-caption);
  }

  .inventory-item-tooltip em,
  .inventory-tooltip-names b,
  .inventory-tooltip-compare b {
    font-size: 13px;
  }

  .inventory-tooltip-compare > div {
    min-height: 32px;
    padding: 6px 8px;
  }
}

/* 战斗节奏与战报：军用指挥条保持低占位，高威胁信息只在需要时出现。 */
.combat-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 7px;
}

.combat-metrics span {
  min-width: 0;
  padding: 8px 9px;
  display: grid;
  gap: 2px;
  border: 1px solid rgba(125, 139, 146, 0.22);
  background: rgba(6, 8, 9, 0.56);
}

.combat-metrics small {
  color: #9ca8a9;
  font-size: 10px;
}

.combat-metrics b {
  color: #e9e2d2;
  font-size: 16px;
}

.wave-command {
  position: fixed;
  left: 50%;
  top: 122px;
  z-index: 4;
  width: min(520px, calc(100vw - 650px));
  min-width: 360px;
  padding: 9px 14px 10px;
  transform: translateX(-50%);
  color: #ebe5d9;
  border: 1px solid rgba(229, 184, 75, 0.32);
  background: linear-gradient(90deg, rgba(11, 14, 15, 0.94), rgba(42, 44, 40, 0.9), rgba(11, 14, 15, 0.94));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px rgba(255, 246, 214, 0.08);
  clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%, 0 12px);
}

.wave-command__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.wave-command__title span {
  color: #f5cd69;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.wave-command__title b {
  font-size: 13px;
}

.wave-command > small {
  display: block;
  margin-top: 6px;
  color: #9ba5a5;
  font-size: 10px;
  text-align: center;
}

.wave-ticks {
  margin-top: 7px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.wave-ticks i {
  height: 4px;
  background: rgba(125, 139, 146, 0.22);
  transform: skewX(-18deg);
  transition: background 220ms ease, transform 220ms ease;
}

.wave-ticks i.cleared {
  background: #6e9b71;
}

.wave-ticks i.active {
  background: #f0bf57;
  transform: skewX(-18deg) scaleY(1.7);
  box-shadow: 0 0 12px rgba(240, 191, 87, 0.38);
}

.boss-hud {
  position: fixed;
  left: 50%;
  top: 194px;
  z-index: 4;
  width: min(480px, calc(100vw - 680px));
  min-width: 350px;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px 12px;
  color: #f1e8d5;
  text-align: center;
  animation: boss-enter 420ms cubic-bezier(.16, 1, .3, 1) both;
}

.boss-hud > span,
.boss-hud > small {
  color: #d78a72;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.boss-hud > b {
  font-size: 16px;
  letter-spacing: 0.08em;
}

.boss-hud > div {
  grid-column: 1 / -1;
  height: 8px;
  overflow: hidden;
  border: 1px solid rgba(224, 91, 65, 0.45);
  background: rgba(20, 6, 5, 0.8);
}

.boss-hud > div i {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, #8d241d, #df5a43 72%, #f5a26e);
  transition: transform 120ms linear;
}

.damage-direction {
  position: fixed;
  left: calc(50% - 18px);
  top: calc(50% - 132px);
  z-index: 6;
  width: 36px;
  height: 28px;
  transform-origin: 18px 132px;
  color: #f25a43;
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  filter: drop-shadow(0 0 7px rgba(242, 90, 67, 0.78));
  pointer-events: none;
  animation: hurt-direction 650ms ease-out both;
}

.kill-notice {
  position: fixed;
  right: 30px;
  top: 286px;
  z-index: 5;
  padding: 7px 13px 7px 24px;
  color: #e9e2d2;
  border-bottom: 1px solid rgba(229, 184, 75, 0.52);
  background: linear-gradient(90deg, transparent, rgba(13, 16, 17, 0.88) 20%);
  font-size: 13px;
  font-weight: 800;
  animation: kill-confirm 720ms cubic-bezier(.16, 1, .3, 1) both;
}

.combat-banner.tone-elite {
  color: #ffb094;
  border-color: rgba(221, 80, 55, 0.64);
  background: linear-gradient(90deg, transparent, rgba(54, 14, 11, 0.94) 18%, rgba(101, 34, 23, 0.96) 50%, rgba(54, 14, 11, 0.94) 82%, transparent);
  text-shadow: 0 2px 20px rgba(221, 80, 55, 0.65);
}

.combat-banner.tone-victory {
  color: #d9efbd;
  border-color: rgba(116, 166, 105, 0.58);
  background: linear-gradient(90deg, transparent, rgba(14, 39, 24, 0.94) 18%, rgba(37, 74, 45, 0.96) 50%, rgba(14, 39, 24, 0.94) 82%, transparent);
}

.run-report {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 7px;
}

.run-report article {
  min-height: 56px;
  padding: 9px 11px;
  display: grid;
  align-content: center;
  gap: 3px;
  border: 1px solid rgba(125, 139, 146, 0.22);
  background: linear-gradient(160deg, rgba(43, 49, 51, 0.72), rgba(10, 12, 13, 0.72));
}

.run-report span {
  color: #9ba5a5;
  font-size: 10px;
}

.run-report b {
  color: #f4d47c;
  font-size: 17px;
}

.wave-run-report {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.wave-run-report article {
  min-width: 0;
  padding: 8px 9px;
  display: grid;
  gap: 3px;
  border-top: 2px solid rgba(240, 191, 87, 0.58);
  background: rgba(9, 12, 13, 0.7);
}

.wave-run-report span,
.wave-run-report small {
  overflow: hidden;
  color: #9ba5a5;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wave-run-report b {
  color: #e9e2d2;
  font-size: 15px;
}

.strategy-report {
  padding: 10px 12px;
  border: 1px solid rgba(119, 183, 215, 0.28);
  background: linear-gradient(110deg, rgba(13, 24, 29, 0.92), rgba(13, 16, 17, 0.76));
}

.strategy-report__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.strategy-report__head h3 {
  margin: 2px 0 0;
  color: #edf0e8;
  font-size: 16px;
}

.strategy-report__head > span {
  color: #7da7b9;
  font-size: 10px;
}

.strategy-report__grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.strategy-report__grid article {
  position: relative;
  min-width: 0;
  padding: 8px 9px;
  display: grid;
  gap: 3px;
  border-left: 2px solid #77b7d7;
  background: rgba(5, 9, 11, 0.62);
}

.strategy-report__grid article.muted {
  border-left-color: #8b6659;
  opacity: 0.72;
}

.strategy-report__grid span,
.strategy-report__grid small {
  color: #94a8ad;
  font-size: 10px;
}

.strategy-report__grid b {
  color: #d9e9ed;
  font-size: 13px;
}

.strategy-report__grid em {
  color: #e29b7f;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

.mode-settlement .settlement-panel {
  animation: settlement-debrief 480ms cubic-bezier(.16, 1, .3, 1) both;
}

@keyframes hurt-direction {
  0% { opacity: 0; scale: 0.7; }
  18% { opacity: 1; scale: 1.08; }
  100% { opacity: 0; scale: 1; }
}

@keyframes kill-confirm {
  0% { opacity: 0; transform: translateX(24px); }
  20%, 78% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-8px); }
}

@keyframes boss-enter {
  from { opacity: 0; transform: translate(-50%, -12px) scaleX(0.86); }
  to { opacity: 1; transform: translate(-50%, 0) scaleX(1); }
}

@keyframes settlement-debrief {
  from { opacity: 0; transform: translateX(-50%) translateY(18px) scale(0.985); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@media (max-width: 1180px) {
  .wave-command {
    width: min(430px, calc(100vw - 530px));
    min-width: 320px;
  }

  .boss-hud {
    min-width: 310px;
  }

  .run-report {
    grid-template-columns: repeat(3, 1fr);
  }

  .wave-run-report,
  .strategy-report__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .wave-command {
    top: 112px;
    width: min(430px, calc(100vw - 32px));
    min-width: 0;
  }

  .boss-hud {
    top: 184px;
    width: min(430px, calc(100vw - 32px));
    min-width: 0;
  }

  .run-report {
    grid-template-columns: repeat(2, 1fr);
  }

  .wave-run-report,
  .strategy-report__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .wave-command,
  .boss-hud,
  .damage-direction,
  .kill-notice {
    position: absolute;
  }

  .wave-command {
    top: 68px;
  }

  .boss-hud {
    top: 138px;
  }

  .combat-metrics {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave-ticks i,
  .boss-hud > div i {
    transition: none;
  }

  .damage-direction,
  .kill-notice,
  .boss-hud,
  .mode-settlement .settlement-panel {
    animation-duration: 1ms;
  }
}

/* 2026-07-15 R1/R2：可信状态、键盘提示与基地任务优先布局。 */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #ffe08b;
  outline-offset: 2px;
}

.skill-bar button {
  grid-template-columns: 24px 48px minmax(0, 1fr);
}

.skill-bar kbd,
.choice-panel kbd {
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  border: 1px solid rgba(255, 224, 139, 0.55);
  border-radius: 5px;
  color: #ffe08b;
  background: rgba(5, 7, 8, 0.72);
  font: 900 12px/1 inherit;
}

.choice-panel > div button {
  position: relative;
  min-height: 164px;
  padding: 14px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  grid-template-areas:
    "key tag"
    "title title"
    "desc desc"
    "compare compare";
  gap: 7px 9px;
  align-content: start;
}

.choice-panel button kbd { grid-area: key; }
.choice-panel button > small {
  grid-area: tag;
  align-self: center;
  color: #9fd0f0;
  font-size: 12px;
  font-weight: 900;
  text-align: right;
}
.choice-panel button > b { grid-area: title; font-size: 18px; }
.choice-panel button > span { grid-area: desc; color: #b9c0bd; font-size: 13px; line-height: 1.4; }
.choice-panel button > strong {
  grid-area: compare;
  margin-top: auto;
  padding-top: 8px;
  color: #f8d57a;
  border-top: 1px solid rgba(240, 191, 87, 0.2);
  font-size: 13px;
}

.debug-stage-note {
  grid-column: 1 / -1;
  margin: -2px 0 0;
  color: #e5ad83;
  font-size: 12px;
  font-weight: 800;
}

.backpack-summary .warning {
  color: #ffb094;
}

.overflow-salvage-notice {
  padding: 9px 11px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 14px;
  border: 1px solid rgba(226, 155, 127, 0.42);
  background: rgba(72, 32, 22, 0.38);
}

.overflow-salvage-notice b,
.overflow-salvage-notice span { min-width: 0; }
.overflow-salvage-notice span {
  grid-column: 1;
  overflow: hidden;
  color: #cbbeb5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overflow-salvage-notice strong {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: #f8d57a;
}

.mode-base .base-panel {
  overflow-x: hidden;
}

.base-hero {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.base-hero h1 {
  max-width: none;
  font-size: clamp(24px, 2.4vw, 34px);
}

.base-actions {
  position: sticky;
  bottom: -1px;
  z-index: 3;
  padding: 8px 0;
  background: linear-gradient(180deg, transparent, rgba(13, 16, 17, 0.96) 26%);
}

.base-actions .primary {
  min-height: 48px;
}

@media (max-width: 720px) {
  .mode-base {
    display: block;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .mode-base .battlefield {
    position: fixed;
    inset: 0;
  }

  .mode-base .base-panel,
  .mode-base .equipment-dock {
    position: relative;
    inset: auto;
    width: calc(100% - 16px);
    height: auto;
    max-height: none;
    margin: 8px;
    transform: none;
  }

  .mode-base .base-panel {
    z-index: 7;
    overflow: visible;
  }

  .mode-base .equipment-dock {
    min-width: 0;
    overflow: visible;
  }

  .base-hero {
    grid-template-columns: 1fr;
  }

  .base-hero .panel-kicker,
  .base-hero h1,
  .base-hero > p,
  .resource-rail,
  .base-intel,
  .stage-picker,
  .debug-stage-note,
  .reward-preview,
  .base-actions,
  .character-panel {
    grid-column: 1;
    grid-row: auto;
  }

  .base-actions {
    bottom: env(safe-area-inset-bottom);
  }

  .equipment-dock .operator-card {
    min-height: 280px;
  }

  .choice-panel > div {
    grid-template-columns: 1fr;
  }

  .choice-panel > div button {
    min-height: 116px;
  }

  .overflow-salvage-notice {
    grid-template-columns: 1fr;
  }

  .overflow-salvage-notice strong {
    grid-column: 1;
    grid-row: auto;
  }
}
</style>
