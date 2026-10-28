import { useCallback, useSyncExternalStore } from 'react'
import { useIntl } from 'react-intl'
import type { UiRuntimeStoredTimeControls } from '../../runtime'
import { offlineTimeMessages as messages } from './messages'
const NO_JOB_SUBSCRIPTION = () => () => undefined

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
