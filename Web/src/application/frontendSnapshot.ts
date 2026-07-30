import type { DeepReadonly } from '../core/contracts'
import { getGameAssetsByKind } from '../game-data/catalog'
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
  DISCRETE_MAXIMUM,
  multiplyContinuous,
} from '../simulation/numeric'
import {
  availableQuantumPoints,
  findQuantumUpgradeCanonicalGaps,
  purchaseQuantumUpgrade,
  QUANTUM_UPGRADE_DEFINITIONS,
  QUANTUM_UPGRADE_IDS,
  type QuantumUpgradeId,
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
  type CanonicalResearchPurchasePreview,
} from '../simulation/researchAutomation'
import {
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
}

export type FrontendApplicationSnapshotContext = Pick<
  FrontendSnapshotContext,
  | 'runtimeRequirements'
  | 'dysonPresentationTuning'
  | 'quantumLeap'
  | 'realityWorkerTuning'
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
  readonly workerBatchSize: bigint
  readonly autoGatherEnabled: boolean
}

export interface FrontendDreamDerivedFacts {
  /**
   * Production facts use an exact neutral multiplier. Double Time is
   * interval-dependent; a frontend must not infer a future scheduler interval
   * and apply its own multiplier.
   */
  readonly productionBasis: 'base-rate'
  readonly effectiveDoubleTimeMultiplier: 1
  readonly result: CanonicalDreamDerivedFactsResult
}

export interface FrontendGameplayDerivedFacts {
  readonly dyson: FrontendDysonDerivedFacts
  readonly dysonBotDistribution: {
    readonly workersFraction: number
    readonly scientistsFraction: number
  }
  readonly dream: FrontendDreamDerivedFacts
  readonly reality: FrontendRealityDerivedFacts
  readonly avocado: AvocadoMultiplierBreakdown
}

export interface FrontendDysonVisibility {
  readonly showTinker: boolean
  readonly visibleBasicFacilityIds: readonly BasicDysonFacilityId[]
  readonly showNextTierTeaser: boolean
}

