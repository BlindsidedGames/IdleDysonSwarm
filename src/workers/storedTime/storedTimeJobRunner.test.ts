import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { prepareIdb1Save } from '../../save/prepare'
import { CANONICAL_DYSON_PRESENTATION_TUNING } from '../../simulation/canonicalDysonDerivation'
import {
  CanonicalRuntimeSession,
  type CanonicalRuntimeState,
} from '../../application/canonicalRuntimeSession'
import { BrowserStoredTimeJobRunner } from './storedTimeJobRunner'

const prepared = prepareIdb1Save(readFileSync(
  new URL(
    '../../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)).prepared

describe('BrowserStoredTimeJobRunner', () => {
  test('contains a throwing progress observer and still resolves the worker result', async () => {
    const state = runtimeWithStoredTime(1)
    const worker = new FakeWorker('complete')
    const runner = new BrowserStoredTimeJobRunner({
      createWorker: () => worker as unknown as Worker,
      workerSupported: () => true,
    })

    await expect(runner.run(request(state), {
      onProgress: () => {
        throw new Error('observer failed')
      },
    })).resolves.toMatchObject({
      type: 'completed',
      consumedSeconds: 0.1,
    })
    runner.dispose()
  })

  test('terminates a silent post-ready worker and completes through the bounded fallback', async () => {
    const state = runtimeWithStoredTime(1)
    const worker = new FakeWorker('silent')
    const runner = new BrowserStoredTimeJobRunner({
      createWorker: () => worker as unknown as Worker,
      workerSupported: () => true,
      workerInactivityTimeoutMilliseconds: 5,
    })

    await expect(runner.run(request(state))).resolves.toMatchObject({
      type: 'completed',
      consumedSeconds: 0.1,
      remainingSeconds: 0,
    })
    expect(worker.terminated).toBe(true)
    runner.dispose()
  })

  test('rejects a stale worker build and completes through the same bounded fallback', async () => {
    const state = runtimeWithStoredTime(1)
    const worker = new FakeWorker('silent', 'stale-package')
    const runner = new BrowserStoredTimeJobRunner({
      createWorker: () => worker as unknown as Worker,
      workerSupported: () => true,
    })

    await expect(runner.run(request(state))).resolves.toMatchObject({
      type: 'completed',
      consumedSeconds: 0.1,
      remainingSeconds: 0,
    })
    expect(worker.terminated).toBe(true)
    runner.dispose()
  })

  test('forwards an immediate speed-up before the worker starts its job', async () => {
    const state = runtimeWithStoredTime(1)
    const worker = new FakeWorker('complete')
    const runner = new BrowserStoredTimeJobRunner({
      createWorker: () => worker as unknown as Worker,
      workerSupported: () => true,
    })

    const completed = runner.run(request(state))
    runner.speedUp()
    await expect(completed).resolves.toMatchObject({ type: 'completed' })
    expect(worker.receivedTypes).toEqual(['speed-up', 'start'])
    runner.dispose()
  })
})

function request(state: CanonicalRuntimeState) {
  return {
    jobId: 'job',
    state,
    requestedSeconds: 0.1,
    infinityMinimumCycleSeconds: 1 / 60,
    dysonPresentationTuning: CANONICAL_DYSON_PRESENTATION_TUNING,
  }
}

function runtimeWithStoredTime(seconds: number): CanonicalRuntimeState {
  const source = new CanonicalRuntimeSession(prepared, {
    entitlements: { permanentDoubleIp: false },
  }).initialState
  return {
    ...source,
    gameState: {
      ...source.gameState,
      timeline: {
        ...source.gameState.timeline,
        storedTimeAvailableSeconds: seconds,
        storedTimeCapacitySeconds: Math.max(100, seconds),
      },
    },
  }
}

class FakeWorker {
  private readonly messageListeners = new Set<(event: MessageEvent) => void>()
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>()
  readonly mode: 'complete' | 'silent'
  readonly buildId: string | null
  readonly receivedTypes: string[] = []
  terminated = false

  constructor(mode: 'complete' | 'silent', buildId: string | null = null) {
    this.mode = mode
    this.buildId = buildId
    queueMicrotask(() => this.emit({
      type: 'ready',
      protocolVersion: 3,
      buildId: this.buildId,
    }))
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.errorListeners.add(listener as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void)
    }
  }

  postMessage(value: unknown): void {
    const start = value as {
      readonly type?: string
      readonly jobId?: string
      readonly state?: CanonicalRuntimeState
    }
    if (typeof start.type === 'string') this.receivedTypes.push(start.type)
    if (this.mode === 'silent') return
    if (start.type !== 'start') return
    const progress = {
      jobId: start.jobId!,
      requestedSeconds: 0.1,
      computedSeconds: 0.1,
      fraction: 1,
      elapsedMilliseconds: 1,
      estimatedRemainingMilliseconds: 0,
      maximumChunkMilliseconds: 1,
    }
    queueMicrotask(() => {
      this.emit({ type: 'progress', protocolVersion: 3, progress })
      this.emit({
        type: 'completed',
        protocolVersion: 3,
        jobId: start.jobId,
        candidate: start.state,
        firstDisasterOccurrences: [],
        consumedSeconds: 0.1,
        remainingSeconds: 0,
        progress,
      })
    })
  }

  terminate(): void {
    this.terminated = true
  }

  private emit(data: unknown): void {
    const event = { data } as MessageEvent
    for (const listener of [...this.messageListeners]) listener(event)
  }
}
