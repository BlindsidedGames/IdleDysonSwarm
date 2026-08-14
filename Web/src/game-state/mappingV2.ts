import {
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  integerGameDecimalFromBigInt,
  integerGameDecimalFromNumber,
} from '../math/gameDecimal'
import type { SaveRecord } from '../save/graph'
import { requireRecord } from '../save/graph'
import type { NumericRepairEntry } from '../save/numericRepair'
import type { PreparedSave } from '../save/prepare'
import { MINIMUM_TINKER_COOLDOWN_SECONDS } from '../simulation/canonicalTinkerV2'
import {
  DEFAULT_STORED_TIME_CAPACITY_SECONDS,
  STORED_TIME_MAXIMUM_SECONDS,
} from '../simulation/timeResources'
import type { DysonCompatibilityTuning } from './compatibilityTuning'
import { cloneCanonicalGameStateV2 } from './cloneV2'
import { selectDysonTuningProfileV2 } from './dysonTuningV2'
import { hydrateGameState, type HydratedGameStateV1 } from './mapping'
import {
  canonicalFragmentSkillKeySet,
  canonicalNumericFieldClassifications,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  plannedV2OnlyNumericClassifications,
  type NumericSemanticClass,
} from './numericFieldManifest'
import type { DysonSkillEffectEvaluationSnapshot } from './skillEffectEvaluationSnapshot'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from './runtimeV2'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalDreamResetCauseV2,
  type CanonicalGameStateV2,
} from './typesV2'

export interface V2LocalPreferences {
  readonly globalMute: boolean
  readonly screensaverEnabled: boolean
  readonly hidePurchased: boolean
  readonly buyMax: boolean
  readonly numberFormatting: number
  readonly skillsBuyOnTap: boolean
  readonly frameRate: number
  readonly botsButtonToggle: boolean
  readonly researchbuttonToggle: boolean
  readonly skillsButtonToggle: boolean
  readonly skillsFirstRunDone: boolean
  readonly infinityButtonToggle: boolean
  readonly infinityFirstRunDone: boolean
  readonly realityButtonToggle: boolean
  readonly realityFirstRun: boolean
  readonly simulationsButtonToggle: boolean
  readonly prestigeButtonToggle: boolean
  readonly prestigeFirstRun: boolean
  readonly settingsButtonToggle: boolean
  readonly firstReality: boolean
}

export interface V2LocalPlatformState {
  readonly debugOptions: boolean
  readonly debugEverEnabled: boolean
  readonly cheater: boolean
  readonly unlockAllTabs: boolean
}

export type V2MigrationAuthority =
  | Readonly<{ kind: 'trusted-same-device' }>
  | Readonly<{
      kind: 'manual-shared-import'
      receivingPreferences: Readonly<V2LocalPreferences>
      receivingPlatformState: Readonly<V2LocalPlatformState>
    }>

export type LegacySchemaAuthority =
  | 'historical-compatibility'
  | 'certified-public-unity-schema-11'
  | 'non-public-schema-12'

export interface V2LegacyRuntimeEvidence {
  readonly sourceSchema: number
  readonly schemaAuthority: LegacySchemaAuthority
  readonly compatibilityTuning: Readonly<DysonCompatibilityTuning>
  readonly skillEffectEvaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
}

export interface V2MigrationRepair extends NumericRepairEntry {
  readonly phase: 'prepared-save' | 'v1-to-v2'
}

export interface V2MigrationResult {
  readonly state: CanonicalGameStateV2
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
  readonly localPreferences: Readonly<V2LocalPreferences>
  readonly localPlatformState: Readonly<V2LocalPlatformState>
  readonly legacyRuntimeEvidence: Readonly<V2LegacyRuntimeEvidence>
  readonly repairs: readonly Readonly<V2MigrationRepair>[]
}

const intendedEntries = [
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
].filter((entry) => entry.intendedV2Path !== null)

