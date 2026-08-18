import { getGameAssetsByKind } from '../../src/game-data/catalog'
import type { DysonCompatibilityTuning } from '../../src/game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../../src/game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../../src/game-state/types'
import { applyCanonicalInfinityReset } from '../../src/simulation/canonicalInfinityReset'
import { resetCanonicalSkills } from '../../src/simulation/canonicalSkillTransactions'
import type { DynamicSkillEffectResolution } from '../../src/simulation/dynamicSkillEffectResolver'
import { prepareDynamicSkillEffectResolver } from '../../src/simulation/dynamicSkillEffectResolver'
import { applyCanonicalQuantumReset } from '../../src/simulation/quantumTransitions'
import { evaluateSkillEffectCondition } from '../../src/simulation/skillEffectConditions'
import type {
  SkillEffectMaterializationContext,
} from '../../src/simulation/skillEffectMaterializer'
import { materializeSkillEffectsForContexts } from '../../src/simulation/skillEffectMaterializer'
import type { StatEffect } from '../../src/simulation/stat'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_SNAPSHOT,
  DETERMINISTIC_DYSON_TUNING,
} from './deterministicMatureDysonFixture'

export interface SkillEffectTarget {
  readonly statId: string
  readonly facilityId?: CanonicalFacilityId
}

export const MATERIALIZED_SKILL_EFFECT_TARGETS: readonly SkillEffectTarget[] =
  Object.freeze([
    { statId: 'Global.MoneyMultiplier' },
    { statId: 'Global.ScienceMultiplier' },
    { statId: 'Global.PanelLifetime' },
    { statId: 'Global.PanelsPerSecond' },
    { statId: 'Global.PlanetsPerSecond' },
    { statId: 'Global.MoneyPerSecond' },
    { statId: 'Global.SciencePerSecond' },
    { statId: 'Global.ScienceBoostPerSecond' },
    { statId: 'Global.MoneyMultiUpgradePerSecond' },
    { statId: 'Global.Tinker.AssemblyYield' },
    {
      statId: 'Facility.AssemblyLine.Modifier',
      facilityId: 'assembly_lines',
    },
    {
      statId: 'Facility.Manager.Modifier',
      facilityId: 'ai_managers',
    },
    {
      statId: 'Facility.Server.Modifier',
      facilityId: 'servers',
    },
    {
      statId: 'Facility.DataCenter.Modifier',
      facilityId: 'data_centers',
    },
    {
      statId: 'Facility.Planet.Modifier',
      facilityId: 'planets',
    },
    {
      statId: 'Facility.Matrioshka.Modifier',
      facilityId: 'matrioshka_brains',
    },
    {
      statId: 'Facility.Birch.Modifier',
      facilityId: 'birch_planets',
    },
    {
      statId: 'Facility.Galactic.Modifier',
      facilityId: 'galactic_brains',
    },
    {
      statId: 'Facility.AssemblyLine.Production',
      facilityId: 'assembly_lines',
    },
    {
      statId: 'Facility.Manager.Production',
      facilityId: 'ai_managers',
    },
    {
      statId: 'Facility.Server.Production',
      facilityId: 'servers',
    },
    {
      statId: 'Facility.DataCenter.Production',
      facilityId: 'data_centers',
    },
    {
      statId: 'Facility.Planet.Production',
      facilityId: 'planets',
    },
  ])

export const ALL_EFFECT_DEFINITION_IDS = Object.freeze(
  getGameAssetsByKind('GameData.EffectDefinition').map(
    (asset) => asset.id,
  ),
)

export type SkillEffectMaterializer = (
  context: Readonly<SkillEffectMaterializationContext>,
) => readonly StatEffect[]

export type DynamicSkillEffectResolver = (
  effectId: string,
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
) => DynamicSkillEffectResolution

export function materializeCertificationTargets(
  state: CanonicalGameStateV1,
  materializer: SkillEffectMaterializer,
  dynamicResolver: DynamicSkillEffectResolver,
  tuning: Readonly<DysonCompatibilityTuning> =
    DETERMINISTIC_DYSON_TUNING,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot> =
    DETERMINISTIC_DYSON_SNAPSHOT,
): Readonly<Record<string, readonly StatEffect[]>> {
  const contexts = createMaterializationContexts(
    state,
    dynamicResolver,
    tuning,
    snapshot,
  )
  return Object.freeze(
    Object.fromEntries(
      contexts.map((context) => [
        context.targetStatId,
        materializer(context),
      ]),
    ),
  )
}

