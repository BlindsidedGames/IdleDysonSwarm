import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { DISCRETE_MAXIMUM } from './numeric'

export interface MoneyScienceCanonicalInputs {
  readonly dyson: Pick<
    CanonicalGameStateV1['dyson'],
    'bots' | 'botDistribution'
  >
  readonly skills: Pick<
    CanonicalGameStateV1['skills'],
    'points' | 'fragments' | 'byId'
  >
  readonly research: Pick<
    CanonicalGameStateV1['research'],
    'levelsById'
  >
  readonly quantum: {
    readonly unlocks: Pick<
      CanonicalGameStateV1['quantum']['unlocks'],
      'botMultitasking'
    >
  }
}

/**
 * Values produced earlier in the Dyson derived-state dependency order.
 * Undefined is explicit so callers cannot accidentally substitute a Unity
 * cache or a neutral value when the dependency has not been calculated.
 */
export interface MoneyScienceDerivedInputs {
  readonly panelsPerSecond: number | undefined
  readonly panelLifetimeSeconds: number | undefined
  readonly scienceMultiplier: number | undefined
}

export type MoneyScienceSkillEffectIssueCode =
  | 'DYSON_MONEY_SCIENCE_SKILL_STATE_MISSING'
  | 'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID'
  | 'DYSON_MONEY_SCIENCE_TUNING_INVALID'
  | 'DYSON_MONEY_SCIENCE_DERIVED_INPUT_MISSING'
  | 'DYSON_MONEY_SCIENCE_DERIVED_INPUT_INVALID'
  | 'DYSON_MONEY_SCIENCE_RESULT_NON_FINITE'

export interface MoneyScienceSkillEffectIssue {
  readonly code: MoneyScienceSkillEffectIssueCode
  readonly path: string
  readonly detail: string
}

export type MoneyScienceSkillEffectResolution =
  | { readonly handled: false }
  | { readonly handled: true; readonly ok: true; readonly value: number }
  | {
      readonly handled: true
      readonly ok: false
      readonly issue: MoneyScienceSkillEffectIssue
    }

type ReadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: MoneyScienceSkillEffectIssue }

const MONEY_SUFFIX = '.money_multiplier'
const SCIENCE_SUFFIX = '.science_multiplier'
const EFFECT_PREFIX = 'effect.'

/**
 * Pure port of Unity SkillEffectCatalog.TryResolveMoneyScienceEffects.
 */
export function resolveMoneyScienceSkillEffect(
  effectId: string,
  state: MoneyScienceCanonicalInputs,
  tuning: Readonly<DysonCompatibilityTuning>,
  derived: MoneyScienceDerivedInputs,
): MoneyScienceSkillEffectResolution {
  if (effectId.endsWith(MONEY_SUFFIX)) {
    const skillId = extractSkillId(effectId, MONEY_SUFFIX)
    if (skillId === undefined) return { handled: false }
    return resolveMoneyEffect(skillId, effectId, state, tuning, derived)
  }
  if (effectId.endsWith(SCIENCE_SUFFIX)) {
    const skillId = extractSkillId(effectId, SCIENCE_SUFFIX)
    if (skillId === undefined) return { handled: false }
    return resolveScienceEffect(skillId, effectId, state, tuning, derived)
  }
  return { handled: false }
}

