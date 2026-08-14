import { addGameDecimals } from '../../../math/gameDecimal'
import { presentationDecimal, type PresentationNumeric } from '../../presentationNumeric'

export interface StatisticsWindowAggregate {
  readonly simulatedSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: PresentationNumeric
  readonly dreamResetCount: bigint
  readonly strangeMatter: PresentationNumeric
  readonly realityWorkers: PresentationNumeric
}

/**
 * Folds one canonical ring-buffer horizon into a presentation-only total.
 * Sequence values are deliberately ignored: stale slots are reset to zero by
 * the canonical recorder before reuse, so every retained bucket contributes.
 */
export function aggregateStatisticsWindows(
  windows: readonly Readonly<{
    readonly simulatedSeconds: number
    readonly infinityCount: bigint
    readonly infinityPoints: PresentationNumeric
    readonly dreamResetCount: bigint
    readonly strangeMatter: PresentationNumeric
    readonly realityWorkers: PresentationNumeric
  }>[],
): StatisticsWindowAggregate {
  return windows.reduce<StatisticsWindowAggregate>(
    (total, window) => ({
      simulatedSeconds:
        total.simulatedSeconds + window.simulatedSeconds,
      infinityCount: total.infinityCount + window.infinityCount,
      infinityPoints:
        addPresentation(total.infinityPoints, window.infinityPoints),
      dreamResetCount:
        total.dreamResetCount + window.dreamResetCount,
      strangeMatter: addPresentation(total.strangeMatter, window.strangeMatter),
      realityWorkers:
        addPresentation(total.realityWorkers, window.realityWorkers),
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

function addPresentation(
  left: PresentationNumeric,
  right: PresentationNumeric,
): PresentationNumeric {
  if (typeof left === 'bigint' && typeof right === 'bigint') return left + right
  return addGameDecimals(presentationDecimal(left), presentationDecimal(right))
}
