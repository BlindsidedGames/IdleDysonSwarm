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
  MEGA_STRUCTURE_FACILITY_IDS,
  type MegaStructureRateIssueCode,
  type MegaStructureRates,
  type MegaStructureProductionFact,
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
  prepareDynamicSkillEffectResolver,
  type DynamicSkillEffectIssue,
} from './dynamicSkillEffectResolver'
import { evaluateSkillEffectCondition } from './skillEffectConditions'
import {
  materializeSkillEffectsForContexts,
  type SkillEffectMaterializationContext,
} from './skillEffectMaterializer'
import { publishDysonSkillEffectEvaluationSnapshot } from './dysonSnapshotPublication'
import { resolveStellarSacrificesRequiredBots } from './planetGenerationDynamicEffects'
import { multiplyContinuous } from './numeric'
import { getCompiledSkillEffectCatalog } from './compiledSkillEffectCatalog'

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
    readonly stellarSacrifice: {
      readonly planetsPerSecond: number
      readonly botsPerSecond: number
    }
  }
  readonly facilityModifiers: Readonly<
    Record<CanonicalFacilityId, number>
  >
  /** Historical dvid.planetModifier used by Terra Nova pricing. */
  readonly planetPricingModifier: number
  readonly rates: Readonly<BasicDysonRates>
  readonly megaRates: Readonly<MegaStructureRates>
  readonly megaStructureFacts: Readonly<
    Record<keyof MegaStructureRates, CanonicalMegaStructureProductionFact>
  >
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
    /** Individual effects that compose the formerly collapsed modifier row. */
    readonly modifierContributions?: readonly CanonicalFacilityContributionRow[]
    /** Independent skill-driven sources that directly create Planets. */
    readonly generationContributions?: readonly CanonicalFacilityContributionRow[]
    /** Purchase-count bonuses, including the Terra chain, shown separately. */
    readonly manualPurchaseLayer?: Readonly<ManualPurchaseProductionLayer>
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

