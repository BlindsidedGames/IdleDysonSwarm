import { setImmediate as waitImmediate } from 'node:timers/promises'
import { describe, expect, test } from 'vitest'

import schema12Web from '../../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../../game-state/typesV2'
import {
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
} from '../../math/gameDecimal'
import { PreparedSave } from '../../save/prepare'
import { deserializeWebSave } from '../../save/serialization'
import { planStoredTimePolicyV2 } from '../../simulation/storedTimePolicyV2'
import {
  captureStoredTimeWorkerMainMessageV2,
  captureStoredTimeWorkerMessageV2,
  STORED_TIME_DREAM_REPLAY_LIMIT_V2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
} from './workerProtocolV2'
import { CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2 } from './workerEngineBoundaryV2'
import {
  decodeStoredTimeWorkerPublicationV2,
  encodeStoredTimeWorkerPublicationV2,
} from './workerWireV2'
import {
  STORED_TIME_FAST_DISCLOSURE_CODE_V2,
  STORED_TIME_FAST_DISCLOSURE_TEXT_V2,
  StoredTimeWorkerEngineV2,
  type StoredTimeWorkerEngineHostV2,
} from './storedTimeWorkerEngineV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const HASH = 'a'.repeat(64)

class TestHostV2 implements StoredTimeWorkerEngineHostV2 {
  readonly messages: Readonly<StoredTimeWorkerMessageV2>[] = []
  readonly tasks: (() => void)[] = []
  now = 0

  readonly nowMilliseconds = () => this.now
  readonly schedule = (task: () => void) => {
    this.tasks.push(task)
  }
  readonly postMessage = (message: Readonly<StoredTimeWorkerMessageV2>) => {
    this.messages.push(message)
  }

  async runOne(advanceMilliseconds = 1): Promise<void> {
    const task = this.tasks.shift()
    if (task === undefined) throw new Error('No worker task is scheduled.')
    this.now += advanceMilliseconds
    task()
    await Promise.resolve()
  }

