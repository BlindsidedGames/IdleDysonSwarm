import {
  cloneCanonicalGameStateV2,
  isStructurallyValidatedCanonicalGameStateV2,
  validateCanonicalGameStateV2ForTrustedReuse,
} from '../game-state/cloneV2'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  advanceCanonicalEventTimeV2,
  prepareCanonicalEventTimeCarrierV2,
  resumeCanonicalEventTimeV2,
  type CanonicalEventTimeCarrierV2,
  type CanonicalEventTimeV2AdvanceResult,
  type CanonicalEventTimeV2Context,
} from '../simulation/canonicalEventTimeModelV2'

const MAXIMUM_INTERNAL_YIELDS = 4_096
const MAXIMUM_RETAINED_CHUNK_DIAGNOSTICS = 4
const COOPERATIVE_MATERIAL_EVENT_BUDGET = 8
const issuedPublications = new WeakSet<object>()
const issuedApplicationAuthorities = new WeakSet<object>()

export interface CanonicalRuntimeApplicationAuthorityV2 {
  readonly policy: 'canonical-runtime-application-publication-v1'
}

export interface CanonicalRuntimePublicationV2 {
  readonly revision: number
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface CanonicalRuntimeAdvanceV2Request {
  readonly expectedRevision: number
  readonly durationSeconds: number
  readonly mode: 'active' | 'stored-time'
  readonly context: Readonly<CanonicalEventTimeV2Context>
  readonly cancelRequested: (() => boolean) | null
}

export type CanonicalRuntimeAdvanceV2Status =
  | 'completed'
  | 'stored-time-exhausted'
  | 'cancelled'
  | 'blocked-unported-event'
  | 'zero-time-loop'
  | 'stale-revision'
  | 'yield-limit'

export interface CanonicalRuntimeAdvanceV2Result {
  readonly status: CanonicalRuntimeAdvanceV2Status
  readonly source: Readonly<CanonicalRuntimePublicationV2>
  readonly candidate: Readonly<CanonicalRuntimePublicationV2>
  readonly changed: boolean
  readonly consumedSeconds: number
  readonly remainingSeconds: number
  readonly yieldCount: number
  readonly cooperativeYields: number
  readonly diagnosticChunks: readonly Readonly<CanonicalRuntimeChunkDiagnosticV2>[]
  readonly diagnosticCode?: string
}

export interface CanonicalRuntimeChunkDiagnosticV2 {
  readonly status: CanonicalEventTimeV2AdvanceResult['status']
  readonly consumedSeconds: number
  readonly remainingSeconds: number
  readonly materialEvents: number
  readonly carrierRevision: number
  readonly carrierWasSource: boolean
  readonly hasContinuation: boolean
  readonly automationPolicy: CanonicalEventTimeV2AdvanceResult['summary']['automationPolicy']
}

/** Restores and owns one exact immutable V2 publication boundary. */
export function createCanonicalRuntimePublicationV2(
  value: Readonly<CanonicalRuntimePublicationV2>,
): Readonly<CanonicalRuntimePublicationV2> {
  const properties = closedDataProperties(
    value,
    ['revision', 'state', 'runtime'],
    'Canonical V2 runtime publication',
  )
  const revision = dataValue(
    properties,
    'revision',
    'Canonical V2 runtime publication',
  )
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    revision === Number.MAX_SAFE_INTEGER
  ) {
    throw new RangeError(
      'Canonical V2 runtime revision must be an incrementable non-negative safe integer.',
    )
  }
  const publication = prepareCanonicalEventTimeCarrierV2(Object.freeze({
    revision,
    state: cloneCanonicalGameStateV2(
      dataValue(properties, 'state', 'Canonical V2 runtime publication') as
        Readonly<CanonicalGameStateV2>,
    ),
    runtime: cloneCanonicalRuntimeSidecarV2(
      dataValue(properties, 'runtime', 'Canonical V2 runtime publication') as
        Readonly<CanonicalRuntimeSidecarV2>,
    ),
  }))
  issuedPublications.add(publication)
  return publication
}

/**
 * Issues the narrow application-owned publication capability. It lets the
 * already-admitted runtime adopt a structurally frozen command result without
 * cloning the complete canonical state a second time.
 */
export function registerCanonicalRuntimeApplicationAuthorityV2():
Readonly<CanonicalRuntimeApplicationAuthorityV2> {
  const authority = Object.freeze({
    policy: 'canonical-runtime-application-publication-v1' as const,
  })
  issuedApplicationAuthorities.add(authority)
  return authority
}

