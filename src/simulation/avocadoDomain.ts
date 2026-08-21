import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  multiplyContinuous,
} from './numeric'

export const AVOCADO_LOG_THRESHOLD = 10

export type AvocadoFeedSource =
  | 'infinity-points'
  | 'influence'
  | 'strange-matter'

export type AvocadoFeedCode =
  | 'fed'
  | 'locked'
  | 'empty'
  | 'output-maxed'

export interface AvocadoFeedResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: AvocadoFeedCode
  readonly source: AvocadoFeedSource
  readonly amount: bigint
  readonly state: CanonicalGameStateV1
}

export interface AvocadoMultiplierBreakdown {
  readonly infinityPoints: number
  readonly influence: number
  readonly strangeMatter: number
  readonly overflow: number
  readonly total: number
}

/**
 * Resolves the production multiplier used by ModifierSystem and the facility
 * stat pipelines. Components below ten are neutral (x1), not zero.
 */
export function deriveAvocadoMultiplier(
  state: Readonly<CanonicalGameStateV1>,
): AvocadoMultiplierBreakdown {
  if (!state.avocado.unlocked) return neutralMultiplier()
  const infinityPoints = logContribution(state.avocado.infinityPoints)
  const influence = logContribution(state.avocado.influence)
  const strangeMatter = logContribution(
    state.avocado.strangeMatter,
  )
  const overflow =
    state.avocado.overflowMultiplier >= 1
      ? addContinuous(1, state.avocado.overflowMultiplier)
      : 1
  return {
    infinityPoints,
    influence,
    strangeMatter,
    overflow,
    total: multiplyContinuous(
      multiplyContinuous(
        multiplyContinuous(infinityPoints, influence),
        strangeMatter,
      ),
      overflow,
    ),
  }
}

/**
 * Mirrors each AvocadoFeeder button: drain the complete currently spendable
 * source balance into its accumulator as one immutable transaction.
 */
export function feedAllToAvocado(
  state: Readonly<CanonicalGameStateV1>,
  source: AvocadoFeedSource,
): AvocadoFeedResult {
  if (!state.avocado.unlocked) {
    return rejected(state, source, 'locked')
  }
  const amount = feedableAmount(state, source)
  if (amount <= 0n) return rejected(state, source, 'empty')
  const current = avocadoBalance(state, source)
  const next = addContinuous(current, Number(amount))
  if (
    next <= current ||
    !Number.isFinite(Number(amount))
  ) {
    return rejected(state, source, 'output-maxed')
  }

  let candidate: CanonicalGameStateV1
  if (source === 'infinity-points') {
    candidate = {
      ...state,
      infinity: { ...state.infinity, points: state.infinity.spentPoints },
      avocado: { ...state.avocado, infinityPoints: next },
    }
  } else if (source === 'influence') {
    candidate = {
      ...state,
      reality: { ...state.reality, influence: 0n },
      avocado: { ...state.avocado, influence: next },
    }
  } else {
    candidate = {
      ...state,
      dream: { ...state.dream, strangeMatter: 0n },
      avocado: { ...state.avocado, strangeMatter: next },
    }
  }
  return {
    accepted: true,
    changed: true,
    code: 'fed',
    source,
    amount,
    state: candidate,
  }
}

function feedableAmount(
  state: Readonly<CanonicalGameStateV1>,
  source: AvocadoFeedSource,
): bigint {
  if (source === 'infinity-points') {
    return state.infinity.points > state.infinity.spentPoints
      ? state.infinity.points - state.infinity.spentPoints
      : 0n
  }
  if (source === 'influence') return state.reality.influence
  return state.dream.strangeMatter
}

function avocadoBalance(
  state: Readonly<CanonicalGameStateV1>,
  source: AvocadoFeedSource,
): number {
  if (source === 'infinity-points') {
    return state.avocado.infinityPoints
  }
  if (source === 'influence') return state.avocado.influence
  return state.avocado.strangeMatter
}

function logContribution(value: number): number {
  return value >= AVOCADO_LOG_THRESHOLD ? Math.log10(value) : 1
}

function neutralMultiplier(): AvocadoMultiplierBreakdown {
  return {
    infinityPoints: 1,
    influence: 1,
    strangeMatter: 1,
    overflow: 1,
    total: 1,
  }
}

function rejected(
  state: Readonly<CanonicalGameStateV1>,
  source: AvocadoFeedSource,
  code: Exclude<AvocadoFeedCode, 'fed'>,
): AvocadoFeedResult {
  return {
    accepted: false,
    changed: false,
    code,
    source,
    amount: 0n,
    state,
  }
}
