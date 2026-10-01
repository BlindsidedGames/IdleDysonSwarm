import { manualFacilityPresentation } from '../skills/manualFacilityMessages'
import { basicFacilityMessages as facilityMessages } from '../facilities/messages'
import {
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useIntl } from 'react-intl'
import type {
  FrontendApplicationSnapshot,
  UiRuntimePlayerCommandResult,
  UiRuntimeStoredTimeControls,
} from '../../runtime'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { tinkerMessages } from './messages'
import {
  useTinkerPressController,
  type TinkerCommandDispatch,
  type TinkerPlayerCommand,
} from './useTinkerPressController'
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
  readonly storedTime?: UiRuntimeStoredTimeControls
  readonly dispatch: TinkerCommandDispatch
  readonly className?: string
}
type TinkerFailureCategory = 'rejected' | 'runtime'

const NO_JOB_SUBSCRIPTION = () => undefined
const IDLE = () => false

export function TinkerSurface({
  facts,
  storedTime,
  dispatch,
  className,
}: TinkerSurfaceProps) {
  const subscribe = useCallback(
    (listener: () => void) => storedTime?.subscribe(listener) ?? NO_JOB_SUBSCRIPTION,
    [storedTime],
  )
  const readBusy = useCallback(
    () => storedTime !== undefined && storedTime.status().kind !== 'idle',
    [storedTime],
  )
  const jobActive = useSyncExternalStore(subscribe, readBusy, IDLE)
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
      setFailure(result.stale ? null : 'rejected')
      return
    }
    setFailure(result.status === 'failed' ? 'runtime' : null)
  }
  const gesture = useTinkerPressController({
    canInteract: facts.canStart || facts.runtime.running,
    interactionBlocked: jobActive,
    repeatAvailable: facts.presentationMode !== 'default',
    runtimeRepeat: facts.runtime.repeat,
    dispatch,
    onResult: handleResult,
    onDispatchFailure: () => setFailure('runtime'),
  })
  const visualElapsedSeconds = facts.runtime.elapsedSeconds
  const normalizedProgress = facts.runtime.cooldownSeconds > 0
    ? Math.min(
        1,
        Math.max(
          0,
          visualElapsedSeconds / facts.runtime.cooldownSeconds,
        ),
      )
    : 0
  const progressFillRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  useForwardProgressAnimation(progressFillRef, {
    canonicalProgress: normalizedProgress,
    normalizedRatePerSecond:
      facts.runtime.cooldownSeconds > 0
        ? 1 / facts.runtime.cooldownSeconds
        : 0,
    active: facts.runtime.running,
    wraps: facts.runtime.repeat,
    reducedMotion,
  })
  const seconds = facts.runtime.running
    ? Math.max(
        0,
        facts.runtime.cooldownSeconds - visualElapsedSeconds,
      )
    : facts.stats.cooldownSeconds
  const locale = intl.locale as EnabledLocale
  const formattedSeconds = formatGameNumber(locale, seconds)
  const highlightedValue = (chunks: ReactNode) => (
    <span className="tinker-surface__yield">{chunks}</span>
  )
  const facilityRewards = [
    { facilityId: 'assembly_lines' as const, name: facilityMessages.assemblyLinesName },
    ...manualFacilityPresentation,
  ].filter(({ facilityId }) => (facts.stats.facilityYields?.[facilityId] ?? 0) > 0)
  const combinedRewards = facilityRewards.length > 0 &&
    (facts.presentationMode === 'hand-assembly' || facilityRewards.some(r => r.facilityId !== 'assembly_lines'))
  const description =
    facts.facilitiesDisabled || facts.presentationMode === 'hand-assembly' ? intl.formatMessage(tinkerMessages.handAssemblyDescription, { count: formatGameNumber(locale, facts.stats.botYield), value: highlightedValue }) : facts.presentationMode === 'manual-labour'
      ? intl.formatMessage(tinkerMessages.manualLabourDescription, {
          count: formatGameNumber(
            locale,
            facts.stats.assemblyYield,
          ),
          value: highlightedValue,
        })
      : facts.presentationMode === 'manual-labour-blocked'
        ? intl.formatMessage(
            tinkerMessages.blockedManualLabourDescription,
            {
              count: formatGameNumber(locale, facts.stats.botYield),
              value: highlightedValue,
            },
          )
        : intl.formatMessage(tinkerMessages.defaultDescription)
  const showFreshSaveTip = facts.presentationMode === 'default' && !facts.facilitiesDisabled
  const showRepeatStatus = facts.presentationMode !== 'default'
  const running = facts.runtime.running
  const showHeldVisual = gesture.active
  const disabled = jobActive || (!facts.canStart && !running && !gesture.active)
  const failureMessage = failure === 'rejected'
    ? tinkerMessages.rejectedFailure
    : tinkerMessages.runtimeFailure

  if (facts.eligibility === 'challenge-disabled') return null

  return (
    <section
      className={['tinker-surface', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-running={facts.runtime.running}
      data-repeat={facts.runtime.repeat}
      data-held-visual={showHeldVisual}
      data-press-phase={gesture.phase}
    >
      <button
        ref={gesture.controlRef}
        data-manages-native-touch="true"
        type="button"
        draggable={false}
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
        onContextMenu={gesture.onContextMenu}
        onDragStart={gesture.onDragStart}
      >
        <strong id={titleId} className="tinker-surface__title">
          {intl.formatMessage(tinkerMessages.title)}
        </strong>
        <span id={actionId} className="tinker-surface__label">
          {intl.formatMessage(tinkerMessages.action)}
        </span>
        <span id={outputId} className="tinker-surface__output">
          {combinedRewards ? <span className="tinker-surface__rewards">
            {facts.presentationMode !== 'manual-labour' && <span>
              {intl.formatMessage(tinkerMessages.handAssemblyDescription, { count: formatGameNumber(locale, facts.stats.botYield), value: highlightedValue })}
            </span>}
            {facilityRewards.map(({ facilityId, name }) => <span key={facilityId}>
              {intl.formatMessage(name)}: <span className="tinker-surface__yield">{formatGameNumber(locale, facts.stats.facilityYields![facilityId]!)}</span>
            </span>)}
          </span> : description}
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
              value={visualElapsedSeconds}
            />
            <span
              ref={progressFillRef}
              aria-hidden="true"
              className="tinker-surface__progress-fill"
              style={{ transform: `scaleX(${normalizedProgress})` }}
            />
            {showRepeatStatus && (
              <span
                className="tinker-surface__hold-label"
                aria-hidden="true"
              >
                {intl.formatMessage(
                  gesture.repeating
                    ? tinkerMessages.repeating
                    : tinkerMessages.holdToRepeat,
                )}
              </span>
            )}
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