export interface CanonicalMegaStructureProductionFact
  extends MegaStructureProductionFact {
  readonly productionProgress: {
    readonly visible: boolean
    readonly normalized: number
  }
  readonly details: {
    readonly modifierContributions: readonly CanonicalFacilityContributionRow[]
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
  readonly order?: number
  readonly source?: {
    readonly kind:
      | 'skill'
      | 'research'
      | 'infinity'
      | 'secret'
      | 'avocato'
      | 'facility'
      | 'system'
    readonly id: string
    readonly level?: number
    readonly perLevelValue?: number
  }
  readonly calculation?: CanonicalFacilitySourceCalculation
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

export type CanonicalFacilitySourceCalculation =
  | {
      readonly kind: 'scientific-planets'
      readonly researchers: number
      readonly fragments: number
      readonly hubbleTelescope: boolean
      readonly jamesWebbTelescope: boolean
      readonly terraformingProtocols: boolean
    }
  | {
      readonly kind: 'planet-assembly'
      readonly assemblyLines: number
    }
  | {
      readonly kind: 'shell-worlds'
      readonly planets: number
      readonly planetAssembly: boolean
    }
  | {
      readonly kind: 'stellar-sacrifices'
      readonly panelsPerSecond: number
      readonly panelLifetimeSeconds: number
      readonly stellarObliteration: boolean
      readonly supernova: boolean
    }
  | {
      readonly kind: 'shoulders-of-the-fallen'
      readonly scienceBoostLevel: number
      readonly scientificPlanets: boolean
    }
  | {
      readonly kind: 'pocket-dimensions'
      readonly workers: number
      readonly researchers: number
      readonly panelLifetimeSeconds: number
      readonly pocketAndroidsTimerSeconds: number
      readonly rudimentarySingularityProduction: number
      readonly pocketProtectors: boolean
      readonly pocketMultiverse: boolean
      readonly dimensionalCatCables: boolean
      readonly solarBubbles: boolean
      readonly pocketAndroids: boolean
      readonly quantumComputing: boolean
    }
  | {
      readonly kind: 'rudimentary-singularity'
      readonly managerAssemblyLineProduction: number
      readonly servers: number
      readonly unsuspiciousAlgorithms: boolean
      readonly clusterNetworking: boolean
    }
  | {
      readonly kind: 'dynamic-facility-effect'
      readonly effectId: string
      readonly panelLifetimeSeconds: number
      readonly fragments: number
      readonly assignedSkillPoints: number
      readonly servers: number
      readonly manualDataCenters: number
      readonly effectivePlanets: number
      readonly starsSurrounded: number
      readonly galaxiesEngulfed: number
      readonly timerSeconds: number
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

const BASIC_FACILITY_PRODUCTION_STATS: Readonly<
  Record<BasicDysonFacilityId, string>
> = Object.freeze({
  assembly_lines: 'Facility.AssemblyLine.Production',
  ai_managers: 'Facility.Manager.Production',
  servers: 'Facility.Server.Production',
  data_centers: 'Facility.DataCenter.Production',
  planets: 'Facility.Planet.Production',
})

export interface ManualPurchaseProductionLayer {
  readonly rawManualCount: number
  readonly effectiveManualCount: number
  readonly effectiveManualPlanets: number
  readonly transferredPlanetCount: number
  readonly transferSkillId?: string
  readonly terraIrradiantOwned: boolean
  readonly suppressed: boolean
  readonly avocadosMultiplier: number
  readonly milestone50Multiplier: number
  readonly milestone100Multiplier: number
  readonly scalingThreshold: number
  readonly scalingRate: number
  readonly scalingMultiplier: number
  readonly totalMultiplier: number
}

export function deriveManualPurchaseProductionLayer(
  state: Readonly<CanonicalGameStateV1>,
  facilityId: BasicDysonFacilityId,
): Readonly<ManualPurchaseProductionLayer> {
  const owned = (id: string) => state.skills.byId[id]?.owned === true
  const rawManualCount = state.dyson.facilities[facilityId][1]
  const effectiveManualPlanets = state.dyson.facilities.planets[1] *
    (owned('terraIrradiant') ? 12 : 1)
  const terraSkillByFacility: Readonly<
    Partial<Record<BasicDysonFacilityId, string>>
  > = {
    assembly_lines: 'terraNullius',
    ai_managers: 'terraInfirma',
    servers: 'terraEculeo',
    data_centers: 'terraFirma',
  }
  const terraSkill = terraSkillByFacility[facilityId]
  const effectiveManualCount = facilityId === 'planets'
    ? effectiveManualPlanets
    : rawManualCount +
      (terraSkill !== undefined && owned(terraSkill)
        ? effectiveManualPlanets
        : 0)
  const transferredPlanetCount =
    facilityId !== 'planets' &&
    terraSkill !== undefined &&
    owned(terraSkill)
      ? effectiveManualPlanets
      : 0
  const scalingThreshold = owned('productionScaling')
    ? Math.max(
        0,
        90 - 5 * Math.max(0, Number(state.skills.fragments) - 1),
      )
    : 100
  const scalingRate = owned('ultimateSwarm')
    ? 0.05
    : owned('megaSwarm')
      ? 0.03
      : owned('superSwarm')
        ? 0.02
        : 0.01
  const suppressed = owned('supernova')
  const avocadosMultiplier =
    !suppressed && owned('avocados') && rawManualCount >= 69 ? 2 : 1
  const milestone50Multiplier =
    !suppressed && effectiveManualCount >= 50 ? 2 : 1
  const milestone100Multiplier =
    !suppressed && effectiveManualCount >= 100 ? 2 : 1
  const scalingMultiplier = suppressed
    ? 1
    : 1 + Math.max(0, effectiveManualCount - scalingThreshold) * scalingRate
  return Object.freeze({
    rawManualCount,
    effectiveManualCount,
    effectiveManualPlanets,
    transferredPlanetCount,
    ...(transferredPlanetCount > 0 && terraSkill !== undefined
      ? { transferSkillId: terraSkill }
      : {}),
    terraIrradiantOwned: owned('terraIrradiant'),
    suppressed,
    avocadosMultiplier,
    milestone50Multiplier,
    milestone100Multiplier,
    scalingThreshold,
    scalingRate,
    scalingMultiplier,
    totalMultiplier:
      avocadosMultiplier *
      milestone50Multiplier *
      milestone100Multiplier *
      scalingMultiplier,
  })
}

function withManualPurchaseProductionLayer(
  state: CanonicalGameStateV1,
  source: Readonly<Record<string, readonly StatEffect[]>>,
): Readonly<Record<string, readonly StatEffect[]>> {
  const byStat = Object.fromEntries(
    Object.entries(source).map(([stat, effects]) => [
      stat,
      effects.filter((effect) => !effect.id.startsWith('effect.avocados.')),
    ]),
  ) as Record<string, readonly StatEffect[]>

  for (const facilityId of BASIC_DYSON_FACILITY_IDS) {
    const layer = deriveManualPurchaseProductionLayer(state, facilityId)
    const effects: StatEffect[] = [
      ...(byStat[BASIC_FACILITY_PRODUCTION_STATS[facilityId]] ?? []),
    ]
    if (layer.suppressed) {
      effects.push({
        id: 'manual-purchase.supernova-suppression',
        operation: 'multiply',
        value: 1,
        order: 150,
      })
    } else {
      if (layer.avocadosMultiplier > 1) {
        effects.push({
          id: 'manual-purchase.avocados-69',
          operation: 'multiply',
          value: 2,
          order: 150,
        })
      }
      if (layer.milestone50Multiplier > 1) {
        effects.push({
          id: 'manual-purchase.milestone-50',
          operation: 'multiply',
          value: 2,
          order: 151,
        })
      }
      if (layer.milestone100Multiplier > 1) {
        effects.push({
          id: 'manual-purchase.milestone-100',
          operation: 'multiply',
          value: 2,
          order: 152,
        })
      }
      if (layer.scalingMultiplier > 1) {
        effects.push({
          id: `manual-purchase.scaling-${Math.round(layer.scalingRate * 100)}pct`,
          operation: 'multiply',
          value: layer.scalingMultiplier,
          order: 153,
        })
      }
    }
    byStat[BASIC_FACILITY_PRODUCTION_STATS[facilityId]] =
      Object.freeze(effects)
  }
  return Object.freeze(byStat)
}

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
  const effectiveSkillEffectsByStat =
    withManualPurchaseProductionLayer(
      state,
      skillEffects.byStat,
    )
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
    ...effectsAt(effectiveSkillEffectsByStat, 'Global.MoneyMultiplier'),
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
    ...effectsAt(effectiveSkillEffectsByStat, 'Global.ScienceMultiplier'),
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
    ...effectsAt(effectiveSkillEffectsByStat, 'Global.PanelLifetime'),
  ])
  const planetGenerationEffects = effectsAt(
    effectiveSkillEffectsByStat,
    'Global.PlanetsPerSecond',
  )
  const stellarSacrificeEffects = planetGenerationEffects.filter(
    (effect) =>
      effect.id === 'effect.stellarSacrifices.planets_per_second',
  )
  const planetGenerationPerSecond = calculateStat(
    0,
    planetGenerationEffects.filter(
      (effect) =>
        effect.id !== 'effect.stellarSacrifices.planets_per_second',
    ),
  )
  const stellarSacrificePlanetsPerSecond = calculateStat(
    0,
    stellarSacrificeEffects,
  )
  const ownedSkillSet = new Set(ownedSkills)
  const stellarSacrificeBotsPerSecond =
    stellarSacrificePlanetsPerSecond > 0
      ? resolveStellarSacrificesRequiredBots(
          ownedSkillSet,
          evaluationSnapshot.panelsPerSecond,
          evaluationSnapshot.panelLifetimeSeconds,
        )
      : 0
  const scientificPlanetsProduction = calculateStat(
    0,
    effectsAt(effectiveSkillEffectsByStat, 'Global.PlanetsPerSecond').filter(
      (effect) =>
        effect.id ===
        'effect.scientificPlanets.planets_per_second',
    ),
  )
  const scienceBoostPerSecond = calculateStat(
    0,
    effectsAt(effectiveSkillEffectsByStat, 'Global.ScienceBoostPerSecond'),
  )
  const moneyUpgradePerSecond = calculateStat(
    0,
    effectsAt(
      effectiveSkillEffectsByStat,
      'Global.MoneyMultiUpgradePerSecond',
    ),
  )
  const tinkerAssemblyYield = calculateStat(
    0,
    effectsAt(effectiveSkillEffectsByStat, 'Global.Tinker.AssemblyYield'),
  )
  const facilityModifierCalculations = deriveFacilityModifiers(
    state,
    research.effects,
    effectiveSkillEffectsByStat,
    secrets.multipliers,
    avocadoMultiplier,
  )
  const facilityModifiers = Object.fromEntries(
    CANONICAL_DYSON_FACILITY_IDS.map((id) => [
      id,
      facilityModifierCalculations[id].value,
    ]),
  ) as Record<CanonicalFacilityId, number>
  const planetManualLayer = deriveManualPurchaseProductionLayer(
    state,
    'planets',
  )
  const planetPricingModifier = multiplyContinuous(
    facilityModifiers.planets,
    multiplyContinuous(
      planetManualLayer.milestone50Multiplier,
      multiplyContinuous(
        planetManualLayer.milestone100Multiplier,
        planetManualLayer.scalingMultiplier,
      ),
    ),
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
  const megaStructureFacts = Object.freeze(
    Object.fromEntries(
      MEGA_STRUCTURE_FACILITY_IDS.map((facilityId) => [
        facilityId,
        Object.freeze({
          ...mega.facts[facilityId],
          productionProgress: Object.freeze((() => {
            const fact = mega.facts[facilityId]
            const runningOutput =
              state.dyson.facilities[fact.outputFacilityId][0]
            const visible = fact.perSecond > 0
            const fractionalProgress =
              runningOutput - Math.floor(runningOutput)
            return {
              visible,
              normalized: visible
                ? fact.perSecond >=
                  presentationTuning.solidProgressThresholdPerSecond
                  ? 1
                  : Math.max(0, Math.min(1, fractionalProgress))
                : 0,
            }
          })()),
          details: Object.freeze({
            modifierContributions: deriveAttributedEffectRows(
              1,
              facilityModifierCalculations[facilityId].effects,
              'modifier',
              research.effects,
              state,
              evaluationSnapshot,
            ),
          }),
        }),
      ]),
    ) as Record<
      keyof MegaStructureRates,
      CanonicalMegaStructureProductionFact
    >,
  )
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
    skillEffectsByStat: effectiveSkillEffectsByStat,
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
        stellarSacrifice: Object.freeze({
          planetsPerSecond: stellarSacrificePlanetsPerSecond,
          botsPerSecond: stellarSacrificeBotsPerSecond,
        }),
      }),
      facilityModifiers: Object.freeze(facilityModifiers),
      planetPricingModifier,
      rates: Object.freeze({ ...model.rates }),
      megaRates: mega.rates,
      megaStructureFacts,
      productionArrivalRates: combineDysonProductionArrivalRates(
        model.rates,
        mega.rates,
      ),
      facilityFacts: deriveBasicFacilityFacts(
        state,
        model,
        mega.rates,
        facilityModifiers,
        facilityModifierCalculations,
        research.effects,
        planetGenerationEffects,
        evaluationSnapshot,
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
  modifierCalculations: Readonly<
    Record<CanonicalFacilityId, FacilityModifierCalculation>
  >,
  researchEffects: readonly MaterializedDysonResearchEffect[],
  planetGenerationEffects: readonly StatEffect[],
  evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
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
                researchEffects,
                state,
                evaluationSnapshot,
              ),
              modifierContributions: deriveAttributedEffectRows(
                1,
                modifierCalculations[facilityId].effects,
                'modifier',
                researchEffects,
                state,
                evaluationSnapshot,
              ),
              generationContributions:
                facilityId === 'planets'
                  ? deriveAttributedEffectRows(
                      0,
                      planetGenerationEffects,
                      'output-adjustments',
                      researchEffects,
                      state,
                      evaluationSnapshot,
                    )
                  : deriveDirectFacilityGenerationContributions(
                      model,
                      facilityId,
                      researchEffects,
                      state,
                      evaluationSnapshot,
                    ),
              manualPurchaseLayer:
                deriveManualPurchaseProductionLayer(state, facilityId),
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
  researchEffects: readonly MaterializedDysonResearchEffect[],
  state: CanonicalGameStateV1,
  evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
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
        order: effect.order,
        source: sourceForEffect(effect.id, researchEffects),
        calculation: sourceCalculationForEffect(
          effect.id,
          state,
          evaluationSnapshot,
        ),
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

