import { setImmediate as waitImmediate } from 'node:timers/promises'
import { describe, expect, test } from 'vitest'

import schema12Web from '../../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { issueInfinityRewardAuthorityV2ForApplication } from '../../application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../../game-state/typesV2'
import {
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  subtractGameDecimals,
} from '../../math/gameDecimal'
import { PreparedSave } from '../../save/prepare'
import { deserializeWebSave } from '../../save/serialization'
import { prepareCanonicalEventTimeCarrierV2 } from '../../simulation/canonicalEventTimeModelV2'
import { createStoredTimeWorkerReadyV2 } from './workerIdentityV2'
import type {
  StoredTimeWorkerAccountingDtoV2,
  StoredTimeWorkerMainMessageV2,
  StoredTimeWorkerMessageV2,
  StoredTimeWorkerQueuedInputDtoV2,
} from './workerProtocolV2'
import {
  captureStoredTimeWorkerMessageV2,
  STORED_TIME_DREAM_REPLAY_LIMIT_V2,
} from './workerProtocolV2'
import {
  decodeStoredTimeWorkerPublicationV2,
  encodeStoredTimeWorkerPublicationV2,
} from './workerWireV2'
import { InMemoryStoredTimeCheckpointRepositoryV2 } from './storedTimeCheckpointHarnessV2'
import {
  StoredTimeWorkerEngineV2,
  type StoredTimeWorkerEngineHostV2,
} from './storedTimeWorkerEngineV2'
import {
  StoredTimeJobAuthorityV2,
  captureCheckpointRecordV2,
  hashStoredTimeWorkerPublicationV2,
  type StoredTimeAuthorityPublicationV2,
  type StoredTimeCheckpointRecordV2,
  type StoredTimeCheckpointRepositoryV2,
  type StoredTimeCheckpointWriteReceiptV2,
  type StoredTimeWriterFenceV2,
} from './storedTimeJobAuthorityV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)

const FENCE = Object.freeze({ ownerId: 'writer-a', generation: 3 })
const INFINITY_REWARD_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)
const DOUBLE_INFINITY_REWARD_AUTHORITY =
  issueInfinityRewardAuthorityV2ForApplication(
    Object.freeze({ doubleInfinityPoints: true }),
  )
const ZERO_TEST_ACCOUNTING: Readonly<StoredTimeWorkerAccountingDtoV2> =
  Object.freeze({
    cumulativeProcessedSeconds: 0,
    cumulativeDoubleTimeConsumedSeconds: 0,
    cumulativeInfinityElapsedSeconds: 0,
    cumulativeInfinityResetCount: '0',
    lastInfinityResetElapsedSeconds: null,
    sealedInfinityCycleSeconds: 5,
    sealedInfinityBoundaryRemaining: 100,
    cumulativeRawAutomationTicks: '0',
    cumulativeRepresentativeGroups: 0,
    automationTimeUntilNextEvent: 3,
  })

function infinityReadyPublicationV2(): Readonly<StoredTimeAuthorityPublicationV2> {
  const state = cloneCanonicalGameStateV2(Object.freeze({
    ...migrated.state,
    dyson: Object.freeze({
      ...migrated.state.dyson,
      bots: gameDecimalFromNumber(4.2e60),
      goalStage: 10n,
    }),
    skills: Object.freeze({
      ...migrated.state.skills,
      activeAutoAssignment: Object.freeze([]),
    }),
    timeline: Object.freeze({
      ...migrated.state.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 0.1,
      infinityBoundaryRemaining: 0.1,
      infinityCycleSeconds: 1,
      storedTimeAvailableSeconds: 100,
      storedTimeCapacitySeconds: 100,
      doubleTime: Object.freeze({
        ...migrated.state.timeline.doubleTime,
        unlocked: false,
        enabled: false,
        bankSeconds: 0,
        rate: 0,
      }),
    }),
  }) as CanonicalGameStateV2)
  return Object.freeze({ revision: 7, state, runtime: migrated.runtime })
}

