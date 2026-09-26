import { skillMessages } from '../skills/messages'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import { discoverySourceWeight, type DiscoveryEffects } from '../../../simulation/discoveryEffects'
import { DISCOVERY_TUNING, discoveryCompletionTimes } from '../../../simulation/discovery'
import { Progress, InlineImageSymbol } from '../../components'
import { discoveryIcons } from './icons'
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
  const number = (value: number) => formatGameNumber(locale, value)
  const duration = (value: number) => formatGameDuration(locale, value, { maximumFractionDigits: 1 })
  const nextBonus = DISCOVERY_TUNING.strengthPerCompletion * (1 + effects.enhancement)
  const tiers = [
    { id: 'discovery' as const, name: m.name, tier: state, maximum: DISCOVERY_TUNING.completionProgress, speed: effects.speed,
      benefit: number(effects.multiplier), label: m.production, fact: m.facilityProduction, next: number(effects.nextMultiplier) },
    ...(state.elevation ? [{ id: 'elevation' as const, name: m.elevation, tier: state.elevation, maximum: DISCOVERY_TUNING.elevation.progress, speed: effects.elevationSpeed,
      benefit: number(effects.cashBotsMultiplier), label: m.cashBotsProduction, fact: m.cashBots, next: number(effects.cashBotsMultiplier + nextBonus) }] : []),
    ...(state.enlightenment ? [{ id: 'enlightenment' as const, name: m.enlightenment, tier: state.enlightenment, maximum: DISCOVERY_TUNING.enlightenment.progress, speed: effects.enlightenmentSpeed,
      benefit: duration(effects.lifetime), label: m.lifetime, fact: m.baseLifetime, next: duration(effects.lifetime + DISCOVERY_TUNING.strengthPerCompletion) }] : []),
  ]
  const completionTimes = discoveryCompletionTimes(state, effects)
  return <div className="discovery-surface">
    <details className="discovery-card">
      <summary className="discovery-toggle" aria-label={intl.formatMessage(m.details)}>
        {tiers.map((bar, index) => <span className={`discovery-row${index ? ' discovery-row--supporting' : ''}`} key={bar.id}>
          {index === 0 && <span className="discovery-heading"><span className="discovery-title">{intl.formatMessage(m.name)}</span></span>}
          <span className="discovery-bar">
            <Progress className="discovery-progress" label={intl.formatMessage(bar.name)}
              valueText={formatGameDuration(locale, completionTimes[index] / gameSpeed)}
              value={bar.tier.progress} maximum={bar.maximum} />
            <strong className="discovery-boost" aria-label={intl.formatMessage(bar.label, { value: index === 2 ? number(effects.lifetime) : bar.benefit })}>
              <InlineImageSymbol src={discoveryIcons[bar.id]} tint />{bar.benefit}
            </strong>
          </span>
        </span>)}
      </summary>
      <div className="discovery-details">
        {tiers.map((bar, index) => <section className="discovery-tier-details" aria-labelledby={`discovery-${bar.id}-heading`} key={bar.id}>
          <h2 id={`discovery-${bar.id}-heading`}><InlineImageSymbol src={discoveryIcons[bar.id]} tint />{intl.formatMessage(bar.name)}</h2>
          <dl>
            <div><dt>{intl.formatMessage(m.completed)}</dt><dd>{formatWholeGameNumber(locale, bar.tier.completions)}</dd></div>
            <div><dt>{intl.formatMessage(bar.fact)}</dt><dd>{index === 2 ? '' : '×'}{bar.benefit}</dd></div>
            <div><dt>{intl.formatMessage(index === 2 ? m.nextPanelLifetime : m.nextMultiplier)}</dt><dd>{index === 2 ? '' : '×'}{bar.next}</dd></div>
            {index === 0 && !state.elevation && <div><dt>{intl.formatMessage(m.cashBots)}</dt><dd>×{number(effects.cashBotsMultiplier)}</dd></div>}
            {index === 0 && !state.enlightenment && <div><dt>{intl.formatMessage(m.baseLifetime)}</dt><dd>{duration(effects.lifetime)}</dd></div>}
            {index > 0 && <div className="discovery-transfer"><dt>{intl.formatMessage(m.progressPerCompletion)}</dt><dd>{intl.formatMessage(m.transfer, { name: intl.formatMessage(tiers[index - 1].name), time: intl.formatNumber(bar.maximum / 60, { style: 'unit', unit: 'minute', unitDisplay: 'narrow' }) })}</dd></div>}
          </dl>
          <dl className="discovery-speed-sources">
            <div className="discovery-speed-total"><dt>{intl.formatMessage(m.rate)}</dt><dd>×{number(bar.speed)}</dd></div>
            <div><dt>{intl.formatMessage(m.baseSpeed)}</dt><dd>1×</dd></div>
            {effects.sources.map(source => {
              const descriptor = source.id === 'subskill.cashScience.production' ? skillMessages.subskillProductionName : source.id === 'discovery.speed' ? m.speed
                : source.id === 'quantum.science-booster' ? m.booster
                : source.id === 'avocado' ? m.avocatoSpeed
                : source.id === 'secrets.discovery-speed' ? m.secretsSpeed
                : discoverySkillNames[source.id as keyof typeof discoverySkillNames]
              const name = descriptor ? intl.formatMessage(descriptor) : formatCatalogMessage({ id: `skills.node.${source.id}.name`, defaultMessage: source.id })
              return <div key={source.id}><dt>{name}</dt><dd>+{number(source.bonus * discoverySourceWeight(source.id, bar.id) * 100)}%</dd></div>
            })}
          </dl>
        </section>)}
      </div>
    </details>
  </div>
}
