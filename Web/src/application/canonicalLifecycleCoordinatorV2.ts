import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import type { CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import {
  applyV2ReturnedTime,
  resolveV2AwayTime,
  withV2SuspensionMarker,
  type V2AwayTimeResolution,
} from '../simulation/timeResourcesV2'
import { parseUnityInvariantUtcTimestamp } from '../simulation/unityUtcTimestamp'
import {
  closedDataProperties,
  admitIssuedCanonicalRuntimePublicationV2,
  createCanonicalRuntimePublicationV2,
  dataValue,
  stageCanonicalRuntimeAdvanceV2,
  type CanonicalRuntimeAdvanceV2Result,
  type CanonicalRuntimePublicationV2,
  type CanonicalRuntimeApplicationAuthorityV2,
} from './canonicalRuntimeSessionV2'
import type { CanonicalEventTimeV2Context } from '../simulation/canonicalEventTimeModelV2'
import { captureInfinityRewardAuthorityV2ForSimulation } from '../simulation/infinityEconomyV2'

export interface CanonicalRuntimePersistenceCandidateV2 {
  readonly revision: number
  readonly savedAtUtc: string
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface CanonicalRuntimePersistenceReceiptV2 {
  readonly committed: true
}

export type CanonicalRuntimePersistenceV2 = (
  candidate: Readonly<CanonicalRuntimePersistenceCandidateV2>,
) =>
  | Readonly<CanonicalRuntimePersistenceReceiptV2>
  | Promise<Readonly<CanonicalRuntimePersistenceReceiptV2>>

export interface CanonicalActiveAdvanceV2Request {
  readonly expectedRevision: number
  readonly durationSeconds: number
  readonly context: Readonly<CanonicalEventTimeV2Context>
  readonly cancelRequested: (() => boolean) | null
}

export interface CanonicalSuspensionV2Request {
  readonly expectedRevision: number
  readonly foregroundResidueSeconds: number
  readonly legacyUtcText: string
  readonly savedAtUtc: string
  readonly context: Readonly<CanonicalEventTimeV2Context>
  readonly persist: CanonicalRuntimePersistenceV2
}

export interface CanonicalReturnV2Request {
  readonly expectedRevision: number
  readonly nowUtcMilliseconds: number
  readonly savedAtUtc: string
  readonly persist: CanonicalRuntimePersistenceV2
  readonly restartMonotonicSampling: () => void
}

export interface CanonicalStoredTimeSpendV2Request {
  readonly expectedRevision: number
  readonly durationSeconds: number
  readonly savedAtUtc: string
  readonly context: Readonly<CanonicalEventTimeV2Context>
  readonly cancelRequested: (() => boolean) | null
  readonly persist: CanonicalRuntimePersistenceV2
}

export type CanonicalLifecycleV2Status =
  | 'completed'
  | 'stored-time-exhausted'
  | 'cancelled'
  | 'blocked-unported-event'
  | 'zero-time-loop'
  | 'stale-revision'
  | 'yield-limit'
  | 'busy'
  | 'persistence-failed'
  | 'no-suspension-marker'
  | 'invalid-suspension-marker'

export interface CanonicalLifecycleV2Result {
  readonly status: CanonicalLifecycleV2Status
  readonly publication: Readonly<CanonicalRuntimePublicationV2>
  readonly changed: boolean
  readonly persisted: boolean
  readonly advance: Readonly<CanonicalRuntimeAdvanceV2Result> | null
  readonly awayTime: Readonly<V2AwayTimeResolution> | null
  readonly storedTimeCreditedSeconds: number
  readonly doubleTimeCreditedSeconds: number
  readonly monotonicSamplingRestarted: boolean
  readonly error?: string
}

/**
 * Dormant V2 publication owner. Its serialized lane makes state, Decimal
 * recurrence runtime and one safe-number revision visible as a single value.
 */
export class CanonicalLifecycleCoordinatorV2 {
  #publication: Readonly<CanonicalRuntimePublicationV2>
  #operationTail: Promise<void> = Promise.resolve()
  #persistenceBusy = false

  constructor(
    initial: Readonly<CanonicalRuntimePublicationV2>,
    issuedAuthority?: Readonly<CanonicalRuntimeApplicationAuthorityV2>,
  ) {
    this.#publication = issuedAuthority === undefined
      ? createCanonicalRuntimePublicationV2(initial)
      : admitIssuedCanonicalRuntimePublicationV2(issuedAuthority, initial)
  }

  snapshot(): Readonly<CanonicalRuntimePublicationV2> {
    return this.#publication
  }

  advanceActive(
    request: Readonly<CanonicalActiveAdvanceV2Request>,
  ): Promise<Readonly<CanonicalLifecycleV2Result>> {
    if (this.#persistenceBusy) return Promise.resolve(this.#busyResult())
    const captured = captureActiveRequest(request)
    return this.#enqueue(async () => {
      const advance = await stageCanonicalRuntimeAdvanceV2(
        this.#publication,
        Object.freeze({
          ...captured,
          mode: 'active' as const,
        }),
      )
      if (advance.changed) this.#publication = advance.candidate
      return lifecycleResult({
        status: advance.status,
        publication: this.#publication,
        changed: advance.changed,
        persisted: false,
        advance,
      })
    })
  }

  suspend(
    request: Readonly<CanonicalSuspensionV2Request>,
  ): Promise<Readonly<CanonicalLifecycleV2Result>> {
    if (this.#persistenceBusy) return Promise.resolve(this.#busyResult())
    const captured = captureSuspensionRequest(request)
    return this.#enqueue(async () => {
      const source = this.#publication
      if (captured.expectedRevision !== source.revision) {
        return lifecycleResult({
          status: 'stale-revision',
          publication: source,
        })
      }
      let advanced: Readonly<CanonicalRuntimeAdvanceV2Result> | null = null
      let state = source.state
      let runtime = source.runtime
      if (captured.foregroundResidueSeconds > 0) {
        advanced = await stageCanonicalRuntimeAdvanceV2(source, Object.freeze({
          expectedRevision: source.revision,
          durationSeconds: captured.foregroundResidueSeconds,
          mode: 'active' as const,
          context: captured.context,
          cancelRequested: null,
        }))
        if (!publishableAdvance(advanced)) {
          return lifecycleResult({
            status: advanced.status,
            publication: source,
            advance: advanced,
          })
        }
        state = advanced.candidate.state
        runtime = advanced.candidate.runtime
      }

      const existingMarker = state.timeline.lastSuspendedAtLegacyText
      const timeline = existingMarker === null
        ? withV2SuspensionMarker(state.timeline, captured.legacyUtcText)
        : state.timeline
      const changed = advanced?.changed === true || timeline !== state.timeline
      const candidate = changed
        ? createCanonicalRuntimePublicationV2({
          revision: source.revision + 1,
          state: Object.freeze({ ...state, timeline }) as CanonicalGameStateV2,
          runtime,
        })
        : source
      const persisted = await this.#persistCandidate(
        candidate,
        captured.savedAtUtc,
        captured.persist,
      )
      if (!persisted.ok) {
        return lifecycleResult({
          status: 'persistence-failed',
          publication: source,
          advance: advanced,
          error: persisted.error,
        })
      }
      this.#publication = candidate
      return lifecycleResult({
        status: 'completed',
        publication: candidate,
        changed,
        persisted: true,
        advance: advanced,
      })
    })
  }

  returnFromSuspension(
    request: Readonly<CanonicalReturnV2Request>,
  ): Promise<Readonly<CanonicalLifecycleV2Result>> {
    if (this.#persistenceBusy) return Promise.resolve(this.#busyResult())
    const captured = captureReturnRequest(request)
    return this.#enqueue(async () => {
      const source = this.#publication
      if (captured.expectedRevision !== source.revision) {
        return lifecycleResult({
          status: 'stale-revision',
          publication: source,
        })
      }
      const quitTimestamp = parseUnityInvariantUtcTimestamp(
        source.state.timeline.lastSuspendedAtLegacyText,
      )
      if (quitTimestamp.status === 'invalid') {
        return lifecycleResult({
          status: 'invalid-suspension-marker',
          publication: source,
          error: 'Persisted V2 suspension marker is invalid.',
        })
      }
      const awayTime = resolveV2AwayTime(Object.freeze({
        nowUtcMilliseconds: captured.nowUtcMilliseconds,
        quitTimestamp,
        startedTimestamp: parseUnityInvariantUtcTimestamp(
          source.state.meta.createdAtLegacyText,
        ),
      }))
      if (!awayTime.shouldConsumeSuspensionMarker) {
        const restarted = invokeRestart(captured.restartMonotonicSampling)
        return lifecycleResult({
          status: 'no-suspension-marker',
          publication: source,
          awayTime,
          monotonicSamplingRestarted: restarted.ok,
          error: restarted.error,
        })
      }
      const returned = applyV2ReturnedTime(source.state.timeline, awayTime)
      const candidate = createCanonicalRuntimePublicationV2({
        revision: source.revision + 1,
        state: Object.freeze({
          ...source.state,
          timeline: returned.timeline,
        }) as CanonicalGameStateV2,
        runtime: source.runtime,
      })
      const persisted = await this.#persistCandidate(
        candidate,
        captured.savedAtUtc,
        captured.persist,
      )
      if (!persisted.ok) {
        return lifecycleResult({
          status: 'persistence-failed',
          publication: source,
          awayTime,
          error: persisted.error,
        })
      }
      this.#publication = candidate
      const restarted = invokeRestart(captured.restartMonotonicSampling)
      return lifecycleResult({
        status: 'completed',
        publication: candidate,
        changed: true,
        persisted: true,
        awayTime,
        storedTimeCreditedSeconds: returned.storedTimeCreditedSeconds,
        doubleTimeCreditedSeconds: returned.doubleTimeCreditedSeconds,
        monotonicSamplingRestarted: restarted.ok,
        error: restarted.error,
      })
    })
  }

  spendStoredTime(
    request: Readonly<CanonicalStoredTimeSpendV2Request>,
  ): Promise<Readonly<CanonicalLifecycleV2Result>> {
    if (this.#persistenceBusy) return Promise.resolve(this.#busyResult())
    const captured = captureStoredTimeRequest(request)
    return this.#enqueue(async () => {
      const source = this.#publication
      const advance = await stageCanonicalRuntimeAdvanceV2(source, Object.freeze({
        expectedRevision: captured.expectedRevision,
        durationSeconds: captured.durationSeconds,
        mode: 'stored-time' as const,
        context: captured.context,
        cancelRequested: captured.cancelRequested,
      }))
      if (!publishableAdvance(advance) || !advance.changed) {
        return lifecycleResult({
          status: advance.status,
          publication: source,
          advance,
        })
      }
      const persisted = await this.#persistCandidate(
        advance.candidate,
        captured.savedAtUtc,
        captured.persist,
      )
      if (!persisted.ok) {
        return lifecycleResult({
          status: 'persistence-failed',
          publication: source,
          advance,
          error: persisted.error,
        })
      }
      this.#publication = advance.candidate
      return lifecycleResult({
        status: advance.status,
        publication: advance.candidate,
        changed: true,
        persisted: true,
        advance,
      })
    })
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#operationTail.then(operation, operation)
    this.#operationTail = result.then(() => undefined, () => undefined)
    return result
  }

  #busyResult(): Readonly<CanonicalLifecycleV2Result> {
    return lifecycleResult({
      status: 'busy',
      publication: this.#publication,
      error: 'Canonical V2 persistence is in progress; reentrant and concurrent operations are rejected.',
    })
  }

  async #persistCandidate(
    publication: Readonly<CanonicalRuntimePublicationV2>,
    savedAtUtc: string,
    persist: CanonicalRuntimePersistenceV2,
  ): Promise<Readonly<{ ok: true } | { ok: false; error: string }>> {
    if (this.#persistenceBusy) {
      return Object.freeze({
        ok: false,
        error: 'Canonical V2 persistence is already in progress.',
      })
    }
    this.#persistenceBusy = true
    try {
      return await persistCandidate(publication, savedAtUtc, persist)
    } finally {
      this.#persistenceBusy = false
    }
  }
}