describe('Stage 4D dormant main-thread Stored Time authority', { timeout: 30_000 }, () => {
  test('read-back-confirms an unchanged durable origin before granting the worker lease', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)

    const admitted = await authority.admit(admission(source.revision))

    expect(admitted.status).toBe('started')
    expect(admitted.start?.type).toBe('start')
    expect(admitted.start?.type === 'start'
      ? admitted.start.requestedRawAutomationTicks
      : null).toBe('571')
    expect(repository.writeCount).toBe(1)
    expect(repository.durableRecord()?.kind).toBe('stored-time-origin-v2')
    expect(repository.durableRecord()?.checkpointSequence).toBe(0)
    expect(repository.durableRecord()?.publicationHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(authority.snapshot()).toEqual(source)
    expect(authority.snapshot().revision).toBe(7)
    expect(authority.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(100)
  })

  test('does not grant a lease or debit the bank when origin persistence definitely fails', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    repository.setNextWrite('definite-failure', false)
    const { authority, source } = await createAuthority(repository)

    const result = await authority.admit(admission(source.revision))

    expect(result.status).toBe('persistence-failed')
    expect(result.start).toBeNull()
    expect(authority.snapshot()).toEqual(source)
    expect((await authority.cancel({ expectedRevision: 7 })).status).toBe('no-job')
  })

  test('serializes admission so competing sequence-zero origins cannot race', async () => {
    const repository = new DeferredCheckpointRepository()
    repository.deferNextWrite()
    const { authority, source } = await createAuthority(repository)

    const first = authority.admit(admission(source.revision))
    await repository.waitUntilWriteStarted()
    const competing = await authority.admit(admission(source.revision))
    repository.finishDeferredWrite()

    expect(competing.status).toBe('busy')
    expect((await first).status).toBe('started')
    expect(repository.writeCount).toBe(1)
  })

  test('requires explicit durable-origin recovery after a crash before first checkpoint', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(repository, 'job-before-crash')
    expect((await first.authority.admit(admission(7))).status).toBe('started')

    const reloaded = await createAuthority(repository, 'job-after-reload')
    expect((await reloaded.authority.admit(admission(7))).status)
      .toBe('recovery-required')
    expect((await reloaded.authority.recoverDurableCheckpoint()).status)
      .toBe('recovered')
    const restarted = await reloaded.authority.admit(admission(7))

    expect(restarted.status).toBe('started')
    expect(restarted.start?.type === 'start' ? restarted.start.jobId : null)
      .toBe('job-after-reload')
    expect(reloaded.authority.snapshot().state.timeline.storedTimeAvailableSeconds)
      .toBe(100)
  })

  test('serializes recovery against a competing admission', async () => {
    const initialRepository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(initialRepository, 'job-before-reload')
    expect((await first.authority.admit(admission(7))).status).toBe('started')
    const repository = new DeferredRecoveryRepository(
      initialRepository.durableRecord()!,
    )
    const reloaded = await createAuthority(repository, 'job-after-reload')

    const recovery = reloaded.authority.recoverDurableCheckpoint()
    await repository.waitUntilReadStarted()
    expect((await reloaded.authority.admit(admission(7))).status).toBe('busy')
    repository.finishDeferredRead()
    expect((await recovery).status).toBe('recovered')
  })

  test('recovers an acknowledged checkpoint with the original policy cursor', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(repository, 'job-before-checkpoint')
    const admitted = await first.authority.admit(admission(7))
    const candidate = await checkpointCandidate(
      admitted.start!, first.source, accounting(),
    )
    const committed = await first.authority.commitCandidate(candidate)
    expect(committed.status).toBe('committed')

    const reloaded = await createAuthority(
      repository,
      'unused-new-job',
      committed.publication.revision,
      committed.publication,
    )
    const recovered = await reloaded.authority.recoverDurableCheckpoint()

    expect(recovered.status).toBe('recovered')
    expect(recovered.start?.type).toBe('start')
    if (recovered.start?.type === 'start') {
      expect(recovered.start.jobId).toBe('job-before-checkpoint')
      expect(recovered.start.acknowledgedBaseRevision).toBe(8)
      expect(recovered.start.checkpointSequence).toBe(1)
      expect(recovered.start.restart).toMatchObject({
        originalInitialAutomationHorizonSeconds: 3,
        originalInitialAutomationTargetIndex:
          first.source.state.timeline.dysonAutomationTargetIndex,
        originalRequestedDurationSeconds: 60,
        originalRequestedRawAutomationTicks: '571',
        completedRepresentativeGroups: 0,
        sealedRemainingDurationSeconds: 50,
      })
      expect(recovered.start.restart?.cumulativeAccounting)
        .toEqual(accounting())
    }
    expect((await reloaded.authority.admit(admission(8))).status).toBe('busy')
    expect(repository.writeCount).toBe(2)
  })

  test('fences durable restart across a worker release identity change', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(repository, 'old-release-job')
    const admitted = await first.authority.admit(admission(7))
    const committed = await first.authority.commitCandidate(
      await checkpointCandidate(admitted.start!, first.source, accounting()),
    )
    const reloaded = await createAuthority(
      repository,
      'new-release-job',
      committed.publication.revision,
      committed.publication,
      'test-release-build-b',
    )

    const recovered = await reloaded.authority.recoverDurableCheckpoint()

    expect(recovered.status).toBe('indeterminate')
    expect(recovered.start).toBeNull()
    expect(recovered.error).toMatch(/identity does not match this release/u)
  })

  test('accepts an ambiguous origin only when read-back proves the exact origin record', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    repository.setNextWrite('ambiguous', true)
    const { authority, source } = await createAuthority(repository)

    expect((await authority.admit(admission(source.revision))).status).toBe('started')
    expect(repository.durableRecord()?.kind).toBe('stored-time-origin-v2')
  })

  test('overwrites worker bank, Double Time, Infinity clock and automation phase once', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting({
      cumulativeProcessedSeconds: 10,
      cumulativeDoubleTimeConsumedSeconds: 10,
      cumulativeInfinityElapsedSeconds: 10,
      automationTimeUntilNextEvent: 0.1,
    }))

    const checkpointStartedAt = performance.now()
    const result = await authority.commitCandidate(candidate)
    const checkpointElapsedMilliseconds = performance.now() - checkpointStartedAt

    expect(result.status).toBe('committed')
    expect(result.publication.revision).toBe(8)
    expect(result.publication.state.timeline.storedTimeAvailableSeconds).toBe(90)
    expect(result.publication.state.timeline.doubleTime.bankSeconds).toBe(40)
    expect(result.publication.state.timeline.doubleTime.unlocked).toBe(true)
    expect(result.publication.state.timeline.doubleTime.enabled).toBe(true)
    expect(result.publication.state.timeline.doubleTime.rate).toBe(1)
    expect(result.publication.state.timeline.infinityCycleSeconds).toBe(15)
    expect(result.publication.state.timeline.infinityBoundaryRemaining).toBe(90)
    expect(result.publication.state.timeline.automationTimeUntilNextEvent).toBe(0.1)
    expect(result.publication.state.timeline.dysonAutomationTargetIndex)
      .toBe((source.state.timeline.dysonAutomationTargetIndex + 71) % 8)
    expect(result.publication.state.timeline.researchAutomationTargetIndex)
      .toBe(source.state.infinity.automationUnlocked.research
        ? (source.state.timeline.researchAutomationTargetIndex + 71) % 14
        : source.state.timeline.researchAutomationTargetIndex)
    expect(result.acknowledgement?.type).toBe('checkpoint-committed')
    expect(result.acknowledgement?.type === 'checkpoint-committed'
      ? result.acknowledgement.proposalHashEcho
      : '').toBe(candidate.proposalHash)
    expect(repository.durableRecord()?.candidateHash)
      .toBe(result.acknowledgement?.type === 'checkpoint-committed'
        ? result.acknowledgement.candidateHash
        : '')
    expect(result.acknowledgement?.type === 'checkpoint-committed'
      ? result.acknowledgement.candidateHash
      : '').not.toBe(candidate.proposalHash)
    expect(source.state.timeline.storedTimeAvailableSeconds).toBe(100)
    expect(Object.isFrozen(result.publication.state)).toBe(true)
    expect(checkpointElapsedMilliseconds).toBeLessThan(50)
  })

  test('rejects stale identities, policy-invalid groups and summary drift without persistence', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())
    const stale = { ...candidate, acknowledgedBaseRevision: 6 }

    const result = await authority.commitCandidate(stale)

    expect(result.status).toBe('rejected')
    const invalidGroups = {
      ...candidate,
      accounting: { ...candidate.accounting, cumulativeRepresentativeGroups: 1 },
    }
    expect((await authority.commitCandidate(invalidGroups)).status).toBe('rejected')
    const invalidSummary = {
      ...candidate,
      schedulerSummary: { ...candidate.schedulerSummary, automationTicks: '7' },
    }
    expect((await authority.commitCandidate(invalidSummary)).status).toBe('rejected')
    expect((await authority.commitCandidate({
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamResetCount: '1',
        dreamFastNormalizedResetCount: '1',
        dreamMeteorResetCount: '1',
      },
    })).status).toBe('rejected')
    expect((await authority.commitCandidate({
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamFastNormalizedResetCount: '1',
      },
    })).status).toBe('rejected')
    const inflatedCause = {
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamResetCount: '1',
        dreamMeteorResetCount: '100',
        dreamStrangeMatterRequested: '1e0',
      },
    }
    expect((await authority.commitCandidate(inflatedCause)).status).toBe('rejected')
    const forgedBlackHole = {
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamResetCount: '1',
        dreamBlackHoleResetCount: '1',
      },
    }
    expect((await authority.commitCandidate(forgedBlackHole)).status).toBe('rejected')
    const mintedReward = {
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamStrangeMatterRequested: '1e1000',
        dreamStrangeMatterEffective: '1e1000',
      },
    }
    expect((await authority.commitCandidate(mintedReward)).status).toBe('rejected')
    expect((await authority.commitCandidate({
      ...candidate,
      schedulerSummary: {
        ...candidate.schedulerSummary,
        dreamStrangeMatterFinal: '01',
      },
    })).status).toBe('rejected')
    const withMutatedState = async (
      mutate: (state: CanonicalGameStateV2) => CanonicalGameStateV2,
    ) => {
      const decoded = decodeStoredTimeWorkerPublicationV2(candidate.publication)
      const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
        state: mutate(decoded.state),
        runtime: decoded.runtime,
      }))
      return {
        ...candidate,
        publication,
        proposalHash: await hashStoredTimeWorkerPublicationV2(publication),
      }
    }
    for (const [summaryKey, stateKey, reward] of [
      ['dreamAiResetCount', 'aiDreamResets', 10],
      ['dreamGlobalWarmingResetCount', 'globalWarmingDreamResets', 20],
    ] as const) {
      const forgedState = await withMutatedState((state) => {
        const statistics = { ...state.statistics }
        for (const root of [
          'lifetime', 'currentQuantumRun', 'recentProcessedSegment',
        ] as const) {
          statistics[root] = Object.freeze({
            ...statistics[root],
            [stateKey]: statistics[root][stateKey] + 1n,
            strangeMatter: gameDecimalFromNumber(reward),
          })
        }
        for (const key of [
          'minuteWindows', 'halfHourWindows', 'dailyWindows',
        ] as const) {
          const windows = [...statistics[key]]
          windows[0] = Object.freeze({
            ...windows[0]!,
            dreamResetCount: windows[0]!.dreamResetCount + 1n,
            strangeMatter: gameDecimalFromNumber(reward),
          })
          statistics[key] = Object.freeze(windows)
        }
        return cloneCanonicalGameStateV2({
          ...state,
          dream: {
            ...state.dream,
            resetCount: state.dream.resetCount + 1n,
            strangeMatter: gameDecimalFromNumber(reward),
          },
          statistics,
        })
      })
      const canonicalReward = gameDecimalToCanonicalString(
        gameDecimalFromNumber(reward),
      )
      const forgedCause = {
        ...forgedState,
        schedulerSummary: {
          ...forgedState.schedulerSummary,
          dreamResetCount: '1',
          [summaryKey]: '1',
          dreamStrangeMatterRequested: canonicalReward,
          dreamStrangeMatterEffective: canonicalReward,
          dreamStrangeMatterFinal: canonicalReward,
          dreamLifetimeStrangeMatterFinal: canonicalReward,
          dreamCurrentQuantumRunStrangeMatterFinal: canonicalReward,
          dreamRecentProcessedSegmentStrangeMatterFinal: canonicalReward,
        },
      }
      expect((await authority.commitCandidate(forgedCause)).status).toBe('rejected')
    }
    const resetDrift = await withMutatedState((state) =>
      cloneCanonicalGameStateV2({
        ...state,
        dream: { ...state.dream, resetCount: state.dream.resetCount + 1n },
      }))
    expect((await authority.commitCandidate(resetDrift)).status).toBe('rejected')
    for (const root of [
      'lifetime', 'currentQuantumRun', 'recentProcessedSegment',
    ] as const) {
      const causeDrift = await withMutatedState((state) =>
        cloneCanonicalGameStateV2({
          ...state,
          statistics: {
            ...state.statistics,
            [root]: {
              ...state.statistics[root],
              meteorDreamResets: state.statistics[root].meteorDreamResets + 1n,
            },
          },
        }))
      expect((await authority.commitCandidate(causeDrift)).status).toBe('rejected')
      const strangeMatterDrift = await withMutatedState((state) =>
        cloneCanonicalGameStateV2({
          ...state,
          statistics: {
            ...state.statistics,
            [root]: {
              ...state.statistics[root],
              strangeMatter: gameDecimalFromNumber(1),
            },
          },
        }))
      expect((await authority.commitCandidate(strangeMatterDrift)).status).toBe('rejected')
    }
    const forgedWindowCount = await withMutatedState((state) => {
      const minuteWindows = [...state.statistics.minuteWindows]
      minuteWindows[0] = Object.freeze({
        ...minuteWindows[0]!,
        dreamResetCount: minuteWindows[0]!.dreamResetCount + 1n,
      })
      return cloneCanonicalGameStateV2({
        ...state,
        statistics: { ...state.statistics, minuteWindows },
      })
    })
    expect((await authority.commitCandidate(forgedWindowCount)).status).toBe('rejected')
    const forgedWindowMatter = await withMutatedState((state) => {
      const dailyWindows = [...state.statistics.dailyWindows]
      dailyWindows[0] = Object.freeze({
        ...dailyWindows[0]!, strangeMatter: gameDecimalFromNumber(1e300),
      })
      return cloneCanonicalGameStateV2({
        ...state,
        statistics: { ...state.statistics, dailyWindows },
      })
    })
    expect((await authority.commitCandidate(forgedWindowMatter)).status).toBe('rejected')
    const movedOldWindowCount = await withMutatedState((state) => {
      const minuteWindows = [...state.statistics.minuteWindows]
      minuteWindows[1] = Object.freeze({
        ...minuteWindows[1]!,
        sequence: minuteWindows[1]!.sequence + 60n,
        dreamResetCount: minuteWindows[0]!.dreamResetCount + 1n,
      })
      return cloneCanonicalGameStateV2({
        ...state,
        statistics: { ...state.statistics, minuteWindows },
      })
    })
    expect((await authority.commitCandidate(movedOldWindowCount)).status)
      .toBe('rejected')
    expect(repository.writeCount).toBe(1)
    expect(authority.snapshot().revision).toBe(7)
  })

  test('rejects skipped transient Infinity authority and unsolicited early PRE', async () => {
    const firstRepository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(firstRepository)
    const admitted = await first.authority.admit(admission(first.source.revision))
    const forgedAccounting = accounting({
      cumulativeInfinityResetCount: '1',
      lastInfinityResetElapsedSeconds: 10,
    })
    const skipped = await checkpointCandidate(
      admitted.start!, first.source, forgedAccounting,
    )
    const skippedResult = await first.authority.commitCandidate(skipped)
    expect(skippedResult.status).toBe('rejected')
    expect(skippedResult.error).toMatch(/authenticated transient POST/u)
    expect(firstRepository.writeCount).toBe(1)

    const secondRepository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const second = await createAuthority(secondRepository, 'early-pre')
    const earlyStart = await second.authority.admit(admission(second.source.revision))
    const candidate = await checkpointCandidate(
      earlyStart.start!, second.source, accounting(),
    )
    const { sealedRemainingDurationSeconds: _remaining, ...candidateFields } = candidate
    const early = captureStoredTimeWorkerMessageV2(Object.freeze({
      ...candidateFields,
      type: 'authority-request',
      checkpointSequence: 0,
      phase: 'pre-infinity',
    }))
    const earlyResult = await second.authority.commitCandidate(early)
    expect(earlyResult.status).toBe('rejected')
    expect(earlyResult.terminalControl?.type).toBe('authority-revoked')
    expect(secondRepository.writeCount).toBe(1)
  })

  test('replays non-associative Dream credits within the bounded checkpoint cap', async () => {
    const seed = (await createAuthority(
      new InMemoryStoredTimeCheckpointRepositoryV2(),
    )).source
    const originMatter = gameDecimalFromNumber(999_999_999_999_999)
    const originState = cloneCanonicalGameStateV2({
      ...seed.state,
      dream: { ...seed.state.dream, strangeMatter: originMatter },
      statistics: {
        ...seed.state.statistics,
        lifetime: { ...seed.state.statistics.lifetime, strangeMatter: originMatter },
        currentQuantumRun: {
          ...seed.state.statistics.currentQuantumRun, strangeMatter: originMatter,
        },
        recentProcessedSegment: {
          ...seed.state.statistics.recentProcessedSegment, strangeMatter: originMatter,
        },
        minuteWindows: Object.freeze(seed.state.statistics.minuteWindows.map(
          (bucket, index) => index === 0
            ? Object.freeze({ ...bucket, strangeMatter: originMatter })
            : bucket,
        )),
        halfHourWindows: Object.freeze(seed.state.statistics.halfHourWindows.map(
          (bucket, index) => index === 0
            ? Object.freeze({ ...bucket, strangeMatter: originMatter })
            : bucket,
        )),
        dailyWindows: Object.freeze(seed.state.statistics.dailyWindows.map(
          (bucket, index) => index === 0
            ? Object.freeze({ ...bucket, strangeMatter: originMatter })
            : bucket,
        )),
      },
    })
    const makeCandidate = async (count: number) => {
      const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
      const source = Object.freeze({ ...seed, state: originState })
      const { authority } = await createAuthority(
        repository, `job-dream-${count}`, 7, source,
      )
      const started = await authority.admit(admission(7))
      const base = await checkpointCandidate(started.start!, source, accounting())
      let currency = originMatter
      let ledger = originMatter
      let requested = gameDecimalFromNumber(0)
      let effective = gameDecimalFromNumber(0)
      let retainedMatter = originMatter
      let lastRepresented = gameDecimalFromNumber(0)
      for (let index = 0; index < count; index += 1) {
        requested = addGameDecimals(requested, gameDecimalFromNumber(1))
        const next = addGameDecimals(currency, gameDecimalFromNumber(1))
        const represented = subtractGameDecimals(next, currency)
        lastRepresented = represented
        currency = next
        effective = addGameDecimals(effective, represented)
        ledger = addGameDecimals(ledger, represented)
        retainedMatter = addGameDecimals(retainedMatter, represented)
      }
      const decoded = decodeStoredTimeWorkerPublicationV2(base.publication)
      const statistics = { ...decoded.state.statistics }
      for (const root of [
        'lifetime', 'currentQuantumRun', 'recentProcessedSegment',
      ] as const) {
        statistics[root] = Object.freeze({
          ...statistics[root],
          meteorDreamResets: statistics[root].meteorDreamResets + BigInt(count),
          strangeMatter: ledger,
        })
      }
      for (const key of [
        'minuteWindows', 'halfHourWindows', 'dailyWindows',
      ] as const) {
        const windows = [...statistics[key]]
        windows[0] = Object.freeze({
          ...windows[0]!,
          dreamResetCount: windows[0]!.dreamResetCount + BigInt(count),
          strangeMatter: retainedMatter,
        })
        statistics[key] = Object.freeze(windows)
      }
      statistics.lastCompletedCycle = Object.freeze({
        valid: true,
        breakInfinity: false,
        durationSeconds: 0,
        reward: lastRepresented,
        dreamCause: 'Meteor',
      })
      const state = cloneCanonicalGameStateV2({
        ...decoded.state,
        dream: {
          ...decoded.state.dream,
          resetCount: decoded.state.dream.resetCount + BigInt(count),
          strangeMatter: currency,
        },
        statistics,
      })
      prepareCanonicalEventTimeCarrierV2(Object.freeze({
        revision: base.acknowledgedBaseRevision,
        state,
        runtime: decoded.runtime,
      }))
      const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
        state, runtime: decoded.runtime,
      }))
      const schedulerSummary = Object.freeze({
        ...base.schedulerSummary,
        dreamResetCount: String(count),
        dreamMeteorResetCount: String(count),
        dreamStrangeMatterRequested: gameDecimalToCanonicalString(requested),
        dreamStrangeMatterEffective: gameDecimalToCanonicalString(effective),
        dreamStrangeMatterFinal: gameDecimalToCanonicalString(currency),
        dreamLifetimeStrangeMatterFinal: gameDecimalToCanonicalString(ledger),
        dreamCurrentQuantumRunStrangeMatterFinal: gameDecimalToCanonicalString(ledger),
        dreamRecentProcessedSegmentStrangeMatterFinal:
          gameDecimalToCanonicalString(ledger),
        materialEvents: Math.max(8, count),
      })
      return {
        authority,
        candidate: captureStoredTimeWorkerMessageV2({
          ...base,
          schedulerSummary,
          publication,
          proposalHash: await hashStoredTimeWorkerPublicationV2(publication),
        }),
      }
    }

    const two = await makeCandidate(2)
    expect((await two.authority.commitCandidate(two.candidate)).status).toBe('committed')
    expect(gameDecimalToCanonicalString(two.authority.snapshot().state.dream.strangeMatter))
      .toBe('1e15')

    const boundary = await makeCandidate(STORED_TIME_DREAM_REPLAY_LIMIT_V2)
    const commitStarted = performance.now()
    expect((await boundary.authority.commitCandidate(boundary.candidate)).status)
      .toBe('committed')
    expect(performance.now() - commitStarted).toBeLessThan(50)
    const overflow = await makeCandidate(STORED_TIME_DREAM_REPLAY_LIMIT_V2 + 1)
    expect((await overflow.authority.commitCandidate(overflow.candidate)).status)
      .toBe('rejected')
  }, 120_000)

  test('authenticates an AI reset from stage 2 even when counter-Meteor is false', async () => {
    const seed = (await createAuthority(
      new InMemoryStoredTimeCheckpointRepositoryV2(),
    )).source
    const state = cloneCanonicalGameStateV2({
      ...seed.state,
      dream: {
        ...seed.state.dream,
        disasterStage: 2n,
        resources: {
          ...seed.state.dream.resources,
          bots: gameDecimalFromNumber(100),
        },
        upgrades: {
          ...seed.state.dream.upgrades,
          counterMeteor: false,
        },
      },
    })
    const source = Object.freeze({ ...seed, state })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository, 'job-stage2-ai', 7, source)
    const started = await authority.admit(admission(7))
    const base = await checkpointCandidate(started.start!, source, accounting())
    const basePublication = decodeStoredTimeWorkerPublicationV2(base.publication)
    const statistics = { ...basePublication.state.statistics }
    for (const root of [
      'lifetime', 'currentQuantumRun', 'recentProcessedSegment',
    ] as const) {
      statistics[root] = Object.freeze({
        ...statistics[root],
        aiDreamResets: statistics[root].aiDreamResets + 1n,
        strangeMatter: gameDecimalFromNumber(10),
      })
    }
    for (const key of [
      'minuteWindows', 'halfHourWindows', 'dailyWindows',
    ] as const) {
      const windows = [...statistics[key]]
      windows[0] = Object.freeze({
        ...windows[0]!,
        dreamResetCount: windows[0]!.dreamResetCount + 1n,
        strangeMatter: gameDecimalFromNumber(10),
      })
      statistics[key] = Object.freeze(windows)
    }
    statistics.lastCompletedCycle = Object.freeze({
      valid: true,
      breakInfinity: false,
      durationSeconds: 0,
      reward: gameDecimalFromNumber(10),
      dreamCause: 'ArtificialIntelligence',
    })
    const candidateState = cloneCanonicalGameStateV2({
      ...basePublication.state,
      dream: {
        ...basePublication.state.dream,
        resetCount: basePublication.state.dream.resetCount + 1n,
        strangeMatter: gameDecimalFromNumber(10),
        disasterStage: 1n,
      },
      statistics,
    })
    const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: candidateState,
      runtime: basePublication.runtime,
    }))
    const reward = gameDecimalToCanonicalString(gameDecimalFromNumber(10))
    const candidate = captureStoredTimeWorkerMessageV2({
      ...base,
      schedulerSummary: {
        ...base.schedulerSummary,
        dreamResetCount: '1',
        dreamAiResetCount: '1',
        dreamStrangeMatterRequested: reward,
        dreamStrangeMatterEffective: reward,
        dreamStrangeMatterFinal: gameDecimalToCanonicalString(
          candidateState.dream.strangeMatter,
        ),
        dreamLifetimeStrangeMatterFinal: gameDecimalToCanonicalString(
          candidateState.statistics.lifetime.strangeMatter,
        ),
        dreamCurrentQuantumRunStrangeMatterFinal: gameDecimalToCanonicalString(
          candidateState.statistics.currentQuantumRun.strangeMatter,
        ),
        dreamRecentProcessedSegmentStrangeMatterFinal: gameDecimalToCanonicalString(
          candidateState.statistics.recentProcessedSegment.strangeMatter,
        ),
      },
      publication,
      proposalHash: await hashStoredTimeWorkerPublicationV2(publication),
    })
    expect((await authority.commitCandidate(candidate)).status).toBe('committed')
    expect(authority.snapshot().state.dream.disasterStage).toBe(1n)
  }, 120_000)

  test('retries a definite checkpoint failure from the last durable bank without double debit', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())
    repository.setNextWrite('definite-failure', false)

    expect((await authority.commitCandidate(candidate)).status).toBe('retryable-failure')
    expect(authority.snapshot().revision).toBe(7)
    expect(authority.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(100)

    const retry = await authority.commitCandidate(candidate)
    expect(retry.status).toBe('committed')
    expect(retry.publication.state.timeline.storedTimeAvailableSeconds).toBe(90)
    expect(repository.writeCount).toBe(3)
  })

  test('fences an ambiguous checkpoint whose read-back matches neither prior nor candidate', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())
    repository.setNextWrite('ambiguous', false)
    repository.setNextRead({ hostile: true })

    const result = await authority.commitCandidate(candidate)

    expect(result.status).toBe('indeterminate')
    expect(authority.snapshot().revision).toBe(7)
    expect((await authority.cancel({ expectedRevision: 7 })).status).toBe('indeterminate')
  })

  test('cancel before candidate admission discards computed work and persists nothing', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    await authority.admit(admission(source.revision))

    const cancelled = await authority.cancel({ expectedRevision: 7 })

    expect(cancelled.status).toBe('sent')
    expect(cancelled.message?.type).toBe('cancel')
    expect(repository.writeCount).toBe(1)
    expect((await authority.admit(admission(7))).status).toBe('busy')
    const forgedTerminal = workerCancelled(cancelled.message!)
    expect(authority.acknowledgeWorkerTerminal({
      ...forgedTerminal,
      progress: { ...forgedTerminal.progress, computedSeconds: 1 },
    })).toBe(false)
    expect((await authority.admit(admission(7))).status).toBe('busy')
    expect(authority.acknowledgeWorkerTerminal(
      workerCancelled(cancelled.message!),
    )).toBe(true)
    expect((await authority.admit(admission(7))).status).toBe('started')
    expect(repository.writeCount).toBe(2)
    expect(authority.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(100)
  })

  test('an admitted write may linearize once before cancel revokes the job', async () => {
    const repository = new DeferredCheckpointRepository()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())
    repository.deferNextWrite()

    const commit = authority.commitCandidate(candidate)
    await repository.waitUntilWriteStarted()
    const cancel = authority.cancel({ expectedRevision: 7 })
    repository.finishDeferredWrite()

    expect((await commit).status).toBe('committed-cancelled')
    expect((await cancel).status).toBe('cancelled-after-commit')
    expect(authority.snapshot().revision).toBe(8)
    expect(repository.writeCount).toBe(2)
    const terminal = (await cancel).message
    expect((await authority.cancel({ expectedRevision: 8 })).status).toBe('busy')
    expect(authority.acknowledgeWorkerTerminal(
      workerCancelled(terminal!, accounting()),
    )).toBe(true)
    expect((await authority.cancel({ expectedRevision: 8 })).status).toBe('no-job')
  })

  test('cancel during a failed admitted write still closes the lease without debit', async () => {
    const repository = new DeferredCheckpointRepository()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())
    repository.deferNextWrite()

    const commit = authority.commitCandidate(candidate)
    await repository.waitUntilWriteStarted()
    const cancel = authority.cancel({ expectedRevision: 7 })
    const competingForeground = authority.revokeForForeground({ expectedRevision: 7 })
    repository.finishDeferredWrite('definite-failure')

    expect((await commit).status).toBe('terminal-aborted')
    expect((await cancel).status).toBe('cancelled')
    expect((await competingForeground).status).toBe('busy')
    expect(authority.snapshot().revision).toBe(7)
    const terminal = (await cancel).message
    expect(authority.acknowledgeWorkerTerminal(
      workerCancelled(terminal!, ZERO_TEST_ACCOUNTING),
    )).toBe(true)
    expect((await authority.cancel({ expectedRevision: 7 })).status).toBe('no-job')
  })

  test('rejects a nonterminal checkpoint that would consume the final safe revision', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(
      repository,
      'job-final-revision',
      Number.MAX_SAFE_INTEGER - 1,
    )
    const started = await authority.admit(admission(source.revision))
    const candidate = await checkpointCandidate(started.start!, source, accounting())

    const result = await authority.commitCandidate(candidate)

    expect(result.status).toBe('revision-exhausted')
    expect(authority.snapshot().revision).toBe(Number.MAX_SAFE_INTEGER - 1)
    expect(repository.writeCount).toBe(1)
  })

  test('rejects accessor-backed repository read-back without invoking the getter', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    let gets = 0
    const hostile = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() {
        gets += 1
        return 'stored-time-origin-v2'
      },
    })
    repository.setNextRead(hostile)
    const { authority, source } = await createAuthority(repository)

    const result = await authority.admit(admission(source.revision))

    expect(result.status).toBe('indeterminate')
    expect(gets).toBe(0)
    expect(repository.writeCount).toBe(0)
  })

  test('descriptor-captures injected repository methods without invoking accessors', async () => {
    let gets = 0
    const hostile = Object.defineProperties({}, {
      read: {
        get() {
          gets += 1
          return () => null
        },
      },
      persist: {
        value: () => Object.freeze({ status: 'committed' as const }),
      },
    })

    await expect(createAuthority(
      hostile as unknown as StoredTimeCheckpointRepositoryV2,
    )).rejects.toThrow(/read must be a data method/u)
    expect(gets).toBe(0)
  })

  test('rejects oversized repository data before persistence and keeps control feedback responsive', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    repository.setNextRead('x'.repeat(65_537))
    const { authority, source } = await createAuthority(repository)

    expect((await authority.admit(admission(source.revision))).status)
      .toBe('indeterminate')
    expect(repository.writeCount).toBe(0)

    const clean = new InMemoryStoredTimeCheckpointRepositoryV2()
    const admitted = await createAuthority(clean)
    await admitted.authority.admit(admission(7))
    const startedAt = performance.now()
    expect((await admitted.authority.cancel({ expectedRevision: 7 })).status)
      .toBe('sent')
    expect(performance.now() - startedAt).toBeLessThan(50)
  })

  test('foreground revocation and lifecycle pause preserve ordered closed controls', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    await authority.admit(admission(source.revision))

    const pause = authority.requestLifecyclePause(
      { expectedRevision: 7 },
      'browser-hidden',
    )
    const revoked = await authority.revokeForForeground({ expectedRevision: 7 })

    expect(pause.message?.type).toBe('lifecycle-pause')
    expect(revoked.message?.type).toBe('authority-revoked')
    if (pause.message?.type === 'lifecycle-pause' &&
      revoked.message?.type === 'authority-revoked') {
      expect(revoked.message.controlSequence).toBe(pause.message.controlSequence + 1)
    }
    expect((await authority.cancel({ expectedRevision: 7 })).status).toBe('no-job')
  })

  test('releases an acknowledged lifecycle pause before a new admission', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority, source } = await createAuthority(repository)
    const started = await authority.admit(admission(7))
    const pause = authority.requestLifecyclePause(
      { expectedRevision: 7 }, 'browser-hidden',
    )
    expect(pause.status).toBe('sent')
    const committed = await authority.commitCandidate(
      await checkpointCandidate(started.start!, source, accounting()),
    )
    expect(committed.status).toBe('committed')
    expect(authority.acknowledgeWorkerTerminal(
      workerPaused(committed.acknowledgement!, accounting(), 'lifecycle'),
    )).toBe(true)
    expect((await authority.admit(admission(8))).status).toBe('started')
  })

  test('releases an exact failed job at its last durable boundary for retry', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository)
    const started = await authority.admit(admission(7))

    expect(authority.acknowledgeWorkerTerminal(
      workerFailed(started.start!, ZERO_TEST_ACCOUNTING),
    )).toBe(true)
    expect(authority.snapshot().revision).toBe(7)
    expect(authority.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(100)
    expect((await authority.admit(admission(7))).status).toBe('started')
  })

  test('releases a recovered invalid start only at its durable progress', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(repository, 'job-restart-failure')
    const admitted = await first.authority.admit(admission(7))
    const committed = await first.authority.commitCandidate(
      await checkpointCandidate(admitted.start!, first.source, accounting()),
    )
    const reloaded = await createAuthority(
      repository, 'unused-job', 8, committed.publication,
    )
    const recovered = await reloaded.authority.recoverDurableCheckpoint()
    expect(recovered.start?.type).toBe('start')

    expect(reloaded.authority.acknowledgeWorkerTerminal(
      workerFailed(recovered.start!, accounting(), 'start-invalid'),
    )).toBe(true)
    expect((await reloaded.authority.admit(admission(8))).status).toBe('started')
  })

  test('round-trips real periodic and completion messages through authority', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository)
    const admitted = await authority.admit(Object.freeze({
      ...admission(7),
      requestedDurationSeconds: 10,
    }))
    const host = new AuthorityIntegrationHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    engine.accept(admitted.start!)

    await host.runUntilMessage('checkpoint-candidate', 6_000)
    const periodic = host.lastMessage('checkpoint-candidate')
    const periodicCommit = await authority.commitCandidate(periodic)
    if (periodicCommit.status !== 'committed') {
      throw new Error(periodicCommit.error ?? periodicCommit.status)
    }
    expect(periodicCommit.status).toBe('committed')
    expect(periodicCommit.acknowledgement?.type).toBe('checkpoint-committed')
    if (periodicCommit.acknowledgement?.type !== 'checkpoint-committed') {
      throw new Error('Periodic authority acknowledgement was not issued.')
    }
    expect(periodicCommit.acknowledgement.proposalHashEcho)
      .toBe(periodic.proposalHash)
    engine.accept(periodicCommit.acknowledgement)

    await host.runUntilMessage('completed')
    const completed = host.lastMessage('completed')
    const completedCommit = await authority.commitCandidate(completed)
    if (completedCommit.status !== 'committed') {
      throw new Error(
        `${completedCommit.error ?? completedCommit.status}: ${JSON.stringify(completed.accounting)}`,
      )
    }
    expect(completedCommit.status).toBe('committed')
    expect(completedCommit.acknowledgement?.type).toBe('checkpoint-committed')
    if (completedCommit.acknowledgement?.type !== 'checkpoint-committed') {
      throw new Error('Completion authority acknowledgement was not issued.')
    }
    expect(completedCommit.acknowledgement.proposalHashEcho)
      .toBe(completed.proposalHash)
    engine.accept(completedCommit.acknowledgement)

    expect(engine.snapshot().active).toBe(false)
    expect(authority.snapshot().revision).toBe(9)
    expect(authority.snapshot().state.timeline.storedTimeAvailableSeconds)
      .toBe(90)
    expect(repository.writeCount).toBe(3)
  }, 120_000)

  test('durably recovers a real worker after one authenticated Infinity reset', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const readyState = cloneCanonicalGameStateV2(Object.freeze({
      ...migrated.state,
      dyson: Object.freeze({
        ...migrated.state.dyson,
        bots: gameDecimalFromNumber(4.2e60),
        goalStage: 10n,
      }),
      skills: Object.freeze({
        ...migrated.state.skills,
        activeAutoAssignment: Object.freeze([]),
      }),
      timeline: Object.freeze({
        ...migrated.state.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.1,
        infinityBoundaryRemaining: 0.1,
        infinityCycleSeconds: 1,
        storedTimeAvailableSeconds: 100,
        storedTimeCapacitySeconds: 100,
        doubleTime: Object.freeze({
          ...migrated.state.timeline.doubleTime,
          unlocked: false,
          enabled: false,
          bankSeconds: 0,
          rate: 0,
        }),
      }),
    }) as CanonicalGameStateV2)
    const source = Object.freeze({
      revision: 7,
      state: readyState,
      runtime: migrated.runtime,
    })
    const first = await createAuthority(
      repository,
      'job-infinity-reset',
      7,
      source,
      'test-release-build-a',
      DOUBLE_INFINITY_REWARD_AUTHORITY,
    )
    const admitted = await first.authority.admit(Object.freeze({
      ...admission(7),
      requestedDurationSeconds: 1.2,
    }))
    const firstHost = new AuthorityIntegrationHostV2()
    const firstEngine = new StoredTimeWorkerEngineV2(firstHost)
    firstEngine.accept(admitted.start!)
    await firstHost.runUntilMessage('authority-request', 6_000)
    const preReset = firstHost.lastMessage('authority-request')
    expect(preReset.phase).toBe('pre-infinity')
    expect(preReset.accounting.cumulativeInfinityResetCount).toBe('0')
    const preCommitStarted = performance.now()
    const granted = await first.authority.commitCandidate(preReset)
    const preCommitElapsed = performance.now() - preCommitStarted
    if (granted.status !== 'committed') throw new Error(granted.error ?? granted.status)
    expect(granted.status).toBe('committed')
    expect(preCommitElapsed).toBeLessThan(50)
    expect(repository.writeCount).toBe(1)
    const duplicate = await first.authority.commitCandidate(preReset)
    expect(duplicate.status).toBe('committed')
    expect(duplicate.acknowledgement).toEqual(granted.acknowledgement)
    expect(repository.writeCount).toBe(1)
    firstEngine.accept(granted.acknowledgement!)
    await firstHost.runUntilMessageCount('authority-request', 2)
    const postReset = firstHost.lastMessage('authority-request')
    expect(postReset.phase).toBe('post-infinity')
    expect(postReset.proposalHash).toBe(
      granted.acknowledgement?.type === 'authority-granted'
        ? granted.acknowledgement.expectedPostHash
        : null,
    )
    const postCommitStarted = performance.now()
    const postGranted = await first.authority.commitCandidate(postReset)
    const postCommitElapsed = performance.now() - postCommitStarted
    expect(postGranted.status).toBe('committed')
    expect(postCommitElapsed).toBeLessThan(50)
    expect((await first.authority.commitCandidate(postReset)).acknowledgement)
      .toEqual(postGranted.acknowledgement)
    expect(repository.writeCount).toBe(1)
    firstEngine.accept(postGranted.acknowledgement!)
    const postPublication = decodeStoredTimeWorkerPublicationV2(postReset.publication)
    const forgedState = cloneCanonicalGameStateV2({
      ...postPublication.state,
      infinity: {
        ...postPublication.state.infinity,
        availablePoints: addGameDecimals(
          postPublication.state.infinity.availablePoints,
          gameDecimalFromNumber(1),
        ),
      },
    })
    const forgedPublication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: forgedState,
      runtime: postPublication.runtime,
    }))
    const staleDuplicate = captureStoredTimeWorkerMessageV2(Object.freeze({
      ...postReset,
      publication: forgedPublication,
      proposalHash: await hashStoredTimeWorkerPublicationV2(forgedPublication),
    }))
    const revoked = await first.authority.commitCandidate(staleDuplicate)
    expect(revoked.status).toBe('rejected')
    expect(revoked.terminalControl?.type).toBe('authority-revoked')
    expect(repository.writeCount).toBe(1)

    const reloaded = await createAuthority(
      repository,
      'unused-recovered-job',
      7,
      source,
      'test-release-build-a',
      DOUBLE_INFINITY_REWARD_AUTHORITY,
    )
    const recovered = await reloaded.authority.recoverDurableCheckpoint()
    if (recovered.status !== 'recovered') throw new Error(recovered.error ?? recovered.status)
    expect(recovered.status).toBe('recovered')
    expect(recovered.start).toBeNull()
    const restarted = await reloaded.authority.admit(Object.freeze({
      ...admission(7),
      requestedDurationSeconds: 1.2,
    }))
    expect(restarted.status).toBe('started')
    const completed = await driveToCompletedThroughAuthorityV2(
      reloaded.authority,
      restarted.start!,
    )
    expect(completed.accounting.cumulativeInfinityResetCount).toBe('1')
    const completedCommit = await reloaded.authority.commitCandidate(completed)
    expect(completedCommit.status).toBe('committed')
    const final = completedCommit.publication
    expect(final.revision).toBe(8)
    expect(final.state.statistics.lifetime.ordinaryInfinityCount)
      .toBe(source.state.statistics.lifetime.ordinaryInfinityCount + 1n)
    expect(gameDecimalToCanonicalString(final.state.infinity.availablePoints))
      .toBe('2e0')
    expect(final.state.timeline.infinityCycleSeconds).toBe(1.2 - 0.1)
    expect(repository.writeCount).toBe(3)
  }, 120_000)

  test.each([
    'crash-after-pre-grant',
    'lost-pre-grant',
    'lost-post-grant',
    'duplicate-pre-grant',
    'duplicate-post-grant',
  ] as const)('recovers exactly once across transient grant delivery case %s', async (scenario) => {
    const source = infinityReadyPublicationV2()
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(
      repository,
      `transient-grant-${scenario}`,
      7,
      source,
      'test-release-build-a',
      DOUBLE_INFINITY_REWARD_AUTHORITY,
    )
    const admitted = await first.authority.admit(Object.freeze({
      ...admission(7), requestedDurationSeconds: 1.2,
    }))
    const host = new AuthorityIntegrationHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    engine.accept(admitted.start!)
    await host.runUntilMessage('authority-request', 6_000)
    const pre = host.lastMessage('authority-request')
    expect(pre.phase).toBe('pre-infinity')
    const preCommit = await first.authority.commitCandidate(pre)
    expect(preCommit.status).toBe('committed')
    expect(repository.writeCount).toBe(1)
    expect(repository.durableRecord()?.kind).toBe('stored-time-origin-v2')

    if (scenario === 'crash-after-pre-grant') {
      const reloaded = await createAuthority(
        repository,
        `transient-grant-reloaded-${scenario}`,
        7,
        source,
        'test-release-build-a',
        DOUBLE_INFINITY_REWARD_AUTHORITY,
      )
      const recovered = await reloaded.authority.recoverDurableCheckpoint()
      expect(recovered.status).toBe('recovered')
      expect(recovered.start).toBeNull()
      expect(repository.writeCount).toBe(1)
      const restarted = await reloaded.authority.admit(Object.freeze({
        ...admission(7), requestedDurationSeconds: 1.2,
      }))
      const completed = await driveToCompletedThroughAuthorityV2(
        reloaded.authority,
        restarted.start!,
      )
      expect(completed.accounting.cumulativeInfinityResetCount).toBe('1')
      const final = await reloaded.authority.commitCandidate(completed)
      expect(final.status).toBe('committed')
      expect(repository.writeCount).toBe(3)
      return
    }

    const deliveredPre = scenario === 'lost-pre-grant'
      ? await first.authority.commitCandidate(pre)
      : preCommit
    expect(deliveredPre.acknowledgement?.type).toBe('authority-granted')
    engine.accept(deliveredPre.acknowledgement!)
    if (scenario === 'duplicate-pre-grant') {
      engine.accept(deliveredPre.acknowledgement!)
    }
    await host.runUntilMessageCount('authority-request', 2)
    const post = host.lastMessage('authority-request')
    expect(post.phase).toBe('post-infinity')
    const postCommit = await first.authority.commitCandidate(post)
    expect(postCommit.status).toBe('committed')
    const deliveredPost = scenario === 'lost-post-grant'
      ? await first.authority.commitCandidate(post)
      : postCommit
    engine.accept(deliveredPost.acknowledgement!)
    if (scenario === 'duplicate-post-grant') {
      engine.accept(deliveredPost.acknowledgement!)
    }
    const completed = await driveExistingEngineToCompletedThroughAuthorityV2(
      first.authority,
      engine,
      host,
      host.messages.length,
    )
    expect(completed.accounting.cumulativeInfinityResetCount).toBe('1')
    expect(repository.writeCount).toBe(2)
    const final = await first.authority.commitCandidate(completed)
    expect(final.status).toBe('committed')
    expect(repository.writeCount).toBe(3)
  }, 120_000)

  test('linearizes cancel, lifecycle and foreground controls over in-flight transient PRE and POST', async () => {
    const source = infinityReadyPublicationV2()
    for (const phase of ['pre', 'post'] as const) {
    for (const control of ['cancel', 'lifecycle', 'foreground'] as const) {
      const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
      const { authority } = await createAuthority(
        repository,
        `transient-${phase}-${control}`,
        7,
        source,
        'test-release-build-a',
        DOUBLE_INFINITY_REWARD_AUTHORITY,
      )
      const admitted = await authority.admit(Object.freeze({
        ...admission(7),
        requestedDurationSeconds: 1.2,
      }))
      const host = new AuthorityIntegrationHostV2()
      const engine = new StoredTimeWorkerEngineV2(host)
      engine.accept(admitted.start!)
      await host.runUntilMessage('authority-request', 6_000)
      let request = host.lastMessage('authority-request')
      if (phase === 'post') {
        const pre = await authority.commitCandidate(request)
        if (pre.status !== 'committed' || pre.acknowledgement === null) {
          throw new Error(pre.error ?? pre.status)
        }
        engine.accept(pre.acknowledgement)
        await host.runUntilMessageCount('authority-request', 2)
        request = host.lastMessage('authority-request')
        expect(request.phase).toBe('post-infinity')
      }
      const committing = authority.commitCandidate(request)
      const controlled = control === 'cancel'
        ? await authority.cancel({ expectedRevision: 7 })
        : control === 'foreground'
          ? await authority.revokeForForeground({ expectedRevision: 7 })
          : authority.requestLifecyclePause(
            { expectedRevision: 7 }, 'browser-hidden',
          )
      const committed = await committing
      expect(committed.status).toBe('terminal-aborted')
      expect(committed.acknowledgement).toBeNull()
      expect(repository.writeCount).toBe(1)
      expect(controlled.message?.type).toBe(
        control === 'cancel'
          ? 'cancel'
          : control === 'foreground'
            ? 'authority-revoked'
            : 'lifecycle-pause',
      )
      engine.accept(controlled.message!)
      if (control !== 'foreground') {
        const terminal = host.messages.at(-1)
        expect(terminal?.type).toBe(control === 'cancel' ? 'cancelled' : 'paused')
        expect(authority.acknowledgeWorkerTerminal(terminal)).toBe(true)
      }
    }
    }
  }, 120_000)

  test('chains multiple exact Infinity resets into one cadence-bounded durable publication', async () => {
    const base = infinityReadyPublicationV2()
    const source = Object.freeze({
      ...base,
      state: cloneCanonicalGameStateV2({
        ...base.state,
        infinity: {
          ...base.state.infinity,
          breakTarget: gameDecimalFromNumber(2),
          botCapRewardsGranted: true,
          permanentSkillPoints: 2n,
          retainedFacilities: Object.freeze(Object.fromEntries(
            Object.keys(base.state.infinity.retainedFacilities).map((id) => [id, true]),
          )) as CanonicalGameStateV2['infinity']['retainedFacilities'],
        },
        skills: {
          ...base.state.skills,
          points: 2n,
        },
        quantum: {
          ...base.state.quantum,
          divisionsPurchased: 19n,
          unlocks: {
            ...base.state.quantum.unlocks,
            breakTheLoop: true,
          },
        },
        timeline: {
          ...base.state.timeline,
          infinityBoundaryRemaining: 0.02,
        },
      }),
    })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(
      repository,
      'multi-infinity-chain',
      7,
      source,
      'test-release-build-a',
      DOUBLE_INFINITY_REWARD_AUTHORITY,
    )
    const admitted = await authority.admit(Object.freeze({
      ...admission(7), requestedDurationSeconds: 0.045,
    }))
    let observedPreCount = 0
    const completed = await driveToCompletedThroughAuthorityV2(
      authority,
      admitted.start!,
      async (request) => {
        if (request.phase !== 'pre-infinity') return
        observedPreCount += 1
        if (observedPreCount <= 2) {
          await expectOutstandingTransientPreRejectsDurableCandidatesV2(
            authority,
            request,
          )
        }
      },
    )
    expect(observedPreCount).toBeGreaterThanOrEqual(2)
    expect(BigInt(completed.schedulerSummary.infinityResetCount))
      .toBeGreaterThanOrEqual(2n)
    expect(repository.writeCount).toBe(1)
    const committed = await authority.commitCandidate(completed)
    if (committed.status !== 'committed') throw new Error(committed.error ?? committed.status)
    expect(committed.status).toBe('committed')
    expect(committed.publication.revision).toBe(8)
    expect(repository.writeCount).toBe(2)
  }, 120_000)

  test('durably recovers a real worker after one authenticated Dream reset', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const zeroFacilities = Object.freeze(Object.fromEntries(
      Object.keys(migrated.state.dyson.facilities).map((id) => [
        id,
        Object.freeze([
          gameDecimalFromNumber(id === 'assembly_lines' ? 1 : 0),
          gameDecimalFromNumber(0),
        ]),
      ]),
    )) as unknown as CanonicalGameStateV2['dyson']['facilities']
    const readyState = cloneCanonicalGameStateV2(Object.freeze({
      ...migrated.state,
      dyson: Object.freeze({
        ...migrated.state.dyson,
        bots: gameDecimalFromNumber(0),
        workers: gameDecimalFromNumber(1),
        researchers: gameDecimalFromNumber(0),
        facilities: zeroFacilities,
        goalStage: 10n,
      }),
      dream: Object.freeze({
        ...migrated.state.dream,
        disasterStage: 1n,
        resources: Object.freeze({
          ...migrated.state.dream.resources,
          cities: gameDecimalFromNumber(1),
        }),
      }),
      timeline: Object.freeze({
        ...migrated.state.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.1,
        infinityBoundaryRemaining: 42_000_000,
        infinityCycleSeconds: 0,
        storedTimeAvailableSeconds: 100,
        storedTimeCapacitySeconds: 100,
        doubleTime: Object.freeze({
          ...migrated.state.timeline.doubleTime,
          unlocked: false,
          enabled: false,
          bankSeconds: 0,
          rate: 0,
        }),
      }),
    }) as CanonicalGameStateV2)
    const source = Object.freeze({ revision: 7, state: readyState, runtime: migrated.runtime })
    const first = await createAuthority(repository, 'job-dream-reset', 7, source)
    const admitted = await first.authority.admit(Object.freeze({
      ...admission(7), requestedDurationSeconds: 10,
    }))
    const host = new AuthorityIntegrationHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    engine.accept(admitted.start!)
    await host.runUntilMessage('checkpoint-candidate', 6_000)
    const candidate = host.lastMessage('checkpoint-candidate')
    expect(candidate.schedulerSummary).toMatchObject({
      dreamResetCount: '1',
      dreamFastNormalizedResetCount: '0',
      dreamFastNormalizationFirstCycleElapsedSeconds: null,
      dreamFastNormalizationCycleSeconds: null,
      dreamMeteorResetCount: '1',
      dreamStrangeMatterRequested: '1e0',
    })
    const committed = await first.authority.commitCandidate(candidate)
    if (committed.status !== 'committed') {
      throw new Error(committed.error ?? committed.status)
    }
    const reloaded = await createAuthority(
      repository, 'unused-dream-recovery', 8, committed.publication,
    )
    const recovered = await reloaded.authority.recoverDurableCheckpoint()
    if (recovered.status !== 'recovered') throw new Error(recovered.error ?? recovered.status)
    expect(recovered.status).toBe('recovered')
    const recoveredHost = new AuthorityIntegrationHostV2()
    const recoveredEngine = new StoredTimeWorkerEngineV2(recoveredHost)
    recoveredEngine.accept(recovered.start!)
    await recoveredHost.runUntilMessage('completed')
    const completed = recoveredHost.lastMessage('completed')
    const finalCommit = await reloaded.authority.commitCandidate(completed)
    expect(finalCommit.status).toBe('committed')
    expect(finalCommit.publication.state.dream.resetCount)
      .toBe(source.state.dream.resetCount + 1n)
    expect(finalCommit.publication.state.statistics.lifetime.meteorDreamResets)
      .toBe(source.state.statistics.lifetime.meteorDreamResets + 1n)
    expect(gameDecimalToCanonicalString(finalCommit.publication.state.dream.strangeMatter))
      .toBe('1e0')
  }, 120_000)

  test('exact-binds normalized Fast Dream windows and final-cycle telemetry', async () => {
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const zeroFacilities = Object.freeze(Object.fromEntries(
      Object.keys(migrated.state.dyson.facilities).map((id) => [
        id,
        Object.freeze([gameDecimalFromNumber(0), gameDecimalFromNumber(0)]),
      ]),
    )) as unknown as CanonicalGameStateV2['dyson']['facilities']
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: {
        ...migrated.state.dyson,
        bots: gameDecimalFromNumber(0),
        workers: gameDecimalFromNumber(0),
        researchers: gameDecimalFromNumber(0),
        science: gameDecimalFromNumber(0),
        facilities: zeroFacilities,
      },
      dream: {
        ...migrated.state.dream,
        disasterStage: 1n,
        upgrades: {
          ...migrated.state.dream.upgrades,
          hunter1: true,
          gatherer1: true,
        },
        resources: {
          ...migrated.state.dream.resources,
          housing: gameDecimalFromNumber(10),
          villages: gameDecimalFromNumber(24),
          cities: gameDecimalFromNumber(0),
        },
      },
      reality: { ...migrated.state.reality, workersReady: 128n, autoGather: false },
      timeline: {
        ...migrated.state.timeline,
        storedTimeCapacitySeconds: 20_000,
        storedTimeAvailableSeconds: 20_000,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.1,
        infinityBoundaryRemaining: 42_000_000,
        infinityCycleSeconds: 0,
        doubleTime: {
          ...migrated.state.timeline.doubleTime,
          unlocked: true,
          rate: 1,
          bankSeconds: 20_000,
        },
      },
    })
    const source = Object.freeze({ revision: 7, state, runtime: migrated.runtime })
    const { authority } = await createAuthority(
      repository, 'job-fast-dream-proof', 7, source,
    )
    const admitted = await authority.admit(Object.freeze({
      ...admission(7),
      policyId: 'stored-time-fast-v1' as const,
      requestedDurationSeconds: 12_345,
    }))
    const host = new AuthorityIntegrationHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    engine.accept(admitted.start!)
    await host.runUntilMessage('checkpoint-candidate', 6_000)
    const anchor = host.lastMessage('checkpoint-candidate')
    const anchorCommit = await authority.commitCandidate(anchor)
    expect(anchorCommit.status).toBe('committed')
    engine.accept(anchorCommit.acknowledgement!)
    await host.runUntilMessageCount('checkpoint-candidate', 2)
    const normalizedCandidate = host.lastMessage('checkpoint-candidate')
    expect(BigInt(normalizedCandidate.schedulerSummary.dreamFastNormalizedResetCount))
      .toBeGreaterThan(0n)
    const prior = authority.snapshot().state
    const candidate = decodeStoredTimeWorkerPublicationV2(normalizedCandidate.publication)
    const mutate = async (change: (value: CanonicalGameStateV2) => CanonicalGameStateV2) => {
      const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
        state: change(candidate.state), runtime: candidate.runtime,
      }))
      return captureStoredTimeWorkerMessageV2(Object.freeze({
        ...normalizedCandidate,
        publication,
        proposalHash: await hashStoredTimeWorkerPublicationV2(publication),
      }))
    }
    const normalizedWindow = candidate.state.statistics.dailyWindows.findIndex(
      (bucket, index) => bucket.dreamResetCount -
        (prior.statistics.dailyWindows[index]?.sequence === bucket.sequence
          ? prior.statistics.dailyWindows[index]!.dreamResetCount
          : 0n) > 1n,
    )
    expect(normalizedWindow).toBeGreaterThanOrEqual(0)
    const omittedCount = await mutate((value) => {
      const dailyWindows = [...value.statistics.dailyWindows]
      dailyWindows[normalizedWindow] = Object.freeze({
        ...dailyWindows[normalizedWindow]!,
        dreamResetCount: dailyWindows[normalizedWindow]!.dreamResetCount - 1n,
      })
      return cloneCanonicalGameStateV2({
        ...value, statistics: { ...value.statistics, dailyWindows },
      })
    })
    expect((await authority.commitCandidate(omittedCount)).status).toBe('rejected')
    const creditedWindow = candidate.state.statistics.dailyWindows.findIndex(
      (bucket, index) => compareGameDecimals(
        bucket.strangeMatter,
        prior.statistics.dailyWindows[index]?.sequence === bucket.sequence
          ? prior.statistics.dailyWindows[index]!.strangeMatter
          : gameDecimalFromNumber(0),
      ) > 0,
    )
    expect(creditedWindow).toBeGreaterThanOrEqual(0)
    const omittedMatter = await mutate((value) => {
      const dailyWindows = [...value.statistics.dailyWindows]
      const bucket = dailyWindows[creditedWindow]!
      const previous = prior.statistics.dailyWindows[creditedWindow]
      dailyWindows[creditedWindow] = Object.freeze({
        ...bucket,
        strangeMatter: previous?.sequence === bucket.sequence
          ? previous.strangeMatter
          : gameDecimalFromNumber(0),
      })
      return cloneCanonicalGameStateV2({
        ...value, statistics: { ...value.statistics, dailyWindows },
      })
    })
    expect((await authority.commitCandidate(omittedMatter)).status).toBe('rejected')
    for (const lastCompletedCycle of [
      { ...candidate.state.statistics.lastCompletedCycle, dreamCause: 'GlobalWarming' as const },
      { ...candidate.state.statistics.lastCompletedCycle, reward: gameDecimalFromNumber(999) },
      { ...candidate.state.statistics.lastCompletedCycle, durationSeconds: 1 },
      { ...candidate.state.statistics.lastCompletedCycle, breakInfinity: true },
    ]) {
      const forged = await mutate((value) => cloneCanonicalGameStateV2({
        ...value,
        statistics: { ...value.statistics, lastCompletedCycle },
      }))
      expect((await authority.commitCandidate(forged)).status).toBe('rejected')
    }
    const committed = await authority.commitCandidate(normalizedCandidate)
    if (committed.status !== 'committed') throw new Error(committed.error ?? committed.status)
    expect(committed.status).toBe('committed')
  }, 120_000)

  test('recomputes an admitted queued Entanglement before publishing worker balances', async () => {
    const seed = await createAuthority(new InMemoryStoredTimeCheckpointRepositoryV2())
    const state = cloneCanonicalGameStateV2({
      ...seed.source.state,
      infinity: {
        ...seed.source.state.infinity,
        availablePoints: gameDecimalFromNumber(84),
        allocatedPoints: gameDecimalFromNumber(0),
      },
      quantum: {
        ...seed.source.state.quantum,
        availableShards: gameDecimalFromNumber(1),
        lifetimeEarnedShards: gameDecimalFromNumber(1),
        unlocks: {
          ...seed.source.state.quantum.unlocks,
          quantumEntanglement: true,
        },
      },
    })
    const source = Object.freeze({ ...seed.source, state })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository, 'quantum-job', 7, source)
    const queuedInputs = Object.freeze([
      Object.freeze({
        id: 'entangle-once',
        remainingHorizonSeconds: 0.05,
        commandVersion: 1 as const,
        commandKind: 'quantum-action' as const,
      }),
    ])
    const admitted = await authority.admit(admission(7, 4, queuedInputs))
    expect(admitted.status).toBe('started')
    const completed = await driveToCompletedThroughAuthorityV2(authority, admitted.start!)
    const decoded = decodeStoredTimeWorkerPublicationV2(completed.publication)
    const forgedState = cloneCanonicalGameStateV2({
      ...decoded.state,
      quantum: {
        ...decoded.state.quantum,
        availableShards: gameDecimalFromNumber(999),
      },
    })
    const forgedPublication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: forgedState,
      runtime: decoded.runtime,
    }))
    const forged = captureStoredTimeWorkerMessageV2(Object.freeze({
      ...completed,
      schedulerSummary: Object.freeze({
        ...completed.schedulerSummary,
        quantumAvailableShardsEffective: '9.99e2',
        quantumAvailableShardsFinal: '9.99e2',
      }),
      publication: forgedPublication,
      proposalHash: await hashStoredTimeWorkerPublicationV2(forgedPublication),
    }))
    expect((await authority.commitCandidate(forged)).status).toBe('rejected')
    for (const hostileState of [
      cloneCanonicalGameStateV2({
        ...decoded.state,
        infinity: {
          ...decoded.state.infinity,
          availablePoints: addGameDecimals(decoded.state.infinity.availablePoints, gameDecimalFromNumber(1)),
        },
      }),
      cloneCanonicalGameStateV2({
        ...decoded.state,
        skills: { ...decoded.state.skills, points: decoded.state.skills.points + 1n },
      }),
      cloneCanonicalGameStateV2({
        ...decoded.state,
        statistics: {
          ...decoded.state.statistics,
          lifetime: {
            ...decoded.state.statistics.lifetime,
            breakInfinityCount: decoded.state.statistics.lifetime.breakInfinityCount + 1n,
          },
        },
      }),
    ]) {
      const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
        state: hostileState,
        runtime: decoded.runtime,
      }))
      const message = captureStoredTimeWorkerMessageV2(Object.freeze({
        ...completed,
        publication,
        proposalHash: await hashStoredTimeWorkerPublicationV2(publication),
      }))
      expect((await authority.commitCandidate(message)).status).toBe('rejected')
    }
    const committed = await authority.commitCandidate(completed)
    if (committed.status !== 'committed') throw new Error(committed.error ?? committed.status)
    expect(committed.status).toBe('committed')
    expect(gameDecimalToCanonicalString(committed.publication.state.quantum.availableShards)).toBe('3e0')
    expect(gameDecimalToCanonicalString(committed.publication.state.quantum.lifetimeEarnedShards)).toBe('3e0')
    expect(gameDecimalToCanonicalString(committed.publication.state.infinity.availablePoints)).toBe('0')
    expect(repository.writeCount).toBe(2)
  })

  test('recovers a queued Entanglement checkpoint without replaying its one-shot input', async () => {
    const seed = await createAuthority(new InMemoryStoredTimeCheckpointRepositoryV2())
    const state = cloneCanonicalGameStateV2({
      ...seed.source.state,
      infinity: {
        ...seed.source.state.infinity,
        availablePoints: gameDecimalFromNumber(84),
        allocatedPoints: gameDecimalFromNumber(0),
      },
      quantum: {
        ...seed.source.state.quantum,
        availableShards: gameDecimalFromNumber(1),
        lifetimeEarnedShards: gameDecimalFromNumber(1),
        unlocks: { ...seed.source.state.quantum.unlocks, quantumEntanglement: true },
      },
    })
    const source = Object.freeze({ ...seed.source, state })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const first = await createAuthority(repository, 'quantum-restart', 7, source)
    const queuedInputs = Object.freeze([Object.freeze({
      id: 'entangle-before-checkpoint',
      remainingHorizonSeconds: 0.05,
      commandVersion: 1 as const,
      commandKind: 'quantum-action' as const,
    })])
    const admitted = await first.authority.admit(admission(7, 10, queuedInputs))
    const firstHost = new AuthorityIntegrationHostV2()
    const firstEngine = new StoredTimeWorkerEngineV2(firstHost)
    firstEngine.accept(admitted.start!)
    await firstHost.runUntilMessage('authority-request', 6_000)
    const preAction = firstHost.lastMessage('authority-request')
    expect(preAction.phase).toBe('pre-quantum')
    expect(preAction.schedulerSummary.quantumEntanglementCount).toBe('0')
    expect(preAction.rebasedQueuedInputs).toHaveLength(1)
    const preCommit = await first.authority.commitCandidate(preAction)
    if (preCommit.status !== 'committed' || preCommit.acknowledgement === null) {
      throw new Error(preCommit.error ?? preCommit.status)
    }
    firstEngine.accept(preCommit.acknowledgement)
    await firstHost.runUntilMessageCount('authority-request', 2)
    const postAction = firstHost.lastMessage('authority-request')
    expect(postAction.phase).toBe('post-quantum')
    expect(postAction.schedulerSummary.quantumEntanglementCount).toBe('1')
    expect(postAction.rebasedQueuedInputs).toEqual([])
    const postGrant = await first.authority.commitCandidate(postAction)
    if (postGrant.status !== 'committed') {
      throw new Error(postGrant.error ?? postGrant.status)
    }
    expect(repository.writeCount).toBe(1)
    const reloaded = await createAuthority(
      repository,
      'unused-quantum-restart',
      7,
      source,
    )
    const recovered = await reloaded.authority.recoverDurableCheckpoint()
    if (recovered.status !== 'recovered') throw new Error(recovered.error ?? recovered.status)
    expect(recovered.start).toBeNull()
    const restarted = await reloaded.authority.admit(admission(7, 10, queuedInputs))
    expect(restarted.status).toBe('started')
    const completed = await driveToCompletedThroughAuthorityV2(
      reloaded.authority,
      restarted.start!,
    )
    expect(completed.schedulerSummary.quantumEntanglementCount).toBe('1')
    const finalCommit = await reloaded.authority.commitCandidate(completed)
    if (finalCommit.status !== 'committed') throw new Error(finalCommit.error ?? finalCommit.status)
    expect(gameDecimalToCanonicalString(finalCommit.publication.state.quantum.availableShards))
      .toBe('3e0')
    expect(repository.writeCount).toBe(3)
  }, 120_000)

  test('replays an ordinary queued Quantum reset and its represented wipe on main', async () => {
    const seed = await createAuthority(new InMemoryStoredTimeCheckpointRepositoryV2())
    const state = cloneCanonicalGameStateV2({
      ...seed.source.state,
      infinity: {
        ...seed.source.state.infinity,
        availablePoints: gameDecimalFromNumber(31),
        allocatedPoints: gameDecimalFromNumber(11),
      },
      quantum: {
        ...seed.source.state.quantum,
        availableShards: gameDecimalFromNumber(1),
        lifetimeEarnedShards: gameDecimalFromNumber(1),
        unlocks: { ...seed.source.state.quantum.unlocks, quantumEntanglement: false },
      },
    })
    const source = Object.freeze({ ...seed.source, state })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository, 'quantum-ordinary', 7, source)
    const admitted = await authority.admit(admission(7, 4, Object.freeze([
      Object.freeze({
        id: 'ordinary-once', remainingHorizonSeconds: 0.05,
        commandVersion: 1 as const, commandKind: 'quantum-action' as const,
      }),
    ])))
    const completed = await driveToCompletedThroughAuthorityV2(authority, admitted.start!)
    expect(completed.schedulerSummary).toMatchObject({
      quantumResetCount: '1',
      quantumEntanglementCount: '0',
      quantumAvailableShardsEffective: '1e0',
      quantumLifetimeShardsEffective: '1e0',
      quantumInfinityPointsConsumed: '4.2e1',
      quantumInfinityAvailableFinal: '0',
      quantumInfinityAllocatedFinal: '0',
    })
    const committed = await authority.commitCandidate(completed)
    if (committed.status !== 'committed') throw new Error(committed.error ?? committed.status)
    expect(gameDecimalToCanonicalString(committed.publication.state.quantum.availableShards))
      .toBe('2e0')
    expect(gameDecimalToCanonicalString(committed.publication.state.infinity.availablePoints))
      .toBe('0')
    expect(gameDecimalToCanonicalString(committed.publication.state.infinity.allocatedPoints))
      .toBe('0')
  }, 120_000)

  test('acknowledges an authentic Infinity epoch that makes a later Entanglement ready', async () => {
    const seed = await createAuthority(new InMemoryStoredTimeCheckpointRepositoryV2())
    const state = cloneCanonicalGameStateV2({
      ...seed.source.state,
      dyson: {
        ...seed.source.state.dyson,
        bots: gameDecimalFromCanonicalString('1e100'),
        goalStage: 10n,
      },
      infinity: {
        ...seed.source.state.infinity,
        availablePoints: gameDecimalFromNumber(41),
        allocatedPoints: gameDecimalFromNumber(0),
        breakTarget: gameDecimalFromNumber(42),
      },
      quantum: {
        ...seed.source.state.quantum,
        unlocks: {
          ...seed.source.state.quantum.unlocks,
          breakTheLoop: true,
          quantumEntanglement: true,
        },
      },
      timeline: {
        ...seed.source.state.timeline,
        infinityBoundaryRemaining: 0.05,
        infinityCycleSeconds: 1,
      },
    })
    const source = Object.freeze({ ...seed.source, state })
    const repository = new InMemoryStoredTimeCheckpointRepositoryV2()
    const { authority } = await createAuthority(repository, 'infinity-then-quantum', 7, source)
    const admitted = await authority.admit(admission(7, 4, Object.freeze([
      Object.freeze({
        id: 'earned-entangle', remainingHorizonSeconds: 0.125,
        commandVersion: 1 as const, commandKind: 'quantum-action' as const,
      }),
    ])))
    const completed = await driveToCompletedThroughAuthorityV2(authority, admitted.start!)
    expect(completed.schedulerSummary.infinityResetCount).toBe('1')
    expect(completed.schedulerSummary.quantumEntanglementCount).toBe('1')
    const committed = await authority.commitCandidate(completed)
    if (committed.status !== 'committed') throw new Error(committed.error ?? committed.status)
    expect(compareGameDecimals(committed.publication.state.quantum.availableShards,
      source.state.quantum.availableShards)).toBeGreaterThan(0)
  }, 120_000)
})

