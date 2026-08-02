import type { CanonicalGameStateV1 } from '../game-state/types'

export interface CanonicalBotAllocation {
  readonly workers: number
  readonly researchers: number
}

/**
 * Reproduces Unity ProductionSystem.SetBotDistribution. Before Bot
 * Multitasking only whole bots are allocated; the worker side receives the
 * ceiling remainder while the researcher side is floored.
 */
export function deriveCanonicalBotAllocation(
  state: Readonly<CanonicalGameStateV1>,
): Readonly<CanonicalBotAllocation> {
  if (state.quantum.unlocks.botMultitasking) {
    return Object.freeze({
      workers: state.dyson.bots,
      researchers: state.dyson.bots,
    })
  }

  const wholeBots = Math.floor(state.dyson.bots)
  const distribution = Math.fround(state.dyson.botDistribution)
  const workerPercentage = Math.fround(
    Math.fround(1 - distribution) * 100,
  )
  return Object.freeze({
    workers: Math.ceil((wholeBots / 100) * workerPercentage),
    researchers: Math.floor(
      (wholeBots / 100) * distribution * 100,
    ),
  })
}

/**
 * Synchronizes the durable compatibility fields that Unity updates alongside
 * its derived production rates.
 */
export function withCanonicalBotAllocation(
  state: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  const allocation = deriveCanonicalBotAllocation(state)
  if (
    allocation.workers === state.dyson.workers &&
    allocation.researchers === state.dyson.researchers
  ) {
    return state
  }
  return {
    ...state,
    dyson: {
      ...state.dyson,
      workers: allocation.workers,
      researchers: allocation.researchers,
    },
  }
}
