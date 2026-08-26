import { describe, expect, test } from 'vitest'
import {
  CoordinatorActiveTimeDriver,
  MAXIMUM_FIXED_CADENCE_BURST_DELIVERIES,
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
    clock.set(32)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([])
    clock.set(33)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([33])
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

  test('delivers delayed foreground time as exact gameplay ticks when configured', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 33,
      fixedDeliveryCadence: true,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(100)
    frames.fire()
    await flushMicrotasks()

    expect(delivered).toEqual([33, 33, 33])
    expect(driver.suspendForLifecycle().activeMilliseconds).toBe(1)
    driver.shutdown()
  })

  test('yields fixed-cadence backlog after a bounded delivery burst', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 10,
      fixedDeliveryCadence: true,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(250)
    frames.fire()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()

    expect(delivered).toHaveLength(MAXIMUM_FIXED_CADENCE_BURST_DELIVERIES)
    expect(new Set(delivered)).toEqual(new Set([10]))
    expect(frames.pending).toBe(1)

    frames.fire()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()
    expect(delivered).toHaveLength(
      MAXIMUM_FIXED_CADENCE_BURST_DELIVERIES * 2,
    )

    frames.fire()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()
    frames.fire()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()
    expect(delivered).toHaveLength(25)
    expect(driver.suspendForLifecycle().activeMilliseconds).toBe(0)
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
    expect(driver.suspendForLifecycle()).toMatchObject({
      activeMilliseconds: 15,
      hibernationMilliseconds: 0,
    })
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

  test('banks a visible hibernation gap instead of advancing active gameplay', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const hibernations: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 33,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
      onHibernation: (milliseconds) => hibernations.push(milliseconds),
    })

    driver.startForeground()
    clock.set(60_001)
    frames.fire()
    await flushMicrotasks()

    expect(hibernations).toEqual([60_001])
    expect(delivered).toEqual([])
    driver.shutdown()
  })

  test('transfers a visible hibernation gap during lifecycle suspension', () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      deliver: async (milliseconds) => milliseconds,
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(60_001)

    expect(driver.suspendForLifecycle()).toMatchObject({
      activeMilliseconds: 0,
      hibernationMilliseconds: 60_001,
    })
    driver.shutdown()
  })

  test('requeues the unconsumed tail of a resolved active delivery', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return { remainingMilliseconds: delivered.length === 1 ? 4 : 0 }
      },
      undeliveredMilliseconds: (result) => result.remainingMilliseconds,
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()

    expect(delivered).toEqual([10])
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([10, 4])
    driver.shutdown()
  })

  test('defers persistent rejected deliveries to later scheduled samples', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        throw new Error('Scripted persistent rejection.')
      },
      onDelivered: () => undefined,
      onFailure: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([10])

    await flushMicrotasks()
    expect(delivered).toEqual([10])
    frames.fire()
    await flushMicrotasks()
    expect(delivered).toEqual([10, 10])
    driver.shutdown()
  })

  test('transfers a delayed in-flight tail through the suspension fence', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const gate = deferred<{ remainingMilliseconds: number }>()
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: () => gate.promise,
      undeliveredMilliseconds: (result) => result.remainingMilliseconds,
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    const suspended = driver.suspendForLifecycle()
    expect(suspended.hasInFlightDelivery).toBe(true)

    gate.resolve({ remainingMilliseconds: 4 })
    await expect(suspended.inFlightResidue).resolves.toEqual({
      activeMilliseconds: 4,
      hibernationMilliseconds: 0,
    })
    driver.shutdown()
  })

  test('gives a re-entrant suspension sole ownership of a partial tail', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    let suspended: ReturnType<CoordinatorActiveTimeDriver<{
      remainingMilliseconds: number
    }>['suspendForLifecycle']> | undefined
    let driver!: CoordinatorActiveTimeDriver<{
      remainingMilliseconds: number
    }>
    driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async () => ({ remainingMilliseconds: 4 }),
      undeliveredMilliseconds: (result) => result.remainingMilliseconds,
      onDelivered: () => {
        suspended = driver.suspendForLifecycle()
      },
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()

    expect(suspended).toBeDefined()
    expect(suspended?.activeMilliseconds).toBe(4)
    await expect(suspended?.inFlightResidue).resolves.toEqual({
      activeMilliseconds: 0,
      hibernationMilliseconds: 0,
    })
    driver.shutdown()
  })

  test('gives a re-entrant suspension sole ownership of a rejected delivery', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    let suspended: ReturnType<CoordinatorActiveTimeDriver<number>['suspendForLifecycle']> | undefined
    let driver!: CoordinatorActiveTimeDriver<number>
    driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async () => {
        throw new Error('Scripted rejection.')
      },
      onDelivered: () => undefined,
      onFailure: () => {
        suspended = driver.suspendForLifecycle()
      },
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()

    expect(suspended?.activeMilliseconds).toBe(10)
    await expect(suspended?.inFlightResidue).resolves.toEqual({
      activeMilliseconds: 0,
      hibernationMilliseconds: 0,
    })
    driver.shutdown()
  })

  test('gives a re-entrant suspension sole ownership of failed hibernation', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    let suspended: ReturnType<CoordinatorActiveTimeDriver<number>['suspendForLifecycle']> | undefined
    let driver!: CoordinatorActiveTimeDriver<number>
    driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      deliver: async (milliseconds) => milliseconds,
      onDelivered: () => undefined,
      onHibernation: async () => {
        throw new Error('Scripted hibernation rejection.')
      },
      onFailure: () => {
        suspended = driver.suspendForLifecycle()
      },
    })

    driver.startForeground()
    clock.set(60_001)
    frames.fire()
    await flushMicrotasks()

    expect(suspended?.hibernationMilliseconds).toBe(60_001)
    await expect(suspended?.inFlightResidue).resolves.toEqual({
      activeMilliseconds: 0,
      hibernationMilliseconds: 0,
    })
    driver.shutdown()
  })

  test('does not requeue consumed time when result publication throws', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const failures: unknown[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => {
        throw new Error('Scripted publication failure.')
      },
      onFailure: (error) => failures.push(error),
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    frames.fire()
    await flushMicrotasks()

    expect(delivered).toEqual([10])
    expect(failures).toHaveLength(1)
    driver.shutdown()
  })

  test('does not continue queued delivery while paused behind an in-flight result', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const gate = deferred<void>()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        if (delivered.length === 1) await gate.promise
        return milliseconds
      },
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(25)
    driver.pauseForeground()
    gate.resolve()
    await flushMicrotasks()

    expect(delivered).toEqual([10])
    const suspended = driver.suspendForLifecycle()
    expect(suspended.activeMilliseconds).toBe(15)
    driver.shutdown()
  })

  test('retains in-flight ownership across pause and resume', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const gate = deferred<{ remainingMilliseconds: number }>()
    const delivered: number[] = []
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 1,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        if (delivered.length === 1) return gate.promise
        return { remainingMilliseconds: 0 }
      },
      undeliveredMilliseconds: (result) => result.remainingMilliseconds,
      onDelivered: () => undefined,
    })

    driver.startForeground()
    clock.set(10)
    frames.fire()
    await flushMicrotasks()
    clock.set(25)
    driver.pauseForeground()
    driver.startForeground()
    gate.resolve({ remainingMilliseconds: 4 })
    await flushMicrotasks()
    frames.fire()
    await flushMicrotasks()

    expect(delivered).toEqual([10, 19])
    driver.shutdown()
  })

  test('retries a rejected visible hibernation without double-crediting it', async () => {
    const clock = new ManualMonotonicClock()
    const frames = new ManualFrameScheduler()
    const delivered: number[] = []
    const failures: unknown[] = []
    const attempts: number[] = []
    let creditedMilliseconds = 0
    const driver = new CoordinatorActiveTimeDriver({
      clock,
      scheduler: frames,
      minimumDeliveryMilliseconds: 33,
      deliver: async (milliseconds) => {
        delivered.push(milliseconds)
        return milliseconds
      },
      onDelivered: () => undefined,
      onFailure: (error) => failures.push(error),
      onHibernation: async (milliseconds) => {
        attempts.push(milliseconds)
        if (attempts.length === 1) {
          throw new Error('Scripted hibernation commit failure.')
        }
        creditedMilliseconds += milliseconds
      },
    })

    driver.startForeground()
    clock.set(60_001)
    frames.fire()
    await flushMicrotasks()

    expect(attempts).toEqual([60_001])
    expect(failures).toHaveLength(1)
    expect(creditedMilliseconds).toBe(0)
    expect(delivered).toEqual([])

    clock.set(60_011)
    frames.fire()
    await flushMicrotasks()

    expect(attempts).toEqual([60_001, 60_001])
    expect(creditedMilliseconds).toBe(60_001)
    expect(delivered).toEqual([])

    clock.set(60_034)
    frames.fire()
    await flushMicrotasks()

    expect(attempts).toEqual([60_001, 60_001])
    expect(creditedMilliseconds).toBe(60_001)
    expect(delivered).toEqual([33])
    driver.shutdown()
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
