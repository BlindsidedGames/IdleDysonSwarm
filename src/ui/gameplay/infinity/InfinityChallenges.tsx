import { useEffect, useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { ChallengeId, InfinityChallengeState } from '../../../game-state/types'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { QUANTUM_CHALLENGE_IDS, isQuantumChallenge, challengeCompleted } from '../../../simulation/infinityChallenges'
import { formatGameDuration, formatWholeGameNumber } from '../../i18n/formatters'
import { resolveLocale } from '../../i18n/localeRegistry'
import { readBooleanPresentationPreference, writeBooleanPresentationPreference } from '../../presentationPreferences'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { Button, CollapsibleSection, StatusFeedback, InlineImageSymbol, InlineResourceAmount } from '../../components'
import galvanizerIcon from '../../assets/currency-galvanizer.png'
import { challengeMessages as messages } from './challengeMessages'
import { challengePresentation } from './challengePresentation'
import './infinity.css'

const HIDE_COMPLETED_KEY = 'idle-dyson-swarm.challenges.hide-completed.v1'
const CHALLENGE_IDS: readonly ChallengeId[] = ['blank-slate', 'trial-and-error', ...QUANTUM_CHALLENGE_IDS]
const restrictionMessages = {
  'blank-slate': messages.ruleBlankSlate,
  'trial-and-error': messages.ruleTrial,
  'no-science': messages.ruleNoScience,
  'short-circuit': messages.ruleShortCircuit,
  grounded: messages.ruleGrounded,
  'built-by-hand': messages.ruleBuiltByHand,
  'hands-off': messages.ruleHandsOff,
  'commitment-issues': messages.ruleCommitment,
  'supply-shortage': messages.ruleSupply,
}

type ChallengeCommand = Extract<CanonicalPlayerCommand, { kind: `challenge.${string}` }>
type ChallengeProps = {
  readonly progress: Readonly<InfinityChallengeState>
  readonly goalStage: bigint
  readonly overflowReached: boolean
  readonly developmentVisible?: boolean
  readonly focusActiveRequest?: number
  readonly onFocusActiveHandled?: () => void
  readonly dispatchPlayer: (command: ChallengeCommand) => Promise<UiRuntimePlayerCommandResult>
}

export function InfinityChallenges(props: ChallengeProps) {
  const intl = useIntl()
  const { progress, focusActiveRequest, onFocusActiveHandled } = props
  const listRef = useRef<HTMLOListElement>(null)
  const hideCompletedRef = useRef<HTMLInputElement>(null)
  const focusedCardRef = useRef<HTMLElement | null>(null)
  const [hideCompleted, setHideCompleted] = useState(() => readBooleanPresentationPreference(HIDE_COMPLETED_KEY))
  const openingComplete = props.progress.openingCompleted === true
  const showOpening = !hideCompleted || !openingComplete
  const visibleChallenges = props.progress.unlocked || props.developmentVisible
    ? CHALLENGE_IDS.filter(id => !hideCompleted || !challengeCompleted(props.progress, id) || props.progress.active === id)
    : []

  useEffect(() => {
    if (!focusActiveRequest || !progress.active) return
    const card = listRef.current?.querySelector<HTMLElement>('[data-challenge-active="true"]')
    if (!card) return
    card.focus({ preventScroll: true })
    card.scrollIntoView({ block: 'start', behavior: 'auto' })
    onFocusActiveHandled?.()
  }, [focusActiveRequest, progress.active, onFocusActiveHandled])

  useEffect(() => {
    if (focusedCardRef.current && !focusedCardRef.current.isConnected) {
      focusedCardRef.current = null
      // A completed replay disappears after abandonment when this filter is on.
      if (document.activeElement === document.body) hideCompletedRef.current?.focus()
    }
  }, [progress, hideCompleted])

  return <div className="challenge-list">
    <header className="challenge-list__header">
      <p className="challenge-list__wallet">
        <span>{intl.formatMessage(messages.wallet)}</span>
        <CatalystAmount value={formatWholeGameNumber(resolveLocale(intl.locale), props.progress.galvanizers)} />
      </p>
      <label className="challenge-list__hide-completed">
        <input ref={hideCompletedRef} type="checkbox" checked={hideCompleted} onChange={event => {
          setHideCompleted(event.target.checked)
          writeBooleanPresentationPreference(HIDE_COMPLETED_KEY, event.target.checked)
        }} />
        <span>{intl.formatMessage(messages.hideCompleted)}</span>
      </label>
    </header>
    <CollapsibleSection className="challenge-list__help" storageKey="challenges-help" defaultExpanded={false}
      title={intl.formatMessage(messages.howItWorks)}>
      <p>{intl.formatMessage(messages.helpRuns)}</p>
      <p>{intl.formatMessage(messages.helpRewards)}</p>
      <p>{intl.formatMessage(messages.helpPermanent)}</p>
      <p>{intl.formatMessage(messages.quantumRules)}</p>
      <p>{intl.formatMessage(messages.future)}</p>
    </CollapsibleSection>
    <ol className="challenge-list__cards" ref={listRef}
      onFocusCapture={event => {
        focusedCardRef.current = event.target.closest<HTMLElement>('.challenge-card')
      }}
      onBlurCapture={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedCardRef.current = null
      }}>
      {showOpening && <li><article className="challenge-card" data-completed={openingComplete || undefined}>
        <div className="challenge-card__copy">
          <div className="challenge-card__heading"><h3>{intl.formatMessage(messages.openingTitle)}</h3>
            <span className="challenge-card__status" data-status={openingComplete ? 'completed' : 'active'}>
              {intl.formatMessage(openingComplete ? messages.statusCompleted : messages.statusActive)}
            </span>
          </div>
          <p className="challenge-card__goal">{intl.formatMessage(messages.openingRule)}</p>
          {!openingComplete && <p className="challenge-card__detail">{intl.formatMessage(messages.openingProgress, {
            value: intl.formatNumber(Number(props.goalStage > 10n ? 10n : props.goalStage)),
          })}</p>}
        </div>
        <div className="challenge-card__aside"><ChallengeReward earned={props.progress.openingCatalystAwarded === true} amount={1} /></div>
      </article></li>}
      {visibleChallenges.map(id => <li key={id}><ChallengeCard {...props} challengeId={id} /></li>)}
    </ol>
    {!showOpening && visibleChallenges.length === 0 && <p className="challenge-list__empty">{intl.formatMessage(
      props.progress.unlocked || props.developmentVisible ? messages.allHidden : messages.requiresInfinity,
    )}</p>}
  </div>
}

