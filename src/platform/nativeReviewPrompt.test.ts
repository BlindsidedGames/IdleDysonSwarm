import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { DeepReadonly } from '../core/contracts'
import type { FrontendApplicationSnapshot } from '../application/frontendSnapshot'
import type { LifecyclePhase } from './contracts'
import {
  NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS,
  NativeReviewPromptCoordinator,
  type NativeReviewDocumentPort,
  type NativeReviewRuntimePort,
} from './nativeReviewPrompt'

type ReviewSnapshot = DeepReadonly<FrontendApplicationSnapshot>

describe('native review prompt coordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('waits for the second Infinity and a complete idle pause', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()

    await vi.advanceTimersByTimeAsync(60_000)
    expect(harness.requestStoreReview).not.toHaveBeenCalled()

    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(
      NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS - 1,
    )
    expect(harness.requestStoreReview).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })

  test('restarts the idle pause after player input', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()
    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(14_000)
    harness.document.dispatchEvent(new Event('pointerdown'))

    await vi.advanceTimersByTimeAsync(14_999)
    expect(harness.requestStoreReview).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })

  test('treats every later Infinity as active play and waits again', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()
    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(10_000)
    harness.runtime.publish(3n)

    await vi.advanceTimersByTimeAsync(14_999)
    expect(harness.requestStoreReview).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })

  test('does not prompt while backgrounded and waits after resuming', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()
    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(10_000)
    harness.bridge.publishLifecycle('background')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(harness.requestStoreReview).not.toHaveBeenCalled()

    harness.bridge.publishLifecycle('active')
    await vi.advanceTimersByTimeAsync(14_999)
    expect(harness.requestStoreReview).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })

  test('cancels eligibility when a reset or import drops progression', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()
    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(10_000)
    harness.runtime.publish(0n)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(harness.requestStoreReview).not.toHaveBeenCalled()
  })

  test('makes at most one request in a running session', async () => {
    const harness = createHarness(1n)
    harness.coordinator.start()
    harness.runtime.publish(2n)
    await vi.advanceTimersByTimeAsync(
      NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS,
    )
    harness.runtime.publish(3n)
    harness.document.dispatchEvent(new Event('keydown'))
    await vi.advanceTimersByTimeAsync(60_000)

    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })

  test('does not prompt merely because an experienced player opened the app', async () => {
    const harness = createHarness(20n)
    harness.coordinator.start()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(harness.requestStoreReview).not.toHaveBeenCalled()

    harness.runtime.publish(21n)
    await vi.advanceTimersByTimeAsync(
      NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS,
    )
    expect(harness.requestStoreReview).toHaveBeenCalledOnce()
  })
})

function createHarness(initialInfinityCount: bigint) {
  const runtime = new FakeReviewRuntime(initialInfinityCount)
  const document = new FakeReviewDocument()
  const requestStoreReview = vi.fn(async () => ({
    requested: true as const,
    reason: 'requested' as const,
  }))
  const bridge = new FakeReviewBridge(requestStoreReview)
  const coordinator = new NativeReviewPromptCoordinator({
    runtime,
    bridge,
    documentPort: document,
    clock: {
      now: () => Date.now(),
      schedule: (callback, milliseconds) =>
        setTimeout(callback, milliseconds),
      cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
  })
  return {
    runtime,
    document,
    bridge,
    coordinator,
    requestStoreReview,
  }
}

class FakeReviewRuntime implements NativeReviewRuntimePort {
  private current: ReviewSnapshot
  private readonly listeners = new Set<(snapshot: ReviewSnapshot) => void>()

  constructor(infinityCount: bigint) {
    this.current = reviewSnapshot(infinityCount)
  }

  snapshot(): ReviewSnapshot {
    return this.current
  }

  subscribeSnapshot(listener: (snapshot: ReviewSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish(infinityCount: bigint): void {
    this.current = reviewSnapshot(infinityCount)
    for (const listener of this.listeners) listener(this.current)
  }
}

class FakeReviewDocument extends EventTarget
  implements NativeReviewDocumentPort {
  visibilityState: DocumentVisibilityState = 'visible'
}

class FakeReviewBridge {
  private phase: LifecyclePhase = 'active'
  private readonly listeners = new Set<(phase: LifecyclePhase) => void>()

  constructor(
    readonly requestStoreReview: () => Promise<{
      requested: true
      reason: 'requested'
    }>,
  ) {}

  currentLifecyclePhase(): LifecyclePhase {
    return this.phase
  }

  subscribeLifecycle(listener: (phase: LifecyclePhase) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publishLifecycle(phase: LifecyclePhase): void {
    this.phase = phase
    for (const listener of this.listeners) listener(phase)
  }
}

function reviewSnapshot(infinityCount: bigint): ReviewSnapshot {
  return {
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision: { session: 1, state: 1, durable: 1 },
    checkpoint: { revision: 1, status: 'clean' },
    operation: { kind: 'idle' },
    gameplay: {
      progression: {
        statistics: {
          lifetime: {
            ordinaryInfinityCount: infinityCount,
            breakInfinityCount: 0n,
          },
        },
      },
    },
  } as unknown as ReviewSnapshot
}
