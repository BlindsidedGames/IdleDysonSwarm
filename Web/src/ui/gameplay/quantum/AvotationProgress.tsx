import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { FrontendGameplayPreviews } from '../../../application/frontendSnapshot'
import { AVOCADO_MEDITATION_TOTAL_STEPS } from '../../../simulation/avocadoMeditation'
import dabbingAvocadoUrl from '../../assets/avotation-dabbing-avocado.png'
import meditationAvocadoUrl from '../../assets/avotation-meditation.png'
import { Button } from '../../components'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { avocatoMessages as messages } from './messages'

type MeditationCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'avocado.complete-meditation-step' }
>

const MEDITATION_HINTS = [
  'Quantum; SU?',
  'Infinity has a point... top-right.',
  'Workers produced more than output.',
  'Some paths are preset. Start with 1.',
  'Settings hides a door to more.',
  'Research has settings too...',
  'The last clue sits in plain sight to the side.',
] as const

const AVOTATION_NAMES = [
  'Gudu!',
  'QUACKERS!',
  'Holg!',
  'Latimer Cross!',
  'Mentojacka!',
  'Nuclearion!',
  'VashVash!',
] as const

export interface AvotationProgressProps {
  readonly preview: FrontendGameplayPreviews['avocado']['meditation']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: (
    command: MeditationCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly countdownSeconds?: number
}

/**
 * Unity keeps Avotation's progress, clues, help and skip controls with the
 * Quantum upgrades. The hidden targets themselves remain distributed.
 */
export function AvotationProgress({
  preview,
  routeAvailable,
  dispatchPlayer,
  countdownSeconds = 120,
}: AvotationProgressProps) {
  const intl = useIntl()
  const [helpActive, setHelpActive] = useState(false)
  const [remaining, setRemaining] = useState(countdownSeconds)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const completed = preview.requiredStepIndex === null

  useEffect(() => {
    if (!helpActive || completed || remaining <= 0) return
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [completed, helpActive, remaining])

  const skip = async () => {
    if (
      pending ||
      remaining > 0 ||
      preview.requiredStepIndex === null ||
      !routeAvailable
    ) {
      return
    }
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'avocado.complete-meditation-step',
        requiredStepIndex: preview.requiredStepIndex,
      })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') {
        setHelpActive(false)
        setRemaining(countdownSeconds)
      }
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  const current = completed
    ? AVOCADO_MEDITATION_TOTAL_STEPS
    : preview.requiredStepIndex ?? 0

  return (
    <section
      className="avocato-meditation"
      aria-labelledby="avotation-progress-heading"
    >
      <div>
        <div className="avocato-meditation__title">
          <h2 id="avotation-progress-heading">
            {intl.formatMessage(messages.meditation)}
          </h2>
          <div className="avocato-meditation__found-icons" aria-hidden="true">
            {Array.from({ length: current }, (_, index) => (
              <img key={index} src={dabbingAvocadoUrl} alt="" />
            ))}
          </div>
        </div>
        <span className="avocato-meditation__count">
          {intl.formatMessage(messages.meditationProgress, {
            current,
            total: AVOCADO_MEDITATION_TOTAL_STEPS,
          })}
        </span>
      </div>
      {completed ? null : (
        <ol
          aria-label={intl.formatMessage(messages.meditationProgress, {
            current,
            total: AVOCADO_MEDITATION_TOTAL_STEPS,
          })}
        >
          {Array.from(
            { length: AVOCADO_MEDITATION_TOTAL_STEPS },
            (_, index) => (
              <li
                key={index}
                data-complete={index < current}
                aria-label={`${index + 1}`}
              />
            ),
          )}
        </ol>
      )}
      {completed ? (
        <p className="avocato-meditation__complete">
          {intl.formatMessage(messages.meditationComplete)}
        </p>
      ) : (
        <>
          {helpActive ? (
            <p className="avocato-meditation__hint">
              {MEDITATION_HINTS[preview.requiredStepIndex ?? 0]}
            </p>
          ) : null}
          <Button
            state={pending ? 'pending' : failed ? 'failure' : 'idle'}
            disabled={
              pending ||
              (helpActive && remaining > 0) ||
              !routeAvailable
            }
            onClick={() =>
              helpActive ? void skip() : setHelpActive(true)
            }
          >
            {!helpActive
              ? intl.formatMessage(messages.help)
              : remaining > 0
                ? intl.formatMessage(messages.skipCountdown, {
                    seconds: remaining,
                  })
                : intl.formatMessage(messages.skip)}
          </Button>
          {failed ? (
            <p role="alert">{intl.formatMessage(messages.failed)}</p>
          ) : null}
        </>
      )}
    </section>
  )
}

export interface AvotationCompletionOverlayProps {
  readonly open: boolean
  readonly onDismiss: () => void
}

export function AvotationCompletionOverlay({
  open,
  onDismiss,
}: AvotationCompletionOverlayProps) {
  const intl = useIntl()
  if (!open) return null
  return (
    <div className="avotation-completion__backdrop">
      <section
        className="avotation-completion"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avotation-completion-heading"
      >
        <h2 id="avotation-completion-heading">
          {intl.formatMessage(messages.meditation)}
        </h2>
        <figure className="avotation-completion__meditation">
          <img
            src={meditationAvocadoUrl}
            alt={intl.formatMessage(messages.meditationImageAlt)}
          />
          <ul aria-label={intl.formatMessage(messages.meditationNames)}>
            {AVOTATION_NAMES.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </figure>
        <p>{intl.formatMessage(messages.meditationComplete)}</p>
        <Button autoFocus onClick={onDismiss}>
          {intl.formatMessage(messages.meditationDismiss)}
        </Button>
      </section>
    </div>
  )
}
