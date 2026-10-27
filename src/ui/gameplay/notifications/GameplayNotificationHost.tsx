import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
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

type CatalystEvent = Extract<CanonicalRuntimePresentationEvent, { readonly kind: 'catalyst-earned' }>

type PresetConflict = Extract<CanonicalRuntimePresentationEvent, { readonly kind: 'skill-preset-conflict' }>
type VisiblePresentationEvent = Exclude<CanonicalRuntimePresentationEvent, { readonly kind: 'skill-preset-conflict-resolved' }>

interface PresetConflictSkillState {
  readonly presets: readonly { readonly skillIds: readonly string[] }[]
  readonly byId: Readonly<Record<string, { readonly owned: boolean }>>
}

function isCurrentConflict(event: PresetConflict, skills?: PresetConflictSkillState): boolean {
  if (event.application.trigger !== 'automatic' || skills === undefined) return true
  return event.application.retainedSkillIds.every(id => skills.byId[id]?.owned === true) &&
    event.application.blockedByRetainedSkillIds.some(id => skills.presets[event.application.slot - 1]?.skillIds.includes(id))
}

function automaticConflictIdentity(event: PresetConflict): string {
  const application = event.application
  // Skill sets and the persisted slot identify the conflict independently of
  // names, translation, ordering, or a repeated application's sequence number.
  return JSON.stringify([application.slot,
    [...application.retainedSkillIds].sort(),
    [...application.blockedByRetainedSkillIds].sort()])
}

type QueuedNotice =
  | Extract<CanonicalRuntimePresentationEvent, { readonly kind: 'skill-preset-conflict' }>
  | DisasterEvent
  | CatalystEvent
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
  /** Canonical targets/ownership retire stale automatic feedback after edits or resets. */
  readonly skillState?: PresetConflictSkillState
  readonly onEventsAccepted?: (sessionRevision: number, throughSequence: number) => void
  readonly onViewReality: () => void
  readonly onViewSkills: () => void
}

