import { FormattedMessage } from 'react-intl'
import type {
  FrontendGameplaySnapshot,
} from '../../../application/frontendSnapshot'
import type { DeepReadonly } from '../../../core/contracts'
import {
  formatGameNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import { StableSingleLineText } from '../../components'
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
        <StableSingleLineText
          measurement={<WorkerProductionMessage
            workers="9.99QaQag"
            panels="9.99QaQag"
          />}
        >
          <WorkerProductionMessage
            workers={formatFact(locale, resources.workers)}
            panels={formatFact(locale, rates.panels)}
          />
        </StableSingleLineText>
      </p>
    </div>
  )
}

function WorkerProductionMessage({
  workers,
  panels,
}: {
  readonly workers: string
  readonly panels: string
}) {
  return (
    <FormattedMessage
      {...messages.workerProduction}
      values={{
        workers,
        panels,
        emphasis: (chunks) => (
          <span className="dyson-lower-facts__value">{chunks}</span>
        ),
      }}
    />
  )
}

function formatFact(
  locale: EnabledLocale,
  value: number,
): string {
  return formatGameNumber(locale, value)
}
