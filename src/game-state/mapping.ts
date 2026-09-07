import { EMPTY_INFINITY_CHALLENGES } from '../simulation/infinityChallenges'
import { clampUnitInterval as clampUnit } from '../core/clampUnitInterval'
import {
  isFiniteNonNegativeNumber,
  isNonNegativeInteger,
  isSafeNonNegativeInteger,
} from '../core/finiteNonNegativeNumber'
import { isRecord, requireRecord, type SaveRecord } from '../save/graph'
import { PreparedSave } from '../save/prepare'
import {
  skillIdsToBitset,
  skillIdsToLegacyKeys,
  skillLegacyKeyToId,
} from '../save/legacyIds'
import { packSettingsFlags } from '../save/settingsFlags'
import { BUY_MODES, type BuyMode } from '../simulation/transactions'
import { CONTINUOUS_MAXIMUM, SIMULATION_RESOURCE_MAXIMUM } from '../simulation/numeric'
import {
  CANONICAL_GAME_MODEL_VERSION,
  DREAM_EDUCATION_IDS,
  DREAM_UPGRADE_FLAGS,
  isProcessingSource,
  isStoredTimeAccuracyPreset,
  type CanonicalFacilityId,
  type CanonicalGameStateV1,
  type CanonicalOwnedPair,
  type DreamEducationId,
  type DreamEducationState,
  type InfinityCycleHistoryEntry,
  type SimulationTotalsState,
  type StatisticsWindowState,
  type SkillRuntimeState,
} from './types'
import { validateCanonicalGameState } from './validate'
import {
  normalizeBottomNavigationVisibility,
  normalizeNavigationRouteDiscovery,
} from './navigationPreferences'
import {
  extractDysonCompatibilityTuning,
  type DysonCompatibilityTuning,
} from './compatibilityTuning'
import {
  extractDysonSkillEffectEvaluationSnapshot,
  type DysonSkillEffectEvaluationSnapshot,
} from './skillEffectEvaluationSnapshot'
import {
  defaultSkillPresetColorId,
  isSkillPresetColorId,
} from './skillPresetColors'

function recordOrEmpty(value: unknown): SaveRecord {
  return isRecord(value) ? value : {}
}

const DREAM_TIMER_FIELDS = [
  'hunterTimerProgress',
  'gathererTimerProgress',
  'communityTimerProgress',
  'housingTimerProgress',
  'villagesTimerProgress',
  'workersTimerProgress',
  'citiesTimerProgress',
  'factoriesTimerProgress',
  'botsTimerProgress',
  'spaceFactoriesTimerProgress',
] as const

const STAT_BIGINT_FIELDS = [
  'ordinaryInfinityCount',
  'breakInfinityCount',
  'ordinaryInfinityPoints',
  'breakInfinityPoints',
  'botCapInfinityPoints',
  'botCapOverflowRewards',
  'meteorDreamResets',
  'aiDreamResets',
  'globalWarmingDreamResets',
  'blackHoleDreamResets',
  'realityWorkers',
] as const

const STAT_CONTINUOUS_RESOURCE_FIELDS = [
  'strangeMatter',
  'automaticInfluence',
  'manualInfluence',
] as const

const FACILITY_PATHS: Readonly<
  Record<CanonicalFacilityId, string>
> = {
  assembly_lines: 'assemblyLines',
  ai_managers: 'managers',
  servers: 'servers',
  data_centers: 'dataCenters',
  planets: 'planets',
  matrioshka_brains: 'matrioshkaBrains',
  birch_planets: 'birchPlanets',
  galactic_brains: 'galacticBrains',
}

const FACILITY_AUTOMATION_PATHS: Readonly<
  Record<CanonicalFacilityId, string>
> = {
  assembly_lines: 'infinityAutoAssembly',
  ai_managers: 'infinityAutoManagers',
  servers: 'infinityAutoServers',
  data_centers: 'infinityAutoDataCenters',
  planets: 'infinityAutoPlanets',
  matrioshka_brains: 'infinityAutoMatrioshkaBrains',
  birch_planets: 'infinityAutoBirchPlanets',
  galactic_brains: 'infinityAutoGalacticBrains',
}

const RESEARCH_AUTOMATION_PATHS = {
  'research.ai_manager_upgrade': 'infinityAutoResearchToggleAi',
  'research.assembly_line_upgrade': 'infinityAutoResearchToggleAssembly',
  'research.money_multiplier': 'infinityAutoResearchToggleMoney',
  'research.planet_upgrade': 'infinityAutoResearchTogglePlanet',
  'research.server_upgrade': 'infinityAutoResearchToggleServer',
  'research.data_center_upgrade': 'infinityAutoResearchToggleDataCenter',
  'research.science_boost': 'infinityAutoResearchToggleScience',
  'research.matrioshka_brains_upgrade':
    'infinityAutoResearchToggleMatrioshkaBrains',
  'research.birch_planets_upgrade':
    'infinityAutoResearchToggleBirchPlanets',
  'research.galactic_brains_upgrade':
    'infinityAutoResearchToggleGalacticBrains',
} as const

export class HydratedGameStateV1 {
  readonly state: CanonicalGameStateV1
  readonly compatibilityTuning: Readonly<DysonCompatibilityTuning>
  readonly skillEffectEvaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
  private readonly preparedSource: PreparedSave

  constructor(state: CanonicalGameStateV1, preparedSource: PreparedSave) {
    this.state = state
    this.preparedSource = preparedSource
    this.compatibilityTuning =
      extractDysonCompatibilityTuning(preparedSource)
    this.skillEffectEvaluationSnapshot =
      extractDysonSkillEffectEvaluationSnapshot(preparedSource)
  }

  get initialState(): CanonicalGameStateV1 {
    return this.state
  }

  copyPreservedSource(): SaveRecord {
    return this.preparedSource.copyValidatedState()
  }

  prepareReplacement(candidate: unknown): PreparedSave {
    return this.preparedSource.withValidatedState(candidate)
  }

  /**
   * Maps an arbitrary canonical candidate onto this session's preserved,
   * prepared Unity source graph without mutating either input.
   */
  prepare(candidate: CanonicalGameStateV1): PreparedSave {
    return dehydrateGameState(this, candidate)
  }
}

export { HydratedGameStateV1 as GameStateSessionV1 }