export function GameplayNotificationHost({
  sessionRevision,
  events,
  storedTimeFirstDisasterEvents = [],
  locale,
  showPresetApplicationNotices,
  skillState,
  onViewReality,
  onViewSkills,
  onEventsAccepted,
}: GameplayNotificationHostProps) {
  const intl = useIntl()
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const attachHost = useCallback((node: HTMLDivElement | null) => {
    if (node) setPortalHost(node.closest('.dyson-shell'))
  }, [])
  const [queue, setQueue] = useState<readonly QueuedNotice[]>([])
  const seenRef = useRef({ sessionRevision, sequence: 0 })
  const seenStoredTimeSequencesRef = useRef(new Set<number>())
  const ongoingAutomaticConflictsRef = useRef(new Map<string, PresetConflict>())

  useEffect(() => {
    let reset = false
    if (seenRef.current.sessionRevision !== sessionRevision) {
      seenRef.current = { sessionRevision, sequence: 0 }
      seenStoredTimeSequencesRef.current.clear()
      ongoingAutomaticConflictsRef.current.clear()
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
    if (!showPresetApplicationNotices) ongoingAutomaticConflictsRef.current.clear()
    for (const [identity, conflict] of ongoingAutomaticConflictsRef.current) {
      if (!isCurrentConflict(conflict, skillState)) ongoingAutomaticConflictsRef.current.delete(identity)
    }
    const resolvedSlots = new Set<PresetConflict['application']['slot']>()
    let visibleEvents: VisiblePresentationEvent[] = []
    for (const event of unseen) {
      if (event.kind === 'skill-preset-conflict-resolved') {
        for (const [identity, conflict] of ongoingAutomaticConflictsRef.current) {
          if (conflict.application.slot === event.slot) ongoingAutomaticConflictsRef.current.delete(identity)
        }
        resolvedSlots.add(event.slot)
        // Remove earlier conflicts in this batch, but allow a subsequent
        // reintroduction. Silent resolutions do not split disaster batches.
        visibleEvents = visibleEvents.filter(notice => notice.kind !== 'skill-preset-conflict' ||
          notice.application.trigger !== 'automatic' || notice.application.slot !== event.slot)
      } else {
        if (event.kind === 'skill-preset-conflict' && event.application.trigger === 'automatic') {
          if (!showPresetApplicationNotices || !isCurrentConflict(event, skillState)) continue
          const identity = automaticConflictIdentity(event)
          if (ongoingAutomaticConflictsRef.current.has(identity)) continue
          ongoingAutomaticConflictsRef.current.set(identity, event)
        }
        visibleEvents.push(event)
      }
    }
    const additions = [...buildQueuedNotices(visibleEvents, showPresetApplicationNotices), ...unseenStoredTime]
    setQueue((current) => {
      const next = removePresetNotices(reset ? [] : current,
        showPresetApplicationNotices ? resolvedSlots : undefined, skillState)
      return additions.length > 0 ? mergePendingNotices(next, additions) : next
    })
    if (unseen.length > 0) onEventsAccepted?.(sessionRevision, unseen.at(-1)!.sequence)
  }, [
    onEventsAccepted,
    events,
    sessionRevision,
    showPresetApplicationNotices,
    skillState,
    storedTimeFirstDisasterEvents,
  ])

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1))
  }, [])
  const viewReality = useCallback(() => {
    dismiss()
    if (queue[0]?.kind === 'catalyst-earned') onViewSkills()
    else onViewReality()
  }, [dismiss, onViewReality, onViewSkills, queue])
  const active = queue[0]

  return (
    <div ref={attachHost} className="gameplay-notification-host" data-active={active !== undefined || undefined}>
      {(active?.kind === 'automatic-dream-disaster' || active?.kind === 'catalyst-earned') &&
      active.firstLifetimeOccurrence ? (
        <FirstGameplayNoticeDialog
          key={active.sequence}
          portalHost={portalHost}
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

function isDisasterNotice(notice: QueuedNotice): notice is DisasterEvent | Extract<QueuedNotice, { kind: 'coalesced-dream-disaster' }> {
  return notice.kind === 'automatic-dream-disaster' || notice.kind === 'coalesced-dream-disaster'
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
      isDisasterNotice(addition) &&
      !(addition.kind === 'automatic-dream-disaster' && addition.firstLifetimeOccurrence) &&
      previous !== undefined &&
      isDisasterNotice(previous) &&
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

function removePresetNotices(
  queue: readonly QueuedNotice[],
  resolvedSlots?: ReadonlySet<PresetConflict['application']['slot']>,
  skills?: PresetConflictSkillState,
): readonly QueuedNotice[] {
  const remaining = queue.filter((notice) => notice.kind !== 'skill-preset-conflict' ||
    (resolvedSlots !== undefined && isCurrentConflict(notice, skills) &&
      (notice.application.trigger !== 'automatic' || !resolvedSlots.has(notice.application.slot))))
  return remaining.length === queue.length ? queue : remaining
}

function buildQueuedNotices(
  events: readonly Readonly<VisiblePresentationEvent>[],
  showPresetApplicationNotices: boolean,
): QueuedNotice[] {
  const queue: QueuedNotice[] = []
  for (const event of events) {
    if (event.kind === 'skill-preset-conflict') {
      if (showPresetApplicationNotices) queue.push(event)
      continue
    }
    if (event.kind === 'catalyst-earned' || event.firstLifetimeOccurrence) {
      queue.push(event)
      continue
    }
    const previous = queue.at(-1)
    if (
      previous !== undefined &&
      isDisasterNotice(previous) &&
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

function FirstGameplayNoticeDialog({
  portalHost,
  event,
  locale,
  onDismiss,
  onViewReality,
}: {
  readonly portalHost: HTMLElement | null
  readonly event: DisasterEvent | CatalystEvent
  readonly locale: EnabledLocale
  readonly onDismiss: () => void
  readonly onEventsAccepted?: (sessionRevision: number, throughSequence: number) => void
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
    const backdrop = dialogRef.current?.parentElement
    const siblings = portalHost
      ? Array.from(portalHost.children).filter((element) => element !== backdrop)
      : [...contentSiblings, ...shellSiblings]
    const previousInert = siblings.map((element) => ({
      element: element as HTMLElement,
      inert: (element as HTMLElement).inert,
    }))
    for (const { element } of previousInert) element.inert = true
    return () => {
      for (const item of previousInert) item.element.inert = item.inert
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus()
    }
  }, [portalHost])

  const onKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    keyboardEvent.stopPropagation()
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

  const dialog = (
    <div className="gameplay-disaster-dialog__backdrop">
      <div
        ref={dialogRef}
        className="gameplay-disaster-dialog"
        data-simulation-era={event.kind === 'catalyst-earned' ? 'information' : event.preResetEra}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
      >
        <div className="gameplay-disaster-dialog__era-glow" aria-hidden="true" />
        <h2 id={titleId}>{event.kind === 'catalyst-earned' ? intl.formatMessage(messages.firstCatalystTitle) : disasterTitle(event.cause, intl)}</h2>
        <p id={descriptionId}>
          {event.kind === 'catalyst-earned' ? intl.formatMessage(messages.firstCatalystBody, { count: event.count }) : intl.formatMessage(dialogMessage(event.cause), {
            reward: formatGameNumber(locale, event.strangeMatterGranted),
          })}
        </p>
        <div className="gameplay-disaster-dialog__actions">
          <button ref={continueRef} type="button" onClick={onDismiss}>
            {intl.formatMessage(messages.continue)}
          </button>
          <button type="button" onClick={onViewReality}>
            {intl.formatMessage(event.kind === 'catalyst-earned' ? messages.viewSkills : messages.viewCountermeasures)}
          </button>
        </div>
      </div>
    </div>
  )
  return portalHost ? createPortal(dialog, portalHost) : dialog
}

function noticeText(
  notice: QueuedNotice,
  locale: EnabledLocale,
  intl: IntlShape,
): string {
  if (notice.kind === 'catalyst-earned') return intl.formatMessage(messages.catalystEarned, { count: notice.count })
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
