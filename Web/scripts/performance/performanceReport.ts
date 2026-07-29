export const PERFORMANCE_REPORT_VERSION = 1

export const FIRST_SLICE_PERFORMANCE_BUDGETS = Object.freeze({
  longTaskMilliseconds: 50,
  commandFeedbackP95Milliseconds: 100,
  interactionToNextPaintP75Milliseconds: 200,
  cumulativeLayoutShiftP75: 0.1,
  largestContentfulPaintP75Milliseconds: 2_500,
  retainedHeapMinimumAllowanceBytes: 10 * 1024 * 1024,
  retainedHeapAllowanceRatio: 0.2,
})

export type PerformanceRunMode = 'acceptance' | 'smoke'

export interface PerformanceEnvironment {
  readonly browser: string
  readonly browserVersion: string
  readonly platform: string
  readonly productionUrl: string
}

export interface PerformanceBudgetResult {
  readonly name: string
  readonly unit: 'bytes' | 'count' | 'milliseconds' | 'score'
  readonly threshold: 'at-least' | 'at-most'
  readonly actual: number
  readonly limit: number
  readonly passed: boolean
}

export interface InteractionTrialMeasurement {
  readonly trial: number
  readonly longTaskDurationsMilliseconds: readonly number[]
  readonly commandFeedbackLatenciesMilliseconds: readonly number[]
  readonly interactionToNextPaintMilliseconds: number
  readonly cumulativeLayoutShift: number
  readonly largestContentfulPaintMilliseconds: number
}

export interface InteractionProfileMeasurement {
  readonly id: string
  readonly viewport: {
    readonly width: number
    readonly height: number
    readonly deviceScaleFactor: number
  }
  readonly cpuThrottleRate: number
  readonly trials: readonly InteractionTrialMeasurement[]
  readonly summaries: {
    readonly maximumLongTaskMilliseconds: number
    readonly commandFeedbackP95Milliseconds: number
    readonly interactionToNextPaintP75Milliseconds: number
    readonly cumulativeLayoutShiftP75: number
    readonly largestContentfulPaintP75Milliseconds: number
  }
  readonly budgets: readonly PerformanceBudgetResult[]
  readonly passed: boolean
}

export interface InteractionPerformanceReport {
  readonly version: typeof PERFORMANCE_REPORT_VERSION
  readonly kind: 'first-slice-interaction'
  readonly mode: PerformanceRunMode
  readonly acceptanceEligible: boolean
  readonly createdAtUtc: string
  readonly environment: PerformanceEnvironment
  readonly configuration: {
    readonly traceDurationMilliseconds: number
    readonly trialCount: number
  }
  readonly profiles: readonly InteractionProfileMeasurement[]
  readonly passed: boolean
}

export interface ResourceCounts {
  readonly documents: number
  readonly nodes: number
  readonly jsEventListeners: number
  readonly activeTimeouts: number
  readonly activeIntervals: number
  readonly activeAnimationFrames: number
  readonly activePointers: number
  readonly callbackSubscriptionSets: number
  readonly callbackSubscriptionMembers: number
}

export interface SoakSnapshot {
  readonly heapUsedBytes: number
  readonly resources: ResourceCounts
}

export interface SoakPerformanceReport {
  readonly version: typeof PERFORMANCE_REPORT_VERSION
  readonly kind: 'first-slice-retained-heap'
  readonly mode: PerformanceRunMode
  readonly acceptanceEligible: boolean
  readonly createdAtUtc: string
  readonly environment: PerformanceEnvironment
  readonly configuration: {
    readonly durationMilliseconds: number
    readonly warmupMilliseconds: number
    readonly explicitGarbageCollections: number
  }
  readonly baseline: SoakSnapshot
  readonly final: SoakSnapshot
  readonly retainedHeapGrowthBytes: number
  readonly retainedHeapAllowanceBytes: number
  readonly budgets: readonly PerformanceBudgetResult[]
  readonly passed: boolean
}

export type FirstSlicePerformanceReport =
  | InteractionPerformanceReport
  | SoakPerformanceReport

