import { useIntl } from 'react-intl'
import type {
  FrontendGameplaySnapshot,
} from '../../../application/frontendSnapshot'
import type { DeepReadonly } from '../../../core/contracts'
import {
  formatNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import { readyDysonMessages as messages } from './messages'
import './dysonLowerFacts.css'

export interface DysonLowerFactsProps {
  readonly gameplay: DeepReadonly<FrontendGameplaySnapshot>
  readonly locale: EnabledLocale
}

export function DysonProductionSummary({
  gameplay,
  locale,
}: DysonLowerFactsProps) {
  const intl = useIntl()
  const dyson = gameplay.derived.dyson
  if (dyson.status !== 'ready') return null
  const resources = gameplay.resources.dyson
  const rates = dyson.value.rates
  return (
    <div className="dyson-lower-facts">
      <p>
        {intl.formatMessage(messages.workerProduction, {
          workers: formatFact(locale, resources.workers),
          panels: formatFact(locale, rates.panels),
        })}
      </p>
      <p>
        {intl.formatMessage(messages.scienceProduction, {
          scientists: formatFact(locale, resources.researchers),
          science: formatFact(locale, rates.science),
        })}
      </p>
    </div>
  )
}

export function DysonBotDistributionFacts({
  gameplay,
  locale,
}: DysonLowerFactsProps) {
  const intl = useIntl()
  const distribution = gameplay.derived.dysonBotDistribution
  const percent = (value: number) =>
    formatNumber(locale, value, {
      style: 'percent',
      maximumFractionDigits: 0,
    })
  return (
    <div className="dyson-bot-distribution">
      <h2>{intl.formatMessage(messages.botDistribution)}</h2>
      <dl>
        <div>
          <dt>{intl.formatMessage(messages.workers)}</dt>
          <dd>{percent(distribution.workersFraction)}</dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.scientists)}</dt>
          <dd>{percent(distribution.scientistsFraction)}</dd>
        </div>
      </dl>
    </div>
  )
}

function formatFact(
  locale: EnabledLocale,
  value: number,
): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 3,
    useGrouping: true,
  })
}
