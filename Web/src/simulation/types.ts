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

export interface SimulationPresentationSummary {
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
  strangeMatter: bigint
  realityWorkers: bigint
  automaticInfluence: bigint
  manualInfluence: bigint
  realityCapacityStallSeconds: number
}

export function createSimulationSummary(): SimulationPresentationSummary {
  return {
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
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
  }
}

export interface EventTimeSimulationModel<TModel> {
  clone(): TModel
  validate(): string | undefined
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

export interface SimulationAdvanceRequest<
  TModel extends EventTimeSimulationModel<TModel>,
> {
  readonly startingState: TModel
  readonly durationSeconds: number
  readonly mode?: SimulationAdvanceMode
  readonly automationPolicy?: SimulationAutomationPolicy
  readonly automationIntervalSeconds?: number
  readonly automationTimeUntilNextEvent?: number
  readonly infinityMinimumCycleSeconds?: number
  readonly processingBudgetMilliseconds?: number
  readonly cloneStartingState?: boolean
  readonly processPartialEndpoint?: boolean
  readonly cancelRequested?: () => boolean
  readonly queuedInputs?: readonly SimulationQueuedInput[]
}

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
