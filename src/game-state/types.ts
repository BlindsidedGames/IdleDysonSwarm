import type { BuyMode } from '../simulation/transactions'
import type { SkillPresetColorId } from './skillPresetColors'

export const CANONICAL_GAME_MODEL_VERSION = 1 as const

export type CanonicalFacilityId =
  | 'assembly_lines'
  | 'ai_managers'
  | 'servers'
  | 'data_centers'
  | 'planets'
  | 'matrioshka_brains'
  | 'birch_planets'
  | 'galactic_brains'

export type CanonicalOwnedPair = readonly [
  automatic: number,
  manual: number,
]

export interface CanonicalGameStateV1 {
  readonly modelVersion: typeof CANONICAL_GAME_MODEL_VERSION
  readonly meta: GameMetaState
  readonly dyson: DysonState
  readonly infinity: InfinityState
  readonly skills: SkillsState
  readonly research: ResearchState
  readonly reality: RealityState
  readonly quantum: QuantumState
  readonly avocado: AvocadoState
  readonly timeline: TimelineState
  readonly secretProgress: SecretProgressState
  readonly dream: DreamState
  readonly statistics: SimulationStatisticsState
}

export interface GameMetaState {
  /** The culture-formatted Unity value is preserved until date parity is characterized. */
  readonly createdAtLegacyText: string | null
  readonly tutorialComplete: boolean
  readonly firstInfinityComplete: boolean
  /** Unity settings that control the persistent bottom-menu shortcuts. */
  readonly navigationVisibility?: {
    readonly story: boolean
    readonly wiki: boolean
    readonly statistics: boolean
    readonly [destinationId: string]: boolean
  }
}

export interface DysonState {
  readonly money: number
  readonly science: number
  readonly bots: number
  readonly workers: number
  readonly researchers: number
  readonly facilities: Readonly<
    Record<CanonicalFacilityId, CanonicalOwnedPair>
  >
  readonly manualCreationIntervalSeconds: number
  readonly totalPanelsDecayed: number
  readonly goalStage: bigint
  readonly botDistribution: number
  readonly automation: {
    readonly buyMode: BuyMode
    readonly roundedBulkBuy: boolean
    readonly enabledFacilities: Readonly<
      Record<CanonicalFacilityId, boolean>
    >
  }
}

export interface InfinityState {
  readonly points: bigint
  readonly spentPoints: bigint
  readonly automaticResetEnabled: boolean
  readonly breakTarget: bigint
  /** Best projected IP/min observed during the current Infinity cycle. */
  readonly currentCyclePeakIpPerMinute?: number
  /** Projected reward associated with the current-cycle IP/min peak. */
  readonly currentCyclePeakReward?: bigint
  readonly inProgress: boolean
  readonly botCapTransitionPending: boolean
  readonly botCapRewardsGranted: boolean
  readonly lastCycleDurationSeconds: number
  readonly lastPointsGained: number
  readonly storedTimeUsedThisCycleSeconds: number
  readonly storedTimeUsedPreviousCycleSeconds: number
  readonly secretsOfTheUniverse: bigint
  readonly permanentSkillPoints: bigint
  readonly retainedFacilities: Readonly<
    Record<
      | 'assembly_lines'
      | 'ai_managers'
      | 'servers'
      | 'data_centers'
      | 'planets',
      boolean
    >
  >
  readonly automationUnlocked: {
    readonly research: boolean
    readonly bots: boolean
  }
}

export interface SkillRuntimeState {
  readonly owned: boolean
  readonly level: number
  readonly timerSeconds: number
  readonly secondaryTimerSeconds: number
}

export interface SkillPresetState {
  readonly name: string
  readonly skillIds: readonly string[]
  readonly botDistribution: number
  readonly colorId: SkillPresetColorId
}

export type CanonicalSkillPresetSlot = 1 | 2 | 3 | 4 | 5

export type CanonicalSkillPresetAutomationSlot =
  | 0
  | CanonicalSkillPresetSlot

export interface SkillsState {
  readonly points: bigint
  readonly fragments: bigint
  readonly byId: Readonly<Record<string, SkillRuntimeState>>
  readonly activeAutoAssignment: readonly string[]
  readonly presets: readonly [
    SkillPresetState,
    SkillPresetState,
    SkillPresetState,
    SkillPresetState,
    SkillPresetState,
  ]
  readonly autoAssignNonRefundable: boolean
  readonly tabPresetAutomation: {
    readonly bots: CanonicalSkillPresetAutomationSlot
    readonly research: CanonicalSkillPresetAutomationSlot
  }
}