export function hydrateGameState(
  prepared: PreparedSave,
): HydratedGameStateV1 {
  const source = prepared.copyValidatedState()
  const dysonRoot = requireRecord(source.dysonVerseSaveData, 'Dyson save')
  const infinityData = requireRecord(
    dysonRoot.dysonVerseInfinityData,
    'Dyson infinity data',
  )
  const prestige = requireRecord(
    dysonRoot.dysonVersePrestigeData,
    'Dyson prestige data',
  )
  const skillTree = requireRecord(
    dysonRoot.dysonVerseSkillTreeData,
    'Dyson skill tree data',
  )
  const reality = requireRecord(source.saveData, 'Reality data')
  const quantum = requireRecord(source.prestigePlus, 'Quantum data')
  const avocado = requireRecord(source.avocadoData, 'Avocado data')
  const dreamRun = requireRecord(source.sdSimulation, 'Dream run data')
  const dreamProgression = requireRecord(
    source.sdPrestige,
    'Dream progression data',
  )
  const statistics = requireRecord(
    source.simulationStatistics,
    'Simulation statistics',
  )

  const facilities = Object.fromEntries(
    Object.entries(FACILITY_PATHS).map(([id, sourceKey]) => [
      id,
      toOwnedPair(infinityData[sourceKey]),
    ]),
  ) as Record<CanonicalFacilityId, CanonicalOwnedPair>
  const enabledFacilities = Object.fromEntries(
    Object.entries(FACILITY_AUTOMATION_PATHS).map(([id, sourceKey]) => [
      id,
      toBoolean(source[sourceKey]),
    ]),
  ) as Record<CanonicalFacilityId, boolean>
  const infinityAutomaticReset = toBoolean(
    source.infinityAutomaticReset,
    true,
  )
  const infinityCycleSeconds = toFiniteNonNegativeNumber(
    source.simulationInfinityCycleSeconds,
  )
  const hasManualInfinityCalibration =
    source.simulationInfinityManualPeakIpPerMinute !== undefined ||
    source.simulationInfinityManualPeakReward !== undefined

  const state: CanonicalGameStateV1 = {
    modelVersion: CANONICAL_GAME_MODEL_VERSION,
    challenges: {
      ...EMPTY_INFINITY_CHALLENGES,
      ...recordOrEmpty(source.infinityChallengeData),
    } as CanonicalGameStateV1['challenges'],
    meta: {
      createdAtLegacyText:
        nonBlankStringOrNull(source.dateStarted),
      tutorialComplete: toBoolean(source.tutorial),
      firstInfinityComplete: toBoolean(source.firstInfinityDone),
      navigationVisibility: isRecord(source.bottomNavigationPreferences)
        ? normalizeBottomNavigationVisibility(
          source.bottomNavigationPreferences.visibility,
          {
            story: toBoolean(source.storyButtonToggle),
            wiki: toBoolean(source.wikiButtonToggle),
            statistics: toBoolean(source.statisticsButtonToggle),
          },
        ) as CanonicalGameStateV1['meta']['navigationVisibility']
        : {
          story: toBoolean(source.storyButtonToggle),
          wiki: toBoolean(source.wikiButtonToggle),
          statistics: toBoolean(source.statisticsButtonToggle),
        },
      navigationRouteDiscovery: isRecord(source.bottomNavigationPreferences)
        ? normalizeNavigationRouteDiscovery(
            source.bottomNavigationPreferences.routeDiscovery,
          )
        : undefined,
    },
    dyson: {
      money: toFiniteNonNegativeNumber(infinityData.money),
      science: toFiniteNonNegativeNumber(infinityData.science),
      bots: toFiniteNonNegativeNumber(infinityData.bots),
      workers: toFiniteNonNegativeNumber(infinityData.workers),
      researchers: toFiniteNonNegativeNumber(infinityData.researchers),
      facilities,
      manualCreationIntervalSeconds: toFiniteNonNegativeNumber(
        dysonRoot.manualCreationTime,
      ),
      totalPanelsDecayed: toFiniteNonNegativeNumber(
        infinityData.totalPanelsDecayed,
      ),
      goalStage: toNonNegativeBigInt(infinityData.goalSetter),
      botDistribution: clampUnit(toFiniteNonNegativeNumber(
        prestige.botDistribution,
        0.5,
      )),
      automation: {
        buyMode: toBuyMode(source.buyMode),
        roundedBulkBuy: toBoolean(source.roundedBulkBuy),
        enabledFacilities,
      },
    },
    infinity: {
      points: toNonNegativeBigInt(prestige.infinityPoints),
      spentPoints: toNonNegativeBigInt(prestige.spentInfinityPoints),
      automaticResetEnabled: infinityAutomaticReset,
      breakTarget: maximumBigInt(
        1n,
        toNonNegativeBigInt(source.infinityPointsToBreakFor),
      ),
      currentCyclePeakIpPerMinute: toFiniteNonNegativeNumber(
        source.simulationInfinityPeakIpPerMinute,
      ),
      currentCyclePeakReward: toNonNegativeBigInt(
        source.simulationInfinityPeakReward,
      ),
      manualPeakIpPerMinute: toFiniteNonNegativeNumber(
        source.simulationInfinityManualPeakIpPerMinute,
        !hasManualInfinityCalibration && !infinityAutomaticReset
          ? toFiniteNonNegativeNumber(source.simulationInfinityPeakIpPerMinute)
          : 0,
      ),
      manualPeakReward: toNonNegativeBigInt(
        source.simulationInfinityManualPeakReward ??
          (!infinityAutomaticReset
            ? source.simulationInfinityPeakReward
            : undefined),
      ),
      manualCalibrationObservedActiveSeconds: toFiniteNonNegativeNumber(
        source.simulationInfinityManualObservedActiveSeconds,
      ),
      activeAutomaticThroughputCycleEligible: toBoolean(
        source.simulationInfinityActiveAutomaticThroughputCycleEligible,
      ),
      inProgress: toBoolean(source.infinityInProgress),
      botCapTransitionPending: toBoolean(source.botCapTransitionPending),
      botCapRewardsGranted: toBoolean(source.botCapRewardsGranted),
      lastCycleDurationSeconds: toFiniteNonNegativeNumber(
        source.timeLastInfinity,
      ),
      lastPointsGained: toFiniteNonNegativeNumber(
        source.lastInfinityPointsGained,
      ),
      storedTimeUsedThisCycleSeconds: toFiniteNonNegativeNumber(
        source.offlineTimeUsedThisInfinity,
      ),
      storedTimeUsedPreviousCycleSeconds: toFiniteNonNegativeNumber(
        source.offlineTimeUsedPreviousInfinity,
      ),
      secretsOfTheUniverse: toNonNegativeBigInt(
        prestige.secretsOfTheUniverse,
      ),
      permanentSkillPoints: toNonNegativeBigInt(
        prestige.permanentSkillPoint,
      ),
      retainedFacilities: {
        assembly_lines: toBoolean(prestige.infinityAssemblyLines),
        ai_managers: toBoolean(prestige.infinityAiManagers),
        servers: toBoolean(prestige.infinityServers),
        data_centers: toBoolean(prestige.infinityDataCenter),
        planets: toBoolean(prestige.infinityPlanets),
      },
      automationUnlocked: {
        research: toBoolean(prestige.infinityAutoResearch),
        bots: toBoolean(prestige.infinityAutoBots),
      },
    },
    skills: {
      points: toNonNegativeBigInt(skillTree.skillPointsTree),
      fragments: toNonNegativeBigInt(skillTree.fragments),
      byId: toSkillStates(infinityData.skillStateById),
      activeAutoAssignment: toStableIds(
        dysonRoot.skillAutoAssignmentIds,
      ),
      presets: createSkillPresets(dysonRoot),
      autoAssignNonRefundable: toBoolean(
        source.autoAssignNonRefundableSkills,
        true,
      ),
      tabPresetAutomation: {
        bots: toSkillPresetAutomationSlot(
          source.botsTabPresetOverride,
        ),
        research: toSkillPresetAutomationSlot(
          source.researchTabPresetOverride,
        ),
      },
    },
    research: {
      levelsById: toNumberRecord(
        infinityData.researchLevelsById,
        true,
      ),
      progressById: toNumberRecord(
        infinityData.researchProgressById,
        false,
      ),
      automation: {
        buyMode: toBuyMode(source.researchBuyMode),
        roundedBulkBuy: toBoolean(source.researchRoundedBulkBuy),
        enabledById: Object.fromEntries(
          Object.entries(RESEARCH_AUTOMATION_PATHS).map(
            ([id, sourceKey]) => [id, toBoolean(source[sourceKey])],
          ),
        ),
      },
    },
    reality: {
      universeDesignationCount: toNonNegativeBigInt(
        reality.universesConsumed,
      ),
      workersReady: toNonNegativeBigInt(reality.workersReadyToGo),
      workerGenerationProgress: toFractionalProgress(
        reality.workerGenerationProgress,
      ),
      influence: toContinuousResourceNumber(reality.influence),
      autoGather: toBoolean(reality.workerAutoConvert),
    },
    quantum: {
      pointsEarned: toNonNegativeBigInt(quantum.points),
      pointsSpent: toNonNegativeBigInt(quantum.spentPoints),
      divisionsPurchased: toNonNegativeBigInt(
        quantum.divisionsPurchased,
      ),
      permanentSecrets: toNonNegativeBigInt(quantum.secrets),
      influenceSpeedBonus: toNonNegativeBigInt(quantum.influence),
      cashBonusLevels: toNonNegativeBigInt(quantum.cash),
      scienceBonusLevels: toNonNegativeBigInt(quantum.science),
      unlocks: {
        botMultitasking: toBoolean(quantum.botMultitasking),
        doubleInfinityPoints: toBoolean(quantum.doubleIP),
        breakTheLoop: toBoolean(quantum.breakTheLoop),
        quantumEntanglement: toBoolean(quantum.quantumEntanglement),
        automation: toBoolean(quantum.automation),
        fragments: toBoolean(quantum.fragments),
        purity: toBoolean(quantum.purity),
        terra: toBoolean(quantum.terra),
        power: toBoolean(quantum.power),
        paragade: toBoolean(quantum.paragade),
        stellar: toBoolean(quantum.stellar),
        matrioshkaBrains: toBoolean(
          prestige.unlockedMatrioshkaBrains,
        ),
        birchPlanets: toBoolean(prestige.unlockedBirchPlanets),
        galacticBrains: toBoolean(prestige.unlockedGalacticBrains),
      },
    },
    avocado: {
      overflowPoints: toNonNegativeBigInt(avocado.overflowPoints),
      unlocked: toBoolean(avocado.unlocked),
      infinityPoints: toFiniteNonNegativeNumber(
        avocado.infinityPoints,
      ),
      influence: toFiniteNonNegativeNumber(avocado.influence),
      strangeMatter: toFiniteNonNegativeNumber(avocado.strangeMatter),
      overflowMultiplier: toFiniteNonNegativeNumber(
        avocado.overflowMultiplier,
      ),
    },
    timeline: (() => {
      const processingRewriteMigrated = toBoolean(
        source.processingRewriteMigrated,
      )
      const storedTimeCapacitySeconds = toFiniteNonNegativeNumber(
        source.maxOfflineTime,
        86_400,
      )
      const legacyDoubleTimeBankSeconds = toFiniteNonNegativeNumber(
        dreamProgression.doubleTime,
      )
      return {
      eventClockInitialized: toBoolean(source.eventTimeClockInitialized),
      automationTimeUntilNextEvent: toFiniteNonNegativeNumber(
        source.simulationAutomationTimeUntilNextEvent,
        0.1,
      ),
      dysonAutomationTargetIndex: toNonNegativeInteger(
        source.dysonAutomationTargetIndex,
      ),
      researchAutomationTargetIndex: toNonNegativeInteger(
        source.researchAutomationTargetIndex,
      ),
      infinityBoundaryRemaining: toFiniteNonNegativeNumber(
        source.simulationInfinityBoundaryRemaining,
        1 / 60,
      ),
      infinityCycleSeconds,
      infinityCycleStartingPoints: toNonNegativeBigInt(
        source.simulationInfinityCycleStartingPoints,
      ),
      infinityHasPostResetStart: toBoolean(
        source.simulationInfinityHasPostResetStart,
      ),
      storedTimeAvailableSeconds: Math.min(
        storedTimeCapacitySeconds,
        toFiniteNonNegativeNumber(source.offlineTime) +
          (processingRewriteMigrated ? 0 : legacyDoubleTimeBankSeconds),
      ),
      storedTimeCapacitySeconds,
      lastSuspendedAtLegacyText: nonBlankStringOrNull(
        source.dateQuitString,
      ),
      processing: {
        rewriteMigrated: true,
        activeIntervalMilliseconds: Math.max(
          33,
          Math.min(
            200,
            toNonNegativeInteger(
              source.processingActiveIntervalMilliseconds,
              33,
            ),
          ),
        ),
        storedTimePreset: isStoredTimeAccuracyPreset(
          source.processingStoredTimePreset,
        )
          ? source.processingStoredTimePreset
          : 'balanced',
      },
      doubleTime: {
        unlocked: toBoolean(dreamProgression.doubleTimeOwned),
        enabled: false,
        bankSeconds: 0,
        rate: 0,
      },
      }
    })(),
    secretProgress: {
      completed: toBoolean(source.avotation),
      step: Math.min(
        7,
        toNonNegativeInteger(source.avotationProgressStep),
      ),
    },
    dream: {
      resources: {
        hunters: toNonNegativeBigInt(dreamRun.hunters),
        gatherers: toNonNegativeBigInt(dreamRun.gatherers),
        community: toFiniteNonNegativeNumber(dreamRun.community),
        housing: toFiniteNonNegativeNumber(dreamRun.housing),
        villages: toFiniteNonNegativeNumber(dreamRun.villages),
        workers: toFiniteNonNegativeNumber(dreamRun.workers),
        cities: toFiniteNonNegativeNumber(dreamRun.cities),
        factories: toFiniteNonNegativeNumber(dreamRun.factories),
        bots: toFiniteNonNegativeNumber(dreamRun.bots),
        rockets: toFiniteNonNegativeNumber(dreamRun.rockets),
        energy: toFiniteNonNegativeNumber(dreamRun.energy),
        spaceFactories: toFiniteNonNegativeNumber(
          dreamRun.spaceFactories,
        ),
        dysonPanels: toSimulationResourceBigInt(dreamRun.dysonPanels),
        railgunCharge: toFiniteNonNegativeNumber(
          dreamRun.railgunCharge,
        ),
        solarPanels: toFiniteNonNegativeNumber(dreamRun.solarPanels),
        fusion: toFiniteNonNegativeNumber(dreamRun.fusion),
        swarmPanels: toSimulationResourceBigInt(dreamRun.swarmPanels),
      },
      parameters: {
        hunterCost: toNonNegativeBigInt(dreamRun.hunterCost),
        gathererCost: toNonNegativeBigInt(dreamRun.gathererCost),
        communityBoostCost: toFiniteNonNegativeNumber(
          dreamRun.communityBoostCost,
        ),
        communityBoostIsFree: toBoolean(
          dreamRun.communityBoostIsFree,
          true,
        ),
        communityBoostClock: toFiniteNonNegativeNumber(
          dreamRun.communityBoostTime,
        ),
        communityBoostDuration: toFiniteNonNegativeNumber(
          dreamRun.communityBoostDuration,
        ),
        factoriesBoostCost: toFiniteNonNegativeNumber(
          dreamRun.factoriesBoostCost,
        ),
        factoriesBoostClock: toFiniteNonNegativeNumber(
          dreamRun.factoriesBoostTime,
        ),
        factoriesBoostDuration: toFiniteNonNegativeNumber(
          dreamRun.factoriesBoostDuration,
        ),
        rocketsPerSpaceFactory: toNonNegativeBigInt(
          dreamRun.rocketsPerSpaceFactory,
        ),
        railgunMaxCharge: toFiniteNonNegativeNumber(
          dreamRun.railgunMaxCharge,
        ),
        solarCost: toNonNegativeBigInt(dreamRun.solarCost),
        solarPanelGeneration: toNonNegativeBigInt(
          dreamRun.solarPanelGeneration,
        ),
        fusionCost: toNonNegativeBigInt(dreamRun.fusionCost),
        fusionGeneration: toNonNegativeBigInt(
          dreamRun.fusionGeneration,
        ),
        swarmPanelGeneration: toNonNegativeBigInt(
          dreamRun.swarmPanelGeneration,
        ),
      },
      education: createDreamEducation(dreamRun),
      timers: Object.fromEntries(
        DREAM_TIMER_FIELDS.map((field) => [
          field,
          toFiniteNonNegativeNumber(dreamRun[field]),
        ]),
      ),
      railgun: {
        firing: toBoolean(dreamRun.railgunFiring),
        fireProgress: toFiniteNonNegativeNumber(
          dreamRun.railgunFireProgress,
        ),
        shotsRemaining: toNonNegativeInteger(
          dreamRun.railgunShotsRemaining,
        ),
        activeRailguns: toNonNegativeInteger(
          dreamRun.railgunActiveRailguns,
        ),
        reservedPanels: toSimulationResourceBigInt(
          dreamRun.railgunReservedPanels,
        ),
        highestStoredPanels: (() => {
          const stored = toSimulationResourceBigInt(dreamRun.dysonPanels)
          const persisted = toSimulationResourceBigInt(
            dreamRun.highestStoredDysonPanels,
          )
          return persisted > stored ? persisted : stored
        })(),
        lastRoundsFired: 0,
        lastPanelsLaunched: 0n,
      },
      resetCount: toNonNegativeBigInt(dreamProgression.simulationCount),
      strangeMatter: toContinuousResourceNumber(
        dreamProgression.strangeMatter,
      ),
      disasterStage: toNonNegativeBigInt(
        dreamProgression.disasterStage,
        1n,
      ),
      upgrades: Object.fromEntries(
        DREAM_UPGRADE_FLAGS.map((field) => [
          field,
          toBoolean(dreamProgression[field]),
        ]),
      ) as Record<(typeof DREAM_UPGRADE_FLAGS)[number], boolean>,
      huntersPerPurchase: toNonNegativeBigInt(
        reality.huntersPerPurchase,
        1n,
      ),
      gatherersPerPurchase: toNonNegativeBigInt(
        reality.gatherersPerPurchase,
        1n,
      ),
      purchaseBatches: {
        hunters: toNonNegativeBigInt(reality.hunterPurchaseBatches),
        gatherers: toNonNegativeBigInt(reality.gathererPurchaseBatches),
        solar: toNonNegativeBigInt(dreamRun.solarPurchaseBatches),
        fusion: toNonNegativeBigInt(dreamRun.fusionPurchaseBatches),
      },
    },
    statistics: {
      trackedSinceUpdate: toBoolean(statistics.trackedSinceUpdate),
      trackingStartedMarker:
        typeof statistics.trackingStartedUtc === 'string'
          ? statistics.trackingStartedUtc
          : '',
      trackedSimulatedSeconds: toFiniteNonNegativeNumber(
        statistics.trackedSimulatedSeconds,
      ),
      lifetime: toSimulationTotals(statistics.lifetime),
      currentQuantumRun: toSimulationTotals(
        statistics.currentQuantumRun,
      ),
      recentProcessedSegment: toSimulationTotals(
        statistics.recentProcessedSegment,
      ),
      lastCompletedCycle: toLastCompletedCycle(
        statistics.lastCompletedCycle,
      ),
      ...(Array.isArray(statistics.recentInfinityCycles)
        ? {
            recentInfinityCycles: toRecentInfinityCycles(
              statistics.recentInfinityCycles,
            ),
          }
        : {}),
      ...(Array.isArray(statistics.recentActiveAutomaticInfinityCycles)
        ? {
            recentActiveAutomaticInfinityCycles: toRecentInfinityCycles(
              statistics.recentActiveAutomaticInfinityCycles,
            ),
          }
        : {}),
      minuteWindows: toStatisticsWindows(
        statistics.minuteWindows,
        60,
      ),
      halfHourWindows: toStatisticsWindows(
        statistics.halfHourWindows,
        48,
      ),
      dailyWindows: toStatisticsWindows(
        statistics.dailyWindows,
        30,
      ),
    },
  }
  return new HydratedGameStateV1(state, prepared)
}

