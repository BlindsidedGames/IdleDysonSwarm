import {
  cloneGameDecimal,
  isGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  DYSON_TUNING_PROFILE_IDS,
  type DysonTuningProfileId,
} from './dysonTuningV2'

export const CANONICAL_DYSON_EVALUATION_SNAPSHOT_V2_KEYS = Object.freeze([
  'panelsPerSecond',
  'panelLifetimeSeconds',
  'scienceMultiplier',
  'rudimentarySingularityProduction',
  'pocketDimensionsProduction',
  'scientificPlanetsProduction',
  'managerAssemblyLineProduction',
] as const)

export interface CanonicalDysonEvaluationSnapshotV2 {
  readonly panelsPerSecond: GameDecimal
  readonly panelLifetimeSeconds: GameDecimal
  readonly scienceMultiplier: GameDecimal
  readonly rudimentarySingularityProduction: GameDecimal
  readonly pocketDimensionsProduction: GameDecimal
  readonly scientificPlanetsProduction: GameDecimal
  readonly managerAssemblyLineProduction: GameDecimal
}

/** Portable gameplay recurrence state stored beside, not inside, game state. */
export interface CanonicalRuntimeSidecarV2 {
  readonly dysonEvaluationSnapshot: CanonicalDysonEvaluationSnapshotV2
  readonly dysonTuningProfile: DysonTuningProfileId
}

const validatedRuntimeSidecarsV2 = new WeakSet<object>()

export function isValidatedCanonicalRuntimeSidecarV2(
  value: unknown,
): value is Readonly<CanonicalRuntimeSidecarV2> {
  return typeof value === 'object' && value !== null &&
    validatedRuntimeSidecarsV2.has(value)
}

export function cloneCanonicalRuntimeSidecarV2(
  source: Readonly<CanonicalRuntimeSidecarV2>,
): Readonly<CanonicalRuntimeSidecarV2> {
  const sourceProperties = requireClosedDataProperties(
    source,
    ['dysonEvaluationSnapshot', 'dysonTuningProfile'],
    'CanonicalRuntimeSidecarV2',
  )
  const snapshot = requireDataProperty(
    sourceProperties,
    'dysonEvaluationSnapshot',
    'CanonicalRuntimeSidecarV2',
  )
  const snapshotProperties = requireClosedDataProperties(
    snapshot,
    CANONICAL_DYSON_EVALUATION_SNAPSHOT_V2_KEYS,
    'CanonicalRuntimeSidecarV2.dysonEvaluationSnapshot',
  )
  const clonedSnapshot = Object.fromEntries(
    CANONICAL_DYSON_EVALUATION_SNAPSHOT_V2_KEYS.map((key) => {
      const value = requireDataProperty(
        snapshotProperties,
        key,
        'CanonicalRuntimeSidecarV2.dysonEvaluationSnapshot',
      )
      if (!isGameDecimal(value)) {
        throw new TypeError(
          `CanonicalRuntimeSidecarV2.dysonEvaluationSnapshot.${key} must be a frozen GameDecimal.`,
        )
      }
      return [key, cloneGameDecimal(value)]
    }),
  ) as unknown as CanonicalDysonEvaluationSnapshotV2
  const profile = requireDataProperty(
    sourceProperties,
    'dysonTuningProfile',
    'CanonicalRuntimeSidecarV2',
  )
  if (
    typeof profile !== 'string' ||
    !DYSON_TUNING_PROFILE_IDS.includes(profile as DysonTuningProfileId)
  ) {
    throw new TypeError('CanonicalRuntimeSidecarV2.dysonTuningProfile is unsupported.')
  }
  const cloned = Object.freeze({
    dysonEvaluationSnapshot: Object.freeze(clonedSnapshot),
    dysonTuningProfile: profile as DysonTuningProfileId,
  })
  validatedRuntimeSidecarsV2.add(cloned)
  return cloned
}

function requireClosedDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${path} must be a closed plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !expectedKeys.includes(key)) return true
      const descriptor = descriptors[key]
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      )
    })
  ) {
    throw new TypeError(`${path} must contain exactly its declared data fields.`)
  }
  return descriptors
}

function requireDataProperty(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  path: string,
): unknown {
  const descriptor = properties[key]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${path} is missing '${key}'.`)
  }
  return descriptor.value
}
