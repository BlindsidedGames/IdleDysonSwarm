import type { GameDecimal } from '../math/gameDecimal'
import type { BuyMode } from '../simulation/transactions'
import type { SkillPresetColorId } from './skillPresetColors'
import type {
  CanonicalFacilityId,
  CanonicalSkillPresetSlot,
  CanonicalSkillPresetAutomationSlot,
  DreamEducationId,
  DreamUpgradeFlag,
} from './types'

export type CanonicalOwnedPairV2 = readonly [
  automatic: GameDecimal,
  manual: GameDecimal,
]

export type CanonicalResearchId =
  | 'research.ai_manager_upgrade'
  | 'research.assembly_line_upgrade'
  | 'research.birch_planets_upgrade'
  | 'research.data_center_upgrade'
  | 'research.galactic_brains_upgrade'
  | 'research.matrioshka_brains_upgrade'
  | 'research.money_multiplier'
  | 'research.panel_lifetime_1'
  | 'research.panel_lifetime_2'
  | 'research.panel_lifetime_3'
  | 'research.panel_lifetime_4'
  | 'research.planet_upgrade'
  | 'research.science_boost'
  | 'research.server_upgrade'

export type CappedResearchId =
  | 'research.panel_lifetime_1'
  | 'research.panel_lifetime_2'
  | 'research.panel_lifetime_3'
  | 'research.panel_lifetime_4'

export type UnboundedResearchId = Exclude<
  CanonicalResearchId,
  CappedResearchId
>

export type DreamTimerId =
  | 'hunterTimerProgress'
  | 'gathererTimerProgress'
  | 'communityTimerProgress'
  | 'housingTimerProgress'
  | 'villagesTimerProgress'
  | 'workersTimerProgress'
  | 'citiesTimerProgress'
  | 'factoriesTimerProgress'
  | 'botsTimerProgress'
  | 'spaceFactoriesTimerProgress'

export type CanonicalDreamResetCauseV2 =
  | 'Meteor'
  | 'ArtificialIntelligence'
  | 'GlobalWarming'
  | 'BlackHole'

export interface CanonicalGameStateV2 {
  readonly modelVersion: 2
  readonly meta: GameMetaStateV2
  readonly dyson: DysonStateV2
  readonly infinity: InfinityStateV2
  readonly skills: SkillsStateV2
  readonly research: ResearchStateV2
  readonly reality: RealityStateV2
  readonly quantum: QuantumStateV2
  readonly avocado: AvocadoStateV2
  readonly timeline: TimelineStateV2
  readonly secretProgress: SecretProgressStateV2
  readonly dream: DreamStateV2
  readonly statistics: SimulationStatisticsStateV2
}

export interface GameMetaStateV2 {
  readonly createdAtLegacyText: string | null
  readonly tutorialComplete: boolean
  readonly firstInfinityComplete: boolean
  readonly navigationVisibility: {
    readonly story: boolean
    readonly wiki: boolean
    readonly statistics: boolean
  }
}

export interface DysonStateV2 {
  readonly money: GameDecimal
  readonly science: GameDecimal
  readonly bots: GameDecimal
  readonly workers: GameDecimal
  readonly researchers: GameDecimal
  readonly facilities: Readonly<
    Record<CanonicalFacilityId, CanonicalOwnedPairV2>
  >
  readonly manualCreationIntervalSeconds: number
  readonly totalPanelsDecayed: GameDecimal
  readonly goalStage: bigint
  readonly botDistribution: number
  readonly automation: {
    readonly buyMode: BuyMode
    readonly roundedBulkBuy: boolean
    readonly enabledFacilities: Readonly<Record<CanonicalFacilityId, boolean>>
  }
}