  async drain(
    expectedType: StoredTimeWorkerMessageV2['type'] = 'completed',
    maximumTasks = 20_000,
    timeoutMilliseconds = 10_000,
  ): Promise<void> {
    const deadline = performance.now() + timeoutMilliseconds
    let tasksRun = 0
    while (!this.messages.some((message) => message.type === expectedType)) {
      if (performance.now() >= deadline) {
        throw new Error(
          `Timed out waiting for ${expectedType}; saw ${
            this.messages.map((message) => message.type).join(',') || 'nothing'
          } with ${this.tasks.length} tasks queued.`,
        )
      }
      if (this.tasks.length > 0) {
        if (tasksRun >= maximumTasks) {
          throw new Error('Worker task drain exceeded its bound.')
        }
        tasksRun += 1
        await this.runOne()
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }
  }
}

describe('Stage 4D dormant Stored Time worker engine', { timeout: 120_000 }, () => {
  test('runs every policy through the exact-small raw scheduler path', async () => {
    for (const policyId of [
      'stored-time-fast-v1',
      'stored-time-balanced-v1',
      'stored-time-exact-v1',
    ] as const) {
      const host = new TestHostV2()
      const engine = new StoredTimeWorkerEngineV2(host)
      engine.accept(startMessage({ policyId, duration: 0.3 }))
      await host.drain()

      const completed = onlyCompleted(host.messages)
      expect(completed.completion).toBe('exact-small')
      expect(completed.accounting.cumulativeProcessedSeconds).toBe(0.3)
      expect(completed.accounting.cumulativeRawAutomationTicks).toBe('3')
      expect(completed.schedulerSummary.automationTicks).toBe('3')
      expect(completed.schedulerSummary.boundaryDigest).toMatch(/^[a-f0-9]{16}$/u)
      expect(completed.progress.durableSeconds).toBe(0)
    }
  })

  test('honours an initial due-now boundary exactly before positive time', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    const start = startMessage({ duration: 0.2, horizon: 0 })
    const origin = decodeStoredTimeWorkerPublicationV2(start.publication)
    engine.accept(start)
    await host.drain()

    expect(host.messages.at(-1)).toMatchObject({ type: 'completed' })
    const completed = onlyCompleted(host.messages)
    const publication = decodeStoredTimeWorkerPublicationV2(completed.publication)
    expect(completed.completion).toBe('exact-small')
    expect(completed.accounting.cumulativeRawAutomationTicks).toBe('3')
    expect(publication.state.timeline.dysonAutomationTargetIndex).toBe(
      (origin.state.timeline.dysonAutomationTargetIndex + 3) % 8,
    )
  })

  test('checkpoint acknowledgement resumes one opaque exact seal byte-identically', async () => {
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    const start = startMessage({ duration: 1.2 })
    uninterrupted.accept(start)
    await uninterruptedHost.drain()
    const expected = onlyCompleted(uninterruptedHost.messages)

    const checkpointHost = new TestHostV2()
    const checkpointed = new StoredTimeWorkerEngineV2(checkpointHost)
    checkpointed.accept(start)
    await checkpointHost.runOne(6_000)
    while (
      checkpointHost.tasks.length > 0 &&
      !checkpointHost.messages.some((message) =>
        message.type === 'checkpoint-candidate'
      )
    ) await checkpointHost.runOne()
    await waitForWorkerMessageV2(checkpointHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(checkpointHost.messages)
    expect(candidate.accounting.cumulativeRawAutomationTicks).toBe('8')
    expect(candidate.schedulerSummary.materialEvents).toBe(8)
    checkpointed.accept(acknowledgement(candidate))
    await checkpointHost.drain()
    if (!checkpointHost.messages.some((message) => message.type === 'completed')) {
      throw new Error(`Checkpoint resume failed: ${checkpointed.snapshot().diagnostic}`)
    }
    const actual = onlyCompleted(checkpointHost.messages)

    expect(actual.checkpointSequence).toBe(2)
    expect(actual.acknowledgedBaseRevision).toBe(start.acknowledgedBaseRevision + 1)
    expect(JSON.stringify(actual.publication)).toBe(JSON.stringify(expected.publication))
    expect(actual.accounting.cumulativeProcessedSeconds).toBe(1.2)
    expect(actual.schedulerSummary.automationTicks).toBe('12')
  })

  test('checkpoints and reloads across an authenticated Infinity reset without replay', async () => {
    const start = startMessage({
      duration: 1.2,
      horizon: 0.1,
      interval: 0.1,
      storedAvailable: 2,
      bots: 4.2e19,
      infinityCycleSeconds: 1,
      infinityBoundaryRemaining: 0.1,
      permanentDoubleIp: true,
    })
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    uninterrupted.accept(start)
    await driveWorkerThroughCheckpointsV2(uninterrupted, uninterruptedHost)
    const expected = onlyCompleted(uninterruptedHost.messages)
    expect(expected.accounting.cumulativeInfinityResetCount).toBe('1')
    expect(expected.accounting.lastInfinityResetElapsedSeconds).toBe(0.1)

    const checkpointHost = new TestHostV2()
    const checkpointed = new StoredTimeWorkerEngineV2(checkpointHost)
    checkpointed.accept(start)
    await checkpointHost.runOne(6_000)
    let grantedAuthorities = 0
    const checkpointDeadline = performance.now() + 10_000
    while (!checkpointHost.messages.some((message) =>
      message.type === 'checkpoint-candidate'
    )) {
      if (performance.now() >= checkpointDeadline) {
        throw new Error(`Infinity checkpoint did not quiesce; messages=${checkpointHost.messages.map((message)=>message.type).join(',')}; snapshot=${JSON.stringify(checkpointed.snapshot())}.`)
      }
      if (checkpointHost.tasks.length > 0) await checkpointHost.runOne()
      else await new Promise((resolve) => setTimeout(resolve, 1))
      const requests = checkpointHost.messages.filter(
        (message) => message.type === 'authority-request',
      )
      while (grantedAuthorities < requests.length) {
        checkpointed.accept(authorityGrant(requests[grantedAuthorities]!))
        grantedAuthorities += 1
      }
    }
    await waitForWorkerMessageV2(checkpointHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(checkpointHost.messages)
    expect(candidate.accounting.cumulativeInfinityResetCount).toBe('1')
    checkpointed.accept(acknowledgement(candidate))

    const recoveredHost = new TestHostV2()
    const recovered = new StoredTimeWorkerEngineV2(recoveredHost)
    recovered.accept(restartedStart(start, candidate))
    await driveWorkerThroughCheckpointsV2(recovered, recoveredHost)
    const actual = onlyCompleted(recoveredHost.messages)
    expect(actual.accounting).toEqual(expected.accounting)
    expect(actual.schedulerSummary).toEqual(expected.schedulerSummary)
    expect(JSON.stringify(authorityNormalizedPublicationV2(start, actual)))
      .toBe(JSON.stringify(authorityNormalizedPublicationV2(start, expected)))
    const finalState = decodeStoredTimeWorkerPublicationV2(actual.publication).state
    const initialState = decodeStoredTimeWorkerPublicationV2(start.publication).state
    expect(gameDecimalToCanonicalString(finalState.infinity.availablePoints))
      .toBe(gameDecimalToCanonicalString(gameDecimalFromNumber(2)))
    expect(gameDecimalToCanonicalString(initialState.infinity.availablePoints))
      .toBe('0')
  })

  test('closes transient Infinity wire messages and terminalizes pending controls durably', async () => {
    const start = startMessage({
      duration: 1.2,
      horizon: 0.1,
      interval: 0.1,
      storedAvailable: 2,
      bots: 4.2e19,
      infinityCycleSeconds: 1,
      infinityBoundaryRemaining: 0.1,
      permanentDoubleIp: true,
    })
    for (const control of ['cancel', 'lifecycle-pause'] as const) {
      const host = new TestHostV2()
      const engine = new StoredTimeWorkerEngineV2(host)
      engine.accept(start)
      while (!host.messages.some((message) => message.type === 'authority-request')) {
        if (host.tasks.length > 0) await host.runOne()
        else await new Promise((resolve) => setTimeout(resolve, 1))
      }
      const request = host.messages.find(
        (message) => message.type === 'authority-request',
      )!
      expect(captureStoredTimeWorkerMessageV2(structuredClone(request))).toEqual(request)
      expect(() => captureStoredTimeWorkerMessageV2({ ...request, extra: true }))
        .toThrow(/exactly its declared fields/u)
      expect(() => captureStoredTimeWorkerMessageV2({ ...request, phase: 'forged' }))
        .toThrow(/phase/u)
      let gets = 0
      const hostile = Object.defineProperty({ ...request }, 'publication', {
        enumerable: true,
        get() { gets += 1; return request.publication },
      })
      expect(() => captureStoredTimeWorkerMessageV2(hostile)).toThrow(/data properties/u)
      expect(gets).toBe(0)
      const grant = authorityGrant(request)
      expect(() => captureStoredTimeWorkerMainMessageV2({
        ...grant,
        expectedPostHash: null,
      })).toThrow(/expectedPostHash/u)
      expect(() => captureStoredTimeWorkerMainMessageV2({
        ...grant,
        expectedPostHash: 'a'.repeat(64),
        extra: true,
      })).toThrow(/exactly its declared fields/u)

      engine.accept(controlMessage(start, control))
      const terminal = host.messages.at(-1)
      expect(terminal?.type).toBe(control === 'cancel' ? 'cancelled' : 'paused')
      expect(terminal).toMatchObject({
        progress: { computedSeconds: 0, durableSeconds: 0 },
      })
      expect(engine.snapshot().active).toBe(false)
    }
  })

  test('checkpoints and reloads across one authentic Dream reset without replay', async () => {
    const start = startMessage({
      duration: 1.2,
      horizon: 0.1,
      dreamResetReady: true,
      zeroProduction: true,
      goalStage: 10,
    })
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    uninterrupted.accept(start)
    await driveWorkerThroughCheckpointsV2(uninterrupted, uninterruptedHost)
    const expected = onlyCompleted(uninterruptedHost.messages)
    const expectedPublication = decodeStoredTimeWorkerPublicationV2(
      expected.publication,
    )
    expect(expectedPublication.state.dream.resetCount)
      .toBe(migrated.state.dream.resetCount + 1n)

    const firstHost = new TestHostV2()
    const first = new StoredTimeWorkerEngineV2(firstHost)
    first.accept(start)
    await firstHost.runOne(6_000)
    while (
      firstHost.tasks.length > 0 &&
      !firstHost.messages.some((message) => message.type === 'checkpoint-candidate')
    ) await firstHost.runOne()
    await waitForWorkerMessageV2(firstHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(firstHost.messages)
    const checkpointPublication = decodeStoredTimeWorkerPublicationV2(
      candidate.publication,
    )
    expect(checkpointPublication.state.dream.resetCount)
      .toBe(migrated.state.dream.resetCount + 1n)

    const restartedHost = new TestHostV2()
    const restarted = new StoredTimeWorkerEngineV2(restartedHost)
    restarted.accept(restartedStart(start, candidate))
    await restartedHost.drain()
    const actual = onlyCompleted(restartedHost.messages)
    expect(JSON.stringify(authorityNormalizedPublicationV2(start, actual)))
      .toBe(JSON.stringify(authorityNormalizedPublicationV2(start, expected)))
    expect(decodeStoredTimeWorkerPublicationV2(actual.publication).state.dream.resetCount)
      .toBe(migrated.state.dream.resetCount + 1n)
  })

  test('seals cumulative Dream reset windows and advances the acknowledged baseline', async () => {
    let syntheticTotal = 0n
    const syntheticStep = BigInt(STORED_TIME_DREAM_REPLAY_LIMIT_V2 - 8)
    const boundary = Object.freeze({
      sealLocalContinuation:
        CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2.sealLocalContinuation,
      resumeFromAcknowledgedSeal: (...args: Parameters<
        typeof CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2.resumeFromAcknowledgedSeal
      >) => {
        const result = CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2
          .resumeFromAcknowledgedSeal(...args)
        if (syntheticTotal < syntheticStep * 3n) syntheticTotal += syntheticStep
        const final = result.carrier.state.dream.strangeMatter
        return Object.freeze({
          ...result,
          summary: Object.freeze({
            ...result.summary,
            dreamResetCount: syntheticTotal,
            dreamFastNormalizedResetCount: '0',
            dreamFastNormalizationFirstCycleElapsedSeconds: null,
            dreamFastNormalizationCycleSeconds: null,
            dreamMeteorResetCount: syntheticTotal,
            dreamStrangeMatterRequested: gameDecimalFromNumber(Number(syntheticTotal)),
            dreamStrangeMatterEffective: gameDecimalFromNumber(Number(syntheticTotal)),
            dreamStrangeMatterFinal: final,
            dreamLifetimeStrangeMatterFinal:
              result.carrier.state.statistics.lifetime.strangeMatter,
            dreamCurrentQuantumRunStrangeMatterFinal:
              result.carrier.state.statistics.currentQuantumRun.strangeMatter,
            dreamRecentProcessedSegmentStrangeMatterFinal:
              result.carrier.state.statistics.recentProcessedSegment.strangeMatter,
          }),
        })
      },
    })
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host, boundary)
    engine.accept(startMessage({ duration: 10 }))
    await host.runOne(6_000)
    let acknowledged = 0
    for (let pass = 0; pass < 20_000; pass += 1) {
      if (host.tasks.length > 0) await host.runOne()
      else await waitImmediate()
      const candidates = host.messages.filter((message) =>
        message.type === 'checkpoint-candidate'
      )
      while (acknowledged < candidates.length) {
        engine.accept(acknowledgement(candidates[acknowledged]!))
        acknowledged += 1
      }
      if (host.messages.some((message) => message.type === 'completed')) break
    }
    const positiveCandidates = host.messages.filter((message) =>
      message.type === 'checkpoint-candidate' &&
      BigInt(message.schedulerSummary.dreamResetCount) > 0n
    )
    expect(positiveCandidates.map((message) => message.type === 'checkpoint-candidate'
      ? message.schedulerSummary.dreamResetCount
      : '')).toEqual([
      syntheticStep.toString(),
      (syntheticStep * 2n).toString(),
      (syntheticStep * 3n).toString(),
    ])
    expect(onlyCompleted(host.messages).type).toBe('completed')
    expect(host.messages.filter((message) => message.type === 'checkpoint-candidate'))
      .toHaveLength(4)
  }, 120_000)


  test('rebases a durable queued input across process reload without replay', async () => {
    const origin = startMessage({ duration: 1.2, storedAvailable: 2 })
    const queuedOrigin = captureStoredTimeWorkerMainMessageV2(Object.freeze({
      ...origin,
      restart: Object.freeze({
        originalInitialAutomationHorizonSeconds: 0.1,
        originalInitialAutomationTargetIndex:
          decodeStoredTimeWorkerPublicationV2(origin.publication)
            .state.timeline.dysonAutomationTargetIndex,
        originalRequestedDurationSeconds: 1.2,
        originalRequestedRawAutomationTicks: origin.requestedRawAutomationTicks,
        completedRepresentativeGroups: 0,
        cumulativeAccounting: Object.freeze({
          cumulativeProcessedSeconds: 0,
          cumulativeDoubleTimeConsumedSeconds: 0,
          cumulativeInfinityElapsedSeconds: 0,
          cumulativeInfinityResetCount: '0',
          lastInfinityResetElapsedSeconds: null,
          sealedInfinityCycleSeconds: 0,
          sealedInfinityBoundaryRemaining: 42_000_000,
          cumulativeRawAutomationTicks: '0',
          cumulativeRepresentativeGroups: 0,
          automationTimeUntilNextEvent: 0.1,
        }),
        cumulativeSchedulerSummary: Object.freeze({
          automationTicks: '0',
          analyticallySkippedAutomationTicks: '0',
          storedTimeConsumedSeconds: 0,
          baseSimulationSeconds: 0,
          dreamSimulationSeconds: 0,
          infinityResetCount: '0',
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
      quantumResetCount:'0',quantumEntanglementCount:'0',quantumAvailableShardsEffective:'0',quantumLifetimeShardsEffective:'0',quantumInfinityPointsConsumed:'0',quantumAvailableShardsFinal:null,quantumLifetimeShardsFinal:null,quantumInfinityAvailableFinal:null,quantumInfinityAllocatedFinal:null,quantumResetSkillPointsFinal:null,
          lastInfinityResetElapsedSeconds: null,
          materialEvents: 0,
          zeroTimePasses: 0,
          boundaryDigest: 'cbf29ce484222325',
        }),
        sealedRemainingDurationSeconds: 1.2,
        rebasedQueuedInputs: Object.freeze([Object.freeze({
          id: 'once',
          remainingHorizonSeconds: 0.85,
          commandVersion: 1,
          commandKind: 'dyson-facility-purchase',
          facilityId: 'assembly_lines',
          requestedMode: 'buy-1',
          roundedBulkBuy: false,
        })]),
        priorCandidateHash: HASH,
      }),
    })) as Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>

    const baselineHost = new TestHostV2()
    const baseline = new StoredTimeWorkerEngineV2(baselineHost)
    baseline.accept(queuedOrigin)
    await baselineHost.drain()
    expect(baselineHost.messages.at(-1)?.type === 'failed'
      ? `${baselineHost.messages.at(-1)?.diagnosticCode}:${baseline.snapshot().diagnostic}`
      : 'completed').toBe('completed')
    const expected = onlyCompleted(baselineHost.messages)

    const firstHost = new TestHostV2()
    const first = new StoredTimeWorkerEngineV2(firstHost)
    first.accept(queuedOrigin)
    await firstHost.runOne(6_000)
    await waitForWorkerMessageV2(firstHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(firstHost.messages)
    expect(candidate.rebasedQueuedInputs).toEqual([
      expect.objectContaining({
        id: 'once',
        remainingHorizonSeconds: 0.050000000000000044,
      }),
    ])

    const recoveredHost = new TestHostV2()
    const recovered = new StoredTimeWorkerEngineV2(recoveredHost)
    recovered.accept(restartedStart(origin, candidate))
    await recoveredHost.drain()
    const actual = onlyCompleted(recoveredHost.messages)

    expect(JSON.stringify(authorityNormalizedPublicationV2(origin, actual)))
      .toBe(JSON.stringify(authorityNormalizedPublicationV2(origin, expected)))
    expect(actual.accounting).toEqual(expected.accounting)
    expect(actual.schedulerSummary).toEqual(expected.schedulerSummary)
  })

  test('executes a versioned Quantum action once and seals its exact accounting',async()=>{const seed=startMessage({policyId:'stored-time-exact-v1',duration:.2,horizon:.1,interval:.1,storedAvailable:1,zeroProduction:true}),decoded=decodeStoredTimeWorkerPublicationV2(seed.publication),state=cloneCanonicalGameStateV2({...decoded.state,infinity:{...decoded.state.infinity,availablePoints:gameDecimalFromNumber(84),allocatedPoints:gameDecimalFromNumber(0)},quantum:{...decoded.state.quantum,availableShards:gameDecimalFromNumber(1),lifetimeEarnedShards:gameDecimalFromNumber(1),unlocks:{...decoded.state.quantum.unlocks,quantumEntanglement:true}}}),start=captureStoredTimeWorkerMainMessageV2(Object.freeze({...seed,queuedInputs:Object.freeze([Object.freeze({id:'entangle-once',remainingHorizonSeconds:.05,commandVersion:1 as const,commandKind:'quantum-action' as const})]),publication:encodeStoredTimeWorkerPublicationV2(Object.freeze({state,runtime:decoded.runtime}))})) as Extract<Readonly<StoredTimeWorkerMainMessageV2>,{type:'start'}>,host=new TestHostV2(),engine=new StoredTimeWorkerEngineV2(host);engine.accept(start);await driveWorkerThroughCheckpointsV2(engine,host);const completed=onlyCompleted(host.messages),publication=decodeStoredTimeWorkerPublicationV2(completed.publication);expect(completed.rebasedQueuedInputs).toEqual([]);expect(completed.schedulerSummary).toMatchObject({quantumResetCount:'0',quantumEntanglementCount:'1',quantumAvailableShardsEffective:'2e0',quantumLifetimeShardsEffective:'2e0',quantumInfinityPointsConsumed:'8.4e1',quantumAvailableShardsFinal:'3e0',quantumLifetimeShardsFinal:'3e0',quantumInfinityAvailableFinal:'0',quantumInfinityAllocatedFinal:'0'});expect(publication.state.quantum.availableShards).toEqual(gameDecimalFromNumber(3))})

  test('hard-splits Fast representative work at a queued Quantum action',async()=>{const seed=startMessage({policyId:'stored-time-fast-v1',duration:410,horizon:.1,interval:.1,storedAvailable:500,zeroProduction:true}),decoded=decodeStoredTimeWorkerPublicationV2(seed.publication),state=cloneCanonicalGameStateV2({...decoded.state,infinity:{...decoded.state.infinity,availablePoints:gameDecimalFromNumber(84),allocatedPoints:gameDecimalFromNumber(0)},quantum:{...decoded.state.quantum,availableShards:gameDecimalFromNumber(1),lifetimeEarnedShards:gameDecimalFromNumber(1),unlocks:{...decoded.state.quantum.unlocks,quantumEntanglement:true}}}),start=captureStoredTimeWorkerMainMessageV2(Object.freeze({...seed,queuedInputs:Object.freeze([Object.freeze({id:'fast-entangle-once',remainingHorizonSeconds:.05,commandVersion:1 as const,commandKind:'quantum-action' as const})]),publication:encodeStoredTimeWorkerPublicationV2(Object.freeze({state,runtime:decoded.runtime}))})) as Extract<Readonly<StoredTimeWorkerMainMessageV2>,{type:'start'}>,host=new TestHostV2(),engine=new StoredTimeWorkerEngineV2(host);engine.accept(start);await driveWorkerThroughCheckpointsV2(engine,host);const completed=onlyCompleted(host.messages),publication=decodeStoredTimeWorkerPublicationV2(completed.publication);expect(completed.completion).toBe('fast');expect(completed.rebasedQueuedInputs).toEqual([]);expect(completed.schedulerSummary.quantumEntanglementCount).toBe('1');expect(publication.state.quantum.availableShards).toEqual(gameDecimalFromNumber(3))},120_000)

  test('pauses Fast at its durable base instead of handshaking an unnormalized Infinity reset', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    engine.accept(startMessage({
      policyId: 'stored-time-fast-v1',
      duration: 410,
      horizon: 0.1,
      interval: 0.1,
      storedAvailable: 500,
      zeroProduction: true,
      bots: 4.2e19,
      infinityCycleSeconds: 1,
      infinityBoundaryRemaining: 0.1,
      permanentDoubleIp: true,
    }))
    await host.drain('paused')
    expect(host.messages.some((message) => message.type === 'authority-request')).toBe(false)
    expect(host.messages.at(-1)).toMatchObject({
      type: 'paused',
      reason: 'fast-normalization-proof-failed',
      progress: {
        durableSeconds: 0,
        durableRawTicks: '0',
      },
    })
  })

  test('computes recovered ETA throughput from this worker session only', async () => {
    const origin = startMessage({ duration: 1.2 })
    const firstHost = new TestHostV2()
    const first = new StoredTimeWorkerEngineV2(firstHost)
    first.accept(origin)
    await firstHost.runOne(6_000)
    await waitForWorkerMessageV2(firstHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(firstHost.messages)
    expect(candidate.accounting.cumulativeRawAutomationTicks).toBe('8')

    const recoveredHost = new TestHostV2()
    const recovered = new StoredTimeWorkerEngineV2(recoveredHost)
    recovered.accept(restartedStart(origin, candidate))
    await recoveredHost.runOne(1_000)
    await waitForWorkerMessageV2(recoveredHost.messages, 'completed')
    const completed = onlyCompleted(recoveredHost.messages)

    expect(completed.progress.computedRawTicks).toBe('12')
    expect(completed.progress.elapsedWallMilliseconds).toBe(1_000)
    expect(completed.progress.throughputTicksPerSecond).toBe(4)
  })

  test('cancels unsealed work without a candidate and pauses only after acknowledged seal', async () => {
    const cancelHost = new TestHostV2()
    const cancelling = new StoredTimeWorkerEngineV2(cancelHost)
    const start = startMessage({ duration: 3 })
    cancelling.accept(start)
    cancelling.accept(controlMessage(start, 'cancel'))
    await cancelHost.drain('cancelled')
    expect(cancelHost.messages.some((message) => message.type === 'checkpoint-candidate'))
      .toBe(false)
    expect(cancelHost.messages.at(-1)?.type).toBe('cancelled')
    expect(cancelHost.messages.at(-1)).toMatchObject({
      progress: {
        computedSeconds: 0,
        durableSeconds: 0,
        computedRawTicks: '0',
        durableRawTicks: '0',
        representativeGroups: 0,
      },
    })

    const pauseHost = new TestHostV2()
    const pausing = new StoredTimeWorkerEngineV2(pauseHost)
    const changingStart = startMessage({ duration: 1.2 })
    pausing.accept(changingStart)
    expect(pauseHost.messages).toEqual([])
    pausing.accept(controlMessage(changingStart, 'lifecycle-pause'))
    await pauseHost.runOne()
    await waitForWorkerMessageV2(pauseHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(pauseHost.messages)
    expect(pauseHost.messages.at(-1)?.type).toBe('checkpoint-candidate')
    pausing.accept(acknowledgement(candidate))
    await waitForWorkerMessageV2(pauseHost.messages, 'paused')
    expect(pauseHost.messages.at(-1)).toMatchObject({
      type: 'paused',
      reason: 'lifecycle',
    })
  })

  test('backpressures a completed candidate until its authoritative acknowledgement', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    const start = startMessage({ duration: 0.2 })
    engine.accept(start)
    await host.drain()
    const completed = onlyCompleted(host.messages)
    expect(engine.snapshot().active).toBe(true)

    engine.accept(controlMessage(start, 'cancel'))
    expect(engine.snapshot().active).toBe(true)
    const acknowledgement = completionAcknowledgement(completed)
    engine.accept(Object.freeze({
      ...acknowledgement,
      proposalHashEcho: HASH,
    }))
    expect(engine.snapshot().active).toBe(true)
    engine.accept(acknowledgement)
    expect(engine.snapshot().active).toBe(false)
    expect(host.messages.some((message) => message.type === 'cancelled')).toBe(false)
  })

  test('enforces Balanced wall budget after an indivisible event and throttles progress', async () => {
    const balancedHost = new TestHostV2()
    const balanced = new StoredTimeWorkerEngineV2(balancedHost)
    const start = startMessage({
      policyId: 'stored-time-balanced-v1',
      duration: 3,
    })
    balanced.accept(start)
    await balancedHost.runOne(60_000)
    await waitForWorkerMessageV2(balancedHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(balancedHost.messages)
    balanced.accept(acknowledgement(candidate))
    await waitForWorkerMessageV2(balancedHost.messages, 'paused')
    expect(balancedHost.messages.at(-1)).toMatchObject({
      type: 'paused',
      reason: 'balanced-wall-limit',
    })

    const progressHost = new TestHostV2()
    const exact = new StoredTimeWorkerEngineV2(progressHost)
    exact.accept(startMessage({ duration: 5 }))
    while (progressHost.tasks.length > 0) await progressHost.runOne(100)
    const samples = progressHost.messages
      .filter((message) => message.type === 'progress')
      .map((message) => message.progress.elapsedWallMilliseconds)
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index] - samples[index - 1]).toBeGreaterThanOrEqual(250)
    }
  })

  test('measures after each atomic event and yields when the 40ms chunk budget wins', async () => {
    const tasks: (() => void)[] = []
    const messages: Readonly<StoredTimeWorkerMessageV2>[] = []
    let clock = 0
    const engine = new StoredTimeWorkerEngineV2(Object.freeze({
      nowMilliseconds: () => {
        clock += 25
        return clock
      },
      schedule: (task: () => void) => tasks.push(task),
      postMessage: (message: Readonly<StoredTimeWorkerMessageV2>) => {
        messages.push(message)
      },
    }))
    engine.accept(startMessage({ duration: 3 }))
    tasks.shift()!()
    await waitForConditionV2(() => tasks.length === 1, 'next worker task')

    expect(tasks).toHaveLength(1)
    expect(engine.snapshot().maximumObservedAtomicEventMilliseconds).toBe(25)
    expect(engine.snapshot().maximumObservedChunkMilliseconds).toBe(50)
    expect(messages).toEqual([])
  })

  test('fails closed when one indivisible material event reaches 40ms', async () => {
    const tasks: (() => void)[] = []
    const messages: Readonly<StoredTimeWorkerMessageV2>[] = []
    let clock = 0
    const engine = new StoredTimeWorkerEngineV2(Object.freeze({
      nowMilliseconds: () => {
        clock += 40
        return clock
      },
      schedule: (task: () => void) => tasks.push(task),
      postMessage: (message: Readonly<StoredTimeWorkerMessageV2>) => {
        messages.push(message)
      },
    }))
    engine.accept(startMessage({ duration: 3 }))
    tasks.shift()!()
    await waitForWorkerMessageV2(messages, 'failed')

    expect(messages).toEqual([
      expect.objectContaining({
        type: 'failed',
        code: 'budget-exceeded',
        retryable: true,
      }),
    ])
    expect(engine.snapshot().maximumObservedAtomicEventMilliseconds).toBe(40)
  })

  test('rejects stale controls and lets cancel win while proposal hashing is in flight', async () => {
    const staleHost = new TestHostV2()
    const staleEngine = new StoredTimeWorkerEngineV2(staleHost)
    const staleStart = startMessage({ duration: 0.3 })
    staleEngine.accept(staleStart)
    staleEngine.accept(Object.freeze({
      ...controlMessage(staleStart, 'cancel'),
      acknowledgedBaseRevision: staleStart.acknowledgedBaseRevision + 1,
    }))
    await staleHost.drain()
    expect(staleHost.messages.at(-1)?.type).toBe('completed')

    const racingHost = new TestHostV2()
    const racingEngine = new StoredTimeWorkerEngineV2(racingHost)
    const racingStart = startMessage({ duration: 3 })
    racingEngine.accept(racingStart)
    racingHost.now = 6_000
    racingHost.tasks.shift()!()
    racingEngine.accept(controlMessage(racingStart, 'cancel'))
    await waitForWorkerMessageV2(racingHost.messages, 'cancelled')
    expect(racingHost.messages.some((message) =>
      message.type === 'checkpoint-candidate'
    )).toBe(false)
    expect(racingHost.messages.at(-1)?.type).toBe('cancelled')
  })

  test('releases a nonpending cancelled job synchronously for immediate worker reuse', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    const first = startMessage({ duration: 3 })
    engine.accept(first)
    engine.accept(controlMessage(first, 'cancel'))
    const second = captureStoredTimeWorkerMainMessageV2(Object.freeze({
      ...startMessage({ duration: 0.2 }),
      jobId: 'job-b',
    })) as Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>
    engine.accept(second)
    await host.drain()

    expect(host.messages.filter((message) => message.type === 'cancelled'))
      .toHaveLength(1)
    expect(onlyCompleted(host.messages).jobId).toBe('job-b')
  })

  test('executes a long tiny-interval Fast bank through 4096 Decimal-anchored groups', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    const duration = 12_345_678.901234567
    const start = startMessage({
      policyId: 'stored-time-fast-v1',
      duration,
      horizon: 1e-12,
      interval: 1e-12,
      storedAvailable: duration,
    })
    engine.accept(start)
    expect(engine.snapshot().disclosureCode).toBe(
      STORED_TIME_FAST_DISCLOSURE_CODE_V2,
    )
    let acknowledgedCandidates = 0
    for (let pass = 0; pass < 20_000; pass += 1) {
      if (host.tasks.length > 0) await host.runOne()
      else await new Promise((resolve) => setTimeout(resolve, 25))
      const candidates = host.messages.filter((message) =>
        message.type === 'checkpoint-candidate'
      )
      while (acknowledgedCandidates < candidates.length) {
        engine.accept(acknowledgement(candidates[acknowledgedCandidates]))
        acknowledgedCandidates += 1
      }
      const failed = host.messages.find((message) => message.type === 'failed')
      if (failed !== undefined) {
        throw new Error(
          `Stored Time worker failed: ${failed.code}/${failed.diagnosticCode}/${engine.snapshot().diagnostic}`,
        )
      }
      if (host.messages.some((message) => message.type === 'completed')) break
    }

    expect(host.messages.at(-1)).toMatchObject({ type: 'completed' })
    const completed = onlyCompleted(host.messages)
    expect(completed.completion).toBe('fast')
    expect(completed.accounting.cumulativeProcessedSeconds).toBe(duration)
    expect(completed.accounting.cumulativeRawAutomationTicks).toBe(
      start.requestedRawAutomationTicks,
    )
    expect(completed.accounting.cumulativeRepresentativeGroups).toBe(4_096)
    expect(completed.schedulerSummary.automationTicks).toBe(
      start.requestedRawAutomationTicks,
    )
    expect(BigInt(completed.schedulerSummary.analyticallySkippedAutomationTicks))
      .toBe(BigInt(start.requestedRawAutomationTicks) - 4_096n)
    expect(completed.accounting.automationTimeUntilNextEvent).toBeGreaterThan(0)
    expect(STORED_TIME_FAST_DISCLOSURE_TEXT_V2).toContain(
      'Results may differ from Exact',
    )
  })

