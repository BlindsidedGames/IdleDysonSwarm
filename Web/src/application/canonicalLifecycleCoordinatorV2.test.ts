import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { PreparedSave } from '../save/prepare'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
} from '../save/schema13'
import { deserializeWebSave } from '../save/serialization'
import { issueInfinityRewardAuthorityV2ForApplication } from './infinityRewardAuthorityV2'
import {
  CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
  type CanonicalEventTimeV2Context,
} from '../simulation/canonicalEventTimeModelV2'
import {
  CanonicalLifecycleCoordinatorV2,
  type CanonicalRuntimePersistenceCandidateV2,
  type CanonicalRuntimePersistenceV2,
} from './canonicalLifecycleCoordinatorV2'
import { createCanonicalRuntimePublicationV2 } from './canonicalRuntimeSessionV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const SAVED_AT = '2026-08-08T00:00:10.000Z'
const INFINITY_REWARD_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)

function context(
  automationIntervalSeconds = 1,
): Readonly<CanonicalEventTimeV2Context> {
  return Object.freeze({
    automationIntervalSeconds,
    timerAggregationAuthority: null,
    quantumEpochAuthority: null,
    dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
    catalogLookup: null,
    infinityRewardAuthority: INFINITY_REWARD_AUTHORITY,
  })
}

function stateWith(options: Readonly<{
  automationHorizon?: number
  infinityHorizon?: number
  storedAvailable?: number
  storedCapacity?: number
  doubleBank?: number
  doubleRate?: number
  doubleUnlocked?: boolean
  suspendedAt?: string | null
}> = {}): CanonicalGameStateV2 {
  const source = migrated.state
  return cloneCanonicalGameStateV2({
    ...source,
    timeline: {
      ...source.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: options.automationHorizon ?? 1,
      infinityBoundaryRemaining: options.infinityHorizon ?? 10_000,
      storedTimeAvailableSeconds: options.storedAvailable ?? 10,
      storedTimeCapacitySeconds: options.storedCapacity ?? 10,
      lastSuspendedAtLegacyText:
        options.suspendedAt === undefined
          ? source.timeline.lastSuspendedAtLegacyText
          : options.suspendedAt,
      doubleTime: {
        ...source.timeline.doubleTime,
        unlocked: options.doubleUnlocked ?? false,
        enabled: options.doubleUnlocked ?? false,
        bankSeconds: options.doubleBank ?? 0,
        rate: options.doubleRate ?? 0,
      },
    },
  })
}

function coordinator(
  state = stateWith(),
  revision = 7,
): CanonicalLifecycleCoordinatorV2 {
  return new CanonicalLifecycleCoordinatorV2(
    createCanonicalRuntimePublicationV2({
      revision,
      state,
      runtime: migrated.runtime,
    }),
  )
}

const committed: CanonicalRuntimePersistenceV2 = async () =>
  Object.freeze({ committed: true as const })