export function dehydrateGameState(
  hydrated: HydratedGameStateV1,
  candidate: CanonicalGameStateV1 = hydrated.state,
): PreparedSave {
  const source = hydrated.copyPreservedSource()
  const state = candidate
  const canonicalValidation = validateCanonicalGameState(state)
  if (!canonicalValidation.valid) {
    throw new Error(
      `Canonical game state is invalid: ${canonicalValidation.errors.join(' ')}`,
    )
  }
  const dysonRoot = requireRecord(source.dysonVerseSaveData)
  const infinityData = requireRecord(dysonRoot.dysonVerseInfinityData)
  const prestige = requireRecord(dysonRoot.dysonVersePrestigeData)
  const skillTree = requireRecord(dysonRoot.dysonVerseSkillTreeData)
  const reality = requireRecord(source.saveData)
  const quantum = requireRecord(source.prestigePlus)
  const avocado = requireRecord(source.avocadoData)
  const dreamRun = requireRecord(source.sdSimulation)
  const dreamProgression = requireRecord(source.sdPrestige)

  source.dateStarted = state.meta.createdAtLegacyText
  source.tutorial = state.meta.tutorialComplete
  source.firstInfinityDone = state.meta.firstInfinityComplete
  source.storyButtonToggle =
    state.meta.navigationVisibility?.story ?? false
  source.wikiButtonToggle =
    state.meta.navigationVisibility?.wiki ?? false
  source.statisticsButtonToggle =
    state.meta.navigationVisibility?.statistics ?? true
  const visibilityKeys = Object.keys(state.meta.navigationVisibility ?? {})
  const existingBottomNavigationPreferences = recordOrEmpty(
    source.bottomNavigationPreferences,
  )
  const {
    size: _legacyPortableSize,
    ...portableBottomNavigationPreferences
  } = existingBottomNavigationPreferences
  if (
    isRecord(source.bottomNavigationPreferences) ||
    state.meta.navigationRouteDiscovery !== undefined ||
    visibilityKeys.some((key) =>
      key !== 'story' && key !== 'wiki' && key !== 'statistics'
    )
  ) {
    source.bottomNavigationPreferences = {
      ...portableBottomNavigationPreferences,
      version: 1,
      visibility: {
        ...(
          recordOrEmpty(existingBottomNavigationPreferences.visibility)
        ),
        ...state.meta.navigationVisibility,
      },
      ...(state.meta.navigationRouteDiscovery === undefined
        ? {}
        : {
            routeDiscovery: {
              knownRoutes: [
                ...state.meta.navigationRouteDiscovery.knownRoutes,
              ],
              unvisitedRoutes: [
                ...state.meta.navigationRouteDiscovery.unvisitedRoutes,
              ],
            },
          }),
    }
  }
  infinityData.money = state.dyson.money
  infinityData.science = state.dyson.science
  infinityData.bots = state.dyson.bots
  infinityData.workers = state.dyson.workers
  infinityData.researchers = state.dyson.researchers
  for (const [id, sourceKey] of Object.entries(FACILITY_PATHS)) {
    infinityData[sourceKey] = [
      ...state.dyson.facilities[id as CanonicalFacilityId],
    ]
  }
  dysonRoot.manualCreationTime = state.dyson.manualCreationIntervalSeconds
  infinityData.totalPanelsDecayed = state.dyson.totalPanelsDecayed
  infinityData.goalSetter = state.dyson.goalStage
  prestige.botDistribution = state.dyson.botDistribution
  source.buyMode = fromBuyMode(state.dyson.automation.buyMode)
  source.roundedBulkBuy = state.dyson.automation.roundedBulkBuy
  for (const [id, sourceKey] of Object.entries(
    FACILITY_AUTOMATION_PATHS,
  )) {
    source[sourceKey] =
      state.dyson.automation.enabledFacilities[
        id as CanonicalFacilityId
      ]
  }

  prestige.infinityPoints = state.infinity.points
  prestige.spentInfinityPoints = state.infinity.spentPoints
  source.infinityAutomaticReset =
    state.infinity.automaticResetEnabled
  source.infinityPointsToBreakFor = Number(
    minimumBigInt(2_147_483_647n, state.infinity.breakTarget),
  )
  source.simulationInfinityPeakIpPerMinute =
    state.infinity.currentCyclePeakIpPerMinute ?? 0
  source.simulationInfinityPeakReward =
    state.infinity.currentCyclePeakReward ?? 0n
  source.simulationInfinityManualPeakIpPerMinute =
    state.infinity.manualPeakIpPerMinute ?? 0
  source.simulationInfinityManualPeakReward =
    state.infinity.manualPeakReward ?? 0n
  source.simulationInfinityManualObservedActiveSeconds =
    state.infinity.manualCalibrationObservedActiveSeconds ?? 0
  source.simulationInfinityActiveAutomaticThroughputCycleEligible =
    state.infinity.activeAutomaticThroughputCycleEligible ?? false
  source.infinityInProgress = state.infinity.inProgress
  source.botCapTransitionPending =
    state.infinity.botCapTransitionPending
  source.botCapRewardsGranted = state.infinity.botCapRewardsGranted
  source.timeLastInfinity = state.infinity.lastCycleDurationSeconds
  source.lastInfinityPointsGained = state.infinity.lastPointsGained
  source.offlineTimeUsedThisInfinity =
    state.infinity.storedTimeUsedThisCycleSeconds
  source.offlineTimeUsedPreviousInfinity =
    state.infinity.storedTimeUsedPreviousCycleSeconds
  prestige.secretsOfTheUniverse = state.infinity.secretsOfTheUniverse
  prestige.permanentSkillPoint = state.infinity.permanentSkillPoints
  prestige.infinityAssemblyLines =
    state.infinity.retainedFacilities.assembly_lines
  prestige.infinityAiManagers =
    state.infinity.retainedFacilities.ai_managers
  prestige.infinityServers = state.infinity.retainedFacilities.servers
  prestige.infinityDataCenter =
    state.infinity.retainedFacilities.data_centers
  prestige.infinityPlanets = state.infinity.retainedFacilities.planets
  prestige.infinityAutoResearch =
    state.infinity.automationUnlocked.research
  prestige.infinityAutoBots = state.infinity.automationUnlocked.bots
  skillTree.skillPointsTree = state.skills.points
  skillTree.fragments = state.skills.fragments
  const preservedSkillStates = requireRecord(
    infinityData.skillStateById,
    'Preserved skill states',
  )
  for (const id of new Set([...Object.keys(preservedSkillStates), ...Object.keys(state.skills.byId)])) {
    const skill = state.skills.byId[id] ?? { owned: false, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }
    const preserved =
      preservedSkillStates[id] !== null &&
      typeof preservedSkillStates[id] === 'object' &&
      !Array.isArray(preservedSkillStates[id])
        ? (preservedSkillStates[id] as SaveRecord)
        : {}
    preserved.owned = skill.owned
    preserved.level = skill.level
    preserved.timerSeconds = skill.timerSeconds
    preserved.secondaryTimerSeconds = skill.secondaryTimerSeconds
    preservedSkillStates[id] = preserved
  }
  const ownedSkillIds = Object.entries(state.skills.byId)
    .filter(([, skill]) => skill.owned)
    .map(([id]) => id)
  const ownedBits = skillIdsToBitset(ownedSkillIds)
  infinityData.skillOwnedBits = ownedBits
  infinityData.skillOwnedBitsBase64 = encodeBase64(ownedBits)
  infinityData.skillOwnedById = Object.fromEntries(
    Object.keys(state.skills.byId).map((id) => [
      id,
      state.skills.byId[id]?.owned ?? false,
    ]),
  )
  infinityData.SkillTreeSaveData = Object.fromEntries(
    skillIdsToLegacyKeys(ownedSkillIds).map((key) => [String(key), true]),
  )
  for (const id of Object.values(skillLegacyKeyToId)) {
    skillTree[id] = state.skills.byId[id]?.owned ?? false
  }
  dysonRoot.skillAutoAssignmentIds = [...state.skills.activeAutoAssignment]
  const assignmentBits = skillIdsToBitset(
    state.skills.activeAutoAssignment,
  )
  dysonRoot.skillAutoAssignmentBits = assignmentBits
  dysonRoot.skillAutoAssignmentBitsBase64 = encodeBase64(assignmentBits)
  state.skills.presets.forEach((preset, index) => {
    const presetNumber = index + 1
    dysonRoot[`preset${presetNumber}Name`] = preset.name
    const colorKey = `preset${presetNumber}ColorId`
    if (
      preset.colorId === defaultSkillPresetColorId(presetNumber)
    ) {
      delete dysonRoot[colorKey]
    } else {
      dysonRoot[colorKey] = preset.colorId
    }
    dysonRoot[`botDistPreset${presetNumber}`] = preset.botDistribution
    dysonRoot[`skillAutoAssignmentIds${presetNumber}`] = [
      ...preset.skillIds,
    ]
  })
  source.autoAssignNonRefundableSkills =
    state.skills.autoAssignNonRefundable
  source.botsTabPresetOverride =
    state.skills.tabPresetAutomation.bots
  source.researchTabPresetOverride =
    state.skills.tabPresetAutomation.research

  infinityData.researchLevelsById = {
    ...state.research.levelsById,
  }
  infinityData.researchProgressById = {
    ...state.research.progressById,
  }
  source.researchBuyMode = fromBuyMode(state.research.automation.buyMode)
  source.researchRoundedBulkBuy =
    state.research.automation.roundedBulkBuy
  for (const [id, sourceKey] of Object.entries(
    RESEARCH_AUTOMATION_PATHS,
  )) {
    source[sourceKey] = state.research.automation.enabledById[id] ?? false
  }

  reality.universesConsumed = state.reality.universeDesignationCount
  reality.workersReadyToGo = state.reality.workersReady
  reality.workerGenerationProgress =
    state.reality.workerGenerationProgress
  reality.influence = state.reality.influence
  reality.workerAutoConvert = state.reality.autoGather

  quantum.points = state.quantum.pointsEarned
  quantum.spentPoints = state.quantum.pointsSpent
  quantum.divisionsPurchased = state.quantum.divisionsPurchased
  quantum.secrets = state.quantum.permanentSecrets
  quantum.influence = state.quantum.influenceSpeedBonus
  quantum.cash = state.quantum.cashBonusLevels
  quantum.science = state.quantum.scienceBonusLevels
  // QuantumUpgradeCondition and older Unity builds still read this legacy
  // mirror even though AvocadoData is the canonical owner.
  quantum.avocatoPurchased = state.avocado.unlocked
  quantum.botMultitasking = state.quantum.unlocks.botMultitasking
  quantum.doubleIP = state.quantum.unlocks.doubleInfinityPoints
  quantum.breakTheLoop = state.quantum.unlocks.breakTheLoop
  quantum.quantumEntanglement = state.quantum.unlocks.quantumEntanglement
  quantum.automation = state.quantum.unlocks.automation
  quantum.fragments = state.quantum.unlocks.fragments
  quantum.purity = state.quantum.unlocks.purity
  quantum.terra = state.quantum.unlocks.terra
  quantum.power = state.quantum.unlocks.power
  quantum.paragade = state.quantum.unlocks.paragade
  quantum.stellar = state.quantum.unlocks.stellar
  prestige.unlockedMatrioshkaBrains =
    state.quantum.unlocks.matrioshkaBrains
  prestige.unlockedBirchPlanets =
    state.quantum.unlocks.birchPlanets
  prestige.unlockedGalacticBrains =
    state.quantum.unlocks.galacticBrains

  source.infinityChallengeData = { ...EMPTY_INFINITY_CHALLENGES, ...state.challenges }
  avocado.overflowPoints = state.avocado.overflowPoints ?? 0n
  avocado.unlocked = state.avocado.unlocked
  avocado.infinityPoints = state.avocado.infinityPoints
  avocado.influence = state.avocado.influence
  avocado.strangeMatter = state.avocado.strangeMatter
  avocado.overflowMultiplier = state.avocado.overflowMultiplier

  source.eventTimeClockInitialized =
    state.timeline.eventClockInitialized
  source.simulationAutomationTimeUntilNextEvent =
    state.timeline.automationTimeUntilNextEvent
  source.dysonAutomationTargetIndex =
    state.timeline.dysonAutomationTargetIndex
  source.researchAutomationTargetIndex =
    state.timeline.researchAutomationTargetIndex
  source.simulationInfinityBoundaryRemaining =
    state.timeline.infinityBoundaryRemaining
  source.simulationInfinityCycleSeconds =
    state.timeline.infinityCycleSeconds
  source.simulationInfinityCycleStartingPoints =
    state.timeline.infinityCycleStartingPoints
  source.simulationInfinityHasPostResetStart =
    state.timeline.infinityHasPostResetStart
  source.offlineTime = state.timeline.storedTimeAvailableSeconds
  source.maxOfflineTime = state.timeline.storedTimeCapacitySeconds
  source.dateQuitString = state.timeline.lastSuspendedAtLegacyText
  source.processingRewriteMigrated =
    state.timeline.processing.rewriteMigrated
  source.processingActiveIntervalMilliseconds =
    state.timeline.processing.activeIntervalMilliseconds
  source.processingStoredTimePreset =
    state.timeline.processing.storedTimePreset
  dreamProgression.doubleTimeOwned =
    state.timeline.doubleTime.unlocked
  dreamProgression.doDoubleTime = false
  dreamProgression.doubleTime = 0
  dreamProgression.doubleTimeRate = 0

  source.avotation = state.secretProgress.completed
  source.avotationProgressStep = state.secretProgress.completed
    ? 7
    : state.secretProgress.step

  Object.assign(dreamRun, state.dream.resources)
  dreamRun.spaceFactories = state.dream.resources.spaceFactories
  dreamRun.dysonPanels = state.dream.resources.dysonPanels
  dreamRun.railgunCharge = state.dream.resources.railgunCharge
  dreamRun.solarPanels = state.dream.resources.solarPanels
  dreamRun.swarmPanels = state.dream.resources.swarmPanels
  dreamRun.hunterCost = state.dream.parameters.hunterCost
  dreamRun.gathererCost = state.dream.parameters.gathererCost
  dreamRun.communityBoostCost =
    state.dream.parameters.communityBoostCost
  dreamRun.communityBoostIsFree =
    state.dream.parameters.communityBoostIsFree
  dreamRun.communityBoostTime =
    state.dream.parameters.communityBoostClock
  dreamRun.communityBoostDuration =
    state.dream.parameters.communityBoostDuration
  dreamRun.factoriesBoostCost = state.dream.parameters.factoriesBoostCost
  dreamRun.factoriesBoostTime =
    state.dream.parameters.factoriesBoostClock
  dreamRun.factoriesBoostDuration =
    state.dream.parameters.factoriesBoostDuration
  dreamRun.rocketsPerSpaceFactory =
    state.dream.parameters.rocketsPerSpaceFactory
  dreamRun.railgunMaxCharge = state.dream.parameters.railgunMaxCharge
  dreamRun.solarCost = state.dream.parameters.solarCost
  dreamRun.solarPanelGeneration =
    state.dream.parameters.solarPanelGeneration
  dreamRun.fusionCost = state.dream.parameters.fusionCost
  dreamRun.fusionGeneration = state.dream.parameters.fusionGeneration
  dreamRun.swarmPanelGeneration =
    state.dream.parameters.swarmPanelGeneration
  for (const id of DREAM_EDUCATION_IDS) {
    const education = state.dream.education[id]
    dreamRun[id] = education.active
    dreamRun[`${id}Complete`] = education.complete
    dreamRun[`${id}Progress`] = education.progress
    dreamRun[`${id}ResearchTime`] = education.researchTime
    dreamRun[`${id}Cost`] = education.cost
  }
  for (const field of DREAM_TIMER_FIELDS) {
    dreamRun[field] = state.dream.timers[field] ?? 0
  }
  dreamRun.railgunFiring = state.dream.railgun.firing
  dreamRun.railgunFireProgress = state.dream.railgun.fireProgress
  dreamRun.railgunShotsRemaining = state.dream.railgun.shotsRemaining
  const activeRailguns = state.dream.railgun.activeRailguns ?? 0
  const reservedPanels = state.dream.railgun.reservedPanels ?? 0n
  const highestStoredPanels =
    state.dream.railgun.highestStoredPanels ??
    state.dream.resources.dysonPanels
  if (activeRailguns > 0) {
    dreamRun.railgunActiveRailguns = activeRailguns
  } else {
    delete dreamRun.railgunActiveRailguns
  }
  if (reservedPanels > 0n) {
    dreamRun.railgunReservedPanels = reservedPanels
  } else {
    delete dreamRun.railgunReservedPanels
  }
  if (highestStoredPanels > 0n) {
    dreamRun.highestStoredDysonPanels = highestStoredPanels
  } else {
    delete dreamRun.highestStoredDysonPanels
  }
  dreamProgression.simulationCount = state.dream.resetCount
  dreamProgression.strangeMatter = state.dream.strangeMatter
  dreamProgression.disasterStage = state.dream.disasterStage
  for (const field of DREAM_UPGRADE_FLAGS) {
    dreamProgression[field] = state.dream.upgrades[field]
  }
  reality.huntersPerPurchase = state.dream.huntersPerPurchase
  reality.gatherersPerPurchase = state.dream.gatherersPerPurchase
  reality.hunterPurchaseBatches = state.dream.purchaseBatches?.hunters ?? 0n
  reality.gathererPurchaseBatches = state.dream.purchaseBatches?.gatherers ?? 0n
  dreamRun.solarPurchaseBatches = state.dream.purchaseBatches?.solar ?? 0n
  dreamRun.fusionPurchaseBatches = state.dream.purchaseBatches?.fusion ?? 0n

  source.simulationStatistics = fromSimulationStatistics(
    state.statistics,
    requireRecord(source.simulationStatistics),
  )
  packSettingsFlags(source)

  return hydrated.prepareReplacement(source)
}

