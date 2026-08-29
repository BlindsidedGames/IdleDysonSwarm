import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { clampContinuous } from './numeric'

export interface DysonDerivedIntermediateInputs {
  readonly managerAssemblyLineProduction: number
  readonly panelLifetimeSeconds: number
}

export interface DysonDerivedIntermediates {
  readonly rudimentarySingularityProduction: number
  readonly pocketDimensionsProduction: number
}

/**
 * Rebuilds the two dynamic-skill intermediates that Unity previously cached
 * in the save graph. The input manager rate and panel lifetime must come from
 * the new recalculation; skill timers remain durable canonical causes.
 */
export function deriveDysonIntermediates(
  state: CanonicalGameStateV1,
  inputs: Readonly<DysonDerivedIntermediateInputs>,
): Readonly<DysonDerivedIntermediates> {
  requireFiniteNonNegative(
    inputs.managerAssemblyLineProduction,
    'managerAssemblyLineProduction',
  )
  requireFiniteNonNegative(
    inputs.panelLifetimeSeconds,
    'panelLifetimeSeconds',
  )
  const owned = (id: string) => state.skills.byId[id]?.owned === true
  const rudimentary = deriveRudimentary(
    state,
    inputs.managerAssemblyLineProduction,
    owned,
  )
  const pocket = derivePocketDimensions(
    state,
    inputs.panelLifetimeSeconds,
    rudimentary,
    owned,
  )
  return Object.freeze({
    rudimentarySingularityProduction: rudimentary,
    pocketDimensionsProduction: pocket,
  })
}

function deriveRudimentary(
  state: CanonicalGameStateV1,
  assemblyLineProduction: number,
  owned: (id: string) => boolean,
): number {
  if (!owned('rudimentarySingularity') || assemblyLineProduction <= 1) {
    return 0
  }
  let production = Math.pow(
    Math.log2(assemblyLineProduction),
    1 + Math.log10(assemblyLineProduction) / 10,
  )
  if (owned('unsuspiciousAlgorithms')) production *= 10
  if (owned('clusterNetworking')) {
    const servers =
      state.dyson.facilities.servers[0] +
      state.dyson.facilities.servers[1]
    production *=
      1 +
      (servers > 1
        ? Math.fround(0.05) * Math.log10(servers)
        : 0)
  }
  return clampContinuous(production)
}

function derivePocketDimensions(
  state: CanonicalGameStateV1,
  panelLifetimeSeconds: number,
  rudimentaryProduction: number,
  owned: (id: string) => boolean,
): number {
  let production =
    owned('pocketDimensions') && state.dyson.workers > 1
      ? Math.log10(state.dyson.workers)
      : 0

  if (owned('pocketMultiverse')) {
    const multiplier =
      owned('pocketDimensions') && state.dyson.researchers > 1
        ? Math.log10(state.dyson.researchers)
        : 0
    if (multiplier > 0) production *= multiplier
  } else if (
    owned('pocketProtectors') &&
    owned('pocketDimensions') &&
    state.dyson.researchers > 1
  ) {
    production += Math.log10(state.dyson.researchers)
  }

  if (owned('dimensionalCatCables')) production *= 5
  if (owned('solarBubbles')) {
    production *= 1 + 0.01 * panelLifetimeSeconds
  }
  if (owned('pocketAndroids')) {
    const timer =
      state.skills.byId.pocketAndroids?.timerSeconds ?? 0
    requireFiniteNonNegative(
      timer,
      'skills.byId.pocketAndroids.timerSeconds',
    )
    production *= 1 + 99 * Math.min(timer, 3_600) / 3_600
  }
  if (owned('quantumComputing')) {
    production *=
      1 +
      (rudimentaryProduction >= 1
        ? Math.log2(rudimentaryProduction)
        : 0)
  }
  return clampContinuous(production)
}

function requireFiniteNonNegative(
  value: number,
  path: string,
): void {
  if (!isFiniteNonNegativeNumber(value)) {
    throw new Error(
      `Dyson derived intermediate '${path}' must be finite and non-negative.`,
    )
  }
}