async function createAuthority(
  repository: Readonly<StoredTimeCheckpointRepositoryV2>,
  jobId = 'job-0001',
  revision = 7,
  initialPublication?: Readonly<StoredTimeAuthorityPublicationV2>,
  releaseBuildId = 'test-release-build-a',
  infinityRewardAuthority = INFINITY_REWARD_AUTHORITY,
): Promise<{
  authority: StoredTimeJobAuthorityV2
  source: Readonly<StoredTimeAuthorityPublicationV2>
}> {
  const state = cloneCanonicalGameStateV2(Object.freeze({
    ...migrated.state,
    timeline: Object.freeze({
      ...migrated.state.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 3,
      infinityBoundaryRemaining: 100,
      infinityCycleSeconds: 5,
      storedTimeAvailableSeconds: 100,
      storedTimeCapacitySeconds: 100,
      doubleTime: Object.freeze({
        ...migrated.state.timeline.doubleTime,
        unlocked: true,
        enabled: true,
        bankSeconds: 50,
        rate: 1,
      }),
    }),
  }) as CanonicalGameStateV2)
  const source = initialPublication ?? Object.freeze({
    revision,
    state,
    runtime: migrated.runtime,
  })
  const ready = await createStoredTimeWorkerReadyV2(
    'worker-nonce-0001',
    releaseBuildId,
  )
  const authority = new StoredTimeJobAuthorityV2({
    initialPublication: source,
    ready,
    expectedIdentity: Object.freeze({
      buildId: ready.buildId,
      catalogHash: ready.catalogHash,
      tuningHash: ready.tuningHash,
    }),
    infinityRewardAuthority,
    repository,
    captureWriterFence: () => FENCE,
    createJobId: () => jobId,
  })
  return { authority, source }
}

