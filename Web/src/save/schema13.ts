import { Gunzip, gzipSync, strToU8 } from 'fflate'
import {
  GAME_DECIMAL_BIGINT_MAX_DIGITS,
  GAME_DECIMAL_ENCODED_MAX_LENGTH,
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
  integerGameDecimalFromCanonicalString,
  isGameDecimal,
  isIntegerGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  admitValidatedCanonicalGameStateV2,
  registerCanonicalGameStateValidationAuthorityV2,
} from '../game-state/cloneV2'
import {
  canonicalDreamTimerKeySet,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  canonicalSkillStateKeySet,
  type NumericSemanticClass,
} from '../game-state/numericFieldManifest'
import { SKILL_PRESET_COLOR_IDS } from '../game-state/skillPresetColors'
import { DREAM_UPGRADE_FLAGS } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  cloneCanonicalRuntimeSidecarV2,
  isValidatedCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import { DYSON_TUNING_PROFILE_IDS } from '../game-state/dysonTuningV2'
import {
  assertSuppliedSaveTextLimit,
  decodeBase64Bounded,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
} from './decodeIdb1'
import { assertGzipTrailerIntegrity } from './gzipIntegrity'

export const SCHEMA13_WEB_SAVE_SCHEMA = 13 as const
export const SCHEMA13_GAME_MODEL_VERSION = 2 as const
export const SCHEMA13_WEB_SAVE_PREFIX = 'IDSWEB1:' as const

const GZIP_INPUT_CHUNK_BYTES = 64
const MAXIMUM_GZIP_CALLBACK_BYTES = 128 * 1024
const STATE_VALIDATION_AUTHORITY =
  registerCanonicalGameStateValidationAuthorityV2()

export const SCHEMA13_CODEC_LIMITS = Object.freeze({
  suppliedTextBytes: DEFAULT_SAVE_IMPORT_LIMITS.suppliedTextBytes,
  decodedPayloadBytes: DEFAULT_SAVE_IMPORT_LIMITS.decodedPayloadBytes,
  inflatedJsonBytes: DEFAULT_SAVE_IMPORT_LIMITS.inflatedBinaryBytes,
  maximumDepth: 128,
  maximumContainers: 100_000,
  maximumEntries: 250_000,
  maximumStringCodeUnits: 65_536,
  decimalCharacters: GAME_DECIMAL_ENCODED_MAX_LENGTH,
  bigintDigits: GAME_DECIMAL_BIGINT_MAX_DIGITS,
})

type EncodedSchema13Value<T> = T extends GameDecimal
  ? string
  : T extends bigint
    ? string
    : T extends readonly (infer Entry)[]
      ? readonly EncodedSchema13Value<Entry>[]
      : T extends object
        ? { readonly [Key in keyof T]: EncodedSchema13Value<T[Key]> }
        : T

type RequiredSchema13State = Omit<
  CanonicalGameStateV2,
  'modelVersion' | 'meta' | 'dream'
> & {
  readonly meta: Omit<
    CanonicalGameStateV2['meta'],
    'navigationVisibility'
  > & {
    readonly navigationVisibility: NonNullable<
      CanonicalGameStateV2['meta']['navigationVisibility']
    >
  }
  readonly dream: Omit<CanonicalGameStateV2['dream'], 'railgun'> & {
    readonly railgun: Required<CanonicalGameStateV2['dream']['railgun']>
  }
}

export type WebSaveStateDtoV13 = EncodedSchema13Value<RequiredSchema13State>
export type WebSaveRuntimeDtoV13 = EncodedSchema13Value<CanonicalRuntimeSidecarV2>

export interface WebSaveDtoV13 {
  readonly schemaVersion: typeof SCHEMA13_WEB_SAVE_SCHEMA
  readonly modelVersion: typeof SCHEMA13_GAME_MODEL_VERSION
  readonly savedAtUtc: string
  readonly state: WebSaveStateDtoV13
  readonly runtime: WebSaveRuntimeDtoV13
}