  test('normalizes an authentic stable Dream recurrence and preserves restart bytes', async () => {
    const start = startMessage({
      policyId: 'stored-time-fast-v1',
      duration: 12_345,
      storedAvailable: 12_345,
      doubleBank: 20_000,
      zeroProduction: true,
      stableDreamRecurrence: true,
      doubleEnabled: true,
    })
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    uninterrupted.accept(start)
    await driveWorkerThroughCheckpointsV2(uninterrupted, uninterruptedHost)
    const expected = onlyCompleted(uninterruptedHost.messages)
    expect(BigInt(expected.schedulerSummary.dreamFastNormalizedResetCount))
      .toBe(113n)

    const checkpointHost = new TestHostV2()
    const checkpointed = new StoredTimeWorkerEngineV2(checkpointHost)
    checkpointed.accept(start)
    await checkpointHost.runOne(6_000)
    await waitForWorkerMessageV2(checkpointHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(checkpointHost.messages)
    const recoveredHost = new TestHostV2()
    const recovered = new StoredTimeWorkerEngineV2(recoveredHost)
    recovered.accept(restartedStart(start, candidate))
    await driveWorkerThroughCheckpointsV2(recovered, recoveredHost)
    const actual = onlyCompleted(recoveredHost.messages)
    expect(JSON.stringify(authorityNormalizedPublicationV2(start, actual)))
      .toBe(JSON.stringify(authorityNormalizedPublicationV2(start, expected)))
    expect(actual.schedulerSummary).toEqual(expected.schedulerSummary)
    expect(actual.accounting).toEqual(expected.accounting)
  }, 120_000)

  test('keeps Fast output exact across an authoritative group-boundary checkpoint', async () => {
    const start = startMessage({
      policyId: 'stored-time-fast-v1',
      duration: 410,
      storedAvailable: 500,
      activeSkillTimers: true,
      activeSkillTimerSeconds: 12,
      zeroProduction: true,
    })
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    uninterrupted.accept(start)
    await uninterruptedHost.drain()
    await waitForWorkerMessageV2(uninterruptedHost.messages, 'completed')
    expect(uninterruptedHost.messages.at(-1)?.type === 'failed'
      ? `${uninterruptedHost.messages.at(-1).code}:${uninterrupted.snapshot().diagnostic}`
      : 'completed').toBe('completed')
    const expected = onlyCompleted(uninterruptedHost.messages)

    const checkpointHost = new TestHostV2()
    const checkpointed = new StoredTimeWorkerEngineV2(checkpointHost)
    checkpointed.accept(start)
    await checkpointHost.runOne(6_000)
    while (
      checkpointHost.tasks.length > 0 &&
      !checkpointHost.messages.some((message) =>
        message.type === 'checkpoint-candidate'
      )
    ) await checkpointHost.runOne()
    await waitForWorkerMessageV2(
      checkpointHost.messages,
      'checkpoint-candidate',
    )
    const candidate = onlyCandidate(checkpointHost.messages)
    expect(candidate.accounting.cumulativeRepresentativeGroups).toBe(1)
    checkpointed.accept(acknowledgement(candidate))
    await checkpointHost.drain()
    await waitForWorkerMessageV2(checkpointHost.messages, 'completed')
    const actual = onlyCompleted(checkpointHost.messages)

    expect(JSON.stringify(actual.publication)).toBe(JSON.stringify(expected.publication))
    expect(actual.accounting).toEqual(expected.accounting)
    expect(actual.schedulerSummary).toEqual(expected.schedulerSummary)
  })

  test('rebuilds a Fast plan from a durable group-boundary restart without replay', async () => {
    const start = startMessage({
      policyId: 'stored-time-fast-v1',
      duration: 410,
      storedAvailable: 500,
      activeSkillTimers: true,
      activeSkillTimerSeconds: 12,
      zeroProduction: true,
    })
    const uninterruptedHost = new TestHostV2()
    const uninterrupted = new StoredTimeWorkerEngineV2(uninterruptedHost)
    uninterrupted.accept(start)
    await uninterruptedHost.drain()
    if (!uninterruptedHost.messages.some((message) => message.type === 'completed')) {
      const failed = uninterruptedHost.messages.at(-1)
      throw new Error(
        `Fast restart baseline failed: ${failed?.type}/${
          failed?.type === 'failed' ? failed.diagnosticCode : 'unknown'}/${
          uninterrupted.snapshot().diagnostic}`,
      )
    }
    const expected = onlyCompleted(uninterruptedHost.messages)

    const firstHost = new TestHostV2()
    const firstProcess = new StoredTimeWorkerEngineV2(firstHost)
    firstProcess.accept(start)
    await firstHost.runOne(6_000)
    while (
      firstHost.tasks.length > 0 &&
      !firstHost.messages.some((message) =>
        message.type === 'checkpoint-candidate'
      )
    ) await firstHost.runOne()
    await waitForWorkerMessageV2(firstHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(firstHost.messages)

    const recoveredHost = new TestHostV2()
    const recovered = new StoredTimeWorkerEngineV2(recoveredHost)
    recovered.accept(restartedStart(start, candidate))
    await recoveredHost.drain()
    const actual = onlyCompleted(recoveredHost.messages)

    const actualPublication = authorityNormalizedPublicationV2(start, actual)
    const expectedPublication = authorityNormalizedPublicationV2(start, expected)
    expect(firstCanonicalDifference(actualPublication, expectedPublication)).toBeNull()
    expect(JSON.stringify(actualPublication)).toBe(JSON.stringify(expectedPublication))
    expect(actual.accounting).toEqual(expected.accounting)
    expect(
      actual.schedulerSummary,
      `checkpoint summary: ${JSON.stringify(candidate.schedulerSummary)}`,
    ).toEqual(expected.schedulerSummary)
    expect(actual.checkpointSequence).toBe(2)
    const reloadedState = decodeStoredTimeWorkerPublicationV2(
      actual.publication,
    ).state
    const uninterruptedState = decodeStoredTimeWorkerPublicationV2(
      expected.publication,
    ).state
    for (const id of [
      'androids',
      'pocketAndroids',
      'superRadiantScattering',
    ] as const) {
      expect(reloadedState.skills.byId[id]!.timerSeconds)
        .toBe(uninterruptedState.skills.byId[id]!.timerSeconds)
      expect(reloadedState.skills.byId[id]!.timerSeconds).toBeGreaterThan(12)
    }
  })

  test('fails closed when caller raw-tick evidence disagrees with the plan', async () => {
    const host = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(host)
    const start = startMessage({ duration: 0.3 })
    engine.accept(Object.freeze({
      ...start,
      requestedRawAutomationTicks: '4',
    }))
    await waitForWorkerMessageV2(host.messages, 'failed')
    expect(host.messages).toEqual([
      expect.objectContaining({ type: 'failed', code: 'invalid-message' }),
    ])
  })

  test('reports recovered durable counters when restart semantics fail', async () => {
    const origin = startMessage({ duration: 1.2 })
    const firstHost = new TestHostV2()
    const first = new StoredTimeWorkerEngineV2(firstHost)
    first.accept(origin)
    await firstHost.runOne(6_000)
    await waitForWorkerMessageV2(firstHost.messages, 'checkpoint-candidate')
    const candidate = onlyCandidate(firstHost.messages)
    const recovered = restartedStart(origin, candidate)
    const invalid = captureStoredTimeWorkerMainMessageV2(Object.freeze({
      ...recovered,
      requestedRawAutomationTicks: '4',
      restart: Object.freeze({
        ...recovered.restart!,
        originalRequestedRawAutomationTicks: '4',
      }),
    })) as Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>
    const failedHost = new TestHostV2()
    const engine = new StoredTimeWorkerEngineV2(failedHost)
    engine.accept(invalid)
    await waitForWorkerMessageV2(failedHost.messages, 'failed')

    expect(failedHost.messages).toEqual([
      expect.objectContaining({
        type: 'failed',
        progress: expect.objectContaining({
          computedSeconds: candidate.accounting.cumulativeProcessedSeconds,
          durableSeconds: candidate.accounting.cumulativeProcessedSeconds,
          computedRawTicks: candidate.accounting.cumulativeRawAutomationTicks,
          durableRawTicks: candidate.accounting.cumulativeRawAutomationTicks,
          representativeGroups:
            candidate.accounting.cumulativeRepresentativeGroups,
        }),
      }),
    ])
  })
})

function startMessage(options: Readonly<{
  policyId?: 'stored-time-fast-v1' | 'stored-time-balanced-v1' | 'stored-time-exact-v1'
  duration: number
  horizon?: number
  interval?: number
  storedAvailable?: number
  money?: number
  goalStage?: number
  activeSkillTimers?: boolean
  activeSkillTimerSeconds?: number
  bots?: number
  infinityCycleSeconds?: number
  infinityBoundaryRemaining?: number
  permanentDoubleIp?: boolean
  zeroProduction?: boolean
  dreamResetReady?: boolean
  stableDreamRecurrence?: boolean
  eventClockInitialized?: boolean
  doubleBank?: number
  doubleEnabled?: boolean
}>): Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }> {
  const policyId = options.policyId ?? 'stored-time-exact-v1'
  const interval = options.interval ?? 0.1
  const horizon = options.horizon ?? interval
  const storedAvailable = options.storedAvailable ?? 100
  const timeline = Object.freeze({
    ...migrated.state.timeline,
    storedTimeCapacitySeconds: Math.max(
      migrated.state.timeline.storedTimeCapacitySeconds,
      storedAvailable,
    ),
    storedTimeAvailableSeconds: storedAvailable,
    eventClockInitialized: options.eventClockInitialized ?? true,
    automationTimeUntilNextEvent: horizon,
    infinityCycleSeconds: options.infinityCycleSeconds ?? 0,
    infinityBoundaryRemaining: options.infinityBoundaryRemaining ?? 42_000_000,
    doubleTime: Object.freeze({
      ...migrated.state.timeline.doubleTime,
      unlocked: true,
      enabled: options.doubleEnabled ?? migrated.state.timeline.doubleTime.enabled,
      rate: 1,
      bankSeconds: options.doubleBank ?? 1_000,
    }),
  })
  const zeroFacilities = Object.fromEntries(
    Object.keys(migrated.state.dyson.facilities).map((id) => [
      id,
      Object.freeze([gameDecimalFromNumber(0), gameDecimalFromNumber(0)]),
    ]),
  ) as unknown as CanonicalGameStateV2['dyson']['facilities']
  const state = cloneCanonicalGameStateV2(Object.freeze({
    ...migrated.state,
    skills: options.activeSkillTimers
      ? Object.freeze({
          ...migrated.state.skills,
          byId: Object.freeze({
            ...migrated.state.skills.byId,
            androids: Object.freeze({
              ...migrated.state.skills.byId.androids!,
              owned: true,
              timerSeconds: options.activeSkillTimerSeconds ?? Number.MAX_VALUE,
            }),
            pocketAndroids: Object.freeze({
              ...migrated.state.skills.byId.pocketAndroids!,
              owned: true,
              timerSeconds: options.activeSkillTimerSeconds ?? Number.MAX_VALUE,
            }),
            superRadiantScattering: Object.freeze({
              ...migrated.state.skills.byId.superRadiantScattering!,
              owned: true,
              timerSeconds: options.activeSkillTimerSeconds ?? Number.MAX_VALUE,
            }),
          }),
        })
      : migrated.state.skills,
    dyson: Object.freeze({
      ...migrated.state.dyson,
      money: options.money === undefined
        ? migrated.state.dyson.money
        : gameDecimalFromNumber(options.money),
      bots: options.bots === undefined
        ? options.zeroProduction
          ? gameDecimalFromNumber(0)
          : migrated.state.dyson.bots
        : gameDecimalFromNumber(options.bots),
      workers: options.zeroProduction
        ? gameDecimalFromNumber(0)
        : migrated.state.dyson.workers,
      researchers: options.zeroProduction
        ? gameDecimalFromNumber(0)
        : migrated.state.dyson.researchers,
      science: options.zeroProduction
        ? gameDecimalFromNumber(0)
        : migrated.state.dyson.science,
      facilities: options.zeroProduction
        ? zeroFacilities
        : migrated.state.dyson.facilities,
      goalStage: options.goalStage === undefined
        ? migrated.state.dyson.goalStage
        : BigInt(options.goalStage),
    }),
    dream: options.dreamResetReady || options.stableDreamRecurrence
      ? Object.freeze({
          ...migrated.state.dream,
          disasterStage: 1n,
          upgrades: options.stableDreamRecurrence
            ? Object.freeze({
                ...migrated.state.dream.upgrades,
                hunter1: true,
                gatherer1: true,
              })
            : migrated.state.dream.upgrades,
          resources: Object.freeze({
            ...migrated.state.dream.resources,
            ...(options.stableDreamRecurrence
              ? {
                  housing: gameDecimalFromNumber(10),
                  villages: gameDecimalFromNumber(24),
                  cities: gameDecimalFromNumber(0),
                }
              : { cities: gameDecimalFromNumber(1) }),
          }),
        })
      : migrated.state.dream,
    reality: options.stableDreamRecurrence
      ? Object.freeze({
          ...migrated.state.reality,
          workersReady: 128n,
          autoGather: false,
        })
      : migrated.state.reality,
    timeline,
  }) as CanonicalGameStateV2)
  const plan = planStoredTimePolicyV2(Object.freeze({
    policyId,
    policyVersion: 1,
    requestedDurationSeconds: options.duration,
    initialAutomationHorizonSeconds: horizon,
    automationIntervalSeconds: interval,
    initialAutomationTargetIndex: state.timeline.dysonAutomationTargetIndex,
    hardEvents: Object.freeze([]),
  }))
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type: 'start',
    protocolVersion: 1,
    workerInstanceNonce: 'worker-a',
    jobId: 'job-a',
    originRevision: 7,
    acknowledgedBaseRevision: 7,
    policyId,
    policyVersion: 1,
    checkpointSequence: 0,
    buildId: 'build-a',
    admittedBankSeconds: storedAvailable,
    requestedDurationSeconds: options.duration,
    requestedRawAutomationTicks: plan.rawAutomationBoundaries.toString(),
    automationIntervalSeconds: interval,
    permanentDoubleIp: options.permanentDoubleIp ?? false,
    restart: null,
    materialEventBudget: 8,
    catalogHash: HASH,
    tuningHash: HASH,
    queuedInputs:Object.freeze([]),
    publication: encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state,
      runtime: migrated.runtime,
    })),
  })) as Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>
}

