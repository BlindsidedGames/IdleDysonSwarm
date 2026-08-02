import type {
  StatisticsWindowState,
} from '../../../game-state/types'

export interface StatisticsWindowAggregate {
  readonly simulatedSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: bigint
  readonly dreamResetCount: bigint
  readonly strangeMatter: bigint
  readonly realityWorkers: bigint
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
      strangeMatter: total.strangeMatter + window.strangeMatter,
      realityWorkers:
        total.realityWorkers + window.realityWorkers,
    }),
    {
      simulatedSeconds: 0,
      infinityCount: 0n,
      infinityPoints: 0n,
      dreamResetCount: 0n,
      strangeMatter: 0n,
      realityWorkers: 0n,
    },
  )
}
