import { useEffect, useId, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  FrontendApplicationSnapshot,
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { tinkerMessages } from './messages'
import {
  useTransientTinkerHold,
  type TinkerCommandDispatch,
  type TinkerPlayerCommand,
} from './useTransientTinkerHold'
import './tinker.css'

type ReadySnapshot = Extract<
  FrontendApplicationSnapshot,
  { readonly phase: 'ready' }
>
type ReadyTinker = Extract<
  ReadySnapshot['gameplay']['runtime']['tinker'],
  { readonly status: 'ready' }
>

export type TinkerFacts = ReadyTinker['value']

export interface TinkerSurfaceProps {
  readonly facts: TinkerFacts
  readonly dispatch: TinkerCommandDispatch
  readonly className?: string
}

type TinkerFailureCategory = 'stale' | 'rejected' | 'runtime'

export function TinkerSurface({
  facts,
  dispatch,
  className,
}: TinkerSurfaceProps) {
  const intl = useIntl()
  const titleId = useId()
  const actionId = useId()
  const outputId = useId()
  const tipId = useId()
  const remainingId = useId()
  const [failure, setFailure] = useState<TinkerFailureCategory | null>(
    null,
  )
  const handleResult = (
    _command: TinkerPlayerCommand,
    result: UiRuntimePlayerCommandResult,
  ): void => {
    if (result.status === 'rejected') {
      setFailure(result.stale ? 'stale' : 'rejected')
      return
    }
    setFailure(result.status === 'failed' ? 'runtime' : null)
  }
  const gesture = useTransientTinkerHold({
    canStart: facts.canStart,
    runtimeRepeat: facts.runtime.repeat,
    dispatch,
    onResult: handleResult,
    onDispatchFailure: () => setFailure('runtime'),
  })
  const visualElapsedSeconds = useVisualTinkerElapsed(facts)
  const seconds = facts.runtime.running
    ? Math.max(
        0,
        facts.runtime.cooldownSeconds - visualElapsedSeconds,
      )
    : facts.stats.cooldownSeconds
  const formattedSeconds = formatGameNumber(
    intl.locale as EnabledLocale,
    seconds,
  )
  const description =
    facts.presentationMode === 'manual-labour'
      ? intl.formatMessage(tinkerMessages.manualLabourDescription, {
          count: facts.stats.assemblyYield,
        })
      : facts.presentationMode === 'manual-labour-blocked'
        ? intl.formatMessage(
            tinkerMessages.blockedManualLabourDescription,
            { count: facts.stats.botYield },
          )
        : intl.formatMessage(tinkerMessages.defaultDescription)
  const showFreshSaveTip = facts.presentationMode === 'default'
  const running = facts.runtime.running
  const permanentlyHighlightsHeldProgress =
    facts.runtime.effectiveManualLabour ||
    facts.runtime.cooldownSeconds <= 0.5
  const showHeldVisual =
    gesture.active && permanentlyHighlightsHeldProgress
  const showHeldRepeatFill =
    showHeldVisual && facts.runtime.repeat
  const displayedProgressSeconds = showHeldRepeatFill
    ? facts.runtime.cooldownSeconds
    : visualElapsedSeconds
  const disabled = !facts.canStart && !running && !gesture.active
  const failureMessage =
    failure === 'stale'
      ? tinkerMessages.staleFailure
      : failure === 'rejected'
        ? tinkerMessages.rejectedFailure
        : tinkerMessages.runtimeFailure

  return (
    <section
      className={['tinker-surface', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-running={facts.runtime.running}
      data-repeat={facts.runtime.repeat}
      data-held-visual={showHeldVisual}
    >
      <button
        type="button"
        className="tinker-surface__control"
        data-gesture-active={gesture.active}
        aria-labelledby={`${titleId} ${actionId}`}
        aria-describedby={[
          outputId,
          showFreshSaveTip ? tipId : '',
          remainingId,
        ].filter(Boolean).join(' ')}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onPointerDown={gesture.onPointerDown}
        onPointerUp={gesture.onPointerUp}
        onPointerCancel={gesture.onPointerCancel}
        onLostPointerCapture={gesture.onLostPointerCapture}
        onKeyDown={gesture.onKeyDown}
        onKeyUp={gesture.onKeyUp}
        onBlur={gesture.onBlur}
        onClick={gesture.onClick}
      >
        <strong id={titleId} className="tinker-surface__title">
          {intl.formatMessage(tinkerMessages.title)}
        </strong>
        <span id={actionId} className="tinker-surface__label">
          {intl.formatMessage(tinkerMessages.action)}
        </span>
        <span id={outputId} className="tinker-surface__output">
          {description}
        </span>
        {showFreshSaveTip && (
          <span id={tipId} className="tinker-surface__tip">
            {intl.formatMessage(tinkerMessages.freshSaveTip)}
          </span>
        )}
        <span className="tinker-surface__progress-row">
          <span className="tinker-surface__progress-track">
            <progress
              className="tinker-surface__progress"
              aria-label={intl.formatMessage(tinkerMessages.progress)}
              aria-valuetext={intl.formatMessage(
                tinkerMessages.duration,
                { seconds: formattedSeconds },
              )}
              max={facts.runtime.cooldownSeconds}
              value={displayedProgressSeconds}
            />
            <span
              className="tinker-surface__hold-label"
              aria-hidden="true"
            >
              {intl.formatMessage(tinkerMessages.holdToRepeat)}
            </span>
          </span>
          <span id={remainingId} className="tinker-surface__time">
            {intl.formatMessage(tinkerMessages.duration, {
              seconds: formattedSeconds,
            })}
          </span>
        </span>
      </button>
      {failure && (
        <div
          className="tinker-surface__failure"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {intl.formatMessage(failureMessage)}
        </div>
      )}
    </section>
  )
}

/**
 * Interpolates only the displayed fill between canonical runtime snapshots.
 * Completion and rewards remain entirely owned by the lifecycle coordinator.
 */
function useVisualTinkerElapsed(facts: TinkerFacts): number {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [elapsed, setElapsed] = useState(facts.runtime.elapsedSeconds)

  useEffect(() => {
    const authoritativeElapsed = facts.runtime.elapsedSeconds
    setElapsed(authoritativeElapsed)
    if (!facts.runtime.running || prefersReducedMotion) return undefined

    const startedAt = performance.now()
    let frame = 0
    const update = (now: number) => {
      const nextElapsed = Math.min(
        facts.runtime.cooldownSeconds,
        authoritativeElapsed + (now - startedAt) / 1000,
      )
      setElapsed(nextElapsed)
      if (nextElapsed < facts.runtime.cooldownSeconds) {
        frame = requestAnimationFrame(update)
      }
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [
    facts.runtime.cooldownSeconds,
    facts.runtime.elapsedSeconds,
    facts.runtime.running,
    prefersReducedMotion,
  ])

  return elapsed
}
