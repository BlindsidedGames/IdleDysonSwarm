import { useIntl } from 'react-intl'
import { QUANTUM_CONSTANTS } from '../../../simulation/quantumUpgrades'
import { SettingsIcon } from '../../components'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { boundedPresentationFraction, comparePresentationNumeric, type PresentationNumeric } from '../../presentationNumeric'
import { quantumMessages as messages } from './messages'
import { QUANTUM_PURCHASE_QUANTITIES, type QuantumPurchaseQuantity } from './quantumPurchaseQuantities'
import './quantum.css'

export interface QuantumControlPanelProps {
  readonly locale: EnabledLocale
  readonly infinityPoints: PresentationNumeric
  readonly purchaseSettingsOpen: boolean
  readonly purchaseQuantity: QuantumPurchaseQuantity
  readonly onPurchaseSettingsOpenChange: (open: boolean) => void
  readonly onPurchaseQuantityChange: (quantity: QuantumPurchaseQuantity) => void
}

export function QuantumControlPanel({
  locale, infinityPoints, purchaseSettingsOpen, purchaseQuantity,
  onPurchaseSettingsOpenChange, onPurchaseQuantityChange,
}: QuantumControlPanelProps) {
  const intl = useIntl()
  const required = QUANTUM_CONSTANTS.infinityPointsPerQuantumPoint
  const progress = boundedPresentationFraction(infinityPoints, required)
  const available = comparePresentationNumeric(infinityPoints, required) >= 0
  return <section className="quantum-control-panel" aria-label={intl.formatMessage(messages.progress)}>
    <div className="quantum-control-panel__header">
      <strong>{intl.formatMessage(messages.progress)}</strong>
      <span>{available ? intl.formatMessage(messages.progressAvailable) : intl.formatMessage(messages.progressValue, { current: formatGameNumber(locale, infinityPoints), required: formatGameNumber(locale, required) })}</span>
      <button type="button" className="quantum-control-panel__settings-toggle" aria-label={intl.formatMessage(messages.purchaseSettings)} aria-expanded={purchaseSettingsOpen} onClick={() => onPurchaseSettingsOpenChange(!purchaseSettingsOpen)}><SettingsIcon /></button>
    </div>
    <span className="quantum-surface__track" role="progressbar" aria-label={intl.formatMessage(messages.progress)} aria-valuemin={0} aria-valuemax={42} aria-valuenow={Math.round(progress * 42)}><span style={{ inlineSize: `${Math.max(0, Math.min(1, progress)) * 100}%` }} /></span>
    {purchaseSettingsOpen && <div className="quantum-control-panel__purchase-settings" role="group" aria-label={intl.formatMessage(messages.purchaseAmount)}>{QUANTUM_PURCHASE_QUANTITIES.map((quantity) => <button key={quantity} type="button" aria-pressed={purchaseQuantity === quantity} onClick={() => onPurchaseQuantityChange(quantity)}>{quantity === 'max' ? intl.formatMessage(messages.buyMax) : intl.formatMessage(messages.buyQuantity, { quantity })}</button>)}</div>}
  </section>
}
