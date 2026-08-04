import type { DeepReadonly } from '../core/contracts'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { mappingCoverageManifest } from '../game-state/mappingCoverage'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
  DreamEducationId,
  DreamUpgradeFlag,
  DreamState,
  TimelineState,
} from '../game-state/types'
import {
  deriveAvocadoMultiplier,
  feedAllToAvocado,
  type AvocadoFeedSource,
  type AvocadoMultiplierBreakdown,
} from '../simulation/avocadoDomain'
import {
  AVOCADO_MEDITATION_SKILL_POINT_REWARD,
  completeCanonicalAvocadoMeditationStep,
} from '../simulation/avocadoMeditation'
import {
  applyCanonicalBlackHoleReset,
  applyCanonicalDreamReset,
} from '../simulation/canonicalDreamReset'
import {
  deriveBasicDysonState,
  type DerivedBasicDysonState,
  type DysonPresentationTuning,
  type DysonDerivationIssue,
  type DysonEntitlements,
} from '../simulation/canonicalDysonDerivation'
import {
  deriveCanonicalDreamDerivedFacts,
  type CanonicalDreamDerivedFactsResult,
} from '../simulation/canonicalDreamDerivedFacts'
import {
  isCanonicalMegaStructureVisible,
  previewCanonicalBasicFacilityPurchase,
  tryPurchaseCanonicalMegaStructure,
  type CanonicalBasicFacilityPurchasePreview,
} from '../simulation/canonicalDysonCommands'
import {
  availableCanonicalInfinityShopPoints,
  CANONICAL_INFINITY_SHOP_ITEM_IDS,
  purchaseCanonicalInfinityShopItem,
  type CanonicalInfinityShopItemId,
} from '../simulation/canonicalInfinityShop'
import {
  previewCanonicalSkillCatalog,
  type CanonicalSkillCatalogPreview,
} from '../simulation/canonicalSkillTransactions'
import {
  purchaseSimulationUpgrade,
  SIMULATION_UPGRADE_DEFINITIONS,
  startDreamEducation,
  findSimulationUpgradeCanonicalGaps,
} from '../simulation/dreamEducationUpgrades'
import {
  purchaseDreamFoundationalInformation,
  type DreamPurchaseCommand,
} from '../simulation/dreamFoundationalInformation'
import {
  DREAM_SPACE_AGE_CONSTANTS,
  purchaseDreamSpaceAge,
  type DreamSpaceAgePurchase,
} from '../simulation/dreamSpaceAge'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
} from '../simulation/dysonFacilities'
import {
  MEGA_STRUCTURE_IDS,
  type MegaStructureId,
} from '../simulation/megaStructurePurchases'
import {
  addDiscrete,
  divideContinuous,
  multiplyContinuous,
} from '../simulation/numeric'
import {
  projectBreakInfinityPresentationControl,
  projectInfinityProgress,
  type BreakInfinityPresentationControl,
  type InfinityProgressFacts,
} from '../simulation/infinityCycle'
import {
  availableQuantumPoints,
  findQuantumUpgradeCanonicalGaps,
  previewQuantumUpgradeSections,
  purchaseQuantumUpgrade,
  QUANTUM_CONSTANTS,
  QUANTUM_UPGRADE_DEFINITIONS,
  QUANTUM_UPGRADE_IDS,
  quantumUpgradeCost,
  type QuantumUpgradeId,
  type QuantumUpgradeSectionPreview,
} from '../simulation/quantumUpgrades'
import {
  findRealityUpgradeCanonicalGaps,
  purchaseRealityUpgrade,
  REALITY_UPGRADE_DEFINITIONS,
  REALITY_UPGRADE_IDS,
  type RealityUpgradeId,
} from '../simulation/realityUpgrades'
import {
  advanceRealityWorkers,
  gatherRealityInfluence,
  type RealityWorkerAdvanceStatus,
  type RealityWorkerTuning,
} from '../simulation/realityWorkers'
import {
  selectCanonicalTinkerUiFacts,
  type CanonicalTinkerUiFacts,
  type CanonicalTinkerRuntimeState,
} from '../simulation/canonicalTinker'
import { withCanonicalBotAllocation } from '../simulation/canonicalBotAllocation'
import {
  previewCanonicalResearchPurchase,
  selectCanonicalResearchPresentationFacts,
  UNITY_RESEARCH_PRESENTATION_ORDER,
  type CanonicalResearchPurchasePreview,
} from '../simulation/researchAutomation'
import {
  prepareDreamDoubleTimeTick,
  upgradeStoredTimeCapacity,
} from '../simulation/timeResources'
import {
  CANONICAL_PLAYER_COMMAND_KINDS,
  CANONICAL_PLAYER_COMMAND_SUPPORT,
  type CanonicalPlayerCommand,
  type CanonicalPlayerCommandKind,
} from './canonicalPlayerCommands'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import type {
  ApplicationCommandEnvelope,
  ApplicationRevision,
  ApplicationSnapshot,
  BlockingStartupOutcome,
  CheckpointState,
  ExclusiveOperation,
  ReadySource,
} from './contracts'

export const FRONTEND_GAMEPLAY_SNAPSHOT_VERSION = 1 as const

export const FRONTEND_COMMAND_FAMILIES = Object.freeze([
  'dyson',
  'research',
  'skill',
  'dream',
  'reality',
  'quantum',
  'infinity',
  'avocado',
  'time',
  'settings',
  'tinker',
] as const)

export type FrontendCommandFamily =
  (typeof FRONTEND_COMMAND_FAMILIES)[number]

const DREAM_FOUNDATIONAL_PURCHASES = Object.freeze([
  'hunters',
  'gatherers',
  'community-boost',
  'factories-boost',
] as const satisfies readonly DreamPurchaseCommand[])

const DREAM_SPACE_AGE_PURCHASES = Object.freeze([
  'solar',
  'fusion',
] as const satisfies readonly DreamSpaceAgePurchase[])

