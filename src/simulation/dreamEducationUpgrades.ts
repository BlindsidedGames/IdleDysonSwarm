import { isSafeNonNegativeInteger } from '../core/finiteNonNegativeNumber'
import { getGameAssetsByKind } from '../game-data/catalog'
import { SIMULATION_UPGRADE_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import {
  DREAM_EDUCATION_IDS,
  isDreamEducationId,
  isDreamUpgradeFlag,
  type CanonicalGameStateV1,
  type DreamEducationId,
  type DreamUpgradeFlag,
} from '../game-state/types'
import {
  addContinuous,
  addDiscrete,
  exactRoundedNonNegativeBigInt,
} from './numeric'
import { tryDebitContinuous } from './transactions'

const SIMULATION_LAYER = 0
const MATHEMATICS_SOLAR_GENERATION_MINIMUM = 200n

export interface SimulationUpgradePrerequisite {
  readonly key: DreamUpgradeFlag
  readonly mustBeOwned: boolean
}

export interface SimulationUpgradeEffect {
  readonly effectType: number
  readonly targetKey: string
  readonly boolValue: boolean
  readonly numericValue: number
}

export type DreamUpgradeDiscreteConverter = (value: number) => bigint

export interface SimulationUpgradeDefinition {
  readonly key: DreamUpgradeFlag
  readonly cost: number
  readonly prerequisites: readonly SimulationUpgradePrerequisite[]
  readonly purchaseEffects: readonly SimulationUpgradeEffect[]
}

export type SimulationUpgradePurchaseCode =
  | 'purchased'
  | 'unknown_upgrade'
  | 'already_owned'
  | 'prerequisites_not_met'
  | 'insufficient_strange_matter'
  | 'invalid_cost'
  | 'missing_effects'
  | 'unsupported_effect'

export interface SimulationUpgradePurchaseResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: SimulationUpgradePurchaseCode
  readonly candidate: CanonicalGameStateV1
  readonly unsupportedEffect: string | null
}

export type DreamEducationStartCode =
  | 'started'
  | 'already_active'
  | 'invalid_cost'
  | 'insufficient_influence'

export interface DreamEducationStartResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: DreamEducationStartCode
  readonly candidate: CanonicalGameStateV1
}

export interface DreamEducationAdvanceResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly candidate: CanonicalGameStateV1
  readonly completed: readonly DreamEducationId[]
}

export const SIMULATION_UPGRADE_DEFINITIONS: ReadonlyMap<
  DreamUpgradeFlag,
  SimulationUpgradeDefinition
> = loadSimulationUpgradeDefinitions()

/**
 * Purchases one permanent Simulation-layer upgrade using the exported authored
 * definition and returns a detached canonical candidate.
 */
export function purchaseSimulationUpgrade(
  state: CanonicalGameStateV1,
  key: string,
  definitions = SIMULATION_UPGRADE_DEFINITIONS,
): SimulationUpgradePurchaseResult {
  if (!isDreamUpgradeFlag(key) || !definitions.has(key)) {
    return rejectedPurchase(state, 'unknown_upgrade')
  }
  const definition = definitions.get(key)!
  if (state.dream.upgrades[key]) {
    return rejectedPurchase(state, 'already_owned')
  }
  if (
    definition.prerequisites.some(
      (prerequisite) =>
        state.dream.upgrades[prerequisite.key] !==
        prerequisite.mustBeOwned,
    )
  ) {
    return rejectedPurchase(state, 'prerequisites_not_met')
  }
  const debit = tryDebitContinuous(
    state.dream.strangeMatter,
    definition.cost,
  )
  if (debit.status === 'insufficient-funds') {
    return rejectedPurchase(state, 'insufficient_strange_matter')
  }
  if (debit.status !== 'success') {
    return rejectedPurchase(state, 'invalid_cost')
  }
  if (definition.purchaseEffects.length === 0) {
    return rejectedPurchase(state, 'missing_effects')
  }

  const gap = findEffectGap(definition)
  if (gap !== null) {
    return {
      ...rejectedPurchase(state, 'unsupported_effect'),
      unsupportedEffect: gap,
    }
  }

  let candidate = state
  for (const effect of definition.purchaseEffects) {
    candidate = applyDreamUpgradeEffect(
      candidate,
      effect,
      exactValidatedDreamUpgradeDiscrete,
    )
  }
  candidate = {
    ...candidate,
    dream: {
      ...candidate.dream,
      strangeMatter: debit.balance,
    },
  }
  if (key === 'mathematics3') {
    candidate = applyDreamMathematicsCompletionParity(candidate)
  }
  return {
    accepted: true,
    changed: true,
    code: 'purchased',
    candidate,
    unsupportedEffect: null,
  }
}