function publishableAdvance(result: Readonly<CanonicalRuntimeAdvanceV2Result>): boolean {
  return result.status === 'completed' || result.status === 'stored-time-exhausted'
}

async function persistCandidate(
  publication: Readonly<CanonicalRuntimePublicationV2>,
  savedAtUtc: string,
  persist: CanonicalRuntimePersistenceV2,
): Promise<Readonly<{ ok: true } | { ok: false; error: string }>> {
  const candidate = Object.freeze({
    revision: publication.revision,
    savedAtUtc,
    state: publication.state,
    runtime: publication.runtime,
  })
  try {
    const receipt = await persist(candidate)
    const properties = closedDataProperties(
      receipt,
      ['committed'],
      'Canonical V2 persistence receipt',
    )
    if (dataValue(properties, 'committed', 'Canonical V2 persistence receipt') !== true) {
      throw new TypeError('Canonical V2 persistence receipt must confirm commit.')
    }
    return Object.freeze({ ok: true })
  } catch (error) {
    return Object.freeze({ ok: false, error: errorMessage(error) })
  }
}

function captureActiveRequest(value: unknown): Readonly<CanonicalActiveAdvanceV2Request> {
  const properties = closedDataProperties(value, [
    'expectedRevision',
    'durationSeconds',
    'context',
    'cancelRequested',
  ], 'Canonical V2 active request')
  return Object.freeze({
    expectedRevision: requireRevision(dataValue(properties, 'expectedRevision', 'Canonical V2 active request')),
    durationSeconds: requirePositiveSeconds(dataValue(properties, 'durationSeconds', 'Canonical V2 active request'), 'Active duration'),
    context: captureEventContext(
      dataValue(properties, 'context', 'Canonical V2 active request'),
    ),
    cancelRequested: requireCancellation(dataValue(properties, 'cancelRequested', 'Canonical V2 active request')),
  })
}