function admission(expectedRevision: number,requestedDurationSeconds=60,queuedInputs?:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]) {
  return Object.freeze({
    expectedRevision,
    policyId: 'stored-time-exact-v1' as const,
    policyVersion: 1 as const,
    requestedDurationSeconds,
    ...(queuedInputs===undefined?{}:{queuedInputs}),
  })
}

function accounting(
  overrides: Partial<StoredTimeWorkerAccountingDtoV2> = {},
): Readonly<StoredTimeWorkerAccountingDtoV2> {
  return Object.freeze({
    cumulativeProcessedSeconds: 10,
    cumulativeDoubleTimeConsumedSeconds: 10,
    cumulativeInfinityElapsedSeconds: 10,
    cumulativeInfinityResetCount: '0',
    lastInfinityResetElapsedSeconds: null,
    sealedInfinityCycleSeconds: 15,
    sealedInfinityBoundaryRemaining: 90,
    cumulativeRawAutomationTicks: '71',
    cumulativeRepresentativeGroups: 0,
    automationTimeUntilNextEvent: 0.1,
    ...overrides,
  })
}

async function checkpointCandidate(
  start: Readonly<StoredTimeWorkerMainMessageV2Like>,
  source: Readonly<StoredTimeAuthorityPublicationV2>,
  cumulativeAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
): Promise<Readonly<Extract<StoredTimeWorkerMessageV2, {
  type: 'checkpoint-candidate'
}>>> {
  const workerState = cloneCanonicalGameStateV2(Object.freeze({
    ...source.state,
    timeline: Object.freeze({
      ...source.state.timeline,
      storedTimeAvailableSeconds: 80,
      doubleTime: Object.freeze({
        ...source.state.timeline.doubleTime,
        bankSeconds: 30,
        unlocked: false,
        enabled: false,
        rate: 2,
      }),
      infinityCycleSeconds: cumulativeAccounting.sealedInfinityCycleSeconds,
      infinityBoundaryRemaining:
        cumulativeAccounting.sealedInfinityBoundaryRemaining,
      automationTimeUntilNextEvent: 2,
      dysonAutomationTargetIndex: 5,
    }),
  }) as CanonicalGameStateV2)
  const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
    state: workerState,
    runtime: source.runtime,
  }))
  const proposalHash = await hashStoredTimeWorkerPublicationV2(publication)
  const captured = captureStoredTimeWorkerMessageV2(Object.freeze({
    type: 'checkpoint-candidate',
    protocolVersion: 1,
    workerInstanceNonce: start.workerInstanceNonce,
    jobId: start.jobId,
    originRevision: start.originRevision,
    acknowledgedBaseRevision: start.acknowledgedBaseRevision,
    policyId: start.policyId,
    policyVersion: 1,
    checkpointSequence: 1,
    proposalHash,
    accounting: cumulativeAccounting,
    sealedRemainingDurationSeconds: 50,
    rebasedQueuedInputs: Object.freeze([]),
    progress: Object.freeze({
      computedSeconds: 10,
      durableSeconds: 0,
      computedRawTicks: '5',
      durableRawTicks: '0',
      representativeGroups: 0,
      elapsedWallMilliseconds: 100,
      maximumChunkMilliseconds: 10,
      maximumAtomicEventMilliseconds: 5,
      throughputTicksPerSecond: 50,
      etaMilliseconds: 500,
      warmingUp: false,
    }),
    schedulerSummary: Object.freeze({
      automationTicks: cumulativeAccounting.cumulativeRawAutomationTicks,
      analyticallySkippedAutomationTicks: '0',
      storedTimeConsumedSeconds:
        cumulativeAccounting.cumulativeProcessedSeconds,
      baseSimulationSeconds: cumulativeAccounting.cumulativeProcessedSeconds,
      dreamSimulationSeconds:
        cumulativeAccounting.cumulativeProcessedSeconds +
        cumulativeAccounting.cumulativeDoubleTimeConsumedSeconds,
      infinityResetCount: cumulativeAccounting.cumulativeInfinityResetCount,
      dreamResetCount: '0',
      dreamFastNormalizedResetCount: '0',
      dreamFastNormalizationFirstCycleElapsedSeconds: null,
      dreamFastNormalizationCycleSeconds: null,
      dreamMeteorResetCount: '0',
      dreamAiResetCount: '0',
      dreamGlobalWarmingResetCount: '0',
      dreamBlackHoleResetCount: '0',
      dreamStrangeMatterRequested: '0',
      dreamStrangeMatterEffective: '0',
      dreamStrangeMatterFinal: null,
      dreamLifetimeStrangeMatterFinal: null,
      dreamCurrentQuantumRunStrangeMatterFinal: null,
      dreamRecentProcessedSegmentStrangeMatterFinal: null,
      quantumResetCount: '0',
      quantumEntanglementCount: '0',
      quantumAvailableShardsEffective: '0',
      quantumLifetimeShardsEffective: '0',
      quantumInfinityPointsConsumed: '0',
      quantumAvailableShardsFinal: null,
      quantumLifetimeShardsFinal: null,
      quantumInfinityAvailableFinal: null,
      quantumInfinityAllocatedFinal: null,
      quantumResetSkillPointsFinal: null,
      lastInfinityResetElapsedSeconds:
        cumulativeAccounting.lastInfinityResetElapsedSeconds,
      materialEvents: 8,
      zeroTimePasses: 0,
      boundaryDigest: '0000000000000000',
    }),
    publication,
  }))
  if (captured.type !== 'checkpoint-candidate') {
    throw new Error('Test candidate capture changed its message kind.')
  }
  return captured
}