const DIRECT_FACILITY_GENERATION_EFFECTS = new Set([
  'effect.pocket_dimensions.planets',
  'effect.rudimentary_singularity.data_centers',
])

const DIRECT_GENERATION_PRODUCER: Readonly<
  Partial<Record<BasicDysonFacilityId, BasicDysonFacilityId>>
> = Object.freeze({
  data_centers: 'planets',
  servers: 'data_centers',
})

function deriveDirectFacilityGenerationContributions(
  model: Readonly<BasicDysonState>,
  outputFacilityId: BasicDysonFacilityId,
  researchEffects: readonly MaterializedDysonResearchEffect[],
  state: CanonicalGameStateV1,
  evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): readonly CanonicalFacilityContributionRow[] {
  const producerId = DIRECT_GENERATION_PRODUCER[outputFacilityId]
  if (producerId === undefined) return Object.freeze([])
  const calculation = calculateBasicDysonFacilityRate(model, producerId)
  return Object.freeze(
    deriveFacilityContributionRows(
      calculation,
      state.dyson.facilities[producerId],
      researchEffects,
      state,
      evaluationSnapshot,
    ).filter((row) =>
      DIRECT_FACILITY_GENERATION_EFFECTS.has(row.sourceId),
    ),
  )
}

function sourceCalculationForEffect(
  effectId: string,
  state: CanonicalGameStateV1,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): CanonicalFacilitySourceCalculation | undefined {
  const owned = (skillId: string) =>
    state.skills.byId[skillId]?.owned === true
  switch (effectId) {
    case 'effect.scientificPlanets.planets_per_second':
      return Object.freeze({
        kind: 'scientific-planets',
        researchers: state.dyson.researchers,
        fragments: Number(state.skills.fragments),
        hubbleTelescope: owned('hubbleTelescope'),
        jamesWebbTelescope: owned('jamesWebbTelescope'),
        terraformingProtocols: owned('terraformingProtocols'),
      })
    case 'effect.planetAssembly.planets_per_second':
      return Object.freeze({
        kind: 'planet-assembly',
        assemblyLines:
          state.dyson.facilities.assembly_lines[0] +
          state.dyson.facilities.assembly_lines[1],
      })
    case 'effect.shellWorlds.planets_per_second':
      return Object.freeze({
        kind: 'shell-worlds',
        planets:
          state.dyson.facilities.planets[0] +
          state.dyson.facilities.planets[1],
        planetAssembly: owned('planetAssembly'),
      })
    case 'effect.stellarSacrifices.planets_per_second':
      return Object.freeze({
        kind: 'stellar-sacrifices',
        panelsPerSecond: snapshot.panelsPerSecond,
        panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
        stellarObliteration: owned('stellarObliteration'),
        supernova: owned('supernova'),
      })
    case 'effect.shouldersOfTheFallen.planets_per_second':
      return Object.freeze({
        kind: 'shoulders-of-the-fallen',
        scienceBoostLevel:
          state.research.levelsById['research.science_boost'] ?? 0,
        scientificPlanets: owned('scientificPlanets'),
      })
    case 'effect.pocket_dimensions.planets':
      return Object.freeze({
        kind: 'pocket-dimensions',
        workers: state.dyson.workers,
        researchers: state.dyson.researchers,
        panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
        pocketAndroidsTimerSeconds:
          state.skills.byId.pocketAndroids?.timerSeconds ?? 0,
        rudimentarySingularityProduction:
          snapshot.rudimentarySingularityProduction,
        pocketProtectors: owned('pocketProtectors'),
        pocketMultiverse: owned('pocketMultiverse'),
        dimensionalCatCables: owned('dimensionalCatCables'),
        solarBubbles: owned('solarBubbles'),
        pocketAndroids: owned('pocketAndroids'),
        quantumComputing: owned('quantumComputing'),
      })
    case 'effect.rudimentary_singularity.data_centers':
      return Object.freeze({
        kind: 'rudimentary-singularity',
        managerAssemblyLineProduction:
          snapshot.managerAssemblyLineProduction,
        servers:
          state.dyson.facilities.servers[0] +
          state.dyson.facilities.servers[1],
        unsuspiciousAlgorithms: owned('unsuspiciousAlgorithms'),
        clusterNetworking: owned('clusterNetworking'),
      })
    default:
      return dynamicFacilityEffectCalculation(effectId, state, snapshot)
  }
}

