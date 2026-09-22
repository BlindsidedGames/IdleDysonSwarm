import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import { DISCOVERY_TUNING, discoveryPurchaseCost, type DiscoveryPurchase } from '../../../simulation/discovery'
import { Button } from '../../components'
import { formatGameNumber, formatWholeGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { discoveryMessages as m } from './messages'

export function DiscoveryPurchases({ state, balance, available, purchase, locale }: {
  readonly state: DiscoveryState
  readonly balance: bigint
  readonly available: boolean
  readonly purchase: (kind: DiscoveryPurchase) => Promise<boolean>
  readonly locale: EnabledLocale
}) {
  const intl = useIntl()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = useRef(false)
  const buy = async (kind: DiscoveryPurchase) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setFailed(false)
    try { if (await purchase(kind)) setConfirming(false); else setFailed(true) }
    catch { setFailed(true) }
    finally { busy.current = false; setPending(false) }
  }
  const kinds: readonly DiscoveryPurchase[] = state.unlocked ? ['speed', 'power'] : ['unlock']
  return <div className="avocato-feed-grid">{kinds.map(kind => {
    const cost = discoveryPurchaseCost(state, kind)
    const disabled = pending || !available || cost === null || balance < cost
    return <article key={kind} className="quantum-leap-card discovery-purchase">
      <h2>{intl.formatMessage(kind === 'unlock' ? m.unlock : kind === 'speed' ? m.speed : m.power)}</h2>
      {kind !== 'unlock' && <span>{intl.formatMessage(m.owned, { value: formatWholeGameNumber(locale, kind === 'speed' ? state.speedUpgrades : state.startingPower) })}</span>}
      <p>{intl.formatMessage(kind === 'unlock' ? m.startingBenefits : kind === 'speed' ? m.speedEffect : m.powerEffect)}</p>
      {kind !== 'unlock' && <p>{intl.formatMessage(kind === 'speed' ? m.nextSpeed : m.nextPower, { value: formatGameNumber(locale, kind === 'speed' ? Number(state.speedUpgrades + 1n) * DISCOVERY_TUNING.speedPerPurchase * 100 : DISCOVERY_TUNING.startingStrength + Number(state.startingPower + 1n) * DISCOVERY_TUNING.strengthPerPurchase) })}</p>}
      {kind === 'unlock' && confirming ? <div role="group" aria-label={intl.formatMessage(m.confirm)}>
        <p>{intl.formatMessage(m.confirm)}</p>
        <Button disabled={disabled} onClick={() => void buy(kind)}>{intl.formatMessage(m.confirmAction)}</Button>
        <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(m.cancel)}</Button>
      </div> : <Button disabled={disabled} onClick={() => kind === 'unlock' ? setConfirming(true) : void buy(kind)}>{intl.formatMessage(m.buy, { cost: formatWholeGameNumber(locale, cost ?? 0n) })}</Button>}
      {failed && <p role="alert">{intl.formatMessage(m.purchaseFailed)}</p>}
    </article>
  })}</div>
}
