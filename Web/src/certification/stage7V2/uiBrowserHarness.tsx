import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import type { Stage7V2CertificationDiagnostics } from './certificationHost'
import { Stage7V2CertificationPanel } from './Stage7V2CertificationPanel'
import type {
  Stage7V2CertificationUiBinding,
  Stage7V2CertificationUiSnapshot,
} from './certificationUiModel'

declare global {
  interface Window {
    stage7CertificationHarness: Readonly<{
      workerConstructions(): number
      actionCount(action: string): number
      showLongJob(): void
      showRetryFailure(): void
      showUpdateFailure(): void
    }>
  }
}

const NativeWorker = globalThis.Worker
let workerConstructions = 0
if (NativeWorker !== undefined) {
  globalThis.Worker = class extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options)
      workerConstructions += 1
    }
  }
}

const READY: Readonly<Stage7V2CertificationDiagnostics> = Object.freeze({
  status: 'ready', requestedSeconds: 0, processedSeconds: 0, computedRawTicks: '0', representativeGroups: 0, durableSeconds: 0,
  remainingSeconds: 0, unconsumedFromDurableCheckpointSeconds: 0, progress: 0,
  elapsedMilliseconds: 0, etaMilliseconds: null, predictedTotalMilliseconds: null,
  checkpoints: 0, cancelRemainingAvailable: false, retryAvailable: false,
  maximumChunkMilliseconds: 0, maximumAtomicEventMilliseconds: 0,
  reloadRequired: false, message: null,
})
let snapshot: Readonly<Stage7V2CertificationUiSnapshot> = Object.freeze({
  diagnostics: READY,
  policyId: 'stored-time-fast-v1',
  actionPending: false,
  announcement: '',
})
const listeners = new Set<() => void>()
const counts = new Map<string, number>()
const publish = (values: Partial<Stage7V2CertificationUiSnapshot>): void => {
  snapshot = Object.freeze({ ...snapshot, ...values })
  for (const listener of listeners) listener()
}
const count = (action: string): void => {
  counts.set(action, (counts.get(action) ?? 0) + 1)
}

const binding: Readonly<Stage7V2CertificationUiBinding> = Object.freeze({
  snapshot: () => snapshot,
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
  async loadPolicy() {
    count('load-policy')
    const value = localStorage.getItem('stage7-ui-policy')
    if (value === 'stored-time-fast-v1' || value === 'stored-time-balanced-v1' || value === 'stored-time-exact-v1') {
      publish({ policyId: value })
    }
  },
  async selectPolicy(policyId: StoredTimePolicyIdV2) {
    count('select-policy')
    localStorage.setItem('stage7-ui-policy', policyId)
    publish({ policyId, announcement: 'Accuracy preference saved on this installation.' })
  },
  async pause() { count('pause') },
  async cancelRemaining() {
    count('cancel')
    publish({ diagnostics: Object.freeze({ ...READY, status: 'cancelled' }), announcement: 'Remaining work cancelled. Unconsumed Stored Time was refunded from the last durable checkpoint.' })
  },
  async retry() {
    count('retry')
    publish({ diagnostics: Object.freeze({ ...READY, status: 'started' }), announcement: 'Stored Time retry started from the last durable checkpoint.' })
  },
  reload() { count('reload') },
})

window.stage7CertificationHarness = Object.freeze({
  workerConstructions: () => workerConstructions,
  actionCount: (action: string) => counts.get(action) ?? 0,
  showLongJob() {
    publish({ diagnostics: Object.freeze({
      ...READY, status: 'started', requestedSeconds: 20, processedSeconds: 4,
      durableSeconds: 3, remainingSeconds: 16,
      unconsumedFromDurableCheckpointSeconds: 17, progress: 0.2,
      elapsedMilliseconds: 5_000, etaMilliseconds: 1_100,
      predictedTotalMilliseconds: 6_100, checkpoints: 2,
      cancelRemainingAvailable: true,
    }) })
  },
  showRetryFailure() {
    publish({ diagnostics: Object.freeze({
      ...READY, status: 'resumable-failure', retryAvailable: true,
      message: 'Worker update could not be loaded. Durable progress is safe.',
    }) })
  },
  showUpdateFailure() {
    publish({ diagnostics: Object.freeze({
      ...READY, status: 'reload-required', reloadRequired: true,
      message: 'A newer saved state is available.',
    }) })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode><Stage7V2CertificationPanel binding={binding} /></StrictMode>,
)
document.documentElement.dataset.stage7UiReady = 'true'
