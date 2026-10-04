import { useIntl } from 'react-intl'
import { offlineTimeMessages as messages } from './messages'
import { MAXIMUM_QUICK_MINUTES, useQuickStoredTimeAmounts } from './quickStoredTimePreferences'

export function QuickStoredTimeSettings() {
  const intl = useIntl()
  const { minutes, setMinutes } = useQuickStoredTimeAmounts()
  return <fieldset className="offline-time-quick-settings">
    <legend>{intl.formatMessage(messages.quickAmounts)}</legend>
    <div>{minutes.map((value, slot) => <label key={slot}>
      <span>{intl.formatMessage(messages.quickSlot, { slot: slot + 1 })}</span>
      <input type="number" min={1} max={MAXIMUM_QUICK_MINUTES} step={1} defaultValue={value} key={value}
        onBlur={event => {
          const next = event.currentTarget.valueAsNumber
          if (event.currentTarget.validity.valid && Number.isInteger(next)) setMinutes(slot, next)
          else event.currentTarget.value = String(value)
        }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
    </label>)}</div>
  </fieldset>
}
