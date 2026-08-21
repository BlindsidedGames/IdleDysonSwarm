import { describe, expect, test } from 'vitest'
import {
  CoordinatorActiveTimeDriver,
  type ActiveTimeFrameScheduler,
  type ActiveTimeMonotonicClock,
} from './activeTimeDriver'

describe('coordinator active-time driver', () => {
  test('coalesces frame samples to the default transport cadence without losing elapsed time', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(99)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([])
    clock.set(100)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([100])
    driver.shutdown()
  })

  test('delivers every monotonic millisecond once without treating frames as ticks', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(25)
    frames.fire()
    await flushMicrotasks()

    expect(delivered).toEqual([10, 15])
    expect(delivered.reduce((sum, value) => sum + value, 0)).toBe(25)
    driver.shutdown()
  })

  test('coalesces delayed frames and never overlaps delivery promises', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const deliveries: number[] = []
    const gates = [deferred<void>(), deferred<void>()]
    let concurrent = 0
    let maximumConcurrent = 0
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        const index = deliveries.length
        deliveries.push(milliseconds)
        concurrent += 1
        maximumConcurrent = Math.max(maximumConcurrent, concurrent)
        await gates[index]?.promise
        concurrent -= 1
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(20)
    frames.fire()
    clock.set(30)
    frames.fire()
    await flushMicrotasks()
    expect(deliveries).toEqual([10])

    gates[0]?.resolve()
    await flushMicrotasks()
    expect(deliveries).toEqual([10, 20])
    expect(maximumConcurrent).toBe(1)
    gates[1]?.resolve()
    await flushMicrotasks()
    driver.shutdown()
  })

  test('transfers undelivered foreground residue and resumes from a fresh baseline', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const first = deferred<void>()
    const deliveredResults: number[] = []
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        if (delivered.length === 1) await first.promise
        return milliseconds
      },
      onDelivered: (value) => deliveredResults.push(value),
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(25)
    expect(driver.suspendForLifecycle()).toBe(15)
    first.resolve()
    await flushMicrotasks()
    expect(deliveredResults).toEqual([])

    clock.set(100)
    driver.startForeground()
    clock.set(110)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([10, 10])
    expect(deliveredResults).toEqual([10])
    driver.shutdown()
  })

  test('suppresses late result publication after shutdown', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const gate = deferred<void>()
    const published: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        await gate.promise
        return milliseconds
      },
      onDelivered: (value) => published.push(value),
    })

    driver.startForeground()
    clock.set(5)
    frames.fire()
    await flushMicrotasks()
    driver.shutdown()
    gate.resolve()
    await flushMicrotasks()

    expect(published).toEqual([])
    expect(frames.pending).toBe(0)
  })
})

class ManualMonotonicClock implements ActiveTimeMonotonicClock {
  private current = 0

  nowMilliseconds(): number {
    return this.current
  }

  set(value: number): void {
    this.current = value
  }
}

class ManualFrameScheduler implements ActiveTimeFrameScheduler {
  private callbacks = new Map<number, () => void>()
  private nextHandle = 1

  get pending(): number {
    return this.callbacks.size
  }

  requestFrame(callback: () => void): unknown {
    const handle = this.nextHandle
    this.nextHandle += 1
    this.callbacks.set(handle, callback)
    return handle
  }

  cancelFrame(handle: unknown): void {
    if (typeof handle === 'number') this.callbacks.delete(handle)
  }

  fire(): void {
    const callback = this.callbacks.entries().next().value as
      | [number, () => void]
      | undefined
    if (callback === undefined) {
      throw new Error('No animation frame was scheduled.')
    }
    this.callbacks.delete(callback[0])
    callback[1]()
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T | PromiseLike<T>): void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {
    promise,
    resolve: (value) => resolve(value as T),
  }
}

async function flushMicrotasks(): Promise<void> {
  for (let pass = 0; pass < 8; pass += 1) {
    await Promise.resolve()
  }
}
