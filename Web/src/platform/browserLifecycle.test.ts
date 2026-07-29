import { describe, expect, test } from 'vitest'
import {
  BrowserLifecycleAdapter,
  BrowserLifecycleUtcClock,
  BrowserMonotonicClock,
} from './browserLifecycle'
import { PeriodicCheckpointScheduler } from './periodicCheckpoint'
import { resolveAwayTime } from '../simulation/timeResources'

describe('browser lifecycle and monotonic clock', () => {
  test('maps visibility, focus, page-hide, and page-show without duplicate phases', () => {
    const documentPort = new TestDocument()
    const windowPort = new EventTarget()
    const adapter = new BrowserLifecycleAdapter(
      documentPort,
      windowPort,
    )
    const phases: string[] = []
    expect(adapter.currentPhase()).toBe('active')
    const unsubscribe = adapter.subscribe((phase) => {
      phases.push(phase)
    })

    documentPort.focused = false
    windowPort.dispatchEvent(new Event('blur'))
    windowPort.dispatchEvent(new Event('blur'))
    documentPort.focused = true
    windowPort.dispatchEvent(new Event('focus'))
    documentPort.visibilityState = 'hidden'
    expect(adapter.currentPhase()).toBe('background')
    documentPort.dispatchEvent(new Event('visibilitychange'))
    windowPort.dispatchEvent(new Event('blur'))
    windowPort.dispatchEvent(new Event('pagehide'))
    documentPort.visibilityState = 'visible'
    windowPort.dispatchEvent(new Event('pageshow'))
    expect(adapter.currentPhase()).toBe('active')

    expect(phases).toEqual([
      'focus-lost',
      'active',
      'background',
      'terminating',
      'active',
    ])

    unsubscribe()
    windowPort.dispatchEvent(new Event('blur'))
    expect(phases).toHaveLength(5)
  })

  test('keeps foreground elapsed monotonic without using it as lifecycle UTC', () => {
    const monotonic = mutableNumber(100)
    const clock = new BrowserMonotonicClock(monotonic)

    monotonic.set(150)
    expect(clock.nowMilliseconds()).toBe(150)

    monotonic.set(125)
    expect(clock.nowMilliseconds()).toBe(150)
  })

  test('passes current wall UTC through suspension and backward movement for canonical integrity checks', () => {
    const wall = mutableNumber(1_000)
    const clock = new BrowserLifecycleUtcClock(wall)

    expect(clock.sample()).toEqual({
      utcMilliseconds: 1_000,
      serializedUtcText: '1970-01-01T00:00:01.000Z',
    })
    wall.set(61_000)
    expect(clock.sample().utcMilliseconds).toBe(61_000)
    wall.set(20)
    const rollbackSample = clock.sample()
    expect(rollbackSample).toEqual({
      utcMilliseconds: 20,
      serializedUtcText: '1970-01-01T00:00:00.020Z',
    })
    expect(
      resolveAwayTime({
        nowUtcMilliseconds: rollbackSample.utcMilliseconds,
        quitTimestamp: {
          status: 'valid',
          utcMilliseconds: 61_000,
        },
        startedTimestamp: { status: 'missing' },
      }),
    ).toMatchObject({
      rawSeconds: -60.98,
      grantedSeconds: 0,
      cheater: true,
    })
  })

  test('coalesces overlapping periodic checkpoint requests inside the 30-second bound', async () => {
    let dirty = true
    let checkpoints = 0
    let finish: ((value: { readonly committed: true }) => void) | undefined
    const pending = new Promise<{ readonly committed: true }>(
      (resolve) => {
        finish = resolve
      },
    )
    const scheduler = new PeriodicCheckpointScheduler({
      intervalMilliseconds: 30_000,
      port: {
        isDirty: () => dirty,
        checkpoint: () => {
          checkpoints += 1
          return pending
        },
      },
    })

    const first = scheduler.requestCheckpoint()
    const second = scheduler.requestCheckpoint()
    expect(first).toBe(second)
    expect(checkpoints).toBe(1)

    dirty = false
    finish!({ committed: true })
    await first
    await Promise.resolve()
    expect(checkpoints).toBe(1)
  })

  test('stop cancels a queued checkpoint and orderly shutdown drains the in-flight one', async () => {
    let checkpoints = 0
    let finish: ((value: { readonly committed: true }) => void) | undefined
    const pending = new Promise<{ readonly committed: true }>(
      (resolve) => {
        finish = resolve
      },
    )
    const scheduler = new PeriodicCheckpointScheduler({
      port: {
        isDirty: () => true,
        checkpoint: () => {
          checkpoints += 1
          return pending
        },
      },
    })

    const first = scheduler.requestCheckpoint()
    scheduler.requestCheckpoint()
    scheduler.stop()
    const shutdown = scheduler.shutdown()
    finish!({ committed: true })

    await first
    await shutdown
    await Promise.resolve()
    expect(checkpoints).toBe(1)
    await expect(scheduler.requestCheckpoint()).resolves.toBe(false)
  })
})

class TestDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible'
  focused = true

  hasFocus(): boolean {
    return this.focused
  }
}

function mutableNumber(initial: number): {
  now(): number
  set(value: number): void
} {
  let current = initial
  return {
    now: () => current,
    set: (value) => {
      current = value
    },
  }
}
