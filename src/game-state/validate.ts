import { validateInfinityChallenges } from '../simulation/infinityChallenges'
import {
  isNonNegativeInteger,
  isSafeNonNegativeInteger,
} from '../core/finiteNonNegativeNumber'
import {
  isProcessingSource,
  isStoredTimeAccuracyPreset,
  type CanonicalGameStateV1,
} from './types'
import { isSkillPresetColorId } from './skillPresetColors'
import { isDiscoverableNavigationDestinationId } from './navigationPreferences'

export interface CanonicalValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export function validateCanonicalGameState(
  state: CanonicalGameStateV1,
): CanonicalValidationResult {
  const errors: string[] = []
  const challengeError = validateInfinityChallenges(state.challenges)
  if (challengeError) errors.push(challengeError)
  if (state.challenges?.active === 'blank-slate' && Object.values(state.skills.byId).some(skill => skill.owned)) {
    errors.push('Blank Slate cannot contain owned skills.')
  }
  const overflowPoints = state.avocado.overflowPoints
  if (overflowPoints !== undefined &&
    (typeof overflowPoints !== 'bigint' || overflowPoints < 0n || overflowPoints > 9_223_372_036_854_775_807n)) {
    errors.push('Overflow Points must be a non-negative Int64 balance.')
  }
  validateNumericGraph(state, '$', errors, new Set())
  if (state.modelVersion !== 1) {
    errors.push(`Unsupported canonical model version ${state.modelVersion}.`)
  }
  for (const [id, visible] of Object.entries(
    state.meta.navigationVisibility ?? {},
  )) {
    if (id.trim().length === 0 || typeof visible !== 'boolean') {
      errors.push('Bottom navigation visibility entries must use non-blank IDs and boolean values.')
    }
  }
  const routeDiscovery = state.meta.navigationRouteDiscovery
  if (routeDiscovery !== undefined) {
    const knownRoutes = new Set(routeDiscovery.knownRoutes)
    if (
      knownRoutes.size !== routeDiscovery.knownRoutes.length ||
      routeDiscovery.knownRoutes.some(
        (route) => !isDiscoverableNavigationDestinationId(route),
      )
    ) {
      errors.push('Navigation discovery must contain unique supported known routes.')
    }
    if (
      new Set(routeDiscovery.unvisitedRoutes).size !==
        routeDiscovery.unvisitedRoutes.length ||
      routeDiscovery.unvisitedRoutes.some(
        (route) => !knownRoutes.has(route),
      )
    ) {
      errors.push('Unvisited navigation routes must be unique known routes.')
    }
  }
  if (state.skills.presets.length !== 5) {
    errors.push('Skills must contain exactly five presets.')
  }
  state.skills.presets.forEach((preset, index) => {
    if (!isSkillPresetColorId(preset.colorId)) {
      errors.push(
        `Skill preset ${index + 1} has an unsupported color '${String(preset.colorId)}'.`,
      )
    }
  })
  for (const [tab, slot] of Object.entries(
    state.skills.tabPresetAutomation,
  )) {
    if (!isNonNegativeInteger(slot) || slot > 5) {
      errors.push(
        `Skill preset automation for '${tab}' must be an integer from 0 to 5.`,
      )
    }
  }
  if (
    !Number.isInteger(state.timeline.dysonAutomationTargetIndex) ||
    state.timeline.dysonAutomationTargetIndex > 7
  ) {
    errors.push('Dyson automation target index must be an integer from 0 to 7.')
  }
  if (!Number.isInteger(state.timeline.researchAutomationTargetIndex)) {
    errors.push('Research automation target index must be an integer.')
  }
  if (
    !Number.isInteger(state.timeline.doubleTime.rate) ||
    state.timeline.doubleTime.rate > 10
  ) {
    errors.push('Double Time rate must be an integer from 0 to 10.')
  }
  if (
    state.timeline.processing.rewriteMigrated !== true ||
    !Number.isInteger(
      state.timeline.processing.activeIntervalMilliseconds,
    ) ||
    state.timeline.processing.activeIntervalMilliseconds < 33 ||
    state.timeline.processing.activeIntervalMilliseconds > 200
  ) {
    errors.push('Game processing interval must be an integer from 33 to 200 milliseconds.')
  }
  if (
    !isStoredTimeAccuracyPreset(
      state.timeline.processing.storedTimePreset,
    )
  ) {
    errors.push('Stored Time accuracy preset is invalid.')
  }
  if (
    state.reality.workerGenerationProgress < 0 ||
    state.reality.workerGenerationProgress >= 1
  ) {
    errors.push('Reality worker generation progress must be in [0, 1).')
  }
  if (
    !Number.isInteger(state.dream.railgun.shotsRemaining) ||
    state.dream.railgun.shotsRemaining > 10
  ) {
    errors.push('Railgun shots remaining must be an integer from 0 to 10.')
  }
  if (
    state.dream.railgun.activeRailguns !== undefined &&
    !Number.isSafeInteger(state.dream.railgun.activeRailguns)
  ) {
    errors.push('Active railguns must be a safe integer.')
  }
  if (
    state.dream.railgun.lastRoundsFired !== undefined &&
    !isSafeNonNegativeInteger(state.dream.railgun.lastRoundsFired)
  ) {
    errors.push('Railgun rounds fired must be a non-negative safe integer.')
  }
  if (
    state.infinity.breakTarget < 1n ||
    state.infinity.breakTarget > 2_147_483_647n
  ) {
    errors.push('Infinity Break target must be within the Unity schema-12 integer range.')
  }
  if (
    state.infinity.currentCyclePeakIpPerMinute !== undefined &&
    (!Number.isFinite(state.infinity.currentCyclePeakIpPerMinute) ||
      state.infinity.currentCyclePeakIpPerMinute < 0)
  ) {
    errors.push('Current Infinity peak IP per minute must be finite and non-negative.')
  }
  if (
    state.infinity.currentCyclePeakReward !== undefined &&
    state.infinity.currentCyclePeakReward < 0n
  ) {
    errors.push('Current Infinity peak reward must be non-negative.')
  }
  if (
    state.infinity.manualPeakIpPerMinute !== undefined &&
    (!Number.isFinite(state.infinity.manualPeakIpPerMinute) ||
      state.infinity.manualPeakIpPerMinute < 0)
  ) {
    errors.push('Manual Infinity peak IP per minute must be finite and non-negative.')
  }
  if (
    state.infinity.manualPeakReward !== undefined &&
    state.infinity.manualPeakReward < 0n
  ) {
    errors.push('Manual Infinity peak reward must be non-negative.')
  }
  if (
    state.infinity.manualCalibrationObservedActiveSeconds !== undefined &&
    (!Number.isFinite(state.infinity.manualCalibrationObservedActiveSeconds) ||
      state.infinity.manualCalibrationObservedActiveSeconds < 0)
  ) {
    errors.push('Manual Infinity active observation must be finite and non-negative.')
  }
  if (
    state.infinity.activeAutomaticThroughputCycleEligible !== undefined &&
    typeof state.infinity.activeAutomaticThroughputCycleEligible !== 'boolean'
  ) {
    errors.push('Active automatic Infinity cycle eligibility must be boolean.')
  }
  if (state.infinity.secretsOfTheUniverse > 27n) {
    errors.push('Secrets of the Universe exceeds its authored maximum.')
  }
  if (state.infinity.permanentSkillPoints > 10n) {
    errors.push('Permanent skill points exceeds its authored maximum.')
  }
  if (state.statistics.minuteWindows.length !== 60) {
    errors.push('Statistics must contain exactly 60 minute windows.')
  }
  if (state.statistics.halfHourWindows.length !== 48) {
    errors.push('Statistics must contain exactly 48 half-hour windows.')
  }
  if (state.statistics.dailyWindows.length !== 30) {
    errors.push('Statistics must contain exactly 30 daily windows.')
  }
  const recentInfinityCycles = state.statistics.recentInfinityCycles ?? []
  if (recentInfinityCycles.length > 10) {
    errors.push('Recent Infinity history cannot exceed 10 cycles.')
  }
  for (const cycle of recentInfinityCycles) {
    if (
      cycle.configuredTarget < 1n ||
      cycle.reward < 1n ||
      !Number.isFinite(cycle.durationSeconds) ||
      cycle.durationSeconds <= 0 ||
      (cycle.processingSource !== undefined &&
        !isProcessingSource(cycle.processingSource)) ||
      (cycle.activeIntervalMilliseconds !== undefined &&
        (!Number.isInteger(cycle.activeIntervalMilliseconds) ||
          cycle.activeIntervalMilliseconds < 33 ||
          cycle.activeIntervalMilliseconds > 200))
    ) {
      errors.push('Recent Infinity cycles must contain a positive target, reward, and finite duration.')
    }
  }
  const recentActiveAutomaticInfinityCycles =
    state.statistics.recentActiveAutomaticInfinityCycles ?? []
  if (recentActiveAutomaticInfinityCycles.length > 10) {
    errors.push('Recent active automatic Infinity history cannot exceed 10 cycles.')
  }
  for (const cycle of recentActiveAutomaticInfinityCycles) {
    if (
      !cycle.breakInfinity ||
      !cycle.automatic ||
      cycle.processingSource !== 'active' ||
      cycle.configuredTarget < 1n ||
      cycle.reward < 1n ||
      !Number.isFinite(cycle.durationSeconds) ||
      cycle.durationSeconds <= 0 ||
      !Number.isInteger(cycle.activeIntervalMilliseconds) ||
      cycle.activeIntervalMilliseconds! < 33 ||
      cycle.activeIntervalMilliseconds! > 200
    ) {
      errors.push('Active automatic Infinity cycles must contain active Break-cycle throughput data.')
    }
  }
  for (const [id, skill] of Object.entries(state.skills.byId)) {
    if (id.trim().length === 0) errors.push('Skill IDs cannot be blank.')
    if (!Number.isInteger(skill.level)) {
      errors.push(`Skill '${id}' level must be an integer.`)
    }
  }
  return { valid: errors.length === 0, errors }
}

function validateNumericGraph(
  value: unknown,
  path: string,
  errors: string[],
  seen: Set<object>,
): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${path} must be finite and non-negative.`)
    }
    return
  }
  if (typeof value === 'bigint') {
    if (value < 0n) errors.push(`${path} must be non-negative.`)
    return
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateNumericGraph(entry, `${path}.${index}`, errors, seen),
    )
    return
  }
  for (const [key, entry] of Object.entries(value)) {
    validateNumericGraph(entry, `${path}.${key}`, errors, seen)
  }
}
