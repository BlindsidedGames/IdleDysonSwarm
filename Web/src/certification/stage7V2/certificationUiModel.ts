import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import {
  type Stage7V2CertificationDiagnostics,
  Stage7V2CertificationHost,
  type Stage7V2CertificationHostStatus,
} from './certificationHost'

export interface Stage7V2CertificationUiSnapshot {
  readonly diagnostics: Readonly<Stage7V2CertificationDiagnostics>
  readonly policyId: StoredTimePolicyIdV2
  readonly actionPending: boolean
  readonly announcement: string
}

export interface Stage7V2CertificationUiBinding {
  snapshot(): Readonly<Stage7V2CertificationUiSnapshot>
  subscribe(listener: () => void): () => void
  loadPolicy(): Promise<void>
  selectPolicy(policyId: StoredTimePolicyIdV2): Promise<void>
  pause(): Promise<void>
  cancelRemaining(): Promise<void>
  retry(): Promise<void>
  reload(): void
}

export function createStage7V2CertificationUiBinding(
  host: Stage7V2CertificationHost,
  reload: () => void,
): Readonly<Stage7V2CertificationUiBinding> {
  if (!(host instanceof Stage7V2CertificationHost) || typeof reload !== 'function') {
    throw new TypeError('Stage 7 certification UI binding options are invalid.')
  }
  let snapshot: Readonly<Stage7V2CertificationUiSnapshot> = Object.freeze({
    diagnostics: host.diagnosticsSnapshot(),
    policyId: 'stored-time-fast-v1',
    actionPending: false,
    announcement: '',
  })
  const listeners = new Set<() => void>()
  const publish = (next: Readonly<Stage7V2CertificationUiSnapshot>): void => {
    snapshot = next
    for (const listener of listeners) listener()
  }
  const update = (values: Partial<Stage7V2CertificationUiSnapshot>): void => {
    publish(Object.freeze({ ...snapshot, ...values }))
  }
  host.subscribeDiagnostics((diagnostics) => update({ diagnostics }))

  const action = async (
    operation: () => Promise<{ readonly status: Stage7V2CertificationHostStatus; readonly error?: string }>,
    expectedStatus: Stage7V2CertificationHostStatus,
    success: string,
  ): Promise<void> => {
    if (snapshot.actionPending) return
    update({ actionPending: true, announcement: '' })
    try {
      const result = await operation()
      const announcement = result.error !== undefined
        ? boundedUiText(result.error)
        : result.status === expectedStatus
          ? success
          : `Stored Time returned ${humanizeStatus(result.status)}. Refresh the status before trying again.`
      update({
        actionPending: false,
        announcement,
        diagnostics: host.diagnosticsSnapshot(),
      })
    } catch (error) {
      update({
        actionPending: false,
        announcement: boundedUiText(error instanceof Error ? error.message : String(error)),
      })
    }
  }

  return Object.freeze({
    snapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (typeof listener !== 'function') throw new TypeError('Stage 7 UI listener is invalid.')
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async loadPolicy(): Promise<void> {
      try {
        update({ policyId: await host.readStoredTimePolicy() })
      } catch {
        update({ policyId: 'stored-time-fast-v1', announcement: 'Fast is selected because the saved preference could not be read.' })
      }
    },
    async selectPolicy(policyId: StoredTimePolicyIdV2): Promise<void> {
      if (snapshot.actionPending || policyId === snapshot.policyId) return
      update({ actionPending: true, announcement: '' })
      try {
        await host.writeStoredTimePolicy(policyId)
        update({ policyId, actionPending: false, announcement: 'Accuracy preference saved on this installation.' })
      } catch (error) {
        update({ actionPending: false, announcement: boundedUiText(error instanceof Error ? error.message : String(error)) })
      }
    },
    pause: () => action(
      () => host.pauseStoredTime(),
      'paused',
      'Stored Time paused at a durable checkpoint.',
    ),
    cancelRemaining: () => action(
      () => host.cancelStoredTime(),
      'cancelled',
      'Remaining work cancelled. Unconsumed Stored Time was refunded from the last durable checkpoint.',
    ),
    retry: () => action(
      () => host.retryStoredTime(),
      'started',
      'Stored Time retry started from the last durable checkpoint.',
    ),
    reload,
  })
}

function boundedUiText(value: string): string {
  const text = removeControlCharacters(value).trim()
  return text.length <= 160 ? text : `${text.slice(0, 157)}...`
}

function humanizeStatus(value: string): string {
  return value.replaceAll('-', ' ')
}

function removeControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127 ? ' ' : character
  }).join('')
}
