import { describe, expect, test, vi } from 'vitest'
import type { UiRuntimeFoundationStatus } from './contracts'
import { prepareRuntimeForSafeReload } from './safeReload'

function runtime(status: UiRuntimeFoundationStatus, checkpointed = true) {
  return {
    status: vi.fn(() => status),
    checkpointBeforeSafeReload: vi.fn(async () => checkpointed),
    shutdown: vi.fn(async () => undefined),
  }
}

describe('safe reload preparation', () => {
  test('checkpoints a ready runtime before shutdown', async () => {
    const subject = runtime({ phase: 'ready', warnings: [] })

    await prepareRuntimeForSafeReload(subject)

    expect(subject.checkpointBeforeSafeReload).toHaveBeenCalledOnce()
    expect(subject.shutdown).toHaveBeenCalledOnce()
  })

  test('rejects a failed ready checkpoint without shutdown', async () => {
    const subject = runtime({ phase: 'ready', warnings: [] }, false)

    await expect(prepareRuntimeForSafeReload(subject)).rejects.toThrow(
      'Safe reload requires a verified checkpoint.',
    )
    expect(subject.shutdown).not.toHaveBeenCalled()
  })

  test.each([
    { phase: 'blocked', code: 'startup-failed', reason: 'blocked' },
    { phase: 'ownership-lost', reason: 'lost' },
  ] satisfies UiRuntimeFoundationStatus[])(
    'shuts down a $phase runtime without another checkpoint',
    async (status) => {
      const subject = runtime(status)

      await prepareRuntimeForSafeReload(subject)

      expect(subject.checkpointBeforeSafeReload).not.toHaveBeenCalled()
      expect(subject.shutdown).toHaveBeenCalledOnce()
    },
  )

  test.each([
    'idle',
    'starting',
    'stopping',
    'stopped',
  ] as const)('rejects the %s phase', async (phase) => {
    const subject = runtime({ phase })

    await expect(prepareRuntimeForSafeReload(subject)).rejects.toThrow(
      `Safe reload is unavailable while the runtime is ${phase}.`,
    )
    expect(subject.checkpointBeforeSafeReload).not.toHaveBeenCalled()
    expect(subject.shutdown).not.toHaveBeenCalled()
  })
})
