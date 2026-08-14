import { useIntl } from 'react-intl'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { SettingsIcon } from '../../components'
import { formatGameDuration, formatNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { simulationsMessages as messages } from './messages'
import './simulations.css'

export type SpaceAgePurchaseQuantity = 1 | 10 | 50 | 100 | 'max'

const SPACE_AGE_PURCHASE_QUANTITIES = Object.freeze([
  1,
  10,
  50,
  100,
  'max',
] as const satisfies readonly SpaceAgePurchaseQuantity[])

type SetDoubleTimeRateCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'time.set-double-time-rate' }
>

export interface SimulationTimeControlProps {
  readonly locale: EnabledLocale
  readonly bankSeconds: number
  readonly rate: number
  readonly enabled: boolean
  readonly available: boolean
  readonly spaceAgeAvailable: boolean
  readonly purchaseSettingsOpen: boolean
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
  readonly onPurchaseSettingsOpenChange: (open: boolean) => void
  readonly onSpaceAgePurchaseQuantityChange: (quantity: SpaceAgePurchaseQuantity) => void
  readonly dispatchPlayer: (
    command: SetDoubleTimeRateCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

export function SimulationTimeControl({
  locale, bankSeconds, rate, enabled, dispatchPlayer, available,
  spaceAgeAvailable, purchaseSettingsOpen, spaceAgePurchaseQuantity,
  onPurchaseSettingsOpenChange, onSpaceAgePurchaseQuantityChange,
}: SimulationTimeControlProps) {
  const intl = useIntl()
  return <section className="simulation-time-control" aria-label={intl.formatMessage(messages.timeMultiplier)}>
    <div className="simulation-time-control__header"><strong>{intl.formatMessage(messages.timeMultiplier)}</strong><span>{enabled ? intl.formatMessage(messages.boostRemaining) : intl.formatMessage(messages.offlineTime)}: {formatGameDuration(locale, bankSeconds)}</span>{spaceAgeAvailable && <button type="button" className="simulation-time-control__settings-toggle" aria-label={intl.formatMessage(messages.purchaseSettings)} aria-expanded={purchaseSettingsOpen} onClick={() => onPurchaseSettingsOpenChange(!purchaseSettingsOpen)}><SettingsIcon /></button>}</div>
    <input aria-label={intl.formatMessage(messages.timeMultiplier)} type="range" min="0" max="10" step="1" value={rate} disabled={!available} onChange={(event) => void dispatchPlayer({ kind: 'time.set-double-time-rate', rate: Number(event.currentTarget.value) })} />
    <div className="simulation-time-control__rate"><span>{intl.formatMessage(messages.simulationSpeedIncreasedBy, { value: formatNumber(locale, rate * 100, { maximumFractionDigits: 0 }) })}</span></div>
    {spaceAgeAvailable && purchaseSettingsOpen && <div className="simulation-time-control__purchase-settings" role="group" aria-label={intl.formatMessage(messages.purchaseAmount)}>{SPACE_AGE_PURCHASE_QUANTITIES.map((quantity) => <button key={quantity} type="button" aria-pressed={spaceAgePurchaseQuantity === quantity} onClick={() => onSpaceAgePurchaseQuantityChange(quantity)}>{quantity === 'max' ? intl.formatMessage(messages.buyMax) : intl.formatMessage(messages.buyQuantity, { quantity })}</button>)}</div>}
  </section>
}
