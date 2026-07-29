import { useId, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  FrontendApplicationSnapshot,
  UiRuntimePlayerCommandResult,
} from '../../runtime'
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
  const seconds =
    facts.timeToCompletionSeconds ?? facts.stats.cooldownSeconds
  const formattedSeconds = intl.formatNumber(seconds, {
    maximumFractionDigits: 3,
  })
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
  const disabled = !facts.canStart && !gesture.active
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
    >
      <button
        type="button"
        className="tinker-surface__control"
        data-gesture-active={gesture.active}
        aria-labelledby={`${titleId} ${actionId}`}
        aria-describedby={`${outputId} ${remainingId}`}
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
        <span id={remainingId} className="tinker-surface__time">
          {intl.formatMessage(tinkerMessages.duration, {
            seconds: formattedSeconds,
          })}
        </span>
        <progress
          className="tinker-surface__progress"
          aria-label={intl.formatMessage(tinkerMessages.progress)}
          aria-valuetext={intl.formatMessage(tinkerMessages.duration, {
            seconds: formattedSeconds,
          })}
          max={facts.runtime.cooldownSeconds}
          value={facts.runtime.elapsedSeconds}
        />
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
