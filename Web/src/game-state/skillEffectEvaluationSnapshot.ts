import { requireRecord } from '../save/graph'
import type { PreparedSave } from '../save/prepare'

/**
 * Unity dynamic skill effects intentionally read these values from the
 * previous derived-state recalculation. They are compatibility inputs for the
 * first web recalculation, not durable canonical player state. Subsequent web
 * recalculations replace them atomically with newly derived values.
 */
export interface DysonSkillEffectEvaluationSnapshot {
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
  readonly scienceMultiplier: number
  readonly rudimentarySingularityProduction: number
  readonly pocketDimensionsProduction: number
  readonly scientificPlanetsProduction: number
  readonly managerAssemblyLineProduction: number
}

const SNAPSHOT_FIELDS = {
  panelsPerSecond: 'panelsPerSec',
  panelLifetimeSeconds: 'panelLifetime',
  scienceMultiplier: 'scienceMulti',
  rudimentarySingularityProduction:
    'rudimentrySingularityProduction',
  pocketDimensionsProduction: 'pocketDimensionsProduction',
  scientificPlanetsProduction: 'scientificPlanetsProduction',
  managerAssemblyLineProduction: 'managerAssemblyLineProduction',
} as const satisfies Readonly<
  Record<keyof DysonSkillEffectEvaluationSnapshot, string>
>

export function extractDysonSkillEffectEvaluationSnapshot(
  prepared: PreparedSave,
): Readonly<DysonSkillEffectEvaluationSnapshot> {
  const source = prepared.copyValidatedState()
  const dyson = requireRecord(
    source.dysonVerseSaveData,
    'Dyson save',
  )
  const infinity = requireRecord(
    dyson.dysonVerseInfinityData,
    'Dyson infinity data',
  )
  const entries = Object.entries(SNAPSHOT_FIELDS).map(
    ([target, sourceField]) => [
      target,
      requireFiniteNonNegative(infinity[sourceField], sourceField),
    ],
  )
  return Object.freeze(
    Object.fromEntries(
      entries,
    ) as unknown as DysonSkillEffectEvaluationSnapshot,
  )
}

function requireFiniteNonNegative(
  value: unknown,
  field: string,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }
  throw new Error(
    `Dyson skill-effect snapshot '${field}' must be a finite non-negative number.`,
  )
}