function workerCancelled(
  identity: Readonly<StoredTimeWorkerMainMessageV2>,
  durableAccounting: Readonly<StoredTimeWorkerAccountingDtoV2> =
    ZERO_TEST_ACCOUNTING,
): Readonly<StoredTimeWorkerMessageV2> {
  const captured = captureStoredTimeWorkerMessageV2(Object.freeze({
    type: 'cancelled',
    protocolVersion: identity.protocolVersion,
    workerInstanceNonce: identity.workerInstanceNonce,
    jobId: identity.jobId,
    originRevision: identity.originRevision,
    acknowledgedBaseRevision: identity.acknowledgedBaseRevision,
    policyId: identity.policyId,
    policyVersion: identity.policyVersion,
    checkpointSequence: identity.checkpointSequence,
    progress: terminalProgress(durableAccounting),
  }))
  if (captured.type !== 'cancelled') {
    throw new Error('Test terminal capture changed its message kind.')
  }
  return captured
}

function workerPaused(
  identity: Readonly<StoredTimeWorkerMainMessageV2>,
  durableAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
  reason: 'balanced-wall-limit' | 'lifecycle',
): Readonly<StoredTimeWorkerMessageV2> {
  return captureStoredTimeWorkerMessageV2(Object.freeze({
    type: 'paused',
    protocolVersion: identity.protocolVersion,
    workerInstanceNonce: identity.workerInstanceNonce,
    jobId: identity.jobId,
    originRevision: identity.originRevision,
    acknowledgedBaseRevision: identity.acknowledgedBaseRevision,
    policyId: identity.policyId,
    policyVersion: identity.policyVersion,
    checkpointSequence: identity.checkpointSequence,
    reason,
    progress: terminalProgress(durableAccounting),
  }))
}

