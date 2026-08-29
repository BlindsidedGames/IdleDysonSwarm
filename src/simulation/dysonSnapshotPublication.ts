import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { deriveDysonIntermediates } from './dysonDerivedIntermediates'

export interface DysonSnapshotPublicationInputs {
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
  readonly scienceMultiplier: number
  readonly managerAssemblyLineProduction: number
  readonly scientificPlanetsProduction: number
}

/**
 * Publishes all prior-derived inputs as one immutable recalculation snapshot.
 * Dynamic effects in the next pass observe either all old values or all new
 * values; no partially rebuilt dependency graph is externally visible.
 */
export function publishDysonSkillEffectEvaluationSnapshot(
  state: CanonicalGameStateV1,
  inputs: Readonly<DysonSnapshotPublicationInputs>,
): Readonly<DysonSkillEffectEvaluationSnapshot> {
  for (const [path, value] of Object.entries(inputs)) {
    if (!isFiniteNonNegativeNumber(value)) {
      throw new Error(
        `Dyson snapshot publication '${path}' must be finite and non-negative.`,
      )
    }
  }
  const intermediates = deriveDysonIntermediates(state, {
    managerAssemblyLineProduction:
      inputs.managerAssemblyLineProduction,
    panelLifetimeSeconds: inputs.panelLifetimeSeconds,
  })
  return Object.freeze({
    panelsPerSecond: inputs.panelsPerSecond,
    panelLifetimeSeconds: inputs.panelLifetimeSeconds,
    scienceMultiplier: inputs.scienceMultiplier,
    rudimentarySingularityProduction:
      intermediates.rudimentarySingularityProduction,
    pocketDimensionsProduction:
      intermediates.pocketDimensionsProduction,
    scientificPlanetsProduction:
      inputs.scientificPlanetsProduction,
    managerAssemblyLineProduction:
      inputs.managerAssemblyLineProduction,
  })
}