export function percentile(
  values: readonly number[],
  percentileValue: number,
): number {
  if (values.length === 0) return 0
  if (
    !Number.isFinite(percentileValue) ||
    percentileValue < 0 ||
    percentileValue > 1
  ) {
    throw new RangeError('Percentile must be between zero and one.')
  }
  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.max(1, Math.ceil(percentileValue * sorted.length))
  return sorted[rank - 1] ?? 0
}

export function cumulativeLayoutShift(
  entries: readonly {
    readonly startTime: number
    readonly value: number
    readonly hadRecentInput: boolean
  }[],
): number {
  const shifts = entries
    .filter((entry) => !entry.hadRecentInput)
    .sort((left, right) => left.startTime - right.startTime)
  let maximumWindow = 0
  let windowValue = 0
  let windowStart = 0
  let previousStart = 0
  for (const shift of shifts) {
    const startsNewWindow =
      windowValue === 0 ||
      shift.startTime - previousStart > 1_000 ||
      shift.startTime - windowStart > 5_000
    if (startsNewWindow) {
      windowStart = shift.startTime
      windowValue = shift.value
    } else {
      windowValue += shift.value
    }
    previousStart = shift.startTime
    maximumWindow = Math.max(maximumWindow, windowValue)
  }
  return maximumWindow
}

export function interactionToNextPaint(
  entries: readonly {
    readonly interactionId: number
    readonly duration: number
  }[],
): number {
  const latencyByInteraction = new Map<number, number>()
  for (const entry of entries) {
    if (entry.interactionId <= 0) continue
    latencyByInteraction.set(
      entry.interactionId,
      Math.max(
        latencyByInteraction.get(entry.interactionId) ?? 0,
        entry.duration,
      ),
    )
  }
  const descending = [...latencyByInteraction.values()].sort(
    (left, right) => right - left,
  )
  if (descending.length === 0) return 0
  const outlierIndex = Math.min(
    Math.floor(descending.length / 50),
    descending.length - 1,
  )
  return descending[outlierIndex] ?? 0
}