function workerFailed(
  identity: Readonly<StoredTimeWorkerMainMessageV2>,
  durableAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
  diagnosticCode: 'start-invalid' | 'atomic-wall-budget' = 'atomic-wall-budget',
): Readonly<StoredTimeWorkerMessageV2> {
  return captureStoredTimeWorkerMessageV2(Object.freeze({
    type: 'failed',
    protocolVersion: identity.protocolVersion,
    workerInstanceNonce: identity.workerInstanceNonce,
    jobId: identity.jobId,
    originRevision: identity.originRevision,
    acknowledgedBaseRevision: identity.acknowledgedBaseRevision,
    policyId: identity.policyId,
    policyVersion: identity.policyVersion,
    checkpointSequence: identity.checkpointSequence,
    code: 'budget-exceeded',
    retryable: true,
    diagnosticCode,
    progress: terminalProgress(durableAccounting),
  }))
}

function terminalProgress(
  durableAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
) {
  return Object.freeze({
    computedSeconds: durableAccounting.cumulativeProcessedSeconds,
    durableSeconds: durableAccounting.cumulativeProcessedSeconds,
    computedRawTicks: durableAccounting.cumulativeRawAutomationTicks,
    durableRawTicks: durableAccounting.cumulativeRawAutomationTicks,
    representativeGroups: durableAccounting.cumulativeRepresentativeGroups,
    elapsedWallMilliseconds: 0,
    maximumChunkMilliseconds: 0,
    maximumAtomicEventMilliseconds: 0,
    throughputTicksPerSecond: 0,
    etaMilliseconds: null,
    warmingUp: true,
  })
}