export interface Schema13WebSaveSource {
  readonly savedAtUtc: string
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface DecodedSchema13WebSave {
  readonly schemaVersion: typeof SCHEMA13_WEB_SAVE_SCHEMA
  readonly modelVersion: typeof SCHEMA13_GAME_MODEL_VERSION
  readonly savedAtUtc: string
  readonly state: CanonicalGameStateV2
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface Schema13PresentationPreferences {
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

export interface Schema13PlatformState {
  readonly debugOptions: boolean
  readonly debugEverEnabled: boolean
  readonly cheater: boolean
  readonly unlockAllTabs: boolean
}

type SchemaNode =
  | Readonly<{ kind: 'decimal' }>
  | Readonly<{ kind: 'integer-decimal' }>
  | Readonly<{ kind: 'bigint' }>
  | Readonly<{
      kind: 'number'
      minimum?: number
      exclusiveMinimum?: number
      maximum?: number
      safeInteger?: boolean
    }>
  | Readonly<{ kind: 'boolean' }>
  | Readonly<{ kind: 'string' }>
  | Readonly<{ kind: 'nullable-string' }>
  | Readonly<{ kind: 'literal'; value: string | number }>
  | Readonly<{ kind: 'enum'; values: readonly (string | number)[] }>
  | Readonly<{
      kind: 'array'
      entry: SchemaNode
      length?: number
      inventoryWildcard?: boolean
    }>
  | Readonly<{
      kind: 'tuple'
      entries: readonly SchemaNode[]
    }>
  | Readonly<{
      kind: 'object'
      fields: readonly SchemaField[]
      allowedNames: ReadonlySet<string>
      inventoryWildcard?: boolean
    }>

interface SchemaField {
  readonly name: string
  readonly node: SchemaNode
}

interface CodecBudget {
  containers: number
  entries: number
  seen?: Set<object>
}

type CodecDirection = 'encode' | 'decode'

const decimalNode = Object.freeze({ kind: 'decimal' } as const)
const integerDecimalNode = Object.freeze({ kind: 'integer-decimal' } as const)
const bigintNode = Object.freeze({ kind: 'bigint' } as const)
const numberNode = Object.freeze({ kind: 'number' } as const)
const booleanNode = Object.freeze({ kind: 'boolean' } as const)
const stringNode = Object.freeze({ kind: 'string' } as const)
const nullableStringNode = Object.freeze({ kind: 'nullable-string' } as const)

function field(
  name: string,
  node: SchemaNode,
): SchemaField {
  return Object.freeze({ name, node })
}

function objectNode(
  fields: readonly SchemaField[],
  inventoryWildcard = false,
): SchemaNode {
  const frozenFields = Object.freeze([...fields])
  return Object.freeze({
    kind: 'object',
    fields: frozenFields,
    allowedNames: new Set(frozenFields.map((entry) => entry.name)),
    inventoryWildcard,
  })
}

function recordNode(
  keys: readonly string[],
  node: SchemaNode,
  inventoryWildcard = false,
): SchemaNode {
  return objectNode(
    keys.map((key) => field(key, node)),
    inventoryWildcard,
  )
}

function arrayNode(
  entry: SchemaNode,
  length?: number,
  inventoryWildcard = false,
): SchemaNode {
  return Object.freeze({ kind: 'array', entry, length, inventoryWildcard })
}

function tupleNode(entries: readonly SchemaNode[]): SchemaNode {
  return Object.freeze({ kind: 'tuple', entries: Object.freeze([...entries]) })
}

function enumNode(values: readonly (string | number)[]): SchemaNode {
  return Object.freeze({ kind: 'enum', values: Object.freeze([...values]) })
}

function boundedNumberNode(
  constraints: Readonly<{
    minimum?: number
    exclusiveMinimum?: number
    maximum?: number
    safeInteger?: boolean
  }>,
): SchemaNode {
  return Object.freeze({ kind: 'number', ...constraints })
}

const facilityIds = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const)
const retainedFacilityIds = facilityIds.slice(0, 5)
const educationIds = Object.freeze([
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const)
const buyModes = Object.freeze([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
] as const)

const ownedPairNode = tupleNode([decimalNode, integerDecimalNode])
const skillRuntimeNode = objectNode([
  field('owned', booleanNode),
  field('level', bigintNode),
  field('timerSeconds', numberNode),
  field('secondaryTimerSeconds', numberNode),
])
const skillPresetNode = objectNode([
  field('name', stringNode),
  field('skillIds', arrayNode(stringNode)),
  field('botDistribution', numberNode),
  field('colorId', enumNode(SKILL_PRESET_COLOR_IDS)),
])
const researchLevelNode = objectNode(
  canonicalResearchLevelPolicies.map((policy) =>
    field(
      policy.key,
      policy.semanticClass === 'exact-bigint'
        ? bigintNode
        : integerDecimalNode,
    ),
  ),
)
const dreamEducationNode = objectNode([
  field('active', booleanNode),
  field('complete', booleanNode),
  field('progress', decimalNode),
  field('researchTime', numberNode),
  field('cost', integerDecimalNode),
])
const statisticsTotalsNode = objectNode([
  field('ordinaryInfinityCount', bigintNode),
  field('breakInfinityCount', bigintNode),
  field('ordinaryInfinityPoints', integerDecimalNode),
  field('breakInfinityPoints', integerDecimalNode),
  field('botCapInfinityPoints', integerDecimalNode),
  field('botCapOverflowRewards', integerDecimalNode),
  field('meteorDreamResets', bigintNode),
  field('aiDreamResets', bigintNode),
  field('globalWarmingDreamResets', bigintNode),
  field('blackHoleDreamResets', bigintNode),
  field('strangeMatter', integerDecimalNode),
  field('realityWorkers', integerDecimalNode),
  field('automaticInfluence', integerDecimalNode),
  field('manualInfluence', integerDecimalNode),
  field('realityCapacityStallSeconds', numberNode),
  field('simulatedSeconds', numberNode),
])
const statisticsWindowNode = objectNode([
  field('sequence', bigintNode),
  field('simulatedSeconds', numberNode),
  field('infinityCount', bigintNode),
  field('infinityPoints', integerDecimalNode),
  field('dreamResetCount', bigintNode),
  field('strangeMatter', integerDecimalNode),
  field('realityWorkers', integerDecimalNode),
])

const dysonEvaluationSnapshotNode = objectNode([
  field('panelsPerSecond', decimalNode),
  field('panelLifetimeSeconds', decimalNode),
  field('scienceMultiplier', decimalNode),
  field('rudimentarySingularityProduction', decimalNode),
  field('pocketDimensionsProduction', decimalNode),
  field('scientificPlanetsProduction', decimalNode),
  field('managerAssemblyLineProduction', decimalNode),
])

const runtimeNode = objectNode([
  field('dysonEvaluationSnapshot', dysonEvaluationSnapshotNode),
  field('dysonTuningProfile', enumNode(DYSON_TUNING_PROFILE_IDS)),
])

const stateNode = objectNode([
  field(
    'meta',
    objectNode([
      field('createdAtLegacyText', nullableStringNode),
      field('tutorialComplete', booleanNode),
      field('firstInfinityComplete', booleanNode),
      field(
        'navigationVisibility',
        objectNode([
          field('story', booleanNode),
          field('wiki', booleanNode),
          field('statistics', booleanNode),
        ]),
      ),
    ]),
  ),
  field(
    'dyson',
    objectNode([
      field('money', decimalNode),
      field('science', decimalNode),
      field('bots', decimalNode),
      field('workers', decimalNode),
      field('researchers', decimalNode),
      field('facilities', recordNode(facilityIds, ownedPairNode)),
      field(
        'manualCreationIntervalSeconds',
        boundedNumberNode({ exclusiveMinimum: 0 }),
      ),
      field('totalPanelsDecayed', decimalNode),
      field('goalStage', bigintNode),
      field('botDistribution', numberNode),
      field(
        'automation',
        objectNode([
          field('buyMode', enumNode(buyModes)),
          field('roundedBulkBuy', booleanNode),
          field(
            'enabledFacilities',
            recordNode(facilityIds, booleanNode),
          ),
        ]),
      ),
    ]),
  ),
  field(
    'infinity',
    objectNode([
      field('availablePoints', integerDecimalNode),
      field('allocatedPoints', integerDecimalNode),
      field('breakTarget', integerDecimalNode),
      field('inProgress', booleanNode),
      field('botCapTransitionPending', booleanNode),
      field('botCapRewardsGranted', booleanNode),
      field('lastCycleDurationSeconds', numberNode),
      field('lastPointsGained', integerDecimalNode),
      field('storedTimeUsedThisCycleSeconds', numberNode),
      field('storedTimeUsedPreviousCycleSeconds', numberNode),
      field('secretsOfTheUniverse', bigintNode),
      field('permanentSkillPoints', bigintNode),
      field(
        'retainedFacilities',
        recordNode(retainedFacilityIds, booleanNode),
      ),
      field(
        'automationUnlocked',
        objectNode([
          field('research', booleanNode),
          field('bots', booleanNode),
        ]),
      ),
    ]),
  ),
  field(
    'skills',
    objectNode([
      field('points', bigintNode),
      field('fragments', bigintNode),
      field(
        'byId',
        recordNode(canonicalSkillStateKeySet, skillRuntimeNode, true),
      ),
      field('activeAutoAssignment', arrayNode(stringNode)),
      field('selectedPreset', enumNode([1, 2, 3, 4, 5])),
      field('presets', arrayNode(skillPresetNode, 5)),
      field('autoAssignNonRefundable', booleanNode),
      field(
        'tabPresetAutomation',
        objectNode([
          field('bots', enumNode([0, 1, 2, 3, 4, 5])),
          field('research', enumNode([0, 1, 2, 3, 4, 5])),
        ]),
      ),
    ]),
  ),
  field(
    'research',
    objectNode([
      field('levelsById', researchLevelNode),
      field(
        'progressById',
        recordNode(canonicalResearchKeySet, decimalNode, true),
      ),
      field(
        'automation',
        objectNode([
          field('buyMode', enumNode(buyModes)),
          field('roundedBulkBuy', booleanNode),
          field(
            'enabledById',
            recordNode(canonicalResearchKeySet, booleanNode),
          ),
        ]),
      ),
    ]),
  ),
  field(
    'reality',
    objectNode([
      field('universeDesignationCount', integerDecimalNode),
      field('workersReady', bigintNode),
      field('workerGenerationProgress', numberNode),
      field('influence', integerDecimalNode),
      field('autoGather', booleanNode),
    ]),
  ),
  field(
    'quantum',
    objectNode([
      field('availableShards', integerDecimalNode),
      field('lifetimeEarnedShards', integerDecimalNode),
      field('divisionsPurchased', bigintNode),
      field('permanentSecrets', bigintNode),
      field('influenceSpeedBonus', integerDecimalNode),
      field('cashBonusLevels', integerDecimalNode),
      field('scienceBonusLevels', integerDecimalNode),
      field(
        'unlocks',
        objectNode([
          field('botMultitasking', booleanNode),
          field('doubleInfinityPoints', booleanNode),
          field('breakTheLoop', booleanNode),
          field('quantumEntanglement', booleanNode),
          field('automation', booleanNode),
          field('fragments', booleanNode),
          field('purity', booleanNode),
          field('terra', booleanNode),
          field('power', booleanNode),
          field('paragade', booleanNode),
          field('stellar', booleanNode),
          field('matrioshkaBrains', booleanNode),
          field('birchPlanets', booleanNode),
          field('galacticBrains', booleanNode),
        ]),
      ),
    ]),
  ),
  field(
    'avocado',
    objectNode([
      field('unlocked', booleanNode),
      field('infinityPoints', decimalNode),
      field('influence', decimalNode),
      field('strangeMatter', decimalNode),
      field('overflowMultiplier', decimalNode),
    ]),
  ),
  field(
    'timeline',
    objectNode([
      field('eventClockInitialized', booleanNode),
      field('automationTimeUntilNextEvent', numberNode),
      field('dysonAutomationTargetIndex', numberNode),
      field('researchAutomationTargetIndex', numberNode),
      field('infinityBoundaryRemaining', numberNode),
      field('infinityCycleSeconds', numberNode),
      field('infinityCycleStartingPoints', integerDecimalNode),
      field('infinityHasPostResetStart', booleanNode),
      field('storedTimeAvailableSeconds', numberNode),
      field('storedTimeCapacitySeconds', numberNode),
      field('lastSuspendedAtLegacyText', nullableStringNode),
      field(
        'doubleTime',
        objectNode([
          field('unlocked', booleanNode),
          field('enabled', booleanNode),
          field('bankSeconds', numberNode),
          field('rate', numberNode),
        ]),
      ),
    ]),
  ),
  field(
    'secretProgress',
    objectNode([
      field('completed', booleanNode),
      field('step', numberNode),
    ]),
  ),
  field(
    'dream',
    objectNode([
      field(
        'resources',
        objectNode([
          field('hunters', integerDecimalNode),
          field('gatherers', integerDecimalNode),
          field('community', integerDecimalNode),
          field('housing', integerDecimalNode),
          field('villages', integerDecimalNode),
          field('workers', integerDecimalNode),
          field('cities', integerDecimalNode),
          field('factories', integerDecimalNode),
          field('bots', integerDecimalNode),
          field('rockets', integerDecimalNode),
          field('energy', decimalNode),
          field('spaceFactories', integerDecimalNode),
          field('dysonPanels', integerDecimalNode),
          field('railgunCharge', decimalNode),
          field('solarPanels', integerDecimalNode),
          field('fusion', integerDecimalNode),
          field('swarmPanels', integerDecimalNode),
        ]),
      ),
      field(
        'parameters',
        objectNode([
          field('hunterCost', integerDecimalNode),
          field('gathererCost', integerDecimalNode),
          field('communityBoostCost', integerDecimalNode),
          field('communityBoostIsFree', booleanNode),
          field('communityBoostClock', numberNode),
          field('communityBoostDuration', numberNode),
          field('factoriesBoostCost', integerDecimalNode),
          field('factoriesBoostClock', numberNode),
          field('factoriesBoostDuration', numberNode),
          field('rocketsPerSpaceFactory', integerDecimalNode),
          field('railgunMaxCharge', decimalNode),
          field('solarCost', integerDecimalNode),
          field('solarPanelGeneration', decimalNode),
          field('fusionCost', integerDecimalNode),
          field('fusionGeneration', decimalNode),
          field('swarmPanelGeneration', decimalNode),
        ]),
      ),
      field('education', recordNode(educationIds, dreamEducationNode)),
      field(
        'timers',
        recordNode(canonicalDreamTimerKeySet, numberNode, true),
      ),
      field(
        'railgun',
        objectNode([
          field('firing', booleanNode),
          field('fireProgress', numberNode),
          field('pendingBaseSeconds', numberNode),
          field('pendingDreamSeconds', numberNode),
          field('shotsRemaining', numberNode),
          field('activeRailguns', numberNode),
          field('reservedPanels', integerDecimalNode),
          field('highestStoredPanels', integerDecimalNode),
          field('lastRoundsFired', numberNode),
          field('lastPanelsLaunched', integerDecimalNode),
        ]),
      ),
      field('resetCount', bigintNode),
      field('strangeMatter', integerDecimalNode),
      field('disasterStage', bigintNode),
      field('upgrades', recordNode(DREAM_UPGRADE_FLAGS, booleanNode)),
      field('huntersPerPurchase', integerDecimalNode),
      field('gatherersPerPurchase', integerDecimalNode),
    ]),
  ),
  field(
    'statistics',
    objectNode([
      field('trackedSinceUpdate', booleanNode),
      field('trackingStartedMarker', stringNode),
      field('trackedSimulatedSeconds', numberNode),
      field('lifetime', statisticsTotalsNode),
      field('currentQuantumRun', statisticsTotalsNode),
      field('recentProcessedSegment', statisticsTotalsNode),
      field(
        'lastCompletedCycle',
        objectNode([
          field('valid', booleanNode),
          field('breakInfinity', booleanNode),
          field('durationSeconds', numberNode),
          field('reward', integerDecimalNode),
          field('dreamCause', nullableStringNode),
        ]),
      ),
      field('minuteWindows', arrayNode(statisticsWindowNode, 60, true)),
      field('halfHourWindows', arrayNode(statisticsWindowNode, 48, true)),
      field('dailyWindows', arrayNode(statisticsWindowNode, 30, true)),
    ]),
  ),
])

export interface Schema13NumericPathClassification {
  readonly path: string
  readonly semanticClass: NumericSemanticClass
}

const mutableNumericPathInventory: Schema13NumericPathClassification[] = [
  { path: '$.modelVersion', semanticClass: 'bounded-number' },
]
collectNumericPathClassifications(
  stateNode,
  '$',
  mutableNumericPathInventory,
)
collectNumericPathClassifications(
  runtimeNode,
  '$.runtime',
  mutableNumericPathInventory,
)
mutableNumericPathInventory.sort((left, right) =>
  left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
)
if (
  new Set(mutableNumericPathInventory.map((entry) => entry.path)).size !==
  mutableNumericPathInventory.length
) {
  throw new Error('Schema 13 numeric path inventory contains duplicates.')
}
export const schema13NumericPathInventory = Object.freeze(
  mutableNumericPathInventory.map((entry) => Object.freeze(entry)),
)

const preferencesNode = objectNode([
  field('globalMute', booleanNode),
  field('screensaverEnabled', booleanNode),
  field('hidePurchased', booleanNode),
  field('buyMax', booleanNode),
  field(
    'numberFormatting',
    boundedNumberNode({ minimum: 0, maximum: 2, safeInteger: true }),
  ),
  field('skillsBuyOnTap', booleanNode),
  field(
    'frameRate',
    boundedNumberNode({ minimum: 0, maximum: 1_000, safeInteger: true }),
  ),
  field('botsButtonToggle', booleanNode),
  field('researchbuttonToggle', booleanNode),
  field('skillsButtonToggle', booleanNode),
  field('skillsFirstRunDone', booleanNode),
  field('infinityButtonToggle', booleanNode),
  field('infinityFirstRunDone', booleanNode),
  field('realityButtonToggle', booleanNode),
  field('realityFirstRun', booleanNode),
  field('simulationsButtonToggle', booleanNode),
  field('prestigeButtonToggle', booleanNode),
  field('prestigeFirstRun', booleanNode),
  field('settingsButtonToggle', booleanNode),
  field('firstReality', booleanNode),
])

const platformNode = objectNode([
  field('debugOptions', booleanNode),
  field('debugEverEnabled', booleanNode),
  field('cheater', booleanNode),
  field('unlockAllTabs', booleanNode),
])

const envelopeNode = objectNode([
  field(
    'schemaVersion',
    Object.freeze({
      kind: 'literal',
      value: SCHEMA13_WEB_SAVE_SCHEMA,
    }),
  ),
  field(
    'modelVersion',
    Object.freeze({
      kind: 'literal',
      value: SCHEMA13_GAME_MODEL_VERSION,
    }),
  ),
  field('savedAtUtc', stringNode),
  field('state', stateNode),
  field('runtime', runtimeNode),
])

export function encodeSchema13WebSave(
  source: Readonly<Schema13WebSaveSource>,
): string {
  const sourceProperties = requireDataProperties(source, '$.source')
  const savedAtUtc = requireDataProperty(
    sourceProperties,
    'savedAtUtc',
    '$.source',
  )
  const suppliedState = requireDataProperty(
    sourceProperties,
    'state',
    '$.source',
  ) as Readonly<CanonicalGameStateV2>
  const suppliedRuntime = requireDataProperty(
    sourceProperties,
    'runtime',
    '$.source',
  ) as Readonly<CanonicalRuntimeSidecarV2>
  const runtime = isValidatedCanonicalRuntimeSidecarV2(suppliedRuntime)
    ? suppliedRuntime
    : cloneCanonicalRuntimeSidecarV2(suppliedRuntime)
  assertCanonicalUtcTimestamp(savedAtUtc as string)
  const budget: CodecBudget = {
    containers: 0,
    entries: 0,
    seen: new Set<object>(),
  }
  const stateProperties = requireDataProperties(suppliedState, '$.source.state')
  const stateFields = (stateNode as Extract<SchemaNode, { kind: 'object' }>).fields
  const stateSource = Object.fromEntries(stateFields.map((entry) => [
    entry.name,
    requireDataProperty(stateProperties, entry.name, '$.source.state'),
  ]))
  const encodedState = transformBySchema(
    stateSource,
    stateNode,
    '$.state',
    'encode',
    budget,
    0,
  ) as WebSaveStateDtoV13
  // Persistence is a stricter trust boundary than the runtime's structural-
  // sharing marker. Runtime validation authorities are intentionally usable by
  // hot-path owners and therefore must never authorize a durable write by
  // identity alone. Validate the exact supplied graph on every encode; the
  // production checkpoint path already performs this work in its worker.
  assertValidCanonicalState(suppliedState)
  const encodedRuntime = transformBySchema(
    runtime,
    runtimeNode,
    '$.runtime',
    'encode',
    budget,
    0,
  ) as WebSaveRuntimeDtoV13
  const dto: WebSaveDtoV13 = {
    schemaVersion: SCHEMA13_WEB_SAVE_SCHEMA,
    modelVersion: SCHEMA13_GAME_MODEL_VERSION,
    savedAtUtc: savedAtUtc as string,
    state: encodedState,
    runtime: encodedRuntime,
  }
  const json = JSON.stringify(dto)
  const jsonBytes = strToU8(json)
  if (jsonBytes.byteLength > SCHEMA13_CODEC_LIMITS.inflatedJsonBytes) {
    throw new SaveImportLimitError(
      'inflated-binary',
      SCHEMA13_CODEC_LIMITS.inflatedJsonBytes,
    )
  }
  const compressed = gzipSync(jsonBytes, { level: 9, mtime: 0 })
  if (compressed.byteLength > SCHEMA13_CODEC_LIMITS.decodedPayloadBytes) {
    throw new SaveImportLimitError(
      'decoded-payload',
      SCHEMA13_CODEC_LIMITS.decodedPayloadBytes,
    )
  }
  const encoded = `${SCHEMA13_WEB_SAVE_PREFIX}${encodeBase64(compressed)}`
  assertSuppliedSaveTextLimit(encoded)
  return encoded
}

export function decodeSchema13WebSave(
  text: string,
): DecodedSchema13WebSave {
  if (typeof text !== 'string') {
    throw new TypeError('Schema 13 input must be IDSWEB1 text.')
  }
  assertSuppliedSaveTextLimit(text)
  const trimmed = text.trim()
  if (!trimmed.startsWith(SCHEMA13_WEB_SAVE_PREFIX)) {
    throw new Error('Schema 13 save must use the IDSWEB1 envelope.')
  }
  const payload = trimmed.slice(SCHEMA13_WEB_SAVE_PREFIX.length)
  if (payload.length === 0) {
    throw new Error('Schema 13 IDSWEB1 payload is empty.')
  }
  const compressed = decodeBase64Bounded(
    payload,
    SCHEMA13_CODEC_LIMITS.decodedPayloadBytes,
    'IDSWEB1 schema 13',
  )
  const jsonBytes = gunzipSchema13Bounded(compressed)
  let json: string
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes)
  } catch {
    throw new Error('Schema 13 contains invalid UTF-8 JSON.')
  }
  const parsed = parseBoundedJson(json)
  const decoded = transformBySchema(
    parsed,
    envelopeNode,
    '$',
    'decode',
    { containers: 0, entries: 0 },
    0,
  ) as Readonly<{
    savedAtUtc: string
    state: Omit<CanonicalGameStateV2, 'modelVersion'>
    runtime: CanonicalRuntimeSidecarV2
  }>
  assertCanonicalUtcTimestamp(decoded.savedAtUtc)
  const decodedState = Object.freeze({
    modelVersion: SCHEMA13_GAME_MODEL_VERSION,
    ...decoded.state,
  } satisfies CanonicalGameStateV2)
  assertValidCanonicalState(decodedState)
  admitValidatedCanonicalGameStateV2(
    STATE_VALIDATION_AUTHORITY,
    decodedState,
  )
  return Object.freeze({
    schemaVersion: SCHEMA13_WEB_SAVE_SCHEMA,
    modelVersion: SCHEMA13_GAME_MODEL_VERSION,
    savedAtUtc: decoded.savedAtUtc,
    state: decodedState,
    runtime: cloneCanonicalRuntimeSidecarV2(decoded.runtime),
  })
}

export function validateSchema13PresentationPreferences(
  input: unknown,
): Readonly<Schema13PresentationPreferences> {
  return Object.freeze(
    transformBySchema(
      input,
      preferencesNode,
      '$.preferences',
      'decode',
      { containers: 0, entries: 0 },
      0,
    ) as Schema13PresentationPreferences,
  )
}

export function validateSchema13PlatformState(
  input: unknown,
): Readonly<Schema13PlatformState> {
  return Object.freeze(
    transformBySchema(
      input,
      platformNode,
      '$.platform',
      'decode',
      { containers: 0, entries: 0 },
      0,
    ) as Schema13PlatformState,
  )
}

function collectNumericPathClassifications(
  node: SchemaNode,
  path: string,
  output: Schema13NumericPathClassification[],
): void {
  switch (node.kind) {
    case 'decimal':
      output.push({ path, semanticClass: 'ordinary-decimal' })
      return
    case 'integer-decimal':
      output.push({ path, semanticClass: 'integer-decimal' })
      return
    case 'bigint':
      output.push({ path, semanticClass: 'exact-bigint' })
      return
    case 'number':
      output.push({ path, semanticClass: 'bounded-number' })
      return
    case 'enum':
      if (node.values.length > 0 && node.values.every((value) => typeof value === 'number')) {
        output.push({ path, semanticClass: 'bounded-number' })
      }
      return
    case 'tuple':
      node.entries.forEach((entry, index) =>
        collectNumericPathClassifications(entry, `${path}.${index}`, output),
      )
      return
    case 'array':
      if (node.inventoryWildcard === true || node.length === undefined) {
        collectNumericPathClassifications(node.entry, `${path}.*`, output)
      } else {
        for (let index = 0; index < node.length; index += 1) {
          collectNumericPathClassifications(
            node.entry,
            `${path}.${index}`,
            output,
          )
        }
      }
      return
    case 'object':
      if (node.inventoryWildcard === true) {
        const representative = node.fields[0]?.node
        if (
          representative === undefined ||
          node.fields.some((entry) => entry.node !== representative)
        ) {
          throw new Error(
            'Schema 13 wildcard records must use one shared field schema.',
          )
        }
        collectNumericPathClassifications(
          representative,
          `${path}.*`,
          output,
        )
        return
      }
      for (const entry of node.fields) {
        collectNumericPathClassifications(
          entry.node,
          `${path}.${entry.name}`,
          output,
        )
      }
      return
    case 'boolean':
    case 'string':
    case 'nullable-string':
    case 'literal':
      return
  }
}

function transformBySchema(
  value: unknown,
  node: SchemaNode,
  path: string,
  direction: CodecDirection,
  budget: CodecBudget,
  depth: number,
): unknown {
  if (depth > SCHEMA13_CODEC_LIMITS.maximumDepth) {
    throw new Error('Schema 13 exceeds the maximum decode depth.')
  }
  switch (node.kind) {
    case 'decimal':
      return transformDecimal(value, path, direction, false)
    case 'integer-decimal':
      return transformDecimal(value, path, direction, true)
    case 'bigint':
      return transformBigInt(value, path, direction)
    case 'number':
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        Object.is(value, -0)
      ) {
        throw new TypeError(`${path} must be a finite non-negative number.`)
      }
      if (node.safeInteger === true && !Number.isSafeInteger(value)) {
        throw new TypeError(`${path} must be a safe integer.`)
      }
      if (node.minimum !== undefined && value < node.minimum) {
        throw new RangeError(`${path} is below its supported minimum.`)
      }
      if (
        node.exclusiveMinimum !== undefined &&
        value <= node.exclusiveMinimum
      ) {
        throw new RangeError(`${path} must be greater than its minimum.`)
      }
      if (node.maximum !== undefined && value > node.maximum) {
        throw new RangeError(`${path} exceeds its supported maximum.`)
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new TypeError(`${path} must be a boolean.`)
      }
      return value
    case 'string':
      assertBoundedString(value, path)
      return value
    case 'nullable-string':
      if (value === null) return null
      assertBoundedString(value, path)
      return value
    case 'literal':
      if (value !== node.value) {
        throw new TypeError(`${path} has an unsupported literal value.`)
      }
      return value
    case 'enum':
      if (
        (typeof value === 'number' && Object.is(value, -0)) ||
        !node.values.includes(value as string | number)
      ) {
        throw new TypeError(`${path} has an unsupported enum value.`)
      }
      return value
    case 'array': {
      const entries = requireDataArray(value, path)
      registerContainerValue(entries, budget, path, direction)
      if (node.length !== undefined && entries.length !== node.length) {
        throw new TypeError(`${path} has an invalid array length.`)
      }
      consumeContainerBudget(entries.length, budget)
      const output = entries.map((entry, index) =>
        transformBySchema(
          entry,
          node.entry,
          `${path}[${index}]`,
          direction,
          budget,
          depth + 1,
        ),
      )
      return direction === 'decode' ? Object.freeze(output) : output
    }
    case 'tuple': {
      const values = requireDataArray(value, path)
      registerContainerValue(values, budget, path, direction)
      if (values.length !== node.entries.length) {
        throw new TypeError(`${path} must be a declared tuple.`)
      }
      consumeContainerBudget(values.length, budget)
      const output = node.entries.map((entry, index) =>
        transformBySchema(
          values[index],
          entry,
          `${path}[${index}]`,
          direction,
          budget,
          depth + 1,
        ),
      )
      return direction === 'decode' ? Object.freeze(output) : output
    }
    case 'object': {
      const properties = requireDataProperties(value, path)
      registerContainerValue(value as object, budget, path, direction)
      const actualKeys = Object.keys(properties)
      if (actualKeys.some(isPrototypePollutingKey)) {
        throw new TypeError(`${path} contains a forbidden object key.`)
      }
      if (actualKeys.some((key) => !node.allowedNames.has(key))) {
        throw new TypeError(`${path} contains undeclared fields.`)
      }
      const output: Record<string, unknown> = {}
      consumeContainerBudget(actualKeys.length, budget)
      for (const entry of node.fields) {
        output[entry.name] = transformBySchema(
          requireDataProperty(properties, entry.name, path),
          entry.node,
          `${path}.${entry.name}`,
          direction,
          budget,
          depth + 1,
        )
      }
      return direction === 'decode' ? Object.freeze(output) : output
    }
  }
}

