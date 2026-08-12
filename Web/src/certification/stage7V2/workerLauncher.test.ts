import { describe, expect, test } from 'vitest'
import {
  Stage7V2WorkerLauncher,
  type Stage7V2WorkerReady,
} from '../stage7V2Harness'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)
const EXPECTED = Object.freeze({
  buildId: 'stage7-build-1',
  catalogHash: HASH_A,
  tuningHash: HASH_B,
})

describe('Stage 7 dormant worker launcher', () => {
  test('constructs no worker until requested, starts once, and terminates idempotently', async () => {
    const worker = new FakeWorker()
    let constructions = 0
    const launcher = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => { constructions += 1; return worker as unknown as Worker },
    })
    expect(constructions).toBe(0)
    const first = launcher.start()
    const second = launcher.start()
    expect(first).toBe(second)
    expect(constructions).toBe(1)
    worker.ready(EXPECTED)
    await expect(first).resolves.toMatchObject({ status: 'ready' })
    expect(worker.posts).toEqual([])
    launcher.terminate()
    launcher.terminate()
    expect(worker.terminations).toBe(1)
  })

  test('returns resumable untouched failures for timeout, load, stale cache, and identity mismatch', async () => {
    const timeoutWorker = new FakeWorker()
    let timeout: (() => void) | undefined
    const timed = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => timeoutWorker as unknown as Worker,
      readyTimeoutMilliseconds: 10,
      setTimeout: ((callback: () => void) => { timeout = callback; return 1 }) as never,
      clearTimeout: (() => undefined) as never,
    }).start()
    timeout?.()
    await expect(timed).resolves.toEqual({
      status: 'resumable-failure', reason: 'ready-timeout', storedTimeUntouched: true,
    })
    expect(timeoutWorker.terminations).toBe(1)

    for (const [reason, identity] of [
      ['cache-mismatch', { ...EXPECTED, buildId: 'old-build' }],
      ['identity-mismatch', { ...EXPECTED, tuningHash: HASH_A }],
    ] as const) {
      const worker = new FakeWorker()
      const pending = new Stage7V2WorkerLauncher({
        expectedIdentity: EXPECTED,
        createWorker: () => worker as unknown as Worker,
      }).start()
      worker.ready(identity)
      await expect(pending).resolves.toMatchObject({
        status: 'resumable-failure', reason, storedTimeUntouched: true,
      })
      expect(worker.terminations).toBe(1)
    }

    const loadWorker = new FakeWorker()
    const loading = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => loadWorker as unknown as Worker,
    }).start()
    loadWorker.fail()
    await expect(loading).resolves.toMatchObject({ reason: 'load-failed' })
  })

  test('recovers through a fresh on-demand launcher after stale-update and offline failures', async () => {
    const stale = new FakeWorker()
    const staleRun = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => stale as unknown as Worker,
    }).start()
    stale.ready({ ...EXPECTED, buildId: 'cached-old-build' })
    await expect(staleRun).resolves.toMatchObject({ reason: 'cache-mismatch' })

    const offline = new FakeWorker()
    const offlineRun = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => offline as unknown as Worker,
    }).start()
    offline.fail()
    await expect(offlineRun).resolves.toMatchObject({ reason: 'load-failed' })

    const refreshed = new FakeWorker()
    const refreshedRun = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => refreshed as unknown as Worker,
    }).start()
    refreshed.ready(EXPECTED)
    await expect(refreshedRun).resolves.toMatchObject({ status: 'ready' })
  })

  test('rejects hostile option and ready-frame descriptors without invoking getters', async () => {
    let getters = 0
    const hostile = Object.defineProperty({}, 'expectedIdentity', {
      enumerable: true,
      get: () => { getters += 1; return EXPECTED },
    })
    expect(() => new Stage7V2WorkerLauncher(hostile as never)).toThrow()
    expect(getters).toBe(0)

    const worker = new FakeWorker()
    const pending = new Stage7V2WorkerLauncher({
      expectedIdentity: EXPECTED,
      createWorker: () => worker as unknown as Worker,
    }).start()
    worker.message(frame({ ...readyRecord(EXPECTED), extra: true }))
    await expect(pending).resolves.toMatchObject({ reason: 'identity-mismatch' })
    expect(getters).toBe(0)
  })
})

class FakeWorker extends EventTarget {
  readonly posts: unknown[] = []
  terminations = 0
  postMessage(value: unknown): void { this.posts.push(value) }
  terminate(): void { this.terminations += 1 }
  ready(identity: Readonly<Pick<Stage7V2WorkerReady,
    'buildId' | 'catalogHash' | 'tuningHash'>>): void {
    this.message(frame(readyRecord(identity)))
  }
  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
  fail(): void { this.dispatchEvent(new Event('error')) }
}

function readyRecord(identity: Readonly<Pick<Stage7V2WorkerReady,
  'buildId' | 'catalogHash' | 'tuningHash'>>): Record<string, unknown> {
  return {
    type: 'ready',
    protocolVersion: 1,
    workerInstanceNonce: 'worker-1',
    ...identity,
    supportedPolicies: [
      { id: 'stored-time-fast-v1', version: 1 },
      { id: 'stored-time-balanced-v1', version: 1 },
      { id: 'stored-time-exact-v1', version: 1 },
    ],
    capabilities: {
      moduleWorker: true,
      transferableArrayBuffer: true,
      sharedArrayBuffer: false,
    },
  }
}

function frame(value: unknown): ArrayBuffer {
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  return encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer
}
