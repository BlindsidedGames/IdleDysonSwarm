import { describe, expect, test, vi } from 'vitest'
import { SingleHostSessionWriterAuthority } from './singleHostSessionWriterAuthority'
import { WriterAuthorityLostError } from './writerAuthority'

describe('single-host native writer authority', () => {
  test('survives arbitrary wall-clock jumps and timer absence', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-22T00:00:00.000Z'))
    const setInterval = vi.spyOn(globalThis, 'setInterval')
    const authority = new SingleHostSessionWriterAuthority({
      sessionId: 'native-android',
    })

    await expect(authority.acquire()).resolves.toEqual({ acquired: true })
    vi.setSystemTime(new Date('2126-08-22T00:00:00.000Z'))
    await expect(authority.runAuthoritativeOperation((signal) => {
      expect(signal.sessionId).toBe('native-android')
      expect(signal.generation).toBe(1)
      expect(signal.deadlineUtcMilliseconds).toBeNull()
      return 'committed-after-long-suspension'
    })).resolves.toBe('committed-after-long-suspension')
    expect(authority.isAuthoritative()).toBe(true)
    expect(setInterval).not.toHaveBeenCalled()

    await authority.shutdown()
    setInterval.mockRestore()
    vi.useRealTimers()
  })

  test('keeps a native startup authoritative beyond the browser 15-second lease window', async () => {
    vi.useFakeTimers()
    const authority = new SingleHostSessionWriterAuthority({
      sessionId: 'native-long-startup',
    })
    await authority.acquire()
    const startupGate = deferred<string>()
    const startup = authority.runAuthoritativeOperation(
      () => startupGate.promise,
    )

    await vi.advanceTimersByTimeAsync(60_000)
    expect(authority.isAuthoritative()).toBe(true)
    startupGate.resolve('ready')
    await expect(startup).resolves.toBe('ready')
    await authority.shutdown()
    vi.useRealTimers()
  })

  test('cancels synchronously, drains admitted work, and rejects its late result', async () => {
    const authority = new SingleHostSessionWriterAuthority({
      sessionId: 'native-electron',
    })
    await authority.acquire()
    const operationGate = deferred<string>()
    const operationEntered = deferred<void>()
    let signalCancellation: (() => boolean) | undefined
    const operation = authority.runAuthoritativeOperation((signal) => {
      signalCancellation = signal.cancellationRequested
      operationEntered.resolve()
      return operationGate.promise
    })
    await operationEntered.promise

    const shutdown = authority.shutdown()
    expect(authority.cancellationRequested()).toBe(true)
    expect(signalCancellation?.()).toBe(true)
    let drained = false
    void shutdown.then(() => { drained = true })
    await Promise.resolve()
    expect(drained).toBe(false)

    operationGate.resolve('late-result')
    await expect(operation).rejects.toBeInstanceOf(WriterAuthorityLostError)
    await expect(shutdown).resolves.toBe(true)
  })

  test('rejects stale operations and all work after terminal release', async () => {
    const authority = new SingleHostSessionWriterAuthority({
      sessionId: 'native-ios',
    })
    await authority.acquire()
    await expect(authority.release()).resolves.toBe(true)
    expect(authority.state()).toEqual({ kind: 'released' })
    expect(() => authority.acquire()).toThrow(WriterAuthorityLostError)
    await expect(
      authority.runAuthoritativeOperation(() => 'stale'),
    ).rejects.toBeInstanceOf(WriterAuthorityLostError)
  })

  test('cancels an acquisition that settles after shutdown begins', async () => {
    const authority = new SingleHostSessionWriterAuthority({
      sessionId: 'native-process-restart',
    })
    const acquisition = authority.acquire()
    const shutdown = authority.shutdown()

    await expect(acquisition).rejects.toBeInstanceOf(WriterAuthorityLostError)
    await expect(shutdown).resolves.toBe(false)

    const restarted = new SingleHostSessionWriterAuthority({
      sessionId: 'native-process-restart-2',
    })
    await restarted.acquire()
    expect(restarted.state()).toMatchObject({
      kind: 'writable',
      sessionId: 'native-process-restart-2',
      generation: 1,
    })
    await restarted.shutdown()
  })
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
