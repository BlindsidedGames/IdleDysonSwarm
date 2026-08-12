import type { DeepReadonly } from '../core/contracts'
import {
  FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
  selectFrontendApplicationSnapshot,
  type FrontendApplicationSnapshot,
  type FrontendGameplayPreviews,
  type FrontendGameplayPreviewDemand,
} from '../application/frontendSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
import type { CanonicalGameStateV2, CanonicalResearchId } from '../game-state/typesV2'
import {
  CANONICAL_DYSON_PRESENTATION_TUNING,
} from '../simulation/canonicalDysonDerivation'
import { createCanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import type { CanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import {
  DISCRETE_MAXIMUM,
} from '../simulation/numeric'
import {
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  gameDecimalToNumberChecked,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import type {
  CanonicalRuntimePublicationV2,
} from '../application/canonicalRuntimeSessionV2'
import { quoteV2DysonFacilityPurchase } from '../simulation/dysonV2Commands'
import { BASIC_DYSON_FACILITY_IDS } from '../simulation/dysonFacilities'
import { MEGA_STRUCTURE_IDS } from '../simulation/megaStructurePurchases'
import { RESEARCH_V2_IDS, quoteV2ResearchPurchase } from '../simulation/researchV2'
import { INFINITY_SHOP_ITEM_IDS_V2, quoteInfinityShopPurchaseV2 } from '../simulation/infinityShopV2'
import { QUANTUM_V2_UPGRADE_IDS } from '../simulation/quantumCatalogV2'
import { previewQuantumSectionsV2, quoteQuantumUpgradeV2 } from '../simulation/quantumV2'
import { quoteDreamCommandV2, type DreamCommandV2 } from '../application/dreamStrangeMatterAuthorityV2'
import { DREAM_V2_UPGRADE_IDS } from '../simulation/dreamCatalogV2'
import { DREAM_V2_EDUCATION_IDS } from '../simulation/dreamV2'
import { REALITY_UPGRADE_IDS_V2 } from '../simulation/realityCatalogV2'
import { gatherRealityInfluenceV2 } from '../simulation/realityV2'
import { quoteCanonicalDreamResetV2 } from '../simulation/canonicalDreamResetV2'
import { quoteCanonicalQuantumResetV2 } from '../simulation/canonicalQuantumResetV2'
import {
  quoteAvocadoCommandV2,
  registerAvocadoStrangeMatterAccountV2ForOwner,
} from '../simulation/avocadoV2'

import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'

const legacyHydration = hydrateGameState(
  createDeterministicUnityFirstRunPreparedSave(),
)
const DEFAULT_TINKER_PRESENTATION = createCanonicalTinkerRuntimeState()
const projectionCache = new WeakMap<
  object,
  Map<string, WeakMap<object, DeepReadonly<FrontendApplicationSnapshot>>>
>()

export function selectFrontendApplicationSnapshotV2(
  publication: Readonly<CanonicalRuntimePublicationV2>,
  revision: Readonly<{ session: number; state: number; durable: number }>,
  checkpoint: 'clean' | 'dirty',
  previewDemand: FrontendGameplayPreviewDemand = 'all',
  tinker: Readonly<CanonicalTinkerRuntimeState> = DEFAULT_TINKER_PRESENTATION,
): DeepReadonly<FrontendApplicationSnapshot> {
  const cacheKey = [
    revision.session,
    revision.state,
    revision.durable,
    checkpoint,
    previewDemand,
  ].join(':')
  const publicationCache = projectionCache.get(publication as object)
  const cached = publicationCache?.get(cacheKey)?.get(tinker as object)
  if (cached !== undefined) return cached
  const projection = projectLegacyPresentationStateWithSafety(publication.state)
  const legacyState = projection.state
  const evaluationSnapshot = Object.freeze(Object.fromEntries(
    Object.entries(publication.runtime.dysonEvaluationSnapshot).map(
      ([key, value]) => {
        const projected = tryDecimalToPresentationNumber(value)
        return [key, projected ?? 0]
      },
    ),
  )) as typeof legacyHydration.skillEffectEvaluationSnapshot
  const selected = selectFrontendApplicationSnapshot({
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision,
    checkpoint: checkpoint === 'clean'
      ? { kind: 'clean', durableRevision: revision.durable }
      : { kind: 'dirty', durableRevision: revision.durable, reason: 'state-changed' },
    operation: 'none',
    state: {
      gameState: legacyState,
      compatibilityTuning: legacyHydration.compatibilityTuning,
      evaluationSnapshot,
      entitlements: { permanentDoubleIp: false },
      tinker,
      storedTimeCheater: false,
      selectedSkillPresetSlot: publication.state.skills.selectedPreset,
    },
  }, {
    runtimeRequirements: {
      'compatibility-tuning': true,
      'quantum-leap-port': true,
      'runtime-evaluation-port': true,
      'selected-skill-preset-carrier': true,
      'stored-time-commit-first-runner': true,
      'stored-time-cheater-carrier': true,
    },
    dysonPresentationTuning: CANONICAL_DYSON_PRESENTATION_TUNING,
    realityWorkerTuning: {
      workerBatchSize: 100n,
      baseWorkerGenerationSpeed: 1,
    },
    quantumLeap: {
      eligible: compareGameDecimals(
        addGameDecimals(
          publication.state.infinity.availablePoints,
          publication.state.infinity.allocatedPoints,
        ),
        gameDecimalFromNumber(42),
      ) >= 0,
      code: 'V2_AUTHORITATIVE_PREVIEW',
      branch: publication.state.quantum.unlocks.quantumEntanglement
        ? 'entanglement'
        : 'reset',
      artifactSkillPoints: publication.state.skills.points,
      definitionGap: null,
    },
    previewDemand,
  }, 'detached-frozen')
  if (selected.phase !== 'ready') return selected
  const state = publication.state
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
    ...selected.gameplay.resources,
    dyson: Object.freeze({
      money: state.dyson.money,
      science: state.dyson.science,
      bots: state.dyson.bots,
      workers: state.dyson.workers,
      researchers: state.dyson.researchers,
    }),
    infinity: Object.freeze({
      ...selected.gameplay.resources.infinity,
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
  const snapshot = Object.freeze({
    ...selected,
    version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
    gameplay: Object.freeze({
      ...selected.gameplay,
      resources,
      previews: selectV2Previews(
        publication,
        selected.gameplay.previews,
        previewDemand,
      ),
    }),
  })
  let byKey = projectionCache.get(publication as object)
  if (byKey === undefined) {
    byKey = new Map()
    projectionCache.set(publication as object, byKey)
  }
  let byTinker = byKey.get(cacheKey)
  if (byTinker === undefined) {
    byTinker = new WeakMap()
    byKey.set(cacheKey, byTinker)
  }
  byTinker.set(tinker as object, snapshot)
  return snapshot
}

export function projectLegacyPresentationState(
  state: Readonly<CanonicalGameStateV2>,
): CanonicalGameStateV1 {
  return projectLegacyPresentationStateWithSafety(state).state
}

function projectLegacyPresentationStateWithSafety(
  state: Readonly<CanonicalGameStateV2>,
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
    statistics: {
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
    },
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
): DeepReadonly<FrontendGameplayPreviews> {
  const { state, revision } = publication
  const fallback = legacy
  const wants = (family: FrontendGameplayPreviewDemand) =>
    previewDemand === 'all' || previewDemand === family
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
  const researchCards = !wants('research') ? fallback.research.cards : fallback.research.cards.map((card) => {
    const preview = researchQuotes.get(card.researchId as CanonicalResearchId)
    if (preview === undefined) return card
    return Object.freeze({
      ...card,
      eligible: preview.eligible,
      code: preview.status,
      currentLevel: state.research.levelsById[preview.researchId],
      selectedQuantity: preview.batches,
      affordableQuantity: preview.batches,
      cost: preview.quotedCost,
      issue: preview.status === 'catalog-gap' ? preview.researchId : null,
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
  const quantumSections = fallback.quantum.sections.map((section) => {
    const direct = quantumSectionById.get(section.sectionId)
    return direct === undefined
      ? section
      : Object.freeze({ ...section, upgradeIds: direct.upgradeIds, revealed: direct.revealed })
  })
  const dreamPublication = Object.freeze({
    revision,
    state: state as CanonicalGameStateV2,
    runtime: publication.runtime,
  })
  const dreamQuote = (request: DreamCommandV2) =>
    quoteDreamCommandV2(dreamPublication, request)
  const foundational = !wants('simulations') ? fallback.dream.foundational : fallback.dream.foundational.map((preview) => {
    const request: DreamCommandV2 = preview.purchase === 'hunters' || preview.purchase === 'gatherers'
      ? Object.freeze({ kind: 'influence-purchase', purchaseId: preview.purchase, mode: state.dyson.automation.buyMode })
      : Object.freeze({ kind: 'boost', boostId: preview.purchase === 'community-boost' ? 'community' : 'factories' })
    const quote = dreamQuote(request)
    return Object.freeze({ ...preview, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code })
  })
  const spaceAge = !wants('simulations') ? fallback.dream.spaceAge : fallback.dream.spaceAge.map((preview) => {
    const quote = dreamQuote(Object.freeze({ kind: 'influence-purchase', purchaseId: preview.purchase, mode: state.dyson.automation.buyMode }))
    return Object.freeze({ ...preview, eligible: quote.accepted, cost: quote.quotedCost, code: quote.code })
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
    infinity: Object.freeze({ ...fallback.infinity, shop: infinityShop }),
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
  }) as unknown as DeepReadonly<FrontendGameplayPreviews>
}
