import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS } from '../../runtime/activeTimeDriver'
import { useIntl } from 'react-intl'
import type {
  UiRuntimeDevelopmentControls,
  UiRuntimeImportPreview,
  UiRuntimeImportPreviewResult,
  UiRuntimeImportResult,
  UiRuntimePlayerCommandResult,
  UiRuntimeSaveExportSnapshot,
  UiRuntimeStoredTimeControls,
  UiRuntimeSuppliedFile,
} from '../../runtime'
import {
  formatGameNumber,
  formatWholeGameNumber,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import {
  SYSTEM_LOCALE_PREFERENCE,
  useLocalePreference,
  type LocalePreference,
} from '../../i18n'
import { settingsSurfaceMessages as messages } from './messages'
import './settingsSurface.css'
import type { GameAudioService } from '../../../audio'
import { useAudioSettings } from '../../../audio'
import {
  isNumberNotationMode,
  useNumberNotation,
} from '../../number-notation'
import type {
  BottomNavigationDestinationId,
} from '../../../game-state/navigationPreferences'
import {
  BOTTOM_NAVIGATION_DESTINATION_IDS,
  DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
} from '../../../game-state/navigationPreferences'
import {
  IDLE_DYSON_SWARM_DISCORD_URL,
  type BlindsidedGamesDestination,
} from '../../../platform/communityLinks'
import { DiscordIcon } from '../../components/DiscordIcon'

import { canExportSaveFile } from '../../../platform/saveFileExport'

export interface SettingsSurfaceProps {
  readonly achievementProvider?: 'play-games' | 'game-center'
  readonly showAchievements?: () => Promise<void>
  readonly saveFileExportAvailable?: boolean
  readonly resetSave: () => Promise<UiRuntimeImportResult>
  readonly importSaveFile: (
    file: UiRuntimeSuppliedFile,
  ) => Promise<UiRuntimeImportResult>
  readonly importSaveText: (
    text: string,
  ) => Promise<UiRuntimeImportResult>
  readonly previewImportSaveFile: (
    file: UiRuntimeSuppliedFile,
  ) => Promise<UiRuntimeImportPreviewResult>
  readonly previewImportSaveText: (
    text: string,
  ) => Promise<UiRuntimeImportPreviewResult>
  readonly readSaveExport: () => Promise<UiRuntimeSaveExportSnapshot | null>
  readonly downloadSaveText: (text: string) => Promise<boolean | null>
  readonly copySaveText: (text: string) => Promise<void>
  readonly storedTime?: UiRuntimeStoredTimeControls
  readonly development?: UiRuntimeDevelopmentControls
  readonly developmentOnly?: boolean
  readonly visualizationVisible?: boolean
  readonly onVisualizationVisibleChange?: (visible: boolean) => void
  readonly navigationVisibility?: Readonly<
    Record<string, boolean>
  >
  readonly onNavigationVisibilityChange?: (
    item: BottomNavigationDestinationId,
    visible: boolean,
  ) => void
  readonly availableNavigationItems?: readonly BottomNavigationDestinationId[]
  readonly bottomNavigationIncludeText?: boolean
  readonly onBottomNavigationIncludeTextChange?: (
    includeText: boolean,
  ) => void
  readonly audio?: GameAudioService
  readonly processingIntervalMilliseconds?: number
  readonly processingIntervalAvailable?: boolean
  readonly onProcessingIntervalChange?: (
    milliseconds: number,
  ) => void | Promise<UiRuntimePlayerCommandResult | void>
  readonly openExternalUrl?: (url: string) => Promise<void>
  readonly developerDestination?: BlindsidedGamesDestination
}

const NAVIGATION_SHORTCUTS = [
  ['bots', messages.botsShortcut] as const,
  ['research', messages.researchShortcut] as const,
  ['skills', messages.skillsShortcut] as const,
  ['infinity', messages.infinityShortcut] as const,
  ['reality', messages.realityShortcut] as const,
  ['simulations', messages.simulationsShortcut] as const,
  ['quantum', messages.quantumShortcut] as const,
  ['store', messages.storeShortcut] as const,
  ['story', messages.storyShortcut] as const,
  ['wiki', messages.wikiShortcut] as const,
  ['offline-time', messages.offlineTimeShortcut] as const,
  ['statistics', messages.statisticsShortcut] as const,
  ['settings', messages.settingsShortcut] as const,
]

type ResetStatus =
  | 'idle'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'committed-recovery'

type TransferStatus =
  | 'idle'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'committed-recovery'
type ExportStatus =
  | 'idle'
  | 'pending'
  | 'ready'
  | 'copied'
  | 'downloaded'
  | 'failed'
type SaveDialog = 'reset' | 'import' | 'export'
type ImportPreviewStatus = 'idle' | 'pending' | 'failed'

/**
 * Presents host settings while delegating save replacement to the runtime.
 */
export function SettingsSurface({
  achievementProvider,
  showAchievements,
  resetSave,
  importSaveFile,
  importSaveText,
  previewImportSaveFile,
  previewImportSaveText,
  readSaveExport,
  downloadSaveText,
  saveFileExportAvailable = canExportSaveFile(),
  copySaveText,
  storedTime,
  development,
  developmentOnly = false,
  visualizationVisible = true,
  onVisualizationVisibleChange = () => undefined,
  navigationVisibility = DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
  onNavigationVisibilityChange = () => undefined,
  availableNavigationItems = BOTTOM_NAVIGATION_DESTINATION_IDS,
  bottomNavigationIncludeText = false,
  onBottomNavigationIncludeTextChange = () => undefined,
  audio,
  processingIntervalMilliseconds = DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS,
  processingIntervalAvailable = true,
  onProcessingIntervalChange = () => undefined,
  openExternalUrl = async () => undefined,
  developerDestination,
}: SettingsSurfaceProps) {
  const [achievementStatus, setAchievementStatus] = useState<'idle' | 'pending' | 'failed'>('idle')
  const intl = useIntl()
  const language = useLocalePreference()
  const numberNotation = useNumberNotation()
  const developmentPresetId = useId()
  const developmentPanelId = useId()
  const [status, setStatus] = useState<ResetStatus>('idle')
  const [importStatus, setImportStatus] =
    useState<TransferStatus>('idle')
  const [exportStatus, setExportStatus] =
    useState<ExportStatus>('idle')
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] =
    useState<UiRuntimeImportPreview | null>(null)
  const [importPreviewStatus, setImportPreviewStatus] =
    useState<ImportPreviewStatus>('idle')
  const [exportText, setExportText] = useState('')
  const [exportBasis, setExportBasis] =
    useState<UiRuntimeSaveExportSnapshot['basis']>('current')
  const [selectedImport, setSelectedImport] =
    useState<UiRuntimeSuppliedFile | null>(null)
  const [
    selectedDevelopmentPreset,
    setSelectedDevelopmentPreset,
  ] = useState<DevelopmentPresetId>('early-swarm')
  const [developmentStatus, setDevelopmentStatus] =
    useState<DevelopmentStatus>('idle')
  const [developmentOptionsStatus, setDevelopmentOptionsStatus] =
    useState<'idle' | 'pending' | 'failed'>('idle')
  const [appliedDevelopmentPreset, setAppliedDevelopmentPreset] =
    useState<DevelopmentPresetId | null>(null)
  const [developmentPanelOpen, setDevelopmentPanelOpen] =
    useState(developmentOnly)
  const [dialog, setDialog] = useState<SaveDialog | null>(null)
  const [processingIntervalDraft, setProcessingIntervalDraft] = useState(
    processingIntervalMilliseconds,
  )
  const processingIntervalDraftRef = useRef(processingIntervalMilliseconds)
  const processingIntervalPropRef = useRef(processingIntervalMilliseconds)
  const processingIntervalInteractionRef = useRef(false)
  const processingIntervalRequestRef = useRef(0)
  const processingIntervalPendingValueRef = useRef<number | null>(null)
  const processingIntervalCommitTimerRef = useRef<number | null>(null)
  const processingIntervalMountedRef = useRef(true)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const transferTextRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const operationPending =
    status === 'pending' ||
    importStatus === 'pending' ||
    importPreviewStatus === 'pending' ||
    exportStatus === 'pending'
  const operationPendingRef = useRef(operationPending)
  operationPendingRef.current = operationPending

  useEffect(() => {
    processingIntervalPropRef.current = processingIntervalMilliseconds
    if (
      !processingIntervalInteractionRef.current &&
      processingIntervalPendingValueRef.current === null
    ) {
      processingIntervalDraftRef.current = processingIntervalMilliseconds
      setProcessingIntervalDraft(processingIntervalMilliseconds)
    }
  }, [processingIntervalMilliseconds])

  const previewProcessingInterval = (milliseconds: number): void => {
    processingIntervalDraftRef.current = milliseconds
    setProcessingIntervalDraft(milliseconds)
  }

  const cancelScheduledProcessingIntervalCommit = (): void => {
    if (processingIntervalCommitTimerRef.current === null) return
    window.clearTimeout(processingIntervalCommitTimerRef.current)
    processingIntervalCommitTimerRef.current = null
  }

  const commitProcessingInterval = (): void => {
    cancelScheduledProcessingIntervalCommit()
    const milliseconds = processingIntervalDraftRef.current
    if (processingIntervalPendingValueRef.current !== null) return
    if (
      milliseconds === processingIntervalPropRef.current
    ) return
    const request = processingIntervalRequestRef.current + 1
    processingIntervalRequestRef.current = request
    processingIntervalPendingValueRef.current = milliseconds
    let dispatched: void | Promise<UiRuntimePlayerCommandResult | void>
    try {
      dispatched = onProcessingIntervalChange(milliseconds)
    } catch {
      processingIntervalPendingValueRef.current = null
      previewProcessingInterval(processingIntervalPropRef.current)
      return
    }
    void Promise.resolve(dispatched)
      .then((result) => {
        if (
          !processingIntervalMountedRef.current ||
          processingIntervalRequestRef.current !== request
        ) return
        processingIntervalPendingValueRef.current = null
        if (
          result !== undefined &&
          result.status !== 'accepted'
        ) {
          previewProcessingInterval(processingIntervalPropRef.current)
          return
        }
        processingIntervalPropRef.current = milliseconds
        if (
          !processingIntervalInteractionRef.current &&
          processingIntervalDraftRef.current !== milliseconds
        ) {
          commitProcessingInterval()
        }
      })
      .catch(() => {
        if (
          !processingIntervalMountedRef.current ||
          processingIntervalRequestRef.current !== request
        ) return
        processingIntervalPendingValueRef.current = null
        previewProcessingInterval(processingIntervalPropRef.current)
      })
  }

  const scheduleProcessingIntervalCommit = (): void => {
    cancelScheduledProcessingIntervalCommit()
    if (processingIntervalInteractionRef.current) return
    processingIntervalCommitTimerRef.current = window.setTimeout(() => {
      processingIntervalCommitTimerRef.current = null
      commitProcessingInterval()
    }, 200)
  }

  useEffect(() => {
    processingIntervalMountedRef.current = true
    return () => {
      processingIntervalMountedRef.current = false
      processingIntervalRequestRef.current += 1
      processingIntervalPendingValueRef.current = null
      if (processingIntervalCommitTimerRef.current !== null) {
        window.clearTimeout(processingIntervalCommitTimerRef.current)
        processingIntervalCommitTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (dialog === null) return undefined
    const returnFocus = returnFocusRef.current
    const backdrop = backdropRef.current
    const portalParent = backdrop?.parentElement ?? document.body
    const backgroundSiblings = Array.from(portalParent.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== backdrop,
      )
      .map((element) => ({
        element,
        hadInertAttribute: element.hasAttribute('inert'),
      }))
    for (const { element } of backgroundSiblings) {
      element.setAttribute('inert', '')
    }
    const initialFocus = dialog === 'reset'
      ? cancelRef.current
      : transferTextRef.current
    initialFocus?.focus()
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === 'Escape' &&
        (!operationPendingRef.current || dialog === 'export')
      ) {
        event.preventDefault()
        setDialog(null)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled])',
      )
      const first = focusable?.[0]
      const last = focusable?.[focusable.length - 1]
      if (first === undefined || last === undefined) return
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
      for (const { element, hadInertAttribute } of backgroundSiblings) {
        if (!hadInertAttribute) element.removeAttribute('inert')
      }
      returnFocus?.focus()
    }
  }, [dialog])

  const requestReset = async (): Promise<void> => {
    if (status === 'pending') return
    setStatus('pending')
    try {
      const result = await resetSave()
      if (result.imported) {
        setStatus('succeeded')
        setDialog(null)
      } else {
        setStatus(
          result.committed ? 'committed-recovery' : 'failed',
        )
      }
    } catch {
      setStatus('failed')
    }
  }

  const requestImport = async (): Promise<void> => {
    const suppliedText = importText.trim()
    if (
      operationPending ||
      importPreview === null ||
      (selectedImport === null && suppliedText.length === 0)
    ) {
      return
    }
    setImportStatus('pending')
    try {
      const result =
        selectedImport === null
          ? await importSaveText(suppliedText)
          : await importSaveFile(selectedImport)
      if (result.imported) {
        setImportStatus('succeeded')
        setDialog(null)
        setSelectedImport(null)
        setImportText('')
        if (importInputRef.current !== null) {
          importInputRef.current.value = ''
        }
      } else {
        setImportStatus(
          result.committed ? 'committed-recovery' : 'failed',
        )
      }
    } catch {
      setImportStatus('failed')
    }
  }

  const requestImportPreview = async (): Promise<void> => {
    const suppliedText = importText.trim()
    if (
      operationPending ||
      (selectedImport === null && suppliedText.length === 0)
    ) {
      return
    }
    setImportPreviewStatus('pending')
    setImportPreview(null)
    try {
      const result = selectedImport === null
        ? await previewImportSaveText(suppliedText)
        : await previewImportSaveFile(selectedImport)
      if (result.accepted) {
        setImportPreview(result.preview)
        setImportPreviewStatus('idle')
      } else {
        setImportPreviewStatus('failed')
      }
    } catch {
      setImportPreviewStatus('failed')
    }
  }

  const openExportDialog = async (
    trigger: HTMLButtonElement,
  ): Promise<void> => {
    if (operationPending) return
    returnFocusRef.current = trigger
    setStatus('idle')
    setImportStatus('idle')
    setExportStatus('pending')
    setExportText('')
    setExportBasis('current')
    setDialog('export')
    try {
      const exported = await readSaveExport()
      if (exported === null) {
        setExportStatus('failed')
        return
      }
      setExportText(exported.text)
      setExportBasis(exported.basis)
      setExportStatus('ready')
    } catch {
      setExportStatus('failed')
    }
  }

  const requestExportCopy = async (): Promise<void> => {
    if (operationPending || exportText.length === 0) return
    setExportStatus('pending')
    try {
      await copySaveText(exportText)
      setExportStatus('copied')
    } catch {
      setExportStatus('failed')
    }
  }

  const requestExportDownload = async (): Promise<void> => {
    if (operationPending || exportText.length === 0) return
    setExportStatus('pending')
    try {
      const result = await downloadSaveText(exportText)
      setExportStatus(
        result === null ? 'ready' : result ? 'downloaded' : 'failed',
      )
    } catch {
      setExportStatus('failed')
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

  const setDevelopmentOptionsEnabled = async (
    enabled: boolean,
  ): Promise<void> => {
    if (
      development === undefined ||
      developmentOptionsStatus === 'pending'
    ) {
      return
    }
    setDevelopmentOptionsStatus('pending')
    try {
      const result = await development.apply({
        kind: enabled
          ? 'purchase-debug-options'
          : 'disable-debug-options',
      })
      setDevelopmentOptionsStatus(
        result.applied ? 'idle' : 'failed',
      )
    } catch {
      setDevelopmentOptionsStatus('failed')
    }
  }

  return (
    <div ref={surfaceRef} className="settings-surface">
      <div
        className="settings-surface__content"
        aria-hidden={dialog !== null || undefined}
        inert={dialog !== null || undefined}
      >
        {!developmentOnly ? (
          <>
            <section className="settings-surface__panel settings-surface__panel--more">
              <div className="settings-surface__copy">
                <h2>{intl.formatMessage(messages.moreByTitle)}</h2>
              </div>
              <div className="settings-surface__community-actions">
                <div className="settings-surface__community-card">
                  <p>{intl.formatMessage(messages.discordDescription)}</p>
                  <button
                    type="button"
                    className="settings-surface__community-action settings-surface__community-action--primary"
                    onClick={() => {
                      void openExternalUrl(IDLE_DYSON_SWARM_DISCORD_URL)
                    }}
                  >
                    <DiscordIcon />
                    <span>{intl.formatMessage(messages.discordAction)}</span>
                  </button>
                </div>
                {developerDestination !== undefined ? (
                  <div className="settings-surface__community-card">
                    <p>{intl.formatMessage(messages.moreByDescription)}</p>
                    <button
                      type="button"
                      className="settings-surface__community-action"
                      onClick={() => {
                        void openExternalUrl(developerDestination.url)
                      }}
                    >
                      {intl.formatMessage(
                        developerDestination.kind === 'app-store'
                          ? messages.appStoreAction
                          : developerDestination.kind === 'google-play'
                            ? messages.googlePlayAction
                            : messages.websiteAction,
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
            {showAchievements !== undefined ? <section className="settings-surface__panel settings-surface__panel--achievements">
                <button type="button" className="settings-surface__community-action" disabled={achievementStatus === 'pending'} onClick={async () => {
                  setAchievementStatus('pending')
                  try { await showAchievements(); setAchievementStatus('idle') }
                  catch { setAchievementStatus('failed') }
                }}>
                  {achievementProvider === 'play-games' ? <img className="settings-surface__achievement-icon" src={`${import.meta.env.BASE_URL}platform/play-games-white.png`} alt="" aria-hidden="true" /> : null}
                  {achievementProvider === 'game-center' ? <img className="settings-surface__achievement-icon" src={`${import.meta.env.BASE_URL}platform/game-center-white.svg`} alt="" aria-hidden="true" /> : null}
                  <span>{intl.formatMessage(messages.achievementsAction)}</span>
                </button>
                {achievementStatus === 'failed' ? <p role="status">{intl.formatMessage(messages.achievementsUnavailable)}</p> : null}
            </section> : null}
            <div className="settings-surface__column settings-surface__column--primary">
              {audio !== undefined ? <AudioSettingsPanel audio={audio} /> : null}
              <section className="settings-surface__panel settings-surface__panel--number-notation">
                <div className="settings-surface__copy">
                  <h2>{intl.formatMessage(messages.numberNotationTitle)}</h2>
                  <p>{intl.formatMessage(messages.numberNotationDescription)}</p>
                </div>
                <label className="settings-surface__select-label">
                  <span>{intl.formatMessage(messages.numberNotationLabel)}</span>
                  <select
                    value={numberNotation.mode}
                    onChange={(event) => {
                      const mode = event.currentTarget.value
                      if (isNumberNotationMode(mode)) numberNotation.setMode(mode)
                    }}
                  >
                    <option value="mixed">
                      {intl.formatMessage(messages.numberNotationMixed)}
                    </option>
                    <option value="standard">
                      {intl.formatMessage(messages.numberNotationStandard)}
                    </option>
                    <option value="scientific">
                      {intl.formatMessage(messages.numberNotationScientific)}
                    </option>
                    <option value="engineering">
                      {intl.formatMessage(messages.numberNotationEngineering)}
                    </option>
                  </select>
                </label>
              </section>
            </div>
            <div className="settings-surface__column settings-surface__column--secondary">
              <section className="settings-surface__panel settings-surface__panel--language">
                <div className="settings-surface__copy">
                  <h2>{intl.formatMessage(messages.languageTitle)}</h2>
                  <p>{intl.formatMessage(messages.languageDescription)}</p>
                </div>
                <label className="settings-surface__select-label">
                  <span>{intl.formatMessage(messages.languageLabel)}</span>
                  <select
                    value={language.preference}
                    onChange={(event) => {
                      language.setPreference(
                        event.currentTarget.value as LocalePreference,
                      )
                    }}
                  >
                    <option value={SYSTEM_LOCALE_PREFERENCE}>
                      {intl.formatMessage(messages.languageSystem)}
                    </option>
                    <option value="en">{intl.formatMessage(messages.languageEnglish)}</option>
                    <option value="fr">{intl.formatMessage(messages.languageFrench)}</option>
                    <option value="de">{intl.formatMessage(messages.languageGerman)}</option>
                    <option value="es-419">{intl.formatMessage(messages.languageSpanishLatinAmerica)}</option>
                    <option value="pt-BR">{intl.formatMessage(messages.languagePortugueseBrazil)}</option>
                    <option value="zh-CN">{intl.formatMessage(messages.languageChineseSimplified)}</option>
                    <option value="ru">{intl.formatMessage(messages.languageRussian)}</option>
                    <option value="ja">{intl.formatMessage(messages.languageJapanese)}</option>
                  </select>
                </label>
              </section>
              <section className="settings-surface__panel settings-surface__panel--processing">
                <div className="settings-surface__copy">
                  <h2>{intl.formatMessage(messages.processingTitle)}</h2>
                  <p>{intl.formatMessage(messages.processingDescription)}</p>
                </div>
                <div className="settings-surface__processing-control">
                  <span className="settings-surface__processing-label">
                    {intl.formatMessage(messages.processingInterval)}
                  </span>
                  <span className="settings-surface__processing-value">
                    {intl.formatMessage(messages.processingIntervalValue, {
                      milliseconds: processingIntervalDraft,
                    })}
                  </span>
                  <input
                    type="range"
                    min={33}
                    max={200}
                    step={1}
                    value={processingIntervalDraft}
                    aria-label={intl.formatMessage(messages.processingInterval)}
                    aria-valuetext={intl.formatMessage(
                      messages.processingIntervalValue,
                      { milliseconds: processingIntervalDraft },
                    )}
                    disabled={!processingIntervalAvailable}
                    style={{
                      '--settings-processing-progress': `${((processingIntervalDraft - 33) / 167) * 100}%`,
                    } as CSSProperties}
                    onChange={(event) => {
                      const milliseconds = event.currentTarget.valueAsNumber
                      previewProcessingInterval(milliseconds)
                      scheduleProcessingIntervalCommit()
                    }}
                    onPointerDown={() => {
                      cancelScheduledProcessingIntervalCommit()
                      processingIntervalInteractionRef.current = true
                    }}
                    onPointerUp={() => {
                      processingIntervalInteractionRef.current = false
                      commitProcessingInterval()
                    }}
                    onPointerCancel={() => {
                      processingIntervalInteractionRef.current = false
                      commitProcessingInterval()
                    }}
                    onKeyUp={(event) => {
                      if (isProcessingIntervalCommitKey(event.key)) {
                        commitProcessingInterval()
                      }
                    }}
                    onBlur={() => {
                      processingIntervalInteractionRef.current = false
                      commitProcessingInterval()
                    }}
                  />
                  <button
                    type="button"
                    className="settings-surface__processing-default"
                    disabled={!processingIntervalAvailable}
                    onClick={() => {
                      processingIntervalInteractionRef.current = false
                      previewProcessingInterval(DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS)
                      commitProcessingInterval()
                    }}
                  >
                    {intl.formatMessage(messages.restoreProcessingDefault)}
                  </button>
                </div>
              </section>
            </div>
          </>
        ) : null}
        {!developmentOnly ? (
          <section className="settings-surface__panel settings-surface__panel--navigation">
            <div className="settings-surface__copy">
              <h2>{intl.formatMessage(messages.navigationTitle)}</h2>
              <p>{intl.formatMessage(messages.navigationDescription)}</p>
            </div>
            <label className="settings-surface__toggle">
              <input
                type="checkbox"
                checked={bottomNavigationIncludeText}
                onChange={(event) =>
                  onBottomNavigationIncludeTextChange(
                    event.currentTarget.checked,
                  )
                }
              />
              <span>{intl.formatMessage(messages.navigationIncludeText)}</span>
            </label>
            <div className="settings-surface__navigation-toggles">
              {NAVIGATION_SHORTCUTS.filter(([item]) =>
                availableNavigationItems.includes(item)
              ).map(([item, message]) => (
                <label className="settings-surface__toggle" key={item}>
                  <input
                    type="checkbox"
                    checked={
                      navigationVisibility[item] ??
                      DEFAULT_BOTTOM_NAVIGATION_VISIBILITY[item]
                    }
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
        {!developmentOnly ? <section className="settings-surface__panel settings-surface__panel--save">
          <div className="settings-surface__copy">
            <h2>{intl.formatMessage(messages.saveData)}</h2>
            <p>{intl.formatMessage(messages.saveDescription)}</p>
          </div>
          <div className="settings-surface__save-actions">
            <button
              type="button"
              disabled={operationPending}
              onClick={(event) => {
                returnFocusRef.current = event.currentTarget
                setStatus('idle')
                setImportStatus('idle')
                setExportStatus('idle')
                setSelectedImport(null)
                setImportText('')
                setImportPreview(null)
                setImportPreviewStatus('idle')
                setDialog('import')
              }}
            >
              {intl.formatMessage(messages.importSave)}
            </button>
            <button
              type="button"
              disabled={operationPending}
              onClick={(event) =>
                void openExportDialog(event.currentTarget)}
            >
              {intl.formatMessage(messages.exportSave)}
            </button>
            <button
              type="button"
              className="settings-surface__reset"
              disabled={operationPending}
              onClick={(event) => {
                returnFocusRef.current = event.currentTarget
                setStatus('idle')
                setImportStatus('idle')
                setExportStatus('idle')
                setDialog('reset')
              }}
            >
              {intl.formatMessage(messages.reset)}
            </button>
          </div>
        </section> : null}
        {!developmentOnly ? (
          <section className="settings-surface__panel settings-surface__panel--visualization">
            <div className="settings-surface__copy">
              <h2>{intl.formatMessage(messages.visualizationTitle)}</h2>
              <p>{intl.formatMessage(messages.visualizationDescription)}</p>
            </div>
            <label className="settings-surface__toggle">
              <input
                type="checkbox"
                checked={visualizationVisible}
                onChange={(event) =>
                  onVisualizationVisibleChange(event.currentTarget.checked)
                }
              />
              <span>{intl.formatMessage(messages.visualizationToggle)}</span>
            </label>
          </section>
        ) : null}
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
                {import.meta.env.DEV ? (
                  <div className="settings-surface__development-debug">
                    <div className="settings-surface__copy">
                      <h3>
                        {intl.formatMessage(
                          messages.developmentDebugTitle,
                        )}
                      </h3>
                      <p>
                        {intl.formatMessage(
                          messages.developmentDebugDescription,
                        )}
                      </p>
                    </div>
                    <label className="settings-surface__toggle">
                      <input
                        type="checkbox"
                        checked={development.status().enabled}
                        disabled={
                          developmentOptionsStatus === 'pending'
                        }
                        onChange={(event) =>
                          void setDevelopmentOptionsEnabled(
                            event.currentTarget.checked,
                          )}
                      />
                      <span>
                        {intl.formatMessage(
                          messages.developmentDebugToggle,
                        )}
                      </span>
                    </label>
                  </div>
                ) : null}
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
                {developmentOptionsStatus === 'failed' ? (
                  <p
                    className="settings-surface__development-status"
                    role="alert"
                  >
                    {intl.formatMessage(
                      messages.developmentDebugFailed,
                    )}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
        {!developmentOnly && (status === 'succeeded' ||
        importStatus === 'succeeded' ||
        ((status === 'failed' || status === 'committed-recovery') &&
          dialog === null) ? (
          <p
            className="settings-surface__status"
            role={
              status === 'failed' ||
              status === 'committed-recovery'
                ? 'alert'
                : 'status'
            }
          >
            {intl.formatMessage(
              saveStatusMessage(status, importStatus),
            )}
          </p>
        ) : null)}
      </div>
      {!developmentOnly && dialog !== null ? (
        createPortal(<div
          ref={backdropRef}
          className="settings-surface__dialog-backdrop"
        >
          <section
            ref={dialogRef}
            className="settings-surface__dialog"
            role={dialog === 'export' ? 'dialog' : 'alertdialog'}
            aria-modal="true"
            aria-labelledby="save-dialog-title"
            aria-describedby="save-dialog-description"
            aria-busy={operationPending}
          >
            <h3 id="save-dialog-title">
              {intl.formatMessage(
                dialog === 'reset'
                  ? messages.resetDialogTitle
                  : dialog === 'import'
                    ? messages.importDialogTitle
                    : messages.exportDialogTitle,
              )}
            </h3>
            <p id="save-dialog-description">
              {intl.formatMessage(
                dialog === 'reset'
                  ? messages.resetConfirmation
                  : dialog === 'import'
                    ? messages.importDescription
                    : messages.exportDescription,
              )}
            </p>
            {dialog === 'reset' &&
            storedTime !== undefined &&
            storedTime.status().kind !== 'idle' ? (
              <p>{intl.formatMessage(messages.resetStoredTimeWarning)}</p>
            ) : null}
            {dialog === 'import' ? (
              importPreview === null ? <div className="settings-surface__transfer">
                <label htmlFor="settings-import-save-text">
                  {intl.formatMessage(messages.importStringLabel)}
                </label>
                <textarea
                  ref={transferTextRef}
                  id="settings-import-save-text"
                  value={importText}
                  disabled={importStatus === 'pending'}
                  placeholder={intl.formatMessage(
                    messages.importStringPlaceholder,
                  )}
                  wrap="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setImportText(event.currentTarget.value)
                    setSelectedImport(null)
                    setImportStatus('idle')
                    setImportPreviewStatus('idle')
                  }}
                />
                <div className="settings-surface__file-option">
                  <input
                    ref={importInputRef}
                    className="settings-surface__file-input"
                    type="file"
                    accept=".idsw,.txt,text/plain"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file === undefined) return
                      setSelectedImport(file)
                      setImportText('')
                      setImportStatus('idle')
                      setImportPreviewStatus('idle')
                    }}
                  />
                  <button
                    type="button"
                    disabled={importStatus === 'pending'}
                    onClick={() => importInputRef.current?.click()}
                  >
                    {intl.formatMessage(messages.chooseFile)}
                  </button>
                  {selectedImport !== null ? (
                    <span>{selectedImport.name}</span>
                  ) : null}
                </div>
              </div> : (
                <div
                  className="settings-surface__import-preview"
                  role="status"
                >
                  <h4>{intl.formatMessage(messages.importPreviewTitle)}</h4>
                  <dl>
                    <div>
                      <dt>{intl.formatMessage(messages.infinityPoints)}</dt>
                      <dd>{formatGameNumber(
                        intl.locale as EnabledLocale,
                        importPreview.infinityPoints,
                      )}</dd>
                    </div>
                    <div>
                      <dt>{intl.formatMessage(messages.quantumPoints)}</dt>
                      <dd>{formatGameNumber(
                        intl.locale as EnabledLocale,
                        importPreview.quantumPoints,
                      )}</dd>
                    </div>
                    <div>
                      <dt>{intl.formatMessage(messages.skillPoints)}</dt>
                      <dd>{formatWholeGameNumber(
                        intl.locale as EnabledLocale,
                        importPreview.skillPoints,
                      )}</dd>
                    </div>
                  </dl>
                  <p>{intl.formatMessage(messages.importPreviewWarning)}</p>
                  {storedTime !== undefined &&
                  storedTime.status().kind !== 'idle' ? (
                    <p>
                      {intl.formatMessage(
                        messages.importPreviewStoredTimeWarning,
                      )}
                    </p>
                  ) : null}
                </div>
              )
            ) : null}
            {dialog === 'export' ? (
              <div className="settings-surface__transfer">
                {exportBasis === 'pre-stored-time' ? (
                  <p className="settings-surface__dialog-feedback" role="status">
                    {intl.formatMessage(messages.exportPreStoredTime)}
                  </p>
                ) : null}
                <label htmlFor="settings-export-save-text">
                  {intl.formatMessage(messages.exportStringLabel)}
                </label>
                <textarea
                  ref={transferTextRef}
                  id="settings-export-save-text"
                  value={exportText}
                  readOnly
                  aria-busy={exportStatus === 'pending'}
                  placeholder={
                    exportStatus === 'pending'
                      ? intl.formatMessage(messages.exportLoading)
                      : exportStatus === 'failed'
                        ? intl.formatMessage(messages.exportFailed)
                        : undefined
                  }
                  wrap="off"
                  spellCheck={false}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            ) : null}
            {(dialog === 'reset' &&
              (status === 'failed' ||
                status === 'committed-recovery')) ||
            (dialog === 'import' &&
              (importStatus === 'failed' ||
                importStatus === 'committed-recovery' ||
                importPreviewStatus === 'failed')) ? (
              <p className="settings-surface__dialog-error" role="alert">
                {intl.formatMessage(
                  dialog === 'reset'
                    ? resetStatusMessage(status)
                    : importPreviewStatus === 'failed'
                      ? messages.importPreviewFailed
                    : importStatusMessage(importStatus),
                )}
              </p>
            ) : null}
            {dialog === 'export' &&
            (exportStatus === 'copied' ||
              exportStatus === 'downloaded' ||
              exportStatus === 'failed') ? (
              <p
                className="settings-surface__dialog-feedback"
                role={exportStatus === 'failed' ? 'alert' : 'status'}
              >
                {intl.formatMessage(
                  exportStatus === 'copied'
                    ? messages.exportCopied
                    : exportStatus === 'downloaded'
                      ? messages.exportSucceeded
                      : messages.exportFailed,
                )}
              </p>
            ) : null}
            <div className="settings-surface__dialog-actions">
              <button
                ref={cancelRef}
                type="button"
                disabled={dialog === 'export' ? false : operationPending}
                onClick={() => setDialog(null)}
              >
                {intl.formatMessage(
                  dialog === 'export' ? messages.close : messages.cancel,
                )}
              </button>
              {dialog === 'export' ? (
                <>
                  <button
                    type="button"
                    disabled={operationPending || exportText.length === 0}
                    onClick={() => void requestExportCopy()}
                  >
                    {intl.formatMessage(messages.copyString)}
                  </button>
                  {saveFileExportAvailable && (
                  <button
                    ref={confirmRef}
                    type="button"
                    disabled={operationPending || exportText.length === 0}
                    onClick={() => void requestExportDownload()}
                  >
                    {intl.formatMessage(messages.downloadFile)}
                  </button>
                  )}
                </>
              ) : (
                <button
                  ref={confirmRef}
                  type="button"
                  className={
                    dialog === 'reset'
                      ? 'settings-surface__reset'
                      : undefined
                  }
                  disabled={
                    operationPending ||
                    (dialog === 'import' &&
                      importPreview === null &&
                      selectedImport === null &&
                      importText.trim().length === 0)
                  }
                  onClick={() =>
                    void (dialog === 'reset'
                      ? requestReset()
                      : importPreview === null
                        ? requestImportPreview()
                        : requestImport())
                  }
                >
                  {intl.formatMessage(
                    dialog === 'reset'
                      ? status === 'pending'
                        ? messages.resetPending
                        : messages.reset
                      : importStatus === 'pending'
                        ? messages.importPending
                        : importPreviewStatus === 'pending'
                          ? messages.importReviewPending
                          : importPreview === null
                            ? messages.importReview
                            : messages.importSave,
                  )}
                </button>
              )}
            </div>
          </section>
        </div>,
        surfaceRef.current?.closest<HTMLElement>('.dyson-shell') ??
          document.body,
        )
      ) : null}
    </div>
  )
}

function isProcessingIntervalCommitKey(key: string): boolean {
  return key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'PageUp' ||
    key === 'PageDown' ||
    key === 'Home' ||
    key === 'End'
}

function AudioSettingsPanel({ audio }: { readonly audio: GameAudioService }) {
  const intl = useIntl()
  const settings = useAudioSettings(audio)
  return (
    <section className="settings-surface__panel settings-surface__panel--audio">
      <div className="settings-surface__copy">
        <h2>{intl.formatMessage(messages.audioTitle)}</h2>
        <p>{intl.formatMessage(messages.audioDescription)}</p>
      </div>
      <div className="settings-surface__audio-controls">
        <label>
          <span>{intl.formatMessage(messages.musicVolume)}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.musicVolume * 100)}
            style={{
              '--settings-range-progress': `${Math.round(settings.musicVolume * 100)}%`,
            } as CSSProperties}
            aria-valuetext={`${Math.round(settings.musicVolume * 100)}%`}
            onChange={(event) => void audio.update({
              musicVolume: Number(event.currentTarget.value) / 100,
            })}
          />
        </label>
        <label>
          <span>{intl.formatMessage(messages.effectsVolume)}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.effectsVolume * 100)}
            style={{
              '--settings-range-progress': `${Math.round(settings.effectsVolume * 100)}%`,
            } as CSSProperties}
            aria-valuetext={`${Math.round(settings.effectsVolume * 100)}%`}
            onChange={(event) => void audio.update({
              effectsVolume: Number(event.currentTarget.value) / 100,
            })}
          />
        </label>
        <label className="settings-surface__toggle">
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(event) => void audio.update({ muted: event.currentTarget.checked })}
          />
          <span>{intl.formatMessage(messages.muteAudio)}</span>
        </label>
      </div>
    </section>
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
  status: ResetStatus,
) {
  if (status === 'succeeded') return messages.resetSucceeded
  if (status === 'committed-recovery') {
    return messages.resetCommittedRecovery
  }
  return messages.resetFailed
}

function importStatusMessage(
  status: TransferStatus,
) {
  return status === 'committed-recovery'
    ? messages.importCommittedRecovery
    : messages.importFailed
}

function saveStatusMessage(
  reset: ResetStatus,
  imported: TransferStatus,
) {
  if (imported === 'succeeded') return messages.importSucceeded
  return resetStatusMessage(reset)
}