async function driveWorkerThroughCheckpointsV2(
  engine: StoredTimeWorkerEngineV2,
  host: TestHostV2,
): Promise<void> {
  let acknowledged = 0
  let authoritiesGranted = 0
  const deadline = performance.now() + 60_000
  while (!host.messages.some((message) =>
    message.type === 'completed' || message.type === 'paused' || message.type === 'failed'
  )) {
    if (performance.now() >= deadline) throw new Error(`Stored Time worker checkpoint drive timed out; messages=${host.messages.map(message=>message.type).join(',')}; tasks=${host.tasks.length}; snapshot=${JSON.stringify(engine.snapshot())}.`)
    if (host.tasks.length > 0) await host.runOne()
    else await new Promise((resolve) => setTimeout(resolve, 1))
    const candidates = host.messages.filter((message) => message.type === 'checkpoint-candidate')
    while (acknowledged < candidates.length) {
      engine.accept(acknowledgement(candidates[acknowledged]!))
      acknowledged += 1
    }
    const authorityRequests = host.messages.filter(
      (message) => message.type === 'authority-request',
    )
    while (authoritiesGranted < authorityRequests.length) {
      engine.accept(authorityGrant(authorityRequests[authoritiesGranted]!))
      authoritiesGranted += 1
    }
  }
  const terminal = host.messages.at(-1)
  if (terminal?.type !== 'completed') {
    throw new Error(`Stored Time worker recurrence ended as ${terminal?.type}${terminal?.type === 'paused' ? `:${terminal.reason}` : terminal?.type === 'failed' ? `:${terminal.diagnosticCode}:${engine.snapshot().diagnostic}` : ''}.`)
  }
}

