import { describe, expect, test } from 'vitest'
import {
  Stage7V2BrowserWriterLeaseManager,
  Stage7V2NativeWriterLeaseManager,
  Stage7V2WriterLeaseUnavailableError,
} from './writerLease'

describe('Stage 7 V2 writer lease', () => {
  test('holds one native writer across the full asynchronous operation and releases on failure', async () => {
    const manager = new Stage7V2NativeWriterLeaseManager('native-owner')
    let release!: () => void
    const held = manager.runExclusive(async (lease) => {
      expect(lease).toEqual({ ownerId: 'native-owner', generation: 1 })
      await new Promise<void>((resolve) => { release = resolve })
      throw new Error('injected')
    })
    await expect(manager.runExclusive(async () => undefined)).rejects.toBeInstanceOf(
      Stage7V2WriterLeaseUnavailableError,
    )
    release()
    await expect(held).rejects.toThrow('injected')
    await expect(manager.runExclusive(async (lease) => lease.generation)).resolves.toBe(1)
  })

  test('enforces one native writer across separately constructed managers', async () => {
    const first = new Stage7V2NativeWriterLeaseManager('native-a')
    const second = new Stage7V2NativeWriterLeaseManager('native-b')
    let release!: () => void
    const held = first.runExclusive(async () => {
      await new Promise<void>((resolve) => { release = resolve })
    })
    await expect(second.runExclusive(async () => undefined)).rejects.toBeInstanceOf(
      Stage7V2WriterLeaseUnavailableError,
    )
    release()
    await held
    await expect(second.runExclusive(async () => 'released')).resolves.toBe('released')
  })

  test('uses the browser storage-level lock across independent tab owners', async () => {
    const locks = new FakeBrowserLocks()
    const first = new Stage7V2BrowserWriterLeaseManager('same-build', 'tab-a', locks)
    const second = new Stage7V2BrowserWriterLeaseManager('same-build', 'tab-b', locks)
    let release!: () => void
    const held = first.runExclusive(async (lease) => {
      expect(lease.ownerId).toBe('tab-a')
      await new Promise<void>((resolve) => { release = resolve })
      return 'done'
    })
    await locks.entered
    await expect(second.runExclusive(async () => 'wrong')).rejects.toBeInstanceOf(
      Stage7V2WriterLeaseUnavailableError,
    )
    release()
    await expect(held).resolves.toBe('done')
    await expect(second.runExclusive(async (lease) => lease.ownerId)).resolves.toBe('tab-b')
    expect(locks.names).toEqual([
      'stage7-v2-certification/same-build/host-writer',
      'stage7-v2-certification/same-build/host-writer',
      'stage7-v2-certification/same-build/host-writer',
    ])
  })

  test('rejects accessors and invalid operations without invoking hostile getters', async () => {
    let getters = 0
    const hostile = Object.defineProperty({}, 'request', {
      enumerable: true,
      get: () => { getters += 1; return () => undefined },
    })
    expect(() => new Stage7V2BrowserWriterLeaseManager('build', 'owner', hostile)).toThrow()
    expect(getters).toBe(0)
    const manager = new Stage7V2NativeWriterLeaseManager('owner')
    await expect(manager.runExclusive(null as never)).rejects.toThrow()
  })
})

class FakeBrowserLocks {
  readonly names: string[] = []
  readonly entered: Promise<void>
  #resolveEntered!: () => void
  #held = false

  constructor() {
    this.entered = new Promise((resolve) => { this.#resolveEntered = resolve })
  }

  async request<T>(
    name: string,
    _options: Readonly<{ mode: 'exclusive'; ifAvailable: true }>,
    callback: (lock: unknown | null) => Promise<T>,
  ): Promise<T> {
    this.names.push(name)
    if (this.#held) return callback(null)
    this.#held = true
    this.#resolveEntered()
    try {
      return await callback(Object.freeze({ name }))
    } finally {
      this.#held = false
    }
  }
}
