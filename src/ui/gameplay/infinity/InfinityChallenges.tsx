import { formatGameDuration } from '../../i18n/formatters'
import { resolveLocale } from '../../i18n/localeRegistry'
import './infinity.css'
import galvanizerIcon from '../../assets/currency-galvanizer.png'
import { useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { InfinityChallengeState } from '../../../game-state/types'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { Button, CollapsibleSection, StatusFeedback, InlineImageSymbol, InlineResourceAmount } from '../../components'
import { challengeMessages as messages } from './challengeMessages'

type ChallengeCommand = Extract<CanonicalPlayerCommand, { kind: `challenge.${string}` }>
type ChallengeProps = {
  readonly progress: Readonly<InfinityChallengeState>
  readonly overflowReached: boolean
  readonly developmentVisible?: boolean
  readonly dispatchPlayer: (command: ChallengeCommand) => Promise<UiRuntimePlayerCommandResult>
}
export function InfinityChallenges(props: ChallengeProps) {
  const intl = useIntl()
  if (!props.progress.unlocked && !props.developmentVisible) return null
  return <><CollapsibleSection className="infinity-challenges" storageKey="infinity-challenges" title={intl.formatMessage(messages.title)}>
    <ChallengeCard {...props} challengeId="blank-slate" />
    <ChallengeCard {...props} challengeId="trial-and-error" />
  </CollapsibleSection><CollapsibleSection className="infinity-challenges" storageKey="quantum-challenges" title={intl.formatMessage(messages.quantumTitle)}>
    <ChallengeCard {...props} challengeId="no-science" />
  </CollapsibleSection></>
}
function ChallengeCard({ progress, overflowReached, developmentVisible = false, dispatchPlayer, challengeId }: ChallengeProps & { challengeId: NonNullable<InfinityChallengeState['active']> }) {
  const intl = useIntl()
  const active = progress.active === challengeId
  const trial = challengeId === 'trial-and-error'
  const quantum = challengeId === 'no-science'
  const reward = quantum ? '2' : '1'
  const completed = quantum ? progress.noScienceCompleted : trial ? progress.trialAndErrorCompleted : progress.blankSlateCompleted
  const unavailable = overflowReached || !progress.unlocked || (progress.active !== null && !active)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const pendingRef = useRef(false)
  useEffect(() => { setConfirming(false); setFailed(false) }, [active])
  if (!progress.unlocked && !developmentVisible) return null
  const restart = async () => {
    if (pendingRef.current || unavailable) return
    pendingRef.current = true; setPending(true); setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: active ? 'challenge.abandon' : quantum ? 'challenge.enter-no-science' : trial ? 'challenge.enter-trial-and-error' : 'challenge.enter-blank-slate' })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') setConfirming(false)
    } catch { setFailed(true) }
    finally { pendingRef.current = false; setPending(false) }
  }
  return <article className="infinity-shop-card infinity-challenge-card">
      <div>
        <h3>{intl.formatMessage(quantum ? messages.noScience : trial ? messages.trialAndError : messages.blankSlate)}</h3>
        <p>{intl.formatMessage(quantum ? messages.noScienceDescription : trial ? messages.trialDescription : messages.description)}</p>
        <p>{intl.formatMessage(completed ? messages.rewarded : messages.reward, { reward: <InlineResourceAmount leadingSymbol={<InlineImageSymbol className="infinity-challenge-card__galvanizer" src={galvanizerIcon} tint maskMode="luminance" label={intl.formatMessage(messages.galvanizers, { value: reward })} />} value={reward} /> })}</p>
        {completed && <p>{intl.formatMessage(messages.completed, { time: progress.completionSeconds?.[challengeId] === undefined ? intl.formatMessage(messages.timeUnknown) : formatGameDuration(resolveLocale(intl.locale), progress.completionSeconds[challengeId]!, { maximumFractionDigits: 2 }) })}</p>}
        {active && <p role="status">{intl.formatMessage(quantum ? messages.noScienceActive : trial ? messages.trialActive : messages.active)}</p>}
      </div>
      {confirming ? <div className="infinity-challenge-card__confirmation">
        <p>{intl.formatMessage(quantum ? messages.quantumRestart : messages.restart)}</p>
        <div className="infinity-challenge-card__actions">
          <Button variant="danger" state={pending ? 'pending' : failed ? 'failure' : 'idle'} disabled={unavailable}
            onClick={() => void restart()}>{intl.formatMessage(messages.confirm)}</Button>
          <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</Button>
        </div>
      </div> : <Button disabled={unavailable} onClick={() => setConfirming(true)}>
        {intl.formatMessage(active ? messages.abandon : completed ? (trial ? messages.trialReplay : messages.replay) : (trial ? messages.trialStart : messages.start))}
      </Button>}
      {failed && <StatusFeedback tone="error">{intl.formatMessage(messages.failure)}</StatusFeedback>}
    </article>
}
