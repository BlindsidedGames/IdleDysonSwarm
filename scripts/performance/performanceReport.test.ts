import { describe, expect, test } from 'vitest'
import {
  createInteractionReport,
  interactionToNextPaint,
  performanceReportExitCode,
  performanceReportText,
} from './performanceReport'

function reportFor(latencies: readonly number[]) {
  return createInteractionReport({
    mode: 'acceptance',
    createdAtUtc: '2026-09-12T00:00:00Z',
    environment: { browser: 'test', browserVersion: '1', platform: 'test', productionUrl: 'http://localhost' },
    traceDurationMilliseconds: 30_000,
    profiles: [{
      id: 'desktop',
      viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
      cpuThrottleRate: 1,
      trials: latencies.map((latency, index) => ({
        trial: index + 1,
        consoleErrors: [],
        pageErrors: [],
        longTaskDurationsMilliseconds: [],
        commandFeedbackLatenciesMilliseconds: [1],
        snapshotSelectionThroughReactCommit: [{ revision: { session: 1, state: index }, durationMilliseconds: 1 }],
        interactionToNextPaintMilliseconds: latency,
        cumulativeLayoutShift: 0,
        largestContentfulPaintMilliseconds: 100,
      })),
    }],
  })
}

describe('interaction report evidence failures', () => {
  test('explains missing trials without accepting a low aggregate percentile', () => {
    const missing = interactionToNextPaint([])
    const report = reportFor([missing, missing, 24, 24, 16])
    const inp = report.profiles[0].budgets.find(budget => budget.name === 'Synthetic INP P75')

    expect(inp).toMatchObject({ actual: 24, limit: 200, passed: false })
    expect(inp?.failureReason).toContain('trial(s) 1, 2')
    expect(inp?.failureReason).toContain('not measured zero latency')
    expect(performanceReportText(report)).toContain(inp!.failureReason)
    expect(performanceReportExitCode(report)).toBe(1)
  })

  test('preserves measured passing and over-budget outcomes', () => {
    const passing = reportFor([16, 24, 24, 24, 16])
    expect(performanceReportExitCode(passing)).toBe(0)
    expect(passing.profiles[0].budgets.find(budget => budget.name === 'Synthetic INP P75')?.failureReason).toBeUndefined()

    const slow = reportFor([240, 240, 240, 240, 240])
    expect(slow.profiles[0].budgets.find(budget => budget.name === 'Synthetic INP P75')).toMatchObject({ actual: 240, limit: 200, passed: false })
    expect(performanceReportExitCode(slow)).toBe(1)
  })
})