function captureSuspensionRequest(value: unknown): Readonly<CanonicalSuspensionV2Request> {
  const properties = closedDataProperties(value, [
    'expectedRevision',
    'foregroundResidueSeconds',
    'legacyUtcText',
    'savedAtUtc',
    'context',
    'persist',
  ], 'Canonical V2 suspension request')
  const residue = dataValue(properties, 'foregroundResidueSeconds', 'Canonical V2 suspension request')
  if (typeof residue !== 'number' || !Number.isFinite(residue) || residue < 0 || Object.is(residue, -0)) {
    throw new RangeError('Foreground residue must be finite and non-negative.')
  }
  const legacyUtcText = dataValue(properties, 'legacyUtcText', 'Canonical V2 suspension request')
  if (typeof legacyUtcText !== 'string' || legacyUtcText.trim() === '') {
    throw new TypeError('Suspension UTC text must be nonblank.')
  }
  const savedAtUtc = requireCanonicalUtc(
    dataValue(properties, 'savedAtUtc', 'Canonical V2 suspension request'),
  )
  const parsedMarker = parseUnityInvariantUtcTimestamp(legacyUtcText)
  if (
    parsedMarker.status !== 'valid' ||
    parsedMarker.utcMilliseconds !== Date.parse(savedAtUtc)
  ) {
    throw new RangeError(
      'Suspension marker and savedAtUtc must represent the same valid captured instant.',
    )
  }
  return Object.freeze({
    expectedRevision: requireRevision(dataValue(properties, 'expectedRevision', 'Canonical V2 suspension request')),
    foregroundResidueSeconds: residue,
    legacyUtcText,
    savedAtUtc,
    context: captureEventContext(
      dataValue(properties, 'context', 'Canonical V2 suspension request'),
    ),
    persist: requirePersistence(dataValue(properties, 'persist', 'Canonical V2 suspension request')),
  })
}