describe('dormant CanonicalLifecycleCoordinatorV2', () => {
  test('publishes state and Decimal recurrence runtime together with one outer revision', async () => {
    const session = coordinator()
    const before = session.snapshot()
    const result = await session.advanceActive(Object.freeze({
      expectedRevision: before.revision,
      durationSeconds: 0.01,
      context: context(),
      cancelRequested: null,
    }))

    expect(result).toMatchObject({
      status: 'completed',
      changed: true,
      persisted: false,
    })
    expect(result.publication.revision).toBe(before.revision + 1)
    expect(session.snapshot()).toBe(result.publication)
    expect(Object.keys(result.publication)).toEqual(['revision', 'state', 'runtime'])
    expect(Object.isFrozen(result.publication)).toBe(true)
    expect(Object.isFrozen(result.publication.runtime)).toBe(true)
    expect(before.revision).toBe(7)
  })

  test('drains multiple opaque scheduler yields without partial publication or extra revisions', async () => {
    const session = coordinator(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 10,
      doubleUnlocked: true,
      doubleBank: 10,
      doubleRate: 1,
    }))
    const source = session.snapshot()
    const result = await session.advanceActive(Object.freeze({
      expectedRevision: source.revision,
      durationSeconds: 0.3,
      context: context(0.001),
      cancelRequested: null,
    }))

    expect(result.status).toBe('completed')
    expect(result.advance!.yieldCount).toBeGreaterThanOrEqual(2)
    expect(result.advance!.cooperativeYields).toBe(result.advance!.yieldCount)
    expect(result.advance!.diagnosticChunks.length).toBeLessThanOrEqual(4)
    for (const chunk of result.advance!.diagnosticChunks.filter(
      (entry) => entry.status === 'yielded',
    )) {
      expect(chunk.carrierWasSource).toBe(true)
      expect(chunk.carrierRevision).toBe(source.revision)
      expect(chunk.hasContinuation).toBe(true)
    }
    expect(result.publication.revision).toBe(source.revision + 1)
  })

  test('yields cooperatively between bounded chunks and observes cancellation there', async () => {
    const state = stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 10,
      doubleUnlocked: true,
      doubleBank: 10,
      doubleRate: 1,
    })
    const responsive = coordinator(state)
    let timerRan = false
    let timerDelayMilliseconds = Number.POSITIVE_INFINITY
    const started = performance.now()
    globalThis.setTimeout(() => {
      timerRan = true
      timerDelayMilliseconds = performance.now() - started
    }, 0)
    const completed = await responsive.advanceActive(Object.freeze({
      expectedRevision: responsive.snapshot().revision,
      durationSeconds: 0.3,
      context: context(0.001),
      cancelRequested: null,
    }))
    expect(timerRan).toBe(true)
    // One material event is the scheduler's minimum indivisible unit. The
    // coordinator uses that minimum budget and must yield well before the
    // former whole 300-event drain completes.
    expect(timerDelayMilliseconds).toBeLessThan(100)
    expect(completed.advance!.yieldCount).toBeGreaterThan(1)
    expect(completed.advance!.diagnosticChunks).toHaveLength(4)
    expect(completed.advance!.diagnosticChunks.every((diagnostic) =>
      !('carrier' in diagnostic) &&
      !('continuation' in diagnostic) &&
      !('summary' in diagnostic),
    )).toBe(true)

    const cancellable = coordinator(state)
    const source = cancellable.snapshot()
    let cancelled = false
    globalThis.setTimeout(() => { cancelled = true }, 0)
    const result = await cancellable.advanceActive(Object.freeze({
      expectedRevision: source.revision,
      durationSeconds: 0.3,
      context: context(0.001),
      cancelRequested: () => cancelled,
    }))
    expect(result.status).toBe('cancelled')
    expect(result.publication).toBe(source)
    expect(result.advance!.yieldCount).toBeGreaterThan(0)
  })

  test('advances foreground residue before stamping and persisting suspension', async () => {
    const events: string[] = []
    const session = coordinator(stateWith({ suspendedAt: null }))
    const source = session.snapshot()
    const persisted: CanonicalRuntimePersistenceV2 = async (candidate) => {
      events.push('persist')
      expect(session.snapshot()).toBe(source)
      expect(candidate.state.timeline.infinityCycleSeconds)
        .toBeGreaterThan(source.state.timeline.infinityCycleSeconds)
      expect(candidate.state.timeline.lastSuspendedAtLegacyText)
        .toBe('2026-08-08T00:00:05.000Z')
      return Object.freeze({ committed: true })
    }

    const result = await session.suspend(Object.freeze({
      expectedRevision: source.revision,
      foregroundResidueSeconds: 0.25,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: persisted,
    }))

    expect(events).toEqual(['persist'])
    expect(result).toMatchObject({ status: 'completed', persisted: true, changed: true })
    expect(result.publication.revision).toBe(source.revision + 1)
  })

  test('keeps suspension residue and marker invisible on failure so retry is exact', async () => {
    const session = coordinator(stateWith({ suspendedAt: null }))
    const source = session.snapshot()
    const failed = await session.suspend(Object.freeze({
      expectedRevision: source.revision,
      foregroundResidueSeconds: 0.25,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: async () => { throw new Error('disk unavailable') },
    }))
    expect(failed).toMatchObject({ status: 'persistence-failed', persisted: false })
    expect(session.snapshot()).toBe(source)
    expect(session.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()

    const retried = await session.suspend(Object.freeze({
      expectedRevision: source.revision,
      foregroundResidueSeconds: 0.25,
      legacyUtcText: '2026-08-08T00:00:06.000Z',
      savedAtUtc: '2026-08-08T00:00:06.000Z',
      context: context(),
      persist: committed,
    }))
    expect(retried.status).toBe('completed')
    expect(retried.publication.state.timeline.lastSuspendedAtLegacyText)
      .toBe('2026-08-08T00:00:06.000Z')
    expect(retried.publication.revision).toBe(source.revision + 1)
  })

  test('returns bank-only, persists the Decimal snapshot, then restarts monotonic sampling', async () => {
    const session = coordinator(stateWith({
      suspendedAt: '2026-08-08T00:00:00.000Z',
      storedAvailable: 0,
      storedCapacity: 10,
      doubleBank: 0,
    }))
    const source = session.snapshot()
    const events: string[] = []
    let reloaded: ReturnType<typeof decodeSchema13WebSave> | undefined
    const persist: CanonicalRuntimePersistenceV2 = async (candidate) => {
      events.push('persist')
      expect(session.snapshot()).toBe(source)
      reloaded = decodeSchema13WebSave(encodeCandidate(candidate))
      return Object.freeze({ committed: true })
    }
    const result = await session.returnFromSuspension(Object.freeze({
      expectedRevision: source.revision,
      nowUtcMilliseconds: Date.parse(SAVED_AT),
      savedAtUtc: SAVED_AT,
      persist,
      restartMonotonicSampling: () => { events.push('restart') },
    }))

    expect(events).toEqual(['persist', 'restart'])
    expect(result).toMatchObject({
      status: 'completed',
      persisted: true,
      monotonicSamplingRestarted: true,
      storedTimeCreditedSeconds: 10,
      doubleTimeCreditedSeconds: 20,
    })
    expect(result.publication.state.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(result.publication.state.dyson).toEqual(source.state.dyson)
    expect(result.publication.runtime).toEqual(source.runtime)
    expect(reloaded!.runtime).toEqual(result.publication.runtime)
    expect(reloaded!.state).toEqual(result.publication.state)
  })

  test('does not consume a return marker or restart sampling until persistence succeeds', async () => {
    const session = coordinator(stateWith({
      suspendedAt: '2026-08-08T00:00:00.000Z',
      storedAvailable: 0,
      storedCapacity: 10,
    }))
    const source = session.snapshot()
    let restarts = 0
    const failed = await session.returnFromSuspension(Object.freeze({
      expectedRevision: source.revision,
      nowUtcMilliseconds: Date.parse(SAVED_AT),
      savedAtUtc: SAVED_AT,
      persist: async () => { throw new Error('write failed') },
      restartMonotonicSampling: () => { restarts += 1 },
    }))
    expect(failed.status).toBe('persistence-failed')
    expect(session.snapshot()).toBe(source)
    expect(restarts).toBe(0)

    const retried = await session.returnFromSuspension(Object.freeze({
      expectedRevision: source.revision,
      nowUtcMilliseconds: Date.parse(SAVED_AT),
      savedAtUtc: SAVED_AT,
      persist: committed,
      restartMonotonicSampling: () => { restarts += 1 },
    }))
    expect(retried.status).toBe('completed')
    expect(restarts).toBe(1)
    expect(session.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()
  })

  test('cancellation and persistence failure debit no stored time', async () => {
    const session = coordinator(stateWith({ storedAvailable: 10, storedCapacity: 10 }))
    const source = session.snapshot()
    let persistenceCalls = 0
    const cancelled = await session.spendStoredTime(Object.freeze({
      expectedRevision: source.revision,
      durationSeconds: 1,
      savedAtUtc: SAVED_AT,
      context: context(),
      cancelRequested: () => true,
      persist: async () => {
        persistenceCalls += 1
        return Object.freeze({ committed: true })
      },
    }))
    expect(cancelled.status).toBe('cancelled')
    expect(persistenceCalls).toBe(0)
    expect(session.snapshot()).toBe(source)

    const failed = await session.spendStoredTime(Object.freeze({
      expectedRevision: source.revision,
      durationSeconds: 1,
      savedAtUtc: SAVED_AT,
      context: context(),
      cancelRequested: null,
      persist: async () => { throw new Error('commit refused') },
    }))
    expect(failed.status).toBe('persistence-failed')
    expect(session.snapshot()).toBe(source)

    const completed = await session.spendStoredTime(Object.freeze({
      expectedRevision: source.revision,
      durationSeconds: 1,
      savedAtUtc: SAVED_AT,
      context: context(),
      cancelRequested: null,
      persist: committed,
    }))
    expect(completed.persisted).toBe(true)
    expect(completed.advance!.diagnosticChunks.at(-1)!.automationPolicy)
      .toBe('force-buy-max')
    expect(completed.publication.state.timeline.storedTimeAvailableSeconds)
      .toBe(9)
  })

  test('rejects stale and accessor-backed requests without persistence or getter execution', async () => {
    const session = coordinator()
    const source = session.snapshot()
    let persistenceCalls = 0
    const stale = await session.spendStoredTime(Object.freeze({
      expectedRevision: source.revision + 1,
      durationSeconds: 1,
      savedAtUtc: SAVED_AT,
      context: context(),
      cancelRequested: null,
      persist: async () => {
        persistenceCalls += 1
        return Object.freeze({ committed: true })
      },
    }))
    expect(stale.status).toBe('stale-revision')
    expect(persistenceCalls).toBe(0)

    let reads = 0
    const hostile = Object.freeze(Object.defineProperty({}, 'expectedRevision', {
      enumerable: true,
      get: () => {
        reads += 1
        return source.revision
      },
    }))
    expect(() => session.advanceActive(hostile as never)).toThrow(/declared data fields/i)
    expect(reads).toBe(0)
  })

  test('rejects accessor-backed persistence receipts without invoking getters', async () => {
    const session = coordinator(stateWith({ suspendedAt: null }))
    let reads = 0
    const result = await session.suspend(Object.freeze({
      expectedRevision: session.snapshot().revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: async () => Object.freeze(Object.defineProperty({}, 'committed', {
        enumerable: true,
        get: () => {
          reads += 1
          return true
        },
      })) as never,
    }))
    expect(result.status).toBe('persistence-failed')
    expect(reads).toBe(0)
  })

  test('fails fast on reentrant operations while persistence is awaiting', async () => {
    const session = coordinator(stateWith({ suspendedAt: null }))
    const source = session.snapshot()
    let reentrantStatus: string | undefined
    const result = await session.suspend(Object.freeze({
      expectedRevision: source.revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: async () => {
        const reentrant = await session.advanceActive(Object.freeze({
          expectedRevision: source.revision,
          durationSeconds: 0.01,
          context: context(),
          cancelRequested: null,
        }))
        reentrantStatus = reentrant.status
        return Object.freeze({ committed: true })
      },
    }))

    expect(reentrantStatus).toBe('busy')
    expect(result.status).toBe('completed')
    expect(session.snapshot().revision).toBe(source.revision + 1)
  })

  test('requires suspension and return clock fields to describe one valid captured instant', () => {
    const session = coordinator(stateWith({ suspendedAt: null }))
    expect(() => session.suspend(Object.freeze({
      expectedRevision: session.snapshot().revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: 'not-a-timestamp',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: committed,
    }))).toThrow(/same valid captured instant/i)
    expect(() => session.suspend(Object.freeze({
      expectedRevision: session.snapshot().revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: '2026-08-08T00:00:04.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: context(),
      persist: committed,
    }))).toThrow(/same valid captured instant/i)
    expect(() => session.returnFromSuspension(Object.freeze({
      expectedRevision: session.snapshot().revision,
      nowUtcMilliseconds: Date.parse('2026-08-08T00:00:04.000Z'),
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      persist: committed,
      restartMonotonicSampling: () => undefined,
    }))).toThrow(/same captured instant/i)
  })

  test('rejects an invalid persisted suspension marker without fallback or persistence', async () => {
    const session = coordinator(stateWith({ suspendedAt: 'invalid-marker' }))
    const source = session.snapshot()
    let persists = 0
    let restarts = 0
    const result = await session.returnFromSuspension(Object.freeze({
      expectedRevision: source.revision,
      nowUtcMilliseconds: Date.parse(SAVED_AT),
      savedAtUtc: SAVED_AT,
      persist: async () => {
        persists += 1
        return Object.freeze({ committed: true })
      },
      restartMonotonicSampling: () => { restarts += 1 },
    }))
    expect(result.status).toBe('invalid-suspension-marker')
    expect(session.snapshot()).toBe(source)
    expect(persists).toBe(0)
    expect(restarts).toBe(0)
  })

  test('validates the complete event context even for zero suspension residue', () => {
    const session = coordinator(stateWith({ suspendedAt: null }))
    let reads = 0
    const hostileContext = Object.freeze(Object.defineProperty({
      dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
      catalogLookup: null,
      infinityRewardAuthority: INFINITY_REWARD_AUTHORITY,
      timerAggregationAuthority: null,
      quantumEpochAuthority: null,
    }, 'automationIntervalSeconds', {
      enumerable: true,
      get: () => {
        reads += 1
        return 1
      },
    }))
    expect(() => session.suspend(Object.freeze({
      expectedRevision: session.snapshot().revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: hostileContext as never,
      persist: committed,
    }))).toThrow(/declared data fields/i)
    expect(reads).toBe(0)
    expect(() => session.suspend(Object.freeze({
      expectedRevision: session.snapshot().revision,
      foregroundResidueSeconds: 0,
      legacyUtcText: '2026-08-08T00:00:05.000Z',
      savedAtUtc: '2026-08-08T00:00:05.000Z',
      context: Object.freeze({ ...context(), extra: true }) as never,
      persist: committed,
    }))).toThrow(/declared data fields/i)
  })

  test('remains dormant outside tests and has no production-root import', () => {
    for (const path of [
      'src/App.tsx',
      'src/application/canonicalGameApplication.ts',
      'src/application/productionApplicationFactory.ts',
      'src/browser/productionBrowserComposition.ts',
    ]) {
      const source = readFileSync(path, 'utf8')
      expect(source).not.toMatch(/canonical(?:LifecycleCoordinator|RuntimeSession)V2/u)
    }
  })
})

function encodeCandidate(candidate: Readonly<CanonicalRuntimePersistenceCandidateV2>): string {
  return encodeSchema13WebSave({
    savedAtUtc: candidate.savedAtUtc,
    state: candidate.state,
    runtime: candidate.runtime,
  })
}