const DREAM_RESET_CAUSES = new Set<CanonicalDreamResetCauseV2>([
  'Meteor',
  'ArtificialIntelligence',
  'GlobalWarming',
  'BlackHole',
])
const LOCAL_PREFERENCE_BOOLEAN_FIELDS = [
  'globalMute',
  'screensaverEnabled',
  'hidePurchased',
  'buyMax',
  'skillsBuyOnTap',
  'botsButtonToggle',
  'researchbuttonToggle',
  'skillsButtonToggle',
  'skillsFirstRunDone',
  'infinityButtonToggle',
  'infinityFirstRunDone',
  'realityButtonToggle',
  'realityFirstRun',
  'simulationsButtonToggle',
  'prestigeButtonToggle',
  'prestigeFirstRun',
  'settingsButtonToggle',
  'firstReality',
] as const satisfies readonly (keyof V2LocalPreferences)[]
const LOCAL_PREFERENCE_FIELDS = [
  ...LOCAL_PREFERENCE_BOOLEAN_FIELDS,
  'numberFormatting',
  'frameRate',
] as const satisfies readonly (keyof V2LocalPreferences)[]
const LOCAL_PLATFORM_FIELDS = [
  'debugOptions',
  'debugEverEnabled',
  'cheater',
  'unlockAllTabs',
] as const satisfies readonly (keyof V2LocalPlatformState)[]

export function migratePreparedSaveToV2(
  prepared: PreparedSave,
  authority: V2MigrationAuthority,
): V2MigrationResult {
  if (
    authority === null ||
    typeof authority !== 'object' ||
    (authority.kind !== 'trusted-same-device' &&
      authority.kind !== 'manual-shared-import')
  ) {
    throw new TypeError('V2 migration authority must be explicitly selected.')
  }
  const source = prepared.copyValidatedState()
  const hydrated = hydrateGameState(prepared)
  const repairs: V2MigrationRepair[] = prepared.numericRepair.entries.map(
    (entry) => Object.freeze({ ...entry, phase: 'prepared-save' as const }),
  )
  const dysonRoot = requireRecord(source.dysonVerseSaveData, 'Dyson save')
  const selectedPreset = migrateBoundedExactNumber(
    dysonRoot.selectedPreset,
    '$.skills.selectedPreset',
    1,
    5,
    1,
    repairs,
    'selected Skill preset must identify one of the five authored slots',
  ) as CanonicalGameStateV2['skills']['selectedPreset']
  const state = migrateHydratedState(hydrated, selectedPreset, repairs)
  const runtime = cloneCanonicalRuntimeSidecarV2({
    dysonEvaluationSnapshot: {
      panelsPerSecond: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.panelsPerSecond,
      ),
      panelLifetimeSeconds: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.panelLifetimeSeconds,
      ),
      scienceMultiplier: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.scienceMultiplier,
      ),
      rudimentarySingularityProduction: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.rudimentarySingularityProduction,
      ),
      pocketDimensionsProduction: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.pocketDimensionsProduction,
      ),
      scientificPlanetsProduction: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.scientificPlanetsProduction,
      ),
      managerAssemblyLineProduction: gameDecimalFromNumber(
        hydrated.skillEffectEvaluationSnapshot.managerAssemblyLineProduction,
      ),
    },
    dysonTuningProfile: selectDysonTuningProfileV2(
      hydrated.compatibilityTuning,
      state.infinity.secretsOfTheUniverse,
    ),
  })
  const local =
    authority.kind === 'manual-shared-import'
      ? {
          preferences: copyReceivingPreferences(authority.receivingPreferences),
          platform: copyReceivingPlatformState(authority.receivingPlatformState),
        }
      : {
          preferences: extractLocalPreferences(source, repairs),
          platform: extractLocalPlatformState(source),
        }

  return Object.freeze({
    state,
    runtime,
    localPreferences: local.preferences,
    localPlatformState: local.platform,
    legacyRuntimeEvidence: Object.freeze({
      sourceSchema: prepared.sourceSchema,
      schemaAuthority: classifySchemaAuthority(prepared.sourceSchema),
      compatibilityTuning: hydrated.compatibilityTuning,
      skillEffectEvaluationSnapshot: hydrated.skillEffectEvaluationSnapshot,
    }),
    repairs: Object.freeze(repairs),
  })
}