function captureReturnRequest(value: unknown): Readonly<CanonicalReturnV2Request> {
  const properties = closedDataProperties(value, [
    'expectedRevision',
    'nowUtcMilliseconds',
    'savedAtUtc',
    'persist',
    'restartMonotonicSampling',
  ], 'Canonical V2 return request')
  const now = dataValue(properties, 'nowUtcMilliseconds', 'Canonical V2 return request')
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    throw new RangeError('Return UTC milliseconds must be finite.')
  }
  const restart = dataValue(properties, 'restartMonotonicSampling', 'Canonical V2 return request')
  if (typeof restart !== 'function') {
    throw new TypeError('Monotonic restart callback must be a function.')
  }
  const savedAtUtc = requireCanonicalUtc(
    dataValue(properties, 'savedAtUtc', 'Canonical V2 return request'),
  )
  if (now !== Date.parse(savedAtUtc)) {
    throw new RangeError(
      'Return nowUtcMilliseconds and savedAtUtc must represent the same captured instant.',
    )
  }
  return Object.freeze({
    expectedRevision: requireRevision(dataValue(properties, 'expectedRevision', 'Canonical V2 return request')),
    nowUtcMilliseconds: now,
    savedAtUtc,
    persist: requirePersistence(dataValue(properties, 'persist', 'Canonical V2 return request')),
    restartMonotonicSampling: restart as () => void,
  })
}

