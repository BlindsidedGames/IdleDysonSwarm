import {
  useCallback,
  useSyncExternalStore,
} from 'react'
import type {
  FrontendApplicationSnapshot,
} from '../../application/frontendSnapshot'
import type { DeepReadonly } from '../../core/contracts'
import type {
  BrowserUiRuntimeFoundation,
} from './browserRuntimeFoundation'
import type {
  UiRuntimeFoundationStatus,
} from './contracts'
import {
  createIdleStoredTimeJobStatus,
  type StoredTimeJobStatus,
} from '../../workers/storedTime/storedTimeProtocol'

export function useBrowserRuntimeStatus(
  runtime: BrowserUiRuntimeFoundation,
): UiRuntimeFoundationStatus {
  const subscribe = useCallback(
    (listener: () => void) =>
      runtime.subscribeStatus(listener),
    [runtime],
  )
  const getSnapshot = useCallback(
    () => runtime.status(),
    [runtime],
  )
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  )
}

/**
 * Subscribes only after a ready runtime snapshot exists.
 *
 * Wave 3 gameplay surfaces mount this hook beneath the ready status branch;
 * startup UI must not request a snapshot while the runtime is blocked.
 */
export function useBrowserRuntimeSnapshot(
  runtime: BrowserUiRuntimeFoundation,
): DeepReadonly<FrontendApplicationSnapshot> {
  const subscribe = useCallback(
    (listener: () => void) =>
      runtime.subscribeSnapshot(listener),
    [runtime],
  )
  const getSnapshot = useCallback(
    () => runtime.snapshot(),
    [runtime],
  )
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  )
}

const IDLE_STORED_TIME_JOB = createIdleStoredTimeJobStatus()

export function useBrowserStoredTimeJob(
  runtime: BrowserUiRuntimeFoundation,
): StoredTimeJobStatus {
  const subscribe = useCallback(
    (listener: () => void) =>
      runtime.storedTime?.subscribe(listener) ?? (() => undefined),
    [runtime],
  )
  const getSnapshot = useCallback(
    () => runtime.storedTime?.status() ?? IDLE_STORED_TIME_JOB,
    [runtime],
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