export function adoptPreparedCanonicalRuntimePublicationV2(
  authority: Readonly<CanonicalRuntimeApplicationAuthorityV2>,
  source: Readonly<CanonicalRuntimePublicationV2>,
  value: Readonly<CanonicalRuntimePublicationV2>,
): Readonly<CanonicalRuntimePublicationV2> {
  if (!issuedApplicationAuthorities.has(authority as object)) {
    throw new TypeError('Canonical runtime application authority is not authentic.')
  }
  requireIssuedPublication(source)
  const properties = closedDataProperties(
    value,
    ['revision', 'state', 'runtime'],
    'Prepared canonical V2 runtime publication',
  )
  const revision = dataValue(
    properties,
    'revision',
    'Prepared canonical V2 runtime publication',
  )
  if (revision !== source.revision + 1) {
    throw new RangeError('Prepared canonical V2 runtime publication must advance one revision.')
  }
  const state = dataValue(
    properties,
    'state',
    'Prepared canonical V2 runtime publication',
  ) as Readonly<CanonicalGameStateV2>
  if (!isStructurallyValidatedCanonicalGameStateV2(state)) {
    validateCanonicalGameStateV2ForTrustedReuse(state)
  }
  const runtime = cloneCanonicalRuntimeSidecarV2(
    dataValue(
      properties,
      'runtime',
      'Prepared canonical V2 runtime publication',
    ) as Readonly<CanonicalRuntimeSidecarV2>,
  )
  const publication = prepareCanonicalEventTimeCarrierV2(Object.freeze({
    revision,
    state,
    runtime,
  }))
  issuedPublications.add(publication)
  return publication
}

/**
 * Reuses an already-issued immutable publication at an application-owned
 * composition boundary. No arbitrary structural value can enter here: both
 * the authority and publication identities must have been issued above.
 */
export function admitIssuedCanonicalRuntimePublicationV2(
  authority: Readonly<CanonicalRuntimeApplicationAuthorityV2>,
  publication: Readonly<CanonicalRuntimePublicationV2>,
): Readonly<CanonicalRuntimePublicationV2> {
  if (!issuedApplicationAuthorities.has(authority as object)) {
    throw new TypeError('Canonical runtime application authority is not authentic.')
  }
  requireIssuedPublication(publication)
  return publication
}

/**
 * Drains scheduler yield boundaries without exposing partial state. Every
 * opaque continuations retain the source revision; only the final represented
 * candidate receives one outer revision.
 */
export async function stageCanonicalRuntimeAdvanceV2(
  source: Readonly<CanonicalRuntimePublicationV2>,
  request: Readonly<CanonicalRuntimeAdvanceV2Request>,
): Promise<Readonly<CanonicalRuntimeAdvanceV2Result>> {
  requireIssuedPublication(source)
  const captured = captureAdvanceRequest(request)
  if (captured.expectedRevision !== source.revision) {
    return freezeAdvanceResult({
      status: 'stale-revision',
      source,
      candidate: source,
      changed: false,
      consumedSeconds: 0,
      remainingSeconds: captured.durationSeconds,
      yieldCount: 0,
      cooperativeYields: 0,
      diagnosticChunks: [],
      diagnosticCode: 'V2_STALE_REVISION',
    })
  }

  const diagnosticChunks: Readonly<CanonicalRuntimeChunkDiagnosticV2>[] = []
  let yieldCount = 0
  let cooperativeYields = 0
  let result = advanceCanonicalEventTimeV2(Object.freeze({
    carrier: source,
    durationSeconds: captured.durationSeconds,
    mode: captured.mode,
    context: captured.context,
    queuedInputs: Object.freeze([]),
    cancelRequested: captured.cancelRequested,
    materialEventBudget: COOPERATIVE_MATERIAL_EVENT_BUDGET,
  }))
  let previousConsumedSeconds = -1
  for (let loopIndex = 0; loopIndex <= MAXIMUM_INTERNAL_YIELDS; loopIndex += 1) {
    retainChunkDiagnostic(diagnosticChunks, result, source)
    if (result.status === 'yielded') {
      yieldCount += 1
      if (
        loopIndex === MAXIMUM_INTERNAL_YIELDS ||
        result.continuation === undefined ||
        !(result.consumedSeconds > previousConsumedSeconds) ||
        !(result.remainingSeconds < captured.durationSeconds)
      ) {
        return freezeAdvanceResult({
          status: 'yield-limit',
          source,
          candidate: source,
          changed: false,
          consumedSeconds: 0,
          remainingSeconds: captured.durationSeconds,
          yieldCount,
          cooperativeYields,
          diagnosticChunks,
          diagnosticCode: 'V2_RUNTIME_YIELD_LIMIT',
        })
      }
      previousConsumedSeconds = result.consumedSeconds
      await yieldToEventLoop()
      cooperativeYields += 1
      result = resumeCanonicalEventTimeV2(
        result.continuation,
        captured.cancelRequested,
      )
      continue
    }

    if (
      result.status === 'cancelled' ||
      result.status === 'blocked-unported-event' ||
      result.status === 'zero-time-loop'
    ) {
      return freezeAdvanceResult({
        status: result.status,
        source,
        candidate: source,
        changed: false,
        consumedSeconds: 0,
        remainingSeconds: captured.durationSeconds,
        yieldCount,
        cooperativeYields,
        diagnosticChunks,
        diagnosticCode: result.diagnosticCode,
      })
    }

    const consumedSeconds = result.consumedSeconds
    const remainingSeconds = result.remainingSeconds
    const changed = consumedSeconds > 0
    const candidate = changed
      ? issuePublication(result.carrier)
      : source
    return freezeAdvanceResult({
      status: result.status,
      source,
      candidate,
      changed,
      consumedSeconds,
      remainingSeconds,
      yieldCount,
      cooperativeYields,
      diagnosticChunks,
      diagnosticCode: result.diagnosticCode,
    })
  }
  throw new Error('Unreachable V2 runtime yield drain.')
}