function authorityGrant(
  request: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'authority-request' }>,
): Readonly<StoredTimeWorkerMainMessageV2> {
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type: 'authority-granted',
    protocolVersion: 1,
    workerInstanceNonce: request.workerInstanceNonce,
    jobId: request.jobId,
    originRevision: request.originRevision,
    acknowledgedBaseRevision: request.acknowledgedBaseRevision,
    policyId: request.policyId,
    policyVersion: 1,
    checkpointSequence: request.checkpointSequence,
    phase: request.phase,
    proposalHashEcho: request.proposalHash,
    expectedPostHash: request.phase.startsWith('pre-')
      ? request.proposalHash
      : null,
  }))
}

function controlMessage(
  start: Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>,
  type: 'cancel' | 'lifecycle-pause',
): Readonly<StoredTimeWorkerMainMessageV2> {
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type,
    protocolVersion: 1,
    workerInstanceNonce: start.workerInstanceNonce,
    jobId: start.jobId,
    originRevision: start.originRevision,
    acknowledgedBaseRevision: start.acknowledgedBaseRevision,
    policyId: start.policyId,
    policyVersion: 1,
    checkpointSequence: start.checkpointSequence,
    controlSequence: 1,
    reason: type === 'cancel' ? 'user' : 'browser-hidden',
  }))
}