type StoredTimeWorkerMainMessageV2Like = Extract<
  NonNullable<Awaited<ReturnType<StoredTimeJobAuthorityV2['admit']>>['start']>,
  { type: 'start' }
>

class DeferredCheckpointRepository implements StoredTimeCheckpointRepositoryV2 {
  #record: Readonly<StoredTimeCheckpointRecordV2> | null = null
  #defer = false
  #startedResolve: (() => void) | null = null
  #started = new Promise<void>((resolve) => { this.#startedResolve = resolve })
  #writeResolve: (() => void) | null = null
  #deferredStatus: StoredTimeCheckpointWriteReceiptV2['status'] = 'committed'
  writeCount = 0

  deferNextWrite(): void {
    this.#defer = true
  }

  waitUntilWriteStarted(): Promise<void> {
    return this.#started
  }

  finishDeferredWrite(
    status: StoredTimeCheckpointWriteReceiptV2['status'] = 'committed',
  ): void {
    this.#deferredStatus = status
    this.#writeResolve?.()
  }

  read(_fence: Readonly<StoredTimeWriterFenceV2>): unknown {
    return this.#record === null ? null : structuredClone(this.#record)
  }

  async persist(
    record: Readonly<StoredTimeCheckpointRecordV2>,
    _fence: Readonly<StoredTimeWriterFenceV2>,
  ): Promise<Readonly<StoredTimeCheckpointWriteReceiptV2>> {
    this.writeCount += 1
    if (this.#defer) {
      this.#defer = false
      this.#startedResolve?.()
      await new Promise<void>((resolve) => { this.#writeResolve = resolve })
    }
    if (this.#deferredStatus === 'committed') {
      this.#record = captureCheckpointRecordV2(structuredClone(record))
    }
    const status = this.#deferredStatus
    this.#deferredStatus = 'committed'
    return Object.freeze({ status })
  }
}

class DeferredRecoveryRepository implements StoredTimeCheckpointRepositoryV2 {
  readonly #record: Readonly<StoredTimeCheckpointRecordV2>
  #readResolve: (() => void) | null = null
  readonly #readStarted = new Promise<void>((resolve) => {
    this.#readResolve = resolve
  })
  #finishRead: (() => void) | null = null

