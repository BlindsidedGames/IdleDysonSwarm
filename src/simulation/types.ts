export type SimulationAdvanceMode = 'active' | 'stored-time' | 'shadow'

export type SimulationAutomationPolicy =
  | 'preserve-configured-mode'
  | 'force-buy-max'

export type SimulationValidationStatus =
  | 'valid'
  | 'yielded'
  | 'cancelled'
  | 'invalid-request'
  | 'invalid-state'
  | 'zero-time-loop'

export type SimulationEventKind =
  | 'production-arrival'
  | 'queued-input'
  | 'automation'

export interface SimulationQueuedInput {
  readonly timeSeconds: number
  readonly kind: string
  readonly discreteValue?: bigint
  readonly continuousValue?: number
  readonly id?: string
}

export interface SimulationEvent {
  readonly timeSeconds: number
  readonly kind: SimulationEventKind
  readonly stableOrder?: number
  readonly id?: string
}

export type SimulationEra = 'foundational' | 'information' | 'space-age'

export type AutomaticDreamDisasterCause =
  | 'Meteor'
  | 'ArtificialIntelligence'
  | 'GlobalWarming'

/** Exact presentation facts captured at the automatic-reset boundary. */
export interface SimulationDisasterPresentationEvent {
  readonly cause: AutomaticDreamDisasterCause
  readonly strangeMatterGranted: number
  readonly resetCount: bigint
  readonly firstLifetimeOccurrence: boolean
  readonly preResetEra: SimulationEra
}

export interface SimulationPresentationSummary {
  /** Foreground events presented as first dialogs or repeat banners. */
  disasterEvents: SimulationDisasterPresentationEvent[]
  /**
   * First lifetime discoveries made by a Stored Time candidate. This list is
   * capped naturally at one event per cause and is never used for banners.
   */
  storedTimeFirstDisasterEvents: SimulationDisasterPresentationEvent[]
  ordinaryInfinityCount: bigint
  breakInfinityCount: bigint
  ordinaryInfinityPoints: bigint
  breakInfinityPoints: bigint
  botCapInfinityPoints: bigint
  botCapOverflowRewards: bigint
  meteorDreamResets: bigint
  aiDreamResets: bigint
  globalWarmingDreamResets: bigint
  blackHoleDreamResets: bigint
  strangeMatter: number
  realityWorkers: bigint
  automaticInfluence: number
  manualInfluence: number
  realityCapacityStallSeconds: number
}

export function createSimulationSummary(): SimulationPresentationSummary {
  return {
    disasterEvents: [],
    storedTimeFirstDisasterEvents: [],
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0,
    realityWorkers: 0n,
    automaticInfluence: 0,
    manualInfluence: 0,
    realityCapacityStallSeconds: 0,
  }
}

export interface EventTimeSimulationModel<TModel> {
  clone(): TModel
  validate(): string | undefined
  /**
   * Bounded validation for scheduler-owned, already-hydrated state.
   * Models without an incremental validator retain the fail-closed full check.
   */
  validateIncremental?(): string | undefined
  timeToNextMaterialEvent(
    maximumSeconds: number,
    infinityMinimumCycleSeconds: number,
  ): number
  advanceContinuous(seconds: number): void
  applyProductionArrivals(summary: SimulationPresentationSummary): void
  applyAutomation(
    policy: SimulationAutomationPolicy,
    summary: SimulationPresentationSummary,
  ): void
  applyDerivedTimersAndDoubleTime(
    seconds: number,
    summary: SimulationPresentationSummary,
  ): void
  applyDreamReset(summary: SimulationPresentationSummary): void
  applyBotCapTransition(summary: SimulationPresentationSummary): void
  applyInfinityReset(
    minimumCycleSeconds: number,
    summary: SimulationPresentationSummary,
  ): void
  applyQueuedInput(
    input: SimulationQueuedInput,
    summary: SimulationPresentationSummary,
  ): void
}

declare const ownedEventTimeModel: unique symbol

/**
 * A scheduler model whose caller transfers exclusive mutation ownership to
 * `advanceEventTime`. Borrowed models remain the default and are cloned.
 */
export type OwnedEventTimeSimulationModel<TModel> = TModel & {
  readonly [ownedEventTimeModel]: true
}

export function transferEventTimeModelOwnership<TModel>(
  model: TModel,
): OwnedEventTimeSimulationModel<TModel> {
  return model as OwnedEventTimeSimulationModel<TModel>
}

interface SimulationAdvanceOptions {
  readonly durationSeconds: number
  readonly mode?: SimulationAdvanceMode
  readonly automationPolicy?: SimulationAutomationPolicy
  readonly automationIntervalSeconds?: number
  readonly automationTimeUntilNextEvent?: number
  readonly infinityMinimumCycleSeconds?: number
  readonly processingBudgetMilliseconds?: number
  readonly processPartialEndpoint?: boolean
  readonly cancelRequested?: () => boolean
  /**
   * Diagnostic event traces are useful in tests and inspection tools, but
   * retaining one object per offline boundary makes large Stored Time jobs
   * consume memory in proportion to their raw tick count.
   */
  readonly collectEvents?: boolean
  /**
   * BigInt work counters are optional for production replay. Presentation
   * summaries remain authoritative regardless of this diagnostic setting.
   */
  readonly collectWorkMetrics?: boolean
  readonly queuedInputs?: readonly SimulationQueuedInput[]
}

export type SimulationAdvanceRequest<
  TModel extends EventTimeSimulationModel<TModel>,
> = SimulationAdvanceOptions &
  (
    | {
        readonly startingState: TModel
        readonly cloneStartingState?: true
      }
    | {
        readonly startingState:
          OwnedEventTimeSimulationModel<TModel>
        readonly cloneStartingState: false
      }
  )

export interface SimulationWorkMetrics {
  schedulerPasses: bigint
  continuousSegments: bigint
  materialEvents: bigint
  automationEvents: bigint
  exactSeconds: number
  processingMilliseconds: number
}

export interface SimulationAdvanceResult<TModel> {
  readonly candidateState: TModel
  consumedSeconds: number
  remainingSeconds: number
  automationTimeUntilNextEvent: number
  validationStatus: SimulationValidationStatus
  readonly summary: SimulationPresentationSummary
  readonly events: SimulationEvent[]
  readonly work: SimulationWorkMetrics
  diagnosticCode?: string
  readonly completed: boolean
}
