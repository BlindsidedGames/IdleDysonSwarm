import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIntl } from 'react-intl'
import { statisticsMessages as messages } from './messages'

export function ClearSpeedrunBestDialog({ milestone, onConfirm, onClose }: {
  readonly milestone: string
  readonly onConfirm: () => Promise<boolean>
  readonly onClose: () => void
}) {
  const intl = useIntl()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const heading = previous?.closest('article')?.querySelector('h3')
    dialog.current?.showModal()
    cancel.current?.focus()
    return () => {
      const target = previous?.isConnected && !previous.matches(':disabled') ? previous : heading
      if (target instanceof HTMLElement && target.isConnected) target.focus()
    }
  }, [])
  const confirm = async () => {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      if (await onConfirm()) onClose()
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return createPortal(<dialog ref={dialog} className="speedrun-clear-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={event => { event.preventDefault(); if (!pending) onClose() }}>
    <h3 id={`${id}-title`}>{intl.formatMessage(messages.clearBestTitle)}</h3>
    <p id={`${id}-description`}>{intl.formatMessage(messages.clearBestDescription, { milestone })}</p>
    {failed && <p role="alert">{intl.formatMessage(messages.clearBestFailed)}</p>}
    <div className="speedrun-clear-dialog__actions">
      <button ref={cancel} type="button" disabled={pending} onClick={onClose}>{intl.formatMessage(messages.cancel)}</button>
      <button type="button" disabled={pending} onClick={() => void confirm()}>{intl.formatMessage(messages.clearBestConfirm)}</button>
    </div>
  </dialog>, document.body)
}
