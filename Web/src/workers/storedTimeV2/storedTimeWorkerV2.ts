import {
  decodeStoredTimeWorkerMainFrameV2,
  postStoredTimeWorkerFrameMessageV2,
  type StoredTimeWorkerAccountingDtoV2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
} from './workerProtocolV2'
import {
  createStoredTimeWorkerInstanceNonceV2,
  createStoredTimeWorkerReadyV2,
  getTrustedStoredTimeWorkerIdentityV2,
  requireMatchingStoredTimeWorkerIdentityV2,
} from './workerIdentityV2'
import { StoredTimeWorkerEngineV2 } from './storedTimeWorkerEngineV2'
import { StoredTimeWorkerShellStateV2 } from './storedTimeWorkerShellStateV2'
import { createStoredTimeWorkerLiveJobBudgetV2 } from './workerWireV2'

interface DormantWorkerScopeV2 {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<unknown>) => void,
  ): void
  postMessage(message: unknown, transfer: readonly Transferable[]): void
  close(): void
}

const scope = self as unknown as DormantWorkerScopeV2
const workerInstanceNonce = createStoredTimeWorkerInstanceNonceV2()
const releaseBuildId = import.meta.env.VITE_BUILD_ID
const liveJobBudget = createStoredTimeWorkerLiveJobBudgetV2()

void initialize()

async function initialize(): Promise<void> {
  const identity = await getTrustedStoredTimeWorkerIdentityV2(releaseBuildId)
  const scheduleCooperativeTask = createCooperativeScheduler()
  const shellState = new StoredTimeWorkerShellStateV2()
  let engine: StoredTimeWorkerEngineV2
  const terminalizeTransportBudget = () => {
    const terminal = shellState.beginTransportBudgetTerminal()
    if (terminal === null) {
      scope.close()
      throw new Error('Stored Time worker rejected a transport frame.')
    }
    try {
      postStoredTimeWorkerFrameMessageV2(scope, terminal.failure, liveJobBudget)
    } finally {
      liveJobBudget.releaseFrames()
      scheduleCooperativeTask(() => {
        engine.accept(terminal.revocation)
        shellState.finishTransportBudgetTerminal()
      })
    }
  }
  engine = new StoredTimeWorkerEngineV2(Object.freeze({
    nowMilliseconds: () => performance.now(),
    schedule: scheduleCooperativeTask,
    postMessage: (message: Readonly<StoredTimeWorkerMessageV2>) => {
      if (shellState.transportTerminating) return
      try {
        postStoredTimeWorkerFrameMessageV2(scope, message, liveJobBudget)
      } catch {
        terminalizeTransportBudget()
        return
      }
      if (message.type === 'cancelled' || message.type === 'paused' ||
        message.type === 'failed') {
        shellState.observeWorkerMessage(message)
        liveJobBudget.releaseFrames()
      }
    },
  }))
  scope.addEventListener('message', (event) => {
    let releaseInput: (() => void) | undefined
    let message: Readonly<StoredTimeWorkerMainMessageV2>
    try {
      releaseInput = liveJobBudget.reserveInputFrame(event.data as ArrayBuffer)
      message = decodeStoredTimeWorkerMainFrameV2(event.data)
    } catch {
      terminalizeTransportBudget()
      return
    } finally {
      releaseInput?.()
    }
    let identityMatches = message.workerInstanceNonce === workerInstanceNonce
    if (identityMatches && message.type === 'start') {
      try {
        requireMatchingStoredTimeWorkerIdentityV2(message, identity)
      } catch {
        identityMatches = false
      }
    }
    if (!identityMatches) {
      postFailure(message, 'identity-mismatch', false)
      return
    }
    shellState.beforeAccept(message)
    engine.accept(message)
    shellState.afterAccept(message)
    if (!shellState.active) {
      liveJobBudget.releaseFrames()
    }
  })
  postStoredTimeWorkerFrameMessageV2(
    scope,
    await createStoredTimeWorkerReadyV2(workerInstanceNonce, releaseBuildId),
    liveJobBudget,
  )
}

function createCooperativeScheduler(): (task: () => void) => void {
  const channel = new MessageChannel()
  const tasks: (() => void)[] = []
  let messagePending = false
  const requestTurn = () => {
    if (messagePending || tasks.length === 0) return
    messagePending = true
    channel.port2.postMessage(null)
  }
  channel.port1.onmessage = () => {
    messagePending = false
    const task = tasks.shift()
    if (task !== undefined) task()
    requestTurn()
  }
  return (task: () => void) => {
    tasks.push(task)
    requestTurn()
  }
}

function postFailure(
  message: Readonly<StoredTimeWorkerMainMessageV2>,
  code: 'identity-mismatch',
  retryable: boolean,
): void {
  postStoredTimeWorkerFrameMessageV2(scope, Object.freeze({
    type: 'failed',
    protocolVersion: message.protocolVersion,
    workerInstanceNonce: message.workerInstanceNonce,
    jobId: message.jobId,
    originRevision: message.originRevision,
    acknowledgedBaseRevision: message.acknowledgedBaseRevision,
    policyId: message.policyId,
    policyVersion: message.policyVersion,
    checkpointSequence: message.checkpointSequence,
    code,
    retryable,
    diagnosticCode: 'identity-mismatch',
    progress: failureProgress(message),
  }), liveJobBudget)
}

function failureProgress(
  message: Readonly<StoredTimeWorkerMainMessageV2>,
  durableOverride?: Readonly<StoredTimeWorkerAccountingDtoV2> | null,
) {
  const accounting = durableOverride ?? (message.type === 'start'
    ? message.restart?.cumulativeAccounting
    : undefined)
  return Object.freeze({
      computedSeconds: accounting?.cumulativeProcessedSeconds ?? 0,
      durableSeconds: accounting?.cumulativeProcessedSeconds ?? 0,
      computedRawTicks: accounting?.cumulativeRawAutomationTicks ?? '0',
      durableRawTicks: accounting?.cumulativeRawAutomationTicks ?? '0',
      representativeGroups:
        accounting?.cumulativeRepresentativeGroups ?? 0,
      elapsedWallMilliseconds: 0,
      maximumChunkMilliseconds: 0,
      maximumAtomicEventMilliseconds: 0,
      throughputTicksPerSecond: 0,
      etaMilliseconds: null,
      warmingUp: true,
  })
}
