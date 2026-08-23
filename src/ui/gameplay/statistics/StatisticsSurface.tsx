import {
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalProgression,
  FrontendDysonPresentationFacts,
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
type DisplayMetricKey =
  | TotalsMetricKey
  | 'combinedInfinityCount'
  | 'combinedInfinityPoints'

export interface StatisticsSurfaceProps {
  readonly locale: EnabledLocale
  readonly statistics: StatisticsState
  readonly swarmScale: FrontendDysonPresentationFacts['swarmScale']
  readonly visibility: StatisticsVisibility
}

export interface StatisticsVisibility {
  readonly infinity: boolean
  readonly simulations: boolean
  readonly reality: boolean
}

interface MetricDefinition {
  readonly label: MessageDescriptor
  readonly key: DisplayMetricKey
  readonly format: 'number' | 'duration'
}

interface MetricGroupDefinition {
  readonly title: MessageDescriptor
  readonly metrics: readonly MetricDefinition[]
  readonly visibility?: keyof StatisticsVisibility
}

const metricGroups: readonly MetricGroupDefinition[] = [
  {
    title: messages.infinity,
    visibility: 'infinity',
    metrics: [
      {
        label: messages.totalInfinities,
        key: 'combinedInfinityCount',
        format: 'number',
      },
      {
        label: messages.infinityPoints,
        key: 'combinedInfinityPoints',
        format: 'number',
      },
    ],
  },
  {
    title: messages.simulations,
    visibility: 'simulations',
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
    visibility: 'reality',
    metrics: [
      {
        label: messages.capacityStallTime,
        key: 'realityCapacityStallSeconds',
        format: 'duration',
      },
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
  ['simulatedSeconds', messages.simulatedTime, 'duration', undefined],
  ['infinityCount', messages.infinityResets, 'number', 'infinity'],
  ['infinityPoints', messages.infinityPoints, 'number', 'infinity'],
  ['dreamResetCount', messages.dreamResets, 'number', 'simulations'],
  ['strangeMatter', messages.strangeMatter, 'number', 'simulations'],
  ['realityWorkers', messages.realityWorkers, 'number', 'reality'],
] as const

type WindowMetricDefinition = (typeof windowMetrics)[number]

export function StatisticsSurface({
  locale,
  statistics,
  swarmScale,
  visibility,
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
  ] as const
  const visibleMetricGroups = metricGroups.filter(
    (group) =>
      group.visibility === undefined || visibility[group.visibility],
  )
  const visibleWindowMetrics = windowMetrics.filter(
    ([, , , requiredVisibility]) =>
      requiredVisibility === undefined || visibility[requiredVisibility],
  )
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
      <header className="statistics-surface__summary">
        <div className="statistics-surface__title" aria-hidden="true">
          {intl.formatMessage(messages.region)}
        </div>
      </header>
      <div className="statistics-surface__content">
        <div className="statistics-surface__scope-grid">
          {scopes.map((scope) => (
            <ScopeCard
              key={scope.title.id}
              locale={locale}
              title={scope.title}
              totals={scope.totals}
              groups={visibleMetricGroups}
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
                metrics={visibleWindowMetrics}
              />
            ))}
          </div>
        </section>

        <LastCycleCard
          locale={locale}
          cycle={statistics.lastCompletedCycle}
        />

        <OtherStats
          locale={locale}
          swarmScale={swarmScale}
        />
      </div>
    </div>
  )
}

function OtherStats({
  locale,
  swarmScale,
}: {
  readonly locale: EnabledLocale
  readonly swarmScale: FrontendDysonPresentationFacts['swarmScale']
}) {
  const intl = useIntl()
  return (
    <section className="statistics-surface__other">
      <h2>{intl.formatMessage(messages.otherStats)}</h2>
      <article className="statistics-card statistics-swarm-scale">
        <h3>{intl.formatMessage(messages.dysonSwarmScale)}</h3>
        <dl>
          <StatisticFact
            label={intl.formatMessage(messages.activePanels)}
            value={formatGameNumber(locale, swarmScale.activePanels)}
          />
          <StatisticFact
            label={intl.formatMessage(messages.starsSurrounded)}
            value={formatGameNumber(locale, swarmScale.starsSurrounded)}
          />
          <StatisticFact
            label={intl.formatMessage(messages.galaxiesEngulfed)}
            value={formatGameNumber(locale, swarmScale.galaxiesEngulfed)}
          />
        </dl>
      </article>
    </section>
  )
}

function ScopeCard({
  locale,
  title,
  totals,
  groups,
}: {
  readonly locale: EnabledLocale
  readonly title: MessageDescriptor
  readonly totals: Readonly<SimulationTotalsState>
  readonly groups: readonly MetricGroupDefinition[]
}) {
  const intl = useIntl()
  return (
    <article className="statistics-card statistics-scope-card">
      <header className="statistics-scope-card__heading">
        <h2>{intl.formatMessage(title)}</h2>
        <dl>
          <div>
            <dt>{intl.formatMessage(messages.simulatedTime)}</dt>
            <dd>{formatGameDuration(locale, totals.simulatedSeconds)}</dd>
          </div>
        </dl>
      </header>
      {groups.map((group) => (
        <section
          key={group.title.id}
          data-statistics-group={group.visibility}
        >
          <h3>{intl.formatMessage(group.title)}</h3>
          {hasRecordedGroupActivity(totals, group.metrics) ? (
            <dl>
              {group.metrics.map((metric) => (
                <StatisticFact
                  key={metric.key}
                  label={intl.formatMessage(metric.label)}
                  value={formatMetricValue(
                    locale,
                    readDisplayMetric(totals, metric.key),
                    metric.format,
                  )}
                />
              ))}
            </dl>
          ) : (
            <p className="statistics-card__empty">
              {intl.formatMessage(messages.none)}
            </p>
          )}
        </section>
      ))}
    </article>
  )
}

function WindowCard({
  locale,
  title,
  totals,
  metrics,
}: {
  readonly locale: EnabledLocale
  readonly title: MessageDescriptor
  readonly totals: StatisticsWindowAggregate
  readonly metrics: readonly WindowMetricDefinition[]
}) {
  const intl = useIntl()
  return (
    <article className="statistics-card statistics-window-card">
      <h3>{intl.formatMessage(title)}</h3>
      <dl>
        {metrics.map(([key, label, format]) => (
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

function hasRecordedGroupActivity(
  totals: Readonly<SimulationTotalsState>,
  metrics: readonly MetricDefinition[],
): boolean {
  return metrics.some((metric) => {
    const value = readDisplayMetric(totals, metric.key)
    return value !== 0 && value !== 0n
  })
}

function readDisplayMetric(
  totals: Readonly<SimulationTotalsState>,
  key: DisplayMetricKey,
): number | bigint {
  if (key === 'combinedInfinityCount') {
    return totals.ordinaryInfinityCount + totals.breakInfinityCount
  }
  if (key === 'combinedInfinityPoints') {
    return totals.ordinaryInfinityPoints +
      totals.breakInfinityPoints +
      totals.botCapInfinityPoints
  }
  return totals[key]
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
