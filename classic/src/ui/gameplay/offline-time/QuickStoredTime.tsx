import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { useIntl } from 'react-intl'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult, UiRuntimeStoredTimeControls } from '../../runtime'
import type { StoredTimeFirstDisasterDialogBatch } from './OfflineTimeSurface'
import { offlineTimeMessages as messages } from './messages'

const NO_JOB_SUBSCRIPTION = () => () => undefined
const IDLE = () => false
const AMOUNTS = [[60, '1 M'], [600, '10 M'], [3600, '1 HR']] as const

export function QuickStoredTime({ availableSeconds, disabled, dispatchPlayer, storedTime, onFirstDisasters }: {
  readonly availableSeconds: number
  readonly disabled: boolean
  readonly dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>
  readonly storedTime?: UiRuntimeStoredTimeControls
  readonly onFirstDisasters: (batch: StoredTimeFirstDisasterDialogBatch) => void
}) {
  const intl = useIntl()
  const subscribe = useCallback((listener: () => void) => storedTime?.subscribe(listener) ?? NO_JOB_SUBSCRIPTION(), [storedTime])
  const readBusy = useCallback(() => storedTime !== undefined && storedTime.status().kind !== 'idle', [storedTime])
  const jobActive = useSyncExternalStore(subscribe, readBusy, IDLE)
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const spend = async (requestedSeconds: number) => {
    if (pendingRef.current || jobActive || disabled || availableSeconds < requestedSeconds) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'time.request-stored-time-spend', requestedSeconds })
      if ((result.status === 'accepted' || result.status === 'partial') && result.kind === 'stored-time') {
        if (result.summary.firstDisasterOccurrences.length > 0) {
          onFirstDisasters({ completionSequence: result.stateRevision, occurrences: result.summary.firstDisasterOccurrences })
        }
      } else {
        setFailed(true)
      }
    } catch { setFailed(true) }
    finally { pendingRef.current = false; setPending(false) }
  }
  return <div className="offline-time-quick-spend">
    <div className="offline-time-quick-spend__buttons">
      {AMOUNTS.map(([seconds, label]) => <button key={seconds} type="button"
        aria-label={intl.formatMessage(messages.quickSpend, { duration: label })}
        disabled={disabled || pending || jobActive || availableSeconds < seconds}
        onClick={() => void spend(seconds)}>{label}</button>)}
    </div>
    {pending || jobActive ? <div className="offline-time-quick-spend__status">
      {storedTime && jobActive ? <button type="button" onClick={() => storedTime.cancel()}>{intl.formatMessage(messages.cancel)}</button> : null}
    </div> : null}
    {failed ? <p role="alert">{intl.formatMessage(messages.actionFailed)}</p> : null}
  </div>
}

const IDLE_JOB = { kind: 'idle' } as const

export function StoredTimeNavigationProgress({ storedTime }: { readonly storedTime?: UiRuntimeStoredTimeControls }) {
  const intl = useIntl()
  const subscribe = useCallback((listener: () => void) => storedTime?.subscribe(listener) ?? NO_JOB_SUBSCRIPTION(), [storedTime])
  const readStatus = useCallback(() => storedTime?.status() ?? IDLE_JOB, [storedTime])
  const status = useSyncExternalStore(subscribe, readStatus, readStatus)
  if (status.kind === 'idle') return null
  const fraction = Math.max(0, Math.min(1, status.fraction))
  return <span className="offline-time-navigation-progress" role="progressbar"
    aria-label={intl.formatMessage(messages.processingHeading)}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
    <span style={{ transform: `scaleX(${fraction})` }} />
  </span>
}