function captureStoredTimeRequest(value: unknown): Readonly<CanonicalStoredTimeSpendV2Request> {
  const properties = closedDataProperties(value, [
    'expectedRevision',
    'durationSeconds',
    'savedAtUtc',
    'context',
    'cancelRequested',
    'persist',
  ], 'Canonical V2 stored-time request')
  return Object.freeze({
    expectedRevision: requireRevision(dataValue(properties, 'expectedRevision', 'Canonical V2 stored-time request')),
    durationSeconds: requirePositiveSeconds(dataValue(properties, 'durationSeconds', 'Canonical V2 stored-time request'), 'Stored-time duration'),
    savedAtUtc: requireCanonicalUtc(dataValue(properties, 'savedAtUtc', 'Canonical V2 stored-time request')),
    context: captureEventContext(
      dataValue(properties, 'context', 'Canonical V2 stored-time request'),
    ),
    cancelRequested: requireCancellation(dataValue(properties, 'cancelRequested', 'Canonical V2 stored-time request')),
    persist: requirePersistence(dataValue(properties, 'persist', 'Canonical V2 stored-time request')),
  })
}

function captureEventContext(value: unknown): Readonly<CanonicalEventTimeV2Context> {
  const properties = closedDataProperties(value, [
    'automationIntervalSeconds',
    'timerAggregationAuthority',
    'quantumEpochAuthority',
    'dormantDueEvents',
    'catalogLookup',
    'infinityRewardAuthority',
  ], 'Canonical V2 event context')
  const automationIntervalSeconds = dataValue(
    properties,
    'automationIntervalSeconds',
    'Canonical V2 event context',
  )
  if (
    typeof automationIntervalSeconds !== 'number' ||
    !Number.isFinite(automationIntervalSeconds) ||
    automationIntervalSeconds <= 0 ||
    Object.is(automationIntervalSeconds, -0)
  ) throw new RangeError('Automation interval must be finite and positive.')
  const timerAggregationAuthority = dataValue(
    properties,
    'timerAggregationAuthority',
    'Canonical V2 event context',
  )
  if (timerAggregationAuthority !== null) {
    throw new TypeError(
      'Canonical V2 lifecycle context cannot enable Fast timer aggregation.',
    )
  }
  if (dataValue(properties, 'quantumEpochAuthority', 'Canonical V2 event context') !== null) {
    throw new TypeError('Canonical V2 lifecycle context cannot enable worker Quantum epochs.')
  }
  const dormantProperties = closedDataProperties(
    dataValue(properties, 'dormantDueEvents', 'Canonical V2 event context'),
    ['reality', 'dreamReset', 'botCapTransition', 'infinityReset'],
    'Canonical V2 dormant event context',
  )
  const dormantDueEvents = Object.freeze({
    reality: requireBooleanData(dormantProperties, 'reality'),
    dreamReset: requireBooleanData(dormantProperties, 'dreamReset'),
    botCapTransition: requireBooleanData(
      dormantProperties,
      'botCapTransition',
    ),
    infinityReset: requireBooleanData(dormantProperties, 'infinityReset'),
  })
  const catalogLookup = dataValue(
    properties,
    'catalogLookup',
    'Canonical V2 event context',
  )
  if (catalogLookup !== null && typeof catalogLookup !== 'function') {
    throw new TypeError('Canonical V2 catalog lookup must be a function or null.')
  }
  return Object.freeze({
    automationIntervalSeconds,
    timerAggregationAuthority,
    quantumEpochAuthority: null,
    dormantDueEvents,
    catalogLookup: catalogLookup as CanonicalEventTimeV2Context['catalogLookup'],
    infinityRewardAuthority: captureInfinityRewardAuthorityV2ForSimulation(
      dataValue(properties, 'infinityRewardAuthority', 'Canonical V2 event context'),
    ),
  })
}