function resolveMoneyEffect(
  skillId: string,
  effectId: string,
  state: MoneyScienceCanonicalInputs,
  tuning: Readonly<DysonCompatibilityTuning>,
  derived: MoneyScienceDerivedInputs,
): MoneyScienceSkillEffectResolution {
  const recognized = MONEY_SKILL_IDS.has(skillId)
  if (!recognized) return { handled: false }
  const owned = readSkillOwned(state, skillId, effectId)
  if (!owned.ok) return blocked(owned.issue)
  if (!owned.value) {
    return resolved(skillId === 'regulatedAcademia' ? 0 : 1)
  }

  switch (skillId) {
    case 'regulatedAcademia': {
      const research = readResearchLevel(
        state,
        'research.money_multiplier',
        effectId,
      )
      if (!research.ok) return blocked(research.issue)
      const coefficient = readTuning(
        tuning.moneyMultiUpgradePercent,
        'moneyMultiUpgradePercent',
        effectId,
      )
      if (!coefficient.ok) return blocked(coefficient.issue)
      const fragments = readDiscrete(
        state.skills.fragments,
        'skills.fragments',
        effectId,
      )
      if (!fragments.ok) return blocked(fragments.issue)
      const moneyBoost = research.value * coefficient.value
      const factor = 1.02 + 1.01 * (fragments.value - 1)
      return resolvedFinite(moneyBoost * (factor - 1), effectId)
    }
    case 'economicRevolution': {
      const allocation = readAllocationInputs(state, effectId)
      if (!allocation.ok) return blocked(allocation.issue)
      return resolved(
        allocation.value.botDistribution <= 0.5 ||
          allocation.value.botMultitasking
          ? 5
          : 1,
      )
    }
    case 'higgsBoson': {
      const production = readPanelDerivedInputs(derived, effectId)
      if (!production.ok) return blocked(production.issue)
      const galaxies = galaxiesEngulfed(production.value, true)
      return resolvedFinite(
        galaxies >= 1 ? 1 + 0.1 * galaxies : 1,
        effectId,
      )
    }
    case 'workerBoost': {
      const allocation = readAllocationInputs(state, effectId)
      if (!allocation.ok) return blocked(allocation.issue)
      return resolvedFinite(
        allocation.value.botMultitasking
          ? 100
          : (1 - allocation.value.botDistribution) * 100,
        effectId,
      )
    }
    case 'shouldersOfTheRevolution': {
      const research = readResearchLevel(
        state,
        'research.science_boost',
        effectId,
      )
      if (!research.ok) return blocked(research.issue)
      return resolvedFinite(1 + 0.01 * research.value, effectId)
    }
    case 'shouldersOfPrecursors': {
      const scienceMultiplier = readDerived(
        derived.scienceMultiplier,
        'scienceMultiplier',
        effectId,
      )
      return scienceMultiplier.ok
        ? resolved(scienceMultiplier.value)
        : blocked(scienceMultiplier.issue)
    }
    case 'dysonSubsidies': {
      const production = readPanelDerivedInputs(derived, effectId)
      if (!production.ok) return blocked(production.issue)
      return resolved(starsSurrounded(production.value, true) < 1 ? 3 : 1)
    }
    case 'purityOfMind':
      return resolveSkillPointMultiplier(state, effectId, 1.5)
    case 'monetaryPolicy': {
      const fragments = readDiscrete(
        state.skills.fragments,
        'skills.fragments',
        effectId,
      )
      return fragments.ok
        ? resolvedFinite(1 + 0.75 * fragments.value, effectId)
        : blocked(fragments.issue)
    }
    case 'tasteOfPower':
      return resolveTasteOfPower(state, effectId)
    case 'stellarObliteration':
      return resolveStellarObliteration(derived, effectId)
    case 'stellarDominance':
      return resolveStellarDominance(state, derived, effectId)
    case 'purityOfSEssence':
      return resolveSkillPointMultiplier(state, effectId, 1.42)
    case 'superRadiantScattering':
      return resolveScattering(state, effectId)
  }

  return { handled: false }
}

