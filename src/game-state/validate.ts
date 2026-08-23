import type { CanonicalGameStateV1 } from './types'
import { isSkillPresetColorId } from './skillPresetColors'
import { isBottomNavigationSize } from './navigationPreferences'

export interface CanonicalValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export function validateCanonicalGameState(
  state: CanonicalGameStateV1,
): CanonicalValidationResult {
  const errors: string[] = []
  validateNumericGraph(state, '$', errors, new Set())
  if (state.modelVersion !== 1) {
    errors.push(`Unsupported canonical model version ${state.modelVersion}.`)
  }
  if (
    state.meta.bottomNavigationSize !== undefined &&
    !isBottomNavigationSize(state.meta.bottomNavigationSize)
  ) {
    errors.push('Bottom navigation size must be Compact, Standard, or Large.')
  }
  for (const [id, visible] of Object.entries(
    state.meta.navigationVisibility ?? {},
  )) {
    if (id.trim().length === 0 || typeof visible !== 'boolean') {
      errors.push('Bottom navigation visibility entries must use non-blank IDs and boolean values.')
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
    if (!Number.isInteger(slot) || slot < 0 || slot > 5) {
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
    (!Number.isSafeInteger(state.dream.railgun.lastRoundsFired) ||
      state.dream.railgun.lastRoundsFired < 0)
  ) {
    errors.push('Railgun rounds fired must be a non-negative safe integer.')
  }
  if (state.infinity.breakTarget > 2_147_483_647n) {
    errors.push('Infinity Break target exceeds the Unity schema-12 integer range.')
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
