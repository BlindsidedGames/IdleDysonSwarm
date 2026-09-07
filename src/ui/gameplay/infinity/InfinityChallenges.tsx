import './infinity.css'
import { useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { InfinityChallengeState } from '../../../game-state/types'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { Button, CollapsibleSection, StatusFeedback } from '../../components'
import { challengeMessages as messages } from './challengeMessages'

type ChallengeCommand = Extract<CanonicalPlayerCommand, { kind: `challenge.${string}` }>
export function InfinityChallenges({ progress, overflowReached, dispatchPlayer }: {
  readonly progress: Readonly<InfinityChallengeState>
  readonly overflowReached: boolean
  readonly dispatchPlayer: (command: ChallengeCommand) => Promise<UiRuntimePlayerCommandResult>
}) {
  const intl = useIntl()
  const active = progress.active === 'blank-slate'
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const pendingRef = useRef(false)
  useEffect(() => { setConfirming(false); setFailed(false) }, [active])
  if (!progress.unlocked) return null
  const restart = async () => {
    if (pendingRef.current || overflowReached) return
    pendingRef.current = true; setPending(true); setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: active ? 'challenge.abandon' : 'challenge.enter-blank-slate' })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') setConfirming(false)
    } catch { setFailed(true) }
    finally { pendingRef.current = false; setPending(false) }
  }
  return <CollapsibleSection className="infinity-challenges" storageKey="infinity-challenges" title={intl.formatMessage(messages.title)}>
    <article className="infinity-shop-card infinity-challenge-card">
      <div>
        <h3>{intl.formatMessage(messages.blankSlate)}</h3>
        <p>{intl.formatMessage(messages.description)}</p>
        <p>{intl.formatMessage(messages.reward)}</p>
        {progress.blankSlateCompleted && <p>{intl.formatMessage(messages.completed)}</p>}
        {active && <p role="status">{intl.formatMessage(messages.active)}</p>}
      </div>
      {confirming ? <div className="infinity-challenge-card__confirmation">
        <p>{intl.formatMessage(messages.restart)}</p>
        <div className="infinity-challenge-card__actions">
          <Button variant="danger" state={pending ? 'pending' : failed ? 'failure' : 'idle'} disabled={overflowReached}
            onClick={() => void restart()}>{intl.formatMessage(messages.confirm)}</Button>
          <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</Button>
        </div>
      </div> : <Button disabled={overflowReached} onClick={() => setConfirming(true)}>
        {intl.formatMessage(active ? messages.abandon : progress.blankSlateCompleted ? messages.replay : messages.start)}
      </Button>}
      {failed && <StatusFeedback tone="error">{intl.formatMessage(messages.failure)}</StatusFeedback>}
    </article>
  </CollapsibleSection>
}
