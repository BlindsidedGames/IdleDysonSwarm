import type { FrontendCanonicalProgression, FrontendCanonicalResources } from '../../application/frontendSnapshot'
import { multiplyContinuous } from '../../simulation/numeric'
import { planOfflineBoost } from '../../simulation/offlineBoost'

/** Expected speed of the next active publication, including only funded Stored Time. */
export function activeGameSpeed(
  time: FrontendCanonicalResources['time'],
  timeline: FrontendCanonicalProgression['timeline'],
): number {
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