export interface ResearchState {
  readonly levelsById: Readonly<Record<string, number>>
  readonly progressById: Readonly<Record<string, number>>
  readonly automation: {
    readonly buyMode: BuyMode
    readonly roundedBulkBuy: boolean
    readonly enabledById: Readonly<Record<string, boolean>>
  }
}

export interface RealityState {
  readonly universeDesignationCount: bigint
  readonly workersReady: bigint
  readonly workerGenerationProgress: number
  readonly influence: bigint
  readonly autoGather: boolean
}

export interface QuantumState {
  readonly pointsEarned: bigint
  readonly pointsSpent: bigint
  readonly divisionsPurchased: bigint
  readonly permanentSecrets: bigint
  readonly influenceSpeedBonus: bigint
  readonly cashBonusLevels: bigint
  readonly scienceBonusLevels: bigint
  readonly unlocks: {
    readonly botMultitasking: boolean
    readonly doubleInfinityPoints: boolean
    readonly breakTheLoop: boolean
    readonly quantumEntanglement: boolean
    readonly automation: boolean
    readonly fragments: boolean
    readonly purity: boolean
    readonly terra: boolean
    readonly power: boolean
    readonly paragade: boolean
    readonly stellar: boolean
    readonly matrioshkaBrains: boolean
    readonly birchPlanets: boolean
    readonly galacticBrains: boolean
  }
}

export interface AvocadoState {
  readonly unlocked: boolean
  readonly infinityPoints: number
  readonly influence: number
  readonly strangeMatter: number
  readonly overflowMultiplier: number
}

export interface TimelineState {
  readonly eventClockInitialized: boolean
  readonly automationTimeUntilNextEvent: number
  readonly dysonAutomationTargetIndex: number
  readonly researchAutomationTargetIndex: number
  readonly infinityBoundaryRemaining: number
  readonly infinityCycleSeconds: number
  readonly infinityCycleStartingPoints: bigint
  readonly infinityHasPostResetStart: boolean
  readonly storedTimeAvailableSeconds: number
  readonly storedTimeCapacitySeconds: number
  readonly lastSuspendedAtLegacyText: string | null
  readonly processing: {
    readonly rewriteMigrated: boolean
    readonly activeIntervalMilliseconds: number
    readonly storedTimePreset: StoredTimeAccuracyPreset
  }
  readonly doubleTime: {
    readonly unlocked: boolean
    readonly enabled: boolean
    readonly bankSeconds: number
    readonly rate: number
  }
}

export type StoredTimeAccuracyPreset = 'fast' | 'balanced' | 'accurate'

export interface SecretProgressState {
  readonly completed: boolean
  readonly step: number
}

export const DREAM_UPGRADE_FLAGS = [
  'counterMeteor',
  'counterAi',
  'counterGw',
  'engineering1',
  'engineering2',
  'engineering3',
  'shipping1',
  'shipping2',
  'worldTrade1',
  'worldTrade2',
  'worldTrade3',
  'worldPeace1',
  'worldPeace2',
  'worldPeace3',
  'worldPeace4',
  'mathematics1',
  'mathematics2',
  'mathematics3',
  'advancedPhysics1',
  'advancedPhysics2',
  'advancedPhysics3',
  'advancedPhysics4',
  'hunter1',
  'hunter2',
  'hunter3',
  'hunter4',
  'gatherer1',
  'gatherer2',
  'gatherer3',
  'gatherer4',
  'workerBoost',
  'workerBoostAcivator',
  'citiesBoost',
  'citiesBoostActivator',
  'factoriesBoost',
  'factoriesBoostActivator',
  'bots1',
  'botsBoost1Activator',
  'bots2',
  'botsBoost2Activator',
  'rockets1',
  'rockets2',
  'rockets3',
  'sfacs1',
  'sfActivator1',
  'sfacs2',
  'sfActivator2',
  'sfacs3',
  'sfActivator3',
  'railguns1',
  'railgunActivator1',
  'railguns2',
  'railgunActivator2',
  'translation1',
  'translation2',
  'translation3',
  'translation4',
  'translation5',
  'translation6',
  'translation7',
  'translation8',
  'speed1',
  'speed2',
  'speed3',
  'speed4',
  'speed5',
  'speed6',
  'speed7',
  'speed8',
] as const

export type DreamUpgradeFlag = (typeof DREAM_UPGRADE_FLAGS)[number]

export type DreamEducationId =
  | 'engineering'
  | 'shipping'
  | 'worldTrade'
  | 'worldPeace'
  | 'mathematics'
  | 'advancedPhysics'