function migrateHydratedState(
  hydrated: HydratedGameStateV1,
  selectedPreset: CanonicalGameStateV2['skills']['selectedPreset'],
  repairs: V2MigrationRepair[],
): CanonicalGameStateV2 {
  const source = hydrated.state
  const infinityAvailable = subtractLedger(
    source.infinity.points,
    source.infinity.spentPoints,
    '$.infinity.availablePoints',
    repairs,
  )
  const quantumAvailable = subtractLedger(
    source.quantum.pointsEarned,
    source.quantum.pointsSpent,
    '$.quantum.availableShards',
    repairs,
  )
  const dreamCause = migrateDreamCause(
    source.statistics.lastCompletedCycle.dreamCause,
    repairs,
  )
  const goalStage = migrateBoundedExactBigInt(
    source.dyson.goalStage,
    '$.dyson.goalStage',
    0n,
    10n,
    repairs,
    'Dyson goal stage is limited to the ten authored progression rewards',
  )
  const manualCreationIntervalSeconds = migratePositiveSeconds(
    source.dyson.manualCreationIntervalSeconds,
    '$.dyson.manualCreationIntervalSeconds',
    MINIMUM_TINKER_COOLDOWN_SECONDS,
    repairs,
    'Tinker interval must remain strictly positive in the V2 scheduler',
  )
  const fragments = BigInt(
    canonicalFragmentSkillKeySet.filter(
      (id) => source.skills.byId[id]?.owned === true,
    ).length,
  )
  if (source.skills.fragments !== fragments) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path: '$.skills.fragments',
      original: source.skills.fragments.toString(),
      replacement: fragments.toString(),
      rule: 'fragment count is derived from owned skills in the closed fragment Skill catalog',
    }))
  }
  const workersReady = migrateBoundedExactBigInt(
    source.reality.workersReady,
    '$.reality.workersReady',
    0n,
    REALITY_WORKERS_READY_MAXIMUM_V2,
    repairs,
    'ready workers are capped by the authored Reality worker batch size',
  )
  const divisionsPurchased = migrateBoundedExactBigInt(
    source.quantum.divisionsPurchased,
    '$.quantum.divisionsPurchased',
    0n,
    19n,
    repairs,
    'Quantum Divisions are capped at the nineteen authored purchases',
  )
  const permanentSecrets = migrateBoundedExactBigInt(
    source.quantum.permanentSecrets,
    '$.quantum.permanentSecrets',
    0n,
    27n,
    repairs,
    'Permanent Quantum Secrets are capped at the authored rank 27',
  )
  const breakTarget = source.quantum.unlocks.breakTheLoop && source.infinity.breakTarget < 1n
    ? repairExactBigInt(
        source.infinity.breakTarget,
        '$.infinity.breakTarget',
        1n,
        repairs,
        'Break The Loop requires a positive Infinity reward target',
      )
    : source.infinity.breakTarget
  const disasterStage = migrateDisasterStage(
    source.dream.disasterStage,
    repairs,
  )
  const storedTimeCapacitySeconds = migrateStoredTimeCapacity(
    source.timeline.storedTimeCapacitySeconds,
    repairs,
  )
  const storedTimeAvailableSeconds = migrateBoundedSeconds(
    source.timeline.storedTimeAvailableSeconds,
    '$.timeline.storedTimeAvailableSeconds',
    storedTimeCapacitySeconds,
    repairs,
    'stored time available cannot exceed its repaired capacity',
  )
  const doubleTimeBankSeconds = migrateBoundedSeconds(
    source.timeline.doubleTime.bankSeconds,
    '$.timeline.doubleTime.bankSeconds',
    STORED_TIME_MAXIMUM_SECONDS,
    repairs,
    'Dream Double Time uses its independent authoritative 42000000-second maximum',
  )
  const researchAutomationTargetIndex = migrateBoundedExactNumber(
    source.timeline.researchAutomationTargetIndex,
    '$.timeline.researchAutomationTargetIndex',
    0,
    canonicalResearchKeySet.length - 1,
    0,
    repairs,
    'Research automation must select an entry in the closed V2 catalog',
  )
  const researchLevelsById = Object.fromEntries(
    canonicalResearchLevelPolicies.map((policy) => {
      const level = source.research.levelsById[policy.key] ?? 0
      return [
        policy.key,
        policy.semanticClass === 'exact-bigint'
          ? migrateBoundedExactBigInt(
              typeof level === 'bigint' ? level : BigInt(level),
              `$.research.levelsById.${policy.key}`,
              0n,
              1n,
              repairs,
              `Research '${policy.key}' has one authored level`,
            )
          : level,
      ]
    }),
  )
  const navigationVisibility = source.meta.navigationVisibility ??
    recordDefault(
      '$.meta.navigationVisibility',
      { story: false, wiki: false, statistics: true },
      repairs,
    )
  const activeRailguns = source.dream.railgun.activeRailguns ??
    scalarDefault('$.dream.railgun.activeRailguns', 0, repairs)
  const pendingBaseSeconds = scalarDefault(
    '$.dream.railgun.pendingBaseSeconds',
    0,
    repairs,
  )
  const pendingDreamSeconds = scalarDefault(
    '$.dream.railgun.pendingDreamSeconds',
    0,
    repairs,
  )
  const reservedPanels = source.dream.railgun.reservedPanels ??
    scalarDefault('$.dream.railgun.reservedPanels', 0n, repairs)
  const highestStoredPanels = source.dream.railgun.highestStoredPanels ??
    scalarDefault(
      '$.dream.railgun.highestStoredPanels',
      source.dream.resources.dysonPanels,
      repairs,
    )
  const lastRoundsFired = source.dream.railgun.lastRoundsFired ??
    scalarDefault('$.dream.railgun.lastRoundsFired', 0, repairs)
  const lastPanelsLaunched = source.dream.railgun.lastPanelsLaunched ??
    scalarDefault('$.dream.railgun.lastPanelsLaunched', 0n, repairs)

  const { points: _points, spentPoints: _spentPoints, ...infinity } =
    source.infinity
  const {
    pointsEarned: _pointsEarned,
    pointsSpent: _pointsSpent,
    ...quantum
  } = source.quantum
  void _points
  void _spentPoints
  void _pointsEarned
  void _pointsSpent

  const transitional = {
    ...source,
    modelVersion: 2,
    meta: { ...source.meta, navigationVisibility },
    dyson: { ...source.dyson, goalStage, manualCreationIntervalSeconds },
    infinity: {
      ...infinity,
      availablePoints: infinityAvailable,
      allocatedPoints: source.infinity.spentPoints,
      breakTarget,
    },
    skills: { ...source.skills, fragments, selectedPreset },
    research: {
      ...source.research,
      levelsById: researchLevelsById,
      progressById: Object.fromEntries(
        canonicalResearchKeySet.map((id) => [
          id,
          source.research.progressById[id] ?? 0,
        ]),
      ),
      automation: {
        ...source.research.automation,
        enabledById: Object.fromEntries(
          canonicalResearchKeySet.map((id) => [
            id,
            source.research.automation.enabledById[id] ?? false,
          ]),
        ),
      },
    },
    reality: { ...source.reality, workersReady },
    quantum: {
      ...quantum,
      availableShards: quantumAvailable,
      lifetimeEarnedShards: source.quantum.pointsEarned,
      divisionsPurchased,
      permanentSecrets,
    },
    timeline: {
      ...source.timeline,
      researchAutomationTargetIndex,
      storedTimeAvailableSeconds,
      storedTimeCapacitySeconds,
      doubleTime: {
        ...source.timeline.doubleTime,
        bankSeconds: doubleTimeBankSeconds,
      },
    },
    dream: {
      ...source.dream,
      disasterStage,
      railgun: {
        ...source.dream.railgun,
        pendingBaseSeconds,
        pendingDreamSeconds,
        activeRailguns,
        reservedPanels,
        highestStoredPanels,
        lastRoundsFired,
        lastPanelsLaunched,
      },
    },
    statistics: {
      ...source.statistics,
      lastCompletedCycle: {
        ...source.statistics.lastCompletedCycle,
        dreamCause,
      },
    },
  }
  return cloneCanonicalGameStateV2(
    convertNumericGraph(transitional, '$') as CanonicalGameStateV2,
  )
}