function transformDecimal(
  value: unknown,
  path: string,
  direction: CodecDirection,
  integer: boolean,
): GameDecimal | string {
  if (direction === 'encode') {
    if (!isGameDecimal(value)) {
      throw new TypeError(`${path} must be a branded GameDecimal.`)
    }
    if (integer && !isIntegerGameDecimal(value)) {
      throw new RangeError(`${path} must be an integer-valued GameDecimal.`)
    }
    return gameDecimalToCanonicalString(value)
  }
  if (typeof value !== 'string') {
    throw new TypeError(`${path} must contain a canonical Decimal string.`)
  }
  if (value.length > SCHEMA13_CODEC_LIMITS.decimalCharacters) {
    throw new RangeError(`${path} exceeds the Decimal string limit.`)
  }
  return integer
    ? integerGameDecimalFromCanonicalString(value)
    : gameDecimalFromCanonicalString(value)
}

function transformBigInt(
  value: unknown,
  path: string,
  direction: CodecDirection,
): bigint | string {
  const encoded = direction === 'encode'
    ? typeof value === 'bigint' && value >= 0n
      ? value.toString()
      : null
    : value
  if (typeof encoded !== 'string') {
    throw new TypeError(`${path} must contain a non-negative exact bigint.`)
  }
  if (
    encoded.length > SCHEMA13_CODEC_LIMITS.bigintDigits ||
    !/^(0|[1-9][0-9]*)$/.test(encoded)
  ) {
    throw new RangeError(`${path} has a noncanonical bigint string.`)
  }
  return direction === 'encode' ? encoded : BigInt(encoded)
}