function requireBooleanData(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
): boolean {
  const value = dataValue(properties, key, 'Canonical V2 dormant event context')
  if (typeof value !== 'boolean') {
    throw new TypeError('Canonical V2 dormant event flags must be boolean.')
  }
  return value
}

function requireRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Expected V2 lifecycle revision must be a non-negative safe integer.')
  }
  return value
}

function requirePositiveSeconds(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || Object.is(value, -0)) {
    throw new RangeError(`${label} must be finite and positive.`)
  }
  return value
}

function requireCanonicalUtc(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('savedAtUtc must be a string.')
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new RangeError('savedAtUtc must be canonical UTC text.')
  }
  return value
}

function requireCancellation(value: unknown): (() => boolean) | null {
  if (value !== null && typeof value !== 'function') {
    throw new TypeError('Cancellation probe must be a function or null.')
  }
  return value as (() => boolean) | null
}

function requirePersistence(value: unknown): CanonicalRuntimePersistenceV2 {
  if (typeof value !== 'function') throw new TypeError('Persistence callback must be a function.')
  return value as CanonicalRuntimePersistenceV2
}

function invokeRestart(callback: () => void): Readonly<{ ok: boolean; error?: string }> {
  try {
    callback()
    return Object.freeze({ ok: true })
  } catch (error) {
    return Object.freeze({ ok: false, error: errorMessage(error) })
  }
}

function lifecycleResult(
  partial: Readonly<{
    status: CanonicalLifecycleV2Status
    publication: Readonly<CanonicalRuntimePublicationV2>
    changed?: boolean
    persisted?: boolean
    advance?: Readonly<CanonicalRuntimeAdvanceV2Result> | null
    awayTime?: Readonly<V2AwayTimeResolution> | null
    storedTimeCreditedSeconds?: number
    doubleTimeCreditedSeconds?: number
    monotonicSamplingRestarted?: boolean
    error?: string
  }>,
): Readonly<CanonicalLifecycleV2Result> {
  return Object.freeze({
    status: partial.status,
    publication: partial.publication,
    changed: partial.changed ?? false,
    persisted: partial.persisted ?? false,
    advance: partial.advance ?? null,
    awayTime: partial.awayTime ?? null,
    storedTimeCreditedSeconds: partial.storedTimeCreditedSeconds ?? 0,
    doubleTimeCreditedSeconds: partial.doubleTimeCreditedSeconds ?? 0,
    monotonicSamplingRestarted: partial.monotonicSamplingRestarted ?? false,
    ...(partial.error === undefined ? {} : { error: partial.error }),
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