/**
 * Mirrors the queued education Start callbacks: an inactive subject with an
 * integral affordable authored cost becomes active and debits influence.
 */
export function startDreamEducation(
  state: CanonicalGameStateV1,
  id: DreamEducationId,
): DreamEducationStartResult {
  const education = state.dream.education[id]
  if (education.active) {
    return rejectedEducationStart(state, 'already_active')
  }
  const cost = education.cost
  if (!Number.isFinite(cost) || !Number.isInteger(cost) || cost < 0) {
    return rejectedEducationStart(state, 'invalid_cost')
  }
  const debit = tryDebitContinuous(state.reality.influence, cost)
  if (debit.status === 'insufficient-funds') {
    return rejectedEducationStart(state, 'insufficient_influence')
  }
  if (debit.status !== 'success') {
    return rejectedEducationStart(state, 'invalid_cost')
  }

  return {
    accepted: true,
    changed: true,
    code: 'started',
    candidate: {
      ...state,
      reality: {
        ...state.reality,
        influence: debit.balance,
      },
      dream: {
        ...state.dream,
        education: {
          ...state.dream.education,
          [id]: {
            ...education,
            active: true,
          },
        },
      },
    },
  }
}

/**
 * Advances all active, incomplete education subjects by the same Dream
 * production interval. Progress is not clamped at completion.
 */
export function advanceDreamEducation(
  state: CanonicalGameStateV1,
  durationSeconds: number,
  globalMultiplier: number,
): DreamEducationAdvanceResult {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0 ||
    !Number.isFinite(globalMultiplier) ||
    globalMultiplier < 0
  ) {
    return {
      accepted: false,
      changed: false,
      candidate: state,
      completed: [],
    }
  }
  const increment = durationSeconds * globalMultiplier
  let education = state.dream.education
  const completed: DreamEducationId[] = []
  let changed = false
  let mathematicsCompleted = false

  for (const id of DREAM_EDUCATION_IDS) {
    const subject = education[id]
    if (!subject.active || subject.complete) continue
    const progress = addContinuous(subject.progress, increment)
    const complete = progress >= subject.researchTime
    education = {
      ...education,
      [id]: {
        ...subject,
        progress,
        complete,
      },
    }
    changed =
      changed ||
      progress !== subject.progress ||
      complete !== subject.complete
    if (complete && !subject.complete) {
      completed.push(id)
      if (id === 'mathematics') mathematicsCompleted = true
    }
  }

  if (!changed) {
    return {
      accepted: true,
      changed: false,
      candidate: state,
      completed,
    }
  }
  let candidate: CanonicalGameStateV1 = {
    ...state,
    dream: {
      ...state.dream,
      education,
    },
  }
  if (mathematicsCompleted) {
    candidate = applyDreamMathematicsCompletionParity(candidate)
  }
  return {
    accepted: true,
    changed: true,
    candidate,
    completed,
  }
}

/**
 * Reports authored Simulation effects that have no exact canonical target.
 */
export function findSimulationUpgradeCanonicalGaps(
  definitions = SIMULATION_UPGRADE_DEFINITIONS,
): readonly string[] {
  const gaps: string[] = []
  for (const definition of definitions.values()) {
    const gap = findEffectGap(definition)
    if (gap !== null) gaps.push(gap)
  }
  return gaps
}

function loadSimulationUpgradeDefinitions(): ReadonlyMap<
  DreamUpgradeFlag,
  SimulationUpgradeDefinition