function createDreamEducation(
  source: SaveRecord,
): Record<DreamEducationId, DreamEducationState> {
  return Object.fromEntries(
    DREAM_EDUCATION_IDS.map((id) => [
      id,
      {
        active: toBoolean(source[id]),
        complete: toBoolean(source[`${id}Complete`]),
        progress: toFiniteNonNegativeNumber(source[`${id}Progress`]),
        researchTime: toFiniteNonNegativeNumber(
          source[`${id}ResearchTime`],
        ),
        cost: toFiniteNonNegativeNumber(source[`${id}Cost`]),
      },
    ]),
  ) as Record<DreamEducationId, DreamEducationState>
}

function toSimulationTotals(value: unknown): SimulationTotalsState {
  const source = recordOrEmpty(value)
  const discrete = Object.fromEntries(
    STAT_BIGINT_FIELDS.map((field) => [
      field,
      toNonNegativeBigInt(source[field]),
    ]),
  ) as Pick<
    SimulationTotalsState,
    (typeof STAT_BIGINT_FIELDS)[number]
  >
  return {
    ...discrete,
    ...Object.fromEntries(
      STAT_CONTINUOUS_RESOURCE_FIELDS.map((field) => [
        field,
        toContinuousResourceNumber(source[field]),
      ]),
    ) as Pick<
      SimulationTotalsState,
      (typeof STAT_CONTINUOUS_RESOURCE_FIELDS)[number]
    >,
    realityCapacityStallSeconds: toFiniteNonNegativeNumber(
      source.realityCapacityStallSeconds,
    ),
    simulatedSeconds: toFiniteNonNegativeNumber(source.simulatedSeconds),
  }
}

