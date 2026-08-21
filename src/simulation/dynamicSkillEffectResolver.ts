import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  resolveDynamicFacilitySkillEffect,
  type DynamicFacilitySkillContext,
} from './dynamicFacilitySkillEffects'
import {
  resolveMoneyScienceSkillEffect,
  type MoneyScienceCanonicalInputs,
  type MoneyScienceDerivedInputs,
  type MoneyScienceSkillEffectIssue,
} from './moneyScienceSkillEffects'
import {
  type PanelDynamicEffectInputs,
  tryResolvePanelLifetimeDynamicEffect,
  tryResolvePanelsPerSecondDynamicEffect,
} from './panelDynamicEffects'
import {
  type PlanetGenerationDynamicInputs,
  tryResolvePlanetGenerationDynamicEffect,
} from './planetGenerationDynamicEffects'
import {
  type ShouldersAccrualDynamicInputs,
  type TinkerDynamicInputs,
  tryResolveShouldersAccrualDynamicEffect,
  tryResolveTinkerDynamicEffect,
} from './shouldersTinkerDynamicEffects'

export type DynamicSkillEffectIssue =
  | MoneyScienceSkillEffectIssue
  | {
      readonly code: 'DYSON_DYNAMIC_SKILL_EFFECT_INVALID'
      readonly path: string
      readonly detail: string
    }

export type DynamicSkillEffectResolution =
  | { readonly handled: false }
  | { readonly handled: true; readonly ok: true; readonly value: number }
  | {
      readonly handled: true
      readonly ok: false
      readonly issue: DynamicSkillEffectIssue
    }

export interface PreparedDynamicSkillEffectResolver {
  /**
   * Resolves any number of effect IDs against the same immutable derivation
   * inputs. Preparing once avoids rebuilding the owned-skill set and the
   * family-specific input objects for every materialized effect.
   */
  readonly resolve: (
    effectId: string,
  ) => DynamicSkillEffectResolution
}

interface PreparedDynamicSkillEffectInputs {
  readonly moneyScienceState: MoneyScienceCanonicalInputs
  readonly moneyScienceDerived: MoneyScienceDerivedInputs
  readonly tuning: Readonly<DysonCompatibilityTuning>
  readonly facility: Readonly<DynamicFacilitySkillContext>
  readonly panel: Readonly<PanelDynamicEffectInputs>
  readonly planetGeneration: Readonly<PlanetGenerationDynamicInputs>
  readonly shoulders: Readonly<ShouldersAccrualDynamicInputs>
  readonly tinker: Readonly<TinkerDynamicInputs>
}

/**
 * Captures every shared input consumed by dynamic skill effects once for one
 * Dyson derivation. The returned authority is intentionally opaque: callers
 * can resolve effects, but cannot mutate or couple themselves to the prepared
 * inputs.
 */
export function prepareDynamicSkillEffectResolver(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): PreparedDynamicSkillEffectResolver {
  const inputs = prepareDynamicSkillEffectInputs(
    state,
    tuning,
    snapshot,
  )
  return Object.freeze({
    resolve: (effectId: string) =>
      resolvePreparedDynamicSkillEffect(effectId, inputs),
  })
}

function prepareDynamicSkillEffectInputs(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): PreparedDynamicSkillEffectInputs {
  const ownedSkills = new Set(
    Object.entries(state.skills.byId)
      .filter(([, skill]) => skill.owned)
      .map(([id]) => id),
  )
  const assemblyLines = state.dyson.facilities.assembly_lines
  const managers = state.dyson.facilities.ai_managers
  const servers = state.dyson.facilities.servers
  const dataCenters = state.dyson.facilities.data_centers
  const planets = state.dyson.facilities.planets
  const scienceBoostLevel =
    state.research.levelsById['research.science_boost'] ?? 0
  const panelArea =
    snapshot.panelsPerSecond * snapshot.panelLifetimeSeconds

  const moneyScienceState: MoneyScienceCanonicalInputs = {
    dyson: state.dyson,
    skills: state.skills,
    research: state.research,
    quantum: state.quantum,
  }
  const moneyScienceDerived: MoneyScienceDerivedInputs = Object.freeze({
    panelsPerSecond: snapshot.panelsPerSecond,
    panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
    scienceMultiplier: snapshot.scienceMultiplier,
  })
  const panel: PanelDynamicEffectInputs = Object.freeze({
    ownedSkills,
    botMultitasking: state.quantum.unlocks.botMultitasking,
    botDistribution: state.dyson.botDistribution,
    fragments: state.skills.fragments,
    managers,
    androidsTimerSeconds:
      state.skills.byId.androids?.timerSeconds ?? 0,
    workers: state.dyson.workers,
    totalPanelsDecayed: state.dyson.totalPanelsDecayed,
    panelsPerSecond: snapshot.panelsPerSecond,
    panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
    bots: state.dyson.bots,
  })
  return Object.freeze({
    moneyScienceState: Object.freeze(moneyScienceState),
    moneyScienceDerived,
    tuning,
    facility: Object.freeze({
      panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
      fragments: Number(state.skills.fragments),
      assignedSkillPoints: Number(state.skills.points),
      serversTotal: servers[0] + servers[1],
      manualDataCenters: dataCenters[1],
      effectivePlanets:
        planets[0] +
        planets[1] * (ownedSkills.has('terraIrradiant') ? 12 : 1),
      starsSurrounded: Math.floor(panelArea / 20_000),
      galaxiesEngulfed: Math.floor(
        panelArea / 20_000 / 100_000_000_000,
      ),
      rudimentarySingularityProduction:
        snapshot.rudimentarySingularityProduction,
      pocketDimensionsProduction:
        snapshot.pocketDimensionsProduction,
      superRadiantScatteringTimerSeconds:
        state.skills.byId.superRadiantScattering?.timerSeconds ?? 0,
    }),
    panel,
    planetGeneration: Object.freeze({
      ownedSkills,
      researchers: state.dyson.researchers,
      fragments: state.skills.fragments,
      assemblyLines,
      planets,
      panelsPerSecond: snapshot.panelsPerSecond,
      panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
      bots: state.dyson.bots,
      scienceBoostLevel,
    }),
    shoulders: Object.freeze({
      ownedSkills,
      scienceBoostLevel,
      scientificPlanetsProduction:
        snapshot.scientificPlanetsProduction,
      pocketDimensionsProduction:
        snapshot.pocketDimensionsProduction,
    }),
    tinker: Object.freeze({
      ownedSkills,
      assemblyLines,
      managerAssemblyLineProduction:
        snapshot.managerAssemblyLineProduction,
    }),
  })
}