const DYNAMIC_FACILITY_FORMULA_SKILLS = new Set([
  'fragmentAssembly',
  'progressiveAssembly',
  'versatileProductionTactics',
  'oneMinutePlan',
  'dysonSubsidies',
  'purityOfBody',
  'clusterNetworking',
  'parallelProcessing',
  'whatWillComeToPass',
  'hypercubeNetworks',
  'galacticPradigmShift',
  'purityOfSEssence',
  'superRadiantScattering',
])

function dynamicFacilityEffectCalculation(
  effectId: string,
  state: CanonicalGameStateV1,
  snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
): CanonicalFacilitySourceCalculation | undefined {
  const skillId = getCompiledSkillEffectCatalog().skillIdForEffect(effectId)
  if (
    effectId !== 'effect.staying_power.assembly_lines' &&
    effectId !== 'effect.parallel_computation.data_centers' &&
    (skillId === undefined || !DYNAMIC_FACILITY_FORMULA_SKILLS.has(skillId))
  ) return undefined

  const servers = state.dyson.facilities.servers
  const dataCenters = state.dyson.facilities.data_centers
  const planets = state.dyson.facilities.planets
  const panelArea = snapshot.panelsPerSecond * snapshot.panelLifetimeSeconds
  return Object.freeze({
    kind: 'dynamic-facility-effect',
    effectId,
    panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
    fragments: Number(state.skills.fragments),
    assignedSkillPoints: Number(state.skills.points),
    servers: servers[0] + servers[1],
    manualDataCenters: dataCenters[1],
    effectivePlanets:
      planets[0] + planets[1] * (state.skills.byId.terraIrradiant?.owned ? 12 : 1),
    starsSurrounded: Math.floor(panelArea / 20_000),
    galaxiesEngulfed: Math.floor(panelArea / 20_000 / 100_000_000_000),
    timerSeconds:
      state.skills.byId.superRadiantScattering?.timerSeconds ?? 0,
  })
}

