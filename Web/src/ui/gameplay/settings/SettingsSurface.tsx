import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useIntl } from 'react-intl'
import type {
  UiRuntimeDevelopmentControls,
  UiRuntimeImportResult,
} from '../../runtime'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { settingsSurfaceMessages as messages } from './messages'
import './settingsSurface.css'

export interface SettingsSurfaceProps {
  readonly resetSave: () => Promise<UiRuntimeImportResult>
  readonly development?: UiRuntimeDevelopmentControls
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
  development,
}: SettingsSurfaceProps) {
  const intl = useIntl()
  const developmentPresetId = useId()
  const [status, setStatus] = useState<ResetStatus>('idle')
  const [
    selectedDevelopmentPreset,
    setSelectedDevelopmentPreset,
  ] = useState<DevelopmentPresetId>('early-swarm')
  const [developmentStatus, setDevelopmentStatus] =
    useState<DevelopmentStatus>('idle')
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

  const applyDevelopmentPreset = async (): Promise<void> => {
    if (
      development === undefined ||
      developmentStatus === 'pending'
    ) {
      return
    }
    setDevelopmentStatus('pending')
    const preset = DEVELOPMENT_BOT_PRESETS.find(
      ({ id }) => id === selectedDevelopmentPreset,
    )
    if (preset === undefined) {
      setDevelopmentStatus('failed')
      return
    }
    try {
      const result = await development.setDysonBots(preset.bots)
      setDevelopmentStatus(
        result.applied ? 'succeeded' : 'failed',
      )
    } catch {
      setDevelopmentStatus('failed')
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
        {development !== undefined ? (
          <section className="settings-surface__panel settings-surface__panel--development">
            <div className="settings-surface__copy">
              <h3>
                {intl.formatMessage(messages.developmentTitle)}
              </h3>
              <p>
                {intl.formatMessage(
                  messages.developmentDescription,
                )}
              </p>
            </div>
            <div className="settings-surface__development-controls">
              <label htmlFor={developmentPresetId}>
                {intl.formatMessage(
                  messages.developmentPreset,
                )}
              </label>
              <select
                id={developmentPresetId}
                value={selectedDevelopmentPreset}
                disabled={developmentStatus === 'pending'}
                onChange={(event) => {
                  setDevelopmentStatus('idle')
                  setSelectedDevelopmentPreset(
                    event.target.value as DevelopmentPresetId,
                  )
                }}
              >
                {DEVELOPMENT_BOT_PRESETS.map((preset) => (
                  <option value={preset.id} key={preset.id}>
                    {intl.formatMessage(
                      developmentPresetMessage(preset.id),
                      {
                        bots: formatGameNumber(
                          intl.locale as EnabledLocale,
                          preset.bots,
                        ),
                      },
                    )}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={developmentStatus === 'pending'}
                onClick={() => void applyDevelopmentPreset()}
              >
                {intl.formatMessage(
                  developmentStatus === 'pending'
                    ? messages.developmentApplying
                    : messages.developmentApply,
                )}
              </button>
            </div>
            {developmentStatus === 'succeeded' ||
            developmentStatus === 'failed' ? (
              <p
                className="settings-surface__development-status"
                role={
                  developmentStatus === 'succeeded'
                    ? 'status'
                    : 'alert'
                }
              >
                {intl.formatMessage(
                  developmentStatus === 'succeeded'
                    ? messages.developmentSucceeded
                    : messages.developmentFailed,
                )}
              </p>
            ) : null}
          </section>
        ) : null}
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

type DevelopmentStatus =
  | 'idle'
  | 'pending'
  | 'succeeded'
  | 'failed'

type DevelopmentPresetId =
  | 'early-swarm'
  | 'mid-swarm'
  | 'near-star'
  | 'new-galaxy'
  | 'young-galaxy'
  | 'half-galaxy'
  | 'near-galaxy'
  | 'one-galaxy'
  | 'galaxy-group'

const DEVELOPMENT_BOT_PRESETS: ReadonlyArray<{
  readonly id: DevelopmentPresetId
  readonly bots: number
}> = [
  { id: 'early-swarm', bots: 1_000 },
  { id: 'mid-swarm', bots: 100_000 },
  { id: 'near-star', bots: 195_000 },
  { id: 'new-galaxy', bots: 200_000 },
  { id: 'young-galaxy', bots: 2_000_000_000_000_000 },
  { id: 'half-galaxy', bots: 10_000_000_000_000_000 },
  { id: 'near-galaxy', bots: 18_000_000_000_000_000 },
  { id: 'one-galaxy', bots: 20_000_000_000_000_000 },
  { id: 'galaxy-group', bots: 200_000_000_000_000_000 },
]

function developmentPresetMessage(
  preset: DevelopmentPresetId,
) {
  switch (preset) {
    case 'early-swarm':
      return messages.developmentEarlySwarm
    case 'mid-swarm':
      return messages.developmentMidSwarm
    case 'near-star':
      return messages.developmentNearStar
    case 'new-galaxy':
      return messages.developmentNewGalaxy
    case 'young-galaxy':
      return messages.developmentYoungGalaxy
    case 'half-galaxy':
      return messages.developmentHalfGalaxy
    case 'near-galaxy':
      return messages.developmentNearGalaxy
    case 'one-galaxy':
      return messages.developmentOneGalaxy
    case 'galaxy-group':
      return messages.developmentGalaxyGroup
  }
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
