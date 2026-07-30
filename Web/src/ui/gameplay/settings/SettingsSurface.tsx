import { useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { UiRuntimeImportResult } from '../../runtime'
import { settingsSurfaceMessages as messages } from './messages'
import './settingsSurface.css'

export interface SettingsSurfaceProps {
  readonly resetSave: () => Promise<UiRuntimeImportResult>
}

type ResetStatus =
  | 'idle'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'committed-recovery'

/**
 * Presents host settings while delegating save replacement to the runtime.
 */
export function SettingsSurface({
  resetSave,
}: SettingsSurfaceProps) {
  const intl = useIntl()
  const [status, setStatus] = useState<ResetStatus>('idle')
  const [dialogOpen, setDialogOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    if (!dialogOpen) return undefined
    const returnFocus = triggerRef.current
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && statusRef.current !== 'pending') {
        event.preventDefault()
        setDialogOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const first = cancelRef.current
      const last = confirmRef.current
      if (first === null || last === null) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      returnFocus?.focus()
    }
  }, [dialogOpen])

  const requestReset = async (): Promise<void> => {
    if (status === 'pending') return
    setStatus('pending')
    try {
      const result = await resetSave()
      if (result.imported) {
        setStatus('succeeded')
        setDialogOpen(false)
      } else {
        setStatus(
          result.committed ? 'committed-recovery' : 'failed',
        )
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="settings-surface">
      <div
        className="settings-surface__content"
        aria-hidden={dialogOpen || undefined}
        inert={dialogOpen || undefined}
      >
        <h2>{intl.formatMessage(messages.title)}</h2>
        <section className="settings-surface__panel">
          <div className="settings-surface__copy">
            <h3>{intl.formatMessage(messages.saveData)}</h3>
            <p>{intl.formatMessage(messages.saveDescription)}</p>
          </div>
          <button
            ref={triggerRef}
            type="button"
            className="settings-surface__reset"
            disabled={status === 'pending'}
            onClick={() => {
              setStatus('idle')
              setDialogOpen(true)
            }}
          >
            {intl.formatMessage(messages.reset)}
          </button>
        </section>
        {status === 'succeeded' ||
        ((status === 'failed' || status === 'committed-recovery') &&
          !dialogOpen) ? (
          <p
            className="settings-surface__status"
            role={status === 'succeeded' ? 'status' : 'alert'}
          >
            {intl.formatMessage(
              resetStatusMessage(status),
            )}
          </p>
        ) : null}
      </div>
      {dialogOpen ? (
        <div className="settings-surface__dialog-backdrop">
          <section
            className="settings-surface__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-save-dialog-title"
            aria-describedby="reset-save-dialog-description"
            aria-busy={status === 'pending'}
          >
            <h3 id="reset-save-dialog-title">
              {intl.formatMessage(messages.resetDialogTitle)}
            </h3>
            <p id="reset-save-dialog-description">
              {intl.formatMessage(messages.resetConfirmation)}
            </p>
            {status === 'failed' ||
            status === 'committed-recovery' ? (
              <p className="settings-surface__dialog-error" role="alert">
                {intl.formatMessage(
                  resetStatusMessage(status),
                )}
              </p>
            ) : null}
            <div className="settings-surface__dialog-actions">
              <button
                ref={cancelRef}
                type="button"
                disabled={status === 'pending'}
                onClick={() => setDialogOpen(false)}
              >
                {intl.formatMessage(messages.cancel)}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className="settings-surface__reset"
                disabled={status === 'pending'}
                onClick={() => void requestReset()}
              >
                {intl.formatMessage(
                  status === 'pending'
                    ? messages.resetPending
                    : messages.reset,
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function resetStatusMessage(
  status: Exclude<ResetStatus, 'idle' | 'pending'>,
) {
  if (status === 'succeeded') return messages.resetSucceeded
  if (status === 'committed-recovery') {
    return messages.resetCommittedRecovery
  }
  return messages.resetFailed
}
