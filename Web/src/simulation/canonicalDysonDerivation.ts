import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
} from './dysonFacilities'
import {
  createBasicDysonState,
  type BasicDysonRates,
} from './dysonModel'
import {
  combineDysonProductionArrivalRates,
  type DysonProductionArrivalRates,
} from './dysonProductionArrivals'
import {
  deriveMegaStructureRates,
  type MegaStructureRateIssueCode,
  type MegaStructureRates,
} from './megaStructureRates'
import {
  avocadoDysonMultiplier,
  infinityFacilityMultiplier,
  quantumCashMultiplier,
  quantumScienceMultiplier,
} from './dysonPrestigeEffects'
import {
  materializeDysonResearchEffects,
  type DysonResearchEffectIssueCode,
  type MaterializedDysonResearchEffect,
} from './dysonResearchEffects'
import { deriveSecretBuffs } from './secretBuffs'
import { calculateStat, type StatEffect } from './stat'
import {
  resolveDynamicSkillEffect,
  type DynamicSkillEffectIssue,
} from './dynamicSkillEffectResolver'
import { evaluateSkillEffectCondition } from './skillEffectConditions'
import { materializeSkillEffects } from './skillEffectMaterializer'
import { publishDysonSkillEffectEvaluationSnapshot } from './dysonSnapshotPublication'

export interface DysonEntitlements {
  readonly permanentDoubleIp: boolean
}

export type DysonDerivationIssueCode =
  | 'DYSON_OWNED_SKILL_UNSUPPORTED'
  | 'DYSON_QUANTUM_LEVEL_UNSUPPORTED'
  | 'DYSON_SKILL_EFFECT_MATERIALIZATION_INVALID'
  | DysonResearchEffectIssueCode
  | MegaStructureRateIssueCode
  | DynamicSkillEffectIssue['code']

export interface DysonDerivationIssue {
  readonly code: DysonDerivationIssueCode
  readonly path: string
  readonly detail: string
}

export interface DerivedBasicDysonState {
  readonly allocation: {
    readonly workers: number
    readonly researchers: number
  }
  readonly globals: {
    readonly moneyMultiplier: number
    readonly scienceMultiplier: number
    readonly panelsPerSecond: number
    readonly panelLifetimeSeconds: number
  }
  readonly auxiliary: {
    readonly planetGenerationPerSecond: number
    readonly scienceBoostPerSecond: number
    readonly moneyUpgradePerSecond: number
    readonly tinkerAssemblyYield: number
  }
  readonly facilityModifiers: Readonly<
    Record<CanonicalFacilityId, number>
  >
  readonly rates: Readonly<BasicDysonRates>
  readonly megaRates: Readonly<MegaStructureRates>
  readonly productionArrivalRates: Readonly<DysonProductionArrivalRates>
  readonly nextEvaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
  readonly entitlements: DysonEntitlements
}

export type DysonDerivationResult =
  | { readonly ok: true; readonly value: DerivedBasicDysonState }
  | { readonly ok: false; readonly issues: readonly DysonDerivationIssue[] }

const FACILITY_MODIFIER_STATS: Readonly<
  Record<CanonicalFacilityId, string>
> = {
  assembly_lines: 'Facility.AssemblyLine.Modifier',
  ai_managers: 'Facility.Manager.Modifier',
  servers: 'Facility.Server.Modifier',
  data_centers: 'Facility.DataCenter.Modifier',
  planets: 'Facility.Planet.Modifier',
  matrioshka_brains: 'Facility.Matrioshka.Modifier',
  birch_planets: 'Facility.Birch.Modifier',
  galactic_brains: 'Facility.Galactic.Modifier',
}