function migrateBoundedExactBigInt(
  value: bigint,
  path: string,
  minimum: bigint,
  maximum: bigint,
  repairs: V2MigrationRepair[],
  rule: string,
): bigint {
  const replacement = value < minimum
    ? minimum
    : value > maximum
      ? maximum
      : value
  if (replacement !== value) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path,
      original: value.toString(),
      replacement: replacement.toString(),
      rule,
    }))
  }
  return replacement
}

function repairExactBigInt(
  original: bigint,
  path: string,
  replacement: bigint,
  repairs: V2MigrationRepair[],
  rule: string,
): bigint {
  repairs.push(Object.freeze({
    phase: 'v1-to-v2',
    path,
    original: original.toString(),
    replacement: replacement.toString(),
    rule,
  }))
  return replacement
}

function migrateBoundedExactNumber(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  fallback: number,
  repairs: V2MigrationRepair[],
  rule: string,
): number {
  const original = typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback
  const replacement = Math.max(minimum, Math.min(maximum, original))
  if (value !== replacement) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path,
      original: String(value),
      replacement: replacement.toString(),
      rule,
    }))
  }
  return replacement
}

function migrateDisasterStage(
  value: bigint,
  repairs: V2MigrationRepair[],
): bigint {
  if (value === 0n || value === 1n || value === 2n || value === 3n || value === 42n) {
    return value
  }
  repairs.push(Object.freeze({
    phase: 'v1-to-v2',
    path: '$.dream.disasterStage',
    original: value.toString(),
    replacement: '0',
    rule: 'unknown legacy Dream disaster stage resets to the closed inactive stage',
  }))
  return 0n
}

