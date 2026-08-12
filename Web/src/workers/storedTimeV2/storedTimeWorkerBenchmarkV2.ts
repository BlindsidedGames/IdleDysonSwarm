import schema12Web from '../../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import type {
  CanonicalGameStateV2,
  CanonicalOwnedPairV2,
} from '../../game-state/typesV2'
import { gameDecimalFromCanonicalString } from '../../math/gameDecimal'
import { PreparedSave } from '../../save/prepare'
import { deserializeWebSave } from '../../save/serialization'
import { planStoredTimePolicyV2 } from '../../simulation/storedTimePolicyV2'
import {
  decodeStoredTimeWorkerFrameMessageV2,
  postStoredTimeWorkerMainFrameV2,
  type StoredTimeWorkerMessageV2,
  type StoredTimeWorkerReadyV2,
} from './workerProtocolV2'
import {
  createStoredTimeWorkerLiveJobBudgetV2,
  encodeStoredTimeWorkerPublicationV2,
} from './workerWireV2'

export const STORED_TIME_WORKER_BENCHMARK_DURATION_SECONDS_V2 =
  12_345_678.901234567
export const STORED_TIME_WORKER_BENCHMARK_INTERVAL_SECONDS_V2 = 1e-12
export const STORED_TIME_WORKER_BENCHMARK_GROUPS_V2 = 4_096
export const STORED_TIME_WORKER_DREAM_BENCHMARK_DURATION_SECONDS_V2 = 12_345
export const STORED_TIME_WORKER_DREAM_BENCHMARK_INTERVAL_SECONDS_V2 = 0.1
export const STORED_TIME_WORKER_DESKTOP_BUDGET_MILLISECONDS_V2 = 3_000
export const STORED_TIME_WORKER_THROTTLED_MOBILE_BUDGET_MILLISECONDS_V2 = 10_000

interface BenchmarkResultV2 {
  readonly status: 'passed' | 'failed'
  readonly profile: 'desktop' | 'throttled-mobile'
  readonly scenario: 'active-skill-production' | 'dream-recurrence'
  readonly elapsedMilliseconds: number
  readonly representativeGroups: number
  readonly rawAutomationTicks: string
  readonly dreamResetCount: string
  readonly dreamFastNormalizedResetCount: string
  readonly checkpoints: number
  readonly maximumWorkerChunkMilliseconds: number
  readonly maximumAtomicEventMilliseconds: number
  readonly workerFailureCode: string | null
  readonly workerFailureDiagnosticCode: string | null
  readonly workerFailureRetryable: boolean | null
}

class StoredTimeWorkerBenchmarkFailureV2 extends Error {
  readonly code: string
  readonly diagnosticCode: string
  readonly retryable: boolean
  readonly maximumChunkMilliseconds: number
  readonly maximumAtomicEventMilliseconds: number

  constructor(
    code: string,
    diagnosticCode: string,
    retryable: boolean,
    maximumChunkMilliseconds: number,
    maximumAtomicEventMilliseconds: number,
  ) {
    super(`Stored Time worker failed: ${code}/${diagnosticCode} (retryable=${retryable}).`)
    this.code = code
    this.diagnosticCode = diagnosticCode
    this.retryable = retryable
    this.maximumChunkMilliseconds = maximumChunkMilliseconds
    this.maximumAtomicEventMilliseconds = maximumAtomicEventMilliseconds
  }
}

