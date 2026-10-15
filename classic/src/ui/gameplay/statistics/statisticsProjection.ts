import type {
  InfinityCycleHistoryEntry,
  StatisticsWindowState,
} from '../../../game-state/types'
import { addContinuous } from '../../../simulation/numeric'

export interface StatisticsWindowAggregate {
  readonly simulatedSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: bigint
  readonly dreamResetCount: bigint
  readonly strangeMatter: number
  readonly realityWorkers: bigint
}

export interface InfinityRunRate {
  readonly cycle: Readonly<InfinityCycleHistoryEntry>
  readonly ipPerMinute: number
}

export interface InfinityTargetPerformance {
  readonly runs: readonly InfinityRunRate[]
  readonly averageIpPerMinute: number
  readonly medianIpPerMinute: number
  readonly minimumIpPerMinute: number
  readonly maximumIpPerMinute: number
  readonly latestReward: bigint
}

export function infinityRunIpPerMinute(
  cycle: Readonly<InfinityCycleHistoryEntry>,
): number {
  const rate = Number(cycle.reward) * 60 / cycle.durationSeconds
  return Number.isFinite(rate) ? Math.max(0, rate) : Number.MAX_VALUE
}

/**
 * Summarises automatic Break Infinity runs made at the currently configured
 * target. The average is time-weighted so a collection of runs represents the
 * actual points earned over the actual time spent, rather than allowing one
 * unusually short run to dominate an average of rates.
 */
export function projectInfinityTargetPerformance(
  history: readonly Readonly<InfinityCycleHistoryEntry>[],
  configuredTarget: bigint,
): InfinityTargetPerformance | null {
  const matchingCycles = history.filter(
    (cycle) =>
      cycle.breakInfinity &&
      cycle.automatic &&
      cycle.configuredTarget === configuredTarget,
  )
  if (matchingCycles.length === 0) return null

  const runs = matchingCycles.map((cycle) => ({
    cycle,
    ipPerMinute: infinityRunIpPerMinute(cycle),
  }))
  const totalDuration = matchingCycles.reduce(
    (total, cycle) => total + cycle.durationSeconds,
    0,
  )
  const totalReward = matchingCycles.reduce(
    (total, cycle) => total + cycle.reward,
    0n,
  )
  const average = Number(totalReward) * 60 / totalDuration
  const sortedRates = runs
    .map((run) => run.ipPerMinute)
    .sort((left, right) => left - right)
  const middle = Math.floor(sortedRates.length / 2)
  const median = sortedRates.length % 2 === 0
    ? (sortedRates[middle - 1] + sortedRates[middle]) / 2
    : sortedRates[middle]

  return {
    runs,
    averageIpPerMinute: Number.isFinite(average)
      ? Math.max(0, average)
      : Number.MAX_VALUE,
    medianIpPerMinute: median,
    minimumIpPerMinute: sortedRates[0],
    maximumIpPerMinute: sortedRates[sortedRates.length - 1],
    latestReward: matchingCycles[0].reward,
  }
}

/**
 * Folds one canonical ring-buffer horizon into a presentation-only total.
 * Sequence values are deliberately ignored: stale slots are reset to zero by
 * the canonical recorder before reuse, so every retained bucket contributes.
 */
export function aggregateStatisticsWindows(
  windows: readonly Readonly<StatisticsWindowState>[],
): StatisticsWindowAggregate {
  return windows.reduce<StatisticsWindowAggregate>(
    (total, window) => ({
      simulatedSeconds:
        total.simulatedSeconds + window.simulatedSeconds,
      infinityCount: total.infinityCount + window.infinityCount,
      infinityPoints:
        total.infinityPoints + window.infinityPoints,
      dreamResetCount:
        total.dreamResetCount + window.dreamResetCount,
      strangeMatter: addContinuous(total.strangeMatter, window.strangeMatter),
      realityWorkers:
        total.realityWorkers + window.realityWorkers,
    }),
    {
      simulatedSeconds: 0,
      infinityCount: 0n,
      infinityPoints: 0n,
      dreamResetCount: 0n,
      strangeMatter: 0,
      realityWorkers: 0n,
    },
  )
}