function resolveScienceEffect(
  skillId: string,
  effectId: string,
  state: MoneyScienceCanonicalInputs,
  tuning: Readonly<DysonCompatibilityTuning>,
  derived: MoneyScienceDerivedInputs,
): MoneyScienceSkillEffectResolution {
  const recognized = SCIENCE_SKILL_IDS.has(skillId)
  if (!recognized) return { handled: false }
  const owned = readSkillOwned(state, skillId, effectId)
  if (!owned.ok) return blocked(owned.issue)
  if (!owned.value) {
    return resolved(
      skillId === 'regulatedAcademia' || skillId === 'idleSpaceFlight'
        ? 0
        : 1,
    )
  }

  switch (skillId) {
    case 'regulatedAcademia': {
      const research = readResearchLevel(
        state,
        'research.science_boost',
        effectId,
      )
      if (!research.ok) return blocked(research.issue)
      const coefficient = readTuning(
        tuning.scienceBoostPercent,
        'scienceBoostPercent',
        effectId,
      )
      if (!coefficient.ok) return blocked(coefficient.issue)
      const fragments = readDiscrete(
        state.skills.fragments,
        'skills.fragments',
        effectId,
      )
      if (!fragments.ok) return blocked(fragments.issue)
      const scienceBoost = research.value * coefficient.value
      const factor = 1.02 + 1.01 * (fragments.value - 1)
      return resolvedFinite(scienceBoost * (factor - 1), effectId)
    }
    case 'producedAsScienceTree': {
      const allocation = readAllocationInputs(state, effectId)
      if (!allocation.ok) return blocked(allocation.issue)
      return resolvedFinite(
        allocation.value.botMultitasking
          ? 100
          : allocation.value.botDistribution * 100,
        effectId,
      )
    }
    case 'idleSpaceFlight': {
      const production = readPanelDerivedInputs(derived, effectId)
      if (!production.ok) return blocked(production.issue)
      const value =
        (0.01 *
          (production.value.panelsPerSecond *
            production.value.panelLifetimeSeconds)) /
        100_000_000
      return resolvedFinite(value, effectId)
    }
    case 'scientificRevolution': {
      const allocation = readAllocationInputs(state, effectId)
      if (!allocation.ok) return blocked(allocation.issue)
      return resolved(
        allocation.value.botDistribution >= 0.5 ||
          allocation.value.botMultitasking
          ? 5
          : 1,
      )
    }
    case 'purityOfMind':
      return resolveSkillPointMultiplier(state, effectId, 1.5)
    case 'tasteOfPower':
      return resolveTasteOfPower(state, effectId)
    case 'stellarObliteration':
      return resolveStellarObliteration(derived, effectId)
    case 'purityOfSEssence':
      return resolveSkillPointMultiplier(state, effectId, 1.42)
    case 'superRadiantScattering':
      return resolveScattering(state, effectId)
  }

  return { handled: false }
}

const MONEY_SKILL_IDS: ReadonlySet<string> = new Set([
  'regulatedAcademia',
  'economicRevolution',
  'higgsBoson',
  'workerBoost',
  'shouldersOfTheRevolution',
  'shouldersOfPrecursors',
  'dysonSubsidies',
  'purityOfMind',
  'monetaryPolicy',
  'tasteOfPower',
  'stellarObliteration',
  'stellarDominance',
  'purityOfSEssence',
  'superRadiantScattering',
])

const SCIENCE_SKILL_IDS: ReadonlySet<string> = new Set([
  'regulatedAcademia',
  'producedAsScienceTree',
  'idleSpaceFlight',
  'scientificRevolution',
  'purityOfMind',
  'tasteOfPower',
  'stellarObliteration',
  'purityOfSEssence',
  'superRadiantScattering',
])

function resolveSkillPointMultiplier(
  state: MoneyScienceCanonicalInputs,
  effectId: string,
  coefficient: number,
): MoneyScienceSkillEffectResolution {
  const points = readDiscrete(
    state.skills.points,
    'skills.points',
    effectId,
  )
  if (!points.ok) return blocked(points.issue)
  return resolvedFinite(
    points.value > 0 ? coefficient * points.value : 1,
    effectId,
  )
}

function resolveTasteOfPower(
  state: MoneyScienceCanonicalInputs,
  effectId: string,
): MoneyScienceSkillEffectResolution {
  const indulging = readSkillOwned(state, 'indulgingInPower', effectId)
  if (!indulging.ok) return blocked(indulging.issue)
  if (!indulging.value) return resolved(0.75)
  const addiction = readSkillOwned(state, 'addictionToPower', effectId)
  if (!addiction.ok) return blocked(addiction.issue)
  return resolved(addiction.value ? 0.5 : 0.6)
}

function resolveStellarObliteration(
  derived: MoneyScienceDerivedInputs,
  effectId: string,
): MoneyScienceSkillEffectResolution {
  const production = readPanelDerivedInputs(derived, effectId)
  if (!production.ok) return blocked(production.issue)
  if (galaxiesEngulfed(production.value, true) < 1) return resolved(1)
  const raw = galaxiesEngulfed(production.value, false)
  return resolvedFinite(raw > 0 ? 1 / raw : 1, effectId)
}

