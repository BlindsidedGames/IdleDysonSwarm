import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useIntl, type IntlShape } from 'react-intl'
import type { CanonicalRuntimePresentationEvent } from '../../../application/canonicalRuntimeSession'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { formatGameNumber } from '../../i18n/formatters'
import { readyDysonMessages } from '../dyson/messages'
import { gameplayNotificationMessages as messages } from './messages'
import './gameplayNotifications.css'

const NOTICE_DURATION_MILLISECONDS = 6_000

type DisasterEvent = Extract<
  CanonicalRuntimePresentationEvent,
  { readonly kind: 'automatic-dream-disaster' }
>

type QueuedNotice =
  | Extract<CanonicalRuntimePresentationEvent, { readonly kind: 'skill-preset-conflict' }>
  | DisasterEvent
  | {
      readonly kind: 'coalesced-dream-disaster'
      readonly sequence: number
      readonly lastSequence: number
      readonly cause: DisasterEvent['cause']
      readonly strangeMatterGranted: number
      readonly resetCount: bigint
      readonly preResetEra: DisasterEvent['preResetEra']
    }

export interface GameplayNotificationHostProps {
  readonly sessionRevision: number
  readonly events: readonly Readonly<CanonicalRuntimePresentationEvent>[]
  /** Commit-gated Stored Time discoveries released after its summary closes. */
  readonly storedTimeFirstDisasterEvents?: readonly Readonly<DisasterEvent>[]
  readonly locale: EnabledLocale
  readonly showPresetApplicationNotices: boolean
  readonly onViewReality: () => void
}

export function GameplayNotificationHost({
  sessionRevision,
  events,
  storedTimeFirstDisasterEvents = [],
  locale,
  showPresetApplicationNotices,
  onViewReality,
}: GameplayNotificationHostProps) {
  const intl = useIntl()
  const [queue, setQueue] = useState<readonly QueuedNotice[]>([])
  const seenRef = useRef({ sessionRevision, sequence: 0 })
  const seenStoredTimeSequencesRef = useRef(new Set<number>())

  useEffect(() => {
    let reset = false
    if (seenRef.current.sessionRevision !== sessionRevision) {
      seenRef.current = { sessionRevision, sequence: 0 }
      seenStoredTimeSequencesRef.current.clear()
      reset = true
    }
    const unseen = events.filter(
      (event) => event.sequence > seenRef.current.sequence,
    )
    if (unseen.length > 0) {
      seenRef.current.sequence = unseen.at(-1)!.sequence
    }
    const unseenStoredTime = storedTimeFirstDisasterEvents.filter(
      (event) => !seenStoredTimeSequencesRef.current.has(event.sequence),
    )
    for (const event of unseenStoredTime) {
      seenStoredTimeSequencesRef.current.add(event.sequence)
    }
    const additions = [
      ...buildQueuedNotices(
        unseen,
        showPresetApplicationNotices,
      ),
      ...unseenStoredTime,
    ]
    if (reset || additions.length > 0) {
      setQueue((current) => mergePendingNotices(
        reset ? [] : current,
        additions,
      ))
    }
  }, [
    events,
    sessionRevision,
    showPresetApplicationNotices,
    storedTimeFirstDisasterEvents,
  ])

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1))
  }, [])
  const viewReality = useCallback(() => {
    dismiss()
    onViewReality()
  }, [dismiss, onViewReality])
  const active = queue[0]

  return (
    <div className="gameplay-notification-host" data-active={active !== undefined || undefined}>
      {active?.kind === 'automatic-dream-disaster' &&
      active.firstLifetimeOccurrence ? (
        <FirstDisasterDialog
          key={active.sequence}
          event={active}
          locale={locale}
          onDismiss={dismiss}
          onViewReality={viewReality}
        />
      ) : active !== undefined ? (
        <TimedNotification
          key={active.sequence}
          accessibleLabel={noticeText(active, locale, intl)}
          onDismiss={dismiss}
        >
          {noticeContent(active, locale, intl)}
        </TimedNotification>
      ) : null}
    </div>
  )
}