/**
 * Composes every characterized branch of Unity
 * SkillEffectCatalog.TryResolveDynamicValue over one immutable old snapshot.
 */
export function resolveDynamicSkillEffect(
  effectId: string,
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): DynamicSkillEffectResolution {
  // Preserve the compatibility API's original short-circuit: recognized
  // money/science effects do not require preparing unrelated effect-family
  // inputs, and retain their specific typed validation failures.
  const moneyScience = resolveMoneyScienceSkillEffect(
    effectId,
    state,
    tuning,
    {
      panelsPerSecond: snapshot.panelsPerSecond,
      panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
      scienceMultiplier: snapshot.scienceMultiplier,
    },
  )
  if (moneyScience.handled) return moneyScience

  try {
    return resolvePreparedNonMoneySkillEffect(
      effectId,
      prepareDynamicSkillEffectInputs(state, tuning, snapshot),
    )
  } catch (error) {
    return invalidResolution(effectId, error)
  }
}

function resolvePreparedDynamicSkillEffect(
  effectId: string,
  inputs: PreparedDynamicSkillEffectInputs,
): DynamicSkillEffectResolution {
  const moneyScience = resolveMoneyScienceSkillEffect(
    effectId,
    inputs.moneyScienceState,
    inputs.tuning,
    inputs.moneyScienceDerived,
  )
  if (moneyScience.handled) return moneyScience

  return resolvePreparedNonMoneySkillEffect(effectId, inputs)
}

function resolvePreparedNonMoneySkillEffect(
  effectId: string,
  inputs: PreparedDynamicSkillEffectInputs,
): DynamicSkillEffectResolution {
  try {
    const facility = resolveDynamicFacilitySkillEffect(
      effectId,
      inputs.facility,
    )
    if (facility !== undefined) return resolved(effectId, facility)

    const panelLifetime = tryResolvePanelLifetimeDynamicEffect(
      effectId,
      inputs.panel,
    )
    if (panelLifetime !== undefined) {
      return resolved(effectId, panelLifetime)
    }
    const panelsPerSecond =
      tryResolvePanelsPerSecondDynamicEffect(effectId, inputs.panel)
    if (panelsPerSecond !== undefined) {
      return resolved(effectId, panelsPerSecond)
    }

    const planetGeneration = tryResolvePlanetGenerationDynamicEffect(
      effectId,
      inputs.planetGeneration,
    )
    if (planetGeneration !== undefined) {
      return resolved(effectId, planetGeneration)
    }

    const shoulders = tryResolveShouldersAccrualDynamicEffect(
      effectId,
      inputs.shoulders,
    )
    if (shoulders !== undefined) return resolved(effectId, shoulders)

    const tinker = tryResolveTinkerDynamicEffect(
      effectId,
      inputs.tinker,
    )
    return tinker === undefined
      ? { handled: false }
      : resolved(effectId, tinker)
  } catch (error) {
    return invalidResolution(effectId, error)
  }
}

function invalidResolution(
  effectId: string,
  error: unknown,
): DynamicSkillEffectResolution {
  return {
    handled: true,
    ok: false,
    issue: {
      code: 'DYSON_DYNAMIC_SKILL_EFFECT_INVALID',
      path: `effects.${effectId}`,
      detail:
        error instanceof Error
          ? error.message
          : `Dynamic effect '${effectId}' failed.`,
    },
  }
}

function resolved(
  effectId: string,
  value: number,
): DynamicSkillEffectResolution {
  if (!Number.isFinite(value)) {
    return {
      handled: true,
      ok: false,
      issue: {
        code: 'DYSON_DYNAMIC_SKILL_EFFECT_INVALID',
        path: `effects.${effectId}`,
        detail: `Dynamic effect '${effectId}' resolved to a non-finite value.`,
      },
    }
  }
  return { handled: true, ok: true, value }
}