function resolveStellarDominance(
  state: MoneyScienceCanonicalInputs,
  derived: MoneyScienceDerivedInputs,
  effectId: string,
): MoneyScienceSkillEffectResolution {
  const production = readPanelDerivedInputs(derived, effectId)
  if (!production.ok) return blocked(production.issue)
  const bots = readFiniteNonNegative(state.dyson.bots, 'dyson.bots', effectId)
  if (!bots.ok) return blocked(bots.issue)
  const supernova = readSkillOwned(state, 'supernova', effectId)
  if (!supernova.ok) return blocked(supernova.issue)
  const stellarObliteration = readSkillOwned(
    state,
    'stellarObliteration',
    effectId,
  )
  if (!stellarObliteration.ok) return blocked(stellarObliteration.issue)
  const stellarImprovements = readSkillOwned(
    state,
    'stellarImprovements',
    effectId,
  )
  if (!stellarImprovements.ok) return blocked(stellarImprovements.issue)

  const stars = starsSurrounded(production.value, false)
  let required = supernova.value
    ? stars * 1_000_000
    : stellarObliteration.value
      ? stars * 1_000
      : stars
  if (required < 1) required = 1
  required *= 100
  if (stellarImprovements.value) required /= 1_000
  if (!Number.isFinite(required)) {
    return blocked({
      code: 'DYSON_MONEY_SCIENCE_RESULT_NON_FINITE',
      path: `effects.${effectId}`,
      detail: `Effect '${effectId}' produced a non-finite stellar requirement.`,
    })
  }
  return resolved(bots.value > required ? 0.01 : 1)
}

function resolveScattering(
  state: MoneyScienceCanonicalInputs,
  effectId: string,
): MoneyScienceSkillEffectResolution {
  const skill = state.skills.byId.superRadiantScattering
  if (skill === undefined) {
    return blocked(missingSkillIssue('superRadiantScattering', effectId))
  }
  const timer = readFiniteNonNegative(
    skill.timerSeconds,
    'skills.byId.superRadiantScattering.timerSeconds',
    effectId,
  )
  return timer.ok
    ? resolvedFinite(1 + 0.01 * timer.value, effectId)
    : blocked(timer.issue)
}

function readAllocationInputs(
  state: MoneyScienceCanonicalInputs,
  effectId: string,
): ReadResult<{
  readonly botDistribution: number
  readonly botMultitasking: boolean
}> {
  const distribution = state.dyson.botDistribution
  if (
    typeof distribution !== 'number' ||
    !Number.isFinite(distribution) ||
    distribution < 0 ||
    distribution > 1
  ) {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      'dyson.botDistribution',
      `Effect '${effectId}' requires bot distribution in [0, 1].`,
    )
  }
  const botMultitasking = state.quantum.unlocks.botMultitasking
  if (typeof botMultitasking !== 'boolean') {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      'quantum.unlocks.botMultitasking',
      `Effect '${effectId}' requires a boolean Bot Multitasking state.`,
    )
  }
  return {
    ok: true,
    value: { botDistribution: distribution, botMultitasking },
  }
}

function readPanelDerivedInputs(
  derived: MoneyScienceDerivedInputs,
  effectId: string,
): ReadResult<{
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
}> {
  const panels = readDerived(
    derived.panelsPerSecond,
    'panelsPerSecond',
    effectId,
  )
  if (!panels.ok) return panels
  const lifetime = readDerived(
    derived.panelLifetimeSeconds,
    'panelLifetimeSeconds',
    effectId,
  )
  if (!lifetime.ok) return lifetime
  return {
    ok: true,
    value: {
      panelsPerSecond: panels.value,
      panelLifetimeSeconds: lifetime.value,
    },
  }
}

function readDerived(
  value: number | undefined,
  field: keyof MoneyScienceDerivedInputs,
  effectId: string,
): ReadResult<number> {
  if (value === undefined) {
    return failure(
      'DYSON_MONEY_SCIENCE_DERIVED_INPUT_MISSING',
      `derived.${field}`,
      `Effect '${effectId}' requires derived input '${field}'.`,
    )
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return failure(
      'DYSON_MONEY_SCIENCE_DERIVED_INPUT_INVALID',
      `derived.${field}`,
      `Derived input '${field}' must be finite and non-negative.`,
    )
  }
  return { ok: true, value }
}

function readSkillOwned(
  state: MoneyScienceCanonicalInputs,
  skillId: string,
  effectId: string,
): ReadResult<boolean> {
  const skill = state.skills.byId[skillId]
  if (skill === undefined) {
    return { ok: false, issue: missingSkillIssue(skillId, effectId) }
  }
  if (typeof skill.owned !== 'boolean') {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      `skills.byId.${skillId}.owned`,
      `Effect '${effectId}' requires boolean ownership for '${skillId}'.`,
    )
  }
  return { ok: true, value: skill.owned }
}

