import type { FrontendCanonicalProgression, FrontendCanonicalResources } from '../../application/frontendSnapshot'
import type { FarmingState } from '../../game-state/types'
import { farmingManualGate } from '../../simulation/farming'
import { multiplyContinuous } from '../../simulation/numeric'
import { planOfflineBoost } from '../../simulation/offlineBoost'

/** Expected speed of the next active publication, including only funded Stored Time. */
export function activeGameSpeed(
  time: FrontendCanonicalResources['time'],
  timeline: FrontendCanonicalProgression['timeline'],
  farming?: Readonly<FarmingState>,
): number {
  if(farming&&(farming.phase==='complete'||farmingManualGate(farming)))return timeline?.doubleTime.unlocked?2:1
  const intervalSeconds = (timeline?.processing.activeIntervalMilliseconds ?? 100) / 1000
  const boost = planOfflineBoost(time, intervalSeconds)
  return (timeline?.doubleTime.unlocked ? 2 : 1) * boost.multiplier
}

/** Convert simulation rates and waits before choosing notation or cadence wording. */
export function realTimeRate(perGameSecond: number, gameSpeed: number): number {
  return perGameSecond < 0
    ? -multiplyContinuous(-perGameSecond, gameSpeed)
    : multiplyContinuous(perGameSecond, gameSpeed)
}

export function realTimeDuration(gameSeconds: number, gameSpeed: number): number {
  return gameSeconds / gameSpeed
}
