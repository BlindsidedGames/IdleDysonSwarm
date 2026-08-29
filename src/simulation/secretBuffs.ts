export interface SecretBuffMultipliers {
  readonly cash: number
  readonly science: number
  readonly assemblyLines: number
  readonly aiManagers: number
  readonly servers: number
  readonly planets: number
}

export const SECRET_RESEARCH_COEFFICIENT_IDS = [
  'research.assembly_line_upgrade',
  'research.ai_manager_upgrade',
  'research.server_upgrade',
  'research.planet_upgrade',
] as const

export type SecretResearchCoefficientId =
  (typeof SECRET_RESEARCH_COEFFICIENT_IDS)[number]

export function isSecretResearchCoefficientId(
  value: unknown,
): value is SecretResearchCoefficientId {
  return (
    typeof value === 'string' &&
    (SECRET_RESEARCH_COEFFICIENT_IDS as readonly string[]).includes(
      value,
    )
  )
}

export interface SecretBuffDerivation {
  readonly multipliers: Readonly<SecretBuffMultipliers>
  readonly researchCoefficientOverrides: Readonly<
    Partial<Record<SecretResearchCoefficientId, number>>
  >
}

type MultiplierKey = keyof SecretBuffMultipliers

type SecretBuffEntry =
  | readonly [level: bigint, kind: 'multiplier', key: MultiplierKey, value: number]
  | readonly [
      level: bigint,
      kind: 'research-coefficient',
      key: SecretResearchCoefficientId,
      value: number,
    ]

const SECRET_BUFF_TABLE: readonly SecretBuffEntry[] = [
  [1n, 'research-coefficient', 'research.assembly_line_upgrade', 0.06],
  [2n, 'multiplier', 'cash', 2],
  [3n, 'research-coefficient', 'research.server_upgrade', 0.06],
  [4n, 'research-coefficient', 'research.assembly_line_upgrade', 0.09],
  [5n, 'research-coefficient', 'research.ai_manager_upgrade', 0.06],
  [6n, 'multiplier', 'science', 2],
  [7n, 'research-coefficient', 'research.planet_upgrade', 0.06],
  [8n, 'multiplier', 'cash', 4],
  [9n, 'research-coefficient', 'research.server_upgrade', 0.09],
  [10n, 'multiplier', 'science', 4],
  [11n, 'multiplier', 'science', 6],
  [12n, 'research-coefficient', 'research.assembly_line_upgrade', 0.12],
  [13n, 'research-coefficient', 'research.ai_manager_upgrade', 0.09],
  [14n, 'research-coefficient', 'research.planet_upgrade', 0.09],
  [15n, 'multiplier', 'science', 8],
  [16n, 'multiplier', 'assemblyLines', 2],
  [17n, 'multiplier', 'planets', 2],
  [18n, 'multiplier', 'planets', 5],
  [19n, 'multiplier', 'cash', 6],
  [20n, 'multiplier', 'servers', 2],
  [21n, 'multiplier', 'servers', 3],
  [22n, 'multiplier', 'science', 10],
  [23n, 'multiplier', 'assemblyLines', 7],
  [24n, 'multiplier', 'aiManagers', 2.5],
  [25n, 'multiplier', 'cash', 8],
  [26n, 'multiplier', 'aiManagers', 3],
  [27n, 'multiplier', 'aiManagers', 42],
]

/**
 * Replays Unity's ordered ModifierSystem.SecretBuffTable. Higher-level entries
 * overwrite earlier entries of the same kind.
 */
export function deriveSecretBuffs(
  secretsOfTheUniverse: bigint,
): Readonly<SecretBuffDerivation> {
  if (secretsOfTheUniverse < 0n) {
    throw new Error('Secrets of the Universe must be non-negative.')
  }

  const multipliers: {
    -readonly [TKey in keyof SecretBuffMultipliers]: number
  } = {
    cash: 1,
    science: 1,
    assemblyLines: 1,
    aiManagers: 1,
    servers: 1,
    planets: 1,
  }
  const researchCoefficientOverrides: Partial<
    Record<SecretResearchCoefficientId, number>
  > = {}

  for (const [level, kind, key, value] of SECRET_BUFF_TABLE) {
    if (level > secretsOfTheUniverse) break
    if (kind === 'multiplier') {
      multipliers[key] = value
    } else {
      // Unity stores these entries through a float cast on a double field.
      researchCoefficientOverrides[key] = Math.fround(value)
    }
  }

  return Object.freeze({
    multipliers: Object.freeze(multipliers),
    researchCoefficientOverrides: Object.freeze(
      researchCoefficientOverrides,
    ),
  })
}
