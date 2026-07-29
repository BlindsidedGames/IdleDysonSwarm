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
  calculateBasicDysonFacilityRate,
  createBasicDysonState,
  type BasicDysonFacilityRateCalculation,
  type BasicDysonRates,
  type BasicDysonState,
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
import {
  applyStatEffect,
  calculateStat,
  type StatEffect,
  type StatOperation,
} from './stat'
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

export interface DysonPresentationTuning {
  /**
   * Matches ProgressBarFlickerManager: production bars at or above this many
   * completions per second render solid instead of exposing a rapidly
   * flickering fractional cycle.
   */
  readonly solidProgressThresholdPerSecond: number
}

export const CANONICAL_DYSON_PRESENTATION_TUNING: Readonly<DysonPresentationTuning> =
  Object.freeze({
    solidProgressThresholdPerSecond: 4,
  })

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
  readonly facilityFacts: Readonly<
    Record<BasicDysonFacilityId, CanonicalBasicFacilityFacts>
  >
  readonly nextEvaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
  readonly entitlements: DysonEntitlements
}

export interface CanonicalBasicFacilityFacts {
  readonly facilityId: BasicDysonFacilityId
  readonly ownership: {
    readonly automatic: number
    readonly manual: number
    readonly total: number
  }
  readonly production: {
    readonly outputFacilityId: BasicDysonFacilityId | 'bots'
    readonly perSecond: number
    readonly secondsPerUnit: number | null
  }
  readonly productionProgress: {
    readonly visible: boolean
    readonly normalized: number
  }
  readonly details: {
    readonly baseProductionPerSecond: number
    readonly effectiveProducerCount: number
    readonly modifier: number
    readonly contributions?: readonly CanonicalFacilityContributionRow[]
    /**
     * Always populated by canonical derivation; empty when Unity would hide
     * the only gated upstream source.
     */
    readonly upstreamSources?: readonly {
      readonly sourceFacilityId: CanonicalFacilityId
      readonly contributionPerSecond: number
    }[]
  }
}

export interface CanonicalFacilityContributionRow {
  readonly sourceId: string
  readonly displayRole:
    | 'base'
    | 'producer-count'
    | 'modifier'
    | 'output-adjustments'
  readonly operation: StatOperation
  readonly value: number
  readonly delta: number
  readonly runningTotal: number
  readonly conditionIdentifier?: string
  /**
   * Legacy presentation-fixture field. Canonical derivation does not populate
   * this because no localized condition display text exists at this boundary.
   */
  readonly condition?: string
  readonly automaticManualTuple?: readonly [
    automatic: number,
    manual: number,
  ]
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
  presentationTuning: Readonly<DysonPresentationTuning> =
    CANONICAL_DYSON_PRESENTATION_TUNING,
): DysonDerivationResult {
  if (
    !Number.isFinite(
      presentationTuning.solidProgressThresholdPerSecond,
    ) ||
    presentationTuning.solidProgressThresholdPerSecond < 0
  ) {
    throw new Error(
      'Dyson solid-progress threshold must be finite and non-negative.',
    )
  }
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
      facilityFacts: deriveBasicFacilityFacts(
        state,
        model,
        mega.rates,
        facilityModifiers,
        presentationTuning,
      ),
      nextEvaluationSnapshot,
      entitlements: Object.freeze({ ...entitlements }),
    }),
  }
}

const BASIC_FACILITY_OUTPUTS: Readonly<
  Record<BasicDysonFacilityId, BasicDysonFacilityId | 'bots'>
> = {
  assembly_lines: 'bots',
  ai_managers: 'assembly_lines',
  servers: 'ai_managers',
  data_centers: 'servers',
  planets: 'data_centers',
}

const BASIC_FACILITY_OUTPUT_RATES: Readonly<
  Record<BasicDysonFacilityId, keyof BasicDysonRates>
> = {
  assembly_lines: 'bots',
  ai_managers: 'assembly_lines',
  servers: 'ai_managers',
  data_centers: 'servers',
  planets: 'data_centers',
}

