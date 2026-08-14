import type { DeepReadonly } from '../core/contracts'
import {
  FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
  FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS,
  FRONTEND_SIMULATION_INFORMATION_PANEL_IDS,
  FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS,
  SIMULATION_UPGRADE_SECTIONS,
  REALITY_UPGRADE_SECTIONS,
  selectFrontendReadinessConstants,
  type FrontendApplicationSnapshot,
  type FrontendCanonicalProgression,
  type FrontendGameplayVisibility,
  type FrontendGameplayPreviews,
  type FrontendGameplayPreviewDemand,
  type FrontendRealityDerivedFacts,
  type FrontendDysonDerivedFactsV2,
  type FrontendStoryDerivedFacts,
  type FrontendSimulationsDerivedFacts,
  type FrontendDreamDerivedFacts,
} from '../application/frontendSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
import type { RealityUpgradeId } from '../simulation/realityUpgrades'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalGameStateV2,
  type CanonicalResearchId,
} from '../game-state/typesV2'
import {
  CANONICAL_DYSON_PRESENTATION_TUNING,
} from '../simulation/canonicalDysonDerivation'
import type { CanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import { selectCanonicalTinkerUiFactsV2 } from '../simulation/canonicalTinkerV2'
import {
  DISCRETE_MAXIMUM,
} from '../simulation/numeric'
import {
  addGameDecimals,
  compareGameDecimals,
  divideGameDecimals,
  floorGameDecimal,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  gameDecimalToNumberChecked,
  logGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import type {
  CanonicalRuntimePublicationV2,
} from '../application/canonicalRuntimeSessionV2'
import { quoteV2DysonFacilityPurchase } from '../simulation/dysonV2Commands'
import { previewCanonicalSkillCatalogV2 } from '../simulation/skillTransactionsV2'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import { deriveDysonV2FacilityContributionRows } from '../simulation/dysonV2Production'
import { BASIC_DYSON_FACILITY_IDS } from '../simulation/dysonFacilities'
import { MEGA_STRUCTURE_IDS } from '../simulation/megaStructurePurchases'
import {
  RESEARCH_V2_IDS,
  quoteV2ResearchPurchase,
  selectResearchV2PresentationFacts,
} from '../simulation/researchV2'
import { INFINITY_SHOP_ITEM_IDS_V2, quoteInfinityShopPurchaseV2 } from '../simulation/infinityShopV2'
import { projectInfinityProgressV2, type InfinityRewardAuthorityV2 } from '../simulation/infinityEconomyV2'
import { QUANTUM_V2_UPGRADE_IDS } from '../simulation/quantumCatalogV2'
import { QUANTUM_CONSTANTS } from '../simulation/quantumUpgrades'
import { previewQuantumSectionsV2, quoteQuantumUpgradeV2 } from '../simulation/quantumV2'
import { quoteDreamCommandV2, type DreamCommandV2 } from '../application/dreamStrangeMatterAuthorityV2'
import { DREAM_V2_CATALOG, DREAM_V2_UPGRADE_IDS } from '../simulation/dreamCatalogV2'
import {
  DREAM_V2_EDUCATION_IDS,
  deriveDreamV2PresentationFacts,
  previewDreamInfluencePurchaseModesV2,
  type DreamInfluencePurchaseIdV2,
} from '../simulation/dreamV2'
import { prepareDreamDoubleTimeTick } from '../simulation/timeResources'
import { projectBreakInfinityPresentationControl, BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM } from '../simulation/infinityCycle'
import { upgradeStoredTimeCapacity } from '../simulation/timeResources'
import { REALITY_UPGRADE_IDS_V2 } from '../simulation/realityCatalogV2'
import { gatherRealityInfluenceV2, realityWorkerGenerationRateV2 } from '../simulation/realityV2'
import { previewCanonicalDreamResetV2, quoteCanonicalDreamResetV2 } from '../simulation/canonicalDreamResetV2'
import { quoteCanonicalQuantumResetV2 } from '../simulation/canonicalQuantumResetV2'
import {
  quoteAvocadoCommandV2,
  derivePreparedAvocadoMultiplierV2,
  registerAvocadoStrangeMatterAccountV2ForOwner,
} from '../simulation/avocadoV2'

import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'

const legacyHydration = hydrateGameState(
  createDeterministicUnityFirstRunPreparedSave(),
)
const DREAM_FOUNDATIONAL_PURCHASE_IDS = Object.freeze([
  'hunters',
  'gatherers',
  'community-boost',
  'factories-boost',
] as const)
const DREAM_SPACE_AGE_PURCHASE_IDS = Object.freeze(['solar', 'fusion'] as const)
const EMPTY_DREAM_RESET_PREVIEW = Object.freeze({
  eligible: false,
  code: 'not-requested',
  cause: null,
  requestedReward: gameDecimalFromNumber(0),
  definitionGaps: Object.freeze([]),
})
const NATIVE_PREVIEW_METADATA: DeepReadonly<FrontendGameplayPreviews> = Object.freeze({
  dyson: Object.freeze({ basicFacilities: Object.freeze([]), megaStructures: Object.freeze([]) }),
  research: Object.freeze({ complete: false, issue: null, purchases: Object.freeze([]), cards: Object.freeze([]) }),
  skills: Object.freeze({ complete: false, definitionGap: null, skills: Object.freeze([]) }),
  dream: Object.freeze({
    foundational: Object.freeze([]),
    spaceAge: Object.freeze([]),
    upgrades: Object.freeze([]),
    education: Object.freeze([]),
    automaticReset: EMPTY_DREAM_RESET_PREVIEW,
    blackHoleReset: EMPTY_DREAM_RESET_PREVIEW,
  }),
  reality: Object.freeze({
    upgrades: Object.freeze([]),
    gatherInfluence: Object.freeze({ eligible: false, amount: gameDecimalFromNumber(0), code: 'not-requested' }),
  }),
  quantum: Object.freeze({
    upgrades: Object.freeze([]),
    sections: Object.freeze([]),
    leap: Object.freeze({
      eligible: false,
      code: 'not-requested',
      branch: null,
      artifactSkillPoints: null,
      requestedShards: gameDecimalFromNumber(0),
      infinityPointsConsumed: gameDecimalFromNumber(0),
      infinityPointsRemainder: gameDecimalFromNumber(0),
      definitionGap: null,
    }),
  }),
  infinity: Object.freeze({
    shop: Object.freeze([]),
    breakTarget: projectBreakInfinityPresentationControl(1n),
  }),
  avocado: Object.freeze({
    feeds: Object.freeze([]),
    meditation: Object.freeze({
      eligible: false,
      requiredStepIndex: null,
      code: 'not-requested',
      skillPointReward: 0n,
    }),
  }),
  time: Object.freeze({
    doubleTimeRate: Object.freeze({ minimum: 0, maximum: 10, current: 0 }),
    storedCapacity: Object.freeze({
      eligible: false,
      code: 'not-requested',
      currentCapacitySeconds: 0,
      nextCapacitySeconds: 0,
      consumesStoredSeconds: 0,
    }),
    storedSpend: Object.freeze({ maximumSeconds: 0, commitFirstRequired: true }),
  }),
})
const projectionCache = new WeakMap<
  object,
  Map<string, WeakMap<object, WeakMap<object, DeepReadonly<FrontendApplicationSnapshot>>>>
>()
const PANELS_PER_SURROUNDED_STAR_V2 = gameDecimalFromNumber(20_000)
const PANELS_PER_ENGULFED_GALAXY_V2 = gameDecimalFromNumber(2_000_000_000_000_000)
const dreamPresentationCache = new WeakMap<object, Map<number, ReturnType<typeof deriveDreamV2PresentationFacts>>>()

function cachedDreamPresentation(state:Readonly<CanonicalGameStateV2>,multiplier:number){
  let byMultiplier=dreamPresentationCache.get(state.dream as object)
  if(byMultiplier===undefined){byMultiplier=new Map();dreamPresentationCache.set(state.dream as object,byMultiplier)}
  const cached=byMultiplier.get(multiplier);if(cached!==undefined)return cached
  const selected=deriveDreamV2PresentationFacts(state,gameDecimalFromNumber(multiplier));byMultiplier.set(multiplier,selected);return selected
}

function selectV2DreamFacts(publication:Readonly<CanonicalRuntimePublicationV2>):Readonly<{dream:FrontendDreamDerivedFacts;simulations:FrontendSimulationsDerivedFacts}>{
  const state=publication.state,r=state.dream.resources,positive=(value:GameDecimal)=>compareGameDecimals(value,gameDecimalFromNumber(1))>=0
  const tick=prepareDreamDoubleTimeTick(state.timeline.doubleTime.unlocked,state.timeline.doubleTime.bankSeconds,state.timeline.doubleTime.rate,.1)
  const production=Object.freeze({ok:true as const,value:cachedDreamPresentation(state,tick.effectiveMultiplier)})
  const automatic=previewCanonicalDreamResetV2(state,Object.freeze({kind:'automatic'})),blackHole=previewCanonicalDreamResetV2(state,Object.freeze({kind:'black-hole'}))
  const reset=(quote:typeof automatic)=>Object.freeze({eligible:quote.eligible,code:quote.code,cause:quote.cause,requestedReward:quote.requestedReward,definitionGaps:Object.freeze([])})
  const information=positive(r.cities),space=positive(r.spaceFactories)
  const foundational=FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS.filter(id=>id==='hunters'||id==='gatherers'||id==='community'?(id!=='community'||positive(r.hunters)||positive(r.gatherers)):id==='housing'?positive(r.housing)||positive(r.villages)||positive(r.cities):positive(r[id]))
  const informationPanels=information?FRONTEND_SIMULATION_INFORMATION_PANEL_IDS.filter(id=>id==='engineering'||id==='shipping'&&state.dream.education.engineering.complete||id==='world-trade'&&state.dream.education.shipping.complete||id==='world-peace'&&state.dream.education.worldTrade.complete||id==='mathematics'&&(positive(r.rockets)||positive(r.spaceFactories))||id==='advanced-physics'&&state.dream.education.mathematics.complete&&positive(r.spaceFactories)||id==='factories'&&state.dream.education.engineering.complete||id==='bots'&&positive(r.bots)||id==='rockets'&&(positive(r.rockets)||positive(r.spaceFactories))):[]
  const spacePanels=space?FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS.filter(id=>id==='solar'||id==='space-factories'||id==='fusion'&&state.dream.education.advancedPhysics.complete||id==='railguns'&&(state.dream.education.mathematics.complete||positive(r.dysonPanels))||id==='swarm-stats'&&positive(r.swarmPanels)):[]
  const visibleDream=(ids:readonly (keyof typeof DREAM_V2_CATALOG)[])=>ids.filter(id=>!state.dream.upgrades[id]&&DREAM_V2_CATALOG[id].prerequisites.every(p=>state.dream.upgrades[p.key]===p.mustBeOwned))
  const realityOwned=state.dream.upgrades as Readonly<Record<string,boolean>>
  const visibleReality=(ids:readonly RealityUpgradeId[])=>ids.filter(id=>!realityOwned[id]&&(!/^translation[2-8]$/.test(id)||realityOwned[`translation${Number(id.slice(11))-1}`])&&(!/^speed[2-8]$/.test(id)||realityOwned[`speed${Number(id.slice(5))-1}`]))
  const simulation={countermeasures:visibleDream(SIMULATION_UPGRADE_SECTIONS.countermeasures),education:visibleDream(SIMULATION_UPGRADE_SECTIONS.education),foundational:visibleDream(SIMULATION_UPGRADE_SECTIONS.foundational),information:visibleDream(SIMULATION_UPGRADE_SECTIONS.information),spaceAge:visibleDream(SIMULATION_UPGRADE_SECTIONS.spaceAge)}
  const reality={translation:visibleReality(REALITY_UPGRADE_SECTIONS.translation),speed:visibleReality(REALITY_UPGRADE_SECTIONS.speed),qualityOfLife:visibleReality(REALITY_UPGRADE_SECTIONS.qualityOfLife)}
  return Object.freeze({dream:Object.freeze({productionBasis:'current-rate' as const,effectiveDoubleTimeMultiplier:tick.effectiveMultiplier,result:production}),simulations:Object.freeze({currentEra:space?'space-age':information?'information':'foundational',eras:Object.freeze({foundational:Object.freeze({visible:true as const,visiblePanelIds:Object.freeze(foundational)}),information:Object.freeze({visible:information,visiblePanelIds:Object.freeze(informationPanels)}),spaceAge:Object.freeze({visible:space,visiblePanelIds:Object.freeze(spacePanels)})}),live:Object.freeze({resources:r,education:state.dream.education,timers:state.dream.timers,railgun:state.dream.railgun,production}),resets:Object.freeze({count:state.dream.resetCount,disasterStage:state.dream.disasterStage,automatic:reset(automatic),blackHole:reset(blackHole)}),permanentUpgrades:Object.freeze({simulationCategoryVisible:Object.values(simulation).some(x=>x.length>0),simulation,realityCategoryVisible:Object.values(reality).some(x=>x.length>0),anomalyCategoryVisible:reality.translation.length>0||reality.speed.length>0,reality})})})
}

export function selectFrontendApplicationSnapshotV2(
  publication: Readonly<CanonicalRuntimePublicationV2>,
  revision: Readonly<{ session: number; state: number; durable: number }>,
  checkpoint: 'clean' | 'dirty',
  previewDemand: FrontendGameplayPreviewDemand,
  tinker: Readonly<CanonicalTinkerRuntimeState>,
  infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>,
  storedTimeCheater = false,
): DeepReadonly<FrontendApplicationSnapshot> {
  const cacheKey = [
    revision.session,
    revision.state,
    revision.durable,
    checkpoint,
    previewDemand,
    storedTimeCheater ? 'cheater' : 'clean-time',
  ].join(':')
  const publicationCache = projectionCache.get(publication as object)
  const cached = publicationCache?.get(cacheKey)?.get(infinityRewardAuthority as object)?.get(tinker as object)
  if (cached !== undefined) return cached
  const readiness = selectFrontendReadinessConstants({
      'compatibility-tuning': true,
      'quantum-leap-port': true,
      'runtime-evaluation-port': true,
      'selected-skill-preset-carrier': true,
      'stored-time-commit-first-runner': true,
      'stored-time-cheater-carrier': true,
  })
  const state = publication.state
  const dyson = selectV2DysonDerivedFacts(publication)
  const dream = selectV2DreamFacts(publication)
  const spentShards = compareGameDecimals(
    state.quantum.lifetimeEarnedShards,
    state.quantum.availableShards,
  ) >= 0
    ? subtractGameDecimals(
        state.quantum.lifetimeEarnedShards,
        state.quantum.availableShards,
      )
    : gameDecimalFromNumber(0)
  const resources = Object.freeze({
    dyson: Object.freeze({
      money: state.dyson.money,
      science: state.dyson.science,
      bots: state.dyson.bots,
      workers: state.dyson.workers,
      researchers: state.dyson.researchers,
    }),
    infinity: Object.freeze({
      points: addGameDecimals(
        state.infinity.availablePoints,
        state.infinity.allocatedPoints,
      ),
      spentPoints: state.infinity.allocatedPoints,
      availablePoints: state.infinity.availablePoints,
      secretsOfTheUniverse: state.infinity.secretsOfTheUniverse,
      permanentSkillPoints: state.infinity.permanentSkillPoints,
    }),
    skills: Object.freeze({
      points: state.skills.points,
      fragments: state.skills.fragments,
    }),
    reality: Object.freeze({
      universeDesignationCount: state.reality.universeDesignationCount,
      workersReady: state.reality.workersReady,
      workerGenerationProgress: state.reality.workerGenerationProgress,
      influence: state.reality.influence,
    }),
    quantum: Object.freeze({
      pointsEarned: state.quantum.lifetimeEarnedShards,
      pointsSpent: spentShards,
      availablePoints: state.quantum.availableShards,
      permanentSecrets: state.quantum.permanentSecrets,
      influenceSpeedBonus: state.quantum.influenceSpeedBonus,
      cashBonusLevels: state.quantum.cashBonusLevels,
      scienceBonusLevels: state.quantum.scienceBonusLevels,
    }),
    avocado: Object.freeze({
      infinityPoints: state.avocado.infinityPoints,
      influence: state.avocado.influence,
      strangeMatter: state.avocado.strangeMatter,
      overflowMultiplier: state.avocado.overflowMultiplier,
    }),
    dream: Object.freeze({
      ...state.dream.resources,
      strangeMatter: state.dream.strangeMatter,
    }),
    time: Object.freeze({
      storedTimeAvailableSeconds: state.timeline.storedTimeAvailableSeconds,
      storedTimeCapacitySeconds: state.timeline.storedTimeCapacitySeconds,
      doubleTimeBankSeconds: state.timeline.doubleTime.bankSeconds,
    }),
  })
  const snapshot: DeepReadonly<FrontendApplicationSnapshot> = Object.freeze({
    version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
    phase: 'ready' as const,
    source: 'primary' as const,
    revision: Object.freeze({ ...revision }),
    checkpoint: checkpoint === 'clean'
      ? Object.freeze({ kind: 'clean' as const, durableRevision: revision.durable })
      : Object.freeze({ kind: 'dirty' as const, durableRevision: revision.durable, reason: 'state-changed' as const }),
    operation: 'none' as const,
    gameplay: Object.freeze({
      version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
      modelVersion: state.modelVersion,
      resources,
      progression: selectV2Progression(
        state,
        state.dream,
        state.statistics,
      ),
      derived: Object.freeze({
        dream: dream.dream,
        simulations: dream.simulations,
        dyson,
        dysonBotDistribution: state.quantum.unlocks.botMultitasking
          ? Object.freeze({ workersFraction: 1, scientistsFraction: 1 })
          : Object.freeze({
              workersFraction: 1 - state.dyson.botDistribution,
              scientistsFraction: state.dyson.botDistribution,
            }),
        infinity: projectInfinityProgressV2(
          state,
          infinityRewardAuthority,
        ),
        avocado: derivePreparedAvocadoMultiplierV2(state),
        reality: selectV2RealityDerivedFacts(state),
        story: selectV2StoryDerivedFacts(state, dyson),
      }),
      runtime: Object.freeze({
        storedTimeCheater,
        selectedSkillPresetSlot: state.skills.selectedPreset,
        tinker: Object.freeze({
          status: 'ready' as const,
          value: selectCanonicalTinkerUiFactsV2(
            state,
            tinker,
            publication.runtime.dysonEvaluationSnapshot.managerAssemblyLineProduction,
          ),
        }),
      }),
      visibility: selectV2GameplayVisibility(state),
      commands: readiness.commands,
      previews: selectV2Previews(
        publication,
        NATIVE_PREVIEW_METADATA,
        previewDemand,
        storedTimeCheater,
      ),
      definitionCoverage: readiness.definitionCoverage,
      persistence: readiness.persistence,
    }),
  })
  let byKey = projectionCache.get(publication as object)
  if (byKey === undefined) {
    byKey = new Map()
    projectionCache.set(publication as object, byKey)
  }
  let byAuthority = byKey.get(cacheKey)
  if (byAuthority === undefined) {
    byAuthority = new WeakMap()
    byKey.set(cacheKey, byAuthority)
  }
  let byTinker = byAuthority.get(infinityRewardAuthority as object)
  if (byTinker === undefined) {
    byTinker = new WeakMap()
    byAuthority.set(infinityRewardAuthority as object, byTinker)
  }
  byTinker.set(tinker as object, snapshot)
  return snapshot
}

function selectV2DysonDerivedFacts(
  publication: Readonly<CanonicalRuntimePublicationV2>,
): DeepReadonly<FrontendDysonDerivedFactsV2> {
  const { state } = publication
  const derived = deriveDysonV2FromCauses(state, publication.runtime)
  const production = derived.production
  const facilityContributionRows = deriveDysonV2FacilityContributionRows(
    state,
    derived.parameters,
    production,
  )
  const activePanels = multiplyGameDecimals(
    production.rates.panels,
    production.panelLifetimeSeconds,
  )
  const outputByFacility = Object.freeze({
    assembly_lines: 'bots',
    ai_managers: 'assembly_lines',
    servers: 'ai_managers',
    data_centers: 'servers',
    planets: 'data_centers',
  } as const)
  const facilityFact = (
    facilityId: (typeof BASIC_DYSON_FACILITY_IDS)[number],
  ): FrontendDysonDerivedFactsV2['value']['presentation']['facilities'][typeof facilityId] => {
      const pair = state.dyson.facilities[facilityId]
      const total = addGameDecimals(pair[0], pair[1])
      const outputId = outputByFacility[facilityId]
      const perSecond = production.rates[outputId]
      const runningOutput = outputId === 'bots'
        ? state.dyson.bots
        : state.dyson.facilities[outputId][0]
      const visible = compareGameDecimals(perSecond, gameDecimalFromNumber(0)) > 0
      const fractional = subtractGameDecimals(runningOutput, floorGameDecimal(runningOutput))
      const normalized = !visible ? 0
        : compareGameDecimals(perSecond, gameDecimalFromNumber(
            CANONICAL_DYSON_PRESENTATION_TUNING.solidProgressThresholdPerSecond,
          )) >= 0
          ? 1
          : gameDecimalToNumberChecked(fractional, { minimum: 0, maximum: 1 })
      const upstreamId = facilityId === 'assembly_lines' ? 'ai_managers'
        : facilityId === 'ai_managers' ? 'servers'
          : facilityId === 'servers' ? 'data_centers'
            : facilityId === 'data_centers' ? 'planets'
              : state.quantum.unlocks.matrioshkaBrains ? 'matrioshka_brains' : null
      return Object.freeze({
        facilityId,
        ownership: Object.freeze({ automatic: pair[0], manual: pair[1], total }),
        production: Object.freeze({
          outputFacilityId: outputId,
          perSecond,
          secondsPerUnit: decimalSecondsPerUnit(perSecond),
        }),
        productionProgress: Object.freeze({ visible, normalized }),
        details: Object.freeze({
          baseProductionPerSecond: production.facilityBaseProduction[facilityId],
          effectiveProducerCount: production.effectiveFacilityCounts[facilityId],
          modifier: derived.parameters.facilityModifiers[facilityId],
          contributions: facilityContributionRows[facilityId],
          upstreamSources: upstreamId === null ? Object.freeze([]) : Object.freeze([
            Object.freeze({
              sourceFacilityId: upstreamId,
              contributionPerSecond: facilityId === 'planets'
                ? production.facilityProducerRates.matrioshka_brains
                : production.rates[facilityId],
            }),
          ]),
        }),
      })
  }
  const facilities = Object.freeze({
    assembly_lines: facilityFact('assembly_lines'),
    ai_managers: facilityFact('ai_managers'),
    servers: facilityFact('servers'),
    data_centers: facilityFact('data_centers'),
    planets: facilityFact('planets'),
  }) satisfies FrontendDysonDerivedFactsV2['value']['presentation']['facilities']
  return Object.freeze({
    status: 'ready',
    value: Object.freeze({
      globals: Object.freeze({
        moneyMultiplier: derived.parameters.moneyMultiplier,
        scienceMultiplier: derived.parameters.scienceMultiplier,
        panelsPerSecond: production.rates.panels,
        panelLifetimeSeconds: production.panelLifetimeSeconds,
      }),
      rates: production.rates,
      presentation: Object.freeze({
        activePanelMetric: selectV2ActivePanelMetric(activePanels),
        swarmVisualization: selectV2SwarmVisualization(activePanels),
        currentGoal: selectV2DysonGoal(state.dyson.goalStage),
        facilities,
      }),
    }),
  })
}

function decimalSecondsPerUnit(rate: GameDecimal): number | null {
  if (compareGameDecimals(rate, gameDecimalFromNumber(0)) <= 0) return null
  try {
    return gameDecimalToNumberChecked(divideGameDecimals(gameDecimalFromNumber(1), rate), {
      minimum: 0,
      maximum: Number.MAX_VALUE,
    })
  } catch {
    return 0
  }
}

function selectV2ActivePanelMetric(activePanels: GameDecimal) {
  if (compareGameDecimals(activePanels, PANELS_PER_SURROUNDED_STAR_V2) < 0) {
    return Object.freeze({ kind: 'active-panels' as const, value: activePanels })
  }
  if (compareGameDecimals(activePanels, PANELS_PER_ENGULFED_GALAXY_V2) < 0) {
    return Object.freeze({
      kind: 'stars-surrounded' as const,
      value: divideGameDecimals(activePanels, PANELS_PER_SURROUNDED_STAR_V2),
    })
  }
  return Object.freeze({
    kind: 'galaxies-engulfed' as const,
    value: divideGameDecimals(activePanels, PANELS_PER_ENGULFED_GALAXY_V2),
  })
}

function selectV2SwarmVisualization(activePanels: GameDecimal) {
  if (compareGameDecimals(activePanels, PANELS_PER_SURROUNDED_STAR_V2) < 0) {
    const count = gameDecimalToNumberChecked(activePanels, { minimum: 0, maximum: 20_000 })
    return Object.freeze({
      phase: 'stellar-swarm' as const,
      activePanels: count,
      completion: Math.min(1, count / 20_000),
    })
  }
  if (compareGameDecimals(activePanels, PANELS_PER_ENGULFED_GALAXY_V2) < 0) {
    const stars = gameDecimalToNumberChecked(
      divideGameDecimals(activePanels, PANELS_PER_SURROUNDED_STAR_V2),
      { minimum: 0, maximum: 100_000_000_000 },
    )
    return Object.freeze({
      phase: 'galaxy' as const,
      starsSurrounded: stars,
      completion: Math.min(1, stars / 100_000_000_000),
    })
  }
  const galaxies = divideGameDecimals(activePanels, PANELS_PER_ENGULFED_GALAXY_V2)
  const logarithm = gameDecimalToNumberChecked(logGameDecimal(galaxies, 10), {
    minimum: 0,
    maximum: Number.MAX_VALUE,
  })
  return Object.freeze({
    phase: 'galaxy-group' as const,
    galaxiesEngulfed: galaxies,
    completion: Math.pow(Math.min(1, logarithm / 291), 0.72),
  })
}

function selectV2DysonGoal(goalStage: bigint) {
  const goals = [
    ['create-bots', 10], ['build-assembly-lines', 5],
    ['have-active-panels', 20_000], ['own-planets', 20],
    ['decay-panels', 1_000_000_000_000], ['surround-stars', 1_000_000_000],
    ['surround-stars', 10_000_000_000], ['engulf-galaxies', 1],
    ['engulf-galaxies', 10], ['engulf-galaxies', 100],
  ] as const
  const selected = goalStage >= 0n && goalStage < BigInt(goals.length)
    ? goals[Number(goalStage)]!
    : ['reach-bots', 42_000_000_000_000_000_000] as const
  return Object.freeze({ kind: selected[0], target: selected[1] })
}

function selectV2StoryDerivedFacts(
  state: Readonly<CanonicalGameStateV2>,
  dyson: DeepReadonly<FrontendDysonDerivedFactsV2>,
): DeepReadonly<FrontendStoryDerivedFacts> {
  const activePanels = multiplyGameDecimals(
    dyson.value.globals.panelsPerSecond,
    dyson.value.globals.panelLifetimeSeconds,
  )
  const infinityTotal = addGameDecimals(
    state.infinity.availablePoints,
    state.infinity.allocatedPoints,
  )
  const quantumComplete = compareGameDecimals(
    state.quantum.lifetimeEarnedShards,
    gameDecimalFromNumber(1),
  ) >= 0
  const infinityComplete = compareGameDecimals(infinityTotal, gameDecimalFromNumber(1)) >= 0
  const either = quantumComplete || infinityComplete
  const stars = divideGameDecimals(activePanels, PANELS_PER_SURROUNDED_STAR_V2)
  const galaxies = divideGameDecimals(activePanels, PANELS_PER_ENGULFED_GALAXY_V2)
  const manualManager = compareGameDecimals(state.dyson.facilities.ai_managers[1], gameDecimalFromNumber(1)) >= 0
  const manualServer = compareGameDecimals(state.dyson.facilities.servers[1], gameDecimalFromNumber(1)) >= 0
  const chapters: FrontendStoryDerivedFacts['visibleChapterIds'][number][] = ['chapter-1']
  const passages: FrontendStoryDerivedFacts['visiblePassageIds'][number][] = ['chapter-1-intro']
  if (state.dyson.goalStage >= 1n || either) passages.push('chapter-1-part-2', 'chapter-1-part-3')
  if (manualManager || either) { chapters.push('chapter-2'); passages.push('chapter-2-intro') }
  if (manualServer || either) passages.push('chapter-2-part-2')
  if (compareGameDecimals(stars, gameDecimalFromNumber(1)) >= 0 || either) passages.push('chapter-2-part-3')
  if (compareGameDecimals(galaxies, gameDecimalFromNumber(1)) >= 0 || either) { chapters.push('chapter-3'); passages.push('chapter-3-intro') }
  if (either) passages.push('chapter-3-part-2')
  if (either) { chapters.push('chapter-4'); passages.push('chapter-4-intro', 'chapter-4-part-2') }
  const chapter4 = ['chapter-4-part-3','chapter-4-part-4','chapter-4-part-5','chapter-4-part-6','chapter-4-part-7','chapter-4-part-8','chapter-4-part-9','chapter-4-part-10'] as const
  chapter4.forEach((id, index) => { if (compareGameDecimals(infinityTotal, gameDecimalFromNumber(index + 2)) >= 0 || quantumComplete) passages.push(id) })
  const reality = quantumComplete ||
    state.infinity.secretsOfTheUniverse >= QUANTUM_CONSTANTS.maximumSecrets
  if (reality) { chapters.push('chapter-5'); passages.push('chapter-5-part-1','chapter-5-part-2','chapter-5-part-3','chapter-5-part-4','chapter-5-part-5') }
  if (state.dream.upgrades.translation8) { chapters.push('chapter-6'); passages.push('chapter-6-translation') }
  if (state.dream.upgrades.speed8) passages.push('chapter-6-speed')
  if (state.dream.upgrades.translation8 && state.dream.upgrades.speed8) passages.push('chapter-6-complete')
  return Object.freeze({
    visibleChapterIds: Object.freeze(chapters),
    visiblePassageIds: Object.freeze(passages),
    avocatoEntryVisible: compareGameDecimals(infinityTotal, gameDecimalFromNumber(2)) >= 0 || quantumComplete,
  })
}

function selectV2RealityDerivedFacts(
  state: Readonly<CanonicalGameStateV2>,
): DeepReadonly<FrontendRealityDerivedFacts> {
  const rate = realityWorkerGenerationRateV2(
    state.quantum.influenceSpeedBonus,
  )
  let generationPerSecond: number
  try {
    generationPerSecond = gameDecimalToNumberChecked(rate, {
      minimum: 0,
      maximum: Number.MAX_VALUE,
    })
  } catch {
    generationPerSecond = Number.MAX_VALUE
  }
  const batch = REALITY_WORKERS_READY_MAXIMUM_V2
  return Object.freeze({
    status: 'success' as const,
    generationPerSecond: rate,
    workerGenerationAnimationRatePerSecond: Math.min(
      Number.MAX_VALUE,
      generationPerSecond / Number(batch),
    ),
    workerGenerationFillFraction: generationPerSecond >= 10
      ? 1
      : Math.min(1, Math.max(0, state.reality.workerGenerationProgress)),
    workerBatchSize: batch,
    nextUniverseDesignation: addGameDecimals(
      state.reality.universeDesignationCount,
      gameDecimalFromNumber(1),
    ),
    workerBatchFillFraction: Math.min(
      1,
      Number(state.reality.workersReady) / Number(batch),
    ),
    consumptionStatus: !state.reality.autoGather &&
      state.reality.workersReady >= batch
      ? 'halted' as const
      : 'running' as const,
    autoGatherEnabled: state.reality.autoGather,
    artifact: selectV2RealityArtifact(state.dream.upgrades),
  })
}

function selectV2RealityArtifact(
  upgrades: Readonly<CanonicalGameStateV2['dream']['upgrades']>,
) {
  const replacements: Array<Readonly<{ source: string; replacement: string }>> = []
  if (!upgrades.translation1) replacements.push({ source: 'i', replacement: '|' })
  if (!upgrades.translation2) replacements.push({ source: 'r', replacement: '}' })
  if (!upgrades.translation3) replacements.push({ source: 'e', replacement: '%' })
  if (!upgrades.translation4) replacements.push({ source: 'f', replacement: '$' })
  if (!upgrades.translation5) replacements.push({ source: 'c', replacement: '{' })
  if (!upgrades.translation6) replacements.push({ source: 'h', replacement: '*' })
  if (!upgrades.translation7) replacements.push(
    { source: 'a', replacement: '@' },
    { source: 'A', replacement: '#' },
  )
  if (!upgrades.translation8) replacements.push(
    { source: 't', replacement: '^' },
    { source: 'T', replacement: '&' },
  )
  const ticks = upgrades.speed8 ? null
    : upgrades.speed7 ? 6
      : upgrades.speed6 ? 15
        : upgrades.speed5 ? 30
          : upgrades.speed4 ? 42
            : upgrades.speed3 ? 48
              : upgrades.speed2 ? 54
                : upgrades.speed1 ? 57 : 60
  return Object.freeze({
    replacements: Object.freeze(replacements),
    progressLabel: upgrades.speed8 ? 'cpu-time' as const : 'undefined' as const,
    scrambleIntervalSeconds: ticks === null ? null : 1 / ticks,
  })
}

/**
 * Production V2 read models keep canonical progression values in their native
 * domains. Dream remains bridge-owned until its presentation selectors accept
 * GameDecimal end to end; keeping that boundary explicit
 * prevents an accidental full-state V1 projection from becoming the UI source
 * again.
 */
function selectV2Progression(
  state: Readonly<CanonicalGameStateV2>,
  dream: DeepReadonly<FrontendCanonicalProgression['dream']>,
  statistics: DeepReadonly<FrontendCanonicalProgression['statistics']>,
): DeepReadonly<FrontendCanonicalProgression> {
  return Object.freeze({
    meta: state.meta,
    dyson: Object.freeze({
      facilities: state.dyson.facilities,
      manualCreationIntervalSeconds: state.dyson.manualCreationIntervalSeconds,
      totalPanelsDecayed: state.dyson.totalPanelsDecayed,
      goalStage: state.dyson.goalStage,
      botDistribution: state.dyson.botDistribution,
      automation: state.dyson.automation,
    }),
    infinity: Object.freeze({
      breakTarget: state.infinity.breakTarget,
      inProgress: state.infinity.inProgress,
      botCapTransitionPending: state.infinity.botCapTransitionPending,
      botCapRewardsGranted: state.infinity.botCapRewardsGranted,
      lastCycleDurationSeconds: state.infinity.lastCycleDurationSeconds,
      lastPointsGained: state.infinity.lastPointsGained,
      storedTimeUsedThisCycleSeconds: state.infinity.storedTimeUsedThisCycleSeconds,
      storedTimeUsedPreviousCycleSeconds: state.infinity.storedTimeUsedPreviousCycleSeconds,
      retainedFacilities: state.infinity.retainedFacilities,
      automationUnlocked: state.infinity.automationUnlocked,
    }),
    skills: Object.freeze({
      byId: state.skills.byId,
      activeAutoAssignment: state.skills.activeAutoAssignment,
      presets: state.skills.presets,
      autoAssignNonRefundable: state.skills.autoAssignNonRefundable,
      tabPresetAutomation: state.skills.tabPresetAutomation,
    }),
    research: state.research,
    reality: Object.freeze({ autoGather: state.reality.autoGather }),
    quantum: Object.freeze({
      divisionsPurchased: state.quantum.divisionsPurchased,
      unlocks: state.quantum.unlocks,
    }),
    avocado: Object.freeze({ unlocked: state.avocado.unlocked }),
    timeline: Object.freeze({
      eventClockInitialized: state.timeline.eventClockInitialized,
      automationTimeUntilNextEvent: state.timeline.automationTimeUntilNextEvent,
      dysonAutomationTargetIndex: state.timeline.dysonAutomationTargetIndex,
      researchAutomationTargetIndex: state.timeline.researchAutomationTargetIndex,
      infinityBoundaryRemaining: state.timeline.infinityBoundaryRemaining,
      infinityCycleSeconds: state.timeline.infinityCycleSeconds,
      infinityCycleStartingPoints: state.timeline.infinityCycleStartingPoints,
      infinityHasPostResetStart: state.timeline.infinityHasPostResetStart,
      lastSuspendedAtLegacyText: state.timeline.lastSuspendedAtLegacyText,
      doubleTime: Object.freeze({
        unlocked: state.timeline.doubleTime.unlocked,
        enabled: state.timeline.doubleTime.enabled,
        rate: state.timeline.doubleTime.rate,
      }),
    }),
    secretProgress: state.secretProgress,
    dream,
    statistics,
  })
}

function selectV2GameplayVisibility(
  state: Readonly<CanonicalGameStateV2>,
): Readonly<FrontendGameplayVisibility> {
  const zero = gameDecimalFromNumber(0)
  const total = (facilityId: keyof CanonicalGameStateV2['dyson']['facilities']) => {
    const owned = state.dyson.facilities[facilityId]
    return addGameDecimals(owned[0], owned[1])
  }
  const owns = (
    facilityId: keyof CanonicalGameStateV2['dyson']['facilities'],
    amount = 1,
  ) => compareGameDecimals(total(facilityId), gameDecimalFromNumber(amount)) >= 0
  const automaticOwns = (
    facilityId: keyof CanonicalGameStateV2['dyson']['facilities'],
    amount: number,
  ) => compareGameDecimals(
    state.dyson.facilities[facilityId][1],
    gameDecimalFromNumber(amount),
  ) >= 0
  const positive = (value: GameDecimal) => compareGameDecimals(value, zero) > 0
  const basicVisible = Object.freeze({
    assembly_lines: compareGameDecimals(
      state.dyson.bots,
      gameDecimalFromNumber(10),
    ) >= 0 || owns('assembly_lines'),
    ai_managers: automaticOwns('assembly_lines', 5) || owns('ai_managers'),
    servers: automaticOwns('ai_managers', 1) || owns('servers'),
    data_centers: owns('servers') || owns('data_centers'),
    planets: owns('data_centers') || owns('planets'),
  })
  const infinityPoints = addGameDecimals(
    state.infinity.availablePoints,
    state.infinity.allocatedPoints,
  )
  const quantumEarned = state.quantum.lifetimeEarnedShards
  const realityUnlocked = positive(quantumEarned) ||
    state.infinity.secretsOfTheUniverse >= QUANTUM_CONSTANTS.maximumSecrets
  const galacticBrainsVisible = owns('galactic_brains') ||
    (state.quantum.unlocks.galacticBrains && owns('birch_planets'))
  const currentSecrets = state.infinity.secretsOfTheUniverse
  const requiredSecrets = QUANTUM_CONSTANTS.maximumSecrets

  return Object.freeze({
    dyson: Object.freeze({
      showTinker: ((!owns('assembly_lines', 10) ||
        !automaticOwns('ai_managers', 1)) && !owns('data_centers')) ||
        state.skills.byId.manualLabour?.owned === true,
      visibleBasicFacilityIds: Object.freeze(
        BASIC_DYSON_FACILITY_IDS.filter((facilityId) => basicVisible[facilityId]),
      ),
      showNextTierTeaser: positive(quantumEarned)
        ? !galacticBrainsVisible
        : !basicVisible.planets,
    }),
    skills: Object.freeze({
      routeUnlocked: compareGameDecimals(
        state.dyson.bots,
        gameDecimalFromNumber(10),
      ) >= 0 ||
        state.dyson.goalStage > 0n ||
        state.meta.firstInfinityComplete ||
        state.skills.points > 0n ||
        state.infinity.permanentSkillPoints > 0n ||
        positive(infinityPoints) ||
        Object.values(state.skills.byId).some((skill) => skill.owned),
    }),
    infinity: Object.freeze({
      routeUnlocked: state.meta.firstInfinityComplete ||
        positive(infinityPoints) || positive(quantumEarned),
    }),
    reality: Object.freeze({
      routeVisible: positive(infinityPoints) || positive(quantumEarned),
      routeUnlocked: realityUnlocked,
      unlockProgress: Object.freeze({
        currentSecrets,
        requiredSecrets,
        fraction: currentSecrets >= requiredSecrets
          ? 1
          : Number(currentSecrets) / Number(requiredSecrets),
      }),
    }),
    simulations: Object.freeze({ routeUnlocked: realityUnlocked }),
  })
}

export function projectLegacyPresentationState(
  state: Readonly<CanonicalGameStateV2>,
): CanonicalGameStateV1 {
  return projectLegacyPresentationStateWithSafety(state).state
}

function projectLegacyPresentationStateWithSafety(
  state: Readonly<CanonicalGameStateV2>,
  options: Readonly<{ includeStatistics: boolean }> = Object.freeze({
    includeStatistics: true,
  }),
): Readonly<{ state: CanonicalGameStateV1; unsafe: boolean }> {
  let unsafe = false
  const number = (value: GameDecimal): number => {
    const projected = tryDecimalToPresentationNumber(value)
    if (projected === null) unsafe = true
    return projected ?? 0
  }
  const discrete = (value: GameDecimal): bigint => {
    const projected = tryDecimalToPresentationBigInt(value)
    if (projected === null) unsafe = true
    return projected ?? 0n
  }
  const count = (value: bigint): number => {
    const projected = Number(value)
    if (!Number.isSafeInteger(projected)) {
      unsafe = true
      return 0
    }
    return projected
  }
  const infinityTotal = addGameDecimals(
    state.infinity.availablePoints,
    state.infinity.allocatedPoints,
  )
  const spentQuantum = compareGameDecimals(
    state.quantum.lifetimeEarnedShards,
    state.quantum.availableShards,
  ) >= 0
    ? subtractGameDecimals(
        state.quantum.lifetimeEarnedShards,
        state.quantum.availableShards,
      )
    : gameDecimalFromNumber(0)
  const totals = (source: CanonicalGameStateV2['statistics']['lifetime']) => ({
    ...source,
    ordinaryInfinityPoints: discrete(source.ordinaryInfinityPoints),
    breakInfinityPoints: discrete(source.breakInfinityPoints),
    botCapInfinityPoints: discrete(source.botCapInfinityPoints),
    botCapOverflowRewards: discrete(source.botCapOverflowRewards),
    strangeMatter: discrete(source.strangeMatter),
    realityWorkers: discrete(source.realityWorkers),
    automaticInfluence: discrete(source.automaticInfluence),
    manualInfluence: discrete(source.manualInfluence),
  })
  const window = (source: CanonicalGameStateV2['statistics']['minuteWindows'][number]) => ({
    ...source,
    infinityPoints: discrete(source.infinityPoints),
    strangeMatter: discrete(source.strangeMatter),
    realityWorkers: discrete(source.realityWorkers),
  })
  const projected: CanonicalGameStateV1 = {
    modelVersion: 1,
    meta: state.meta,
    dyson: {
      ...state.dyson,
      money: number(state.dyson.money),
      science: number(state.dyson.science),
      bots: number(state.dyson.bots),
      workers: number(state.dyson.workers),
      researchers: number(state.dyson.researchers),
      facilities: Object.fromEntries(Object.entries(state.dyson.facilities).map(
        ([id, owned]) => [id, [number(owned[0]), number(owned[1])]],
      )) as unknown as CanonicalGameStateV1['dyson']['facilities'],
      totalPanelsDecayed: number(state.dyson.totalPanelsDecayed),
    },
    infinity: {
      ...state.infinity,
      points: discrete(infinityTotal),
      spentPoints: discrete(state.infinity.allocatedPoints),
      breakTarget: discrete(state.infinity.breakTarget),
      lastPointsGained: number(state.infinity.lastPointsGained),
    },
    skills: {
      ...state.skills,
      byId: Object.fromEntries(Object.entries(state.skills.byId).map(
        ([id, skill]) => [id, { ...skill, level: count(skill.level) }],
      )),
    },
    research: {
      ...state.research,
      levelsById: Object.fromEntries(Object.entries(state.research.levelsById).map(
        ([id, level]) => [id, typeof level === 'bigint' ? count(level) : number(level)],
      )),
      progressById: Object.fromEntries(Object.entries(state.research.progressById).map(
        ([id, progress]) => [id, number(progress)],
      )),
    },
    reality: {
      ...state.reality,
      universeDesignationCount: discrete(state.reality.universeDesignationCount),
      influence: discrete(state.reality.influence),
    },
    quantum: {
      ...state.quantum,
      pointsEarned: discrete(state.quantum.lifetimeEarnedShards),
      pointsSpent: discrete(spentQuantum),
      influenceSpeedBonus: discrete(state.quantum.influenceSpeedBonus),
      cashBonusLevels: discrete(state.quantum.cashBonusLevels),
      scienceBonusLevels: discrete(state.quantum.scienceBonusLevels),
    },
    avocado: {
      ...state.avocado,
      infinityPoints: number(state.avocado.infinityPoints),
      influence: number(state.avocado.influence),
      strangeMatter: number(state.avocado.strangeMatter),
      overflowMultiplier: number(state.avocado.overflowMultiplier),
    },
    timeline: {
      ...state.timeline,
      infinityCycleStartingPoints: discrete(state.timeline.infinityCycleStartingPoints),
    },
    secretProgress: state.secretProgress,
    dream: {
      ...state.dream,
      resources: {
        hunters: discrete(state.dream.resources.hunters),
        gatherers: discrete(state.dream.resources.gatherers),
        community: number(state.dream.resources.community),
        housing: number(state.dream.resources.housing),
        villages: number(state.dream.resources.villages),
        workers: number(state.dream.resources.workers),
        cities: number(state.dream.resources.cities),
        factories: number(state.dream.resources.factories),
        bots: number(state.dream.resources.bots),
        rockets: number(state.dream.resources.rockets),
        energy: number(state.dream.resources.energy),
        spaceFactories: number(state.dream.resources.spaceFactories),
        dysonPanels: discrete(state.dream.resources.dysonPanels),
        railgunCharge: number(state.dream.resources.railgunCharge),
        solarPanels: number(state.dream.resources.solarPanels),
        fusion: number(state.dream.resources.fusion),
        swarmPanels: discrete(state.dream.resources.swarmPanels),
      },
      parameters: {
        ...state.dream.parameters,
        hunterCost: discrete(state.dream.parameters.hunterCost),
        gathererCost: discrete(state.dream.parameters.gathererCost),
        communityBoostCost: number(state.dream.parameters.communityBoostCost),
        factoriesBoostCost: number(state.dream.parameters.factoriesBoostCost),
        rocketsPerSpaceFactory: discrete(state.dream.parameters.rocketsPerSpaceFactory),
        railgunMaxCharge: number(state.dream.parameters.railgunMaxCharge),
        solarCost: discrete(state.dream.parameters.solarCost),
        solarPanelGeneration: discrete(state.dream.parameters.solarPanelGeneration),
        fusionCost: discrete(state.dream.parameters.fusionCost),
        fusionGeneration: discrete(state.dream.parameters.fusionGeneration),
        swarmPanelGeneration: discrete(state.dream.parameters.swarmPanelGeneration),
      },
      education: Object.fromEntries(Object.entries(state.dream.education).map(
        ([id, education]) => [id, {
          ...education,
          progress: number(education.progress),
          cost: number(education.cost),
        }],
      )) as CanonicalGameStateV1['dream']['education'],
      railgun: {
        firing: state.dream.railgun.firing,
        fireProgress: state.dream.railgun.fireProgress,
        shotsRemaining: state.dream.railgun.shotsRemaining,
        activeRailguns: state.dream.railgun.activeRailguns,
        reservedPanels: discrete(state.dream.railgun.reservedPanels),
        highestStoredPanels: discrete(state.dream.railgun.highestStoredPanels),
        lastRoundsFired: state.dream.railgun.lastRoundsFired,
        lastPanelsLaunched: discrete(state.dream.railgun.lastPanelsLaunched),
      },
      strangeMatter: discrete(state.dream.strangeMatter),
      huntersPerPurchase: discrete(state.dream.huntersPerPurchase),
      gatherersPerPurchase: discrete(state.dream.gatherersPerPurchase),
    },
    statistics: options.includeStatistics ? {
      ...state.statistics,
      lifetime: totals(state.statistics.lifetime),
      currentQuantumRun: totals(state.statistics.currentQuantumRun),
      recentProcessedSegment: totals(state.statistics.recentProcessedSegment),
      lastCompletedCycle: {
        ...state.statistics.lastCompletedCycle,
        reward: discrete(state.statistics.lastCompletedCycle.reward),
      },
      minuteWindows: state.statistics.minuteWindows.map(window),
      halfHourWindows: state.statistics.halfHourWindows.map(window),
      dailyWindows: state.statistics.dailyWindows.map(window),
    } : legacyHydration.state.statistics,
  }
  return Object.freeze({ state: projected, unsafe })
}

function tryDecimalToPresentationNumber(value: GameDecimal): number | null {
  try {
    return gameDecimalToNumberChecked(value)
  } catch {
    return null
  }
}

function tryDecimalToPresentationBigInt(value: GameDecimal): bigint | null {
  try {
    return gameDecimalToBigIntChecked(value, { maximum: DISCRETE_MAXIMUM })
  } catch {
    return null
  }
}

function selectV2Previews(
  publication: Readonly<CanonicalRuntimePublicationV2>,
  legacy: Readonly<FrontendGameplayPreviews>,
  previewDemand: FrontendGameplayPreviewDemand,
  storedTimeCheater: boolean,
): DeepReadonly<FrontendGameplayPreviews> {
  const { state, revision } = publication
  const fallback = legacy
  const wants = (family: FrontendGameplayPreviewDemand) =>
    previewDemand === 'all' ||
    previewDemand === family ||
    (previewDemand === 'reality' && family === 'simulations') ||
    (previewDemand === 'quantum' && family === 'avocato')
  const quote = (facilityId: (typeof BASIC_DYSON_FACILITY_IDS)[number] | (typeof MEGA_STRUCTURE_IDS)[number]) =>
    quoteV2DysonFacilityPurchase(
      state as CanonicalGameStateV2,
      revision,
      facilityId,
    )
  const basicFacilities = !wants('bots') ? fallback.dyson.basicFacilities : BASIC_DYSON_FACILITY_IDS.map((facilityId) => {
    const preview = quote(facilityId)
    return Object.freeze({
      facilityId,
      eligible: preview.eligible,
      selectedQuantity: preview.unitsGranted,
      affordableQuantity: preview.unitsGranted,
      cost: preview.quotedCost,
      status: preview.status,
    })
  })
  const megaStructures = !wants('bots') ? fallback.dyson.megaStructures : MEGA_STRUCTURE_IDS.map((facilityId) => {
    const preview = quote(facilityId)
    return Object.freeze({
      facilityId,
      eligible: preview.eligible,
      selectedQuantity: preview.unitsGranted,
      cost: preview.quotedCost,
      code: preview.status,
      definitionGap: preview.status === 'catalog-gap' ? facilityId : null,
    })
  })
  const researchQuotes = !wants('research')
    ? new Map<CanonicalResearchId, ReturnType<typeof quoteV2ResearchPurchase>>()
    : new Map(RESEARCH_V2_IDS.map((researchId) => [
    researchId,
    quoteV2ResearchPurchase(
      state as CanonicalGameStateV2,
      publication.runtime,
      revision,
      researchId,
    ),
  ]))
  const researchCards = !wants('research') ? fallback.research.cards : RESEARCH_V2_IDS.flatMap((researchId) => {
    const preview = researchQuotes.get(researchId)
    if (preview === undefined) return []
    const presentation = selectResearchV2PresentationFacts(
      state,
      publication.runtime,
      researchId,
      preview.batches,
    )
    if (presentation === null) return []
    return Object.freeze({
      researchId,
      eligible: preview.eligible,
      code: preview.status,
      currentLevel: preview.currentLevel,
      maximumLevel: preview.maximumLevel === null ? null : Number(preview.maximumLevel),
      selectedQuantity: preview.batches,
      affordableQuantity: preview.affordableBatches,
      cost: preview.quotedCost,
      issue: preview.status === 'catalog-gap' ? preview.researchId : null,
      ...presentation,
    })
  })
  const infinityShop = !wants('infinity') ? fallback.infinity.shop : INFINITY_SHOP_ITEM_IDS_V2.map((itemId) => {
    const preview = quoteInfinityShopPurchaseV2(state, revision, itemId)
    return Object.freeze({
      itemId,
      eligible: preview.eligible,
      cost: preview.quotedCost,
      code: preview.status,
      definitionGap: null,
    })
  })
  const breakTarget = wants('infinity') ? projectBreakInfinityPresentationControl(
    compareGameDecimals(state.infinity.breakTarget, gameDecimalFromNumber(Number(BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM))) > 0
      ? BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM
      : gameDecimalToBigIntChecked(state.infinity.breakTarget, { maximum: BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM }),
  ) : fallback.infinity.breakTarget
  const quantumUpgrades = !wants('quantum') ? fallback.quantum.upgrades : QUANTUM_V2_UPGRADE_IDS.map((upgradeId) => {
    const preview = quoteQuantumUpgradeV2(
      state as CanonicalGameStateV2,
      revision,
      upgradeId,
    )
    return Object.freeze({
      upgradeId,
      eligible: preview.eligible,
      cost: preview.quotedCost,
      code: preview.status,
      definitionGap: preview.status === 'catalog-gap' ? upgradeId : null,
    })
  })
  const quantumSectionById = !wants('quantum') ? new Map() : new Map(
    previewQuantumSectionsV2(state as CanonicalGameStateV2).map(
      (section) => [section.id, section],
    ),
  )
  const quantumSections = !wants('quantum') ? fallback.quantum.sections : Object.freeze(
    [...quantumSectionById.values()].map((section) => Object.freeze({
      sectionId: section.id,
      upgradeIds: section.upgradeIds,
      revealed: section.revealed,
      revealRequirement: section.id === 'skill-paths'
        ? Object.freeze({ kind: 'points-earned' as const, value: 3n })
        : section.id === 'boosters'
          ? Object.freeze({ kind: 'points-earned' as const, value: 6n })
          : section.id === 'avocato'
            ? Object.freeze({ kind: 'points-earned' as const, value: 20n })
            : section.id === 'cosmic-structures'
              ? Object.freeze({ kind: 'upgrade-owned' as const, upgradeId: 'BreakTheLoop' as const })
              : null,
    })),
  )
  const dreamPublication = Object.freeze({
    revision,
    state: state as CanonicalGameStateV2,
    runtime: publication.runtime,
  })
  const dreamQuote = (request: DreamCommandV2) =>
    quoteDreamCommandV2(dreamPublication, request)
  const influenceQuotes = (purchaseId: DreamInfluencePurchaseIdV2) =>
    Object.freeze(previewDreamInfluencePurchaseModesV2(state, purchaseId).map((quote) =>
      Object.freeze({
        requestedMode: quote.requestedMode,
        eligible: quote.accepted,
        batches: quote.batches,
        unitsGranted: quote.unitsGranted,
        totalCost: quote.quotedCost,
        buyMaxBatchCap: quote.buyMaxBatchCap,
        reachedBuyMaxBatchCap: quote.reachedBuyMaxBatchCap,
        code: quote.accepted ? 'ready' : 'rejected',
      }),
    ))
  const foundational = !wants('simulations') ? fallback.dream.foundational : DREAM_FOUNDATIONAL_PURCHASE_IDS.map((purchase) => {
    const preview = Object.freeze({ purchase, eligible: false, cost: gameDecimalFromNumber(0), code: 'not-quoted' })
    if (preview.purchase === 'hunters' || preview.purchase === 'gatherers') {
      const quotes = influenceQuotes(preview.purchase)
      const selected = quotes.find((quote) => quote.requestedMode === state.dyson.automation.buyMode)!
      return Object.freeze({
        ...preview,
        eligible: selected.eligible,
        cost: selected.totalCost,
        code: selected.code,
        influenceQuotes: quotes,
        selectedInfluenceQuote: selected,
      })
    }
    const quote = dreamQuote(Object.freeze({
      kind: 'boost',
      boostId: preview.purchase === 'community-boost' ? 'community' : 'factories',
    }))
    return Object.freeze({ ...preview, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code })
  })
  const spaceAge = !wants('simulations') ? fallback.dream.spaceAge : DREAM_SPACE_AGE_PURCHASE_IDS.map((purchase) => {
    const preview = Object.freeze({ purchase, eligible: false, cost: gameDecimalFromNumber(0), code: 'not-quoted' })
    const quotes = influenceQuotes(preview.purchase)
    const buyOne = quotes.find((quote) => quote.requestedMode === 'buy-1')!
    return Object.freeze({
      ...preview,
      eligible: buyOne.eligible,
      cost: buyOne.totalCost,
      code: buyOne.code,
      influenceQuotes: quotes,
    })
  })
  const dreamUpgrades = !wants('simulations') ? fallback.dream.upgrades : DREAM_V2_UPGRADE_IDS.map((upgradeId) => {
    const quote = dreamQuote(Object.freeze({ kind: 'dream-upgrade', upgradeId }))
    return Object.freeze({ upgradeId, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code, definitionGap: null })
  })
  const education = !wants('simulations') ? fallback.dream.education : DREAM_V2_EDUCATION_IDS.map((educationId) => {
    const quote = dreamQuote(Object.freeze({ kind: 'education-start', educationId }))
    return Object.freeze({ educationId, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code })
  })
  const automaticResetQuote = wants('simulations') ? quoteCanonicalDreamResetV2(dreamPublication, Object.freeze({ kind: 'automatic' })) : null
  const blackHoleResetQuote = wants('simulations') ? quoteCanonicalDreamResetV2(dreamPublication, Object.freeze({ kind: 'black-hole' })) : null
  const reset = (quote: NonNullable<typeof automaticResetQuote>) => Object.freeze({
    eligible: quote.accepted,
    code: quote.code,
    cause: quote.cause,
    requestedReward: quote.requestedReward,
    definitionGaps: Object.freeze([]),
  })
  const realityUpgrades = !wants('reality') ? fallback.reality.upgrades : REALITY_UPGRADE_IDS_V2.map((upgradeId) => {
    const quote = dreamQuote(Object.freeze({ kind: 'reality-upgrade', upgradeId }))
    return Object.freeze({ upgradeId, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code, definitionGap: null })
  })
  const realityGather = !wants('reality')
    ? fallback.reality.gatherInfluence
    : (() => {
        const result = gatherRealityInfluenceV2(state)
        return Object.freeze({
          eligible: result.accepted && result.changed,
          amount: result.influenceGathered,
          code: result.code,
        })
      })()
  const avocadoPublication = dreamPublication
  const avocadoFeeds = !wants('avocato') ? fallback.avocado.feeds : (['infinity-points', 'influence', 'strange-matter'] as const).map((source) => {
    const account = source === 'strange-matter'
      ? registerAvocadoStrangeMatterAccountV2ForOwner(revision, state.dream.strangeMatter)
      : null
    const quote = quoteAvocadoCommandV2(avocadoPublication, Object.freeze({ kind: 'feed-all', source }), account)
    return Object.freeze({ source, eligible: quote.accepted, amount: quote.transferred, code: quote.code })
  })
  const meditationQuote = wants('avocato') ? quoteAvocadoCommandV2(avocadoPublication, Object.freeze({ kind: 'meditation-step', stepIndex: state.secretProgress.step })) : null
  const leap = wants('quantum') ? quoteCanonicalQuantumResetV2(dreamPublication, Object.freeze({ kind: 'quantum-action' })) : null
  const storedCapacity = upgradeStoredTimeCapacity({ bankSeconds: state.timeline.storedTimeAvailableSeconds, capacitySeconds: state.timeline.storedTimeCapacitySeconds, cheater: storedTimeCheater })
  const storedCapacityEligible = !storedTimeCheater && storedCapacity.upgraded
  const time = wants('offline-time') ? Object.freeze({
    doubleTimeRate: Object.freeze({ minimum: 0, maximum: 10, current: state.timeline.doubleTime.rate }),
    storedCapacity: Object.freeze({ eligible: storedCapacityEligible, code: storedTimeCheater ? 'integrity-compromised' : storedCapacityEligible ? 'upgradable' : storedCapacity.maximumReached ? 'maximum-reached' : 'stored-time-bank-not-full', currentCapacitySeconds: state.timeline.storedTimeCapacitySeconds, nextCapacitySeconds: storedCapacity.capacitySeconds, consumesStoredSeconds: storedCapacityEligible ? state.timeline.storedTimeAvailableSeconds : 0 }),
    storedSpend: Object.freeze({ maximumSeconds: storedTimeCheater ? 0 : Math.max(0,state.timeline.storedTimeAvailableSeconds), commitFirstRequired: true as const }),
  }) : fallback.time
  return Object.freeze({
    ...fallback,
    dyson: Object.freeze({ basicFacilities, megaStructures }),
    research: Object.freeze({
      ...fallback.research,
      purchases: researchCards,
      cards: researchCards,
      complete: RESEARCH_V2_IDS.length === researchCards.length,
      issue: null,
    }),
    skills: wants('skills') ? previewCanonicalSkillCatalogV2(state) : fallback.skills,
    infinity: Object.freeze({ ...fallback.infinity, shop: infinityShop, breakTarget }),
    dream: Object.freeze({
      foundational,
      spaceAge,
      upgrades: dreamUpgrades,
      education,
      automaticReset: automaticResetQuote === null
        ? fallback.dream.automaticReset
        : reset(automaticResetQuote),
      blackHoleReset: blackHoleResetQuote === null
        ? fallback.dream.blackHoleReset
        : reset(blackHoleResetQuote),
    }),
    reality: Object.freeze({
      ...fallback.reality,
      upgrades: realityUpgrades,
      gatherInfluence: realityGather,
    }),
    quantum: Object.freeze({
      ...fallback.quantum,
      upgrades: quantumUpgrades,
      sections: quantumSections,
      leap: leap === null ? fallback.quantum.leap : Object.freeze({
          eligible: leap.accepted,
          code: leap.code,
          branch: leap.operation === 'ordinary-leap' ? 'reset' : leap.operation,
          artifactSkillPoints: leap.resetSkillPoints,
          requestedShards: leap.requestedShards,
          infinityPointsConsumed: leap.infinityPointsConsumed,
          infinityPointsRemainder: leap.infinityPointsRemainder,
          definitionGap: null,
        }),
    }),
    avocado: Object.freeze({
      feeds: avocadoFeeds,
      meditation: meditationQuote === null
        ? fallback.avocado.meditation
        : Object.freeze({
            eligible: meditationQuote.accepted,
            requiredStepIndex: state.secretProgress.completed ? null : state.secretProgress.step,
            code: meditationQuote.code,
            skillPointReward: meditationQuote.skillPointsGranted,
          }),
    }),
    time,
  })
}