const CANONICAL_DYSON_FACILITY_IDS = [
  ...BASIC_DYSON_FACILITY_IDS,
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const satisfies readonly CanonicalFacilityId[]

/**
 * Reconstructs the exact characterized Basic Dyson derived state from
 * canonical durable causes plus compatibility tuning and platform
 * entitlements. Unsupported active dependencies reject as typed issues rather
 * than falling back to cached Unity values or approximate formulas.
 */
export function deriveBasicDysonState(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  entitlements: DysonEntitlements,
  evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): DysonDerivationResult {
  const issues = findUnsupportedDependencies(state)
  if (issues.length > 0) {
    return { ok: false, issues: Object.freeze(issues) }
  }

  const ownedSkills = Object.entries(state.skills.byId)
    .filter(([, skill]) => skill.owned)
    .map(([id]) => id)
  const skillEffects = materializeCanonicalSkillEffects(
    state,
    tuning,
    evaluationSnapshot,
    ownedSkills,
  )
  if (!skillEffects.ok) {
    return { ok: false, issues: Object.freeze([skillEffects.issue]) }
  }
  const secrets = deriveSecretBuffs(
    state.infinity.secretsOfTheUniverse,
  )
  const research = materializeDysonResearchEffects(
    state.research.levelsById,
    tuning,
    secrets.researchCoefficientOverrides,
  )
  if (!research.ok) {
    return {
      ok: false,
      issues: Object.freeze(
        research.issues.map((issue) => Object.freeze({ ...issue })),
      ),
    }
  }
  const avocadoMultiplier = avocadoDysonMultiplier(state.avocado)
  const moneyMultiplier = calculateStat(1, [
    ...effectsFor(research.effects, 'Global.MoneyMultiplier'),
    ...effectsAt(skillEffects.byStat, 'Global.MoneyMultiplier'),
    multiplierEffect(
      'prestige.cash_multiplier',
      quantumCashMultiplier(state.quantum),
      85,
    ),
    multiplierEffect(
      'secrets.cash_multiplier',
      secrets.multipliers.cash,
      90,
    ),
    multiplierEffect(
      'prestige.avocato_multiplier',
      avocadoMultiplier,
      95,
    ),
  ].filter(isEffect))
  const scienceMultiplier = calculateStat(1, [
    ...effectsFor(research.effects, 'Global.ScienceMultiplier'),
    ...effectsAt(skillEffects.byStat, 'Global.ScienceMultiplier'),
    multiplierEffect(
      'prestige.science_multiplier',
      quantumScienceMultiplier(state.quantum),
      85,
    ),
    multiplierEffect(
      'secrets.science_multiplier',
      secrets.multipliers.science,
      90,
    ),
    multiplierEffect(
      'prestige.avocato_multiplier',
      avocadoMultiplier,
      95,
    ),
  ].filter(isEffect))
  const panelLifetime = calculateStat(10, [
    ...effectsFor(research.effects, 'Global.PanelLifetime'),
    ...effectsAt(skillEffects.byStat, 'Global.PanelLifetime'),
  ])
  const planetGenerationPerSecond = calculateStat(
    0,
    effectsAt(skillEffects.byStat, 'Global.PlanetsPerSecond'),
  )
  const scientificPlanetsProduction = calculateStat(
    0,
    effectsAt(skillEffects.byStat, 'Global.PlanetsPerSecond').filter(
      (effect) =>
        effect.id ===
        'effect.scientificPlanets.planets_per_second',
    ),
  )
  const scienceBoostPerSecond = calculateStat(
    0,
    effectsAt(skillEffects.byStat, 'Global.ScienceBoostPerSecond'),
  )
  const moneyUpgradePerSecond = calculateStat(
    0,
    effectsAt(
      skillEffects.byStat,
      'Global.MoneyMultiUpgradePerSecond',
    ),
  )
  const tinkerAssemblyYield = calculateStat(
    0,
    effectsAt(skillEffects.byStat, 'Global.Tinker.AssemblyYield'),
  )
  const facilityModifiers = deriveFacilityModifiers(
    state,
    research.effects,
    skillEffects.byStat,
    secrets.multipliers,
    avocadoMultiplier,
  )
  const mega = deriveMegaStructureRates(state, {
    matrioshka_brains: facilityModifiers.matrioshka_brains,
    birch_planets: facilityModifiers.birch_planets,
    galactic_brains: facilityModifiers.galactic_brains,
  })
  if (!mega.ok) {
    return {
      ok: false,
      issues: Object.freeze(
        mega.issues.map((issue) => Object.freeze({ ...issue })),
      ),
    }
  }
  const model = createBasicDysonState({
    money: state.dyson.money,
    science: state.dyson.science,
    bots: state.dyson.bots,
    panels: state.dyson.totalPanelsDecayed,
    workers: state.dyson.workers,
    researchers: state.dyson.researchers,
    moneyMultiplier,
    scienceMultiplier,
    panelRateMultiplier: tuning.panelsPerSecMulti,
    panelLifetime,
    planetGenerationPerSecond,
    ownedSkills,
    skillEffectsByStat: skillEffects.byStat,
    facilities: Object.fromEntries(
      BASIC_DYSON_FACILITY_IDS.map((id) => [
        id,
        [...state.dyson.facilities[id]],
      ]),
    ) as Record<BasicDysonFacilityId, [number, number]>,
    modifiers: Object.fromEntries(
      BASIC_DYSON_FACILITY_IDS.map((id) => [id, facilityModifiers[id]]),
    ) as Record<BasicDysonFacilityId, number>,
    modifierEffectsApplied: true,
    automation: {
      enabledFacilities: BASIC_DYSON_FACILITY_IDS.filter(
        (id) => state.dyson.automation.enabledFacilities[id],
      ),
      buyMode: state.dyson.automation.buyMode,
      roundedBulkBuy: state.dyson.automation.roundedBulkBuy,
    },
  })
  const nextEvaluationSnapshot =
    publishDysonSkillEffectEvaluationSnapshot(state, {
      panelsPerSecond: model.rates.panels,
      panelLifetimeSeconds: panelLifetime,
      scienceMultiplier,
      managerAssemblyLineProduction: model.rates.assembly_lines,
      scientificPlanetsProduction,
    })

  return {
    ok: true,
    value: Object.freeze({
      allocation: Object.freeze({
        workers: state.dyson.workers,
        researchers: state.dyson.researchers,
      }),
      globals: Object.freeze({
        moneyMultiplier,
        scienceMultiplier,
        panelsPerSecond: model.rates.panels,
        panelLifetimeSeconds: panelLifetime,
      }),
      auxiliary: Object.freeze({
        planetGenerationPerSecond,
        scienceBoostPerSecond,
        moneyUpgradePerSecond,
        tinkerAssemblyYield,
      }),
      facilityModifiers: Object.freeze(facilityModifiers),
      rates: Object.freeze({ ...model.rates }),
      megaRates: mega.rates,
      productionArrivalRates: combineDysonProductionArrivalRates(
        model.rates,
        mega.rates,
      ),
      nextEvaluationSnapshot,
      entitlements: Object.freeze({ ...entitlements }),
    }),
  }
}

function findUnsupportedDependencies(
  state: CanonicalGameStateV1,
): DysonDerivationIssue[] {
  const issues: DysonDerivationIssue[] = []
  for (const [id, levels] of [
    ['cashBonusLevels', state.quantum.cashBonusLevels],
    ['scienceBonusLevels', state.quantum.scienceBonusLevels],
  ] as const) {
    if (levels > BigInt(Number.MAX_SAFE_INTEGER)) {
      issues.push({
        code: 'DYSON_QUANTUM_LEVEL_UNSUPPORTED',
        path: `quantum.${id}`,
        detail: `Quantum bonus '${id}' exceeds the characterized numeric range.`,
      })
    }
  }
  return issues
}

function effectsFor(
  effects: readonly MaterializedDysonResearchEffect[],
  targetStatId: string,
): StatEffect[] {
  return effects.filter((effect) => effect.targetStatId === targetStatId)
}

function multiplierEffect(
  id: string,
  value: number,
  order: number,
): StatEffect | undefined {
  return Math.abs(value - 1) <= 1e-12
    ? undefined
    : { id, operation: 'multiply', value, order }
}

function isEffect(effect: StatEffect | undefined): effect is StatEffect {
  return effect !== undefined
}

function deriveFacilityModifiers(
  state: CanonicalGameStateV1,
  researchEffects: readonly MaterializedDysonResearchEffect[],
  skillEffectsByStat: Readonly<
    Record<string, readonly StatEffect[]>
  >,
  secrets: Readonly<{
    assemblyLines: number
    aiManagers: number
    servers: number
    planets: number
  }>,
  avocadoMultiplier: number,
): Record<CanonicalFacilityId, number> {
  const infinityThresholds: Readonly<
    Record<CanonicalFacilityId, bigint>
  > = {
    assembly_lines: 0n,
    ai_managers: 2n,
    servers: 3n,
    data_centers: 4n,
    planets: 5n,
    matrioshka_brains: 5n,
    birch_planets: 10n,
    galactic_brains: 20n,
  }
  const secretMultipliers: Readonly<
    Record<CanonicalFacilityId, number>
  > = {
    assembly_lines: secrets.assemblyLines,
    ai_managers: secrets.aiManagers,
    servers: secrets.servers,
    data_centers: 1,
    planets: secrets.planets,
    matrioshka_brains: 1,
    birch_planets: 1,
    galactic_brains: 1,
  }
  return Object.fromEntries(
    CANONICAL_DYSON_FACILITY_IDS.map((id) => {
      const target = FACILITY_MODIFIER_STATS[id]
      const effects: StatEffect[] = [
        ...effectsFor(researchEffects, target),
        ...effectsAt(skillEffectsByStat, target),
      ]
      const infinity = infinityFacilityMultiplier(
        state.infinity.points,
        infinityThresholds[id],
      )
      const later = [
        multiplierEffect('prestige.infinity', infinity, 88),
        multiplierEffect('secrets.facility', secretMultipliers[id], 90),
        multiplierEffect('prestige.avocato_modifier', avocadoMultiplier, 95),
      ].filter(isEffect)
      return [id, calculateStat(1, [...effects, ...later])]
    }),
  ) as Record<CanonicalFacilityId, number>
}

const MATERIALIZED_SKILL_STATS = [
  'Global.MoneyMultiplier',
  'Global.ScienceMultiplier',
  'Global.PanelLifetime',
  'Global.PanelsPerSecond',
  'Global.PlanetsPerSecond',
  'Global.MoneyPerSecond',
  'Global.SciencePerSecond',
  'Global.ScienceBoostPerSecond',
  'Global.MoneyMultiUpgradePerSecond',
  'Global.Tinker.AssemblyYield',
  ...Object.values(FACILITY_MODIFIER_STATS),
  'Facility.AssemblyLine.Production',
  'Facility.Manager.Production',
  'Facility.Server.Production',
  'Facility.DataCenter.Production',
  'Facility.Planet.Production',
] as const

function materializeCanonicalSkillEffects(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
  ownedSkillIds: readonly string[],
):
  | {
      readonly ok: true
      readonly byStat: Readonly<
        Record<string, readonly StatEffect[]>
      >
    }
  | { readonly ok: false; readonly issue: DysonDerivationIssue } {
  const owned = new Set(ownedSkillIds)
  let dynamicIssue: DynamicSkillEffectIssue | undefined
  try {
    const entries = MATERIALIZED_SKILL_STATS.map((statId) => {
      const facilityId = facilityForStat(statId)
      const effects = materializeSkillEffects({
        ownedSkillIds: owned,
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
                : { owned: state.dyson.facilities[facilityId] },
          }),
        resolveDynamicValue: (effectId) => {
          const result = resolveDynamicSkillEffect(
            effectId,
            state,
            tuning,
            snapshot,
          )
          if (!result.handled) return undefined
          if (!result.ok) {
            dynamicIssue = result.issue
            throw new Error(result.issue.detail)
          }
          return result.value
        },
      })
      return [statId, effects] as const
    })
    return {
      ok: true,
      byStat: Object.freeze(Object.fromEntries(entries)),
    }
  } catch (error) {
    if (dynamicIssue !== undefined) {
      return { ok: false, issue: dynamicIssue }
    }
    return {
      ok: false,
      issue: {
        code: 'DYSON_SKILL_EFFECT_MATERIALIZATION_INVALID',
        path: 'skills',
        detail:
          error instanceof Error
            ? error.message
            : 'Skill-effect materialization failed.',
      },
    }
  }
}

function effectsAt(
  byStat: Readonly<Record<string, readonly StatEffect[]>>,
  statId: string,
): readonly StatEffect[] {
  return byStat[statId] ?? []
}

function facilityForStat(
  statId: string,
): CanonicalFacilityId | undefined {
  switch (statId) {
    case 'Facility.AssemblyLine.Modifier':
    case 'Facility.AssemblyLine.Production':
      return 'assembly_lines'
    case 'Facility.Manager.Modifier':
    case 'Facility.Manager.Production':
      return 'ai_managers'
    case 'Facility.Server.Modifier':
    case 'Facility.Server.Production':
      return 'servers'
    case 'Facility.DataCenter.Modifier':
    case 'Facility.DataCenter.Production':
      return 'data_centers'
    case 'Facility.Planet.Modifier':
    case 'Facility.Planet.Production':
      return 'planets'
    case 'Facility.Matrioshka.Modifier':
      return 'matrioshka_brains'
    case 'Facility.Birch.Modifier':
      return 'birch_planets'
    case 'Facility.Galactic.Modifier':
      return 'galactic_brains'
    default:
      return undefined
  }
}