export function createInteractionReport(input: {
  readonly mode: PerformanceRunMode
  readonly createdAtUtc: string
  readonly environment: PerformanceEnvironment
  readonly traceDurationMilliseconds: number
  readonly profiles: readonly Omit<
    InteractionProfileMeasurement,
    'summaries' | 'budgets' | 'passed'
  >[]
}): InteractionPerformanceReport {
  if (
    input.profiles.length === 0 ||
    input.profiles.some((profile) => profile.trials.length === 0)
  ) {
    throw new TypeError(
      'Interaction reports require at least one trial per profile.',
    )
  }
  const profiles = input.profiles.map((profile) => {
    const maximumLongTaskMilliseconds = Math.max(
      0,
      ...profile.trials.flatMap(
        (trial) => trial.longTaskDurationsMilliseconds,
      ),
    )
    const commandFeedbackP95Milliseconds = percentile(
      profile.trials.flatMap(
        (trial) => trial.commandFeedbackLatenciesMilliseconds,
      ),
      0.95,
    )
    const interactionToNextPaintP75Milliseconds = percentile(
      profile.trials.map(
        (trial) => trial.interactionToNextPaintMilliseconds,
      ),
      0.75,
    )
    const cumulativeLayoutShiftP75 = percentile(
      profile.trials.map((trial) => trial.cumulativeLayoutShift),
      0.75,
    )
    const largestContentfulPaintP75Milliseconds = percentile(
      profile.trials.map(
        (trial) => trial.largestContentfulPaintMilliseconds,
      ),
      0.75,
    )
    const budgets = [
      budget(
        'Visible command feedback samples',
        'count',
        profile.trials.reduce(
          (total, trial) =>
            total +
            trial.commandFeedbackLatenciesMilliseconds.length,
          0,
        ),
        profile.trials.length,
        'at-least',
      ),
      budget(
        'Maximum presentation long task',
        'milliseconds',
        maximumLongTaskMilliseconds,
        FIRST_SLICE_PERFORMANCE_BUDGETS.longTaskMilliseconds,
      ),
      budget(
        'P95 visible command feedback',
        'milliseconds',
        commandFeedbackP95Milliseconds,
        FIRST_SLICE_PERFORMANCE_BUDGETS
          .commandFeedbackP95Milliseconds,
      ),
      budget(
        'Synthetic INP P75',
        'milliseconds',
        interactionToNextPaintP75Milliseconds,
        FIRST_SLICE_PERFORMANCE_BUDGETS
          .interactionToNextPaintP75Milliseconds,
        'at-most',
        profile.trials.every(
          (trial) =>
            trial.interactionToNextPaintMilliseconds > 0,
        ),
      ),
      budget(
        'Synthetic CLS P75',
        'score',
        cumulativeLayoutShiftP75,
        FIRST_SLICE_PERFORMANCE_BUDGETS
          .cumulativeLayoutShiftP75,
      ),
      budget(
        'Synthetic LCP P75',
        'milliseconds',
        largestContentfulPaintP75Milliseconds,
        FIRST_SLICE_PERFORMANCE_BUDGETS
          .largestContentfulPaintP75Milliseconds,
        'at-most',
        profile.trials.every(
          (trial) =>
            trial.largestContentfulPaintMilliseconds > 0,
        ),
      ),
    ] as const
    return {
      ...profile,
      summaries: {
        maximumLongTaskMilliseconds,
        commandFeedbackP95Milliseconds,
        interactionToNextPaintP75Milliseconds,
        cumulativeLayoutShiftP75,
        largestContentfulPaintP75Milliseconds,
      },
      budgets,
      passed: budgets.every((entry) => entry.passed),
    }
  })
  return {
    version: PERFORMANCE_REPORT_VERSION,
    kind: 'first-slice-interaction',
    mode: input.mode,
    acceptanceEligible:
      input.mode === 'acceptance' &&
      input.traceDurationMilliseconds >= 30_000 &&
      profiles.every((profile) => profile.trials.length >= 5),
    createdAtUtc: input.createdAtUtc,
    environment: input.environment,
    configuration: {
      traceDurationMilliseconds: input.traceDurationMilliseconds,
      trialCount: Math.min(
        ...profiles.map((profile) => profile.trials.length),
      ),
    },
    profiles,
    passed: profiles.every((profile) => profile.passed),
  }
}

export function createSoakReport(input: {
  readonly mode: PerformanceRunMode
  readonly createdAtUtc: string
  readonly environment: PerformanceEnvironment
  readonly durationMilliseconds: number
  readonly warmupMilliseconds: number
  readonly explicitGarbageCollections: number
  readonly baseline: SoakSnapshot
  readonly final: SoakSnapshot
}): SoakPerformanceReport {
  const retainedHeapGrowthBytes = Math.max(
    0,
    input.final.heapUsedBytes - input.baseline.heapUsedBytes,
  )
  const retainedHeapAllowanceBytes = Math.max(
    FIRST_SLICE_PERFORMANCE_BUDGETS
      .retainedHeapMinimumAllowanceBytes,
    Math.ceil(
      input.baseline.heapUsedBytes *
        FIRST_SLICE_PERFORMANCE_BUDGETS
          .retainedHeapAllowanceRatio,
    ),
  )
  const countKeys = [
    'documents',
    'nodes',
    'jsEventListeners',
    'activeTimeouts',
    'activeIntervals',
    'activeAnimationFrames',
    'activePointers',
    'callbackSubscriptionSets',
    'callbackSubscriptionMembers',
  ] as const
  const budgets = [
    budget(
      'Retained JavaScript heap growth',
      'bytes',
      retainedHeapGrowthBytes,
      retainedHeapAllowanceBytes,
    ),
    ...countKeys.map((key) =>
      budget(
        `Post-soak ${key}`,
        'count',
        input.final.resources[key],
        input.baseline.resources[key],
      ),
    ),
  ]
  return {
    version: PERFORMANCE_REPORT_VERSION,
    kind: 'first-slice-retained-heap',
    mode: input.mode,
    acceptanceEligible:
      input.mode === 'acceptance' &&
      input.durationMilliseconds >= 30 * 60 * 1_000,
    createdAtUtc: input.createdAtUtc,
    environment: input.environment,
    configuration: {
      durationMilliseconds: input.durationMilliseconds,
      warmupMilliseconds: input.warmupMilliseconds,
      explicitGarbageCollections: input.explicitGarbageCollections,
    },
    baseline: input.baseline,
    final: input.final,
    retainedHeapGrowthBytes,
    retainedHeapAllowanceBytes,
    budgets,
    passed: budgets.every((entry) => entry.passed),
  }
}

