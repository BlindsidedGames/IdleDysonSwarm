import type { DysonCompatibilityTuning } from '../../src/game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../../src/game-state/skillEffectEvaluationSnapshot'
import type { CanonicalGameStateV1 } from '../../src/game-state/types'
import { resolveDynamicFacilitySkillEffect } from '../../src/simulation/dynamicFacilitySkillEffects'
import type {
  DynamicSkillEffectIssue,
  DynamicSkillEffectResolution,
} from '../../src/simulation/dynamicSkillEffectResolver'
import { resolveMoneyScienceSkillEffect } from '../../src/simulation/moneyScienceSkillEffects'
import {
  tryResolvePanelLifetimeDynamicEffect,
  tryResolvePanelsPerSecondDynamicEffect,
} from '../../src/simulation/panelDynamicEffects'
import { tryResolvePlanetGenerationDynamicEffect } from '../../src/simulation/planetGenerationDynamicEffects'
import {
  tryResolveShouldersAccrualDynamicEffect,
  tryResolveTinkerDynamicEffect,
} from '../../src/simulation/shouldersTinkerDynamicEffects'

/**
 * Frozen test oracle for the pre-optimization dynamic resolver orchestration.
 * It intentionally retains the repeated setup which production optimization
 * is expected to remove. Keep this independent from the production resolver.
 */
export function resolveReferenceDynamicSkillEffect(
  effectId: string,
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): DynamicSkillEffectResolution {
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
    const panelInputs = {
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
    }
    const panelArea =
      snapshot.panelsPerSecond * snapshot.panelLifetimeSeconds
    const facility = resolveDynamicFacilitySkillEffect(effectId, {
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
      pocketDimensionsProduction: snapshot.pocketDimensionsProduction,
      superRadiantScatteringTimerSeconds:
        state.skills.byId.superRadiantScattering?.timerSeconds ?? 0,
    })
    if (facility !== undefined) return resolved(effectId, facility)

    const panelLifetime = tryResolvePanelLifetimeDynamicEffect(
      effectId,
      panelInputs,
    )
    if (panelLifetime !== undefined) {
      return resolved(effectId, panelLifetime)
    }
    const panelsPerSecond = tryResolvePanelsPerSecondDynamicEffect(
      effectId,
      panelInputs,
    )
    if (panelsPerSecond !== undefined) {
      return resolved(effectId, panelsPerSecond)
    }

    const planetGeneration = tryResolvePlanetGenerationDynamicEffect(
      effectId,
      {
        ownedSkills,
        researchers: state.dyson.researchers,
        fragments: state.skills.fragments,
        assemblyLines,
        planets,
        panelsPerSecond: snapshot.panelsPerSecond,
        panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
        bots: state.dyson.bots,
        scienceBoostLevel:
          state.research.levelsById['research.science_boost'] ?? 0,
      },
    )
    if (planetGeneration !== undefined) {
      return resolved(effectId, planetGeneration)
    }

    const shoulders = tryResolveShouldersAccrualDynamicEffect(
      effectId,
      {
        ownedSkills,
        scienceBoostLevel:
          state.research.levelsById['research.science_boost'] ?? 0,
        scientificPlanetsProduction:
          snapshot.scientificPlanetsProduction,
        pocketDimensionsProduction:
          snapshot.pocketDimensionsProduction,
      },
    )
    if (shoulders !== undefined) return resolved(effectId, shoulders)

    const tinker = tryResolveTinkerDynamicEffect(effectId, {
      ownedSkills,
      assemblyLines,
      managerAssemblyLineProduction:
        snapshot.managerAssemblyLineProduction,
    })
    return tinker === undefined
      ? { handled: false }
      : resolved(effectId, tinker)
  } catch (error) {
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
}

function resolved(
  effectId: string,
  value: number,
): DynamicSkillEffectResolution {
  if (!Number.isFinite(value)) {
    const issue: DynamicSkillEffectIssue = {
      code: 'DYSON_DYNAMIC_SKILL_EFFECT_INVALID',
      path: `effects.${effectId}`,
      detail: `Dynamic effect '${effectId}' resolved to a non-finite value.`,
    }
    return { handled: true, ok: false, issue }
  }
  return { handled: true, ok: true, value }
}