function acknowledgement(
  candidate: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'checkpoint-candidate' }>,
): Readonly<StoredTimeWorkerMainMessageV2> {
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type: 'checkpoint-committed',
    protocolVersion: 1,
    workerInstanceNonce: candidate.workerInstanceNonce,
    jobId: candidate.jobId,
    originRevision: candidate.originRevision,
    acknowledgedBaseRevision: candidate.acknowledgedBaseRevision + 1,
    policyId: candidate.policyId,
    policyVersion: 1,
    checkpointSequence: candidate.checkpointSequence,
    publishedRevision: candidate.acknowledgedBaseRevision + 1,
    proposalHashEcho: candidate.proposalHash,
    candidateHash: HASH,
    accounting: candidate.accounting,
    sealedRemainingDurationSeconds: candidate.sealedRemainingDurationSeconds,
    rebasedQueuedInputs: candidate.rebasedQueuedInputs,
    publication: candidate.publication,
  }))
}

function completionAcknowledgement(
  completed: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'completed' }>,
): Readonly<StoredTimeWorkerMainMessageV2> {
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type: 'checkpoint-committed',
    protocolVersion: 1,
    workerInstanceNonce: completed.workerInstanceNonce,
    jobId: completed.jobId,
    originRevision: completed.originRevision,
    acknowledgedBaseRevision: completed.acknowledgedBaseRevision + 1,
    policyId: completed.policyId,
    policyVersion: 1,
    checkpointSequence: completed.checkpointSequence,
    publishedRevision: completed.acknowledgedBaseRevision + 1,
    proposalHashEcho: completed.proposalHash,
    candidateHash: HASH,
    accounting: completed.accounting,
    sealedRemainingDurationSeconds: 0,
    rebasedQueuedInputs: Object.freeze([]),
    publication: completed.publication,
  }))
}

