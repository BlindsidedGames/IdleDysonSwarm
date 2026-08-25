import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { useIntl } from 'react-intl'
import type {
  FrontendCanonicalProgression,
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { Button } from '../../components'
import { formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type {
  UiRuntimePlayerCommandResult,
  UiRuntimeStoredTimeControls,
} from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { offlineTimeMessages as messages } from './messages'
import type { StoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'
import type { StoredTimeAccuracyPreset } from '../../../game-state/types'
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
  readonly infinityUsage: Pick<
    FrontendCanonicalProgression['infinity'],
    | 'storedTimeUsedThisCycleSeconds'
    | 'storedTimeUsedPreviousCycleSeconds'
  >
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

const IDLE_STORED_TIME_JOB: StoredTimeJobStatus = Object.freeze({
  kind: 'idle',
})

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
  infinityUsage,
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
  const [feedback, setFeedback] = useState<
    { readonly kind: 'success' | 'failure'; readonly seconds?: number } | null
  >(null)
  const [completionSummary, setCompletionSummary] = useState<{
    readonly consumedSeconds: number
    readonly remainingBankSeconds: number
  } | null>(null)
  const pendingRef = useRef(false)
  const jobDialogRef = useRef<HTMLDivElement | null>(null)

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
  const jobDialogOpen = jobActive || completionSummary !== null

  useEffect(() => {
    if (!jobDialogOpen) return undefined
    const dialog = jobDialogRef.current
    const backdrop = dialog?.parentElement
    if (!dialog || !backdrop) return undefined
    const returnFocus = document.activeElement as HTMLElement | null
    const background = [...document.body.children]
      .filter((element) => element !== backdrop)
      .map((element) => ({
        element: element as HTMLElement,
        wasInert: (element as HTMLElement).inert,
      }))
    for (const entry of background) entry.element.inert = true
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )]
    focusable()[0]?.focus()
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
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      for (const entry of background) entry.element.inert = entry.wasInert
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [jobDialogOpen])

  const spend = async (): Promise<void> => {
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
        setFeedback({ kind: 'success', seconds: result.consumedSeconds })
        setCompletionSummary({
          consumedSeconds: result.consumedSeconds,
          remainingBankSeconds: Math.max(
            0,
            bankSeconds - result.consumedSeconds,
          ),
        })
        setRepeatSeconds(requestedSeconds)
        publishDraft(selectedSeconds, requestedSeconds, false)
      } else {
        setFeedback({ kind: 'failure' })
      }
    } catch {
      setFeedback({ kind: 'failure' })
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
        setFeedback({ kind: 'failure' })
      }
    } catch {
      setFeedback({ kind: 'failure' })
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
      if (result.status !== 'accepted') setFeedback({ kind: 'failure' })
    } catch {
      setFeedback({ kind: 'failure' })
    }
  }

  const spendDisabled =
    pendingAction !== null ||
    jobActive ||
    storedTimeCheater ||
    !commandAvailability.requestStoredTimeSpend ||
    selectedSeconds <= 0

  return (
    <div className="offline-time-surface">
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
          <p className="offline-time-card__capacity">
            {intl.formatMessage(messages.capacity, {
              stored: formatGameDuration(locale, bankSeconds),
              capacity: formatGameDuration(locale, capacitySeconds),
            })}
          </p>
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
          <h2>{intl.formatMessage(messages.spendHeading)}</h2>
          <p>{intl.formatMessage(messages.spendDescription)}</p>
          <div className="offline-time-processing-settings">
            <label>
              {intl.formatMessage(messages.accuracyPreset)}
              <select
                value={processing.storedTimePreset}
                disabled={jobActive || pendingAction !== null || commandAvailability.setStoredTimePreset === false}
                onChange={(event) => void setProcessingPreference({
                  kind: 'time.set-stored-time-preset',
                  preset: event.currentTarget.value as StoredTimeAccuracyPreset,
                })}
              >
                <option value="fast">{intl.formatMessage(messages.fastPreset)}</option>
                <option value="balanced">{intl.formatMessage(messages.balancedPreset)}</option>
                <option value="accurate">{intl.formatMessage(messages.accuratePreset)}</option>
              </select>
            </label>
          </div>
          <p className="offline-time-card__note">
            {intl.formatMessage(messages.largeSpendDisclosure)}
          </p>
          <output htmlFor="offline-time-amount">
            {intl.formatMessage(messages.selectedAmount, {
              duration: formatGameDuration(locale, selectedSeconds),
            })}
          </output>
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
          <div className="offline-time-spend-actions">
            <Button
              className="offline-time-spend-button"
              variant="primary"
              state={pendingAction === 'spend' ? 'pending' : 'idle'}
              disabled={spendDisabled}
              onClick={() => void spend()}
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
                onClick={() => {
                  setArmed(false)
                  publishDraft(selectedSeconds, repeatSeconds, false)
                }}
              >
                {intl.formatMessage(messages.cancelConfirmation)}
              </Button>
            ) : null}
          </div>

          {jobDialogOpen && typeof document !== 'undefined' ? (
            createPortal(<div className="offline-time-job__backdrop">
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
              aria-live="polite"
              data-job-id={jobStatus.kind === 'idle' ? undefined : jobStatus.jobId}
            >
              <h2>
                {intl.formatMessage(
                  completionSummary === null
                    ? messages.processingHeading
                    : messages.simulationComplete,
                )}
              </h2>
              {completionSummary === null && jobStatus.kind !== 'idle' ? <><div
                className="offline-time-job__progress"
                role="progressbar"
                aria-label={intl.formatMessage(messages.simulationProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(jobStatus.fraction * 100)}
              >
                <span
                  aria-hidden="true"
                  style={{ transform: `scaleX(${jobStatus.fraction})` }}
                />
              </div>
              <p className="offline-time-job__status">
                {jobStatus.kind === 'cancelling'
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
                <dl className="offline-time-job__summary">
                  <div>
                    <dt>{intl.formatMessage(messages.timeSimulated)}</dt>
                    <dd>{formatGameDuration(locale, completionSummary.consumedSeconds)}</dd>
                  </div>
                  <div>
                    <dt>{intl.formatMessage(messages.timeRemaining)}</dt>
                    <dd>{formatGameDuration(locale, completionSummary.remainingBankSeconds)}</dd>
                  </div>
                </dl>
                <Button
                  variant="primary"
                  onClick={() => setCompletionSummary(null)}
                >
                  {intl.formatMessage(messages.closeSummary)}
                </Button>
              </> : null}
            </div>
            </div>, document.body)
          ) : null}

          {feedback ? (
            <p
              className={`offline-time-feedback offline-time-feedback--${feedback.kind}`}
              role={feedback.kind === 'failure' ? 'alert' : 'status'}
            >
              {feedback.kind === 'success'
                ? intl.formatMessage(messages.spendSuccess, {
                    duration: formatGameDuration(locale, feedback.seconds ?? 0),
                  })
                : intl.formatMessage(messages.actionFailed)}
            </p>
          ) : null}
        </article>

        <article className="offline-time-card offline-time-card--usage">
          <h2>{intl.formatMessage(messages.usageHeading)}</h2>
          <dl>
            <div>
              <dt>{intl.formatMessage(messages.currentInfinity)}</dt>
              <dd>
                {formatGameDuration(
                  locale,
                  infinityUsage.storedTimeUsedThisCycleSeconds,
                )}
              </dd>
            </div>
            <div>
              <dt>{intl.formatMessage(messages.previousInfinity)}</dt>
              <dd>
                {formatGameDuration(
                  locale,
                  infinityUsage.storedTimeUsedPreviousCycleSeconds,
                )}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  )
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
