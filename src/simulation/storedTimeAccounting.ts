import { addContinuous, clampContinuous } from './numeric'

export interface StoredTimeInfinityUsage {
  readonly currentCycleSeconds: number
  readonly previousCycleSeconds: number
}

/**
 * Mirrors Unity InfinityStoredTimeAccounting.AdvanceWithoutReset.
 */
export function recordStoredTimeWithoutInfinityReset(
  currentCycleSeconds: number,
  previousCycleSeconds: number,
  consumedSeconds: number,
): StoredTimeInfinityUsage {
  return Object.freeze({
    currentCycleSeconds: addContinuous(
      clampContinuous(currentCycleSeconds),
      clampContinuous(consumedSeconds),
    ),
    previousCycleSeconds: clampContinuous(previousCycleSeconds),
  })
}

/**
 * Mirrors Unity InfinityStoredTimeAccounting.CompleteAggregate.
 *
 * One completed cycle reports all time consumed since the prior reset,
 * including any stored-time use already accumulated in the current cycle.
 * Multiple completed cycles report the final completed cycle duration.
 */
export function completeStoredTimeInfinityAggregate(
  currentCycleSeconds: number,
  previousCycleSeconds: number,
  consumedSeconds: number,
  completedCycles: bigint,
  lastCycleSeconds: number,
): StoredTimeInfinityUsage {
  if (completedCycles <= 0n) {
    return recordStoredTimeWithoutInfinityReset(
      currentCycleSeconds,
      previousCycleSeconds,
      consumedSeconds,
    )
  }
  return Object.freeze({
    currentCycleSeconds: 0,
    previousCycleSeconds:
      completedCycles === 1n
        ? addContinuous(
            clampContinuous(currentCycleSeconds),
            clampContinuous(consumedSeconds),
          )
        : clampContinuous(lastCycleSeconds),
  })
}