function restartedStart(
  origin: Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>,
  candidate: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'checkpoint-candidate' }>,
): Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }> {
  const originPublication = decodeStoredTimeWorkerPublicationV2(origin.publication)
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    ...origin,
    acknowledgedBaseRevision: candidate.acknowledgedBaseRevision + 1,
    checkpointSequence: candidate.checkpointSequence,
    restart: Object.freeze({
      originalInitialAutomationHorizonSeconds:
        originPublication.state.timeline.automationTimeUntilNextEvent,
      originalInitialAutomationTargetIndex:
        originPublication.state.timeline.dysonAutomationTargetIndex,
      originalRequestedDurationSeconds: origin.requestedDurationSeconds,
      originalRequestedRawAutomationTicks: origin.requestedRawAutomationTicks,
      completedRepresentativeGroups:
        candidate.accounting.cumulativeRepresentativeGroups,
      cumulativeAccounting: candidate.accounting,
      cumulativeSchedulerSummary: candidate.schedulerSummary,
      sealedRemainingDurationSeconds: candidate.sealedRemainingDurationSeconds,
      rebasedQueuedInputs: candidate.rebasedQueuedInputs,
      priorCandidateHash: candidate.proposalHash,
    }),
    publication: authorityNormalizedPublicationV2(origin, candidate),
  })) as Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>
}