/** Dedicated emitted-worker benchmark; imported only by the dormant harness. */
export async function runStoredTimeWorkerBenchmarkV2(
  worker: Worker,
  status: HTMLElement | null,
  readyValue: unknown,
): Promise<void> {
  const profile = new URLSearchParams(location.search).get('profile') ===
      'throttled-mobile'
    ? 'throttled-mobile' as const
    : 'desktop' as const
  const scenario = new URLSearchParams(location.search).get('scenario') ===
      'dream-recurrence'
    ? 'dream-recurrence' as const
    : 'active-skill-production' as const
  try {
    const liveJobBudget = createStoredTimeWorkerLiveJobBudgetV2()
    const readyMessage = decodeStoredTimeWorkerFrameMessageV2(readyValue)
    if (readyMessage.type !== 'ready') {
      throw new TypeError('Stored Time browser benchmark requires ready identity.')
    }
    const ready: Readonly<StoredTimeWorkerReadyV2> = readyMessage
    const benchmark = createBenchmarkPublicationV2(scenario)
    const { publication, rawAutomationTicks } = benchmark
    const startedAt = performance.now()
    let acknowledgedBaseRevision = 0
    let checkpointSequence = 0
    let checkpoints = 0
    let maximumWorkerChunkMilliseconds = 0
    let maximumAtomicEventMilliseconds = 0
    const result = await new Promise<Readonly<BenchmarkResultV2>>((resolve, reject) => {
      const fail = (error: unknown) => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        reject(error)
      }
      const onError = () => fail(new Error('Dormant Stored Time worker failed.'))
      const onMessage = (event: MessageEvent<unknown>) => {
        let message: Readonly<StoredTimeWorkerMessageV2>
        try {
          message = decodeStoredTimeWorkerFrameMessageV2(event.data)
        } catch (error) {
          fail(error)
          return
        }
        if ('progress' in message) {
          maximumWorkerChunkMilliseconds = Math.max(
            maximumWorkerChunkMilliseconds,
            message.progress.maximumChunkMilliseconds,
          )
          maximumAtomicEventMilliseconds = Math.max(
            maximumAtomicEventMilliseconds,
            message.progress.maximumAtomicEventMilliseconds,
          )
        }
        if (message.type === 'failed') {
          fail(new StoredTimeWorkerBenchmarkFailureV2(
            message.code,
            message.diagnosticCode,
            message.retryable,
            maximumWorkerChunkMilliseconds,
            maximumAtomicEventMilliseconds,
          ))
          return
        }
        if (message.type === 'cancelled' || message.type === 'paused') {
          fail(new Error(`Stored Time worker stopped unexpectedly: ${message.type}.`))
          return
        }
        if (message.type !== 'checkpoint-candidate' && message.type !== 'completed') return
        checkpointSequence = message.checkpointSequence
        acknowledgedBaseRevision += 1
        if (message.type === 'checkpoint-candidate') checkpoints += 1
        const remaining = message.type === 'checkpoint-candidate'
          ? message.sealedRemainingDurationSeconds
          : 0
        const queue = message.type === 'checkpoint-candidate'
          ? message.rebasedQueuedInputs
          : Object.freeze([])
        postStoredTimeWorkerMainFrameV2(worker, Object.freeze({
          type: 'checkpoint-committed',
          protocolVersion: 1,
          workerInstanceNonce: ready.workerInstanceNonce,
          jobId: 'stage4d-browser-benchmark',
          originRevision: 0,
          acknowledgedBaseRevision,
          policyId: 'stored-time-fast-v1',
          policyVersion: 1,
          checkpointSequence,
          publishedRevision: acknowledgedBaseRevision,
          proposalHashEcho: message.proposalHash,
          candidateHash: 'a'.repeat(64),
          accounting: message.accounting,
          sealedRemainingDurationSeconds: remaining,
          rebasedQueuedInputs: queue,
          publication: message.publication,
        }), liveJobBudget)
        if (message.type === 'completed') {
          worker.removeEventListener('message', onMessage)
          worker.removeEventListener('error', onError)
          const elapsedMilliseconds = performance.now() - startedAt
          const budgetMilliseconds = profile === 'desktop'
            ? STORED_TIME_WORKER_DESKTOP_BUDGET_MILLISECONDS_V2
            : STORED_TIME_WORKER_THROTTLED_MOBILE_BUDGET_MILLISECONDS_V2
          resolve(Object.freeze({
            status: elapsedMilliseconds <= budgetMilliseconds
              ? 'passed'
              : 'failed',
            profile,
            scenario,
            elapsedMilliseconds,
            representativeGroups:
              message.accounting.cumulativeRepresentativeGroups,
            rawAutomationTicks: message.accounting.cumulativeRawAutomationTicks,
            dreamResetCount: message.schedulerSummary.dreamResetCount,
            dreamFastNormalizedResetCount:
              message.schedulerSummary.dreamFastNormalizedResetCount,
            checkpoints,
            maximumWorkerChunkMilliseconds,
            maximumAtomicEventMilliseconds,
            workerFailureCode: null,
            workerFailureDiagnosticCode: null,
            workerFailureRetryable: null,
          }))
        }
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError, { once: true })
      postStoredTimeWorkerMainFrameV2(worker, Object.freeze({
        type: 'start',
        protocolVersion: 1,
        workerInstanceNonce: ready.workerInstanceNonce,
        jobId: 'stage4d-browser-benchmark',
        originRevision: 0,
        acknowledgedBaseRevision: 0,
        policyId: 'stored-time-fast-v1',
        policyVersion: 1,
        checkpointSequence: 0,
        admittedBankSeconds: benchmark.durationSeconds,
        requestedDurationSeconds: benchmark.durationSeconds,
        requestedRawAutomationTicks: rawAutomationTicks,
        automationIntervalSeconds: benchmark.intervalSeconds,
        permanentDoubleIp: false,
        materialEventBudget: 8,
        buildId: ready.buildId,
        catalogHash: ready.catalogHash,
        tuningHash: ready.tuningHash,
        queuedInputs:Object.freeze([]),
        restart: null,
        publication,
      }), liveJobBudget)
    })
    publishBenchmarkResultV2(result, status)
  } catch (error) {
    publishBenchmarkResultV2(Object.freeze({
      status: 'failed',
      profile,
      scenario,
      elapsedMilliseconds: Number.NaN,
      representativeGroups: 0,
      rawAutomationTicks: '0',
      dreamResetCount: '0',
      dreamFastNormalizedResetCount: '0',
      checkpoints: 0,
      maximumWorkerChunkMilliseconds:
        error instanceof StoredTimeWorkerBenchmarkFailureV2
          ? error.maximumChunkMilliseconds
          : 0,
      maximumAtomicEventMilliseconds:
        error instanceof StoredTimeWorkerBenchmarkFailureV2
          ? error.maximumAtomicEventMilliseconds
          : 0,
      workerFailureCode: error instanceof StoredTimeWorkerBenchmarkFailureV2
        ? error.code
        : null,
      workerFailureDiagnosticCode:
        error instanceof StoredTimeWorkerBenchmarkFailureV2
          ? error.diagnosticCode
          : null,
      workerFailureRetryable: error instanceof StoredTimeWorkerBenchmarkFailureV2
        ? error.retryable
        : null,
    }), status, error)
  }
}