function missingSkillIssue(
  skillId: string,
  effectId: string,
): MoneyScienceSkillEffectIssue {
  return {
    code: 'DYSON_MONEY_SCIENCE_SKILL_STATE_MISSING',
    path: `skills.byId.${skillId}`,
    detail: `Effect '${effectId}' requires canonical skill state '${skillId}'.`,
  }
}

function readResearchLevel(
  state: MoneyScienceCanonicalInputs,
  researchId: string,
  effectId: string,
): ReadResult<number> {
  if (!Object.hasOwn(state.research.levelsById, researchId)) {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      `research.levelsById.${researchId}`,
      `Effect '${effectId}' requires canonical research '${researchId}'.`,
    )
  }
  const level = state.research.levelsById[researchId]
  if (
    typeof level !== 'number' ||
    !Number.isFinite(level) ||
    !Number.isSafeInteger(level) ||
    level < 0
  ) {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      `research.levelsById.${researchId}`,
      `Research '${researchId}' must be a non-negative safe integer.`,
    )
  }
  return { ok: true, value: level }
}

function readTuning(
  value: number,
  field: keyof DysonCompatibilityTuning,
  effectId: string,
): ReadResult<number> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return failure(
      'DYSON_MONEY_SCIENCE_TUNING_INVALID',
      `compatibilityTuning.${field}`,
      `Effect '${effectId}' requires finite non-negative tuning '${field}'.`,
    )
  }
  return { ok: true, value }
}

function readDiscrete(
  value: bigint,
  path: string,
  effectId: string,
): ReadResult<number> {
  if (
    typeof value !== 'bigint' ||
    value < 0n ||
    value > DISCRETE_MAXIMUM
  ) {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      path,
      `Effect '${effectId}' requires '${path}' in the Unity Int64 range.`,
    )
  }
  return { ok: true, value: Number(value) }
}

function readFiniteNonNegative(
  value: number,
  path: string,
  effectId: string,
): ReadResult<number> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return failure(
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      path,
      `Effect '${effectId}' requires finite non-negative '${path}'.`,
    )
  }
  return { ok: true, value }
}

function starsSurrounded(
  input: {
    readonly panelsPerSecond: number
    readonly panelLifetimeSeconds: number
  },
  floored: boolean,
): number {
  const raw =
    (input.panelsPerSecond * input.panelLifetimeSeconds) / 20_000
  return floored ? Math.floor(raw) : raw
}

function galaxiesEngulfed(
  input: {
    readonly panelsPerSecond: number
    readonly panelLifetimeSeconds: number
  },
  floored: boolean,
): number {
  const raw =
    (input.panelsPerSecond * input.panelLifetimeSeconds) /
    20_000 /
    100_000_000_000
  return floored ? Math.floor(raw) : raw
}

function extractSkillId(
  effectId: string,
  suffix: string,
): string | undefined {
  if (!effectId.startsWith(EFFECT_PREFIX) || !effectId.endsWith(suffix)) {
    return undefined
  }
  const length = effectId.length - EFFECT_PREFIX.length - suffix.length
  return length > 0
    ? effectId.slice(EFFECT_PREFIX.length, EFFECT_PREFIX.length + length)
    : undefined
}

function resolved(value: number): MoneyScienceSkillEffectResolution {
  return { handled: true, ok: true, value }
}

function resolvedFinite(
  value: number,
  effectId: string,
): MoneyScienceSkillEffectResolution {
  if (Number.isFinite(value)) return resolved(value)
  return blocked({
    code: 'DYSON_MONEY_SCIENCE_RESULT_NON_FINITE',
    path: `effects.${effectId}`,
    detail: `Effect '${effectId}' produced a non-finite value.`,
  })
}

function blocked(
  issue: MoneyScienceSkillEffectIssue,
): MoneyScienceSkillEffectResolution {
  return { handled: true, ok: false, issue }
}

function failure<T>(
  code: MoneyScienceSkillEffectIssueCode,
  path: string,
  detail: string,
): ReadResult<T> {
  return { ok: false, issue: { code, path, detail } }
}
