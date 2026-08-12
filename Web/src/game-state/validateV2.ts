import {
  isGameDecimal,
  isIntegerGameDecimal,
} from '../math/gameDecimal'
import { STORED_TIME_MAXIMUM_SECONDS } from '../simulation/timeResources'
import {
  canonicalFragmentSkillKeySet,
  canonicalDreamTimerKeySet,
  canonicalNumericFieldClassifications,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  canonicalSkillStateKeySet,
  plannedV2OnlyNumericClassifications,
  type NumericSemanticClass,
} from './numericFieldManifest'
import { DREAM_UPGRADE_FLAGS } from './types'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalGameStateV2,
} from './typesV2'
import { isSkillPresetColorId } from './skillPresetColors'

export interface CanonicalV2ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const FACILITY_IDS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const
const EDUCATION_IDS = [
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const
const TOP_LEVEL_KEYS = [
  'modelVersion',
  'meta',
  'dyson',
  'infinity',
  'skills',
  'research',
  'reality',
  'quantum',
  'avocado',
  'timeline',
  'secretProgress',
  'dream',
  'statistics',
] as const
const BOOLEAN_KEYS = new Set([
  'tutorialComplete', 'firstInfinityComplete', 'story', 'wiki', 'statistics',
  'roundedBulkBuy', 'inProgress', 'botCapTransitionPending',
  'botCapRewardsGranted', 'research', 'bots', 'owned',
  'autoAssignNonRefundable', 'autoGather', 'unlocked',
  'eventClockInitialized', 'infinityHasPostResetStart', 'enabled',
  'completed', 'communityBoostIsFree', 'active', 'complete', 'firing',
  'trackedSinceUpdate', 'valid', 'breakInfinity',
])
const DREAM_RESET_CAUSES = new Set([
  'Meteor',
  'ArtificialIntelligence',
  'GlobalWarming',
  'BlackHole',
])
const DREAM_DISASTER_STAGES = new Set([0n, 1n, 2n, 3n, 42n])

const intendedEntries = [
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
].filter((entry) => entry.intendedV2Path !== null)

function compilePathPattern(pattern: string): RegExp {
  const expression = pattern
    .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('\\*', '.+')
  return new RegExp(`^${expression}$`, 'u')
}

const exactIntendedClasses = new Map<string, NumericSemanticClass>()
const wildcardIntendedClasses: readonly Readonly<{
  readonly pattern: RegExp
  readonly semanticClass: NumericSemanticClass
}>[] = intendedEntries.flatMap((entry) => {
  const path = entry.intendedV2Path!
  if (!path.includes('*')) {
    exactIntendedClasses.set(path, entry.semanticClass)
    return []
  }
  return [{ pattern: compilePathPattern(path), semanticClass: entry.semanticClass }]
})

const researchLevelClasses = new Map(
  canonicalResearchLevelPolicies.map((policy) => [policy.key, policy.semanticClass]),
)

function expectedClass(path: string): NumericSemanticClass | undefined {
  if (path.startsWith('$.research.levelsById.')) {
    const id = path.slice('$.research.levelsById.'.length)
    return researchLevelClasses.get(id)
  }
  return exactIntendedClasses.get(path) ?? wildcardIntendedClasses.find((entry) =>
    entry.pattern.test(path)
  )?.semanticClass
}

function validateNumericLeaves(
  value: unknown,
  path: string,
  errors: string[],
  seen: Set<object>,
  graphStatus: { safe: boolean },
): void {
  const key = path.slice(path.lastIndexOf('.') + 1)
  const dynamicBoolean =
    /\.(?:enabledFacilities|enabledById|retainedFacilities|unlocks|upgrades)\..+$/u.test(path)
  if (typeof value === 'boolean') {
    if (!BOOLEAN_KEYS.has(key) && !dynamicBoolean) {
      errors.push(`${path} has an unexpected boolean value.`)
    }
    return
  }
  if (typeof value === 'string') {
    const stringValue =
      ['createdAtLegacyText', 'lastSuspendedAtLegacyText', 'dreamCause', 'trackingStartedMarker', 'name', 'colorId', 'buyMode'].includes(key) ||
      /\.(?:skillIds|activeAutoAssignment)\.\d+$/u.test(path)
    if (!stringValue) errors.push(`${path} has an unexpected string value.`)
    if (key === 'buyMode' && !['buy-1', 'buy-10', 'buy-50', 'buy-100', 'buy-max'].includes(value)) {
      errors.push(`${path} has an unsupported Buy mode.`)
    }
    if (key === 'dreamCause' && !DREAM_RESET_CAUSES.has(value)) {
      errors.push(`${path} has an unsupported Dream reset cause.`)
    }
    return
  }
  if (value === null) {
    if (!['createdAtLegacyText', 'lastSuspendedAtLegacyText', 'dreamCause'].includes(key)) {
      errors.push(`${path} must not be null.`)
    }
    return
  }
  const expected = expectedClass(path)
  if (isGameDecimal(value)) {
    if (expected !== 'ordinary-decimal' && expected !== 'integer-decimal') {
      errors.push(`${path} has an incompatible GameDecimal classification.`)
    } else if (expected === 'integer-decimal' && !isIntegerGameDecimal(value)) {
      errors.push(`${path} must be an integer-valued GameDecimal.`)
    }
    return
  }
  if (typeof value === 'number') {
    if (expected !== 'bounded-number') {
      errors.push(`${path} must not narrow through number.`)
    }
    if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
      errors.push(`${path} must be finite and non-negative.`)
    }
    return
  }
  if (typeof value === 'bigint') {
    if (expected !== 'exact-bigint') {
      errors.push(`${path} has an incompatible bigint classification.`)
    }
    if (value < 0n) errors.push(`${path} must be non-negative.`)
    return
  }
  if (typeof value !== 'object') {
    errors.push(`${path} has an unsupported primitive type.`)
    return
  }
  if (seen.has(value)) {
    errors.push(`${path} introduces a cycle or shared object identity.`)
    graphStatus.safe = false
    return
  }
  seen.add(value)
  const keys = Object.keys(value).sort()
  if (
    keys.length === 2 &&
    keys[0] === 'exponent' &&
    keys[1] === 'mantissa'
  ) {
    errors.push(`${path} must be a restored branded GameDecimal.`)
    return
  }
  if (Array.isArray(value)) {
    const ownKeys = Reflect.ownKeys(value)
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (
      ownKeys.some(
        (entry) =>
          typeof entry !== 'string' ||
          (entry !== 'length' && !/^(?:0|[1-9]\d*)$/u.test(entry)) ||
          (entry !== 'length' &&
            (descriptors[entry] === undefined ||
              !descriptors[entry].enumerable ||
              !('value' in descriptors[entry]))),
      ) ||
      Object.keys(value).length !== value.length
    ) {
      errors.push(`${path} must be a dense array without custom properties.`)
      graphStatus.safe = false
      return
    }
    value.forEach((entry, index) =>
      validateNumericLeaves(
        entry,
        `${path}.${index}`,
        errors,
        seen,
        graphStatus,
      ),
    )
    return
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    errors.push(`${path} must be a plain object.`)
    graphStatus.safe = false
    return
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(value).some((entry) => {
      if (typeof entry !== 'string') return true
      const descriptor = descriptors[entry]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    })
  ) {
    errors.push(`${path} must contain enumerable string data properties only.`)
    graphStatus.safe = false
    return
  }
  for (const [entryKey, descriptor] of Object.entries(descriptors)) {
    validateNumericLeaves(
      descriptor.value,
      `${path}.${entryKey}`,
      errors,
      seen,
      graphStatus,
    )
  }
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  path: string,
  errors: string[],
): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path} must be a closed object.`)
    return
  }
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.join('\0') !== wanted.join('\0')) {
    errors.push(`${path} must contain exactly the declared closed keys.`)
  }
}

function closedKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  errors: string[],
): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path} must be a closed object.`)
    return
  }
  const actual = Object.keys(value)
  const allowed = new Set([...required, ...optional])
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    actual.some((key) => !allowed.has(key))
  ) {
    errors.push(`${path} has missing or unknown fields.`)
  }
}