> {
  const definitions = new Map<
    DreamUpgradeFlag,
    SimulationUpgradeDefinition
  >()
  for (const asset of getGameAssetsByKind(SIMULATION_UPGRADE_ASSET_KIND)) {
    if (asset.data.layer !== SIMULATION_LAYER) continue
    const key = asset.data.key
    const cost = asset.data.cost
    if (
      typeof key !== 'string' ||
      !isDreamUpgradeFlag(key) ||
      !isSafeNonNegativeInteger(cost)
    ) {
      continue
    }
    const prerequisites = Array.isArray(asset.data.prerequisites)
      ? asset.data.prerequisites.flatMap((value) => {
          if (
            value === null ||
            Array.isArray(value) ||
            typeof value !== 'object' ||
            typeof value.key !== 'string' ||
            !isDreamUpgradeFlag(value.key)
          ) {
            return []
          }
          return [
            {
              key: value.key,
              mustBeOwned: Boolean(value.mustBeOwned),
            },
          ]
        })
      : []
    const purchaseEffects = Array.isArray(asset.data.purchaseEffects)
      ? asset.data.purchaseEffects.flatMap((value) => {
          if (
            value === null ||
            Array.isArray(value) ||
            typeof value !== 'object' ||
            typeof value.effectType !== 'number' ||
            typeof value.targetKey !== 'string' ||
            typeof value.numericValue !== 'number'
          ) {
            return []
          }
          return [
            {
              effectType: value.effectType,
              targetKey: value.targetKey,
              boolValue: Boolean(value.boolValue),
              numericValue: value.numericValue,
            },
          ]
        })
      : []
    definitions.set(key, {
      key,
      cost,
      prerequisites,
      purchaseEffects,
    })
  }
  return definitions
}

function findEffectGap(
  definition: SimulationUpgradeDefinition,
): string | null {
  for (const effect of definition.purchaseEffects) {
    if (!canApplyCanonicalUpgradeEffect(effect)) {
      return `${definition.key}:${effect.effectType}:${effect.targetKey}`
    }
  }
  return null
}

function canApplyCanonicalUpgradeEffect(
  effect: SimulationUpgradeEffect,
): boolean {
  switch (effect.effectType) {
    case 0:
    case 1:
      return isDreamUpgradeFlag(effect.targetKey)
    case 2:
      return exactRoundedNonNegativeBigInt(effect.numericValue) !== null
    case 3:
      return (
        dreamEducationIdFromEffectTarget(effect.targetKey, 'Complete') !== null
      )
    case 4:
      return (
        dreamEducationIdFromEffectTarget(
          effect.targetKey,
          'ResearchTime',
        ) !== null ||
        effect.targetKey === 'rocketsPerSpaceFactory'
      )
    case 5:
    case 7:
      return (
        effect.targetKey === 'huntersPerPurchase' ||
        effect.targetKey === 'gatherersPerPurchase'
      )
    case 6:
      return (
        effect.targetKey === 'hunters' ||
        effect.targetKey === 'gatherers' ||
        effect.targetKey === 'solarPanelGeneration'
      )
    case 8:
      return effect.targetKey === 'disasterStage'
    default:
      return false
  }
}

