import { useEffect, useSyncExternalStore } from 'react'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import { STORED_TIME_FAST_DISCLOSURE_V2 } from '../../simulation/storedTimePolicyDisclosureV2'
import type { Stage7V2CertificationUiBinding } from './certificationUiModel'
import './stage7V2CertificationPanel.css'

export interface Stage7V2CertificationPanelProps {
  readonly binding: Readonly<Stage7V2CertificationUiBinding>
}

const POLICIES = Object.freeze([
  Object.freeze({
    id: 'stored-time-fast-v1' as const,
    label: 'Fast',
    detail: 'Normalizes long work into no more than 4,096 representative groups.',
  }),
  Object.freeze({
    id: 'stored-time-balanced-v1' as const,
    label: 'Balanced',
    detail: 'Runs every tick for up to 60 seconds, then pauses at the next authentic boundary.',
  }),
  Object.freeze({
    id: 'stored-time-exact-v1' as const,
    label: 'Exact',
    detail: 'Runs every automation tick and reports an estimated completion time.',
  }),
])

export function Stage7V2CertificationPanel({ binding }: Stage7V2CertificationPanelProps) {
  const snapshot = useSyncExternalStore(binding.subscribe, binding.snapshot, binding.snapshot)
  const diagnostics = snapshot.diagnostics

  useEffect(() => {
    void binding.loadPolicy()
  }, [binding])

  const selectPolicy = (policyId: StoredTimePolicyIdV2): void => {
    void binding.selectPolicy(policyId)
  }

  return (
    <main className="stage7-certification" aria-labelledby="stage7-certification-title">
      <header>
        <h1 id="stage7-certification-title">Stored Time</h1>
        <p>Choose how this installation processes saved time. Starting work always requires a separate action.</p>
      </header>

      <section aria-labelledby="stage7-accuracy-title">
        <h2 id="stage7-accuracy-title">Accuracy and processing time</h2>
        <p>Jobs with 4,096 or fewer raw ticks automatically use Exact processing.</p>
        <fieldset disabled={snapshot.actionPending}>
          <legend>Processing policy</legend>
          <div className="stage7-certification__policies">
            {POLICIES.map((policy) => (
              <label key={policy.id}>
                <span>
                  <input
                    type="radio"
                    name="stage7-stored-time-policy"
                    value={policy.id}
                    checked={snapshot.policyId === policy.id}
                    onChange={() => selectPolicy(policy.id)}
                  />
                  <strong>{policy.label}</strong>
                </span>
                <small>{policy.detail}</small>
              </label>
            ))}
          </div>
        </fieldset>
        {snapshot.policyId === 'stored-time-fast-v1' ? (
          <p className="stage7-certification__fast-disclosure" role="note" aria-live="polite">
            {STORED_TIME_FAST_DISCLOSURE_V2.text}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="stage7-progress-title">
        <div className="stage7-certification__section-heading">
          <h2 id="stage7-progress-title">Progress</h2>
          <output aria-live="polite">{statusLabel(diagnostics.status)}</output>
        </div>
        <progress
          aria-label="Stored Time progress"
          max={1}
          value={diagnostics.progress}
        />
        <dl className="stage7-certification__metrics">
          <Metric label="Processed" value={formatSeconds(diagnostics.processedSeconds)} />
          <Metric label="Remaining" value={formatSeconds(diagnostics.remainingSeconds)} />
          <Metric label="Estimated time" value={formatEta(diagnostics.etaMilliseconds)} />
          <Metric label="Checkpoints" value={diagnostics.checkpoints.toLocaleString('en-US')} />
          <Metric label="Raw automation ticks" value={diagnostics.computedRawTicks} />
          <Metric label="Representative groups" value={diagnostics.representativeGroups.toLocaleString('en-US')} />
          <Metric label="Maximum worker chunk" value={`${diagnostics.maximumChunkMilliseconds.toFixed(1)} ms`} />
          <Metric label="Maximum atomic event" value={`${diagnostics.maximumAtomicEventMilliseconds.toFixed(1)} ms`} />
        </dl>
        {diagnostics.message !== null ? <p role="status">{diagnostics.message}</p> : null}
      </section>

      <section aria-labelledby="stage7-controls-title">
        <h2 id="stage7-controls-title">Controls</h2>
        <div className="stage7-certification__controls">
          <button type="button" disabled={snapshot.actionPending || diagnostics.status !== 'started'} onClick={() => void binding.pause()}>
            Pause
          </button>
          {diagnostics.retryAvailable ? (
            <button type="button" disabled={snapshot.actionPending} onClick={() => void binding.retry()}>
              Retry from checkpoint
            </button>
          ) : null}
          {diagnostics.reloadRequired ? (
            <button type="button" disabled={snapshot.actionPending} onClick={binding.reload}>
              Reload saved state
            </button>
          ) : null}
          {diagnostics.cancelRemainingAvailable ? (
            <button className="stage7-certification__cancel" type="button" disabled={snapshot.actionPending} onClick={() => void binding.cancelRemaining()}>
              Cancel Remaining
            </button>
          ) : null}
        </div>
        {diagnostics.cancelRemainingAvailable ? (
          <p className="stage7-certification__refund-note">
            Cancelling refunds {formatSeconds(diagnostics.unconsumedFromDurableCheckpointSeconds)} of unconsumed Stored Time from the last durable checkpoint.
          </p>
        ) : null}
        <p className="stage7-certification__announcement" aria-live="assertive">{snapshot.announcement}</p>
      </section>
    </main>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} seconds`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes.toLocaleString('en-US')}m ${remainder}s`
}

function formatEta(milliseconds: number | null): string {
  return milliseconds === null ? 'Estimating...' : formatSeconds(milliseconds / 1_000)
}

function statusLabel(status: string): string {
  return status.split('-').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ')
}