function toStatisticsWindows(
  value: unknown,
  length: number,
): StatisticsWindowState[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) => {
    const bucket = recordOrEmpty(source[index])
    return {
      sequence: toNonNegativeBigInt(bucket.sequence),
      simulatedSeconds: toFiniteNonNegativeNumber(
        bucket.simulatedSeconds,
      ),
      infinityCount: toNonNegativeBigInt(bucket.infinityCount),
      infinityPoints: toNonNegativeBigInt(bucket.infinityPoints),
      dreamResetCount: toNonNegativeBigInt(bucket.dreamResetCount),
      strangeMatter: toContinuousResourceNumber(bucket.strangeMatter),
      realityWorkers: toNonNegativeBigInt(bucket.realityWorkers),
    }
  })
}

function toLastCompletedCycle(value: unknown) {
  const source = recordOrEmpty(value)
  const dreamCause =
    typeof source.dreamCause === 'string' && source.dreamCause.length > 0
      ? source.dreamCause
      : null
  return {
    valid: toBoolean(source.valid),
    breakInfinity: toBoolean(source.breakInfinity),
    durationSeconds: toFiniteNonNegativeNumber(source.durationSeconds),
    reward: dreamCause === null
      ? toNonNegativeBigInt(source.reward)
      : toContinuousResourceNumber(source.reward),
    dreamCause,
  }
}

