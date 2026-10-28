export const INFINITY_TIME_BONUS_MAX_LEVEL = 4

export function quantumTimeBonusCost(level: number): bigint {
  return 1_000n * 10n ** BigInt(level)
}

export function infinityTimeBonusHalfSeconds(level: number): number {
  return level > 0 ? 60 * 2 ** (level - 1) : 0
}

export function infinityTimeBonusMaximum(level: number): number {
  return level > 0 ? 1 + 20 * 4 ** (level - 1) : 1
}

/** One smooth bonus per run, measured on the same 1x clock as timed resets. */
export function infinityTimeBonusMultiplier(level: number, seconds: number): number {
  if (level <= 0) return 1
  const ratio = Math.max(0, seconds) / infinityTimeBonusHalfSeconds(level)
  const fraction = ratio > 1
    ? 1 / (1 + (1 / ratio) ** 2)
    : ratio ** 2 / (1 + ratio ** 2)
  return 1 + (infinityTimeBonusMaximum(level) - 1) * fraction
}

export interface InfinityTimeBonusProgress {
  readonly multiplier: number
  readonly nextSeconds: number | null
  readonly nextMultiplier: number | null
}

export function projectInfinityTimeBonus(level: number, seconds: number): InfinityTimeBonusProgress {
  const half = infinityTimeBonusHalfSeconds(level)
  const next = level > 0
    ? [...new Set([half / 2, half, half * 2, half * 5, 3600])]
      .sort((a, b) => a - b).find(value => value > seconds)
    : undefined
  return {
    multiplier: infinityTimeBonusMultiplier(level, seconds),
    nextSeconds: next ?? null,
    nextMultiplier: next === undefined ? null : infinityTimeBonusMultiplier(level, next),
  }
}
