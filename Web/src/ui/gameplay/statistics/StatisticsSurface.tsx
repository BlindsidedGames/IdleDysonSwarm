import {
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalProgression,
} from '../../../application/frontendSnapshot'
import type {
  SimulationTotalsState,
} from '../../../game-state/types'
import {
  formatGameDuration,
  formatGameNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import { statisticsMessages as messages } from './messages'
import {
  aggregateStatisticsWindows,
  type StatisticsWindowAggregate,
} from './statisticsProjection'
import './statistics.css'

type StatisticsState = FrontendCanonicalProgression['statistics']
type TotalsMetricKey = keyof SimulationTotalsState

export interface StatisticsSurfaceProps {
  readonly locale: EnabledLocale
  readonly statistics: StatisticsState
}

interface MetricDefinition {
  readonly label: MessageDescriptor
  readonly key: TotalsMetricKey
  readonly format: 'number' | 'duration'
}

interface MetricGroupDefinition {
  readonly title: MessageDescriptor
  readonly metrics: readonly MetricDefinition[]
}

const metricGroups: readonly MetricGroupDefinition[] = [
  {
    title: messages.activity,
    metrics: [
      {
        label: messages.simulatedTime,
        key: 'simulatedSeconds',
        format: 'duration',
      },
      {
        label: messages.capacityStallTime,
        key: 'realityCapacityStallSeconds',
        format: 'duration',
      },
    ],
  },
  {
    title: messages.infinity,
    metrics: [
      {
        label: messages.ordinaryInfinityCount,
        key: 'ordinaryInfinityCount',
        format: 'number',
      },
      {
        label: messages.breakInfinityCount,
        key: 'breakInfinityCount',
        format: 'number',
      },
      {
        label: messages.ordinaryInfinityPoints,
        key: 'ordinaryInfinityPoints',
        format: 'number',
      },
      {
        label: messages.breakInfinityPoints,
        key: 'breakInfinityPoints',
        format: 'number',
      },
      {
        label: messages.botCapInfinityPoints,
        key: 'botCapInfinityPoints',
        format: 'number',
      },
      {
        label: messages.botCapOverflowRewards,
        key: 'botCapOverflowRewards',
        format: 'number',
      },
    ],
  },
  {
    title: messages.simulations,
    metrics: [
      {
        label: messages.meteorResets,
        key: 'meteorDreamResets',
        format: 'number',
      },
      {
        label: messages.aiResets,
        key: 'aiDreamResets',
        format: 'number',
      },
      {
        label: messages.globalWarmingResets,
        key: 'globalWarmingDreamResets',
        format: 'number',
      },
      {
        label: messages.blackHoleResets,
        key: 'blackHoleDreamResets',
        format: 'number',
      },
      {
        label: messages.strangeMatter,
        key: 'strangeMatter',
        format: 'number',
      },
    ],
  },
  {
    title: messages.reality,
    metrics: [
      {
        label: messages.realityWorkers,
        key: 'realityWorkers',
        format: 'number',
      },
      {
        label: messages.automaticInfluence,
        key: 'automaticInfluence',
        format: 'number',
      },
      {
        label: messages.manualInfluence,
        key: 'manualInfluence',
        format: 'number',
      },
    ],
  },
]

const windowMetrics = [
  ['simulatedSeconds', messages.simulatedTime, 'duration'],
  ['infinityCount', messages.infinityResets, 'number'],
  ['infinityPoints', messages.infinityPoints, 'number'],
  ['dreamResetCount', messages.dreamResets, 'number'],
  ['strangeMatter', messages.strangeMatter, 'number'],
  ['realityWorkers', messages.realityWorkers, 'number'],
] as const

export function StatisticsSurface({
  locale,
  statistics,
}: StatisticsSurfaceProps) {
  const intl = useIntl()
  const scopes = [
    {
      title: messages.lifetime,
      totals: statistics.lifetime,
    },
    {
      title: messages.currentQuantumRun,
      totals: statistics.currentQuantumRun,
    },
    {
      title: messages.latestInterval,
      totals: statistics.recentProcessedSegment,
    },
  ] as const
  const windows = [
    {
      title: messages.lastHour,
      totals: aggregateStatisticsWindows(
        statistics.minuteWindows,
      ),
    },
    {
      title: messages.lastDay,
      totals: aggregateStatisticsWindows(
        statistics.halfHourWindows,
      ),
    },
    {
      title: messages.lastThirtyDays,
      totals: aggregateStatisticsWindows(
        statistics.dailyWindows,
      ),
    },
  ] as const

  return (
    <div className="statistics-surface">
      <div className="statistics-surface__content">
        <header className="statistics-surface__summary">
          <div>
            <div className="statistics-surface__title" aria-hidden="true">
              {intl.formatMessage(messages.region)}
            </div>
            {statistics.trackedSinceUpdate ? (
              <p>{intl.formatMessage(messages.trackingNotice)}</p>
            ) : null}
          </div>
          <dl>
            <div>
              <dt>{intl.formatMessage(messages.trackedTime)}</dt>
              <dd>
                {formatGameDuration(
                  locale,
                  statistics.trackedSimulatedSeconds,
                )}
              </dd>
            </div>
          </dl>
        </header>

        <div className="statistics-surface__scope-grid">
          {scopes.map((scope) => (
            <ScopeCard
              key={scope.title.id}
              locale={locale}
              title={scope.title}
              totals={scope.totals}
            />
          ))}
        </div>

        <section className="statistics-surface__history">
          <h2>{intl.formatMessage(messages.recentActivity)}</h2>
          <div className="statistics-surface__history-grid">
            {windows.map((window) => (
              <WindowCard
                key={window.title.id}
                locale={locale}
                title={window.title}
                totals={window.totals}
              />
            ))}
          </div>
        </section>

        <LastCycleCard
          locale={locale}
          cycle={statistics.lastCompletedCycle}
        />
      </div>
    </div>
  )
}

function ScopeCard({
  locale,
  title,
  totals,
}: {
  readonly locale: EnabledLocale
  readonly title: MessageDescriptor
  readonly totals: Readonly<SimulationTotalsState>
}) {
  const intl = useIntl()
  return (
    <article className="statistics-card statistics-scope-card">
      <h2>{intl.formatMessage(title)}</h2>
      {metricGroups.map((group) => (
        <section key={group.title.id}>
          <h3>{intl.formatMessage(group.title)}</h3>
          <dl>
            {group.metrics.map((metric) => (
              <StatisticFact
                key={metric.key}
                label={intl.formatMessage(metric.label)}
                value={formatMetricValue(
                  locale,
                  totals[metric.key],
                  metric.format,
                )}
              />
            ))}
          </dl>
        </section>
      ))}
    </article>
  )
}

function WindowCard({
  locale,
  title,
  totals,
}: {
  readonly locale: EnabledLocale
  readonly title: MessageDescriptor
  readonly totals: StatisticsWindowAggregate
}) {
  const intl = useIntl()
  return (
    <article className="statistics-card statistics-window-card">
      <h3>{intl.formatMessage(title)}</h3>
      <dl>
        {windowMetrics.map(([key, label, format]) => (
          <StatisticFact
            key={key}
            label={intl.formatMessage(label)}
            value={formatMetricValue(
              locale,
              totals[key],
              format,
            )}
          />
        ))}
      </dl>
    </article>
  )
}

function LastCycleCard({
  locale,
  cycle,
}: {
  readonly locale: EnabledLocale
  readonly cycle: StatisticsState['lastCompletedCycle']
}) {
  const intl = useIntl()
  return (
    <section className="statistics-card statistics-last-cycle">
      <h2>{intl.formatMessage(messages.lastCompletedCycle)}</h2>
      {cycle.valid ? (
        <dl>
          <StatisticFact
            label={intl.formatMessage(messages.cycleType)}
            value={intl.formatMessage(
              cycle.dreamCause
                ? messages.cycleSimulationReset
                : cycle.breakInfinity
                ? messages.cycleBreakInfinity
                : messages.cycleOrdinaryInfinity,
            )}
          />
          {!cycle.dreamCause ? (
            <StatisticFact
              label={intl.formatMessage(messages.cycleDuration)}
              value={formatGameDuration(
                locale,
                cycle.durationSeconds,
              )}
            />
          ) : null}
          <StatisticFact
            label={intl.formatMessage(messages.cycleReward)}
            value={formatGameNumber(locale, cycle.reward)}
          />
          {cycle.dreamCause ? (
            <StatisticFact
              label={intl.formatMessage(messages.resetCause)}
              value={formatDreamCause(cycle.dreamCause, intl)}
            />
          ) : null}
        </dl>
      ) : (
        <p>{intl.formatMessage(messages.noCompletedCycle)}</p>
      )}
    </section>
  )
}

function StatisticFact({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="statistics-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatMetricValue(
  locale: EnabledLocale,
  value: number | bigint,
  format: 'number' | 'duration',
): string {
  return format === 'duration'
    ? formatGameDuration(locale, Number(value))
    : formatGameNumber(locale, value)
}

function formatDreamCause(
  cause: string,
  intl: ReturnType<typeof useIntl>,
): string {
  const causeMessages: Readonly<Record<string, MessageDescriptor>> = {
    Meteor: messages.causeMeteor,
    ArtificialIntelligence: messages.causeArtificialIntelligence,
    GlobalWarming: messages.causeGlobalWarming,
    BlackHole: messages.causeBlackHole,
  }
  const descriptor = causeMessages[cause]
  return descriptor ? intl.formatMessage(descriptor) : cause
}