function captureAdvanceRequest(
  value: unknown,
): Readonly<CanonicalRuntimeAdvanceV2Request> {
  const properties = closedDataProperties(value, [
    'expectedRevision',
    'durationSeconds',
    'mode',
    'context',
    'cancelRequested',
  ], 'Canonical V2 runtime advance request')
  const expectedRevision = dataValue(
    properties,
    'expectedRevision',
    'Canonical V2 runtime advance request',
  )
  const durationSeconds = dataValue(
    properties,
    'durationSeconds',
    'Canonical V2 runtime advance request',
  )
  const mode = dataValue(properties, 'mode', 'Canonical V2 runtime advance request')
  const context = dataValue(
    properties,
    'context',
    'Canonical V2 runtime advance request',
  )
  const cancelRequested = dataValue(
    properties,
    'cancelRequested',
    'Canonical V2 runtime advance request',
  )
  if (
    typeof expectedRevision !== 'number' ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  ) throw new RangeError('Expected V2 runtime revision must be a non-negative safe integer.')
  if (
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    Object.is(durationSeconds, -0)
  ) throw new RangeError('V2 runtime duration must be finite and positive.')
  if (mode !== 'active' && mode !== 'stored-time') {
    throw new TypeError('V2 runtime mode is unsupported.')
  }
  if (cancelRequested !== null && typeof cancelRequested !== 'function') {
    throw new TypeError('V2 runtime cancellation probe must be a function or null.')
  }
  return Object.freeze({
    expectedRevision,
    durationSeconds,
    mode,
    context: context as Readonly<CanonicalEventTimeV2Context>,
    cancelRequested: cancelRequested as (() => boolean) | null,
  })
}

function issuePublication(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
): Readonly<CanonicalRuntimePublicationV2> {
  const publication = prepareCanonicalEventTimeCarrierV2(carrier)
  // The event-time engine returns its internally validated immutable carrier.
  // Preserve that ownership fact so a following small player transaction can
  // structurally share unchanged canonical sections.
  if (!isStructurallyValidatedCanonicalGameStateV2(publication.state)) {
    validateCanonicalGameStateV2ForTrustedReuse(publication.state)
  }
  issuedPublications.add(publication)
  return publication
}

function requireIssuedPublication(
  publication: Readonly<CanonicalRuntimePublicationV2>,
): void {
  if (
    publication === null ||
    typeof publication !== 'object' ||
    !issuedPublications.has(publication)
  ) throw new TypeError('Canonical V2 runtime publication was not issued by this boundary.')
}

function freezeAdvanceResult(
  result: CanonicalRuntimeAdvanceV2Result,
): Readonly<CanonicalRuntimeAdvanceV2Result> {
  return Object.freeze({
    ...result,
    diagnosticChunks: Object.freeze([...result.diagnosticChunks]),
  })
}

function retainChunkDiagnostic(
  chunks: Readonly<CanonicalRuntimeChunkDiagnosticV2>[],
  result: Readonly<CanonicalEventTimeV2AdvanceResult>,
  source: Readonly<CanonicalRuntimePublicationV2>,
): void {
  chunks.push(Object.freeze({
    status: result.status,
    consumedSeconds: result.consumedSeconds,
    remainingSeconds: result.remainingSeconds,
    materialEvents: result.materialEvents,
    carrierRevision: result.carrier.revision,
    carrierWasSource: result.carrier === source,
    hasContinuation: result.continuation !== undefined,
    automationPolicy: result.summary.automationPolicy,
  }))
  if (chunks.length > MAXIMUM_RETAINED_CHUNK_DIAGNOSTICS) chunks.shift()
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0))
}

export function closedDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) throw new TypeError(`${label} must be a closed plain object.`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !expectedKeys.includes(key)) return true
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    })
  ) throw new TypeError(`${label} must contain exactly its declared data fields.`)
  return descriptors
}

export function dataValue(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  label: string,
): unknown {
  const descriptor = properties[key]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} must be a data property.`)
  }
  return descriptor.value
}