export interface DreamEducationState {
  readonly active: boolean
  readonly complete: boolean
  readonly progress: number
  readonly researchTime: number
  readonly cost: number
}

export interface DreamState {
  readonly resources: {
    readonly hunters: bigint
    readonly gatherers: bigint
    readonly community: number
    readonly housing: number
    readonly villages: number
    readonly workers: number
    readonly cities: number
    readonly factories: number
    readonly bots: number
    readonly rockets: number
    readonly energy: number
    readonly spaceFactories: number
    readonly dysonPanels: bigint
    readonly railgunCharge: number
    readonly solarPanels: number
    readonly fusion: number
    readonly swarmPanels: bigint
  }
  readonly parameters: {
    readonly hunterCost: bigint
    readonly gathererCost: bigint
    readonly communityBoostCost: number
    readonly communityBoostIsFree: boolean
    readonly communityBoostClock: number
    readonly communityBoostDuration: number
    readonly factoriesBoostCost: number
    readonly factoriesBoostClock: number
    readonly factoriesBoostDuration: number
    readonly rocketsPerSpaceFactory: bigint
    readonly railgunMaxCharge: number
    readonly solarCost: bigint
    readonly solarPanelGeneration: bigint
    readonly fusionCost: bigint
    readonly fusionGeneration: bigint
    readonly swarmPanelGeneration: bigint
  }
  readonly education: Readonly<
    Record<DreamEducationId, DreamEducationState>
  >
  readonly timers: Readonly<Record<string, number>>
  readonly railgun: {
    readonly firing: boolean
    readonly fireProgress: number
    readonly shotsRemaining: number
    /** Railguns committed to the currently reserved ten-round volley. */
    readonly activeRailguns?: number
    /** Panels removed from factory storage but not yet launched. */
    readonly reservedPanels?: bigint
    /** Highest unreserved factory-panel inventory observed this run. */
    readonly highestStoredPanels?: bigint
    /** Presentation telemetry from the most recent gameplay update. */
    readonly lastRoundsFired?: number
    readonly lastPanelsLaunched?: bigint
  }
  readonly resetCount: bigint
  readonly strangeMatter: bigint
  readonly disasterStage: bigint
  readonly upgrades: Readonly<Record<DreamUpgradeFlag, boolean>>
  readonly huntersPerPurchase: bigint
  readonly gatherersPerPurchase: bigint
}

export interface SimulationTotalsState {
  readonly ordinaryInfinityCount: bigint
  readonly breakInfinityCount: bigint
  readonly ordinaryInfinityPoints: bigint
  readonly breakInfinityPoints: bigint
  readonly botCapInfinityPoints: bigint
  readonly botCapOverflowRewards: bigint
  readonly meteorDreamResets: bigint
  readonly aiDreamResets: bigint
  readonly globalWarmingDreamResets: bigint
  readonly blackHoleDreamResets: bigint
  readonly strangeMatter: bigint
  readonly realityWorkers: bigint
  readonly automaticInfluence: bigint
  readonly manualInfluence: bigint
  readonly realityCapacityStallSeconds: number
  readonly simulatedSeconds: number
}

export interface StatisticsWindowState {
  readonly sequence: bigint
  readonly simulatedSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: bigint
  readonly dreamResetCount: bigint
  readonly strangeMatter: bigint
  readonly realityWorkers: bigint
}

export interface InfinityCycleHistoryEntry {
  readonly breakInfinity: boolean
  readonly automatic: boolean
  readonly configuredTarget: bigint
  readonly reward: bigint
  readonly durationSeconds: number
}

export interface SimulationStatisticsState {
  readonly trackedSinceUpdate: boolean
  readonly trackingStartedMarker: string
  readonly trackedSimulatedSeconds: number
  readonly lifetime: SimulationTotalsState
  readonly currentQuantumRun: SimulationTotalsState
  readonly recentProcessedSegment: SimulationTotalsState
  readonly lastCompletedCycle: {
    readonly valid: boolean
    readonly breakInfinity: boolean
    readonly durationSeconds: number
    readonly reward: bigint
    readonly dreamCause: string | null
  }
  /** Newest-first bounded history used for completed-run efficiency guidance. */
  readonly recentInfinityCycles?: readonly InfinityCycleHistoryEntry[]
  readonly minuteWindows: readonly StatisticsWindowState[]
  readonly halfHourWindows: readonly StatisticsWindowState[]
  readonly dailyWindows: readonly StatisticsWindowState[]
}
