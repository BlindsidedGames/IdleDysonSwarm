import { useState } from 'react'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { InfinityChallengeState, ReworkChallengeId } from '../../../game-state/types'
import { REWORK_CHALLENGES, replacementSkillPoints } from '../../../simulation/reworkChallenges'
import { Button, CollapsibleSection, StatusFeedback } from '../../components'
import '../infinity/infinity.css'
import './challenges.css'
import { challengeMessages } from './challengeMessages'

export function ReworkChallengesSurface({ progress, earnedIp, firstInfinity, breakTheLoop, overflowPending, dispatchPlayer }: {
  progress?: DeepReadonly<InfinityChallengeState>; earnedIp: bigint; firstInfinity: boolean;
  breakTheLoop: boolean; overflowPending: boolean;
  dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>;
}) {
  const intl = useIntl()
  const [confirm, setConfirm] = useState<ReworkChallengeId | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const run = progress?.replacement
  const legacy = new Set(progress?.completedQuantumChallenges ?? [])
  if (progress?.noScienceCompleted) legacy.add('no-science')
  const history = legacy.size + Number(progress?.blankSlateCompleted === true) + Number(progress?.trialAndErrorCompleted === true)
  const message = (key: keyof typeof challengeMessages, values?: Record<string, string | number>) => intl.formatMessage(challengeMessages[key], values)
  const act = async (id: ReworkChallengeId) => {
    if (pending) return
    setPending(true); setError(false)
    try {
      const result = await dispatchPlayer(run?.active === id ? { kind: 'challenge.abandon' } : { kind: 'challenge.enter', challengeId: id })
      if (result.status === 'accepted') setConfirm(null)
      else setError(true)
    } catch { setError(true) }
    finally { setPending(false) }
  }
  return <section className="challenges-surface">
    <CollapsibleSection storageKey="replacement-infinity-challenges" title={message('title')}>
      <p>{message('intro')}</p>
      <CollapsibleSection storageKey="replacement-challenge-rules" headingLevel="h3" defaultExpanded={false} title={message('rulesTitle')}>
        <p>{message('rules')}</p>
      </CollapsibleSection>
      <p>{message('budget', { value: String(replacementSkillPoints(progress)) })}</p>
      {REWORK_CHALLENGES.map(c => {
        const active = run?.active === c.id
        const completed = run?.completedIds.includes(c.id)
        const issue = overflowPending ? message('overflow') :
          !firstInfinity ? message('first') :
          !active && run?.active ? message('other') :
          earnedIp < c.unlockIp && !active ? message('unlock', { value: String(c.unlockIp) }) :
          c.unlockIp >= 64n && !breakTheLoop && !active ? message('break') : null
        return <article className="infinity-shop-card infinity-challenge-card" key={c.id}>
          <div><h3>{message(`${c.id}.name`)}</h3>
            <p>{message(`${c.id}.rule`)}</p>
            <p>{message(completed ? 'earned' : 'reward', { value: String(c.reward) })}</p>
            {active && <p role="status">{message('progress', { ip: String(run.earnedIp), infinities: run.infinities })}</p>}
            {active && c.id === 'supply-shortage' && <p>{message('purchases', { count: run.paidPurchases, types: run.paidFacilityIds.length })}</p>}
            {issue && <p>{issue}</p>}
          </div>
          {confirm === c.id ? <div className="infinity-challenge-card__confirmation">
            <p>{message('restart')}</p>
            <div className="infinity-challenge-card__actions"><Button disabled={!!issue || pending} variant="danger" state={pending ? 'pending' : 'idle'} onClick={() => void act(c.id)}>{message('confirm')}</Button><Button disabled={pending} onClick={() => setConfirm(null)}>{message('cancel')}</Button></div>
          </div> : <Button disabled={!!issue || pending} onClick={() => setConfirm(c.id)}>{message(active ? 'abandon' : completed ? 'replay' : 'start')}</Button>}
        </article>
      })}
      {error && <StatusFeedback tone="error">{message('failure')}</StatusFeedback>}
    </CollapsibleSection>
    <p>{message('history', { value: history })}</p>
  </section>
}