function migrateStoredTimeCapacity(
  value: number,
  repairs: V2MigrationRepair[],
): number {
  const replacement = value <= 0
    ? DEFAULT_STORED_TIME_CAPACITY_SECONDS
    : Math.min(value, STORED_TIME_MAXIMUM_SECONDS)
  if (replacement !== value) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path: '$.timeline.storedTimeCapacitySeconds',
      original: value.toString(),
      replacement: replacement.toString(),
      rule: 'stored-time capacity uses its positive default and authoritative maximum',
    }))
  }
  return replacement
}

function migratePositiveSeconds(
  value: number,
  path: string,
  minimum: number,
  repairs: V2MigrationRepair[],
  rule: string,
): number {
  const replacement = value > 0 ? value : minimum
  if (!Object.is(replacement, value)) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path,
      original: value.toString(),
      replacement: replacement.toString(),
      rule,
    }))
  }
  return replacement
}

function migrateBoundedSeconds(
  value: number,
  path: string,
  maximum: number,
  repairs: V2MigrationRepair[],
  rule: string,
): number {
  const replacement = value === 0 ? 0 : Math.min(value, maximum)
  if (!Object.is(replacement, value)) {
    repairs.push(Object.freeze({
      phase: 'v1-to-v2',
      path,
      original: value.toString(),
      replacement: replacement.toString(),
      rule,
    }))
  }
  return replacement
}

function subtractLedger(
  earned: bigint,
  spent: bigint,
  path: string,
  repairs: V2MigrationRepair[],
): bigint {
  if (earned >= spent) return earned - spent
  repairs.push(Object.freeze({
    phase: 'v1-to-v2',
    path,
    original: `${earned.toString()}-${spent.toString()}`,
    replacement: '0',
    rule: 'direct available balance clamps an over-spent legacy ledger to zero',
  }))
  return 0n
}

function migrateDreamCause(
  value: string | null,
  repairs: V2MigrationRepair[],
): CanonicalDreamResetCauseV2 | null {
  if (value === null || DREAM_RESET_CAUSES.has(value as CanonicalDreamResetCauseV2)) {
    return value as CanonicalDreamResetCauseV2 | null
  }
  repairs.push(Object.freeze({
    phase: 'v1-to-v2',
    path: '$.statistics.lastCompletedCycle.dreamCause',
    original: value,
    replacement: 'null',
    rule: 'unknown legacy Dream reset cause is not promoted into the closed V2 enum',
  }))
  return null
}

