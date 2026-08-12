import type { DysonCompatibilityTuning } from './compatibilityTuning'
import {
  deriveSecretBuffs,
  type SecretResearchCoefficientId,
} from '../simulation/secretBuffs'

export const DYSON_TUNING_PROFILE_IDS = Object.freeze([
  'web-authored-v1',
] as const)

export type DysonTuningProfileId = (typeof DYSON_TUNING_PROFILE_IDS)[number]

const WEB_AUTHORED_V1 = Object.freeze({
  panelsPerSecMulti: 1,
  scienceBoostPercent: 0.05,
  moneyMultiUpgradePercent: 0.05,
  assemblyLineUpgradePercent: 0.03,
  aiManagerUpgradePercent: 0.03,
  serverUpgradePercent: 0.03,
  dataCenterUpgradePercent: 0.03,
  planetUpgradePercent: 0.03,
  matrioshkaUpgradePercent: 0.03,
  birchUpgradePercent: 0.03,
  galacticUpgradePercent: 0.03,
} satisfies DysonCompatibilityTuning)

/**
 * Closed Web-native gameplay authority for the eleven Dyson coefficients.
 *
 * `web-authored-v1` is transcribed from the field initializers in
 * `Assets/Scripts/Expansion/Oracle.cs` (panels at line 3495 and research
 * coefficients at lines 3564-3591). The three mega coefficients are also
 * repaired to 0.03 by `Oracle.Migrations.cs` lines 53 and 609-626.
 *
 * Unity's SecretBuffs mutates four of these coefficients in persisted state.
 * Those values are state-derived overrides, not alternate base profiles. V2
 * therefore persists only this authored base and derives the overrides from
 * the canonical Secrets of the Universe rank.
 */
export const DYSON_TUNING_PROFILES_V2: Readonly<
  Record<DysonTuningProfileId, Readonly<DysonCompatibilityTuning>>
> = Object.freeze({
  'web-authored-v1': WEB_AUTHORED_V1,
})

const MAXIMUM_SECRETS_OF_THE_UNIVERSE = 27n

const SECRET_COEFFICIENT_FIELDS = Object.freeze({
  'research.assembly_line_upgrade': 'assemblyLineUpgradePercent',
  'research.ai_manager_upgrade': 'aiManagerUpgradePercent',
  'research.server_upgrade': 'serverUpgradePercent',
  'research.planet_upgrade': 'planetUpgradePercent',
} as const satisfies Readonly<
  Record<SecretResearchCoefficientId, keyof DysonCompatibilityTuning>
>)

const TUNING_FIELDS = Object.freeze([
  'panelsPerSecMulti',
  'scienceBoostPercent',
  'moneyMultiUpgradePercent',
  'assemblyLineUpgradePercent',
  'aiManagerUpgradePercent',
  'serverUpgradePercent',
  'dataCenterUpgradePercent',
  'planetUpgradePercent',
  'matrioshkaUpgradePercent',
  'birchUpgradePercent',
  'galacticUpgradePercent',
] as const satisfies readonly (keyof DysonCompatibilityTuning)[])

export function resolveDysonTuningProfileV2(
  profile: DysonTuningProfileId,
): Readonly<DysonCompatibilityTuning> {
  if (!DYSON_TUNING_PROFILE_IDS.includes(profile)) {
    throw new TypeError(`Unknown Dyson V2 tuning profile '${String(profile)}'.`)
  }
  return DYSON_TUNING_PROFILES_V2[profile]
}

export function selectDysonTuningProfileV2(
  legacy: Readonly<DysonCompatibilityTuning>,
  secretsOfTheUniverse: bigint,
): DysonTuningProfileId {
  const properties = requireClosedTuningVector(legacy)
  const expected = deriveExpectedLegacyDysonTuningV2(secretsOfTheUniverse)
  if (TUNING_FIELDS.every((field) => properties[field]!.value === expected[field])) {
    return 'web-authored-v1'
  }
  const vector = TUNING_FIELDS.map(
    (field) => `${field}=${String(properties[field]!.value)}`,
  ).join(',')
  throw new RangeError(
    `Legacy Dyson tuning does not match web-authored-v1 plus Secrets of the Universe rank ${secretsOfTheUniverse.toString()}: ${vector}.`,
  )
}

/**
 * Reconstructs the exact coefficient vector Unity persists after SecretBuffs.
 * `deriveSecretBuffs` preserves Unity's float-to-double cast for overrides.
 */
export function deriveExpectedLegacyDysonTuningV2(
  secretsOfTheUniverse: bigint,
): Readonly<DysonCompatibilityTuning> {
  if (typeof secretsOfTheUniverse !== 'bigint') {
    throw new TypeError('Secrets of the Universe rank must be a bigint.')
  }
  if (
    secretsOfTheUniverse < 0n ||
    secretsOfTheUniverse > MAXIMUM_SECRETS_OF_THE_UNIVERSE
  ) {
    throw new RangeError(
      `Secrets of the Universe rank must be between 0 and ${MAXIMUM_SECRETS_OF_THE_UNIVERSE.toString()}.`,
    )
  }

  const expected = { ...WEB_AUTHORED_V1 }
  const overrides = deriveSecretBuffs(
    secretsOfTheUniverse,
  ).researchCoefficientOverrides
  for (const id of Object.keys(
    SECRET_COEFFICIENT_FIELDS,
  ) as SecretResearchCoefficientId[]) {
    const override = overrides[id]
    if (override !== undefined) {
      expected[SECRET_COEFFICIENT_FIELDS[id]] = override
    }
  }
  return Object.freeze(expected)
}

function requireClosedTuningVector(
  value: unknown,
): Readonly<Record<string, PropertyDescriptor & { readonly value: number }>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError('Legacy Dyson tuning must be a closed plain object.')
  }
  const properties = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== TUNING_FIELDS.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !TUNING_FIELDS.includes(
        key as (typeof TUNING_FIELDS)[number],
      )) return true
      const descriptor = properties[key]
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor) ||
        typeof descriptor.value !== 'number' ||
        !Number.isFinite(descriptor.value) ||
        descriptor.value < 0 ||
        Object.is(descriptor.value, -0)
      )
    })
  ) {
    throw new TypeError(
      'Legacy Dyson tuning must contain exactly eleven finite non-negative numeric data fields.',
    )
  }
  return properties as Readonly<
    Record<string, PropertyDescriptor & { readonly value: number }>
  >
}
