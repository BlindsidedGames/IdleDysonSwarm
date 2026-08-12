import { describe, expect, test } from 'vitest'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import {
  type Stage7V2CertificationDiagnostics,
  Stage7V2CertificationHost,
  type Stage7V2CertificationHostStatus,
} from './certificationHost'
import { createStage7V2CertificationUiBinding } from './certificationUiModel'

const READY: Readonly<Stage7V2CertificationDiagnostics> = Object.freeze({
  status: 'ready', requestedSeconds: 0, processedSeconds: 0, computedRawTicks: '0', representativeGroups: 0, durableSeconds: 0,
  remainingSeconds: 0, unconsumedFromDurableCheckpointSeconds: 0, progress: 0,
  elapsedMilliseconds: 0, etaMilliseconds: null, predictedTotalMilliseconds: null,
  checkpoints: 0, cancelRemainingAvailable: false, retryAvailable: false,
  maximumChunkMilliseconds: 0, maximumAtomicEventMilliseconds: 0,
  reloadRequired: false, message: null,
})

describe('Stage 7 certification UI binding', () => {
  test.each([
    ['pause', 'busy', 'Stored Time returned busy. Refresh the status before trying again.'],
    ['cancelRemaining', 'ready', 'Stored Time returned ready. Refresh the status before trying again.'],
    ['retry', 'writer-unavailable', 'Stored Time returned writer unavailable. Refresh the status before trying again.'],
  ] as const)('does not announce %s success for unexpected status %s', async (action, status, expected) => {
    const host = hostDouble({
      pauseStoredTime: async () => Object.freeze({ status }),
      cancelStoredTime: async () => Object.freeze({ status }),
      retryStoredTime: async () => Object.freeze({ status }),
    })
    const binding = createStage7V2CertificationUiBinding(host, () => undefined)
    await binding[action]()
    expect(binding.snapshot().announcement).toBe(expected)
  })

  test('announces only the expected pause, cancel, and retry outcomes', async () => {
    const host = hostDouble({
      pauseStoredTime: async () => Object.freeze({ status: 'paused' }),
      cancelStoredTime: async () => Object.freeze({ status: 'cancelled' }),
      retryStoredTime: async () => Object.freeze({ status: 'started' }),
    })
    const binding = createStage7V2CertificationUiBinding(host, () => undefined)
    await binding.pause()
    expect(binding.snapshot().announcement).toContain('paused at a durable checkpoint')
    await binding.cancelRemaining()
    expect(binding.snapshot().announcement).toContain('refunded from the last durable checkpoint')
    await binding.retry()
    expect(binding.snapshot().announcement).toContain('retry started')
  })

  test('never derives Retry authority from a resumable command result', async () => {
    const host = hostDouble({
      pauseStoredTime: async () => Object.freeze({ status: 'paused' }),
      cancelStoredTime: async () => Object.freeze({ status: 'cancelled' }),
      retryStoredTime: async () => Object.freeze({ status: 'resumable-failure' }),
    })
    const binding = createStage7V2CertificationUiBinding(host, () => undefined)
    await binding.retry()
    expect(binding.snapshot().diagnostics.retryAvailable).toBe(false)
    expect(binding.snapshot().announcement).not.toContain('retry started')
  })
})

function hostDouble(results: Readonly<{
  pauseStoredTime: () => Promise<Readonly<{ readonly status: Stage7V2CertificationHostStatus }>>
  cancelStoredTime: () => Promise<Readonly<{ readonly status: Stage7V2CertificationHostStatus }>>
  retryStoredTime: () => Promise<Readonly<{ readonly status: Stage7V2CertificationHostStatus }>>
}>): Stage7V2CertificationHost {
  const host = Object.create(Stage7V2CertificationHost.prototype) as Stage7V2CertificationHost
  const listeners = new Set<(value: Readonly<Stage7V2CertificationDiagnostics>) => void>()
  Object.defineProperties(host, {
    diagnosticsSnapshot: { value: () => READY },
    subscribeDiagnostics: { value: (listener: (value: Readonly<Stage7V2CertificationDiagnostics>) => void) => {
      listeners.add(listener); return () => listeners.delete(listener)
    } },
    readStoredTimePolicy: { value: async (): Promise<StoredTimePolicyIdV2> => 'stored-time-fast-v1' },
    writeStoredTimePolicy: { value: async () => undefined },
    pauseStoredTime: { value: results.pauseStoredTime },
    cancelStoredTime: { value: results.cancelStoredTime },
    retryStoredTime: { value: results.retryStoredTime },
  })
  return host
}
