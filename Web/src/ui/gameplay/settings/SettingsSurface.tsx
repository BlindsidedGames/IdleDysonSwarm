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
  readonly developmentOnly?: boolean
  readonly visualizationVisible?: boolean
  readonly onVisualizationVisibleChange?: (visible: boolean) => void
  readonly navigationVisibility?: Readonly<
    Record<NavigationShortcutId, boolean>
  >
  readonly onNavigationVisibilityChange?: (
    item: NavigationShortcutId,
    visible: boolean,
  ) => void
}

export type NavigationShortcutId = 'story' | 'wiki' | 'statistics'

const NAVIGATION_SHORTCUTS = [
  ['story', messages.storyShortcut] as const,
  ['wiki', messages.wikiShortcut] as const,
  ['statistics', messages.statisticsShortcut] as const,
]

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
  developmentOnly = false,
  visualizationVisible = true,
  onVisualizationVisibleChange = () => undefined,
  navigationVisibility = {
    story: false,
    wiki: false,
    statistics: true,
  },
  onNavigationVisibilityChange = () => undefined,
}: SettingsSurfaceProps) {
  const intl = useIntl()
  const developmentPresetId = useId()
  const developmentPanelId = useId()
  const [status, setStatus] = useState<ResetStatus>('idle')
  const [
    selectedDevelopmentPreset,
    setSelectedDevelopmentPreset,
  ] = useState<DevelopmentPresetId>('early-swarm')
  const [developmentStatus, setDevelopmentStatus] =
    useState<DevelopmentStatus>('idle')
  const [appliedDevelopmentPreset, setAppliedDevelopmentPreset] =
    useState<DevelopmentPresetId | null>(null)
  const [developmentPanelOpen, setDevelopmentPanelOpen] =
    useState(developmentOnly)
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
    const preset = DEVELOPMENT_PROGRESSION_PRESETS.find(
      ({ id }) => id === selectedDevelopmentPreset,
    )
    if (preset === undefined) {
      setDevelopmentStatus('failed')
      return
    }
    try {
      const result =
        preset.kind === 'dyson-bots'
          ? await development.setDysonBots(preset.bots)
          : await development.unlockReality()
      if (result.applied) {
        setAppliedDevelopmentPreset(preset.id)
      }
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
        {!developmentOnly ? <section className="settings-surface__panel settings-surface__panel--visualization">
          <div className="settings-surface__copy">
            <h2>
              {intl.formatMessage(messages.visualizationTitle)}
            </h2>
            <p>
              {intl.formatMessage(
                messages.visualizationDescription,
              )}
            </p>
          </div>
          <label className="settings-surface__toggle">
            <input
              type="checkbox"
              checked={visualizationVisible}
              onChange={(event) =>
                onVisualizationVisibleChange(
                  event.currentTarget.checked,
                )
              }
            />
            <span>
              {intl.formatMessage(messages.visualizationToggle)}
            </span>
          </label>
        </section> : null}
        {!developmentOnly ? (
          <section className="settings-surface__panel settings-surface__panel--navigation">
            <div className="settings-surface__copy">
              <h2>{intl.formatMessage(messages.navigationTitle)}</h2>
              <p>{intl.formatMessage(messages.navigationDescription)}</p>
            </div>
            <div className="settings-surface__navigation-toggles">
              {NAVIGATION_SHORTCUTS.map(([item, message]) => (
                <label className="settings-surface__toggle" key={item}>
                  <input
                    type="checkbox"
                    checked={navigationVisibility[item]}
                    onChange={(event) =>
                      onNavigationVisibilityChange(
                        item,
                        event.currentTarget.checked,
                      )
                    }
                  />
                  <span>{intl.formatMessage(message)}</span>
                </label>
              ))}
            </div>
          </section>
        ) : null}
        {!developmentOnly ? (
          <section className="settings-surface__panel settings-surface__panel--more">
            <div className="settings-surface__copy">
              <h2>{intl.formatMessage(messages.moreByTitle)}</h2>
              <p>{intl.formatMessage(messages.moreByDescription)}</p>
            </div>
          </section>
        ) : null}
        {!developmentOnly ? <section className="settings-surface__panel">
          <div className="settings-surface__copy">
            <h2>{intl.formatMessage(messages.saveData)}</h2>
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
        </section> : null}
        {development !== undefined ? (
          <>
            {!developmentOnly ? <button
              type="button"
              className="settings-surface__development-trigger"
              aria-expanded={developmentPanelOpen}
              aria-controls={developmentPanelId}
              onClick={() =>
                setDevelopmentPanelOpen((current) => !current)
              }
            >
              <span>
                {intl.formatMessage(messages.developmentTitle)}
              </span>
              <span
                className="settings-surface__development-chevron"
                aria-hidden="true"
              >
                ›
              </span>
            </button> : null}
            {developmentPanelOpen ? (
              <section
                id={developmentPanelId}
                className="settings-surface__panel settings-surface__panel--development"
                aria-label={intl.formatMessage(
                  messages.developmentTitle,
                )}
              >
                <div className="settings-surface__copy">
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
                        event.target
                          .value as DevelopmentPresetId,
                      )
                    }}
                  >
                    {DEVELOPMENT_PROGRESSION_PRESETS.map((preset) => (
                      <option value={preset.id} key={preset.id}>
                        {preset.kind === 'dyson-bots'
                          ? intl.formatMessage(
                              developmentPresetMessage(preset.id),
                              {
                                bots: formatGameNumber(
                                  intl.locale as EnabledLocale,
                                  preset.bots,
                                ),
                              },
                            )
                          : intl.formatMessage(
                              developmentPresetMessage(preset.id),
                            )}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={developmentStatus === 'pending'}
                    onClick={() =>
                      void applyDevelopmentPreset()
                    }
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
                        ? appliedDevelopmentPreset ===
                          'reality-unlocked'
                          ? messages.developmentRealitySucceeded
                          : messages.developmentSucceeded
                        : messages.developmentFailed,
                    )}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
        {!developmentOnly && (status === 'succeeded' ||
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
        ) : null)}
      </div>
      {!developmentOnly && dialogOpen ? (
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
  | 'first-infinity'
  | 'reality-unlocked'

type DevelopmentProgressionPreset =
  | {
      readonly id: Exclude<
        DevelopmentPresetId,
        'reality-unlocked'
      >
      readonly kind: 'dyson-bots'
      readonly bots: number
    }
  | {
      readonly id: 'reality-unlocked'
      readonly kind: 'reality-unlock'
    }

const DEVELOPMENT_PROGRESSION_PRESETS: ReadonlyArray<
  DevelopmentProgressionPreset
> = [
  { id: 'early-swarm', kind: 'dyson-bots', bots: 1_000 },
  { id: 'mid-swarm', kind: 'dyson-bots', bots: 100_000 },
  { id: 'near-star', kind: 'dyson-bots', bots: 195_000 },
  { id: 'new-galaxy', kind: 'dyson-bots', bots: 200_000 },
  {
    id: 'young-galaxy',
    kind: 'dyson-bots',
    bots: 2_000_000_000_000_000,
  },
  {
    id: 'half-galaxy',
    kind: 'dyson-bots',
    bots: 10_000_000_000_000_000,
  },
  {
    id: 'near-galaxy',
    kind: 'dyson-bots',
    bots: 18_000_000_000_000_000,
  },
  {
    id: 'one-galaxy',
    kind: 'dyson-bots',
    bots: 20_000_000_000_000_000,
  },
  {
    id: 'galaxy-group',
    kind: 'dyson-bots',
    bots: 200_000_000_000_000_000,
  },
  {
    id: 'first-infinity',
    kind: 'dyson-bots',
    bots: 42_000_000_000_000_000_000,
  },
  { id: 'reality-unlocked', kind: 'reality-unlock' },
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
    case 'first-infinity':
      return messages.developmentFirstInfinity
    case 'reality-unlocked':
      return messages.developmentRealityUnlocked
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
