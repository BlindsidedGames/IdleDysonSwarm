import { useIntl } from 'react-intl'
import type { RunUsage, SpeedrunUsage as Usage } from '../../../simulation/speedrunStatistics'
import { InlineImageSymbol } from '../../components/InlineImageSymbol'
import bot from '../../assets/nav-bots.png'
import infinity from '../../assets/nav-infinity.png'
import debug from '../../assets/nav-debug.png'
import storedTime from '../../assets/nav-offline-time.png'
import { boostMessages } from '../store/boostMessages'
import { statisticsMessages as messages } from './messages'

const indicators = [
  { key: 'botBoostUsed', icon: bot, label: boostMessages.used },
  { key: 'doubleIpUsed', icon: infinity, label: messages.doubleIpUsed },
  { key: 'debug', icon: debug, label: messages.speedrunDebug },
  { key: 'storedTime', icon: storedTime, label: messages.speedrunStored },
] as const

function usageState(value: boolean | RunUsage | undefined): RunUsage {
  return value === true ? 'yes' : value === false ? 'no' : value ?? 'unknown'
}

export function SpeedrunUsage({ usage, legend = false }: { readonly usage?: Usage; readonly legend?: boolean }) {
  const intl = useIntl()
  return <ul className={`speedrun-usage${legend ? ' speedrun-usage--legend' : ''}`} aria-label={intl.formatMessage(messages.usageLegend)}>
    {indicators.map(({ key, icon, label }) => {
      const value = usageState(usage?.[key])
      const name = intl.formatMessage(label)
      const description = `${name}: ${intl.formatMessage(value === 'yes' ? messages.speedrunYes : value === 'no' ? messages.speedrunNo : messages.speedrunUnknown)}`
      return <li key={key}>
        <span className="speedrun-usage__indicator" data-usage={legend ? 'yes' : value}
          role="img" aria-label={legend ? name : description} tabIndex={legend ? undefined : 0}>
          <InlineImageSymbol src={icon} tint />
          {!legend && <span className="speedrun-usage__tooltip" aria-hidden="true">{description}</span>}
          {!legend && value === 'unknown' && <span className="speedrun-usage__unknown" aria-hidden="true">?</span>}
        </span>
        {legend && <span>{name}</span>}
      </li>
    })}
  </ul>
}