function deriveAttributedEffectRows(
  initialValue: number,
  effects: readonly StatEffect[],
  displayRole: CanonicalFacilityContributionRow['displayRole'],
  researchEffects: readonly MaterializedDysonResearchEffect[],
  state?: CanonicalGameStateV1,
  evaluationSnapshot?: Readonly<DysonSkillEffectEvaluationSnapshot>,
): readonly CanonicalFacilityContributionRow[] {
  let runningTotal = initialValue
  return Object.freeze(
    effects.map((effect) => {
      const next = applyStatEffect(runningTotal, effect)
      const row = Object.freeze({
        sourceId: effect.id,
        displayRole,
        operation: effect.operation,
        value: effect.value,
        delta: next - runningTotal,
        runningTotal: next,
        order: effect.order,
        source: sourceForEffect(effect.id, researchEffects),
        ...(state === undefined || evaluationSnapshot === undefined
          ? {}
          : {
              calculation: sourceCalculationForEffect(
                effect.id,
                state,
                evaluationSnapshot,
              ),
            }),
        ...(effect.conditionIdentifier === undefined
          ? {}
          : { conditionIdentifier: effect.conditionIdentifier }),
      })
      runningTotal = next
      return row
    }),
  )
}

function sourceForEffect(
  effectId: string,
  researchEffects: readonly MaterializedDysonResearchEffect[],
): CanonicalFacilityContributionRow['source'] {
  const research = researchEffects.find((effect) => effect.id === effectId)
  if (research) return {
    kind: 'research',
    id: research.researchId,
    level: research.level,
    perLevelValue: research.perLevelValue,
  }
  const skillId = getCompiledSkillEffectCatalog().skillIdForEffect(effectId)
  if (skillId) return { kind: 'skill', id: skillId }
  if (effectId.startsWith('manual-purchase.')) {
    const manualSkill: Readonly<Record<string, string>> = {
      'manual-purchase.avocados-69': 'avocados',
      'manual-purchase.supernova-suppression': 'supernova',
      'manual-purchase.milestone-50': 'milestone-50',
      'manual-purchase.milestone-100': 'milestone-100',
    }
    const id = manualSkill[effectId] ??
      (effectId.startsWith('manual-purchase.scaling-')
        ? 'productionScaling'
        : effectId)
    return { kind: id.startsWith('milestone-') ? 'system' : 'skill', id }
  }
  if (effectId.startsWith('prestige.infinity')) {
    return { kind: 'infinity', id: effectId }
  }
  if (effectId.startsWith('prestige.avocato')) {
    return { kind: 'avocato', id: effectId }
  }
  if (effectId.startsWith('secrets.')) {
    return { kind: 'secret', id: effectId }
  }
  if (effectId.endsWith('.count') || effectId.endsWith('.modifier')) {
    return { kind: 'facility', id: effectId.split('.')[0] }
  }
  return { kind: 'system', id: effectId }
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

interface FacilityModifierCalculation {
  readonly value: number
  readonly effects: readonly StatEffect[]
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
): Record<CanonicalFacilityId, FacilityModifierCalculation> {
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
      const orderedEffects = Object.freeze(
        [...effects, ...later]
          .sort((left, right) => left.order - right.order)
          .map((effect) => Object.freeze({ ...effect })),
      )
      return [
        id,
        Object.freeze({
          value: calculateStat(1, orderedEffects),
          effects: orderedEffects,
        }),
      ]
    }),
  ) as Record<CanonicalFacilityId, FacilityModifierCalculation>
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
    const dynamicEffects = prepareDynamicSkillEffectResolver(
      state,
      tuning,
      snapshot,
    )
    const contexts = MATERIALIZED_SKILL_STATS.map(
      (statId): SkillEffectMaterializationContext => {
        const facilityId = facilityForStat(statId)
        return {
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
            const result = dynamicEffects.resolve(effectId)
            if (!result.handled) return undefined
            if (!result.ok) {
              dynamicIssue = result.issue
              throw new Error(result.issue.detail)
            }
            return result.value
          },
        }
      },
    )
    const effectGroups = materializeSkillEffectsForContexts(contexts)
    const entries = MATERIALIZED_SKILL_STATS.map(
      (statId, index) => [statId, effectGroups[index] ?? []] as const,
    )
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
