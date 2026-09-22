import { skillMessages } from '../skills/messages'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import type { DiscoveryEffects } from '../../../simulation/discoveryEffects'
import { DISCOVERY_TUNING } from '../../../simulation/discovery'
import { Progress } from '../../components'
import { discoverySkillNames } from './skillMessages'
import { formatGameNumber, formatWholeGameNumber, formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { discoveryMessages as m } from './messages'
import './discovery.css'

export function DiscoverySurface({ state, effects, locale, gameSpeed }: {
  readonly state: DiscoveryState
  readonly effects: DiscoveryEffects
  readonly locale: EnabledLocale
  readonly gameSpeed: number
}) {
  const intl = useIntl()
  const formatCatalogMessage = intl.formatMessage
  const time = formatGameDuration(locale, effects.secondsToNext / gameSpeed)
  const productionLabel = intl.formatMessage(m.production, { value: formatGameNumber(locale, effects.multiplier) })
  return <div className="discovery-surface">
    <details className="discovery-card">
      <summary className="discovery-toggle" aria-label={`${intl.formatMessage(m.details)}: ${productionLabel}, ${time}`}>
        <span className="discovery-heading">
          <span className="discovery-title">{intl.formatMessage(m.name)}</span>
          <strong aria-label={productionLabel}>×{formatGameNumber(locale, effects.multiplier)}</strong>
        </span>
        <Progress className="discovery-progress" label={intl.formatMessage(m.name)} valueText={time}
          value={state.progress} maximum={DISCOVERY_TUNING.completionProgress} />
      </summary>
      <div className="discovery-details">
        <dl className="discovery-facts">
          <div><dt>{intl.formatMessage(m.levelLabel)}</dt><dd>{formatWholeGameNumber(locale, state.completions + 1n)}</dd></div>
          <div><dt>{intl.formatMessage(m.baseLifetime)}</dt><dd>{formatGameDuration(locale, effects.strength, { maximumFractionDigits: 1 })}</dd></div>
          <div><dt>{intl.formatMessage(m.nextMultiplier)}</dt><dd>×{formatGameNumber(locale, effects.nextMultiplier)}</dd></div>
        </dl>
        <dl className="discovery-speed-sources">
          <div className="discovery-speed-total"><dt>{intl.formatMessage(m.speedSources)}</dt><dd>×{formatGameNumber(locale, effects.speed)}</dd></div>
          <div><dt>{intl.formatMessage(m.baseSpeed)}</dt><dd>1×</dd></div>
          {effects.sources.map(source => {
            const descriptor = source.id === 'subskill.cashScience.production' ? skillMessages.subskillProductionName : source.id === 'discovery.speed' ? m.speed
              : source.id === 'quantum.science-booster' ? m.booster
              : source.id === 'avocado' ? m.avocatoSpeed
              : source.id === 'secrets.discovery-speed' ? m.secretsSpeed
              : discoverySkillNames[source.id as keyof typeof discoverySkillNames]
            const name = descriptor ? intl.formatMessage(descriptor) : formatCatalogMessage({ id: `skills.node.${source.id}.name`, defaultMessage: source.id })
            return <div key={source.id}><dt>{name}</dt><dd>+{formatGameNumber(locale, source.bonus * 100)}%</dd></div>
          })}
        </dl>
      </div>
    </details>
  </div>
}