function recordDefault<T extends object>(
  path: string,
  value: T,
  repairs: V2MigrationRepair[],
): T {
  repairs.push(defaultRepair(path, JSON.stringify(value)))
  return value
}

function scalarDefault<T extends number | bigint>(
  path: string,
  value: T,
  repairs: V2MigrationRepair[],
): T {
  repairs.push(defaultRepair(path, value.toString()))
  return value
}

function defaultRepair(path: string, replacement: string): V2MigrationRepair {
  return Object.freeze({
    phase: 'v1-to-v2',
    path,
    original: 'missing',
    replacement,
    rule: 'required V2 field receives its declared migration default',
  })
}

function convertNumericGraph(value: unknown, path: string): unknown {
  if (typeof value === 'number' || typeof value === 'bigint') {
    const semanticClass = semanticClassForPath(path)
    switch (semanticClass) {
      case 'bounded-number':
        if (typeof value !== 'number') {
          throw new TypeError(`${path} must migrate to a bounded number from number.`)
        }
        return value
      case 'exact-bigint':
        return typeof value === 'bigint'
          ? value
          : exactBigIntFromNumber(value, path)
      case 'ordinary-decimal':
        return typeof value === 'bigint'
          ? gameDecimalFromBigInt(value)
          : gameDecimalFromNumber(value)
      case 'integer-decimal':
        return typeof value === 'bigint'
          ? integerGameDecimalFromBigInt(value)
          : integerGameDecimalFromNumber(value)
    }
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      convertNumericGraph(entry, `${path}.${index}`),
    )
  }
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      convertNumericGraph(entry, `${path}.${key}`),
    ]),
  )
}

function semanticClassForPath(path: string): NumericSemanticClass {
  if (path.startsWith('$.research.levelsById.')) {
    const id = path.slice('$.research.levelsById.'.length)
    const policy = canonicalResearchLevelPolicies.find(
      (entry) => entry.key === id,
    )
    if (policy !== undefined) return policy.semanticClass
  }
  const entry = intendedEntries.find((candidate) =>
    pathMatches(candidate.intendedV2Path!, path),
  )
  if (entry === undefined) {
    throw new Error(`V2 migration encountered unclassified numeric path ${path}.`)
  }
  return entry.semanticClass
}

function pathMatches(pattern: string, path: string): boolean {
  const expression = pattern
    .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('\\*', '.+')
  return new RegExp(`^${expression}$`, 'u').test(path)
}