export function assertPerformanceReport(
  value: unknown,
): asserts value is FirstSlicePerformanceReport {
  if (!isRecord(value)) {
    throw new TypeError('Performance report must be an object.')
  }
  if (value.version !== PERFORMANCE_REPORT_VERSION) {
    throw new TypeError('Performance report version is unsupported.')
  }
  if (
    value.kind !== 'first-slice-interaction' &&
    value.kind !== 'first-slice-retained-heap'
  ) {
    throw new TypeError('Performance report kind is unsupported.')
  }
  if (value.mode !== 'acceptance' && value.mode !== 'smoke') {
    throw new TypeError('Performance report mode is invalid.')
  }
  if (
    typeof value.acceptanceEligible !== 'boolean' ||
    typeof value.passed !== 'boolean' ||
    typeof value.createdAtUtc !== 'string' ||
    !isRecord(value.environment) ||
    !isRecord(value.configuration)
  ) {
    throw new TypeError('Performance report envelope is incomplete.')
  }
  if (
    value.kind === 'first-slice-interaction' &&
    !Array.isArray(value.profiles)
  ) {
    throw new TypeError('Interaction report profiles are missing.')
  }
  if (
    value.kind === 'first-slice-retained-heap' &&
    (!isRecord(value.baseline) ||
      !isRecord(value.final) ||
      !Array.isArray(value.budgets))
  ) {
    throw new TypeError('Soak report measurements are missing.')
  }
}

export function performanceReportText(
  report: FirstSlicePerformanceReport,
): string {
  const heading = [
    'Idle Dyson Swarm first-slice performance report',
    `Kind: ${report.kind}`,
    `Mode: ${report.mode}`,
    `Acceptance eligible: ${report.acceptanceEligible}`,
    `Observed budgets passed: ${report.passed}`,
    `Browser: ${report.environment.browser} ${report.environment.browserVersion}`,
    '',
  ]
  if (report.kind === 'first-slice-interaction') {
    return [
      ...heading,
      ...report.profiles.flatMap((profile) => [
        `Profile: ${profile.id}`,
        ...profile.budgets.map(formatBudget),
        '',
      ]),
    ].join('\n')
  }
  return [
    ...heading,
    `Duration: ${report.configuration.durationMilliseconds} ms`,
    `Baseline heap: ${report.baseline.heapUsedBytes} B`,
    `Final heap: ${report.final.heapUsedBytes} B`,
    ...report.budgets.map(formatBudget),
    '',
  ].join('\n')
}

function budget(
  name: string,
  unit: PerformanceBudgetResult['unit'],
  actual: number,
  limit: number,
  threshold: PerformanceBudgetResult['threshold'] = 'at-most',
  additionalCondition = true,
): PerformanceBudgetResult {
  return {
    name,
    unit,
    threshold,
    actual,
    limit,
    passed:
      additionalCondition &&
      Number.isFinite(actual) &&
      (threshold === 'at-most' ? actual <= limit : actual >= limit),
  }
}

function formatBudget(entry: PerformanceBudgetResult): string {
  const operator = entry.threshold === 'at-most' ? '<=' : '>='
  return `${entry.passed ? 'PASS' : 'FAIL'} ${entry.name}: ${entry.actual} ${operator} ${entry.limit} ${entry.unit}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
