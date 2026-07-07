import { defineStore } from 'pinia'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    stage: 1,
    gold: 0,
    level: 1,
    exp: 0,
    talentPoints: 0
  }),
  actions: {
    applyReward(gold: number, exp: number) {
      this.gold += gold
      this.exp += exp
      while (this.exp >= this.level * 100) {
        this.exp -= this.level * 100
        this.level += 1
        this.talentPoints += 1
      }
    }
  }
})