function assertBoundedString(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${path} must be a string.`)
  }
  if (value.length > SCHEMA13_CODEC_LIMITS.maximumStringCodeUnits) {
    throw new RangeError(`${path} exceeds the string length limit.`)
  }
}

function requireDataProperties(
  value: unknown,
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a closed object.`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(value).some((key) => {
      if (typeof key !== 'string') return true
      const descriptor = descriptors[key]
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      )
    })
  ) {
    throw new TypeError(
      `${path} must contain enumerable string data properties only.`,
    )
  }
  return descriptors
}

function requireDataProperty(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  name: string,
  path: string,
): unknown {
  const descriptor = properties[name]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${path} is missing a declared field.`)
  }
  return descriptor.value
}

function requireDataArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
  if (
    lengthDescriptor === undefined ||
    !('value' in lengthDescriptor) ||
    typeof lengthDescriptor.value !== 'number'
  ) {
    throw new TypeError(`${path} must be a dense data-only array.`)
  }
  const length = lengthDescriptor.value
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== length + 1 ||
    ownKeys.some((key) => {
      if (key === 'length') return false
      if (typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(key)) {
        return true
      }
      const index = Number(key)
      const descriptor = descriptors[key]
      return (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= length ||
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      )
    })
  ) {
    throw new TypeError(`${path} must be a dense data-only array.`)
  }
  return Array.from(
    { length },
    (_, index) => descriptors[String(index)]!.value,
  )
}

function consumeContainerBudget(
  entries: number,
  budget: CodecBudget,
): void {
  budget.containers += 1
  budget.entries += entries
  if (budget.containers > SCHEMA13_CODEC_LIMITS.maximumContainers) {
    throw new Error('Schema 13 exceeds the maximum container count.')
  }
  if (budget.entries > SCHEMA13_CODEC_LIMITS.maximumEntries) {
    throw new Error('Schema 13 exceeds the maximum entry count.')
  }
}

function registerContainerValue(
  value: object,
  budget: CodecBudget,
  path: string,
  direction: CodecDirection,
): void {
  if (direction !== 'encode' || budget.seen === undefined) return
  if (budget.seen.has(value)) {
    throw new TypeError(`${path} must be an unaliased acyclic tree.`)
  }
  budget.seen.add(value)
}

function assertCanonicalUtcTimestamp(value: string): void {
  assertBoundedString(value, '$.savedAtUtc')
  const milliseconds = Date.parse(value)
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new RangeError('Schema 13 savedAtUtc must be a canonical UTC timestamp.')
  }
}

function assertValidCanonicalState(
  state: Readonly<CanonicalGameStateV2>,
): void {
  const result = validateCanonicalGameStateV2(state)
  if (!result.valid) {
    throw new Error(`Schema 13 state failed V2 validation: ${result.errors.join(' ')}`)
  }
}

function isPrototypePollutingKey(value: string): boolean {
  return (
    value === '__proto__' ||
    value === 'constructor' ||
    value === 'prototype'
  )
}

function encodeBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function gunzipSchema13Bounded(compressed: Uint8Array): Uint8Array {
  if (
    compressed.byteLength < 18 ||
    compressed[0] !== 0x1f ||
    compressed[1] !== 0x8b
  ) {
    throw new Error('Schema 13 IDSWEB1 payload is not valid gzip data.')
  }
  const advertisedBytes = new DataView(
    compressed.buffer,
    compressed.byteOffset + compressed.byteLength - 4,
    4,
  ).getUint32(0, true)
  if (advertisedBytes > SCHEMA13_CODEC_LIMITS.inflatedJsonBytes) {
    throw new SaveImportLimitError(
      'inflated-binary',
      SCHEMA13_CODEC_LIMITS.inflatedJsonBytes,
    )
  }
  const output = new Uint8Array(advertisedBytes)
  let emittedBytes = 0
  const gunzip = new Gunzip((chunk) => {
    const nextEmittedBytes = emittedBytes + chunk.byteLength
    if (
      chunk.byteLength > MAXIMUM_GZIP_CALLBACK_BYTES ||
      nextEmittedBytes > SCHEMA13_CODEC_LIMITS.inflatedJsonBytes
    ) {
      throw new SaveImportLimitError(
        'inflated-binary',
        SCHEMA13_CODEC_LIMITS.inflatedJsonBytes,
      )
    }
    if (nextEmittedBytes > advertisedBytes) {
      throw new Error('Schema 13 gzip output exceeds its advertised size.')
    }
    output.set(chunk, emittedBytes)
    emittedBytes = nextEmittedBytes
  })
  for (
    let offset = 0;
    offset < compressed.byteLength;
    offset += GZIP_INPUT_CHUNK_BYTES
  ) {
    const end = Math.min(
      compressed.byteLength,
      offset + GZIP_INPUT_CHUNK_BYTES,
    )
    gunzip.push(
      compressed.subarray(offset, end),
      end === compressed.byteLength,
    )
  }
  if (emittedBytes !== advertisedBytes) {
    throw new Error('Schema 13 gzip output size does not match its trailer.')
  }
  assertGzipTrailerIntegrity(
    compressed,
    output,
    'Schema 13 IDSWEB1 payload',
  )
  return output
}

function parseBoundedJson(text: string): unknown {
  let index = 0
  const budget: CodecBudget = { containers: 0, entries: 0 }
  const numberPattern =
    /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y

  function skipWhitespace(): void {
    while (
      text[index] === ' ' ||
      text[index] === '\n' ||
      text[index] === '\r' ||
      text[index] === '\t'
    ) {
      index += 1
    }
  }

  function parseString(): string {
    const start = index
    let containsEscape = false
    index += 1
    while (index < text.length) {
      const code = text.charCodeAt(index)
      if (text[index] === '"') {
        index += 1
        if (!containsEscape) {
          const value = text.slice(start + 1, index - 1)
          assertBoundedString(value, 'Schema 13 JSON string')
          return value
        }
        let value: unknown
        try {
          value = JSON.parse(text.slice(start, index))
        } catch {
          throw new Error('Schema 13 contains invalid JSON string syntax.')
        }
        assertBoundedString(value, 'Schema 13 JSON string')
        return value
      }
      if (text[index] === '\\') {
        containsEscape = true
        index += 2
        continue
      }
      if (code <= 0x1f) {
        throw new Error('Schema 13 contains invalid JSON string syntax.')
      }
      index += 1
    }
    throw new Error('Schema 13 contains an unterminated JSON string.')
  }

  function parseNumber(): number {
    numberPattern.lastIndex = index
    const match = numberPattern.exec(text)
    if (match === null) {
      throw new Error('Schema 13 contains invalid JSON number syntax.')
    }
    index = numberPattern.lastIndex
    const value = Number(match[0])
    if (!Number.isFinite(value)) {
      throw new Error('Schema 13 JSON numbers must be finite.')
    }
    return value
  }

  function parseArray(depth: number): unknown[] {
    consumeContainerBudget(0, budget)
    index += 1
    skipWhitespace()
    const output: unknown[] = []
    if (text[index] === ']') {
      index += 1
      return output
    }
    while (true) {
      budget.entries += 1
      if (budget.entries > SCHEMA13_CODEC_LIMITS.maximumEntries) {
        throw new Error('Schema 13 exceeds the maximum entry count.')
      }
      output.push(parseValue(depth + 1))
      skipWhitespace()
      if (text[index] === ']') {
        index += 1
        return output
      }
      if (text[index] !== ',') {
        throw new Error('Schema 13 contains invalid JSON array syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseObject(depth: number): Record<string, unknown> {
    consumeContainerBudget(0, budget)
    index += 1
    skipWhitespace()
    const output: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >
    const keys = new Set<string>()
    if (text[index] === '}') {
      index += 1
      return output
    }
    while (true) {
      if (text[index] !== '"') {
        throw new Error('Schema 13 contains an invalid JSON object key.')
      }
      const key = parseString()
      if (keys.has(key)) {
        throw new Error('Schema 13 contains a duplicate-equivalent object key.')
      }
      if (isPrototypePollutingKey(key)) {
        throw new Error('Schema 13 contains a forbidden object key.')
      }
      keys.add(key)
      budget.entries += 1
      if (budget.entries > SCHEMA13_CODEC_LIMITS.maximumEntries) {
        throw new Error('Schema 13 exceeds the maximum entry count.')
      }
      skipWhitespace()
      if (text[index] !== ':') {
        throw new Error('Schema 13 contains invalid JSON object syntax.')
      }
      index += 1
      output[key] = parseValue(depth + 1)
      skipWhitespace()
      if (text[index] === '}') {
        index += 1
        return output
      }
      if (text[index] !== ',') {
        throw new Error('Schema 13 contains invalid JSON object syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseValue(depth: number): unknown {
    if (depth > SCHEMA13_CODEC_LIMITS.maximumDepth) {
      throw new Error('Schema 13 exceeds the maximum decode depth.')
    }
    skipWhitespace()
    const token = text[index]
    if (token === '"') return parseString()
    if (token === '{') return parseObject(depth)
    if (token === '[') return parseArray(depth)
    if (text.startsWith('true', index)) {
      index += 4
      return true
    }
    if (text.startsWith('false', index)) {
      index += 5
      return false
    }
    if (text.startsWith('null', index)) {
      index += 4
      return null
    }
    if (token === '-' || (token !== undefined && /[0-9]/.test(token))) {
      return parseNumber()
    }
    throw new Error('Schema 13 contains invalid JSON syntax.')
  }

  const result = parseValue(0)
  skipWhitespace()
  if (index !== text.length) {
    throw new Error('Schema 13 contains trailing JSON content.')
  }
  return result
}