function deriveBasicFacilityFacts(
  state: CanonicalGameStateV1,
  model: Readonly<BasicDysonState>,
  megaRates: Readonly<MegaStructureRates>,
  modifiers: Readonly<Record<CanonicalFacilityId, number>>,
  presentationTuning: Readonly<DysonPresentationTuning>,
): Readonly<Record<BasicDysonFacilityId, CanonicalBasicFacilityFacts>> {
  const rates = model.rates
  return Object.freeze(
    Object.fromEntries(
      BASIC_DYSON_FACILITY_IDS.map((facilityId) => {
        const pair = state.dyson.facilities[facilityId]
        const total = pair[0] + pair[1]
        const perSecond =
          rates[BASIC_FACILITY_OUTPUT_RATES[facilityId]]
        const runningOutput =
          facilityId === 'assembly_lines'
            ? state.dyson.bots
            : state.dyson.facilities[
                BASIC_FACILITY_OUTPUTS[
                  facilityId
                ] as BasicDysonFacilityId
              ][0]
        const rateCalculation = calculateBasicDysonFacilityRate(
          model,
          facilityId,
        )
        const visible = perSecond > 0
        const fractionalProgress =
          runningOutput - Math.floor(runningOutput)
        return [
          facilityId,
          Object.freeze({
            facilityId,
            ownership: Object.freeze({
              automatic: pair[0],
              manual: pair[1],
              total,
            }),
            production: Object.freeze({
              outputFacilityId: BASIC_FACILITY_OUTPUTS[facilityId],
              perSecond,
              secondsPerUnit:
                perSecond > 0 ? 1 / perSecond : null,
            }),
            productionProgress: Object.freeze({
              visible,
              normalized: visible
                ? perSecond >=
                  presentationTuning.solidProgressThresholdPerSecond
                  ? 1
                  : Math.max(0, Math.min(1, fractionalProgress))
                : 0,
            }),
            details: Object.freeze({
              baseProductionPerSecond:
                rateCalculation.baseProduction,
              effectiveProducerCount: total,
              modifier: modifiers[facilityId],
              contributions: deriveFacilityContributionRows(
                rateCalculation,
                pair,
              ),
              upstreamSources: deriveBasicFacilityUpstreamSources(
                state,
                facilityId,
                rates,
                megaRates,
              ),
            }),
          }),
        ]
      }),
    ) as Record<BasicDysonFacilityId, CanonicalBasicFacilityFacts>,
  )
}

function deriveFacilityContributionRows(
  calculation: Readonly<BasicDysonFacilityRateCalculation>,
  pair: readonly [automatic: number, manual: number],
): readonly CanonicalFacilityContributionRow[] {
  const rows: CanonicalFacilityContributionRow[] = [
    Object.freeze({
      sourceId: 'base',
      displayRole: 'base',
      operation: 'override',
      value: calculation.baseProduction,
      delta: calculation.baseProduction,
      runningTotal: calculation.baseProduction,
    }),
  ]
  let runningTotal = calculation.baseProduction
  for (const effect of calculation.effects) {
    const next = applyStatEffect(runningTotal, effect)
    const isCount = effect.id.endsWith('.count')
    const isModifier = effect.id.endsWith('.modifier')
    rows.push(
      Object.freeze({
        sourceId: effect.id,
        displayRole: isCount
            ? 'producer-count'
          : isModifier
            ? 'modifier'
            : 'output-adjustments',
        operation: effect.operation,
        value: effect.value,
        delta: next - runningTotal,
        runningTotal: next,
        ...(effect.conditionIdentifier === undefined
          ? {}
          : {
              conditionIdentifier: effect.conditionIdentifier,
            }),
        ...(isCount
          ? {
              automaticManualTuple: Object.freeze([
                pair[0],
                pair[1],
              ]) as readonly [number, number],
            }
          : {}),
      }),
    )
    runningTotal = next
  }
  if (calculation.rate !== runningTotal) {
    // The shared facility pipeline clamps its final value into the canonical
    // continuous range after StatCalculator. This row appears only when that
    // numeric-safety boundary changes the actual result.
    rows.push(
      Object.freeze({
        sourceId: 'canonical.numeric-clamp',
        displayRole: 'output-adjustments',
        operation: 'override',
        value: calculation.rate,
        delta: calculation.rate - runningTotal,
        runningTotal: calculation.rate,
      }),
    )
  }
  return Object.freeze(rows)
}

function deriveBasicFacilityUpstreamSources(
  state: CanonicalGameStateV1,
  facilityId: BasicDysonFacilityId,
  rates: Readonly<BasicDysonRates>,
  megaRates: Readonly<MegaStructureRates>,
): CanonicalBasicFacilityFacts['details']['upstreamSources'] {
  switch (facilityId) {
    case 'assembly_lines':
      return Object.freeze([
        Object.freeze({
          sourceFacilityId: 'ai_managers' as const,
          contributionPerSecond: rates.assembly_lines,
        }),
      ])
    case 'ai_managers':
      return Object.freeze([
        Object.freeze({
          sourceFacilityId: 'servers' as const,
          contributionPerSecond: rates.ai_managers,
        }),
      ])
    case 'servers':
      return Object.freeze([
        Object.freeze({
          sourceFacilityId: 'data_centers' as const,
          contributionPerSecond: rates.servers,
        }),
      ])
    case 'data_centers':
      return Object.freeze([
        Object.freeze({
          sourceFacilityId: 'planets' as const,
          contributionPerSecond: rates.data_centers,
        }),
      ])
    case 'planets':
      return state.quantum.unlocks.matrioshkaBrains
        ? Object.freeze([
            Object.freeze({
              sourceFacilityId: 'matrioshka_brains' as const,
              contributionPerSecond: megaRates.matrioshka_brains,
            }),
          ])
        : Object.freeze([])
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
