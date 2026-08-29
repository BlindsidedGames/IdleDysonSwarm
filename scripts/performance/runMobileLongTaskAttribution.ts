import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  interactFor,
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
} from './chromiumHarness'
import { importSaveThroughSettings } from './browserFixtureImport'
import { repositoryRunIdentity } from './reportArtifacts'
import { loadCheckedInProgressionMatrixFixtures } from '../support/progressionMatrixFixtures'

const webRoot = resolve(import.meta.dirname, '..', '..')
const fixture = loadCheckedInProgressionMatrixFixtures().find((candidate) => candidate.id === 'fresh')
if (fixture === undefined) throw new Error('Fresh fixture missing.')
const profile = {
  id: 'mobile-390x844-throttled',
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  cpuThrottleRate: 4,
} as const
const trialCount = Number(argumentValue('--trials=') ?? 5)
const durationMilliseconds = Number(argumentValue('--duration-ms=') ?? 30_000)
const cpuProfilerEnabled = process.argv.includes('--cpu-profiler')
const preview = await startProductionPreview(webRoot, 4_227, 'output/performance/lane-dist')
const trials = []
try {
  for (let trial = 1; trial <= trialCount; trial += 1) {
    console.error(`[long-task] mobile trial ${trial}/${trialCount}`)
    const page = await openChromiumPage(profile, preview.url)
    const errors: string[] = []
    page.cdp.on<{ exceptionDetails?: { text?: string; exception?: { description?: string } } }>(
      'Runtime.exceptionThrown',
      (event) => errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Unknown exception'),
    )
    try {
      await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          const samples = new Map()
          globalThis.__idleDysonLaneProbeV1 = {
            record(name, duration) {
              const lane = samples.get(name) ?? []
              const endTime = performance.now()
              lane.push({ duration, startTime: endTime - duration, endTime })
              samples.set(name, lane)
            },
            reset() { samples.clear() },
            read() { return Object.fromEntries(samples) },
          }
        })()`,
      })
      await page.navigate(preview.url)
      await importSaveThroughSettings(page, fixture)
      await page.resetInteractionMeasurements()
      await page.warmFirstSliceCommitProbe()
      await page.resetInteractionMeasurements()
      await page.evaluate(`globalThis.__idleDysonLaneProbeV1.reset()`)
      await page.cdp.send('Performance.enable')
      const before = await readMetrics(page)
      if (cpuProfilerEnabled) {
        await page.cdp.send('Profiler.enable')
        await page.cdp.send('Profiler.start')
      }
      const traceStartedAt = await page.evaluate<number>('performance.now()')
      const activations = await interactFor(page, durationMilliseconds)
      const traceEndedAt = await page.evaluate<number>('performance.now()')
      // Read observer entries before CDP metric/profile teardown. Profiler.stop
      // itself can create a post-trace long task and must not be attributed to
      // the game interaction window.
      const entries = await page.readPerformanceEntries()
      const after = await readMetrics(page)
      const profileResult = cpuProfilerEnabled
        ? await page.cdp.send<CpuProfileResult>('Profiler.stop')
        : undefined
      const lanes = await page.evaluate<Record<string, LaneSample[]>>(`globalThis.__idleDysonLaneProbeV1.read()`)
      trials.push({
        trial,
        activations,
        traceStartedAt,
        traceEndedAt,
        longTasks: entries.longTasks.map((longTask) => ({
          ...longTask,
          nearbyEvents: entries.events.filter((event) => overlaps(longTask, event, 25)),
          nearbyReactCommits: entries.snapshotSelectionThroughReactCommit.filter((commit) => overlaps(longTask, commit, 25)),
        })),
        mainThread: metricDelta(before, after),
        lanes: Object.fromEntries(Object.entries(lanes).map(([name, values]) => [name, {
          ...summarize(values.map((value) => value.duration)),
          samples: values,
          longTaskOverlaps: entries.longTasks.flatMap((longTask) =>
            values.filter((value) => overlaps(longTask, value, 10)).map((value) => ({ longTask, sample: value }))),
        }])),
        profiler: profileResult === undefined ? null : summarizeProfile(profileResult.profile),
        pageErrors: errors,
      })
    } finally {
      await page.close()
    }
  }
} finally {
  await preview.stop()
}

const report = {
  schemaVersion: 1,
  purpose: 'attribute isolated mobile long tasks observed by the acceptance interaction trace',
  fixture: { id: fixture.id, fingerprint: fixture.fingerprint, saveSha256: fixture.saveSha256 },
  runIdentity: repositoryRunIdentity(webRoot),
  profile,
  trialCount,
  durationMilliseconds,
  cpuProfilerEnabled,
  trials,
}
const output = resolve(webRoot, 'output', 'performance', 'mobile-long-task-attribution.json')
mkdirSync(resolve(output, '..'), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  output,
  trials: trials.map((trial) => ({
    trial: trial.trial,
    longTasks: trial.longTasks,
    mainThread: trial.mainThread,
    traceStartedAt: trial.traceStartedAt,
    traceEndedAt: trial.traceEndedAt,
    garbageCollectorSamples: trial.profiler?.garbageCollectorSamples,
    topFunctions: trial.profiler?.topFunctions.slice(0, 5),
    pageErrors: trial.pageErrors,
  })),
}, null, 2))

interface CpuProfileResult {
  readonly profile: {
    readonly nodes: readonly {
      readonly id: number
      readonly hitCount?: number
      readonly callFrame: {
        readonly functionName: string
        readonly url: string
        readonly lineNumber: number
        readonly columnNumber: number
      }
    }[]
  }
}

interface LaneSample {
  readonly duration: number
  readonly startTime: number
  readonly endTime: number
}

function overlaps(
  left: { readonly startTime: number; readonly duration: number },
  right: { readonly startTime: number; readonly duration?: number; readonly endTime?: number },
  margin: number,
): boolean {
  const leftEnd = left.startTime + left.duration
  const rightEnd = right.endTime ?? right.startTime + (right.duration ?? 0)
  return right.startTime <= leftEnd + margin && rightEnd >= left.startTime - margin
}

async function readMetrics(page: ChromiumPage): Promise<Record<string, number>> {
  const result = await page.cdp.send<{ metrics: readonly { name: string; value: number }[] }>('Performance.getMetrics')
  return Object.fromEntries(result.metrics.map((metric) => [metric.name, metric.value]))
}

function metricDelta(before: Record<string, number>, after: Record<string, number>) {
  return Object.fromEntries([
    'TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration',
    'V8CompileDuration', 'ThreadTime', 'JSHeapUsedSize',
  ].map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]))
}

function summarize(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    count: sorted.length,
    totalMilliseconds: total,
    p95Milliseconds: sorted.length === 0 ? 0 : sorted[Math.ceil(sorted.length * 0.95) - 1],
    maximumMilliseconds: sorted.at(-1) ?? 0,
  }
}

function summarizeProfile(profile: CpuProfileResult['profile']) {
  const sampled = profile.nodes
    .filter((node) => (node.hitCount ?? 0) > 0)
    .map((node) => ({ hits: node.hitCount ?? 0, ...node.callFrame }))
    .sort((left, right) => right.hits - left.hits)
  return {
    garbageCollectorSamples: sampled
      .filter((node) => node.functionName === '(garbage collector)')
      .reduce((sum, node) => sum + node.hits, 0),
    idleSamples: sampled
      .filter((node) => node.functionName === '(idle)')
      .reduce((sum, node) => sum + node.hits, 0),
    topFunctions: sampled.slice(0, 20),
  }
}

function argumentValue(prefix: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}
