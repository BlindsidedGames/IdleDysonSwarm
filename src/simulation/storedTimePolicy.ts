export const STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT = 4_096
export const STORED_TIME_FAST_MAXIMUM_GROUPS = 4_096

export interface StoredTimeRepresentativeGroup {
  readonly index: number
  readonly logicalRawTicks: number
  readonly omittedRawTicks: number
  readonly durationSeconds: number
}

export interface StoredTimePolicyPlan {
  readonly executionKind: 'exact' | 'representative-groups'
  readonly requestedSeconds: number
  readonly rawAutomationBoundaries: number
  readonly representativeAutomationBoundaries: number
  readonly omittedAutomationBoundaries: number
  readonly groups: readonly Readonly<StoredTimeRepresentativeGroup>[]
  readonly finalRemainderSeconds: number
  readonly finalAutomationTimeUntilNextEvent: number
  readonly omittedTicksPurchaseNothing: true
  readonly omittedTicksDoNotRotateTarget: true
}

export function planStoredTimePolicy(request: {
  readonly requestedSeconds: number
  readonly automationIntervalSeconds: number
  readonly automationTimeUntilNextEvent: number
}): Readonly<StoredTimePolicyPlan> {
  const { requestedSeconds, automationIntervalSeconds } = request
  if (!Number.isFinite(requestedSeconds) || requestedSeconds <= 0) {
    throw new RangeError('Stored Time duration must be finite and positive.')
  }
  if (
    !Number.isFinite(automationIntervalSeconds) ||
    automationIntervalSeconds <= 0
  ) {
    throw new RangeError('Stored Time automation interval is invalid.')
  }
  const firstHorizon = normalizeHorizon(
    request.automationTimeUntilNextEvent,
    automationIntervalSeconds,
  )
  const rawAutomationBoundaries = countBoundaries(
    requestedSeconds,
    firstHorizon,
    automationIntervalSeconds,
  )
  if (
    rawAutomationBoundaries <=
    STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT
  ) {
    return Object.freeze({
      executionKind: 'exact' as const,
      requestedSeconds,
      rawAutomationBoundaries,
      representativeAutomationBoundaries: rawAutomationBoundaries,
      omittedAutomationBoundaries: 0,
      groups: Object.freeze([]),
      finalRemainderSeconds: 0,
      finalAutomationTimeUntilNextEvent: finalAutomationHorizon(
        requestedSeconds,
        rawAutomationBoundaries,
        firstHorizon,
        automationIntervalSeconds,
      ),
      omittedTicksPurchaseNothing: true,
      omittedTicksDoNotRotateTarget: true,
    })
  }

  const groupCount = Math.min(
    STORED_TIME_FAST_MAXIMUM_GROUPS,
    rawAutomationBoundaries,
  )
  const quotient = Math.floor(rawAutomationBoundaries / groupCount)
  const remainder = rawAutomationBoundaries % groupCount
  const groups: StoredTimeRepresentativeGroup[] = []
  let cumulativeTicks = 0
  let cursor = 0
  for (let index = 0; index < groupCount; index += 1) {
    const logicalRawTicks = quotient + (index < remainder ? 1 : 0)
    cumulativeTicks += logicalRawTicks
    const end = Math.min(
      requestedSeconds,
      firstHorizon +
        (cumulativeTicks - 1) * automationIntervalSeconds,
    )
    groups.push(Object.freeze({
      index,
      logicalRawTicks,
      omittedRawTicks: logicalRawTicks - 1,
      durationSeconds: Math.max(0, end - cursor),
    }))
    cursor = end
  }
  const finalRemainderSeconds = Math.max(0, requestedSeconds - cursor)
  return Object.freeze({
    executionKind: 'representative-groups' as const,
    requestedSeconds,
    rawAutomationBoundaries,
    representativeAutomationBoundaries: groups.length,
    omittedAutomationBoundaries:
      rawAutomationBoundaries - groups.length,
    groups: Object.freeze(groups),
    finalRemainderSeconds,
    finalAutomationTimeUntilNextEvent: finalAutomationHorizon(
      requestedSeconds,
      rawAutomationBoundaries,
      firstHorizon,
      automationIntervalSeconds,
    ),
    omittedTicksPurchaseNothing: true,
    omittedTicksDoNotRotateTarget: true,
  })
}

function normalizeHorizon(value: number, interval: number): number {
  return Number.isFinite(value) && value > 0 && value <= interval
    ? value
    : interval
}

function countBoundaries(
  duration: number,
  firstHorizon: number,
  interval: number,
): number {
  if (duration + Number.EPSILON < firstHorizon) return 0
  const intervalsAfterFirst = (duration - firstHorizon) / interval
  const nearestInteger = Math.round(intervalsAfterFirst)
  const stableIntervals = Math.abs(
    intervalsAfterFirst - nearestInteger,
  ) <= 1e-6
    ? nearestInteger
    : Math.floor(intervalsAfterFirst)
  return Math.max(
    0,
    stableIntervals + 1,
  )
}

function finalAutomationHorizon(
  duration: number,
  boundaries: number,
  firstHorizon: number,
  interval: number,
): number {
  if (boundaries === 0) return Math.max(0, firstHorizon - duration)
  const lastBoundary = firstHorizon + (boundaries - 1) * interval
  const remainder = Math.max(0, duration - lastBoundary)
  return remainder <= 1e-12
    ? interval
    : Math.max(0, interval - remainder)
}