/** Applies one validated authored effect using the caller's discrete conversion contract. */
export function applyDreamUpgradeEffect(
  state: CanonicalGameStateV1,
  effect: Readonly<SimulationUpgradeEffect>,
  toDiscrete: DreamUpgradeDiscreteConverter,
): CanonicalGameStateV1 {
  if (effect.effectType === 0 || effect.effectType === 1) {
    const target = effect.targetKey as DreamUpgradeFlag
    return {
      ...state,
      dream: {
        ...state.dream,
        upgrades: {
          ...state.dream.upgrades,
          [target]: effect.boolValue,
        },
      },
    }
  }
  if (effect.effectType === 2) {
    const amount = toDiscrete(effect.numericValue)
    return {
      ...state,
      skills: {
        ...state.skills,
        points: addDiscrete(state.skills.points, amount),
      },
    }
  }
  if (effect.effectType === 3) {
    const id = dreamEducationIdFromEffectTarget(effect.targetKey, 'Complete')!
    return {
      ...state,
      dream: {
        ...state.dream,
        education: {
          ...state.dream.education,
          [id]: {
            ...state.dream.education[id],
            complete: effect.boolValue,
          },
        },
      },
    }
  }
  if (effect.effectType === 4) {
    const id = dreamEducationIdFromEffectTarget(
      effect.targetKey,
      'ResearchTime',
    )
    if (id !== null) {
      return {
        ...state,
        dream: {
          ...state.dream,
          education: {
            ...state.dream.education,
            [id]: {
              ...state.dream.education[id],
              researchTime: effect.numericValue,
            },
          },
        },
      }
    }
    return {
      ...state,
      dream: {
        ...state.dream,
        parameters: {
          ...state.dream.parameters,
          rocketsPerSpaceFactory: toDiscrete(effect.numericValue),
        },
      },
    }
  }
  if (effect.effectType === 5) {
    const value = toDiscrete(effect.numericValue)
    return {
      ...state,
      dream: {
        ...state.dream,
        [effect.targetKey]: value,
      },
    }
  }
  if (effect.effectType === 6) {
    const value = toDiscrete(effect.numericValue)
    if (effect.targetKey === 'solarPanelGeneration') {
      return {
        ...state,
        dream: {
          ...state.dream,
          parameters: {
            ...state.dream.parameters,
            solarPanelGeneration:
              state.dream.parameters.solarPanelGeneration > value
                ? state.dream.parameters.solarPanelGeneration
                : value,
          },
        },
      }
    }
    const target = effect.targetKey as 'hunters' | 'gatherers'
    return {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...state.dream.resources,
          [target]:
            state.dream.resources[target] > value
              ? state.dream.resources[target]
              : value,
        },
      },
    }
  }
  if (effect.effectType === 7) {
    const value = toDiscrete(effect.numericValue)
    const target = effect.targetKey as
      | 'huntersPerPurchase'
      | 'gatherersPerPurchase'
    return {
      ...state,
      dream: {
        ...state.dream,
        [target]: state.dream[target] > value
          ? state.dream[target]
          : value,
      },
    }
  }

  return {
    ...state,
    dream: {
      ...state.dream,
      disasterStage: toDiscrete(effect.numericValue),
    },
  }
}

function exactValidatedDreamUpgradeDiscrete(value: number): bigint {
  return exactRoundedNonNegativeBigInt(value)!
}

/** Applies the canonical state patch shared by every mathematics completion path. */
export function applyDreamMathematicsCompletionParity(
  state: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  const mathematics = state.dream.education.mathematics
  return {
    ...state,
    dream: {
      ...state.dream,
      education: {
        ...state.dream.education,
        mathematics: {
          ...mathematics,
          complete: true,
        },
      },
      parameters: {
        ...state.dream.parameters,
        solarPanelGeneration:
          state.dream.parameters.solarPanelGeneration >
          MATHEMATICS_SOLAR_GENERATION_MINIMUM
            ? state.dream.parameters.solarPanelGeneration
            : MATHEMATICS_SOLAR_GENERATION_MINIMUM,
      },
    },
  }
}

function rejectedPurchase(
  state: CanonicalGameStateV1,
  code: Exclude<SimulationUpgradePurchaseCode, 'purchased'>,
): SimulationUpgradePurchaseResult {
  return {
    accepted: false,
    changed: false,
    code,
    candidate: state,
    unsupportedEffect: null,
  }
}

function rejectedEducationStart(
  state: CanonicalGameStateV1,
  code: Exclude<DreamEducationStartCode, 'started'>,
): DreamEducationStartResult {
  return {
    accepted: false,
    changed: false,
    code,
    candidate: state,
  }
}

/** Resolves an authored upgrade-effect target to its canonical education subject. */
export function dreamEducationIdFromEffectTarget(
  target: string,
  suffix: 'Complete' | 'ResearchTime',
): DreamEducationId | null {
  if (!target.endsWith(suffix)) return null
  const id = target.slice(0, -suffix.length)
  return isDreamEducationId(id) ? id : null
}
