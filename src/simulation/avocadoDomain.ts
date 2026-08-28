import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  clampContinuous,
  CONTINUOUS_MAXIMUM,
  floorToDiscrete,
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
  readonly amount: number
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
 * Mirrors each AvocadoFeeder button: move as much of the currently spendable
 * source balance as the destination can represent in one immutable transaction.
 */
export function feedAllToAvocado(
  state: Readonly<CanonicalGameStateV1>,
  source: AvocadoFeedSource,
): AvocadoFeedResult {
  if (!state.avocado.unlocked) {
    return rejected(state, source, 'locked')
  }
  const current = avocadoBalance(state, source)

  let candidate: CanonicalGameStateV1
  let amount: number
  if (source === 'infinity-points') {
    const available = state.infinity.points - state.infinity.spentPoints
    if (available <= 0n) return rejected(state, source, 'empty')
    const capacity = floorToDiscrete(CONTINUOUS_MAXIMUM - current)
    const accepted = available < capacity ? available : capacity
    if (accepted <= 0n) return rejected(state, source, 'output-maxed')
    amount = Number(accepted)
    const next = addContinuous(current, amount)
    const credited = next - current
    if (next <= current || credited > amount) {
      return rejected(state, source, 'output-maxed')
    }
    candidate = {
      ...state,
      infinity: {
        ...state.infinity,
        points: state.infinity.points - accepted,
      },
      avocado: { ...state.avocado, infinityPoints: next },
    }
  } else if (source === 'influence') {
    amount = state.reality.influence
    if (amount <= 0) return rejected(state, source, 'empty')
    const transfer = continuousTransfer(current, amount)
    if (transfer === null) return rejected(state, source, 'output-maxed')
    amount = transfer.credited
    candidate = {
      ...state,
      reality: { ...state.reality, influence: transfer.remaining },
      avocado: { ...state.avocado, influence: transfer.next },
    }
  } else {
    amount = state.dream.strangeMatter
    if (amount <= 0) return rejected(state, source, 'empty')
    const transfer = continuousTransfer(current, amount)
    if (transfer === null) return rejected(state, source, 'output-maxed')
    amount = transfer.credited
    candidate = {
      ...state,
      dream: { ...state.dream, strangeMatter: transfer.remaining },
      avocado: { ...state.avocado, strangeMatter: transfer.next },
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

function continuousTransfer(
  current: number,
  available: number,
): {
  readonly credited: number
  readonly next: number
  readonly remaining: number
} | null {
  const requested = Math.min(
    available,
    Math.max(0, CONTINUOUS_MAXIMUM - current),
  )
  if (requested <= 0) return null
  const next = addContinuous(current, requested)
  const credited = next - current
  if (credited <= 0 || credited > requested) return null
  const remaining = clampContinuous(available - credited)
  if (remaining === available) return null
  return { credited, next, remaining }
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
    amount: 0,
    state,
  }
}