export interface FrontendGameplayVisibility {
  readonly dyson: FrontendDysonVisibility
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
    readonly leap: FrontendQuantumLeapPreview
  }
  readonly infinity: {
    readonly shop: readonly FrontendInfinityShopPreview[]
    readonly breakTarget: {
      readonly minimum: bigint
      readonly maximum: bigint
    }
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
): DeepReadonly<FrontendApplicationSnapshot> {
  switch (application.phase) {
    case 'idle':
    case 'starting':
      return deepFreeze({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: application.phase,
      })
    case 'blocked':
      return deepFreeze({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: application.phase,
        outcome: application.outcome,
        error: application.error,
      })
    case 'ready':
      return deepFreeze({
        version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
        phase: 'ready',
        source: application.source,
        revision: structuredClone(application.revision),
        checkpoint: structuredClone(application.checkpoint),
        operation: application.operation,
        gameplay: selectFrontendGameplaySnapshot(
          structuredClone(
            application.state.gameState,
          ) as CanonicalGameStateV1,
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
          },
        ),
      })
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
): DeepReadonly<FrontendGameplaySnapshot> {
  const state = structuredClone(source)
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
  const previews = selectGameplayPreviews(state, context)

  return deepFreeze({
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
  })
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
  const dream = deriveCanonicalDreamDerivedFacts(state, {
    effectiveDoubleTimeMultiplier: 1,
    doubleTimeActive: state.timeline.doubleTime.enabled,
    doubleTimeRate: state.timeline.doubleTime.rate,
  })

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
    dream: {
      productionBasis: 'base-rate',
      effectiveDoubleTimeMultiplier: 1,
      result: dream,
    },
    reality: {
      status: reality.status,
      generationPerSecond: reality.generationPerSecond,
      workerBatchSize: context.realityWorkerTuning.workerBatchSize,
      autoGatherEnabled: state.reality.autoGather,
    },
    avocado: deriveAvocadoMultiplier(state),
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
): FrontendGameplayPreviews {
  const basicFacilities = BASIC_DYSON_FACILITY_IDS.map(
    (facilityId) =>
      previewCanonicalBasicFacilityPurchase(state, facilityId),
  )
  const megaStructures = MEGA_STRUCTURE_IDS.map((facilityId) =>
    previewMegaStructure(state, facilityId),
  )
  const research = previewResearchCatalog(
    state,
    context.compatibilityTuning,
  )
  const foundational = DREAM_FOUNDATIONAL_PURCHASES.map(
    (purchase) => {
      const result = purchaseDreamFoundationalInformation(
        state,
        purchase,
      )
      return {
        purchase,
        eligible: result.purchased,
        cost: result.cost,
        code: result.status,
      }
    },
  )
  const spaceAge = DREAM_SPACE_AGE_PURCHASES.map((purchase) => {
    const result = purchaseDreamSpaceAge(state, purchase)
    return {
      purchase,
      eligible: result.purchased,
      cost: result.cost,
      code: result.status,
    }
  })
  const dreamUpgrades = [...SIMULATION_UPGRADE_DEFINITIONS].map(
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
  )
  const education = DREAM_EDUCATION_IDS.map((educationId) => {
    const result = startDreamEducation(state, educationId)
    return {
      educationId,
      eligible: result.accepted && result.changed,
      cost: state.dream.education[educationId].cost,
      code: result.code,
    }
  })
  const realityUpgrades = REALITY_UPGRADE_IDS.map((upgradeId) => {
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
  })
  const gather = gatherRealityInfluence(
    state,
    context.realityWorkerTuning,
  )
  const quantumUpgrades = QUANTUM_UPGRADE_IDS.map((upgradeId) => {
    const result = purchaseQuantumUpgrade(state, upgradeId)
    return {
      upgradeId,
      eligible: result.accepted && result.changed,
      cost: result.cost,
      code: result.code,
      definitionGap: QUANTUM_UPGRADE_DEFINITIONS.has(upgradeId)
        ? null
        : `missing_definition:${upgradeId}`,
    }
  })
  const infinityShop = CANONICAL_INFINITY_SHOP_ITEM_IDS.map(
    (itemId) => {
      const result = purchaseCanonicalInfinityShopItem(state, itemId)
      return {
        itemId,
        eligible: result.accepted && result.changed,
        cost: result.cost,
        code: result.code,
        definitionGap:
          result.code === 'definition-gap' ? result.issue : null,
      }
    },
  )
  const avocadoFeeds = AVOCADO_FEED_SOURCES.map((source) => {
    const result = feedAllToAvocado(state, source)
    return {
      source,
      eligible: result.accepted && result.changed,
      amount: result.amount,
      code: result.code,
    }
  })
  const meditation = completeCanonicalAvocadoMeditationStep(
    state,
    state.secretProgress.step,
  )
  const storedCapacity = upgradeStoredTimeCapacity({
    bankSeconds: state.timeline.storedTimeAvailableSeconds,
    capacitySeconds: state.timeline.storedTimeCapacitySeconds,
    cheater: context.storedTimeCheater,
  })

  return {
    dyson: {
      basicFacilities,
      megaStructures,
    },
    research,
    skills: previewCanonicalSkillCatalog(state),
    dream: {
      foundational,
      spaceAge,
      upgrades: dreamUpgrades,
      education,
      automaticReset: previewDreamReset(
        applyCanonicalDreamReset(state, { kind: 'automatic' }),
      ),
      blackHoleReset: previewDreamReset(
        applyCanonicalBlackHoleReset(state),
      ),
    },
    reality: {
      upgrades: realityUpgrades,
      gatherInfluence: {
        eligible: gather.gathered,
        amount: gather.amount,
        code: gather.status,
      },
    },
    quantum: {
      upgrades: quantumUpgrades,
      leap: structuredClone(context.quantumLeap),
    },
    infinity: {
      shop: infinityShop,
      breakTarget: {
        minimum: 1n,
        maximum: DISCRETE_MAXIMUM,
      },
    },
    avocado: {
      feeds: avocadoFeeds,
      meditation: {
        eligible: meditation.accepted && meditation.changed,
        requiredStepIndex: meditation.nextRequiredStepIndex,
        code: meditation.code,
        skillPointReward: AVOCADO_MEDITATION_SKILL_POINT_REWARD,
      },
    },
    time: {
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
        currentCapacitySeconds:
          state.timeline.storedTimeCapacitySeconds,
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
  const purchases = getGameAssetsByKind('GameData.ResearchDefinition')
    .map((asset) => asset.id)
    .sort()
    .map((researchId) =>
      previewCanonicalResearchPurchase(state, tuning, researchId),
    )
  const gap = purchases.find(
    (preview) => preview.code === 'definition-gap',
  )
  return {
    complete: gap === undefined,
    issue: gap?.issue ?? null,
    purchases,
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
