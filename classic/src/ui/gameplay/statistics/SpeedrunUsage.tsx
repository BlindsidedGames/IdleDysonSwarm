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

function UsageIcon({ icon, value, label, interactive = false, disqualifies = false }: {
  readonly icon: string
  readonly value?: RunUsage
  readonly label: string
  readonly interactive?: boolean
  readonly disqualifies?: boolean
}) {
  return <span className="speedrun-usage__indicator" data-usage={value} data-disqualifies={disqualifies || undefined}
    role="img" aria-label={label} tabIndex={interactive ? 0 : undefined}>
    <InlineImageSymbol src={icon} tint />
    {value === 'unknown' && <span className="speedrun-usage__unknown" aria-hidden="true">?</span>}
    {interactive && <span className="speedrun-usage__tooltip" aria-hidden="true">{label}</span>}
  </span>
}

export function SpeedrunUsage({ usage, legend = false }: { readonly usage?: Usage; readonly legend?: boolean }) {
  const intl = useIntl()
  return <>
    <ul className={`speedrun-usage${legend ? ' speedrun-usage--legend' : ''}`} aria-label={intl.formatMessage(messages.usageLegend)}>
      {indicators.map(({ key, icon, label }) => {
        const value = usageState(usage?.[key])
        const name = intl.formatMessage(label)
        const description = `${name}: ${intl.formatMessage(value === 'yes' ? messages.speedrunYes : value === 'no' ? messages.speedrunNo : messages.speedrunUnknown)}`
        return <li key={key}>
          <UsageIcon icon={icon} value={legend ? undefined : value} label={legend ? name : description} interactive={!legend} disqualifies={key === 'debug'} />
          {legend && <span>{name}</span>}
        </li>
      })}
    </ul>
    {legend && <ul className="speedrun-usage speedrun-usage--states">
      {([
        ['yes', messages.usageUsed, bot, false],
        ['no', messages.usageNotUsed, bot, false],
        ['yes', messages.speedrunDebug, debug, true],
      ] as const).map(([value, label, icon, disqualifies]) => <li key={label.id}>
        <UsageIcon icon={icon} value={value} label={intl.formatMessage(label)} disqualifies={disqualifies} />
        <span>{intl.formatMessage(label)}</span>
      </li>)}
    </ul>}
  </>
}