function toRecentInfinityCycles(
  value: unknown,
): InfinityCycleHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const result: InfinityCycleHistoryEntry[] = []
  for (const candidate of value.slice(0, 10)) {
    if (!isRecord(candidate)) continue
    const configuredTarget = toNonNegativeBigInt(candidate.configuredTarget)
    const reward = toNonNegativeBigInt(candidate.reward)
    const durationSeconds = toFiniteNonNegativeNumber(
      candidate.durationSeconds,
    )
    if (configuredTarget < 1n || reward < 1n || durationSeconds <= 0) {
      continue
    }
    result.push({
      breakInfinity: toBoolean(candidate.breakInfinity),
      automatic: toBoolean(candidate.automatic),
      configuredTarget,
      reward,
      durationSeconds,
      ...(isProcessingSource(candidate.processingSource)
        ? { processingSource: candidate.processingSource }
        : {}),
      ...(Number.isInteger(candidate.activeIntervalMilliseconds) &&
      Number(candidate.activeIntervalMilliseconds) >= 33 &&
      Number(candidate.activeIntervalMilliseconds) <= 200
        ? {
            activeIntervalMilliseconds:
              Number(candidate.activeIntervalMilliseconds),
          }
        : {}),
    })
  }
  return result
}

function fromSimulationStatistics(
  state: CanonicalGameStateV1['statistics'],
  preserved: SaveRecord,
): SaveRecord {
  preserved.trackedSinceUpdate = state.trackedSinceUpdate
  preserved.trackingStartedUtc = state.trackingStartedMarker
  preserved.trackedSimulatedSeconds = state.trackedSimulatedSeconds
  preserved.lifetime = overlayRecord(preserved.lifetime, state.lifetime)
  preserved.currentQuantumRun = overlayRecord(
    preserved.currentQuantumRun,
    state.currentQuantumRun,
  )
  preserved.recentProcessedSegment = overlayRecord(
    preserved.recentProcessedSegment,
    state.recentProcessedSegment,
  )
  preserved.lastCompletedCycle = overlayRecord(
    preserved.lastCompletedCycle,
    {
      ...state.lastCompletedCycle,
      dreamCause: state.lastCompletedCycle.dreamCause ?? '',
    },
  )
  if (
    state.recentInfinityCycles !== undefined ||
    Array.isArray(preserved.recentInfinityCycles)
  ) {
    preserved.recentInfinityCycles = overlayBuckets(
      preserved.recentInfinityCycles,
      state.recentInfinityCycles ?? [],
    )
  }
  if (
    state.recentActiveAutomaticInfinityCycles !== undefined ||
    Array.isArray(preserved.recentActiveAutomaticInfinityCycles)
  ) {
    preserved.recentActiveAutomaticInfinityCycles = overlayBuckets(
      preserved.recentActiveAutomaticInfinityCycles,
      state.recentActiveAutomaticInfinityCycles ?? [],
    )
  }
  preserved.minuteWindows = overlayBuckets(
    preserved.minuteWindows,
    state.minuteWindows,
  )
  preserved.halfHourWindows = overlayBuckets(
    preserved.halfHourWindows,
    state.halfHourWindows,
  )
  preserved.dailyWindows = overlayBuckets(
    preserved.dailyWindows,
    state.dailyWindows,
  )
  return preserved
}

