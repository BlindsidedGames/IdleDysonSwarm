import { useIntl } from 'react-intl'
import { sharedMessages } from '../../i18n/messages'

export interface LazySurfacePendingProps {
  readonly overlay?: boolean
}

/** Visible, announced status while a destination-only chunk is loading. */
export function LazySurfacePending({
  overlay = false,
}: LazySurfacePendingProps) {
  const intl = useIntl()
  return (
    <div
      className={`dyson-shell__lazy-pending${overlay ? ' dyson-shell__lazy-pending--overlay' : ''}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {intl.formatMessage(sharedMessages.loading)}
    </div>
  )
}
