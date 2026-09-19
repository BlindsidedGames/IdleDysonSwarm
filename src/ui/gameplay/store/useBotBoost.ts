import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { botBoostRemaining, canClaimBotBoost, type BotBoostState } from '../../../simulation/botBoost'
import { boostMessages as messages } from './boostMessages'
import { storeMessages } from './messages'

export function useBotBoost(boost: BotBoostState | undefined, owned: boolean) {
  const [, setNow] = useState(Date.now)
  const now = Date.now()
  const intl = useIntl()
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = botBoostRemaining(boost, now)
  const active = owned ? boost?.permanentEnabled === true : remaining > 0
  const claimable = !owned && canClaimBotBoost(boost, now)
  const seconds = Math.ceil(remaining / 1000)
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const status = owned
    ? intl.formatMessage(active ? messages.permanent : storeMessages.disabled)
    : active ? intl.formatMessage(messages.active, { time }) : intl.formatMessage(messages.ready)
  return { active, claimable, remaining, time, status,
    badge: owned && !active ? undefined : active && claimable ? '2×+' : '2×' }
}