export interface InfinityStateV2 {
  readonly availablePoints: GameDecimal
  readonly allocatedPoints: GameDecimal
  readonly breakTarget: GameDecimal
  readonly inProgress: boolean
  readonly botCapTransitionPending: boolean
  readonly botCapRewardsGranted: boolean
  readonly lastCycleDurationSeconds: number
  readonly lastPointsGained: GameDecimal
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

export interface SkillRuntimeStateV2 {
  readonly owned: boolean
  readonly level: bigint
  readonly timerSeconds: number
  readonly secondaryTimerSeconds: number
}

export interface SkillPresetStateV2 {
  readonly name: string
  readonly skillIds: readonly string[]
  readonly botDistribution: number
  readonly colorId: SkillPresetColorId
}

export interface SkillsStateV2 {
  readonly points: bigint
  readonly fragments: bigint
  readonly byId: Readonly<Record<string, SkillRuntimeStateV2>>
  readonly activeAutoAssignment: readonly string[]
  readonly selectedPreset: CanonicalSkillPresetSlot
  readonly presets: readonly [
    SkillPresetStateV2,
    SkillPresetStateV2,
    SkillPresetStateV2,
    SkillPresetStateV2,
    SkillPresetStateV2,
  ]
  readonly autoAssignNonRefundable: boolean
  readonly tabPresetAutomation: {
    readonly bots: CanonicalSkillPresetAutomationSlot
    readonly research: CanonicalSkillPresetAutomationSlot
  }
}

export type ResearchLevelsV2 = Readonly<
  Record<UnboundedResearchId, GameDecimal> &
    Record<CappedResearchId, bigint>
>

export interface ResearchStateV2 {
  readonly levelsById: ResearchLevelsV2
  readonly progressById: Readonly<Record<CanonicalResearchId, GameDecimal>>
  readonly automation: {
    readonly buyMode: BuyMode
    readonly roundedBulkBuy: boolean
    readonly enabledById: Readonly<Record<CanonicalResearchId, boolean>>
  }
}

/** Authored Reality worker batch size and durable ready-worker inventory cap. */
export const REALITY_WORKERS_READY_MAXIMUM_V2 = 128n

export interface RealityStateV2 {
  readonly universeDesignationCount: GameDecimal
  readonly workersReady: bigint
  readonly workerGenerationProgress: number
  readonly influence: GameDecimal
  readonly autoGather: boolean
}

export interface QuantumStateV2 {
  readonly availableShards: GameDecimal
  readonly lifetimeEarnedShards: GameDecimal
  readonly divisionsPurchased: bigint
  readonly permanentSecrets: bigint
  readonly influenceSpeedBonus: GameDecimal
  readonly cashBonusLevels: GameDecimal
  readonly scienceBonusLevels: GameDecimal
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

export interface AvocadoStateV2 {
  readonly unlocked: boolean
  readonly infinityPoints: GameDecimal
  readonly influence: GameDecimal
  readonly strangeMatter: GameDecimal
  readonly overflowMultiplier: GameDecimal
}

export interface TimelineStateV2 {
  readonly eventClockInitialized: boolean
  readonly automationTimeUntilNextEvent: number
  readonly dysonAutomationTargetIndex: number
  readonly researchAutomationTargetIndex: number
  readonly infinityBoundaryRemaining: number
  readonly infinityCycleSeconds: number
  readonly infinityCycleStartingPoints: GameDecimal
  readonly infinityHasPostResetStart: boolean
  readonly storedTimeAvailableSeconds: number
  readonly storedTimeCapacitySeconds: number
  readonly lastSuspendedAtLegacyText: string | null
  readonly doubleTime: {
    readonly unlocked: boolean
    readonly enabled: boolean
    readonly bankSeconds: number
    readonly rate: number
  }
}

export interface SecretProgressStateV2 {
  readonly completed: boolean
  readonly step: number
}

export interface DreamEducationStateV2 {
  readonly active: boolean
  readonly complete: boolean
  readonly progress: GameDecimal
  readonly researchTime: number
  readonly cost: GameDecimal
}

export interface DreamStateV2 {
  readonly resources: {
    readonly hunters: GameDecimal
    readonly gatherers: GameDecimal
    readonly community: GameDecimal
    readonly housing: GameDecimal
    readonly villages: GameDecimal
    readonly workers: GameDecimal
    readonly cities: GameDecimal
    readonly factories: GameDecimal
    readonly bots: GameDecimal
    readonly rockets: GameDecimal
    readonly energy: GameDecimal
    readonly spaceFactories: GameDecimal
    readonly dysonPanels: GameDecimal
    readonly railgunCharge: GameDecimal
    readonly solarPanels: GameDecimal
    readonly fusion: GameDecimal
    readonly swarmPanels: GameDecimal
  }
  readonly parameters: {
    readonly hunterCost: GameDecimal
    readonly gathererCost: GameDecimal
    readonly communityBoostCost: GameDecimal
    readonly communityBoostIsFree: boolean
    readonly communityBoostClock: number
    readonly communityBoostDuration: number
    readonly factoriesBoostCost: GameDecimal
    readonly factoriesBoostClock: number
    readonly factoriesBoostDuration: number
    readonly rocketsPerSpaceFactory: GameDecimal
    readonly railgunMaxCharge: GameDecimal
    readonly solarCost: GameDecimal
    readonly solarPanelGeneration: GameDecimal
    readonly fusionCost: GameDecimal
    readonly fusionGeneration: GameDecimal
    readonly swarmPanelGeneration: GameDecimal
  }
  readonly education: Readonly<
    Record<DreamEducationId, DreamEducationStateV2>
  >
  readonly timers: Readonly<Record<DreamTimerId, number>>
  readonly railgun: {
    readonly firing: boolean
    readonly fireProgress: number
    readonly pendingBaseSeconds: number
    readonly pendingDreamSeconds: number
    readonly shotsRemaining: number
    readonly activeRailguns: number
    readonly reservedPanels: GameDecimal
    readonly highestStoredPanels: GameDecimal
    readonly lastRoundsFired: number
    readonly lastPanelsLaunched: GameDecimal
  }
  readonly resetCount: bigint
  readonly strangeMatter: GameDecimal
  readonly disasterStage: bigint
  readonly upgrades: Readonly<Record<DreamUpgradeFlag, boolean>>
  readonly huntersPerPurchase: GameDecimal
  readonly gatherersPerPurchase: GameDecimal
}

export interface SimulationTotalsStateV2 {
  readonly ordinaryInfinityCount: bigint
  readonly breakInfinityCount: bigint
  readonly ordinaryInfinityPoints: GameDecimal
  readonly breakInfinityPoints: GameDecimal
  readonly botCapInfinityPoints: GameDecimal
  readonly botCapOverflowRewards: GameDecimal
  readonly meteorDreamResets: bigint
  readonly aiDreamResets: bigint
  readonly globalWarmingDreamResets: bigint
  readonly blackHoleDreamResets: bigint
  readonly strangeMatter: GameDecimal
  readonly realityWorkers: GameDecimal
  readonly automaticInfluence: GameDecimal
  readonly manualInfluence: GameDecimal
  readonly realityCapacityStallSeconds: number
  readonly simulatedSeconds: number
}

export interface StatisticsWindowStateV2 {
  readonly sequence: bigint
  readonly simulatedSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: GameDecimal
  readonly dreamResetCount: bigint
  readonly strangeMatter: GameDecimal
  readonly realityWorkers: GameDecimal
}

export interface SimulationStatisticsStateV2 {
  readonly trackedSinceUpdate: boolean
  readonly trackingStartedMarker: string
  readonly trackedSimulatedSeconds: number
  readonly lifetime: SimulationTotalsStateV2
  readonly currentQuantumRun: SimulationTotalsStateV2
  readonly recentProcessedSegment: SimulationTotalsStateV2
  readonly lastCompletedCycle: {
    readonly valid: boolean
    readonly breakInfinity: boolean
    readonly durationSeconds: number
    readonly reward: GameDecimal
    readonly dreamCause: CanonicalDreamResetCauseV2 | null
  }
  readonly minuteWindows: readonly StatisticsWindowStateV2[]
  readonly halfHourWindows: readonly StatisticsWindowStateV2[]
  readonly dailyWindows: readonly StatisticsWindowStateV2[]
}
