import { FormattedMessage } from 'react-intl'
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
  const dyson = gameplay.derived.dyson
  if (dyson.status !== 'ready') return null
  const resources = gameplay.resources.dyson
  const rates = dyson.value.rates
  return (
    <div className="dyson-lower-facts">
      <p>
        <FormattedMessage
          {...messages.workerProduction}
          values={{
            workers: formatFact(locale, resources.workers),
            panels: formatFact(locale, rates.panels),
            emphasis: (chunks) => (
              <span className="dyson-lower-facts__value">
                {chunks}
              </span>
            ),
          }}
        />
      </p>
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
