import { skillMessages } from '../skills/messages'
import { useIntl } from 'react-intl'
import type { DiscoveryState } from '../../../game-state/types'
import type { DiscoveryEffects } from '../../../simulation/discoveryEffects'
import { DISCOVERY_TUNING } from '../../../simulation/discovery'
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
  const time = formatGameDuration(locale, effects.secondsToNext / gameSpeed)
  return <div className="discovery-surface">
    <section className="discovery-card" aria-label={intl.formatMessage(m.name)}>
      <header className="discovery-heading">
        <h2><InlineImageSymbol src={navigationAssets.discovery} label="" tint />{intl.formatMessage(m.name)}</h2>
        <strong aria-label={intl.formatMessage(m.production, { value: formatGameNumber(locale, effects.multiplier) })}>×{formatGameNumber(locale, effects.multiplier)}</strong>
      </header>
      <Progress className="discovery-progress" label={intl.formatMessage(m.name)} valueText={time}
        value={state.progress} maximum={DISCOVERY_TUNING.completionProgress} />
      <details className="discovery-details">
        <summary aria-label={intl.formatMessage(m.speedSources)} title={intl.formatMessage(m.resetRule)}>ⓘ</summary>
        <p>{intl.formatMessage(m.level, { value: formatWholeGameNumber(locale, state.completions + 1n) })}</p>
        <p>{intl.formatMessage(m.lifetime, { value: formatGameNumber(locale, effects.strength) })}</p>
        <p>{intl.formatMessage(m.next, { value: formatGameNumber(locale, effects.nextMultiplier), time })}</p>
        <p>{intl.formatMessage(m.resetRule)}</p>
        <dl><div><dt>{intl.formatMessage(m.speedSources)}</dt><dd>×{formatGameNumber(locale, effects.speed)}</dd></div>
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
      </details>
    </section>
  </div>
}
