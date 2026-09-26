import { skillMessages } from '../skills/messages'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import type { DiscoveryEffects } from '../../../simulation/discoveryEffects'
import { DISCOVERY_TUNING, discoveryCompletionTimes } from '../../../simulation/discovery'
import { Progress, InlineImageSymbol } from '../../components'
import { navigationAssets } from '../shell/navigationAssets'
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
  const tiers = [
    { id: 'discovery', name: m.name, tier: state, maximum: DISCOVERY_TUNING.completionProgress, speed: effects.speed, benefit: formatGameNumber(locale, effects.multiplier), label: m.production },
    ...(state.elevation ? [{ id: 'elevation', name: m.elevation, tier: state.elevation, maximum: DISCOVERY_TUNING.elevation.progress, speed: effects.elevationSpeed, benefit: formatGameNumber(locale, effects.cashBotsMultiplier), label: m.cashBotsProduction }] : []),
    ...(state.enlightenment ? [{ id: 'enlightenment', name: m.enlightenment, tier: state.enlightenment, maximum: DISCOVERY_TUNING.enlightenment.progress, speed: effects.enlightenmentSpeed, benefit: formatGameDuration(locale, effects.lifetime, { maximumFractionDigits: 1 }), label: m.lifetime }] : []),
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
            <strong className="discovery-boost" aria-label={intl.formatMessage(bar.label, { value: index === 2 ? formatGameNumber(locale, effects.lifetime) : bar.benefit })}>
              {index === 0 && <InlineImageSymbol src={navigationAssets.discovery} tint />}{index === 1 ? '×' : ''}{bar.benefit}
            </strong>
          </span>
        </span>)}
      </summary>
      <div className="discovery-details">
        <dl className="discovery-facts">
          {tiers.map(bar => <div key={bar.id}><dt>{intl.formatMessage(m.tierCompletions, { name: intl.formatMessage(bar.name) })}</dt><dd>{formatWholeGameNumber(locale, bar.tier.completions)}</dd></div>)}
          <div><dt>{intl.formatMessage(m.baseLifetime)}</dt><dd>{formatGameDuration(locale, effects.lifetime, { maximumFractionDigits: 1 })}</dd></div>
          <div><dt>{intl.formatMessage(m.cashBots)}</dt><dd>×{formatGameNumber(locale, effects.cashBotsMultiplier)}</dd></div>
          <div><dt>{intl.formatMessage(m.nextMultiplier)}</dt><dd>×{formatGameNumber(locale, effects.nextMultiplier)}</dd></div>
          {tiers.slice(1).map(bar => <div key={bar.id}><dt>{intl.formatMessage(m.tierSpeed, { name: intl.formatMessage(bar.name) })}</dt><dd>×{formatGameNumber(locale, bar.speed)}</dd></div>)}
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