function mergePendingNotices(
  current: readonly QueuedNotice[],
  additions: readonly QueuedNotice[],
): QueuedNotice[] {
  const merged = [...current]
  for (const addition of additions) {
    const previous = merged.at(-1)
    if (
      merged.length > 1 &&
      addition.kind !== 'skill-preset-conflict' &&
      !(addition.kind === 'automatic-dream-disaster' && addition.firstLifetimeOccurrence) &&
      previous !== undefined &&
      previous.kind !== 'skill-preset-conflict' &&
      !(previous.kind === 'automatic-dream-disaster' && previous.firstLifetimeOccurrence) &&
      previous.cause === addition.cause
    ) {
      merged[merged.length - 1] = {
        kind: 'coalesced-dream-disaster',
        sequence: previous.sequence,
        lastSequence:
          addition.kind === 'coalesced-dream-disaster'
            ? addition.lastSequence
            : addition.sequence,
        cause: addition.cause,
        strangeMatterGranted:
          previous.strangeMatterGranted + addition.strangeMatterGranted,
        resetCount: previous.resetCount + addition.resetCount,
        preResetEra: addition.preResetEra,
      }
    } else {
      merged.push(addition)
    }
  }
  return merged
}

function buildQueuedNotices(
  events: readonly Readonly<CanonicalRuntimePresentationEvent>[],
  showPresetApplicationNotices: boolean,
): QueuedNotice[] {
  const queue: QueuedNotice[] = []
  for (const event of events) {
    if (event.kind === 'skill-preset-conflict') {
      if (showPresetApplicationNotices) queue.push(event)
      continue
    }
    if (event.firstLifetimeOccurrence) {
      queue.push(event)
      continue
    }
    const previous = queue.at(-1)
    if (
      previous !== undefined &&
      previous.kind !== 'skill-preset-conflict' &&
      !(previous.kind === 'automatic-dream-disaster' && previous.firstLifetimeOccurrence) &&
      previous.cause === event.cause
    ) {
      queue[queue.length - 1] = {
        kind: 'coalesced-dream-disaster',
        sequence: previous.sequence,
        lastSequence: event.sequence,
        cause: event.cause,
        strangeMatterGranted:
          previous.strangeMatterGranted + event.strangeMatterGranted,
        resetCount: previous.resetCount + event.resetCount,
        preResetEra: event.preResetEra,
      }
    } else {
      queue.push(event)
    }
  }
  return queue
}

function TimedNotification({
  accessibleLabel,
  children,
  onDismiss,
}: {
  readonly accessibleLabel: string
  readonly children: ReactNode
  readonly onDismiss: () => void
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, NOTICE_DURATION_MILLISECONDS)
    return () => window.clearTimeout(timeout)
  }, [onDismiss])

  return (
    <div className="gameplay-timed-notification__positioner">
      <span
        className="gameplay-timed-notification__announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {accessibleLabel}
      </span>
      <button
        type="button"
        className="gameplay-timed-notification"
        aria-label={accessibleLabel}
        onClick={onDismiss}
      >
        <span className="gameplay-timed-notification__message">{children}</span>
        <span className="gameplay-timed-notification__progress" aria-hidden="true" />
      </button>
    </div>
  )
}

