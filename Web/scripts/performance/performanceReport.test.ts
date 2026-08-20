import { describe, expect, test } from 'vitest'
import {
  assertPerformanceReport,
  createInteractionReport,
  createSoakReport,
  cumulativeLayoutShift,
  interactionToNextPaint,
  percentile,
  performanceReportExitCode,
  type PerformanceEnvironment,
} from './performanceReport'

const environment: PerformanceEnvironment = {
  browser: 'Chromium',
  browserVersion: '1',
  platform: 'test',
  productionUrl: 'http://127.0.0.1/',
}

describe('performance report math', () => {
  test('uses deterministic nearest-rank percentiles', () => {
    expect(percentile([], 0.95)).toBe(0)
    expect(percentile([40, 10, 30, 20], 0.75)).toBe(30)
    expect(percentile([1, 2, 3, 4, 5], 0.95)).toBe(5)
    expect(() => percentile([1], 1.1)).toThrow(RangeError)
  })

  test('uses Web Vitals layout-shift session windows', () => {
    expect(
      cumulativeLayoutShift([
        { startTime: 0, value: 0.04, hadRecentInput: false },
        { startTime: 500, value: 0.03, hadRecentInput: false },
        { startTime: 1_700, value: 0.08, hadRecentInput: false },
        { startTime: 1_800, value: 1, hadRecentInput: true },
      ]),
    ).toBeCloseTo(0.08)
  })

  test('groups event entries by interaction and removes one outlier per fifty interactions', () => {
    const entries = Array.from({ length: 50 }, (_, index) => ({
      interactionId: index + 1,
      duration: index + 1,
    }))
    entries.push({ interactionId: 49, duration: 80 })
    expect(interactionToNextPaint(entries)).toBe(50)
  })
})