function authorityNormalizedPublicationV2(
  origin: Extract<Readonly<StoredTimeWorkerMainMessageV2>, { type: 'start' }>,
  proposal: Extract<
    Readonly<StoredTimeWorkerMessageV2>,
    { type: 'checkpoint-candidate' | 'completed' }
  >,
) {
  const originPublication = decodeStoredTimeWorkerPublicationV2(origin.publication)
  const decoded = decodeStoredTimeWorkerPublicationV2(proposal.publication)
  const automationExecutions = origin.policyId === 'stored-time-fast-v1' &&
      BigInt(origin.requestedRawAutomationTicks) > 4_096n
    ? proposal.accounting.cumulativeRepresentativeGroups +
      (originPublication.state.timeline.automationTimeUntilNextEvent === 0 &&
          BigInt(proposal.accounting.cumulativeRawAutomationTicks) > 0n
        ? 1
        : 0)
    : Number(BigInt(proposal.accounting.cumulativeRawAutomationTicks) % 8n)
  const timeline = Object.freeze({
    ...decoded.state.timeline,
    storedTimeAvailableSeconds:
      origin.admittedBankSeconds - proposal.accounting.cumulativeProcessedSeconds,
    doubleTime: Object.freeze({
      ...decoded.state.timeline.doubleTime,
      unlocked: originPublication.state.timeline.doubleTime.unlocked,
      enabled: originPublication.state.timeline.doubleTime.unlocked &&
        originPublication.state.timeline.doubleTime.bankSeconds -
          proposal.accounting.cumulativeDoubleTimeConsumedSeconds > 0,
      bankSeconds: originPublication.state.timeline.doubleTime.bankSeconds -
        proposal.accounting.cumulativeDoubleTimeConsumedSeconds,
      rate: originPublication.state.timeline.doubleTime.rate,
    }),
    infinityCycleSeconds:
      proposal.accounting.cumulativeInfinityResetCount === '0'
        ? originPublication.state.timeline.infinityCycleSeconds +
          proposal.accounting.cumulativeInfinityElapsedSeconds
        : proposal.accounting.cumulativeProcessedSeconds -
          proposal.accounting.lastInfinityResetElapsedSeconds!,
    infinityBoundaryRemaining:
      proposal.accounting.cumulativeInfinityResetCount === '0'
        ? originPublication.state.timeline.infinityBoundaryRemaining -
          proposal.accounting.cumulativeInfinityElapsedSeconds
        : proposal.accounting.sealedInfinityBoundaryRemaining,
    automationTimeUntilNextEvent:
      proposal.accounting.automationTimeUntilNextEvent,
    dysonAutomationTargetIndex:
      (originPublication.state.timeline.dysonAutomationTargetIndex +
        automationExecutions) % 8,
    researchAutomationTargetIndex:
      originPublication.state.infinity.automationUnlocked.research
        ? (originPublication.state.timeline.researchAutomationTargetIndex +
            automationExecutions) % 14
        : originPublication.state.timeline.researchAutomationTargetIndex,
  })
  return encodeStoredTimeWorkerPublicationV2(Object.freeze({
    state: cloneCanonicalGameStateV2(Object.freeze({
      ...decoded.state,
      timeline,
    }) as CanonicalGameStateV2),
    runtime: decoded.runtime,
  }))
}

async function waitForWorkerMessageV2(
  messages: readonly Readonly<StoredTimeWorkerMessageV2>[],
  type: StoredTimeWorkerMessageV2['type'],
  timeoutMilliseconds = 10_000,
): Promise<void> {
  await waitForConditionV2(
    () => messages.some((message) => message.type === type),
    `Stored Time worker ${type}; saw ${
      messages.map((message) => message.type).join(',') || 'nothing'
    }`,
    timeoutMilliseconds,
  )
}

async function waitForConditionV2(
  condition: () => boolean,
  label: string,
  timeoutMilliseconds = 10_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMilliseconds
  while (!condition()) {
    if (performance.now() >= deadline) throw new Error(`Timed out waiting for ${label}.`)
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

function onlyCandidate(
  messages: readonly Readonly<StoredTimeWorkerMessageV2>[],
): Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'checkpoint-candidate' }> {
  const matches = messages.filter((message) => message.type === 'checkpoint-candidate')
  expect(matches).toHaveLength(1)
  return matches[0] as Extract<
    Readonly<StoredTimeWorkerMessageV2>,
    { type: 'checkpoint-candidate' }
  >
}

function onlyCompleted(
  messages: readonly Readonly<StoredTimeWorkerMessageV2>[],
): Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'completed' }> {
  const matches = messages.filter((message) => message.type === 'completed')
  expect(
    matches,
    `worker messages: ${messages.map((message) => message.type).join(', ')}`,
  ).toHaveLength(1)
  return matches[0] as Extract<
    Readonly<StoredTimeWorkerMessageV2>,
    { type: 'completed' }
  >
}

function firstCanonicalDifference(
  left: unknown,
  right: unknown,
  path = '$',
): string | null {
  if (Object.is(left, right)) return null
  if (
    typeof left !== 'object' || left === null ||
    typeof right !== 'object' || right === null
  ) return `${path}: ${String(left)} !== ${String(right)}`
  const leftEntries = Object.entries(left)
  const rightEntries = Object.entries(right)
  if (leftEntries.length !== rightEntries.length) {
    return `${path}: ${leftEntries.length} keys !== ${rightEntries.length} keys`
  }
  for (let index = 0; index < leftEntries.length; index += 1) {
    const [leftKey, leftValue] = leftEntries[index]!
    const [rightKey, rightValue] = rightEntries[index]!
    if (leftKey !== rightKey) return `${path}: ${leftKey} !== ${rightKey}`
    const difference = firstCanonicalDifference(
      leftValue,
      rightValue,
      `${path}.${leftKey}`,
    )
    if (difference !== null) return difference
  }
  return null
}