  constructor(record: Readonly<StoredTimeCheckpointRecordV2>) {
    this.#record = record
  }

  waitUntilReadStarted(): Promise<void> {
    return this.#readStarted
  }

  finishDeferredRead(): void {
    this.#finishRead?.()
  }

  async read(): Promise<unknown> {
    this.#readResolve?.()
    await new Promise<void>((resolve) => { this.#finishRead = resolve })
    return this.#record
  }

  persist(): Readonly<StoredTimeCheckpointWriteReceiptV2> {
    return Object.freeze({ status: 'definite-failure' })
  }
}

class AuthorityIntegrationHostV2 implements StoredTimeWorkerEngineHostV2 {
  readonly messages: Readonly<StoredTimeWorkerMessageV2>[] = []
  readonly tasks: (() => void)[] = []
  now = 0

  readonly nowMilliseconds = () => this.now
  readonly schedule = (task: () => void) => this.tasks.push(task)
  readonly postMessage = (message: Readonly<StoredTimeWorkerMessageV2>) => {
    this.messages.push(message)
  }

  async runUntilMessage<TType extends StoredTimeWorkerMessageV2['type']>(
    type: TType,
    firstAdvanceMilliseconds = 1,
  ): Promise<void> {
    return this.runUntilMessageCount(type, 1, firstAdvanceMilliseconds)
  }

  async runUntilMessageCount<TType extends StoredTimeWorkerMessageV2['type']>(
    type: TType,
    count: number,
    firstAdvanceMilliseconds = 1,
  ): Promise<void> {
    // A scheduled engine step can remain in flight while it hashes a proposal.
    // An empty host task queue therefore does not prove that no message can be
    // produced. In particular, slower CI crypto workers can legitimately take
    // more than an arbitrary number of setImmediate turns to finish. Bound the
    // integration wait by elapsed time instead, just like the complete-driver
    // helper below, while continuing to drain every deterministic host task.
    const deadline = performance.now() + 10_000
    for (let pass = 0; pass < 20_000; pass += 1) {
      if (this.messages.filter((message) => message.type === type).length >= count) return
      const task = this.tasks.shift()
      if (task === undefined) {
        if (performance.now() >= deadline) {
          throw new Error(
            `Worker did not produce ${type} before the asynchronous deadline: ${JSON.stringify(this.messages)}`,
          )
        }
        await waitImmediate()
        continue
      }
      this.now += pass === 0 ? firstAdvanceMilliseconds : 1
      task()
      await waitImmediate()
      await waitImmediate()
    }
    throw new Error(`Worker did not produce ${type} within the task bound.`)
  }

  lastMessage<TType extends StoredTimeWorkerMessageV2['type']>(
    type: TType,
  ): Extract<Readonly<StoredTimeWorkerMessageV2>, { type: TType }> {
    const message = this.messages.findLast((entry) => entry.type === type)
    if (message === undefined) throw new Error(`Worker did not emit ${type}.`)
    return message as Extract<Readonly<StoredTimeWorkerMessageV2>, { type: TType }>
  }
}

async function driveToCompletedThroughAuthorityV2(
  authority: StoredTimeJobAuthorityV2,
  start: Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>,
  beforeAuthorityCommit?: (
    request: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'authority-request' }>,
  ) => Promise<void>,
): Promise<Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'completed' }>> {
  const host = new AuthorityIntegrationHostV2()
  const engine = new StoredTimeWorkerEngineV2(host)
  engine.accept(start)
  let inspected = 0
  const deadline = performance.now() + 60_000
  while (performance.now() < deadline) {
    const task = host.tasks.shift()
    if (task === undefined) await waitImmediate()
    else { host.now += 1; task(); await waitImmediate() }
    while (inspected < host.messages.length) {
      const message = host.messages[inspected++]!
      if (message.type === 'checkpoint-candidate' || message.type === 'authority-request') {
        const committed = await authority.commitCandidate(message)
        if (committed.status !== 'committed' || committed.acknowledgement === null) {
          throw new Error(`${committed.error ?? committed.status} (${message.type === 'authority-request' ? message.phase : message.type}, sequence ${message.checkpointSequence}, processed ${message.accounting.cumulativeProcessedSeconds})`)
        }
        if (message.type === 'authority-request') {
          await beforeAuthorityCommit?.(message)
        }
        engine.accept(committed.acknowledgement)
      } else if (message.type === 'completed') return message
      else if (message.type === 'failed') {
        throw new Error(`Quantum authority worker failed: ${message.diagnosticCode}:${engine.snapshot().diagnostic}`)
      }
    }
  }
  throw new Error('Quantum authority worker did not complete within its deadline.')
}

async function driveExistingEngineToCompletedThroughAuthorityV2(
  authority: StoredTimeJobAuthorityV2,
  engine: StoredTimeWorkerEngineV2,
  host: AuthorityIntegrationHostV2,
  inspectedStart: number,
): Promise<Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'completed' }>> {
  let inspected = inspectedStart
  const deadline = performance.now() + 60_000
  while (performance.now() < deadline) {
    const task = host.tasks.shift()
    if (task === undefined) await waitImmediate()
    else { host.now += 1; task(); await waitImmediate() }
    while (inspected < host.messages.length) {
      const message = host.messages[inspected++]!
      if (message.type === 'checkpoint-candidate' || message.type === 'authority-request') {
        const committed = await authority.commitCandidate(message)
        if (committed.status !== 'committed' || committed.acknowledgement === null) {
          throw new Error(committed.error ?? committed.status)
        }
        engine.accept(committed.acknowledgement)
      } else if (message.type === 'completed') return message
      else if (message.type === 'failed') {
        throw new Error(`Transient grant worker failed: ${message.diagnosticCode}`)
      }
    }
  }
  throw new Error('Transient grant worker did not complete within its deadline.')
}

async function expectOutstandingTransientPreRejectsDurableCandidatesV2(
  authority: StoredTimeJobAuthorityV2,
  request: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'authority-request' }>,
): Promise<void> {
  const { phase: _phase, ...base } = request
  void _phase
  const checkpoint = captureStoredTimeWorkerMessageV2(Object.freeze({
    ...base,
    type: 'checkpoint-candidate' as const,
    checkpointSequence: request.checkpointSequence + 1,
    sealedRemainingDurationSeconds: 0,
  }))
  const completion = captureStoredTimeWorkerMessageV2(Object.freeze({
    ...base,
    type: 'completed' as const,
    completion: 'exact' as const,
    checkpointSequence: request.checkpointSequence + 1,
  }))
  for (const candidate of [checkpoint, completion] as const) {
    const rejected = await authority.commitCandidate(candidate)
    expect(rejected.status).toBe('rejected')
    expect(rejected.error).toMatch(/outstanding transient PRE/u)
  }
}
