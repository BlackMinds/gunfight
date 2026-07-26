import { describe, expect, it } from 'vitest'
import { applyWeaponProgress, attachmentPool, emptyWeaponProgress, equipmentSetKeys, normalizeWeaponProgress, weaponCatalog, weaponElements, weaponHitCanChain, weaponRequiresCharge } from '../../shared/game/weapons'

describe('完整武器与装备目录', () => {
  it('包含策划定义的十二类武器和七种伤害类型', () => {
    expect(weaponCatalog).toHaveLength(12)
    expect(new Set(weaponCatalog.map((weapon) => weapon.category)).size).toBe(12)
    expect(new Set(weaponCatalog.map((weapon) => weapon.element))).toEqual(new Set(weaponElements))
  })

  it('每种武器都有弹匣、换弹、固定特性、槽位和成长上限', () => {
    for (const weapon of weaponCatalog) {
      expect(weapon.magazineSize).toBeGreaterThan(0)
      expect(weapon.reloadTime).toBeGreaterThan(0)
      expect(weapon.fixedTrait.length).toBeGreaterThan(4)
      expect(weapon.slotCount).toBeGreaterThanOrEqual(4)
      expect(weapon.maxLevel).toBe(120)
      expect(weapon.maxStars).toBe(5)
    }
  })

  it('武器升级和升星会实际提高基础伤害', () => {
    const progress = emptyWeaponProgress()[weaponCatalog[0].key]
    const base = applyWeaponProgress(weaponCatalog[0], progress)
    const upgraded = applyWeaponProgress(weaponCatalog[0], { level: 20, stars: 3 })
    expect(upgraded.damage).toBeGreaterThan(base.damage)
  })

  it('暴击伤害词条与武器核心通过武器进度持久化', () => {
    const progress = normalizeWeaponProgress({ pistol: { level: 2, stars: 1, cores: 4, affixes: [{ key: 'crit-damage', label: '旧标签会被规范化', value: 0.2 }] } }).pistol
    expect(progress.cores).toBe(4)
    expect(progress.affixes[0]).toEqual({ key: 'crit-damage', label: '暴伤放大', value: 0.2 })
    expect(applyWeaponProgress(weaponCatalog[0], progress).critDamage).toBeCloseTo(weaponCatalog[0].critDamage + 0.2)
  })

  it('固定武器特性具备可执行的战斗判定', () => {
    const assault = weaponCatalog.find((weapon) => weapon.key === 'assault-rifle')!
    const storm = weaponCatalog.find((weapon) => weapon.key === 'storm-smg')!
    const pistol = weaponCatalog.find((weapon) => weapon.key === 'pistol')!
    const plasma = weaponCatalog.find((weapon) => weapon.key === 'plasma-cannon')!

    expect(assault.fixedTrait).toContain('1 次穿透')
    expect(weaponHitCanChain(storm, 0)).toBe(false)
    expect(weaponHitCanChain(storm, 0.5)).toBe(true)
    expect(weaponRequiresCharge(plasma)).toBe(true)
    expect(weaponRequiresCharge(pistol)).toBe(false)
  })

  it('六套装备都至少提供四个不同槽位的可掉落部件', () => {
    for (const setKey of equipmentSetKeys) expect(new Set(attachmentPool.filter((item) => item.setKey === setKey).map((item) => item.slot)).size).toBeGreaterThanOrEqual(4)
  })

  it('特殊装备都有机制键和玩家可见说明，并覆盖目录标志性机制', () => {
    const specialItems = attachmentPool.filter((item) => item.specialEffect)
    expect(specialItems.length).toBeGreaterThanOrEqual(30)
    expect(specialItems.every((item) => Boolean(item.specialEffectKey))).toBe(true)
    const mechanismKeys = new Set(specialItems.map((item) => item.specialEffectKey))
    for (const key of ['split-shot', 'ricochet', 'periodic-shield', 'crit-explosion', 'chain-hit', 'support-drone', 'high-health-overload', 'time-field']) expect(mechanismKeys.has(key as never)).toBe(true)
  })

  it('远期策划中的 84 件命名配件全部进入实际掉落池且名称不重复', () => {
    const plannedNames = [
      '简易补偿器', '制退器', '消音枪口', '扩散喷口', '聚束枪口', '冲击制退器', '裂甲枪口', '猎头枪口', '风暴枪口', '归零枪口',
      '标准弹匣', '扩容弹匣', '快速弹匣', '轻量弹匣', '双排弹匣', '战术弹匣', '回流弹匣', '超载弹匣', '无尽弹鼓', '量子弹匣',
      '机械瞄具', '红点瞄具', '全息瞄具', '二倍镜', '战术扫描镜', '狙击镜', '热成像瞄具', '弱点分析镜', '多目标锁定镜', '预判核心镜',
      '短枪管', '标准枪管', '长枪管', '加重枪管', '螺旋膛线枪管', '穿甲枪管', '高压枪管', '分裂枪管', '轨道枪管', '星陨枪管',
      '木质枪托', '轻型枪托', '稳定枪托', '折叠枪托', '战术枪托', '缓冲枪托', '反冲枪托', '游击枪托', '堡垒枪托', '相位枪托',
      '普通弹芯', '穿甲弹芯', '空尖弹芯', '燃烧弹芯', '毒蚀弹芯', '冰霜弹芯', '电磁弹芯', '爆裂弹芯', '裂变弹芯', '虚空弹芯',
      '生命模块', '分裂模块', '反弹模块', '护盾模块', '爆破模块', '连锁模块', '无人机模块', '过载模块', '时滞模块', '死线模块', '黑洞模块',
      '训练芯片', '悬赏芯片', '幸运芯片', '后勤芯片', '猎首芯片', '精英猎手芯片', '弱点芯片', '弹道芯片', '元素增幅芯片', '财阀芯片', '战术 AI 芯片', '进化芯片', '终局芯片'
    ]
    const poolNames = attachmentPool.map((item) => item.name)
    expect(plannedNames).toHaveLength(84)
    expect(poolNames).toEqual(expect.arrayContaining(plannedNames))
    expect(new Set(poolNames).size).toBe(poolNames.length)
  })
})