function overlayRecord(
  value: unknown,
  canonical: object,
): SaveRecord {
  const preserved = recordOrEmpty(value)
  Object.assign(preserved, canonical)
  return preserved
}

function overlayBuckets(
  value: unknown,
  canonical: readonly object[],
): SaveRecord[] {
  const preserved = Array.isArray(value) ? value : []
  return canonical.map((bucket, index) =>
    overlayRecord(preserved[index], bucket),
  )
}

function createSkillPresets(
  source: SaveRecord,
): CanonicalGameStateV1['skills']['presets'] {
  return Array.from({ length: 5 }, (_, index) => {
    const presetNumber = index + 1
    const name = source[`preset${presetNumber}Name`]
    const colorId = source[`preset${presetNumber}ColorId`]
    return {
      name:
        typeof name === 'string' && name.length > 0
          ? name
          : `Preset ${presetNumber}`,
      skillIds: toStableIds(
        source[`skillAutoAssignmentIds${presetNumber}`],
      ),
      botDistribution: clampUnit(
        toFiniteNonNegativeNumber(
          source[`botDistPreset${presetNumber}`],
          0.5,
        ),
      ),
      colorId: isSkillPresetColorId(colorId)
        ? colorId
        : defaultSkillPresetColorId(presetNumber),
    }
  }) as unknown as CanonicalGameStateV1['skills']['presets']
}