function CatalystAmount({ value }: { readonly value: string }) {
  const intl = useIntl()
  return <InlineResourceAmount leadingSymbol={<InlineImageSymbol className="challenge-list__catalyst" src={galvanizerIcon} tint maskMode="luminance"
    label={intl.formatMessage(messages.wallet)} />} value={value} />
}

function ChallengeReward({ earned, amount }: { readonly earned: boolean; readonly amount: number }) {
  const intl = useIntl()
  return <p className="challenge-card__reward" data-earned={earned || undefined}>
    {intl.formatMessage(earned ? messages.rewarded : messages.reward, {
      reward: <CatalystAmount value={intl.formatNumber(amount)} />,
    })}
  </p>
}

function ChallengeCard({ progress, overflowReached, dispatchPlayer, challengeId }: ChallengeProps & { readonly challengeId: ChallengeId }) {
  const intl = useIntl()
  const cardRef = useRef<HTMLElement>(null)
  const confirmationId = useId()
  const active = progress.active === challengeId
  const quantum = isQuantumChallenge(challengeId)
  const completed = challengeCompleted(progress, challengeId)
  const needsManualLabour = challengeId === 'built-by-hand' && !progress.galvanizedSkillIds?.includes('manualLabour')
  const unavailable = needsManualLabour || overflowReached || !progress.unlocked || (progress.active !== null && !active)
  const reason = overflowReached ? messages.requiresTranscend : !progress.unlocked ? messages.requiresInfinity
    : needsManualLabour ? messages.manualLabourRequired : progress.active !== null && !active ? messages.anotherActive : null
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const pendingRef = useRef(false)
  const wasConfirming = useRef(false)
  useEffect(() => { setConfirming(false); setFailed(false) }, [active])
  useEffect(() => {
    if (confirming && !wasConfirming.current) cardRef.current?.querySelector<HTMLButtonElement>('[data-challenge-cancel]')?.focus()
    else if (!confirming && wasConfirming.current) {
      // A commit can publish the new active state before dispatch resolves.
      if (pending) return
      cardRef.current?.querySelector<HTMLButtonElement>('[data-challenge-action]:not(:disabled)')?.focus()
    }
    wasConfirming.current = confirming
  }, [confirming, pending])

  const restart = async () => {
    if (pendingRef.current || unavailable) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer(active ? { kind: 'challenge.abandon' } : { kind: 'challenge.enter', challengeId })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') setConfirming(false)
    } catch { setFailed(true) }
    finally { pendingRef.current = false; setPending(false) }
  }
  const time = progress.completionSeconds?.[challengeId]
  const compact = completed && !active && !confirming
  const status = active ? 'active' : completed ? 'completed' : unavailable ? 'locked' : null
  return <article className="challenge-card" ref={cardRef} tabIndex={-1}
    data-challenge-id={challengeId} data-challenge-active={active || undefined} data-completed={completed || undefined}
    onKeyDown={event => {
      if (event.key === 'Escape' && confirming && !pending) {
        event.stopPropagation()
        setConfirming(false)
      }
    }}>
    <div className="challenge-card__copy">
      <div className="challenge-card__heading">
        <h3>{intl.formatMessage(challengePresentation[challengeId].name)}</h3>
        {status && <span className="challenge-card__status" data-status={status}>
          {intl.formatMessage(active ? messages.statusActive : completed ? messages.statusCompleted : messages.statusLocked)}
        </span>}
      </div>
      {!compact && <p className="challenge-card__goal">{intl.formatMessage(quantum ? messages.goalQuantum : messages.goalInfinity)}</p>}
      {(!completed || active || confirming) && <p className="challenge-card__detail">{intl.formatMessage(restrictionMessages[challengeId])}</p>}
      {completed && <div className="challenge-card__history">
        {time !== undefined && <p className="challenge-card__best">{intl.formatMessage(messages.bestTime, {
          time: formatGameDuration(resolveLocale(intl.locale), time, { maximumFractionDigits: 2 }),
        })}</p>}
        {compact && <ChallengeReward earned amount={quantum ? 2 : 1} />}
      </div>}
      {reason && <p className="challenge-card__requirement" data-warning={needsManualLabour || overflowReached || !progress.unlocked || undefined}>
        {intl.formatMessage(reason)}
      </p>}
    </div>
    <div className="challenge-card__aside">
      {!compact && <ChallengeReward earned={completed} amount={quantum ? 2 : 1} />}
      {!confirming && <Button className="challenge-card__action" data-challenge-action={active ? 'abandon' : 'start'}
        disabled={unavailable || pending} aria-expanded={confirming} aria-controls={confirming ? confirmationId : undefined}
        onClick={() => setConfirming(true)}>
        {intl.formatMessage(active ? messages.abandon : completed ? messages.replay : messages.start)}
      </Button>}
    </div>
    {confirming && <div className="challenge-card__confirmation" id={confirmationId} role="group"
      aria-label={intl.formatMessage(messages.confirm)}>
      <p>{intl.formatMessage(active ? (quantum ? messages.quantumAbandonRestart : messages.abandonRestart)
        : (quantum ? messages.quantumRestart : messages.restart))}</p>
      <div className="challenge-card__actions">
        <Button className="challenge-card__confirm" variant="danger" state={pending ? 'pending' : failed ? 'failure' : 'idle'}
          disabled={unavailable} onClick={() => void restart()}>{intl.formatMessage(messages.confirm)}</Button>
        <Button className="challenge-card__cancel" data-challenge-cancel disabled={pending}
          onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</Button>
      </div>
    </div>}
    {failed && <div className="challenge-card__feedback"><StatusFeedback tone="error">{intl.formatMessage(messages.failure)}</StatusFeedback></div>}
  </article>
}
