import { liveOpsSnapshot } from '../../shared/game/live-ops'

export default defineEventHandler(() => ({ serverNow: new Date().toISOString(), ...liveOpsSnapshot() }))