function createBenchmarkPublicationV2(
  scenario: BenchmarkResultV2['scenario'],
): Readonly<{
  publication: ReturnType<typeof encodeStoredTimeWorkerPublicationV2>
  rawAutomationTicks: string
  durationSeconds: number
  intervalSeconds: number
}> {
  const migrated = migratePreparedSaveToV2(
    PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
    Object.freeze({ kind: 'trusted-same-device' as const }),
  )
  const durationSeconds = scenario === 'dream-recurrence'
    ? STORED_TIME_WORKER_DREAM_BENCHMARK_DURATION_SECONDS_V2
    : STORED_TIME_WORKER_BENCHMARK_DURATION_SECONDS_V2
  const intervalSeconds = scenario === 'dream-recurrence'
    ? STORED_TIME_WORKER_DREAM_BENCHMARK_INTERVAL_SECONDS_V2
    : STORED_TIME_WORKER_BENCHMARK_INTERVAL_SECONDS_V2
  const zeroFacilities = Object.freeze(Object.fromEntries(
    Object.keys(migrated.state.dyson.facilities).map((id) => [
      id,
      Object.freeze([
        gameDecimalFromCanonicalString('0'),
        gameDecimalFromCanonicalString('0'),
      ]),
    ]),
  )) as unknown as CanonicalGameStateV2['dyson']['facilities']
  const state = cloneCanonicalGameStateV2(Object.freeze({
    ...migrated.state,
    skills: scenario === 'dream-recurrence' ? migrated.state.skills : Object.freeze({
      ...migrated.state.skills,
      byId: Object.freeze({
        ...migrated.state.skills.byId,
        androids: Object.freeze({
          ...migrated.state.skills.byId.androids!,
          owned: true,
          timerSeconds: 12,
        }),
        pocketAndroids: Object.freeze({
          ...migrated.state.skills.byId.pocketAndroids!,
          owned: true,
          timerSeconds: 12,
        }),
        superRadiantScattering: Object.freeze({
          ...migrated.state.skills.byId.superRadiantScattering!,
          owned: true,
          timerSeconds: 12,
        }),
      }),
    }),
    dyson: Object.freeze({
      ...migrated.state.dyson,
      ...(scenario === 'dream-recurrence' ? {
        bots: gameDecimalFromCanonicalString('0'),
        workers: gameDecimalFromCanonicalString('0'),
        researchers: gameDecimalFromCanonicalString('0'),
        science: gameDecimalFromCanonicalString('0'),
        facilities: zeroFacilities,
      } : { facilities: Object.freeze({
        ...migrated.state.dyson.facilities,
        assembly_lines: Object.freeze([
          gameDecimalFromCanonicalString('1e0'),
          gameDecimalFromCanonicalString('0'),
        ]) as CanonicalOwnedPairV2,
      }) }),
    }),
    dream: scenario === 'dream-recurrence' ? Object.freeze({
      ...migrated.state.dream,
      disasterStage: 1n,
      upgrades: Object.freeze({
        ...migrated.state.dream.upgrades,
        hunter1: true,
        gatherer1: true,
      }),
      resources: Object.freeze({
        ...migrated.state.dream.resources,
        housing: gameDecimalFromCanonicalString('1e1'),
        villages: gameDecimalFromCanonicalString('2.4e1'),
        cities: gameDecimalFromCanonicalString('0'),
      }),
    }) : migrated.state.dream,
    reality: scenario === 'dream-recurrence' ? Object.freeze({
      ...migrated.state.reality,
      workersReady: 128n,
      autoGather: false,
    }) : migrated.state.reality,
    timeline: Object.freeze({
      ...migrated.state.timeline,
      automationTimeUntilNextEvent:
        intervalSeconds,
      infinityBoundaryRemaining:
        42_000_000,
      infinityCycleSeconds: 0,
      storedTimeAvailableSeconds:
        durationSeconds,
      storedTimeCapacitySeconds:
        durationSeconds,
      doubleTime: Object.freeze({
        ...migrated.state.timeline.doubleTime,
        unlocked: scenario === 'dream-recurrence',
        enabled: scenario === 'dream-recurrence',
        rate: scenario === 'dream-recurrence' ? 1 : migrated.state.timeline.doubleTime.rate,
        bankSeconds: scenario === 'dream-recurrence' ? 20_000 : 0,
      }),
    }),
  }) as CanonicalGameStateV2)
  const plan = planStoredTimePolicyV2(Object.freeze({
    policyId: 'stored-time-fast-v1',
    policyVersion: 1,
    requestedDurationSeconds: durationSeconds,
    initialAutomationHorizonSeconds:
      intervalSeconds,
    automationIntervalSeconds:
      intervalSeconds,
    initialAutomationTargetIndex: state.timeline.dysonAutomationTargetIndex,
    hardEvents: Object.freeze([]),
  }))
  if (plan.groups.length !== STORED_TIME_WORKER_BENCHMARK_GROUPS_V2) {
    throw new Error('Stored Time browser benchmark did not produce 4,096 groups.')
  }
  return Object.freeze({
    publication: encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state,
      runtime: migrated.runtime,
    })),
    rawAutomationTicks: plan.rawAutomationBoundaries.toString(),
    durationSeconds,
    intervalSeconds,
  })
}

function publishBenchmarkResultV2(
  result: Readonly<BenchmarkResultV2>,
  status: HTMLElement | null,
  error?: unknown,
): void {
  const payload = Object.freeze({
    ...result,
    desktopBudgetMilliseconds:
      STORED_TIME_WORKER_DESKTOP_BUDGET_MILLISECONDS_V2,
    throttledMobileBudgetMilliseconds:
      STORED_TIME_WORKER_THROTTLED_MOBILE_BUDGET_MILLISECONDS_V2,
    error: error instanceof Error ? error.message : error === undefined
      ? null
      : String(error),
  })
  document.documentElement.dataset.workerBenchmark = JSON.stringify(payload)
  if (status !== null) {
    status.textContent = result.status === 'passed'
      ? `Stored Time worker benchmark passed in ${result.elapsedMilliseconds.toFixed(1)} ms`
      : `Stored Time worker benchmark failed: ${payload.error ?? 'budget exceeded'}`
  }
}
