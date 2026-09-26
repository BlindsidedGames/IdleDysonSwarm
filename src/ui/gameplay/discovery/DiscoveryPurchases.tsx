import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import { DISCOVERY_TUNING, discoveryPurchaseCost, discoveryPurchaseCount, type DiscoveryPurchase } from '../../../simulation/discovery'
import { SkillDetailsDialog } from '../skills/SkillDetailsDialog'
import '../skills/skills.css'
import './discovery.css'
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
  const definitions = {
    unlock: { name: m.unlock, effect: m.startingBenefits },
    elevation: { name: m.elevation, effect: m.elevationEffect },
    enlightenment: { name: m.enlightenment, effect: m.enlightenmentEffect },
    speed: { name: m.speed, effect: m.speedEffect },
    power: { name: m.power, effect: m.powerEffect },
    'elevation-power': { name: m.elevationPower, effect: m.elevationPowerEffect },
    'enlightenment-power': { name: m.enlightenmentPower, effect: m.enlightenmentPowerEffect },
  }
  const upgradeKinds: DiscoveryPurchase[] = ['speed', 'power', ...(state.elevation ? ['elevation-power' as const] : []), ...(state.enlightenment ? ['enlightenment-power' as const] : [])]
  const nextUnlock: DiscoveryPurchase | null = !state.unlocked ? 'unlock' : !state.elevation ? 'elevation' : !state.enlightenment ? 'enlightenment' : null
  const card = (kind: DiscoveryPurchase, repeatable = false) => {
    const cost = discoveryPurchaseCost(state, kind)
    const count = discoveryPurchaseCount(state, kind)
    const disabled = pending || !available || cost === null || balance < cost
    const startingValue = kind === 'enlightenment-power' ? DISCOVERY_TUNING.enlightenment.startingStrength : DISCOVERY_TUNING.startingStrength
    return <article key={kind} className="quantum-leap-card discovery-purchase">
      <h2>{intl.formatMessage(definitions[kind].name)}</h2>
      {repeatable && <span>{intl.formatMessage(m.owned, { value: formatWholeGameNumber(locale, count) })}</span>}
      <p>{intl.formatMessage(definitions[kind].effect)}</p>
      {repeatable && <p>{intl.formatMessage(kind === 'speed' ? m.nextSpeed : kind === 'enlightenment-power' ? m.nextLifetime : m.nextPower, { value: formatGameNumber(locale, kind === 'speed' ? Number(count + 1n) * DISCOVERY_TUNING.speedPerPurchase * 100 : startingValue + Number(count + 1n) * DISCOVERY_TUNING.strengthPerPurchase) })}</p>}
      <Button disabled={disabled} onClick={() => kind === 'unlock' ? setConfirming(true) : void buy(kind)}>{intl.formatMessage(m.buy, { cost: formatWholeGameNumber(locale, cost ?? 0n) })}</Button>
    </article>
  }
  return <>
    {nextUnlock && <div className="avocato-feed-grid">{card(nextUnlock)}</div>}
    {state.unlocked && <details className="discovery-upgrades"><summary>{intl.formatMessage(m.upgrades)}</summary><div className="avocato-feed-grid">{upgradeKinds.map(kind => card(kind, true))}</div></details>}
    {failed && <p role="alert">{intl.formatMessage(m.purchaseFailed)}</p>}
    {confirming && <SkillDetailsDialog className="discovery-confirmation" title={intl.formatMessage(m.confirm)} closeLabel={intl.formatMessage(m.cancel)} palette="normal" onClose={() => { if (!pending) setConfirming(false) }}>
      <p>{intl.formatMessage(m.replacementWarning)}</p>
      <p>{intl.formatMessage(m.startingBenefits)}</p>
      {failed && <p role="alert">{intl.formatMessage(m.purchaseFailed)}</p>}
      <div className="discovery-purchase-actions">
        <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(m.cancel)}</Button>
        <Button disabled={pending || !available || balance < 1n || state.unlocked} onClick={() => void buy('unlock')}>{intl.formatMessage(m.buy, { cost: '1' })}</Button>
      </div>
    </SkillDetailsDialog>}
  </>
}
