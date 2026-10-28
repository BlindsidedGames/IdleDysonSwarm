import { useEffect, useId, useRef } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { infinityTimeBonusMultiplier, INFINITY_TIME_BONUS_MAX_LEVEL } from '../../../simulation/infinityTimeBonus'
import { formatGameCountdown, formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'

const messages = defineMessages({
  title: { id: 'quantum.time-bonus.details.title', defaultMessage: 'Time bonus', description: 'Time bonus comparison dialog title.' },
  time: { id: 'quantum.time-bonus.details.time', defaultMessage: 'Run time', description: 'Time comparison column.' },
  current: { id: 'quantum.time-bonus.details.current', defaultMessage: 'Current', description: 'Owned time bonus level column.' },
  next: { id: 'quantum.time-bonus.details.next', defaultMessage: 'Next level', description: 'Next time bonus level column.' },
  now: { id: 'quantum.time-bonus.details.now', defaultMessage: 'Right now', description: 'Live current run comparison row.' },
  note: { id: 'quantum.time-bonus.details.note', defaultMessage: 'IP multiplier. Restarts each Infinity. Times use 1× speed.', description: 'Time bonus comparison timing and effect.' },
  close: { id: 'quantum.time-bonus.details.close', defaultMessage: 'Close', description: 'Close time bonus details.' },
})

export function TimeBonusDetailsDialog({ locale, level, seconds, onClose }: {
  readonly locale: EnabledLocale
  readonly level: number
  readonly seconds: number
  readonly onClose: () => void
}) {
  const intl = useIntl()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const next = Math.min(level + 1, INFINITY_TIME_BONUS_MAX_LEVEL)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const modal = dialog.current
    modal?.showModal()
    close.current?.focus()
    return () => {
      modal?.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  const multiplier = (owned: number, time: number) => `×${formatGameNumber(locale, infinityTimeBonusMultiplier(owned, time))}`
  return <dialog ref={dialog} className="quantum-time-bonus-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <h3 id={`${id}-title`}>{intl.formatMessage(messages.title)}</h3>
    <p id={`${id}-note`}>{intl.formatMessage(messages.note)}</p>
    <table>
      <thead><tr><th scope="col">{intl.formatMessage(messages.time)}</th><th scope="col">{intl.formatMessage(messages.current)}</th>{next > level && <th scope="col">{intl.formatMessage(messages.next)}</th>}</tr></thead>
      <tbody>{[seconds, 30, 60, 120, 300, 900, 3600].map((time, index) => <tr key={index} className={index === 0 ? 'quantum-time-bonus-dialog__now' : undefined}>
        <th scope="row">{index === 0 ? intl.formatMessage(messages.now) : formatGameCountdown(locale, time)}</th>
        <td>{multiplier(level, time)}</td>{next > level && <td>{multiplier(next, time)}</td>}
      </tr>)}</tbody>
    </table>
    <button ref={close} type="button" onClick={onClose}>{intl.formatMessage(messages.close)}</button>
  </dialog>
}