describe('performance report schema and gates', () => {
  test('summarizes interaction trials without making smoke acceptance-eligible', () => {
    const report = createInteractionReport({
      mode: 'smoke',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      traceDurationMilliseconds: 3_000,
      profiles: [
        {
          id: 'desktop',
          viewport: {
            width: 1_440,
            height: 900,
            deviceScaleFactor: 1,
          },
          cpuThrottleRate: 1,
          trials: [
            {
              trial: 1,
              consoleErrors: [],
              pageErrors: [],
              longTaskDurationsMilliseconds: [20, 49],
              commandFeedbackLatenciesMilliseconds: [10, 20],
              snapshotSelectionThroughReactCommit: [
                {
                  revision: { session: 1, state: 2 },
                  durationMilliseconds: 4,
                },
              ],
              interactionToNextPaintMilliseconds: 40,
              cumulativeLayoutShift: 0.01,
              largestContentfulPaintMilliseconds: 800,
            },
          ],
        },
      ],
    })
    expect(report.acceptanceEligible).toBe(false)
    expect(report.passed).toBe(true)
    expect(
      report.profiles[0]?.summaries.maximumLongTaskMilliseconds,
    ).toBe(49)
    expect(() => assertPerformanceReport(report)).not.toThrow()
    expect(performanceReportExitCode(report)).toBe(0)
  })

  test('requires commit samples and applies distinct desktop and mobile limits', () => {
    const trial = {
      trial: 1,
      consoleErrors: [] as readonly string[],
      pageErrors: [] as readonly string[],
      longTaskDurationsMilliseconds: [],
      commandFeedbackLatenciesMilliseconds: [1],
      interactionToNextPaintMilliseconds: 16,
      cumulativeLayoutShift: 0,
      largestContentfulPaintMilliseconds: 100,
    }
    const report = createInteractionReport({
      mode: 'smoke',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      traceDurationMilliseconds: 3_000,
      profiles: [
        {
          id: 'desktop',
          viewport: {
            width: 1_440,
            height: 900,
            deviceScaleFactor: 1,
          },
          cpuThrottleRate: 1,
          trials: [
            {
              ...trial,
              snapshotSelectionThroughReactCommit: [
                {
                  revision: { session: 1, state: 2 },
                  durationMilliseconds: 12,
                },
              ],
            },
          ],
        },
        {
          id: 'mobile',
          viewport: {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
          },
          cpuThrottleRate: 4,
          trials: [
            {
              ...trial,
              snapshotSelectionThroughReactCommit: [
                {
                  revision: { session: 1, state: 2 },
                  durationMilliseconds: 12,
                },
              ],
            },
          ],
        },
        {
          id: 'missing',
          viewport: {
            width: 1_440,
            height: 900,
            deviceScaleFactor: 1,
          },
          cpuThrottleRate: 1,
          trials: [
            {
              ...trial,
              snapshotSelectionThroughReactCommit: [],
            },
          ],
        },
      ],
    })
    const desktop = report.profiles[0]
    const mobile = report.profiles[1]
    const missing = report.profiles[2]
    expect(
      desktop?.budgets.find((budget) =>
        budget.name.startsWith('P95 snapshot'),
      ),
    ).toMatchObject({ limit: 8, passed: false })
    expect(
      mobile?.budgets.find((budget) =>
        budget.name.startsWith('P95 snapshot'),
      ),
    ).toMatchObject({ limit: 16, passed: true })
    expect(
      missing?.budgets.find((budget) =>
        budget.name.endsWith('commit samples'),
      ),
    ).toMatchObject({ actual: 0, passed: false })
    expect(report.passed).toBe(false)

    const partiallyMissing = createInteractionReport({
      mode: 'smoke',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      traceDurationMilliseconds: 3_000,
      profiles: [
        {
          id: 'partial',
          viewport: {
            width: 1_440,
            height: 900,
            deviceScaleFactor: 1,
          },
          cpuThrottleRate: 1,
          trials: [
            {
              ...trial,
              snapshotSelectionThroughReactCommit: [
                {
                  revision: { session: 1, state: 2 },
                  durationMilliseconds: 2,
                },
                {
                  revision: { session: 1, state: 3 },
                  durationMilliseconds: 2,
                },
              ],
            },
            {
              ...trial,
              trial: 2,
              snapshotSelectionThroughReactCommit: [],
            },
          ],
        },
      ],
    })
    expect(
      partiallyMissing.profiles[0]?.budgets.find((budget) =>
        budget.name.endsWith('commit samples'),
      ),
    ).toMatchObject({ actual: 1, limit: 2, passed: false })
  })

  test('applies the larger of ten MiB and twenty percent to retained heap', () => {
    const report = createSoakReport({
      mode: 'acceptance',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      durationMilliseconds: 30 * 60 * 1_000,
      warmupMilliseconds: 10_000,
      explicitGarbageCollections: 4,
      baseline: {
        heapUsedBytes: 100 * 1024 * 1024,
        resources: counts(10),
      },
      final: {
        heapUsedBytes: 119 * 1024 * 1024,
        resources: counts(10),
      },
      consoleErrors: [],
      pageErrors: [],
    })
    expect(report.retainedHeapAllowanceBytes).toBe(
      20 * 1024 * 1024,
    )
    expect(report.acceptanceEligible).toBe(true)
    expect(report.passed).toBe(true)
    expect(() => assertPerformanceReport(report)).not.toThrow()
    expect(performanceReportExitCode(report)).toBe(0)
  })

  test('fails interaction and soak reports when the browser emits errors', () => {
    const interaction = createInteractionReport({
      mode: 'smoke',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      traceDurationMilliseconds: 3_000,
      profiles: [{
        id: 'desktop',
        viewport: { width: 1_440, height: 900, deviceScaleFactor: 1 },
        cpuThrottleRate: 1,
        trials: [{
          trial: 1,
          consoleErrors: ['console failure'],
          pageErrors: [],
          longTaskDurationsMilliseconds: [],
          commandFeedbackLatenciesMilliseconds: [1],
          snapshotSelectionThroughReactCommit: [{
            revision: { session: 1, state: 1 },
            durationMilliseconds: 1,
          }],
          interactionToNextPaintMilliseconds: 16,
          cumulativeLayoutShift: 0,
          largestContentfulPaintMilliseconds: 100,
        }],
      }],
    })
    const soak = createSoakReport({
      mode: 'smoke',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      durationMilliseconds: 10_000,
      warmupMilliseconds: 1_000,
      explicitGarbageCollections: 4,
      baseline: { heapUsedBytes: 1, resources: counts(1) },
      final: { heapUsedBytes: 1, resources: counts(1) },
      consoleErrors: [],
      pageErrors: ['page failure'],
    })

    expect(interaction.passed).toBe(false)
    expect(soak.passed).toBe(false)
  })

  test('fails ineligible acceptance commands but permits explicit smoke diagnostics', () => {
    const acceptance = createSoakReport({
      mode: 'acceptance',
      createdAtUtc: '2026-01-01T00:00:00.000Z',
      environment,
      durationMilliseconds: 10_000,
      warmupMilliseconds: 1_000,
      explicitGarbageCollections: 4,
      baseline: {
        heapUsedBytes: 1,
        resources: counts(1),
      },
      final: {
        heapUsedBytes: 1,
        resources: counts(1),
      },
      consoleErrors: [],
      pageErrors: [],
    })
    const smoke = { ...acceptance, mode: 'smoke' as const }
    expect(acceptance.passed).toBe(true)
    expect(acceptance.acceptanceEligible).toBe(false)
    expect(performanceReportExitCode(acceptance)).toBe(1)
    expect(performanceReportExitCode(smoke)).toBe(0)
  })

  test('rejects incomplete report envelopes', () => {
    expect(() =>
      assertPerformanceReport({
        version: 1,
        kind: 'first-slice-interaction',
        mode: 'smoke',
      }),
    ).toThrow('envelope is incomplete')
  })
})

function counts(value: number) {
  return {
    documents: value,
    nodes: value,
    jsEventListeners: value,
    documentNodes: value,
    activeEventListeners: value,
    activeTimeouts: value,
    activeIntervals: value,
    activeAnimationFrames: value,
    activePointers: value,
    callbackSubscriptionSets: value,
    callbackSubscriptionMembers: value,
  }
}
