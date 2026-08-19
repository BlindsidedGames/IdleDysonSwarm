// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import type {
  FrontendCanonicalProgression,
} from '../../../application/frontendSnapshot'
import type {
  SimulationTotalsState,
  StatisticsWindowState,
} from '../../../game-state/types'
import { StatisticsSurface } from './StatisticsSurface'
import { aggregateStatisticsWindows } from './statisticsProjection'

afterEach(cleanup)

describe('StatisticsSurface', () => {
  test('presents reached-system lifetime and current-run totals without the diagnostic interval', () => {
    renderStatistics(statistics())

    expect(screen.getByText('Statistics')).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Statistics' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Statistics' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Statistics have been tracked since this feature was added.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText('2h 5s')).toHaveLength(2)

    const lifetime = screen
      .getByRole('heading', { name: 'Lifetime' })
      .closest('article')
    expect(lifetime).not.toBeNull()
    const lifetimeQueries = within(lifetime as HTMLElement)
    expect(lifetimeQueries.getByText('Infinities')).toBeVisible()
    expect(lifetimeQueries.getByText('1.23M')).toBeVisible()
    expect(lifetimeQueries.getByText('Infinity Points earned')).toBeVisible()
    expect(lifetimeQueries.getByText('1.80K')).toBeVisible()
    expect(lifetimeQueries.queryByText('Break Infinities')).not.toBeInTheDocument()
    expect(lifetimeQueries.queryByText('Bot-cap Infinity Points')).not.toBeInTheDocument()
    expect(lifetimeQueries.getByText('Artificial Intelligence resets')).toBeVisible()
    expect(lifetimeQueries.getByText('Influence gathered automatically')).toBeVisible()

    expect(
      screen.getByRole('heading', { name: 'Current Quantum run' }),
    ).toBeVisible()
    const currentRun = screen
      .getByRole('heading', { name: 'Current Quantum run' })
      .closest('article')
    expect(currentRun).not.toBeNull()
    expect(within(currentRun as HTMLElement).getByText('0s')).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Latest interval' }),
    ).not.toBeInTheDocument()
  })

  test('hides statistics for systems that have not been reached', () => {
    renderStatistics(statistics(), {
      infinity: false,
      simulations: false,
      reality: false,
    })

    expect(screen.queryByRole('heading', { name: 'Infinity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Simulations' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reality' })).not.toBeInTheDocument()
    expect(screen.queryByText('Infinity resets')).not.toBeInTheDocument()
    expect(screen.queryByText('Simulation resets')).not.toBeInTheDocument()
    expect(screen.queryByText('Reality workers created')).not.toBeInTheDocument()
  })

  test('shows None for a reached group with no recorded activity', () => {
    renderStatistics(statistics({
      lifetime: totals({ simulatedSeconds: 10 }),
      currentQuantumRun: totals(),
    }))

    const currentRun = screen
      .getByRole('heading', { name: 'Current Quantum run' })
      .closest('article')
    expect(currentRun).not.toBeNull()
    expect(within(currentRun as HTMLElement).getAllByText('None')).toHaveLength(3)
  })

  test('keeps exactly two player-facing scope cards', () => {
    const { container } = renderStatistics(statistics())

    expect(
      container.querySelectorAll('.statistics-surface__scope-grid > article'),
    ).toHaveLength(2)
  })

  test('summarizes all three rolling horizons and the last completed cycle', () => {
    renderStatistics(statistics())

    const hour = screen
      .getByRole('heading', { name: 'Last 60 minutes' })
      .closest('article')
    expect(hour).not.toBeNull()
    const hourQueries = within(hour as HTMLElement)
    expect(hourQueries.getByText('Infinity resets')).toBeVisible()
    expect(hourQueries.getByText('30.0')).toBeVisible()
    expect(hourQueries.getByText('3m 0s')).toBeVisible()

    const cycle = screen
      .getByRole('heading', { name: 'Last completed cycle' })
      .closest('section')
    expect(cycle).not.toBeNull()
    const cycleQueries = within(cycle as HTMLElement)
    expect(cycleQueries.getByText('Simulation reset')).toBeVisible()
    expect(cycleQueries.getByText('Black Hole')).toBeVisible()
    expect(cycleQueries.getByText('12.3K')).toBeVisible()
    expect(cycleQueries.queryByText('1m 30s')).not.toBeInTheDocument()
  })

  test('shows the cycle empty state and passes an accessibility scan', async () => {
    const state = statistics({
      lastCompletedCycle: {
        valid: false,
        breakInfinity: false,
        durationSeconds: 0,
        reward: 0n,
        dreamCause: null,
      },
    })
    const { container } = renderStatistics(state)

    expect(
      screen.getByText('No completed cycle has been recorded yet.'),
    ).toBeVisible()
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

describe('aggregateStatisticsWindows', () => {
  test('adds retained ring-buffer buckets without losing bigint precision', () => {
    expect(
      aggregateStatisticsWindows([
        window({
          simulatedSeconds: 12.5,
          infinityCount: 9_007_199_254_740_993n,
          strangeMatter: 8n,
        }),
        window({
          sequence: 2n,
          simulatedSeconds: 7.5,
          infinityCount: 10n,
          strangeMatter: 12n,
        }),
      ]),
    ).toEqual({
      simulatedSeconds: 20,
      infinityCount: 9_007_199_254_741_003n,
      infinityPoints: 40n,
      dreamResetCount: 6n,
      strangeMatter: 20n,
      realityWorkers: 10n,
    })
  })
})

function renderStatistics(
  state: FrontendCanonicalProgression['statistics'],
  visibility = {
    infinity: true,
    simulations: true,
    reality: true,
  },
) {
  return render(
    <IntlProvider
      locale="en"
      messages={{}}
      onError={() => undefined}
    >
      <StatisticsSurface
        locale="en"
        statistics={state}
        visibility={visibility}
      />
    </IntlProvider>,
  )
}

function statistics(
  overrides: Partial<
    FrontendCanonicalProgression['statistics']
  > = {},
): FrontendCanonicalProgression['statistics'] {
  const lifetime = totals({
    ordinaryInfinityCount: 1_234_567n,
    breakInfinityCount: 42n,
    ordinaryInfinityPoints: 500n,
    breakInfinityPoints: 600n,
    botCapInfinityPoints: 700n,
    botCapOverflowRewards: 8n,
    meteorDreamResets: 9n,
    aiDreamResets: 10n,
    globalWarmingDreamResets: 11n,
    blackHoleDreamResets: 12n,
    strangeMatter: 13n,
    realityWorkers: 14n,
    automaticInfluence: 15n,
    manualInfluence: 16n,
    realityCapacityStallSeconds: 17,
    simulatedSeconds: 7_205,
  })
  return {
    trackedSinceUpdate: true,
    trackingStartedMarker: 'tracked-since-update',
    trackedSimulatedSeconds: 7_205,
    lifetime,
    currentQuantumRun: totals({ ordinaryInfinityCount: 2n }),
    recentProcessedSegment: totals({ simulatedSeconds: 0.1 }),
    lastCompletedCycle: {
      valid: true,
      breakInfinity: true,
      durationSeconds: 90,
      reward: 12_345n,
      dreamCause: 'BlackHole',
    },
    minuteWindows: [window(), window({ sequence: 2n })],
    halfHourWindows: [window({ simulatedSeconds: 1_800 })],
    dailyWindows: [window({ simulatedSeconds: 86_400 })],
    ...overrides,
  }
}

function totals(
  overrides: Partial<SimulationTotalsState> = {},
): SimulationTotalsState {
  return {
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
    ...overrides,
  }
}

function window(
  overrides: Partial<StatisticsWindowState> = {},
): StatisticsWindowState {
  return {
    sequence: 1n,
    simulatedSeconds: 90,
    infinityCount: 15n,
    infinityPoints: 20n,
    dreamResetCount: 3n,
    strangeMatter: 4n,
    realityWorkers: 5n,
    ...overrides,
  }
}