function validateSkillIdList(
  values: readonly string[] | undefined,
  path: string,
  errors: string[],
): void {
  if (!Array.isArray(values)) {
    errors.push(`${path} must be an array of canonical Skill IDs.`)
    return
  }
  const allowed = new Set(canonicalSkillStateKeySet)
  if (
    new Set(values).size !== values.length ||
    values.some((id) => !allowed.has(id))
  ) {
    errors.push(`${path} must contain unique canonical Skill IDs only.`)
  }
}

function validateCanonicalGameStateV2Unsafe(
  input: unknown,
): CanonicalV2ValidationResult {
  const errors: string[] = []
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze(['$ must be a canonical V2 object.']),
    })
  }
  const state = input as CanonicalGameStateV2
  const graphStatus = { safe: true }
  validateNumericLeaves(state, '$', errors, new Set(), graphStatus)
  if (!graphStatus.safe) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze(errors),
    })
  }
  exactKeys(state, TOP_LEVEL_KEYS, '$', errors)
  if (state.modelVersion !== 2) errors.push('V2 modelVersion must be exactly 2.')
  closedKeys(state.dyson, ['money', 'science', 'bots', 'workers', 'researchers', 'facilities', 'manualCreationIntervalSeconds', 'totalPanelsDecayed', 'goalStage', 'botDistribution', 'automation'], [], '$.dyson', errors)
  closedKeys(state.infinity, ['availablePoints', 'allocatedPoints', 'breakTarget', 'inProgress', 'botCapTransitionPending', 'botCapRewardsGranted', 'lastCycleDurationSeconds', 'lastPointsGained', 'storedTimeUsedThisCycleSeconds', 'storedTimeUsedPreviousCycleSeconds', 'secretsOfTheUniverse', 'permanentSkillPoints', 'retainedFacilities', 'automationUnlocked'], [], '$.infinity', errors)
  closedKeys(state.skills, ['points', 'fragments', 'byId', 'activeAutoAssignment', 'selectedPreset', 'presets', 'autoAssignNonRefundable', 'tabPresetAutomation'], [], '$.skills', errors)
  closedKeys(state.research, ['levelsById', 'progressById', 'automation'], [], '$.research', errors)
  closedKeys(state.reality, ['universeDesignationCount', 'workersReady', 'workerGenerationProgress', 'influence', 'autoGather'], [], '$.reality', errors)
  closedKeys(state.quantum, ['availableShards', 'lifetimeEarnedShards', 'divisionsPurchased', 'permanentSecrets', 'influenceSpeedBonus', 'cashBonusLevels', 'scienceBonusLevels', 'unlocks'], [], '$.quantum', errors)
  closedKeys(state.avocado, ['unlocked', 'infinityPoints', 'influence', 'strangeMatter', 'overflowMultiplier'], [], '$.avocado', errors)
  closedKeys(state.timeline, ['eventClockInitialized', 'automationTimeUntilNextEvent', 'dysonAutomationTargetIndex', 'researchAutomationTargetIndex', 'infinityBoundaryRemaining', 'infinityCycleSeconds', 'infinityCycleStartingPoints', 'infinityHasPostResetStart', 'storedTimeAvailableSeconds', 'storedTimeCapacitySeconds', 'lastSuspendedAtLegacyText', 'doubleTime'], [], '$.timeline', errors)
  closedKeys(state.secretProgress, ['completed', 'step'], [], '$.secretProgress', errors)
  closedKeys(state.dream, ['resources', 'parameters', 'education', 'timers', 'railgun', 'resetCount', 'strangeMatter', 'disasterStage', 'upgrades', 'huntersPerPurchase', 'gatherersPerPurchase'], [], '$.dream', errors)
  closedKeys(state.statistics, ['trackedSinceUpdate', 'trackingStartedMarker', 'trackedSimulatedSeconds', 'lifetime', 'currentQuantumRun', 'recentProcessedSegment', 'lastCompletedCycle', 'minuteWindows', 'halfHourWindows', 'dailyWindows'], [], '$.statistics', errors)
  exactKeys(state.meta, ['createdAtLegacyText', 'tutorialComplete', 'firstInfinityComplete', 'navigationVisibility'], '$.meta', errors)
  exactKeys(state.meta?.navigationVisibility, ['story', 'wiki', 'statistics'], '$.meta.navigationVisibility', errors)
  exactKeys(state.dyson?.automation, ['buyMode', 'roundedBulkBuy', 'enabledFacilities'], '$.dyson.automation', errors)
  exactKeys(state.infinity?.retainedFacilities, ['assembly_lines', 'ai_managers', 'servers', 'data_centers', 'planets'], '$.infinity.retainedFacilities', errors)
  exactKeys(state.infinity?.automationUnlocked, ['research', 'bots'], '$.infinity.automationUnlocked', errors)
  exactKeys(state.skills?.tabPresetAutomation, ['bots', 'research'], '$.skills.tabPresetAutomation', errors)
  exactKeys(state.research?.automation, ['buyMode', 'roundedBulkBuy', 'enabledById'], '$.research.automation', errors)
  exactKeys(state.quantum?.unlocks, ['botMultitasking', 'doubleInfinityPoints', 'breakTheLoop', 'quantumEntanglement', 'automation', 'fragments', 'purity', 'terra', 'power', 'paragade', 'stellar', 'matrioshkaBrains', 'birchPlanets', 'galacticBrains'], '$.quantum.unlocks', errors)
  exactKeys(state.timeline?.doubleTime, ['unlocked', 'enabled', 'bankSeconds', 'rate'], '$.timeline.doubleTime', errors)
  exactKeys(state.dream?.resources, ['hunters', 'gatherers', 'community', 'housing', 'villages', 'workers', 'cities', 'factories', 'bots', 'rockets', 'energy', 'spaceFactories', 'dysonPanels', 'railgunCharge', 'solarPanels', 'fusion', 'swarmPanels'], '$.dream.resources', errors)
  exactKeys(state.dream?.parameters, ['hunterCost', 'gathererCost', 'communityBoostCost', 'communityBoostIsFree', 'communityBoostClock', 'communityBoostDuration', 'factoriesBoostCost', 'factoriesBoostClock', 'factoriesBoostDuration', 'rocketsPerSpaceFactory', 'railgunMaxCharge', 'solarCost', 'solarPanelGeneration', 'fusionCost', 'fusionGeneration', 'swarmPanelGeneration'], '$.dream.parameters', errors)
  exactKeys(state.dream?.railgun, ['firing', 'fireProgress', 'pendingBaseSeconds', 'pendingDreamSeconds', 'shotsRemaining', 'activeRailguns', 'reservedPanels', 'highestStoredPanels', 'lastRoundsFired', 'lastPanelsLaunched'], '$.dream.railgun', errors)
  for (const id of EDUCATION_IDS) exactKeys(state.dream?.education?.[id], ['active', 'complete', 'progress', 'researchTime', 'cost'], `$.dream.education.${id}`, errors)
  const totalKeys = ['ordinaryInfinityCount', 'breakInfinityCount', 'ordinaryInfinityPoints', 'breakInfinityPoints', 'botCapInfinityPoints', 'botCapOverflowRewards', 'meteorDreamResets', 'aiDreamResets', 'globalWarmingDreamResets', 'blackHoleDreamResets', 'strangeMatter', 'realityWorkers', 'automaticInfluence', 'manualInfluence', 'realityCapacityStallSeconds', 'simulatedSeconds'] as const
  for (const root of ['lifetime', 'currentQuantumRun', 'recentProcessedSegment'] as const) exactKeys(state.statistics?.[root], totalKeys, `$.statistics.${root}`, errors)
  exactKeys(state.statistics?.lastCompletedCycle, ['valid', 'breakInfinity', 'durationSeconds', 'reward', 'dreamCause'], '$.statistics.lastCompletedCycle', errors)
  const windowKeys = ['sequence', 'simulatedSeconds', 'infinityCount', 'infinityPoints', 'dreamResetCount', 'strangeMatter', 'realityWorkers'] as const
  for (const root of ['minuteWindows', 'halfHourWindows', 'dailyWindows'] as const) for (const [index, window] of (state.statistics?.[root] ?? []).entries()) exactKeys(window, windowKeys, `$.statistics.${root}.${index}`, errors)
  for (const id of FACILITY_IDS) if (!Array.isArray(state.dyson?.facilities?.[id]) || state.dyson.facilities[id].length !== 2) errors.push(`$.dyson.facilities.${id} must be a two-slot tuple.`)
  exactKeys(state.dyson?.facilities, FACILITY_IDS, '$.dyson.facilities', errors)
  exactKeys(
    state.dyson?.automation?.enabledFacilities,
    FACILITY_IDS,
    '$.dyson.automation.enabledFacilities',
    errors,
  )
  exactKeys(state.skills?.byId, canonicalSkillStateKeySet, '$.skills.byId', errors)
  for (const [id, skill] of Object.entries(state.skills?.byId ?? {})) {
    exactKeys(skill, ['owned', 'level', 'timerSeconds', 'secondaryTimerSeconds'], `$.skills.byId.${id}`, errors)
  }
  validateSkillIdList(
    state.skills?.activeAutoAssignment,
    '$.skills.activeAutoAssignment',
    errors,
  )
  for (const [index, preset] of (state.skills?.presets ?? []).entries()) {
    exactKeys(preset, ['name', 'skillIds', 'botDistribution', 'colorId'], `$.skills.presets.${index}`, errors)
    validateSkillIdList(preset.skillIds, `$.skills.presets.${index}.skillIds`, errors)
  }
  exactKeys(
    state.research?.levelsById,
    canonicalResearchKeySet,
    '$.research.levelsById',
    errors,
  )
  exactKeys(
    state.research?.progressById,
    canonicalResearchKeySet,
    '$.research.progressById',
    errors,
  )
  exactKeys(
    state.research?.automation?.enabledById,
    canonicalResearchKeySet,
    '$.research.automation.enabledById',
    errors,
  )
  exactKeys(state.dream?.timers, canonicalDreamTimerKeySet, '$.dream.timers', errors)
  exactKeys(state.dream?.education, EDUCATION_IDS, '$.dream.education', errors)
  exactKeys(state.dream?.upgrades, DREAM_UPGRADE_FLAGS, '$.dream.upgrades', errors)

  if (state.skills?.presets?.length !== 5) {
    errors.push('Skills must contain exactly five presets.')
  }
  if (!Number.isInteger(state.skills?.selectedPreset) || state.skills.selectedPreset < 1 || state.skills.selectedPreset > 5) {
    errors.push('Selected Skill preset must be an integer from 1 to 5.')
  }
  for (const [index, preset] of (state.skills?.presets ?? []).entries()) {
    if (!isSkillPresetColorId(preset.colorId)) errors.push(`Skill preset ${index + 1} has an invalid color.`)
    if (preset.botDistribution < 0 || preset.botDistribution > 1) errors.push(`Skill preset ${index + 1} bot distribution must be in [0, 1].`)
  }
  if (state.dyson?.botDistribution < 0 || state.dyson?.botDistribution > 1) {
    errors.push('Dyson bot distribution must be in [0, 1].')
  }
  if (!(state.dyson?.manualCreationIntervalSeconds > 0)) {
    errors.push('Dyson manual creation interval must be greater than zero.')
  }
  for (const slot of [state.skills?.tabPresetAutomation?.bots, state.skills?.tabPresetAutomation?.research]) {
    if (!Number.isInteger(slot) || slot! < 0 || slot! > 5) errors.push('Skill preset automation slots must be integers from 0 to 5.')
  }
  if (!Number.isSafeInteger(state.timeline?.dysonAutomationTargetIndex) || state.timeline.dysonAutomationTargetIndex < 0 || state.timeline.dysonAutomationTargetIndex > 7) errors.push('Dyson automation target index must be from 0 to 7.')
  if (!Number.isSafeInteger(state.timeline?.researchAutomationTargetIndex) || state.timeline.researchAutomationTargetIndex < 0 || state.timeline.researchAutomationTargetIndex >= canonicalResearchKeySet.length) errors.push('Research automation target index must select a closed Research ID.')
  if (!Number.isInteger(state.timeline?.doubleTime?.rate) || state.timeline.doubleTime.rate < 0 || state.timeline.doubleTime.rate > 10) errors.push('Double Time rate must be from 0 to 10.')
  if (!(state.timeline?.storedTimeCapacitySeconds > 0) || state.timeline.storedTimeCapacitySeconds > STORED_TIME_MAXIMUM_SECONDS) errors.push('Stored-time capacity must be greater than zero and no greater than 42000000 seconds.')
  if (state.timeline?.storedTimeAvailableSeconds > state.timeline?.storedTimeCapacitySeconds) errors.push('Stored time available must not exceed stored-time capacity.')
  if (state.timeline?.doubleTime?.bankSeconds > STORED_TIME_MAXIMUM_SECONDS) errors.push('Double Time bank must not exceed 42000000 seconds.')
  if (state.reality?.workerGenerationProgress < 0 || state.reality?.workerGenerationProgress >= 1) errors.push('Reality worker generation progress must be in [0, 1).')
  if (!Number.isInteger(state.dream?.railgun?.shotsRemaining) || state.dream.railgun.shotsRemaining < 0 || state.dream.railgun.shotsRemaining > 10) errors.push('Railgun shots remaining must be from 0 to 10.')
  if (!Number.isFinite(state.dream?.railgun?.pendingBaseSeconds) || state.dream.railgun.pendingBaseSeconds < 0 || Object.is(state.dream.railgun.pendingBaseSeconds, -0)) errors.push('Pending railgun base seconds must be finite and non-negative.')
  if (!Number.isFinite(state.dream?.railgun?.pendingDreamSeconds) || state.dream.railgun.pendingDreamSeconds < state.dream.railgun.pendingBaseSeconds || Object.is(state.dream.railgun.pendingDreamSeconds, -0)) errors.push('Pending railgun Dream seconds must be finite and at least pending base seconds.')
  if (!Number.isSafeInteger(state.dream?.railgun?.activeRailguns) || state.dream.railgun.activeRailguns < 0) errors.push('Active railguns must be a non-negative safe integer.')
  if (!Number.isSafeInteger(state.dream?.railgun?.lastRoundsFired) || state.dream.railgun.lastRoundsFired < 0 || state.dream.railgun.lastRoundsFired > 110) errors.push('Last railgun rounds fired must be from 0 to 110.')
  if (!Number.isSafeInteger(state.secretProgress?.step) || state.secretProgress.step < 0 || state.secretProgress.step > 7) errors.push('Secret progress step must be from 0 to 7.')
  if (state.statistics?.minuteWindows?.length !== 60) {
    errors.push('Statistics must contain exactly 60 minute windows.')
  }
  if (state.statistics?.halfHourWindows?.length !== 48) {
    errors.push('Statistics must contain exactly 48 half-hour windows.')
  }
  if (state.statistics?.dailyWindows?.length !== 30) {
    errors.push('Statistics must contain exactly 30 daily windows.')
  }
  if (state.infinity?.secretsOfTheUniverse > 27n) {
    errors.push('Secrets of the Universe exceeds 27.')
  }
  if (state.infinity?.permanentSkillPoints > 10n) {
    errors.push('Permanent Skill rank exceeds 10.')
  }
  if (state.quantum?.divisionsPurchased > 19n) {
    errors.push('Quantum Divisions exceeds 19.')
  }
  if (state.quantum?.permanentSecrets > 27n) {
    errors.push('Permanent Quantum Secrets exceeds 27.')
  }
  if (typeof state.dyson?.goalStage === 'bigint' && state.dyson.goalStage > 10n) {
    errors.push('Dyson goal stage must be from 0 through 10.')
  }
  if (
    typeof state.reality?.workersReady === 'bigint' &&
    state.reality.workersReady > REALITY_WORKERS_READY_MAXIMUM_V2
  ) {
    errors.push('Reality workers ready exceeds the authored batch size 128.')
  }
  if (typeof state.dream?.disasterStage === 'bigint' && !DREAM_DISASTER_STAGES.has(state.dream.disasterStage)) {
    errors.push('Dream disaster stage must be 0, 1, 2, 3, or 42.')
  }
  const skillState = state.skills?.byId
  if (
    typeof state.skills?.fragments === 'bigint' &&
    skillState !== null &&
    typeof skillState === 'object' &&
    !Array.isArray(skillState)
  ) {
    const expectedFragments = BigInt(
      canonicalFragmentSkillKeySet.filter(
        (id) => skillState[id]?.owned === true,
      ).length,
    )
    if (state.skills.fragments !== expectedFragments) {
      errors.push(
        `Skill fragments must equal the owned fragment Skill count (${expectedFragments.toString()}).`,
      )
    }
  }
  for (const policy of canonicalResearchLevelPolicies) {
    if (policy.semanticClass === 'exact-bigint') {
      const levels = state.research?.levelsById as
        | Readonly<Record<string, unknown>>
        | undefined
      const level = levels?.[policy.key]
      if (typeof level === 'bigint' && level > 1n) {
        errors.push(`Research '${policy.key}' exceeds its one-level cap.`)
      }
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  })
}

export function validateCanonicalGameStateV2(
  input: unknown,
): CanonicalV2ValidationResult {
  try {
    return validateCanonicalGameStateV2Unsafe(input)
  } catch {
    return Object.freeze({
      valid: false,
      errors: Object.freeze([
        'CanonicalGameStateV2 contains a malformed or hostile graph.',
      ]),
    })
  }
}