function toSkillPresetAutomationSlot(
  value: unknown,
): CanonicalGameStateV1['skills']['tabPresetAutomation']['bots'] {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(5, Math.trunc(value))) as
    CanonicalGameStateV1['skills']['tabPresetAutomation']['bots']
}

function toSkillStates(value: unknown): Record<string, SkillRuntimeState> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id]) => id.trim().length > 0)
      .map(([id, rawState]) => {
        const state = requireRecord(rawState, `Skill state '${id}'`)
        return [
          id,
          {
            owned: toBoolean(state.owned),
            level: toNonNegativeInteger(state.level),
            timerSeconds: toFiniteNonNegativeNumber(state.timerSeconds),
            secondaryTimerSeconds: toFiniteNonNegativeNumber(
              state.secondaryTimerSeconds,
            ),
          },
        ]
      }),
  )
}

function toNumberRecord(
  value: unknown,
  integer: boolean,
): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id]) => id.trim().length > 0)
      .map(([id, entry]) => [
        id,
        integer
          ? toNonNegativeInteger(entry)
          : toFiniteNonNegativeNumber(entry),
      ]),
  )
}

function toStableIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      )
    : []
}

function toOwnedPair(value: unknown): CanonicalOwnedPair {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error('Canonical facility ownership requires two dense slots.')
  }
  return [
    toFiniteNonNegativeNumber(value[0]),
    toFiniteNonNegativeNumber(value[1]),
  ]
}

function toFiniteNonNegativeNumber(
  value: unknown,
  fallback = 0,
): number {
  if (value === undefined || value === null) return fallback
  if (isFiniteNonNegativeNumber(value)) {
    return value
  }
  throw new Error(`Expected a finite non-negative number, received ${String(value)}.`)
}

/**
 * Continuous resources were historically persisted as BigInt values. Accept
 * those existing saves, as well as decimal JSON/string values, and normalize
 * every representation onto the finite double contract.
 */
function toContinuousResourceNumber(
  value: unknown,
  fallback = 0,
): number {
  if (value === undefined || value === null) return fallback
  let parsed: number
  if (typeof value === 'number') {
    parsed = value
  } else if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new Error(`Expected a non-negative continuous resource, received ${value}.`)
    }
    parsed = Number(value)
  } else if (typeof value === 'string' && value.trim().length > 0) {
    parsed = Number(value)
  } else {
    throw new Error(`Expected a continuous resource, received ${String(value)}.`)
  }
  if (parsed === Number.POSITIVE_INFINITY) return CONTINUOUS_MAXIMUM
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a finite non-negative continuous resource, received ${String(value)}.`)
  }
  return parsed
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const number = toFiniteNonNegativeNumber(value, fallback)
  if (!Number.isInteger(number)) {
    throw new Error(`Expected a non-negative integer, received ${number}.`)
  }
  return number
}

function toNonNegativeBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === 'bigint') {
    if (value >= 0n) return value
    throw new Error(`Expected a non-negative discrete integer, received ${value}.`)
  }
  if (isSafeNonNegativeInteger(value)) {
    return BigInt(value)
  }
  if (value === undefined || value === null) return fallback
  throw new Error(`Expected a non-negative discrete integer, received ${String(value)}.`)
}

function toSimulationResourceBigInt(
  value: unknown,
  fallback = 0n,
): bigint {
  const parsed = toNonNegativeBigInt(value, fallback)
  return parsed > SIMULATION_RESOURCE_MAXIMUM
    ? SIMULATION_RESOURCE_MAXIMUM
    : parsed
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  throw new Error(`Expected a boolean, received ${String(value)}.`)
}

function toBuyMode(value: unknown): BuyMode {
  const index =
    typeof value === 'bigint'
      ? Number(value)
      : typeof value === 'number'
        ? value
        : 0
  return BUY_MODES[
    isNonNegativeInteger(index) && index < BUY_MODES.length
      ? index
      : 0
  ]
}

function fromBuyMode(value: BuyMode): number {
  return BUY_MODES.indexOf(value)
}

function minimumBigInt(left: bigint, right: bigint): bigint {
  return left < right ? left : right
}

function maximumBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right
}

function nonBlankStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : null
}

function toFractionalProgress(value: unknown): number {
  const progress = toFiniteNonNegativeNumber(value)
  return progress >= 1 ? progress % 1 : progress
}

function encodeBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}