function FirstDisasterDialog({
  event,
  locale,
  onDismiss,
  onViewReality,
}: {
  readonly event: DisasterEvent
  readonly locale: EnabledLocale
  readonly onDismiss: () => void
  readonly onViewReality: () => void
}) {
  const intl = useIntl()
  const titleId = `gameplay-disaster-title-${useId().replaceAll(':', '')}`
  const descriptionId = `gameplay-disaster-description-${useId().replaceAll(':', '')}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    continueRef.current?.focus()
    const content = dialogRef.current?.closest('.dyson-shell__content')
    const main = dialogRef.current?.closest('.dyson-shell__main')
    const shell = dialogRef.current?.closest('.dyson-shell')
    const host = dialogRef.current?.closest('.dyson-shell__notifications')
    const contentSiblings = content === null || content === undefined || host === null || host === undefined
      ? []
      : Array.from(content.children).filter((element) => element !== host)
    const shellSiblings = shell === null || shell === undefined || main === null || main === undefined
      ? []
      : Array.from(shell.children).filter((element) => element !== main)
    const siblings = [...contentSiblings, ...shellSiblings]
    const previousInert = siblings.map((element) => ({
      element: element as HTMLElement,
      inert: (element as HTMLElement).inert,
    }))
    for (const { element } of previousInert) element.inert = true
    return () => {
      for (const item of previousInert) item.element.inert = item.inert
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const onKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault()
      onDismiss()
      return
    }
    if (keyboardEvent.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    if (controls === undefined || controls.length === 0) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault()
      last.focus()
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="gameplay-disaster-dialog__backdrop">
      <div
        ref={dialogRef}
        className="gameplay-disaster-dialog"
        data-simulation-era={event.preResetEra}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
      >
        <div className="gameplay-disaster-dialog__era-glow" aria-hidden="true" />
        <h2 id={titleId}>{disasterTitle(event.cause, intl)}</h2>
        <p id={descriptionId}>
          {intl.formatMessage(dialogMessage(event.cause), {
            reward: formatGameNumber(locale, event.strangeMatterGranted),
          })}
        </p>
        <div className="gameplay-disaster-dialog__actions">
          <button ref={continueRef} type="button" onClick={onDismiss}>
            {intl.formatMessage(messages.continue)}
          </button>
          <button type="button" onClick={onViewReality}>
            {intl.formatMessage(messages.viewCountermeasures)}
          </button>
        </div>
      </div>
    </div>
  )
}

function noticeText(
  notice: QueuedNotice,
  locale: EnabledLocale,
  intl: IntlShape,
): string {
  if (notice.kind === 'skill-preset-conflict') {
    return intl.formatMessage(readyDysonMessages.presetPartiallyApplied, {
      presetName: notice.presetName,
      retainedCount: notice.application.retainedSkillIds.length,
      blockedCount: notice.application.blockedByRetainedSkillIds.length,
    })
  }
  return intl.formatMessage(
    notice.resetCount > 1n ? messages.disasterBannerMultiple : messages.disasterBanner,
    {
      cause: disasterTitle(notice.cause, intl),
      count: notice.resetCount,
      reward: formatGameNumber(locale, notice.strangeMatterGranted),
    },
  )
}

function noticeContent(
  notice: QueuedNotice,
  locale: EnabledLocale,
  intl: IntlShape,
): ReactNode {
  if (notice.kind !== 'skill-preset-conflict') return noticeText(notice, locale, intl)
  return intl.formatMessage(readyDysonMessages.presetPartiallyAppliedBanner, {
    presetName: notice.presetName,
    retainedCount: notice.application.retainedSkillIds.length,
    blockedCount: notice.application.blockedByRetainedSkillIds.length,
    preset: (chunks: ReactNode) => <strong className="gameplay-timed-notification__accent">{chunks}</strong>,
    retained: (chunks: ReactNode) => <strong>{chunks}</strong>,
    blocked: (chunks: ReactNode) => <strong className="gameplay-timed-notification__warning">{chunks}</strong>,
  })
}

function disasterTitle(
  cause: DisasterEvent['cause'],
  intl: IntlShape,
): string {
  return intl.formatMessage(
    cause === 'Meteor'
      ? messages.meteorTitle
      : cause === 'ArtificialIntelligence'
        ? messages.aiTitle
        : messages.globalWarmingTitle,
  )
}

function dialogMessage(cause: DisasterEvent['cause']) {
  return cause === 'Meteor'
    ? messages.meteorDialog
    : cause === 'ArtificialIntelligence'
      ? messages.aiDialog
      : messages.globalWarmingDialog
}