function exactBigIntFromNumber(value: number, path: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${path} cannot migrate losslessly to exact bigint.`)
  }
  return BigInt(value)
}

function extractLocalPreferences(
  source: SaveRecord,
  repairs?: V2MigrationRepair[],
): Readonly<V2LocalPreferences> {
  return Object.freeze({
    globalMute: source.globalMute === true,
    screensaverEnabled: source.screensaverEnabled === true,
    hidePurchased: source.hidePurchased === true,
    buyMax: source.buyMax === true,
    numberFormatting: migrateLocalInteger(
      source.numberFormatting,
      'numberFormatting',
      0,
      2,
      repairs,
    ),
    skillsBuyOnTap: source.skillsBuyOnTap === true,
    frameRate: migrateLocalInteger(
      source.frameRate,
      'frameRate',
      0,
      1_000,
      repairs,
    ),
    botsButtonToggle: source.botsButtonToggle === true,
    researchbuttonToggle: source.researchbuttonToggle === true,
    skillsButtonToggle: source.skillsButtonToggle === true,
    skillsFirstRunDone: source.skillsFirstRunDone === true,
    infinityButtonToggle: source.infinityButtonToggle === true,
    infinityFirstRunDone: source.infinityFirstRunDone === true,
    realityButtonToggle: source.realityButtonToggle === true,
    realityFirstRun: source.realityFirstRun === true,
    simulationsButtonToggle: source.simulationsButtonToggle === true,
    prestigeButtonToggle: source.prestigeButtonToggle === true,
    prestigeFirstRun: source.prestigeFirstRun === true,
    settingsButtonToggle: source.settingsButtonToggle === true,
    firstReality: source.firstReality === true,
  })
}

function extractLocalPlatformState(source: SaveRecord): Readonly<V2LocalPlatformState> {
  return Object.freeze({
    debugOptions: source.debugOptions === true,
    debugEverEnabled: source.debugEverEnabled === true,
    cheater: source.cheater === true,
    unlockAllTabs: source.unlockAllTabs === true,
  })
}

function copyReceivingPreferences(
  source: Readonly<V2LocalPreferences>,
): Readonly<V2LocalPreferences> {
  assertClosedDataObject(source, LOCAL_PREFERENCE_FIELDS, 'Receiving preferences')
  const record = source as unknown as Record<string, unknown>
  for (const field of LOCAL_PREFERENCE_BOOLEAN_FIELDS) {
    if (typeof record[field] !== 'boolean') {
      throw new TypeError(`Receiving preference '${field}' must be boolean.`)
    }
  }
  const exactSource: SaveRecord = {
    numberFormatting: requireReceivingLocalInteger(
      source.numberFormatting,
      'numberFormatting',
      0,
      2,
    ),
    frameRate: requireReceivingLocalInteger(
      source.frameRate,
      'frameRate',
      0,
      1_000,
    ),
  }
  for (const field of LOCAL_PREFERENCE_BOOLEAN_FIELDS) {
    exactSource[field] = source[field]
  }
  return extractLocalPreferences(exactSource)
}

function copyReceivingPlatformState(
  source: Readonly<V2LocalPlatformState>,
): Readonly<V2LocalPlatformState> {
  assertClosedDataObject(source, LOCAL_PLATFORM_FIELDS, 'Receiving platform state')
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'boolean') {
      throw new TypeError(`Receiving platform field '${key}' must be boolean.`)
    }
  }
  return Object.freeze({
    debugOptions: source.debugOptions,
    debugEverEnabled: source.debugEverEnabled,
    cheater: source.cheater,
    unlockAllTabs: source.unlockAllTabs,
  })
}

function migrateLocalInteger(
  value: unknown,
  field: 'numberFormatting' | 'frameRate',
  minimum: number,
  maximum: number,
  repairs?: V2MigrationRepair[],
): number {
  const converted = localInteger(value)
  if (converted !== null && converted >= minimum && converted <= maximum) {
    return converted
  }
  repairs?.push(Object.freeze({
    phase: 'v1-to-v2',
    path: `$.localPreferences.${field}`,
    original: formatLocalValue(value),
    replacement: '0',
    rule: `${field} must be a safe integer from ${minimum} through ${maximum}; zero is the migration default`,
  }))
  return 0
}

function requireReceivingLocalInteger(
  value: unknown,
  field: 'numberFormatting' | 'frameRate',
  minimum: number,
  maximum: number,
): number {
  const converted = localInteger(value)
  if (converted === null || converted < minimum || converted > maximum) {
    throw new TypeError(
      `Receiving preference '${field}' must be a safe integer from ${minimum} through ${maximum}.`,
    )
  }
  return converted
}

function localInteger(value: unknown): number | null {
  if (typeof value === 'bigint') {
    if (value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(value)
    }
  } else if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value
  }
  return null
}

function formatLocalValue(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return typeof value
}

function classifySchemaAuthority(sourceSchema: number): LegacySchemaAuthority {
  if (sourceSchema === 11) return 'certified-public-unity-schema-11'
  if (sourceSchema === 12) return 'non-public-schema-12'
  return 'historical-compatibility'
}

function assertClosedDataObject(
  value: object,
  expectedKeys: readonly string[],
  label: string,
): void {
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actualKeys = Reflect.ownKeys(value)
  if (
    actualKeys.some((key) => {
      if (typeof key !== 'string') return true
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    }) ||
    actualKeys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(descriptors, key))
  ) {
    throw new TypeError(`${label} must contain exactly its declared data fields.`)
  }
}