const DREAM_EDUCATION_IDS = Object.freeze([
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const satisfies readonly DreamEducationId[])

export const FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS =
  Object.freeze([
    'hunters',
    'gatherers',
    'community',
    'housing',
    'villages',
    'workers',
    'cities',
  ] as const)

export type FrontendSimulationFoundationalPanelId =
  (typeof FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS)[number]

export const FRONTEND_SIMULATION_INFORMATION_PANEL_IDS =
  Object.freeze([
    'engineering',
    'shipping',
    'world-trade',
    'world-peace',
    'mathematics',
    'advanced-physics',
    'factories',
    'bots',
    'rockets',
  ] as const)

export type FrontendSimulationInformationPanelId =
  (typeof FRONTEND_SIMULATION_INFORMATION_PANEL_IDS)[number]

export const FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS =
  Object.freeze([
    'solar',
    'fusion',
    'space-factories',
    'railguns',
    'swarm-stats',
  ] as const)

export type FrontendSimulationSpaceAgePanelId =
  (typeof FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS)[number]

const SIMULATION_UPGRADE_SECTIONS = Object.freeze({
  countermeasures: Object.freeze([
    'counterMeteor',
    'counterAi',
    'counterGw',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  education: Object.freeze([
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
  ] as const satisfies readonly DreamUpgradeFlag[]),
  foundational: Object.freeze([
    'hunter1',
    'hunter2',
    'hunter3',
    'hunter4',
    'gatherer1',
    'gatherer2',
    'gatherer3',
    'gatherer4',
    'workerBoost',
    'citiesBoost',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  information: Object.freeze([
    'factoriesBoost',
    'bots1',
    'bots2',
    'rockets1',
    'rockets2',
    'rockets3',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  spaceAge: Object.freeze([
    'sfacs1',
    'sfacs2',
    'sfacs3',
    'railguns1',
    'railguns2',
  ] as const satisfies readonly DreamUpgradeFlag[]),
})

const REALITY_UPGRADE_SECTIONS = Object.freeze({
  translation: Object.freeze(
    REALITY_UPGRADE_IDS.filter((id) => id.startsWith('translation')),
  ),
  speed: Object.freeze(
    REALITY_UPGRADE_IDS.filter((id) => id.startsWith('speed')),
  ),
  qualityOfLife: Object.freeze([
    'doubleTimeOwned',
    'workerAutoConvert',
  ] as const satisfies readonly RealityUpgradeId[]),
})

const AVOCADO_FEED_SOURCES = Object.freeze([
  'infinity-points',
  'influence',
  'strange-matter',
] as const satisfies readonly AvocadoFeedSource[])

type CommandSupportEntry =
  (typeof CANONICAL_PLAYER_COMMAND_SUPPORT)[CanonicalPlayerCommandKind]

type RequirementFromSupport<TSupport> =
  TSupport extends {
    readonly requires: readonly (infer TRequirement extends string)[]
  }
    ? TRequirement
    : never

export type FrontendCommandRequirement =
  RequirementFromSupport<CommandSupportEntry>

export type FrontendCommandRequirementReadiness = Readonly<
  Partial<Record<FrontendCommandRequirement, boolean>>
>

export type FrontendDefinitionDomain =
  | 'dream-upgrades'
  | 'quantum-upgrades'
  | 'reality-upgrades'

export interface FrontendDefinitionDomainCoverage {
  readonly complete: boolean
  readonly gaps: readonly string[]
}

export interface FrontendDefinitionCoverage {
  readonly complete: boolean
  readonly domains: Readonly<
    Record<FrontendDefinitionDomain, FrontendDefinitionDomainCoverage>
  >
}

export type FrontendCommandRouteStatus =
  | 'available'
  | 'definition-gap'
  | 'missing-runtime-requirement'
  | 'unsupported'

export interface FrontendCommandAvailability {
  readonly kind: CanonicalPlayerCommandKind
  readonly family: FrontendCommandFamily
  readonly supported: boolean
  /**
   * Means the backend route is present and its composition requirements are
   * available. It does not claim that a particular command payload is
   * affordable, unlocked, or otherwise eligible in the current game state.
   */
  readonly routeAvailable: boolean
  readonly status: FrontendCommandRouteStatus
  readonly authority: string
  readonly blocker: string | null
  readonly requirements: readonly FrontendCommandRequirement[]
  readonly missingRequirements: readonly FrontendCommandRequirement[]
  readonly definitionGaps: readonly string[]
}

export interface FrontendCommandFamilyAvailability {
  readonly family: FrontendCommandFamily
  readonly commandKinds: readonly CanonicalPlayerCommandKind[]
  readonly supportedCount: number
  readonly routeAvailableCount: number
}

export interface FrontendCommandAvailabilityIndex {
  readonly byKind: Readonly<
    Record<CanonicalPlayerCommandKind, FrontendCommandAvailability>
  >
  readonly byFamily: Readonly<
    Record<FrontendCommandFamily, FrontendCommandFamilyAvailability>
  >
}

export interface FrontendCanonicalResources {
  readonly dyson: {
    readonly money: number
    readonly science: number
    readonly bots: number
    readonly workers: number
    readonly researchers: number
  }
  readonly infinity: {
    readonly points: bigint
    readonly spentPoints: bigint
    readonly availablePoints: bigint
    readonly secretsOfTheUniverse: bigint
    readonly permanentSkillPoints: bigint
  }
  readonly skills: {
    readonly points: bigint
    readonly fragments: bigint
  }
  readonly reality: {
    readonly universeDesignationCount: bigint
    readonly workersReady: bigint
    readonly workerGenerationProgress: number
    readonly influence: bigint
  }
  readonly quantum: {
    readonly pointsEarned: bigint
    readonly pointsSpent: bigint
    readonly availablePoints: bigint
    readonly permanentSecrets: bigint
    readonly influenceSpeedBonus: bigint
    readonly cashBonusLevels: bigint
    readonly scienceBonusLevels: bigint
  }
  readonly avocado: {
    readonly infinityPoints: number
    readonly influence: number
    readonly strangeMatter: number
    readonly overflowMultiplier: number
  }
  readonly dream: DeepReadonly<DreamState['resources']> & {
    readonly strangeMatter: bigint
  }
  readonly time: {
    readonly storedTimeAvailableSeconds: number
    readonly storedTimeCapacitySeconds: number
    readonly doubleTimeBankSeconds: number
  }
}

type TimelineProgression = Omit<
  TimelineState,
  | 'storedTimeAvailableSeconds'
  | 'storedTimeCapacitySeconds'
  | 'doubleTime'
> & {
  readonly doubleTime: Omit<
    TimelineState['doubleTime'],
    'bankSeconds'
  >
}

export interface FrontendCanonicalProgression {
  readonly meta: DeepReadonly<CanonicalGameStateV1['meta']>
  readonly dyson: DeepReadonly<
    Omit<
      CanonicalGameStateV1['dyson'],
      'money' | 'science' | 'bots' | 'workers' | 'researchers'
    >
  >
  readonly infinity: DeepReadonly<
    Omit<
      CanonicalGameStateV1['infinity'],
      | 'points'
      | 'spentPoints'
      | 'secretsOfTheUniverse'
      | 'permanentSkillPoints'
    >
  >
  readonly skills: DeepReadonly<
    Omit<CanonicalGameStateV1['skills'], 'points' | 'fragments'>
  >
  readonly research: DeepReadonly<CanonicalGameStateV1['research']>
  readonly reality: DeepReadonly<
    Pick<CanonicalGameStateV1['reality'], 'autoGather'>
  >
  readonly quantum: DeepReadonly<
    Pick<
      CanonicalGameStateV1['quantum'],
      'divisionsPurchased' | 'unlocks'
    >
  >
  readonly avocado: DeepReadonly<
    Pick<CanonicalGameStateV1['avocado'], 'unlocked'>
  >
  readonly timeline: DeepReadonly<TimelineProgression>
  readonly secretProgress: DeepReadonly<
    CanonicalGameStateV1['secretProgress']
  >
  readonly dream: DeepReadonly<
    Omit<DreamState, 'resources' | 'strangeMatter'>
  >
  readonly statistics: DeepReadonly<
    CanonicalGameStateV1['statistics']
  >
}

export interface FrontendPersistenceReadiness {
  readonly mappingCoverageComplete: boolean
  readonly canonicalWriteAllowed: boolean
  readonly unmatchedWritePolicy: 'preserve-source'
}

export interface FrontendSnapshotContext {
  readonly runtimeRequirements?: FrontendCommandRequirementReadiness
  readonly dysonPresentationTuning?: Readonly<DysonPresentationTuning>
  readonly compatibilityTuning: Readonly<DysonCompatibilityTuning>
  readonly evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
  readonly entitlements: Readonly<DysonEntitlements>
  readonly tinker: Readonly<CanonicalTinkerRuntimeState>
  readonly realityWorkerTuning: Readonly<RealityWorkerTuning>
  /**
   * The event-time facade owns Quantum Leap preview because exact artifact
   * points and reset validation depend on its captured definitions/assets.
   */
  readonly quantumLeap: FrontendQuantumLeapPreview
  readonly storedTimeCheater: boolean
  readonly selectedSkillPresetSlot:
    CanonicalRuntimeState['selectedSkillPresetSlot']
  readonly previewDemand?: FrontendGameplayPreviewDemand
  readonly previousPreviews?: DeepReadonly<FrontendGameplayPreviews>
}

export type FrontendApplicationSnapshotContext = Pick<
  FrontendSnapshotContext,
  | 'runtimeRequirements'
  | 'dysonPresentationTuning'
  | 'quantumLeap'
  | 'realityWorkerTuning'
  | 'previewDemand'
  | 'previousPreviews'
>

export interface FrontendQuantumLeapPreview {
  readonly eligible: boolean
  readonly code: string
  readonly branch: 'reset' | 'entanglement' | null
  readonly artifactSkillPoints: bigint | null
  readonly definitionGap: string | null
}

export interface FrontendMegaStructurePurchasePreview {
  readonly facilityId: MegaStructureId
  readonly eligible: boolean
  readonly selectedQuantity: bigint
  readonly cost: number
  readonly code: string
  readonly definitionGap: string | null
}

export interface FrontendResearchCatalogPreview {
  readonly complete: boolean
  readonly issue: string | null
  readonly purchases: readonly CanonicalResearchPurchasePreview[]
  readonly cards: readonly FrontendResearchCardPreview[]
}

export interface FrontendResearchCardPreview
  extends CanonicalResearchPurchasePreview {
  readonly prerequisitesMet: boolean
  readonly visible: boolean
  readonly maxed: boolean
  readonly automationActive: boolean
  readonly effectKind: 'percentage' | 'panel-lifetime-seconds'
  readonly perLevelEffect: number
  readonly currentEffect: number
  readonly projectedEffect: number
  readonly passiveProgress: number
}

export interface FrontendInfinityShopPreview {
  readonly itemId: CanonicalInfinityShopItemId
  readonly eligible: boolean
  readonly cost: bigint
  readonly code: string
  readonly definitionGap: string | null
}

export interface FrontendDreamPurchasePreview<
  TPurchase extends string,
> {
  readonly purchase: TPurchase
  readonly eligible: boolean
  readonly cost: bigint
  readonly code: string
}

export interface FrontendDreamUpgradePreview {
  readonly upgradeId: DreamUpgradeFlag
  readonly eligible: boolean
  readonly cost: bigint
  readonly code: string
  readonly definitionGap: string | null
}

export interface FrontendDreamEducationPreview {
  readonly educationId: DreamEducationId
  readonly eligible: boolean
  readonly cost: number
  readonly code: string
}

export interface FrontendDreamResetPreview {
  readonly eligible: boolean
  readonly code: string
  readonly cause: string | null
  readonly requestedReward: bigint
  readonly definitionGaps: readonly string[]
}

export interface FrontendRealityUpgradePreview {
  readonly upgradeId: RealityUpgradeId
  readonly eligible: boolean
  readonly cost: bigint
  readonly code: string
  readonly definitionGap: string | null
}

export interface FrontendQuantumUpgradePreview {
  readonly upgradeId: QuantumUpgradeId
  readonly eligible: boolean
  readonly cost: bigint
  readonly code: string
  readonly definitionGap: string | null
}

export interface FrontendAvocadoFeedPreview {
  readonly source: AvocadoFeedSource
  readonly eligible: boolean
  readonly amount: bigint
  readonly code: string
}

export interface FrontendStoredCapacityPreview {
  readonly eligible: boolean
  readonly code: string
  readonly currentCapacitySeconds: number
  readonly nextCapacitySeconds: number
  readonly consumesStoredSeconds: number
}

export type FrontendDysonSwarmVisualizationFacts =
  | {
      readonly phase: 'stellar-swarm'
      readonly activePanels: number
      readonly completion: number
    }
  | {
      readonly phase: 'galaxy'
      readonly starsSurrounded: number
      readonly completion: number
    }
  | {
      readonly phase: 'galaxy-group'
      readonly galaxiesEngulfed: number
      readonly completion: number
    }

export interface FrontendDysonPresentationFacts {
  readonly activePanelMetric: {
    readonly kind:
      | 'active-panels'
      | 'stars-surrounded'
      | 'galaxies-engulfed'
    readonly value: number
  }
  readonly currentGoal:
    | {
        readonly kind:
          | 'create-bots'
          | 'build-assembly-lines'
          | 'have-active-panels'
          | 'own-planets'
          | 'decay-panels'
          | 'surround-stars'
          | 'engulf-galaxies'
          | 'reach-bots'
        readonly target: number
      }
  readonly swarmVisualization:
    FrontendDysonSwarmVisualizationFacts
  readonly facilities: Readonly<
    DerivedBasicDysonState['facilityFacts']
  >
}

export type FrontendDysonDerivedFacts =
  | {
      readonly status: 'ready'
      readonly value: Omit<
        DerivedBasicDysonState,
        'nextEvaluationSnapshot'
      > & {
        readonly presentation: FrontendDysonPresentationFacts
      }
    }
  | {
      readonly status: 'unavailable'
      readonly issues: readonly DysonDerivationIssue[]
    }

export interface FrontendRealityDerivedFacts {
  readonly status: RealityWorkerAdvanceStatus
  readonly generationPerSecond: number
  /** Unity's full-bar fast-generation presentation is projected canonically. */
  readonly workerGenerationFillFraction: number
  readonly workerBatchSize: bigint
  /** Unity labels the active batch with the next consumed universe number. */
  readonly nextUniverseDesignation: bigint
  /** Bounded Unity WorkerFillPercent equivalent for presentation controls. */
  readonly workerBatchFillFraction: number
  /**
   * Unity halts manual consumption at a full batch until Gather Influence is
   * accepted. Automatic gathering remains running at the same boundary.
   */
  readonly consumptionStatus: 'running' | 'halted'
  readonly autoGatherEnabled: boolean
  /** Display-only Artifact projection; the UI does not infer upgrade rules. */
  readonly artifact: {
    readonly replacements: readonly {
      readonly source: string
      readonly replacement: string
    }[]
    readonly progressLabel: 'undefined' | 'cpu-time'
    /** Unity character-scramble interval; null once Speed VIII stops it. */
    readonly scrambleIntervalSeconds: number | null
  }
}

export interface FrontendDreamDerivedFacts {
  /**
   * Production facts describe the current canonical 100 ms Dream interval.
   * The application prepares this multiplier from the saved Double Time state;
   * frontends must not infer or apply an additional multiplier.
   */
  readonly productionBasis: 'current-rate'
  readonly effectiveDoubleTimeMultiplier: number
  readonly result: CanonicalDreamDerivedFactsResult
}

export type FrontendSimulationEra =
  | 'foundational'
  | 'information'
  | 'space-age'

export interface FrontendSimulationsDerivedFacts {
  /** Highest live-production era reached in the current Simulation. */
  readonly currentEra: FrontendSimulationEra
  /**
   * Unity-authored live panel visibility. The frontend may arrange these
   * panels responsively, but must not infer unlocks from resource values.
   */
  readonly eras: {
    readonly foundational: {
      readonly visible: true
      readonly visiblePanelIds:
        readonly FrontendSimulationFoundationalPanelId[]
    }
    readonly information: {
      readonly visible: boolean
      readonly visiblePanelIds:
        readonly FrontendSimulationInformationPanelId[]
    }
    readonly spaceAge: {
      readonly visible: boolean
      readonly visiblePanelIds:
        readonly FrontendSimulationSpaceAgePanelId[]
    }
  }
  /** Canonical live values needed by the era panels. */
  readonly live: {
    readonly resources: DeepReadonly<DreamState['resources']>
    readonly education: DeepReadonly<DreamState['education']>
    readonly timers: DeepReadonly<DreamState['timers']>
    readonly railgun: DeepReadonly<DreamState['railgun']>
    readonly production: CanonicalDreamDerivedFactsResult
  }
  readonly resets: {
    readonly count: bigint
    readonly disasterStage: bigint
    readonly automatic: FrontendDreamResetPreview
    readonly blackHole: FrontendDreamResetPreview
  }
  /**
   * Unity's permanent ResearchManager panels. Only unowned panels whose
   * authored prerequisites are met are included; affordability remains in
   * the corresponding command preview.
   */
  readonly permanentUpgrades: {
    readonly simulationCategoryVisible: boolean
    readonly simulation: {
      readonly countermeasures: readonly DreamUpgradeFlag[]
      readonly education: readonly DreamUpgradeFlag[]
      readonly foundational: readonly DreamUpgradeFlag[]
      readonly information: readonly DreamUpgradeFlag[]
      readonly spaceAge: readonly DreamUpgradeFlag[]
    }
    readonly realityCategoryVisible: boolean
    readonly anomalyCategoryVisible: boolean
    readonly reality: {
      readonly translation: readonly RealityUpgradeId[]
      readonly speed: readonly RealityUpgradeId[]
      readonly qualityOfLife: readonly RealityUpgradeId[]
    }
  }
}

export type FrontendStoryChapterId =
  | 'chapter-1'
  | 'chapter-2'
  | 'chapter-3'
  | 'chapter-4'
  | 'chapter-5'
  | 'chapter-6'

export type FrontendStoryPassageId =
  | 'chapter-1-intro'
  | 'chapter-1-part-2'
  | 'chapter-1-part-3'
  | 'chapter-2-intro'
  | 'chapter-2-part-2'
  | 'chapter-2-part-3'
  | 'chapter-3-intro'
  | 'chapter-3-part-2'
  | 'chapter-4-intro'
  | 'chapter-4-part-2'
  | 'chapter-4-part-3'
  | 'chapter-4-part-4'
  | 'chapter-4-part-5'
  | 'chapter-4-part-6'
  | 'chapter-4-part-7'
  | 'chapter-4-part-8'
  | 'chapter-4-part-9'
  | 'chapter-4-part-10'
  | 'chapter-5-part-1'
  | 'chapter-5-part-2'
  | 'chapter-5-part-3'
  | 'chapter-5-part-4'
  | 'chapter-5-part-5'
  | 'chapter-6-translation'
  | 'chapter-6-speed'
  | 'chapter-6-complete'

/** Unity StoryManager visibility, projected without presentation copy. */
export interface FrontendStoryDerivedFacts {
  readonly visibleChapterIds: readonly FrontendStoryChapterId[]
  readonly visiblePassageIds: readonly FrontendStoryPassageId[]
  readonly avocatoEntryVisible: boolean
}

export interface FrontendGameplayDerivedFacts {
  readonly dyson: FrontendDysonDerivedFacts
  readonly dysonBotDistribution: {
    readonly workersFraction: number
    readonly scientistsFraction: number
  }
  readonly infinity: InfinityProgressFacts
  readonly dream: FrontendDreamDerivedFacts
  readonly simulations: FrontendSimulationsDerivedFacts
  readonly reality: FrontendRealityDerivedFacts
  readonly story: FrontendStoryDerivedFacts
  readonly avocado: AvocadoMultiplierBreakdown
}

export interface FrontendDysonVisibility {
  readonly showTinker: boolean
  readonly visibleBasicFacilityIds: readonly BasicDysonFacilityId[]
  readonly showNextTierTeaser: boolean
}

export interface FrontendGameplayVisibility {
  readonly dyson: FrontendDysonVisibility
  readonly skills: {
    readonly routeUnlocked: boolean
  }
  readonly infinity: {
    readonly routeUnlocked: boolean
  }
  readonly reality: {
    /**
     * Unity reveals the disabled Reality navigation panel after the first
     * Infinity Point, before the route itself is unlocked.
     */
    readonly routeVisible: boolean
    /**
     * WorkerService is the Unity authority: one Quantum Point or the complete
     * Secrets collection unlocks Reality.
     */
    readonly routeUnlocked: boolean
    readonly unlockProgress: {
      readonly currentSecrets: bigint
      readonly requiredSecrets: bigint
      readonly fraction: number
    }
  }
  readonly simulations: {
    /** Simulations appears with Reality and uses the same Unity unlock. */
    readonly routeUnlocked: boolean
  }
}

export type FrontendTinkerRuntimeFacts =
  | {
      readonly status: 'ready'
      readonly value: CanonicalTinkerUiFacts
    }
  | {
      readonly status: 'unavailable'
      readonly issues: readonly DysonDerivationIssue[]
    }

export interface FrontendRuntimeFacts {
  readonly tinker: FrontendTinkerRuntimeFacts
  readonly storedTimeCheater: boolean
  readonly selectedSkillPresetSlot:
    CanonicalRuntimeState['selectedSkillPresetSlot']
}

export interface FrontendGameplayPreviews {
  readonly dyson: {
    readonly basicFacilities:
      readonly CanonicalBasicFacilityPurchasePreview[]
    readonly megaStructures:
      readonly FrontendMegaStructurePurchasePreview[]
  }
  readonly research: FrontendResearchCatalogPreview
  readonly skills: CanonicalSkillCatalogPreview
  readonly dream: {
    readonly foundational:
      readonly FrontendDreamPurchasePreview<DreamPurchaseCommand>[]
    readonly spaceAge:
      readonly FrontendDreamPurchasePreview<DreamSpaceAgePurchase>[]
    readonly upgrades: readonly FrontendDreamUpgradePreview[]
    readonly education: readonly FrontendDreamEducationPreview[]
    readonly automaticReset: FrontendDreamResetPreview
    readonly blackHoleReset: FrontendDreamResetPreview
  }
  readonly reality: {
    readonly upgrades: readonly FrontendRealityUpgradePreview[]
    readonly gatherInfluence: {
      readonly eligible: boolean
      readonly amount: bigint
      readonly code: string
    }
  }
  readonly quantum: {
    readonly upgrades: readonly FrontendQuantumUpgradePreview[]
    readonly sections: readonly QuantumUpgradeSectionPreview[]
    readonly leap: FrontendQuantumLeapPreview
  }
  readonly infinity: {
    readonly shop: readonly FrontendInfinityShopPreview[]
    readonly breakTarget: BreakInfinityPresentationControl
  }
  readonly avocado: {
    readonly feeds: readonly FrontendAvocadoFeedPreview[]
    readonly meditation: {
      readonly eligible: boolean
      readonly requiredStepIndex: number | null
      readonly code: string
      readonly skillPointReward: bigint
    }
  }
  readonly time: {
    readonly doubleTimeRate: {
      readonly minimum: number
      readonly maximum: number
      readonly current: number
    }
    readonly storedCapacity: FrontendStoredCapacityPreview
    readonly storedSpend: {
      readonly maximumSeconds: number
      readonly commitFirstRequired: true
    }
  }
}

/**
 * Identifies the preview family visible on the current gameplay route.
 * `all` preserves the complete stateless selector contract for non-UI callers,
 * while `none` lets routes without purchase controls reuse the last projection.
 */
export type FrontendGameplayPreviewDemand =
  | 'all'
  | 'none'
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'reality'
  | 'simulations'
  | 'quantum'
  | 'avocato'
  | 'offline-time'

export interface FrontendGameplaySnapshot {
  readonly version: typeof FRONTEND_GAMEPLAY_SNAPSHOT_VERSION
  readonly modelVersion: CanonicalGameStateV1['modelVersion']
  readonly resources: DeepReadonly<FrontendCanonicalResources>
  readonly progression: DeepReadonly<FrontendCanonicalProgression>
  readonly derived: DeepReadonly<FrontendGameplayDerivedFacts>
  readonly visibility: DeepReadonly<FrontendGameplayVisibility>
  readonly runtime: DeepReadonly<FrontendRuntimeFacts>
  readonly commands: DeepReadonly<FrontendCommandAvailabilityIndex>
  readonly previews: DeepReadonly<FrontendGameplayPreviews>
  readonly definitionCoverage: DeepReadonly<FrontendDefinitionCoverage>
  readonly persistence: FrontendPersistenceReadiness
}

export type FrontendApplicationSnapshot =
  | {
      readonly version: typeof FRONTEND_GAMEPLAY_SNAPSHOT_VERSION
      readonly phase: 'idle' | 'starting'
    }
  | {
      readonly version: typeof FRONTEND_GAMEPLAY_SNAPSHOT_VERSION
      readonly phase: 'blocked'
      readonly outcome: BlockingStartupOutcome
      readonly error: string
    }
  | {
      readonly version: typeof FRONTEND_GAMEPLAY_SNAPSHOT_VERSION
      readonly phase: 'ready'
      readonly source: ReadySource
      readonly revision: ApplicationRevision
      readonly checkpoint: CheckpointState
      readonly operation: ExclusiveOperation
      readonly gameplay: FrontendGameplaySnapshot
    }

/**
 * Projects the complete application lifecycle envelope. A frontend receives
 * session, state, and durable revisions from this same read boundary as its
 * gameplay facts, so dispatch envelopes cannot be assembled from stale state.
 */
export function selectFrontendApplicationSnapshot(
  application: ApplicationSnapshot<CanonicalRuntimeState>,
  context: Readonly<FrontendApplicationSnapshotContext>,
  sourceOwnership: 'borrowed' | 'detached-frozen' = 'borrowed',
): DeepReadonly<FrontendApplicationSnapshot> {
  switch (application.phase) {
    case 'idle':
    case 'starting':
      return freezeFrontendProjection({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: application.phase,
      }, sourceOwnership)
    case 'blocked':
      return freezeFrontendProjection({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: application.phase,
        outcome: application.outcome,
        error: application.error,
      }, sourceOwnership)
    case 'ready':
      return freezeFrontendProjection({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: 'ready',
        source: application.source,
        revision: Object.freeze({ ...application.revision }),
        checkpoint: Object.freeze({ ...application.checkpoint }),
        operation: application.operation,
        gameplay: selectFrontendGameplaySnapshot(
          application.state.gameState as unknown as Readonly<CanonicalGameStateV1>,
          {
            runtimeRequirements: context.runtimeRequirements,
            compatibilityTuning:
              application.state.compatibilityTuning,
            evaluationSnapshot:
              application.state.evaluationSnapshot,
            entitlements: application.state.entitlements,
            tinker: application.state.tinker,
            realityWorkerTuning: context.realityWorkerTuning,
            dysonPresentationTuning:
              context.dysonPresentationTuning,
            quantumLeap: context.quantumLeap,
            storedTimeCheater:
              application.state.storedTimeCheater,
            selectedSkillPresetSlot:
              application.state.selectedSkillPresetSlot,
            previewDemand: context.previewDemand,
            previousPreviews: context.previousPreviews,
          },
          sourceOwnership,
        ),
      }, sourceOwnership)
  }
}

/**
 * Produces the presentation-neutral read model consumed by a future frontend.
 * The projection is detached and recursively frozen. It contains no labels,
 * formatted values, layout state, or inferred gameplay rules.
 */
export function selectFrontendGameplaySnapshot(
  source: Readonly<CanonicalGameStateV1>,
  context: Readonly<FrontendSnapshotContext>,
  sourceOwnership: 'borrowed' | 'detached-frozen' = 'borrowed',
): DeepReadonly<FrontendGameplaySnapshot> {
  const state =
    sourceOwnership === 'detached-frozen'
      ? source as CanonicalGameStateV1
      : structuredClone(source)
  const definitionCoverage = inspectFrontendDefinitionCoverage()
  const derived = selectDerivedFacts(state, context)
  const resources = selectResources(state, derived)
  const progression = selectProgression(state)
  const visibility = selectGameplayVisibility(state)
  const runtime = selectRuntimeFacts(state, context, derived)
  const requirements = {
    ...context.runtimeRequirements,
    'compatibility-tuning': true,
    'quantum-leap-port': true,
    'stored-time-cheater-carrier': true,
  }
  const commands = selectFrontendCommandAvailability(
    requirements,
    definitionCoverage,
  )
  const previews = selectGameplayPreviews(
    state,
    context,
    context.previousPreviews,
    context.previewDemand ?? 'all',
  )

  return freezeFrontendProjection({
    version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
    modelVersion: state.modelVersion,
    resources,
    progression,
    derived,
    visibility,
    runtime,
    commands,
    previews,
    definitionCoverage,
    persistence: {
      mappingCoverageComplete:
        mappingCoverageManifest.coverageComplete,
      canonicalWriteAllowed:
        mappingCoverageManifest.releaseCanonicalWriteAllowed,
      unmatchedWritePolicy:
        mappingCoverageManifest.unmatchedWritePolicy,
    },
  }, sourceOwnership)
}

function selectGameplayVisibility(
  state: CanonicalGameStateV1,
): FrontendGameplayVisibility {
  const total = (facilityId: CanonicalFacilityId) => {
    const owned = state.dyson.facilities[facilityId]
    return owned[0] + owned[1]
  }
  const facilities = state.dyson.facilities
  const basicVisible: Readonly<Record<BasicDysonFacilityId, boolean>> = {
    assembly_lines:
      state.dyson.bots >= 10 || total('assembly_lines') > 0,
    ai_managers:
      facilities.assembly_lines[1] >= 5 ||
      total('ai_managers') > 0,
    servers:
      facilities.ai_managers[1] >= 1 || total('servers') > 0,
    data_centers:
      total('servers') >= 1 || total('data_centers') > 0,
    planets:
      total('data_centers') >= 1 || total('planets') > 0,
  }
  const hasDataCenters = total('data_centers') >= 1
  const manualLabourOwned =
    state.skills.byId.manualLabour?.owned === true
  const earlyTinkerVisible =
    total('assembly_lines') < 10 ||
    facilities.ai_managers[1] < 1
  const galacticBrainsVisible =
    isCanonicalMegaStructureVisible(
      state,
      'galactic_brains',
    )
  const realityUnlocked =
    state.quantum.pointsEarned > 0n ||
    state.infinity.secretsOfTheUniverse >=
      QUANTUM_CONSTANTS.maximumSecrets

  return {
    dyson: {
      showTinker:
        (earlyTinkerVisible && !hasDataCenters) ||
        manualLabourOwned,
      visibleBasicFacilityIds: BASIC_DYSON_FACILITY_IDS.filter(
        (facilityId) => basicVisible[facilityId],
      ),
      showNextTierTeaser:
        state.quantum.pointsEarned >= 1n
          ? !galacticBrainsVisible
          : !basicVisible.planets,
    },
    skills: {
      routeUnlocked:
        state.dyson.bots >= 10 ||
        state.dyson.goalStage > 0n ||
        state.meta.firstInfinityComplete ||
        state.skills.points > 0n ||
        state.infinity.permanentSkillPoints > 0n ||
        state.infinity.points > 0n ||
        state.infinity.spentPoints > 0n ||
        Object.values(state.skills.byId).some(
          (skill) => skill.owned,
        ),
    },
    infinity: {
      routeUnlocked:
        state.meta.firstInfinityComplete ||
        state.infinity.points > 0n ||
        state.quantum.pointsEarned > 0n,
    },
    reality: {
      routeVisible:
        state.infinity.points > 0n ||
        state.quantum.pointsEarned > 0n,
      routeUnlocked: realityUnlocked,
      unlockProgress: {
        currentSecrets: state.infinity.secretsOfTheUniverse,
        requiredSecrets: QUANTUM_CONSTANTS.maximumSecrets,
        fraction: Math.min(
          1,
          divideContinuous(
            Number(state.infinity.secretsOfTheUniverse),
            Number(QUANTUM_CONSTANTS.maximumSecrets),
          ),
        ),
      },
    },
    simulations: {
      routeUnlocked: realityUnlocked,
    },
  }
}

/**
 * Captures revisions and a detached command in the application envelope used
 * for optimistic concurrency. Durable revision is intentionally not part of a
 * dispatch request.
 */
export function createFrontendCommandEnvelope(
  revision: Readonly<ApplicationRevision>,
  command: Readonly<CanonicalPlayerCommand>,
): DeepReadonly<ApplicationCommandEnvelope<CanonicalPlayerCommand>> {
  assertRevision('session', revision.session)
  assertRevision('state', revision.state)
  if (!hasCommandKind(command.kind)) {
    throw new Error(`Unknown canonical command kind '${command.kind}'.`)
  }
  return deepFreeze({
    sessionRevision: revision.session,
    expectedStateRevision: revision.state,
    command: structuredClone(command),
  })
}

/**
 * Reads definition coverage without allowing a malformed catalog to produce
 * optimistic frontend availability.
 */
export function inspectFrontendDefinitionCoverage():
  DeepReadonly<FrontendDefinitionCoverage> {
  cachedDefinitionCoverage ??= inspectFrontendDefinitionCoverageOnce()
  return cachedDefinitionCoverage
}

let cachedDefinitionCoverage:
  | DeepReadonly<FrontendDefinitionCoverage>
  | undefined

function inspectFrontendDefinitionCoverageOnce():
  DeepReadonly<FrontendDefinitionCoverage> {
  const domains = {
    'dream-upgrades': inspectDefinitionDomain(
      findSimulationUpgradeCanonicalGaps,
    ),
    'quantum-upgrades': inspectDefinitionDomain(
      findQuantumUpgradeCanonicalGaps,
    ),
    'reality-upgrades': inspectDefinitionDomain(
      findRealityUpgradeCanonicalGaps,
    ),
  }
  return deepFreeze({
    complete: Object.values(domains).every(
      (coverage) => coverage.complete,
    ),
    domains,
  })
}

function selectResources(
  state: CanonicalGameStateV1,
  derived: Readonly<FrontendGameplayDerivedFacts>,
): FrontendCanonicalResources {
  const allocation =
    derived.dyson.status === 'ready'
      ? derived.dyson.value.allocation
      : state.dyson
  return {
    dyson: {
      money: state.dyson.money,
      science: state.dyson.science,
      bots: state.dyson.bots,
      workers: allocation.workers,
      researchers: allocation.researchers,
    },
    infinity: {
      points: state.infinity.points,
      spentPoints: state.infinity.spentPoints,
      availablePoints: availableCanonicalInfinityShopPoints(state),
      secretsOfTheUniverse: state.infinity.secretsOfTheUniverse,
      permanentSkillPoints: state.infinity.permanentSkillPoints,
    },
    skills: {
      points: state.skills.points,
      fragments: state.skills.fragments,
    },
    reality: {
      universeDesignationCount:
        state.reality.universeDesignationCount,
      workersReady: state.reality.workersReady,
      workerGenerationProgress:
        state.reality.workerGenerationProgress,
      influence: state.reality.influence,
    },
    quantum: {
      pointsEarned: state.quantum.pointsEarned,
      pointsSpent: state.quantum.pointsSpent,
      availablePoints: availableQuantumPoints(state),
      permanentSecrets: state.quantum.permanentSecrets,
      influenceSpeedBonus: state.quantum.influenceSpeedBonus,
      cashBonusLevels: state.quantum.cashBonusLevels,
      scienceBonusLevels: state.quantum.scienceBonusLevels,
    },
    avocado: {
      infinityPoints: state.avocado.infinityPoints,
      influence: state.avocado.influence,
      strangeMatter: state.avocado.strangeMatter,
      overflowMultiplier: state.avocado.overflowMultiplier,
    },
    dream: {
      ...state.dream.resources,
      strangeMatter: state.dream.strangeMatter,
    },
    time: {
      storedTimeAvailableSeconds:
        state.timeline.storedTimeAvailableSeconds,
      storedTimeCapacitySeconds:
        state.timeline.storedTimeCapacitySeconds,
      doubleTimeBankSeconds: state.timeline.doubleTime.bankSeconds,
    },
  }
}

function selectProgression(
  state: CanonicalGameStateV1,
): FrontendCanonicalProgression {
  return {
    meta: state.meta,
    dyson: {
      facilities: state.dyson.facilities,
      manualCreationIntervalSeconds:
        state.dyson.manualCreationIntervalSeconds,
      totalPanelsDecayed: state.dyson.totalPanelsDecayed,
      goalStage: state.dyson.goalStage,
      botDistribution: state.dyson.botDistribution,
      automation: state.dyson.automation,
    },
    infinity: {
      breakTarget: state.infinity.breakTarget,
      inProgress: state.infinity.inProgress,
      botCapTransitionPending:
        state.infinity.botCapTransitionPending,
      botCapRewardsGranted: state.infinity.botCapRewardsGranted,
      lastCycleDurationSeconds:
        state.infinity.lastCycleDurationSeconds,
      lastPointsGained: state.infinity.lastPointsGained,
      storedTimeUsedThisCycleSeconds:
        state.infinity.storedTimeUsedThisCycleSeconds,
      storedTimeUsedPreviousCycleSeconds:
        state.infinity.storedTimeUsedPreviousCycleSeconds,
      retainedFacilities: state.infinity.retainedFacilities,
      automationUnlocked: state.infinity.automationUnlocked,
    },
    skills: {
      byId: state.skills.byId,
      activeAutoAssignment: state.skills.activeAutoAssignment,
      presets: state.skills.presets,
      autoAssignNonRefundable:
        state.skills.autoAssignNonRefundable,
      tabPresetAutomation:
        state.skills.tabPresetAutomation,
    },
    research: state.research,
    reality: {
      autoGather: state.reality.autoGather,
    },
    quantum: {
      divisionsPurchased: state.quantum.divisionsPurchased,
      unlocks: state.quantum.unlocks,
    },
    avocado: {
      unlocked: state.avocado.unlocked,
    },
    timeline: {
      eventClockInitialized: state.timeline.eventClockInitialized,
      automationTimeUntilNextEvent:
        state.timeline.automationTimeUntilNextEvent,
      dysonAutomationTargetIndex:
        state.timeline.dysonAutomationTargetIndex,
      researchAutomationTargetIndex:
        state.timeline.researchAutomationTargetIndex,
      infinityBoundaryRemaining:
        state.timeline.infinityBoundaryRemaining,
      infinityCycleSeconds: state.timeline.infinityCycleSeconds,
      infinityCycleStartingPoints:
        state.timeline.infinityCycleStartingPoints,
      infinityHasPostResetStart:
        state.timeline.infinityHasPostResetStart,
      lastSuspendedAtLegacyText:
        state.timeline.lastSuspendedAtLegacyText,
      doubleTime: {
        unlocked: state.timeline.doubleTime.unlocked,
        enabled: state.timeline.doubleTime.enabled,
        rate: state.timeline.doubleTime.rate,
      },
    },
    secretProgress: state.secretProgress,
    dream: {
      parameters: state.dream.parameters,
      education: state.dream.education,
      timers: state.dream.timers,
      railgun: state.dream.railgun,
      resetCount: state.dream.resetCount,
      disasterStage: state.dream.disasterStage,
      upgrades: state.dream.upgrades,
      huntersPerPurchase: state.dream.huntersPerPurchase,
      gatherersPerPurchase: state.dream.gatherersPerPurchase,
    },
    statistics: state.statistics,
  }
}

function selectDerivedFacts(
  state: CanonicalGameStateV1,
  context: Readonly<FrontendSnapshotContext>,
): FrontendGameplayDerivedFacts {
  const synchronizedState = withCanonicalBotAllocation(state)
  const dyson = deriveBasicDysonState(
    synchronizedState,
    context.compatibilityTuning,
    context.entitlements,
    context.evaluationSnapshot,
    context.dysonPresentationTuning,
  )
  const reality = advanceRealityWorkers(
    state,
    0,
    context.realityWorkerTuning,
  )
  const doubleTimeTick = prepareDreamDoubleTimeTick(
    state.timeline.doubleTime.unlocked,
    state.timeline.doubleTime.bankSeconds,
    state.timeline.doubleTime.rate,
    DREAM_SPACE_AGE_CONSTANTS.tickSeconds,
  )
  const dream = deriveCanonicalDreamDerivedFacts(state, {
    effectiveDoubleTimeMultiplier: doubleTimeTick.effectiveMultiplier,
    doubleTimeActive: doubleTimeTick.active,
    doubleTimeRate: doubleTimeTick.rate,
  })
  const simulations = selectFrontendSimulationsDerivedFacts(
    state,
    dream,
  )

  return {
    dyson: dyson.ok
      ? {
          status: 'ready',
          value: projectDysonDerivedFacts(
            dyson.value,
            state.dyson.goalStage,
          ),
        }
        : {
          status: 'unavailable',
          issues: dyson.issues,
        },
    dysonBotDistribution:
      state.quantum.unlocks.botMultitasking
        ? {
            workersFraction: 1,
            scientistsFraction: 1,
          }
        : {
            workersFraction: 1 - state.dyson.botDistribution,
            scientistsFraction: state.dyson.botDistribution,
          },
    infinity: projectInfinityProgress({
      bots: state.dyson.bots,
      totalInfinityPoints: state.infinity.points,
      divisionsPurchased: state.quantum.divisionsPurchased,
      breakTheLoop: state.quantum.unlocks.breakTheLoop,
      breakTarget: state.infinity.breakTarget,
      permanentDoubleIp: context.entitlements.permanentDoubleIp,
      quantumDoubleIp:
        state.quantum.unlocks.doubleInfinityPoints,
    }),
    dream: {
      productionBasis: 'current-rate',
      effectiveDoubleTimeMultiplier: doubleTimeTick.effectiveMultiplier,
      result: dream,
    },
    simulations,
    reality: {
      status: reality.status,
      generationPerSecond: reality.generationPerSecond,
      workerGenerationFillFraction:
        reality.status === 'success'
          ? reality.generationPerSecond >= 10
            ? 1
            : Math.min(
                1,
                Math.max(
                  0,
                  reality.state.reality.workerGenerationProgress,
                ),
              )
          : 0,
      workerBatchSize: context.realityWorkerTuning.workerBatchSize,
      nextUniverseDesignation: addDiscrete(
        state.reality.universeDesignationCount,
        1n,
      ),
      workerBatchFillFraction:
        reality.status === 'success'
          ? Math.min(
              1,
              divideContinuous(
                Number(reality.state.reality.workersReady),
                Number(context.realityWorkerTuning.workerBatchSize),
              ),
            )
          : 0,
      consumptionStatus:
        reality.status === 'success' &&
        !state.reality.autoGather &&
        reality.state.reality.workersReady >=
          context.realityWorkerTuning.workerBatchSize
          ? 'halted'
          : 'running',
      autoGatherEnabled: state.reality.autoGather,
      artifact: projectRealityArtifact(state.dream.upgrades),
    },
    story: projectFrontendStoryDerivedFacts(
      state,
      dyson.ok
        ? multiplyContinuous(
            dyson.value.globals.panelsPerSecond,
            dyson.value.globals.panelLifetimeSeconds,
          )
        : 0,
    ),
    avocado: deriveAvocadoMultiplier(state),
  }
}

/**
 * Mirrors StoryManager.Update. Passage order stays Unity-authored while the
 * Web Story surface owns only grouping, copy and disclosure preferences.
 */
export function projectFrontendStoryDerivedFacts(
  state: Readonly<CanonicalGameStateV1>,
  activePanels: number,
): FrontendStoryDerivedFacts {
  const infinityPoints = state.infinity.points
  const quantumLeapComplete = state.quantum.pointsEarned >= 1n
  const infinityComplete = infinityPoints >= 1n
  const eitherResetComplete =
    infinityComplete || quantumLeapComplete
  const realityUnlocked =
    quantumLeapComplete ||
    state.infinity.secretsOfTheUniverse >=
      QUANTUM_CONSTANTS.maximumSecrets
  const starsSurrounded =
    activePanels / PANELS_PER_SURROUNDED_STAR
  const galaxiesEngulfed =
    starsSurrounded / STARS_PER_ENGULFED_GALAXY
  const hasManualManager =
    state.dyson.facilities.ai_managers[1] >= 1
  const hasManualServer =
    state.dyson.facilities.servers[1] >= 1
  const chapter2Visible =
    hasManualManager || eitherResetComplete
  const chapter3Visible =
    galaxiesEngulfed >= 1 || eitherResetComplete
  const chapter4Visible = eitherResetComplete
  const translationComplete =
    state.dream.upgrades.translation8
  const speedComplete = state.dream.upgrades.speed8
  const visibleChapterIds: FrontendStoryChapterId[] = [
    'chapter-1',
  ]
  const visiblePassageIds: FrontendStoryPassageId[] = [
    'chapter-1-intro',
  ]

  if (state.dyson.goalStage >= 1n || eitherResetComplete) {
    visiblePassageIds.push(
      'chapter-1-part-2',
      'chapter-1-part-3',
    )
  }
  if (chapter2Visible) {
    visibleChapterIds.push('chapter-2')
    visiblePassageIds.push('chapter-2-intro')
  }
  if (hasManualServer || eitherResetComplete) {
    visiblePassageIds.push('chapter-2-part-2')
  }
  if (starsSurrounded >= 1 || eitherResetComplete) {
    visiblePassageIds.push('chapter-2-part-3')
  }
  if (chapter3Visible) {
    visibleChapterIds.push('chapter-3')
    visiblePassageIds.push('chapter-3-intro')
  }
  if (eitherResetComplete) {
    visiblePassageIds.push('chapter-3-part-2')
  }
  if (chapter4Visible) {
    visibleChapterIds.push('chapter-4')
    visiblePassageIds.push(
      'chapter-4-intro',
      'chapter-4-part-2',
    )
  }
  const chapter4ThresholdPassages = [
    'chapter-4-part-3',
    'chapter-4-part-4',
    'chapter-4-part-5',
    'chapter-4-part-6',
    'chapter-4-part-7',
    'chapter-4-part-8',
    'chapter-4-part-9',
    'chapter-4-part-10',
  ] as const
  chapter4ThresholdPassages.forEach((passageId, index) => {
    if (infinityPoints >= BigInt(index + 2) || quantumLeapComplete) {
      visiblePassageIds.push(passageId)
    }
  })
  if (realityUnlocked) {
    visibleChapterIds.push('chapter-5')
    visiblePassageIds.push(
      'chapter-5-part-1',
      'chapter-5-part-2',
      'chapter-5-part-3',
      'chapter-5-part-4',
      'chapter-5-part-5',
    )
  }
  if (translationComplete) {
    visibleChapterIds.push('chapter-6')
    visiblePassageIds.push('chapter-6-translation')
  }
  if (speedComplete) {
    visiblePassageIds.push('chapter-6-speed')
  }
  if (translationComplete && speedComplete) {
    visiblePassageIds.push('chapter-6-complete')
  }

  return {
    visibleChapterIds,
    visiblePassageIds,
    avocatoEntryVisible:
      infinityPoints >= 2n || quantumLeapComplete,
  }
}

function projectDysonDerivedFacts(
  source: Readonly<DerivedBasicDysonState>,
  goalStage: bigint,
): Omit<DerivedBasicDysonState, 'nextEvaluationSnapshot'> & {
  readonly presentation: FrontendDysonPresentationFacts
} {
  const activePanels = multiplyContinuous(
    source.globals.panelsPerSecond,
    source.globals.panelLifetimeSeconds,
  )
  const swarmVisualization =
    projectDysonSwarmVisualization(activePanels)
  const activePanelMetric =
    activePanels < PANELS_PER_SURROUNDED_STAR
      ? {
          kind: 'active-panels' as const,
          value: activePanels,
        }
      : activePanels / PANELS_PER_SURROUNDED_STAR <
          STARS_PER_ENGULFED_GALAXY
        ? {
            kind: 'stars-surrounded' as const,
            value: activePanels / PANELS_PER_SURROUNDED_STAR,
          }
        : {
            kind: 'galaxies-engulfed' as const,
            value:
              activePanels /
              PANELS_PER_SURROUNDED_STAR /
              STARS_PER_ENGULFED_GALAXY,
          }
  return {
    allocation: source.allocation,
    globals: source.globals,
    auxiliary: source.auxiliary,
    facilityModifiers: source.facilityModifiers,
    facilityFacts: source.facilityFacts,
    rates: source.rates,
    megaRates: source.megaRates,
    productionArrivalRates: source.productionArrivalRates,
    presentation: {
      activePanelMetric,
      swarmVisualization,
      currentGoal: projectDysonGoal(goalStage),
      facilities: source.facilityFacts,
    },
    entitlements: source.entitlements,
  }
}

function projectRealityArtifact(
  upgrades: Readonly<DreamState['upgrades']>,
): FrontendRealityDerivedFacts['artifact'] {
  const replacements: Array<{
    readonly source: string
    readonly replacement: string
  }> = []
  if (!upgrades.translation1) replacements.push({ source: 'i', replacement: '|' })
  if (!upgrades.translation2) replacements.push({ source: 'r', replacement: '}' })
  if (!upgrades.translation3) replacements.push({ source: 'e', replacement: '%' })
  if (!upgrades.translation4) replacements.push({ source: 'f', replacement: '$' })
  if (!upgrades.translation5) replacements.push({ source: 'c', replacement: '{' })
  if (!upgrades.translation6) replacements.push({ source: 'h', replacement: '*' })
  if (!upgrades.translation7) {
    replacements.push(
      { source: 'a', replacement: '@' },
      { source: 'A', replacement: '#' },
    )
  }
  if (!upgrades.translation8) {
    replacements.push(
      { source: 't', replacement: '^' },
      { source: 'T', replacement: '&' },
    )
  }
  const scrambleTicksPerSecond = upgrades.speed8
    ? null
    : upgrades.speed7
      ? 6
      : upgrades.speed6
        ? 15
        : upgrades.speed5
          ? 30
          : upgrades.speed4
            ? 42
            : upgrades.speed3
              ? 48
              : upgrades.speed2
                ? 54
                : upgrades.speed1
                  ? 57
                  : 60
  return {
    replacements,
    progressLabel: upgrades.speed8 ? 'cpu-time' : 'undefined',
    scrambleIntervalSeconds:
      scrambleTicksPerSecond === null
        ? null
        : 1 / scrambleTicksPerSecond,
  }
}

function selectFrontendSimulationsDerivedFacts(
  state: CanonicalGameStateV1,
  production: CanonicalDreamDerivedFactsResult,
): FrontendSimulationsDerivedFacts {
  const resources = state.dream.resources
  const education = state.dream.education
  const informationVisible = resources.cities >= 1
  const spaceAgeVisible = resources.spaceFactories >= 1

  const foundationalPanels =
    FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS.filter((panelId) => {
      switch (panelId) {
        case 'hunters':
        case 'gatherers':
          return true
        case 'community':
          return resources.hunters >= 1n || resources.gatherers >= 1n
        case 'housing':
          return (
            resources.housing >= 1 ||
            resources.villages >= 1 ||
            resources.cities >= 1
          )
        case 'villages':
          return resources.villages >= 1 || resources.cities >= 1
        case 'workers':
          return resources.workers >= 1
        case 'cities':
          return resources.cities >= 1
      }
    })

  const informationPanels = informationVisible
    ? FRONTEND_SIMULATION_INFORMATION_PANEL_IDS.filter((panelId) => {
        switch (panelId) {
          case 'engineering':
            return true
          case 'shipping':
            return education.engineering.complete
          case 'world-trade':
            return education.shipping.complete
          case 'world-peace':
            return education.worldTrade.complete
          case 'mathematics':
            return (
              resources.rockets >= 1 ||
              resources.spaceFactories >= 1
            )
          case 'advanced-physics':
            return (
              education.mathematics.complete &&
              resources.spaceFactories >= 1
            )
          case 'factories':
            return education.engineering.complete
          case 'bots':
            return resources.bots >= 1
          case 'rockets':
            return (
              resources.rockets >= 1 ||
              resources.spaceFactories >= 1
            )
        }
      })
    : []

  const spaceAgePanels = spaceAgeVisible
    ? FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS.filter((panelId) => {
        switch (panelId) {
          case 'solar':
          case 'space-factories':
            return true
          case 'fusion':
            return education.advancedPhysics.complete
          case 'railguns':
            return (
              education.mathematics.complete ||
              resources.dysonPanels >= 1n
            )
          case 'swarm-stats':
            return resources.swarmPanels >= 1n
        }
      })
    : []

  const visibleSimulationUpgrades = (
    upgradeIds: readonly DreamUpgradeFlag[],
  ) =>
    upgradeIds.filter((upgradeId) =>
      isSimulationUpgradePanelVisible(state, upgradeId),
    )
  const simulationUpgradeSections = {
    countermeasures: visibleSimulationUpgrades(
      SIMULATION_UPGRADE_SECTIONS.countermeasures,
    ),
    education: visibleSimulationUpgrades(
      SIMULATION_UPGRADE_SECTIONS.education,
    ),
    foundational: visibleSimulationUpgrades(
      SIMULATION_UPGRADE_SECTIONS.foundational,
    ),
    information: visibleSimulationUpgrades(
      SIMULATION_UPGRADE_SECTIONS.information,
    ),
    spaceAge: visibleSimulationUpgrades(
      SIMULATION_UPGRADE_SECTIONS.spaceAge,
    ),
  }

  const visibleRealityUpgrades = (
    upgradeIds: readonly RealityUpgradeId[],
  ) =>
    upgradeIds.filter((upgradeId) =>
      isRealityUpgradePanelVisible(state, upgradeId),
    )
  const realityUpgradeSections = {
    translation: visibleRealityUpgrades(
      REALITY_UPGRADE_SECTIONS.translation,
    ),
    speed: visibleRealityUpgrades(REALITY_UPGRADE_SECTIONS.speed),
    qualityOfLife: visibleRealityUpgrades(
      REALITY_UPGRADE_SECTIONS.qualityOfLife,
    ),
  }

  const simulationCategoryVisible = Object.values(
    simulationUpgradeSections,
  ).some((upgradeIds) => upgradeIds.length > 0)
  const translationVisible =
    realityUpgradeSections.translation.length > 0
  const speedVisible = realityUpgradeSections.speed.length > 0
  const qualityOfLifeVisible =
    realityUpgradeSections.qualityOfLife.length > 0

  return {
    currentEra: spaceAgeVisible
      ? 'space-age'
      : informationVisible
        ? 'information'
        : 'foundational',
    eras: {
      foundational: {
        visible: true,
        visiblePanelIds: foundationalPanels,
      },
      information: {
        visible: informationVisible,
        visiblePanelIds: informationPanels,
      },
      spaceAge: {
        visible: spaceAgeVisible,
        visiblePanelIds: spaceAgePanels,
      },
    },
    live: {
      resources,
      education,
      timers: state.dream.timers,
      railgun: state.dream.railgun,
      production,
    },
    resets: {
      count: state.dream.resetCount,
      disasterStage: state.dream.disasterStage,
      automatic: previewDreamReset(
        applyCanonicalDreamReset(state, { kind: 'automatic' }),
      ),
      blackHole: previewDreamReset(
        applyCanonicalBlackHoleReset(state),
      ),
    },
    permanentUpgrades: {
      simulationCategoryVisible,
      simulation: simulationUpgradeSections,
      realityCategoryVisible:
        translationVisible || speedVisible || qualityOfLifeVisible,
      anomalyCategoryVisible: translationVisible || speedVisible,
      reality: realityUpgradeSections,
    },
  }
}

function isSimulationUpgradePanelVisible(
  state: CanonicalGameStateV1,
  upgradeId: DreamUpgradeFlag,
): boolean {
  const code = purchaseSimulationUpgrade(state, upgradeId).code
  return (
    code !== 'unknown_upgrade' &&
    code !== 'already_owned' &&
    code !== 'prerequisites_not_met'
  )
}

function isRealityUpgradePanelVisible(
  state: CanonicalGameStateV1,
  upgradeId: RealityUpgradeId,
): boolean {
  const code = purchaseRealityUpgrade(state, upgradeId).code
  return (
    code !== 'unknown_upgrade' &&
    code !== 'missing_definition' &&
    code !== 'invalid_definition' &&
    code !== 'invalid_state' &&
    code !== 'already_owned' &&
    code !== 'prerequisites_not_met'
  )
}

const PANELS_PER_SURROUNDED_STAR = 20_000
const STARS_PER_ENGULFED_GALAXY = 100_000_000_000
const MAX_VISUAL_GALAXIES_AT_E308_BOTS = 5e291
const GALAXY_GROUP_FRONT_LOAD_POWER = 0.72

/**
 * Converts the canonical active-panel magnitude into bounded visual phases.
 * The renderer receives progress facts only and never owns scale thresholds.
 */
export function projectDysonSwarmVisualization(
  activePanels: number,
): FrontendDysonSwarmVisualizationFacts {
  const starsSurrounded =
    activePanels / PANELS_PER_SURROUNDED_STAR
  if (starsSurrounded < 1) {
    return {
      phase: 'stellar-swarm',
      activePanels,
      completion: clampUnitInterval(starsSurrounded),
    }
  }

  const galaxiesEngulfed =
    starsSurrounded / STARS_PER_ENGULFED_GALAXY
  if (galaxiesEngulfed < 1) {
    return {
      phase: 'galaxy',
      starsSurrounded,
      completion: clampUnitInterval(galaxiesEngulfed),
    }
  }

  return {
    phase: 'galaxy-group',
    galaxiesEngulfed,
    completion:
      projectGalaxyGroupVisualCompletion(galaxiesEngulfed),
  }
}

function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Compresses the post-galaxy display across the baseline range from one
 * engulfed galaxy to the approximate count supported by 1e308 Worker Bots.
 * The exponent gently front-loads visible change while retaining progression
 * through extreme late-game magnitudes.
 */
function projectGalaxyGroupVisualCompletion(
  galaxiesEngulfed: number,
): number {
  if (!Number.isFinite(galaxiesEngulfed)) return 1
  if (galaxiesEngulfed <= 1) return 0
  const logarithmicProgress =
    Math.log10(galaxiesEngulfed) /
    Math.log10(MAX_VISUAL_GALAXIES_AT_E308_BOTS)
  return Math.pow(
    clampUnitInterval(logarithmicProgress),
    GALAXY_GROUP_FRONT_LOAD_POWER,
  )
}

function projectDysonGoal(
  goalStage: bigint,
): FrontendDysonPresentationFacts['currentGoal'] {
  switch (goalStage) {
    case 0n:
      return { kind: 'create-bots', target: 10 }
    case 1n:
      return { kind: 'build-assembly-lines', target: 5 }
    case 2n:
      return { kind: 'have-active-panels', target: 20_000 }
    case 3n:
      return { kind: 'own-planets', target: 20 }
    case 4n:
      return { kind: 'decay-panels', target: 1_000_000_000_000 }
    case 5n:
      return { kind: 'surround-stars', target: 1_000_000_000 }
    case 6n:
      return { kind: 'surround-stars', target: 10_000_000_000 }
    case 7n:
      return { kind: 'engulf-galaxies', target: 1 }
    case 8n:
      return { kind: 'engulf-galaxies', target: 10 }
    case 9n:
      return { kind: 'engulf-galaxies', target: 100 }
    default:
      return { kind: 'reach-bots', target: 42_000_000_000_000_000_000 }
  }
}

function selectRuntimeFacts(
  state: CanonicalGameStateV1,
  context: Readonly<FrontendSnapshotContext>,
  derived: Readonly<FrontendGameplayDerivedFacts>,
): FrontendRuntimeFacts {
  return {
    storedTimeCheater: context.storedTimeCheater,
    selectedSkillPresetSlot: context.selectedSkillPresetSlot,
    tinker:
      derived.dyson.status === 'ready'
        ? {
            status: 'ready',
            value: selectCanonicalTinkerUiFacts(
              state,
              context.tinker,
              derived.dyson.value.auxiliary.tinkerAssemblyYield,
            ),
          }
        : {
            status: 'unavailable',
            issues: derived.dyson.issues,
          },
  }
}

function selectGameplayPreviews(
  state: CanonicalGameStateV1,
  context: Readonly<FrontendSnapshotContext>,
  previous: DeepReadonly<FrontendGameplayPreviews> | undefined,
  demand: FrontendGameplayPreviewDemand,
): FrontendGameplayPreviews {
  return {
    dyson:
      previous === undefined || demand === 'all' || demand === 'bots'
        ? selectDysonPreviews(state)
        : previous.dyson,
    research:
      previous === undefined ||
      demand === 'all' ||
      demand === 'research'
        ? previewResearchCatalog(state, context.compatibilityTuning)
        : previous.research,
    skills:
      previous === undefined || demand === 'all' || demand === 'skills'
        ? previewCanonicalSkillCatalog(state)
        : previous.skills,
    dream:
      previous === undefined ||
      demand === 'all' ||
      demand === 'simulations' ||
      demand === 'reality'
        ? selectDreamPreviews(state)
        : previous.dream,
    reality:
      previous === undefined ||
      demand === 'all' ||
      demand === 'reality'
        ? selectRealityPreviews(state, context.realityWorkerTuning)
        : previous.reality,
    quantum:
      previous === undefined ||
      demand === 'all' ||
      demand === 'quantum'
        ? selectQuantumPreviews(state, context.quantumLeap)
        : previous.quantum,
    infinity:
      previous === undefined ||
      demand === 'all' ||
      demand === 'infinity'
        ? selectInfinityPreviews(state)
        : previous.infinity,
    avocado:
      previous === undefined ||
      demand === 'all' ||
      demand === 'avocato' ||
      demand === 'quantum'
        ? selectAvocadoPreviews(state)
        : previous.avocado,
    time:
      previous === undefined ||
      demand === 'all' ||
      demand === 'offline-time'
        ? selectStoredTimePreviews(state, context.storedTimeCheater)
        : previous.time,
  }
}

function selectDysonPreviews(
  state: CanonicalGameStateV1,
): FrontendGameplayPreviews['dyson'] {
  return {
    basicFacilities: BASIC_DYSON_FACILITY_IDS.map((facilityId) =>
      previewCanonicalBasicFacilityPurchase(state, facilityId),
    ),
    megaStructures: MEGA_STRUCTURE_IDS.map((facilityId) =>
      previewMegaStructure(state, facilityId),
    ),
  }
}

function selectDreamPreviews(
  state: CanonicalGameStateV1,
): FrontendGameplayPreviews['dream'] {
  return {
    foundational: DREAM_FOUNDATIONAL_PURCHASES.map((purchase) => {
      const result = purchaseDreamFoundationalInformation(state, purchase)
      return {
        purchase,
        eligible: result.purchased,
        cost: result.cost,
        code: result.status,
      }
    }),
    spaceAge: DREAM_SPACE_AGE_PURCHASES.map((purchase) => {
      const result = purchaseDreamSpaceAge(state, purchase)
      return {
        purchase,
        eligible: result.purchased,
        cost: result.cost,
        code: result.status,
      }
    }),
    upgrades: [...SIMULATION_UPGRADE_DEFINITIONS].map(
      ([upgradeId, definition]) => {
        const result = purchaseSimulationUpgrade(state, upgradeId)
        return {
          upgradeId,
          eligible: result.accepted && result.changed,
          cost: definition.cost,
          code: result.code,
          definitionGap: result.unsupportedEffect,
        }
      },
    ),
    education: DREAM_EDUCATION_IDS.map((educationId) => {
      const result = startDreamEducation(state, educationId)
      return {
        educationId,
        eligible: result.accepted && result.changed,
        cost: state.dream.education[educationId].cost,
        code: result.code,
      }
    }),
    automaticReset: previewDreamReset(
      applyCanonicalDreamReset(state, { kind: 'automatic' }),
    ),
    blackHoleReset: previewDreamReset(
      applyCanonicalBlackHoleReset(state),
    ),
  }
}

function selectRealityPreviews(
  state: CanonicalGameStateV1,
  tuning: Readonly<RealityWorkerTuning>,
): FrontendGameplayPreviews['reality'] {
  const gather = gatherRealityInfluence(state, tuning)
  return {
    upgrades: REALITY_UPGRADE_IDS.map((upgradeId) => {
      const result = purchaseRealityUpgrade(state, upgradeId)
      const definition = REALITY_UPGRADE_DEFINITIONS.get(upgradeId)
      return {
        upgradeId,
        eligible: result.accepted && result.changed,
        cost: definition?.cost ?? 0n,
        code: result.code,
        definitionGap:
          result.definitionGap ??
          (definition === undefined
            ? `missing_definition:${upgradeId}`
            : null),
      }
    }),
    gatherInfluence: {
      eligible: gather.gathered,
      amount: gather.amount,
      code: gather.status,
    },
  }
}

function selectQuantumPreviews(
  state: CanonicalGameStateV1,
  leap: Readonly<FrontendQuantumLeapPreview>,
): FrontendGameplayPreviews['quantum'] {
  return {
    upgrades: QUANTUM_UPGRADE_IDS.map((upgradeId) => {
      const result = purchaseQuantumUpgrade(state, upgradeId)
      return {
        upgradeId,
        eligible: result.accepted && result.changed,
        cost: quantumUpgradeCost(state, upgradeId),
        code: result.code,
        definitionGap: QUANTUM_UPGRADE_DEFINITIONS.has(upgradeId)
          ? null
          : `missing_definition:${upgradeId}`,
      }
    }),
    sections: previewQuantumUpgradeSections(state),
    leap: structuredClone(leap),
  }
}

function selectInfinityPreviews(
  state: CanonicalGameStateV1,
): FrontendGameplayPreviews['infinity'] {
  return {
    shop: CANONICAL_INFINITY_SHOP_ITEM_IDS.map((itemId) => {
      const result = purchaseCanonicalInfinityShopItem(state, itemId)
      return {
        itemId,
        eligible: result.accepted && result.changed,
        cost: result.cost,
        code: result.code,
        definitionGap:
          result.code === 'definition-gap' ? result.issue : null,
      }
    }),
    breakTarget: projectBreakInfinityPresentationControl(
      state.infinity.breakTarget,
    ),
  }
}

function selectAvocadoPreviews(
  state: CanonicalGameStateV1,
): FrontendGameplayPreviews['avocado'] {
  const meditation = completeCanonicalAvocadoMeditationStep(
    state,
    state.secretProgress.step,
  )
  return {
    feeds: AVOCADO_FEED_SOURCES.map((source) => {
      const result = feedAllToAvocado(state, source)
      return {
        source,
        eligible: result.accepted && result.changed,
        amount: result.amount,
        code: result.code,
      }
    }),
    meditation: {
      eligible: meditation.accepted && meditation.changed,
      requiredStepIndex: state.secretProgress.completed
        ? null
        : state.secretProgress.step,
      code: meditation.code,
      skillPointReward: AVOCADO_MEDITATION_SKILL_POINT_REWARD,
    },
  }
}

function selectStoredTimePreviews(
  state: CanonicalGameStateV1,
  cheater: boolean,
): FrontendGameplayPreviews['time'] {
  const storedCapacity = upgradeStoredTimeCapacity({
    bankSeconds: state.timeline.storedTimeAvailableSeconds,
    capacitySeconds: state.timeline.storedTimeCapacitySeconds,
    cheater,
  })
  return {
    doubleTimeRate: {
      minimum: 0,
      maximum: 10,
      current: state.timeline.doubleTime.rate,
    },
    storedCapacity: {
      eligible: storedCapacity.upgraded,
      code: storedCapacity.upgraded
        ? 'upgradable'
        : storedCapacity.maximumReached
          ? 'maximum-reached'
          : 'stored-time-bank-not-full',
      currentCapacitySeconds: state.timeline.storedTimeCapacitySeconds,
      nextCapacitySeconds: storedCapacity.capacitySeconds,
      consumesStoredSeconds: storedCapacity.upgraded
        ? state.timeline.storedTimeAvailableSeconds
        : 0,
    },
    storedSpend: {
      maximumSeconds: Math.max(
        0,
        state.timeline.storedTimeAvailableSeconds,
      ),
      commitFirstRequired: true,
    },
  }
}

function previewMegaStructure(
  state: CanonicalGameStateV1,
  facilityId: MegaStructureId,
): FrontendMegaStructurePurchasePreview {
  const result = tryPurchaseCanonicalMegaStructure(state, facilityId)
  return {
    facilityId,
    eligible: result.purchased,
    selectedQuantity: result.quantity,
    cost: result.cost,
    code: result.status,
    definitionGap:
      result.status === 'invalid-definition'
        ? `invalid_definition:${facilityId}`
        : null,
  }
}

function previewResearchCatalog(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
): FrontendResearchCatalogPreview {
  const purchases = UNITY_RESEARCH_PRESENTATION_ORDER
    .map((researchId) =>
      previewCanonicalResearchPurchase(state, tuning, researchId),
    )
  const cards = purchases.flatMap((purchase) => {
    const presentation =
      selectCanonicalResearchPresentationFacts(
        state,
        tuning,
        purchase.researchId,
        purchase.selectedQuantity,
      )
    return presentation === undefined
      ? []
      : [{ ...purchase, ...presentation }]
  })
  const gap = purchases.find(
    (preview) =>
      preview.code === 'definition-gap' ||
      preview.code === 'unknown-research',
  )
  return {
    complete: gap === undefined,
    issue:
      gap?.issue ??
      (gap === undefined
        ? null
        : `Research definition '${gap.researchId}' is unavailable.`),
    purchases,
    cards,
  }
}

function previewDreamReset(
  result:
    | ReturnType<typeof applyCanonicalDreamReset>
    | ReturnType<typeof applyCanonicalBlackHoleReset>,
): FrontendDreamResetPreview {
  if (!result.ok) {
    return {
      eligible: false,
      code: result.issues[0]?.code ?? 'invalid',
      cause: null,
      requestedReward: 0n,
      definitionGaps: result.issues.map(
        (issue) => `${issue.path}:${issue.detail}`,
      ),
    }
  }
  if (!result.applied) {
    return {
      eligible: false,
      code: result.reason,
      cause: null,
      requestedReward: 0n,
      definitionGaps: [],
    }
  }
  return {
    eligible: true,
    code: 'applied',
    cause: result.cause,
    requestedReward: result.requestedReward,
    definitionGaps: [],
  }
}

/**
 * Builds exhaustive route-readiness facts from authoritative command support,
 * runtime composition readiness, and a previously inspected definition set.
 */
export function selectFrontendCommandAvailability(
  requirements: FrontendCommandRequirementReadiness,
  definitionCoverage: Readonly<FrontendDefinitionCoverage>,
): FrontendCommandAvailabilityIndex {
  const byKindEntries = CANONICAL_PLAYER_COMMAND_KINDS.map((kind) => {
    const support = CANONICAL_PLAYER_COMMAND_SUPPORT[kind]
    const required =
      'requires' in support
        ? [...support.requires] as FrontendCommandRequirement[]
        : []
    const missingRequirements = required.filter(
      (requirement) => requirements[requirement] !== true,
    )
    const definitionGaps = definitionGapsForCommand(
      kind,
      definitionCoverage,
    )
    const routeAvailable =
      support.supported &&
      missingRequirements.length === 0 &&
      definitionGaps.length === 0
    const status: FrontendCommandRouteStatus = !support.supported
      ? 'unsupported'
      : definitionGaps.length > 0
        ? 'definition-gap'
        : missingRequirements.length > 0
          ? 'missing-runtime-requirement'
          : 'available'

    const availability: FrontendCommandAvailability = {
      kind,
      family: commandFamily(kind),
      supported: support.supported,
      routeAvailable,
      status,
      authority: support.authority,
      blocker:
        'blocker' in support &&
        typeof support.blocker === 'string'
          ? support.blocker
          : null,
      requirements: required,
      missingRequirements,
      definitionGaps,
    }
    return [kind, availability] as const
  })
  const byKind = Object.fromEntries(byKindEntries) as Record<
    CanonicalPlayerCommandKind,
    FrontendCommandAvailability
  >

  const byFamily = Object.fromEntries(
    FRONTEND_COMMAND_FAMILIES.map((family) => {
      const commands = CANONICAL_PLAYER_COMMAND_KINDS.filter(
        (kind) => commandFamily(kind) === family,
      )
      return [
        family,
        {
          family,
          commandKinds: commands,
          supportedCount: commands.filter(
            (kind) => byKind[kind].supported,
          ).length,
          routeAvailableCount: commands.filter(
            (kind) => byKind[kind].routeAvailable,
          ).length,
        },
      ] as const
    }),
  ) as unknown as Record<
    FrontendCommandFamily,
    FrontendCommandFamilyAvailability
  >

  return { byKind, byFamily }
}

function definitionGapsForCommand(
  kind: CanonicalPlayerCommandKind,
  coverage: Readonly<FrontendDefinitionCoverage>,
): readonly string[] {
  switch (kind) {
    case 'dream.purchase-upgrade':
    case 'dream.request-reset':
    case 'dream.request-black-hole-reset':
      return coverage.domains['dream-upgrades'].gaps
    case 'reality.purchase-upgrade':
      return coverage.domains['reality-upgrades'].gaps
    case 'quantum.purchase-upgrade':
      return coverage.domains['quantum-upgrades'].gaps
    default:
      return []
  }
}

function inspectDefinitionDomain(
  inspect: () => readonly (string | number | bigint)[],
): FrontendDefinitionDomainCoverage {
  try {
    const gaps = inspect().map(String)
    return { complete: gaps.length === 0, gaps }
  } catch (error) {
    return {
      complete: false,
      gaps: [
        `definition-inspection-failed:${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    }
  }
}

function commandFamily(
  kind: CanonicalPlayerCommandKind,
): FrontendCommandFamily {
  const family = kind.slice(0, kind.indexOf('.'))
  if (
    FRONTEND_COMMAND_FAMILIES.some(
      (candidate) => candidate === family,
    )
  ) {
    return family as FrontendCommandFamily
  }
  throw new Error(`Unknown canonical command family '${family}'.`)
}

function hasCommandKind(kind: string): kind is CanonicalPlayerCommandKind {
  return Object.prototype.hasOwnProperty.call(
    CANONICAL_PLAYER_COMMAND_SUPPORT,
    kind,
  )
}

function assertRevision(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `${name} revision must be a non-negative safe integer.`,
    )
  }
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value as DeepReadonly<T>
  }
  for (const child of Object.values(value)) {
    deepFreeze(child)
  }
  return Object.freeze(value) as DeepReadonly<T>
}

function freezeFrontendProjection<T>(
  value: T,
  sourceOwnership: 'borrowed' | 'detached-frozen',
): DeepReadonly<T> {
  return sourceOwnership === 'detached-frozen' && import.meta.env.PROD
    ? Object.freeze(value) as DeepReadonly<T>
    : deepFreeze(value)
}