/** Exercises the same batch and prepared-resolver path used by derivation. */
export function materializeCandidateCertificationTargets(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning> =
    DETERMINISTIC_DYSON_TUNING,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot> =
    DETERMINISTIC_DYSON_SNAPSHOT,
): Readonly<Record<string, readonly StatEffect[]>> {
  const prepared = prepareDynamicSkillEffectResolver(
    state,
    tuning,
    snapshot,
  )
  const contexts = createMaterializationContexts(
    state,
    (effectId) => prepared.resolve(effectId),
    tuning,
    snapshot,
  )
  const groups = materializeSkillEffectsForContexts(contexts)
  return Object.freeze(
    Object.fromEntries(
      contexts.map((context, index) => [
        context.targetStatId,
        groups[index] ?? [],
      ]),
    ),
  )
}

function createMaterializationContexts(
  state: CanonicalGameStateV1,
  dynamicResolver: DynamicSkillEffectResolver,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): readonly SkillEffectMaterializationContext[] {
  const ownedSkillIds = new Set(
    Object.entries(state.skills.byId)
      .filter(([, skill]) => skill.owned)
      .map(([id]) => id),
  )
  return Object.freeze(
    MATERIALIZED_SKILL_EFFECT_TARGETS.map(
      ({ statId, facilityId }): SkillEffectMaterializationContext => ({
            ownedSkillIds,
            targetStatId: statId,
            facility:
              facilityId === undefined
                ? undefined
                : { id: facilityId, tags: [] },
            isConditionMet: (_effectId, condition) =>
              evaluateSkillEffectCondition(condition, {
                facilities: state.dyson.facilities,
                currentFacility:
                  facilityId === undefined
                    ? undefined
                    : {
                        owned: state.dyson.facilities[facilityId],
                      },
              }),
            resolveDynamicValue: (effectId) => {
              const result = dynamicResolver(
                effectId,
                state,
                tuning,
                snapshot,
              )
              if (!result.handled) return undefined
              if (!result.ok) throw new Error(result.issue.detail)
              return result.value
            },
          }),
    ),
  )
}

export interface SkillEffectCertificationScenario {
  readonly name: string
  readonly state: CanonicalGameStateV1
}

export function createSkillEffectCertificationScenarios(): readonly SkillEffectCertificationScenario[] {
  const mature = createDeterministicMatureDysonFixture({
    ownedSkillIds: 'all',
  })
  const skillReset = resetCanonicalSkills(mature)
  if (!skillReset.accepted) {
    throw new Error(`Deterministic skill reset failed: ${skillReset.reason}`)
  }
  const infinityReset = applyCanonicalInfinityReset(mature, {
    breakInfinity: true,
    requestedReward: 42n,
    artifactSkillPoints: 0n,
  })
  if (!infinityReset.ok) {
    throw new Error(
      `Deterministic Infinity reset failed: ${JSON.stringify(infinityReset.issues)}`,
    )
  }
  const quantumReset = applyCanonicalQuantumReset(mature, 0n)
  if (!quantumReset.ok) {
    throw new Error(
      `Deterministic Quantum reset failed: ${JSON.stringify(quantumReset.issues)}`,
    )
  }

  return Object.freeze([
    {
      name: 'no owned skills',
      state: createDeterministicMatureDysonFixture(),
    },
    {
      name: 'representative static skills',
      state: createDeterministicMatureDysonFixture({
        ownedSkillIds: [
          'startHereTree',
          'assemblyLineTree',
          'workerEfficiencyTree',
          'superchargedPower',
          'economicDominance',
        ],
      }),
    },
    {
      name: 'representative dynamic skills',
      state: createDeterministicMatureDysonFixture({
        ownedSkillIds: [
          'parallelComputation',
          'stayingPower',
          'androids',
          'planetAssembly',
          'shouldersOfGiants',
          'scientificPlanets',
          'manualLabour',
          'shouldersOfPrecursors',
          'higgsBoson',
        ],
      }),
    },
    {
      name: 'conditional effects below threshold',
      state: createDeterministicMatureDysonFixture({
        ownedSkillIds: ['avocados'],
        conditionsMet: false,
      }),
    },
    {
      name: 'conditional effects at threshold',
      state: createDeterministicMatureDysonFixture({
        ownedSkillIds: ['avocados'],
        conditionsMet: true,
      }),
    },
    { name: 'all skills mature state', state: mature },
    { name: 'skill reset result', state: skillReset.state },
    { name: 'Infinity reset result', state: infinityReset.state },
    { name: 'Quantum reset result', state: quantumReset.state },
  ])
}
