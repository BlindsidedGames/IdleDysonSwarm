import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIntl } from 'react-intl'
import type {
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type { StoredTimeCompletionSummary } from '../../../core/storedTimeCompletionSummary'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { Button } from '../../components'
import { formatGameDuration, formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type {
  UiRuntimePlayerCommandResult,
  UiRuntimeStoredTimeControls,
} from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { offlineTimeMessages as messages } from './messages'
import { createIdleStoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'
import {
  STORED_TIME_ACCURACY_PRESETS,
  type StoredTimeAccuracyPreset,
} from '../../../game-state/types'
import { basicFacilityMessages } from '../facilities/messages'
import './offlineTime.css'

type OfflineTimeCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'time.upgrade-stored-capacity'
      | 'time.request-stored-time-spend'
      | 'time.set-stored-time-preset'
  }
>

export interface OfflineTimeCommandAvailability {
  readonly upgradeStoredCapacity: boolean
  readonly requestStoredTimeSpend: boolean
  readonly setStoredTimePreset?: boolean
}

export interface OfflineTimeSurfaceDraft {
  readonly selectedSeconds: number | null
  readonly repeatSeconds: number | null
  readonly armed: boolean
}

export interface OfflineTimeSurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['time']
  readonly previews: FrontendGameplayPreviews['time']
  readonly storedTimeCheater: boolean
  readonly commandAvailability: OfflineTimeCommandAvailability
  readonly dispatchPlayer: (
    command: OfflineTimeCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly storedTime?: UiRuntimeStoredTimeControls
  readonly processing?: {
    readonly storedTimePreset: StoredTimeAccuracyPreset
  }
  readonly initialDraft?: Readonly<OfflineTimeSurfaceDraft>
  readonly onDraftChange?: (
    draft: Readonly<OfflineTimeSurfaceDraft>,
  ) => void
}

const QUICK_AMOUNTS = Object.freeze([
  { seconds: 60, message: messages.oneMinute },
  { seconds: 600, message: messages.tenMinutes },
  { seconds: 3_600, message: messages.oneHour },
] as const)

const FACILITY_NAME_MESSAGES = Object.freeze({
  assembly_lines: basicFacilityMessages.assemblyLinesName,
  ai_managers: basicFacilityMessages.aiManagersName,
  servers: basicFacilityMessages.serversName,
  data_centers: basicFacilityMessages.dataCentersName,
  planets: basicFacilityMessages.planetsName,
  matrioshka_brains: basicFacilityMessages.matrioshkaBrainsName,
  birch_planets: basicFacilityMessages.birchPlanetsName,
  galactic_brains: basicFacilityMessages.galacticBrainsName,
})

const IDLE_STORED_TIME_JOB = createIdleStoredTimeJobStatus()

const INACTIVE_STORED_TIME_CONTROLS: UiRuntimeStoredTimeControls =
  Object.freeze({
    status: () => IDLE_STORED_TIME_JOB,
    subscribe: () => () => undefined,
    cancel: () => undefined,
    speedUp: () => undefined,
  })

/**
 * Presents Unity's consumable Offline Time bank. The canonical runtime owns
 * commit-first persistence and away-time simulation; this surface only selects
 * an amount, confirms intent, and reports the published result.
 */
export function OfflineTimeSurface({
  locale,
  resources,
  previews,
  storedTimeCheater,
  commandAvailability,
  dispatchPlayer,
  storedTime = INACTIVE_STORED_TIME_CONTROLS,
  processing = {
    storedTimePreset: 'balanced',
  },
  initialDraft,
  onDraftChange,
}: OfflineTimeSurfaceProps) {
  const intl = useIntl()
  const subscribeToJob = useCallback(
    (listener: () => void) => storedTime.subscribe(listener),
    [storedTime],
  )
  const readJobStatus = useCallback(() => storedTime.status(), [storedTime])
  const jobStatus = useSyncExternalStore(
    subscribeToJob,
    readJobStatus,
    readJobStatus,
  )
  const reducedMotion = usePrefersReducedMotion()
  const progressFillRef = useRef<HTMLSpanElement>(null)
  const bankSeconds = Math.max(
    0,
    Math.min(
      resources.storedTimeAvailableSeconds,
      previews.storedSpend.maximumSeconds,
    ),
  )
  const capacitySeconds = Math.max(
    0,
    resources.storedTimeCapacitySeconds,
  )
  const fill = capacitySeconds > 0
    ? Math.max(0, Math.min(1, bankSeconds / capacitySeconds))
    : 0
  useForwardProgressAnimation(progressFillRef, {
    canonicalProgress: fill,
    inferRate: 'increasing',
    active: fill < 1,
    wraps: false,
    reducedMotion,
  })
  const [selectedSeconds, setSelectedSeconds] = useState(() =>
    clampSelection(
      initialDraft?.selectedSeconds ?? defaultSelection(bankSeconds),
      bankSeconds,
    ),
  )
  const [armed, setArmed] = useState(initialDraft?.armed ?? false)
  const [repeatSeconds, setRepeatSeconds] = useState<number | null>(() =>
    validRepeatSelection(initialDraft?.repeatSeconds, bankSeconds),
  )
  const [pendingAction, setPendingAction] = useState<
    'spend' | 'upgrade' | null
  >(null)
  const [feedback, setFeedback] = useState<'failure' | null>(null)
  const [completionSummary, setCompletionSummary] = useState<{
    readonly consumedSeconds: number
    readonly result: StoredTimeCompletionSummary
  } | null>(null)
  const pendingRef = useRef(false)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const attachSurface = useCallback((node: HTMLDivElement | null) => {
    surfaceRef.current = node
    if (node === null || typeof document === 'undefined') return
    setPortalHost(node.closest('.dyson-shell') ?? document.body)
  }, [])
  const spendActionsRef = useRef<HTMLDivElement | null>(null)
  const jobDialogRef = useRef<HTMLDivElement | null>(null)
  const jobReturnFocusRef = useRef<HTMLElement | null>(null)
  const activeCompletionPointersRef = useRef(new Set<number>())
  const completionBackdropGestureRef = useRef<{
    readonly pointerId: number
    readonly startedOnBackdrop: boolean
    readonly endedOnBackdrop: boolean
  } | null>(null)

  useEffect(() => {
    setSelectedSeconds((current) =>
      bankSeconds <= 0
        ? 0
        : Math.max(
            Math.min(1, bankSeconds),
            Math.min(current || defaultSelection(bankSeconds), bankSeconds),
          ),
    )
  }, [bankSeconds])

  const publishDraft = (
    nextSelectedSeconds: number,
    nextRepeatSeconds: number | null,
    nextArmed: boolean,
  ): void => {
    onDraftChange?.({
      selectedSeconds: nextSelectedSeconds,
      repeatSeconds: nextRepeatSeconds,
      armed: nextArmed,
    })
  }

  const disarmConfirmation = useCallback((): void => {
    setArmed(false)
    onDraftChange?.({
      selectedSeconds,
      repeatSeconds,
      armed: false,
    })
  }, [onDraftChange, repeatSeconds, selectedSeconds])

  useEffect(() => {
    if (!armed) return undefined
    const disarmOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target
      if (
        target instanceof Node &&
        !spendActionsRef.current?.contains(target)
      ) {
        disarmConfirmation()
      }
    }
    document.addEventListener('pointerdown', disarmOnOutsidePointer, true)
    return () => {
      document.removeEventListener('pointerdown', disarmOnOutsidePointer, true)
    }
  }, [armed, disarmConfirmation])

  const select = (seconds: number): void => {
    const nextSelectedSeconds = clampSelection(seconds, bankSeconds)
    setSelectedSeconds(nextSelectedSeconds)
    setArmed(false)
    setRepeatSeconds(null)
    publishDraft(nextSelectedSeconds, null, false)
    setFeedback(null)
  }

  const repeatAvailable =
    repeatSeconds !== null &&
    repeatSeconds > 0 &&
    repeatSeconds <= bankSeconds
  const jobActive = jobStatus.kind !== 'idle'
  const jobDialogOpen =
    jobActive || pendingAction === 'spend' || completionSummary !== null
  const announcedProgressPercent = jobStatus.kind === 'idle'
    ? 0
    : Math.min(100, Math.floor(jobStatus.fraction * 10) * 10)

  useEffect(() => {
    if (jobDialogOpen) return
    activeCompletionPointersRef.current.clear()
    completionBackdropGestureRef.current = null
  }, [jobDialogOpen])

  useEffect(() => {
    if (!jobDialogOpen) return undefined
    const dialog = jobDialogRef.current
    const backdrop = dialog?.parentElement
    if (!dialog || !backdrop) return undefined
    const returnFocus =
      jobReturnFocusRef.current ??
      (document.activeElement as HTMLElement | null)
    const modalParent = backdrop.parentElement
    if (!modalParent) return undefined
    const background = [...modalParent.children]
      .filter((element) => element !== backdrop)
      .map((element) => ({
        element: element as HTMLElement,
        wasInert: (element as HTMLElement).inert,
      }))
    for (const entry of background) entry.element.inert = true
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )]
    ;(focusable()[0] ?? dialog).focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      for (const entry of background) entry.element.inert = entry.wasInert
      let focusRestored = false
      if (
        returnFocus?.isConnected &&
        !returnFocus.matches(':disabled, [aria-disabled="true"]')
      ) {
        returnFocus.focus()
        focusRestored = document.activeElement === returnFocus
      }
      if (!focusRestored) {
        surfaceRef.current?.querySelector<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )?.focus()
      }
      jobReturnFocusRef.current = null
    }
  }, [jobDialogOpen, portalHost])

  useEffect(() => {
    if (completionSummary === null) return
    const dialog = jobDialogRef.current
    if (dialog === null) return
    const continueControl = dialog.querySelector<HTMLButtonElement>(
      '.offline-time-job__continue',
    )
    ;(continueControl ?? dialog).focus()
  }, [completionSummary])

  const dismissCompletionSummary = useCallback((): void => {
    if (completionSummary === null || jobActive) return
    setCompletionSummary(null)
  }, [completionSummary, jobActive])

  const spend = async (returnFocus: HTMLElement): Promise<void> => {
    const requestedSeconds =
      repeatAvailable && repeatSeconds !== null
        ? repeatSeconds
        : selectedSeconds
    if (
      pendingRef.current ||
      jobActive ||
      storedTimeCheater ||
      !commandAvailability.requestStoredTimeSpend ||
      requestedSeconds <= 0
    ) {
      return
    }
    if (!armed && !repeatAvailable) {
      setArmed(true)
      publishDraft(selectedSeconds, repeatSeconds, true)
      setFeedback(null)
      return
    }

    jobReturnFocusRef.current = returnFocus
    pendingRef.current = true
    setPendingAction('spend')
    setArmed(false)
    publishDraft(selectedSeconds, repeatSeconds, false)
    setFeedback(null)
    try {
      const result = await dispatchPlayer({
        kind: 'time.request-stored-time-spend',
        requestedSeconds,
      })
      if (
        (result.status === 'accepted' || result.status === 'partial') &&
        result.kind === 'stored-time'
      ) {
        setFeedback(null)
        setCompletionSummary({
          consumedSeconds: result.consumedSeconds,
          result: result.summary,
        })
        setRepeatSeconds(requestedSeconds)
        publishDraft(selectedSeconds, requestedSeconds, false)
      } else {
        setFeedback('failure')
      }
    } catch {
      setFeedback('failure')
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const upgradeCapacity = async (): Promise<void> => {
    if (
      pendingRef.current ||
      jobActive ||
      storedTimeCheater ||
      !commandAvailability.upgradeStoredCapacity ||
      !previews.storedCapacity.eligible
    ) {
      return
    }
    pendingRef.current = true
    setPendingAction('upgrade')
    setFeedback(null)
    try {
      const result = await dispatchPlayer({
        kind: 'time.upgrade-stored-capacity',
      })
      if (result.status !== 'accepted') {
        setFeedback('failure')
      }
    } catch {
      setFeedback('failure')
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const setProcessingPreference = async (
    command: {
      readonly kind: 'time.set-stored-time-preset'
      readonly preset: StoredTimeAccuracyPreset
    },
  ): Promise<void> => {
    if (jobActive) return
    setFeedback(null)
    try {
      const result = await dispatchPlayer(command)
      if (result.status !== 'accepted') setFeedback('failure')
    } catch {
      setFeedback('failure')
    }
  }

  const spendDisabled =
    pendingAction !== null ||
    jobActive ||
    storedTimeCheater ||
    !commandAvailability.requestStoredTimeSpend ||
    selectedSeconds <= 0

  return (
    <div ref={attachSurface} className="offline-time-surface">
      <header className="offline-time-surface__header">
        <div className="offline-time-surface__title" aria-hidden="true">
          {intl.formatMessage(messages.region)}
        </div>
        <p>{intl.formatMessage(messages.explanation)}</p>
      </header>

      <div className="offline-time-surface__scroll-region">
        {storedTimeCheater ? (
          <p className="offline-time-surface__warning" role="alert">
            {intl.formatMessage(messages.disabled)}
          </p>
        ) : null}

        <article className="offline-time-card offline-time-card--storage">
          <div className="offline-time-card__heading">
            <h2>{intl.formatMessage(messages.stored)}</h2>
            <strong>{formatGameDuration(locale, bankSeconds)}</strong>
          </div>
          <div
            className="offline-time-storage-progress"
            role="progressbar"
            aria-label={intl.formatMessage(messages.storageProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fill * 100)}
          >
            <span
              ref={progressFillRef}
              aria-hidden="true"
              style={{ transform: `scaleX(${fill})` }}
            />
          </div>
          {bankSeconds <= 0 ? (
            <p className="offline-time-card__note">
              {intl.formatMessage(messages.noStoredTime)}
            </p>
          ) : null}

          {previews.storedCapacity.eligible ? (
            <div className="offline-time-capacity-upgrade">
              <p>
                {intl.formatMessage(messages.doubleStorageDescription, {
                  capacity: formatGameDuration(
                    locale,
                    previews.storedCapacity.nextCapacitySeconds,
                  ),
                })}
              </p>
              <Button
                variant="primary"
                state={pendingAction === 'upgrade' ? 'pending' : 'idle'}
                disabled={
                  pendingAction !== null ||
                  jobActive ||
                  storedTimeCheater ||
                  !commandAvailability.upgradeStoredCapacity
                }
                onClick={() => void upgradeCapacity()}
              >
                {intl.formatMessage(messages.doubleStorage)}
              </Button>
            </div>
          ) : previews.storedCapacity.code === 'maximum-reached' ? (
            <p className="offline-time-card__maximum">
              {intl.formatMessage(messages.maximumStorage)}
            </p>
          ) : null}
        </article>

        <article className="offline-time-card offline-time-card--spend">
          <div className="offline-time-card__heading">
            <h2>{intl.formatMessage(messages.spendHeading)}</h2>
            <output htmlFor="offline-time-amount">
              {formatGameDuration(locale, selectedSeconds)}
            </output>
          </div>
          <p>{intl.formatMessage(messages.spendDescription)}</p>
          <input
            id="offline-time-amount"
            type="range"
            min={bankSeconds > 0 ? Math.min(1, bankSeconds) : 0}
            max={bankSeconds}
            step={bankSeconds < 1 ? 'any' : 1}
            value={Math.min(selectedSeconds, bankSeconds)}
            disabled={bankSeconds <= 0 || pendingAction !== null || jobActive || storedTimeCheater}
            aria-label={intl.formatMessage(messages.spendHeading)}
            aria-valuetext={formatGameDuration(locale, selectedSeconds)}
            onChange={(event) => select(event.currentTarget.valueAsNumber)}
          />
          <div
            className="offline-time-quick-select"
            role="group"
            aria-label={intl.formatMessage(messages.spendHeading)}
          >
            {QUICK_AMOUNTS.map(({ seconds, message }) => (
              <button
                key={seconds}
                type="button"
                disabled={bankSeconds < seconds || pendingAction !== null || jobActive || storedTimeCheater}
                aria-pressed={selectedSeconds === seconds}
                onClick={() => select(seconds)}
              >
                {intl.formatMessage(message)}
              </button>
            ))}
            <button
              type="button"
              disabled={bankSeconds <= 0 || pendingAction !== null || jobActive || storedTimeCheater}
              aria-pressed={bankSeconds > 0 && selectedSeconds === bankSeconds}
              onClick={() => select(bankSeconds)}
            >
              {intl.formatMessage(messages.all)}
            </button>
          </div>
          <div className="offline-time-processing-settings">
            <label htmlFor="offline-time-accuracy">
              {intl.formatMessage(messages.accuracyPreset)}
            </label>
            <div className="offline-time-processing-settings__select">
              <select
                id="offline-time-accuracy"
                value={processing.storedTimePreset}
                disabled={jobActive || pendingAction !== null || commandAvailability.setStoredTimePreset === false}
                onChange={(event) => void setProcessingPreference({
                  kind: 'time.set-stored-time-preset',
                  preset: event.currentTarget.value as StoredTimeAccuracyPreset,
                })}
              >
                {STORED_TIME_ACCURACY_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {intl.formatMessage(presetMessage(preset))}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="offline-time-card__note">
            {intl.formatMessage(messages.largeSpendDisclosure)}
          </p>
          <div
            ref={spendActionsRef}
            className="offline-time-spend-actions"
          >
            <Button
              className="offline-time-spend-button"
              variant="primary"
              state={pendingAction === 'spend' ? 'pending' : 'idle'}
              disabled={spendDisabled}
              onClick={(event) => void spend(event.currentTarget)}
            >
              {pendingAction === 'spend'
                ? intl.formatMessage(messages.processing)
                : repeatAvailable
                  ? intl.formatMessage(messages.spendAgain, {
                      duration: formatGameDuration(locale, repeatSeconds),
                    })
                  : armed
                  ? intl.formatMessage(messages.confirmSpend)
                  : intl.formatMessage(messages.spend, {
                      duration: formatGameDuration(locale, selectedSeconds),
                    })}
            </Button>
            {armed ? (
              <Button
                variant="secondary"
                onClick={disarmConfirmation}
              >
                {intl.formatMessage(messages.cancelConfirmation)}
              </Button>
            ) : null}
          </div>

          {jobDialogOpen && portalHost !== null ? (
            createPortal(<div
              className="offline-time-job__backdrop"
              onPointerDown={(event) => {
                const activePointers = activeCompletionPointersRef.current
                activePointers.add(event.pointerId)
                const captureTarget = event.target
                if (
                  captureTarget instanceof Element &&
                  typeof captureTarget.setPointerCapture === 'function'
                ) {
                  captureTarget.setPointerCapture(event.pointerId)
                }
                if (activePointers.size !== 1) {
                  completionBackdropGestureRef.current = null
                  return
                }
                const startedOnBackdrop =
                  completionSummary !== null &&
                  !jobActive &&
                  event.target === event.currentTarget
                completionBackdropGestureRef.current = {
                  pointerId: event.pointerId,
                  startedOnBackdrop,
                  endedOnBackdrop: false,
                }
              }}
              onPointerUp={(event) => {
                activeCompletionPointersRef.current.delete(event.pointerId)
                const gesture = completionBackdropGestureRef.current
                if (gesture?.pointerId !== event.pointerId) return
                const releasedOver =
                  typeof document.elementFromPoint === 'function'
                    ? document.elementFromPoint(event.clientX, event.clientY)
                    : event.target
                completionBackdropGestureRef.current = {
                  ...gesture,
                  endedOnBackdrop: releasedOver === event.currentTarget,
                }
              }}
              onPointerCancel={(event) => {
                activeCompletionPointersRef.current.delete(event.pointerId)
                if (
                  completionBackdropGestureRef.current?.pointerId ===
                  event.pointerId
                ) {
                  completionBackdropGestureRef.current = null
                }
              }}
              onLostPointerCapture={(event) => {
                const wasActive = activeCompletionPointersRef.current.delete(
                  event.pointerId,
                )
                if (
                  wasActive &&
                  completionBackdropGestureRef.current?.pointerId ===
                  event.pointerId
                ) {
                  completionBackdropGestureRef.current = null
                }
              }}
              onClick={(event) => {
                const gesture = completionBackdropGestureRef.current
                completionBackdropGestureRef.current = null
                if (
                  gesture?.startedOnBackdrop === true &&
                  gesture.endedOnBackdrop &&
                  event.target === event.currentTarget
                ) {
                  dismissCompletionSummary()
                }
              }}
            >
            <div
              ref={jobDialogRef}
              className="offline-time-job"
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={intl.formatMessage(
                completionSummary === null
                  ? messages.simulationProgress
                  : messages.simulationComplete,
              )}
              data-job-id={jobStatus.kind === 'idle' ? undefined : jobStatus.jobId}
            >
              <p
                className="ui-visually-hidden"
                role="status"
                aria-atomic="true"
              >
                {completionSummary !== null
                  ? intl.formatMessage(messages.simulationComplete)
                  : jobStatus.kind === 'cancelling'
                    ? intl.formatMessage(messages.cancelling)
                    : jobStatus.kind === 'running' || jobStatus.kind === 'committing'
                      ? intl.formatMessage(messages.progressAnnouncement, {
                          percent: announcedProgressPercent,
                        })
                      : intl.formatMessage(messages.preparing)}
              </p>
              <h2>
                {intl.formatMessage(
                  completionSummary === null
                    ? messages.processingHeading
                    : messages.simulationComplete,
                )}
              </h2>
              {completionSummary === null ? <><div
                className="offline-time-job__progress"
                role="progressbar"
                aria-label={intl.formatMessage(messages.simulationProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={jobStatus.kind === 'idle' ? 0 : Math.round(jobStatus.fraction * 100)}
              >
                <span
                  aria-hidden="true"
                  style={{ transform: `scaleX(${jobStatus.kind === 'idle' ? 0 : jobStatus.fraction})` }}
                />
              </div>
              <p className="offline-time-job__status">
                {jobStatus.kind === 'idle'
                  ? intl.formatMessage(messages.preparing)
                  : jobStatus.kind === 'cancelling'
                  ? intl.formatMessage(messages.cancelling)
                  : intl.formatMessage(messages.progress, {
                      percent: Math.round(jobStatus.fraction * 100),
                      eta: jobStatus.estimatedRemainingMilliseconds === null
                        ? intl.formatMessage(messages.calculating)
                        : formatGameDuration(
                            locale,
                            jobStatus.estimatedRemainingMilliseconds / 1000,
                          ),
                    })}
              </p>
              {jobStatus.kind === 'running' && jobStatus.canSpeedUp ? (
                <Button
                  variant="secondary"
                  onClick={() => storedTime.speedUp?.()}
                >
                  {intl.formatMessage(messages.speedUp)}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                disabled={jobStatus.kind !== 'running'}
                onClick={storedTime.cancel}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
              </> : completionSummary !== null ? <>
                <div className="offline-time-job__results">
                  <dl className={`offline-time-job__meta ${
                    completionSummary.result.infinityCount === 0n && completionSummary.result.botGain > 0
                      ? 'offline-time-job__meta--with-bots'
                      : ''
                  }`}>
                    <CompletionFact
                      label={intl.formatMessage(messages.timeSimulated)}
                      value={formatGameDuration(locale, completionSummary.consumedSeconds)}
                    />
                    <CompletionFact
                      label={intl.formatMessage(messages.timeRemaining)}
                      value={formatGameDuration(locale, completionSummary.result.remainingBankSeconds)}
                    />
                    <CompletionFact
                      label={intl.formatMessage(messages.accuracyPreset)}
                      value={completionSummary.result.accuracyReduced
                        ? intl.formatMessage(messages.reducedAccuracy, {
                            preset: intl.formatMessage(
                              presetMessage(completionSummary.result.preset),
                            ),
                          })
                        : intl.formatMessage(
                            presetMessage(completionSummary.result.preset),
                          )}
                    />
                    {completionSummary.result.infinityCount === 0n && completionSummary.result.botGain > 0 ? (
                      <CompletionFact
                        label={intl.formatMessage(messages.botsGained)}
                        value={`+${formatGameNumber(locale, completionSummary.result.botGain)}`}
                      />
                    ) : null}
                    <CompletionFact
                      label={intl.formatMessage(messages.simulationUpdates)}
                      value={formatGameNumber(
                        locale,
                        completionSummary.result.simulationUpdates,
                      )}
                    />
                  </dl>

                  {completionSummary.result.infinityPoints > 0n || completionSummary.result.infinityCount > 0n ? (
                    <CompletionGroup title={intl.formatMessage(messages.infinityGroup)}>
                      {completionSummary.result.infinityPoints > 0n ? <CompletionFact
                        label={intl.formatMessage(messages.infinityPointsGained)}
                        value={formatGameNumber(locale, completionSummary.result.infinityPoints)}
                      /> : null}
                      {completionSummary.result.infinityCount > 0n ? <CompletionFact
                        label={intl.formatMessage(messages.infinitiesCompleted)}
                        value={formatGameNumber(locale, completionSummary.result.infinityCount)}
                      /> : null}
                    </CompletionGroup>
                  ) : null}

                  {completionSummary.result.infinityCount === 0n && completionSummary.result.facilityGains.length > 0 ? (
                    <CompletionGroup
                      title={intl.formatMessage(messages.facilitiesGroup)}
                      className="offline-time-job__group--facilities"
                    >
                      {completionSummary.result.facilityGains.map((gain) => <CompletionFact
                        key={gain.facilityId}
                        label={intl.formatMessage(FACILITY_NAME_MESSAGES[gain.facilityId])}
                        value={`+${formatGameNumber(locale, gain.quantity)}`}
                      />)}
                    </CompletionGroup>
                  ) : null}

                  {completionSummary.result.dreamResetCount > 0n || completionSummary.result.strangeMatter > 0 ? (
                    <CompletionGroup title={intl.formatMessage(messages.simulationsGroup)}>
                      {completionSummary.result.dreamResetCount > 0n ? <CompletionFact
                        label={intl.formatMessage(messages.simulationResets)}
                        value={formatGameNumber(locale, completionSummary.result.dreamResetCount)}
                      /> : null}
                      {completionSummary.result.strangeMatter > 0 ? <CompletionFact
                        label={intl.formatMessage(messages.strangeMatterGained)}
                        value={formatGameNumber(locale, completionSummary.result.strangeMatter)}
                      /> : null}
                    </CompletionGroup>
                  ) : null}

                  {completionSummary.result.realityWorkers > 0n || completionSummary.result.influence > 0n ? (
                    <CompletionGroup title={intl.formatMessage(messages.realityGroup)}>
                      {completionSummary.result.realityWorkers > 0n ? <CompletionFact
                        label={intl.formatMessage(messages.realityWorkersGained)}
                        value={formatGameNumber(locale, completionSummary.result.realityWorkers)}
                      /> : null}
                      {completionSummary.result.influence > 0n ? <CompletionFact
                        label={intl.formatMessage(messages.influenceGained)}
                        value={formatGameNumber(locale, completionSummary.result.influence)}
                      /> : null}
                    </CompletionGroup>
                  ) : null}
                </div>
                {!hasProgressionGains(completionSummary.result) ? (
                  <p className="offline-time-job__empty">
                    {intl.formatMessage(messages.noMajorChanges)}
                  </p>
                ) : null}
                <Button
                  className="offline-time-job__continue"
                  variant="primary"
                  onClick={dismissCompletionSummary}
                >
                  {intl.formatMessage(messages.closeSummary)}
                </Button>
              </> : null}
            </div>
            </div>, portalHost)
          ) : null}

          {feedback ? (
            <p
              className="offline-time-feedback offline-time-feedback--failure"
              role="alert"
            >
              {intl.formatMessage(messages.actionFailed)}
            </p>
          ) : null}
        </article>

      </div>
    </div>
  )
}

function presetMessage(preset: StoredTimeAccuracyPreset) {
  if (preset === 'fast') return messages.fastPreset
  if (preset === 'accurate') return messages.accuratePreset
  return messages.balancedPreset
}

function hasProgressionGains(summary: StoredTimeCompletionSummary): boolean {
  return summary.infinityPoints > 0n ||
    summary.infinityCount > 0n ||
    summary.dreamResetCount > 0n ||
    summary.strangeMatter > 0 ||
    summary.realityWorkers > 0n ||
    summary.influence > 0 ||
    summary.botGain > 0 ||
    summary.facilityGains.length > 0
}

function CompletionFact({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return <div className="offline-time-job__fact">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
}

function CompletionGroup({
  title,
  className = '',
  children,
}: {
  readonly title: string
  readonly className?: string
  readonly children: ReactNode
}) {
  return <section className={`offline-time-job__group ${className}`}>
    <h3>{title}</h3>
    <dl>{children}</dl>
  </section>
}

function defaultSelection(bankSeconds: number): number {
  return Math.max(0, Math.min(60, bankSeconds))
}

function clampSelection(seconds: number, bankSeconds: number): number {
  if (!Number.isFinite(seconds)) return defaultSelection(bankSeconds)
  return Math.max(0, Math.min(seconds, bankSeconds))
}

function validRepeatSelection(
  seconds: number | null | undefined,
  bankSeconds: number,
): number | null {
  return seconds !== undefined &&
    seconds !== null &&
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds <= bankSeconds
    ? seconds
    : null
}
