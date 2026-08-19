import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { execFileSync } from 'node:child_process'
import { CanonicalRuntimeSession } from '../../src/application/canonicalRuntimeSession'
import { prepareImportedSaveText } from '../../src/save/import'
import { createProductionEventContext } from '../../src/simulation/productionEventContext'
import type { SimulationStatisticsState } from '../../src/game-state/types'
import { StoredTimeSimulation } from '../../src/workers/storedTime/storedTimeSimulation'
import {
  loadCheckedInProgressionMatrixFixtures,
  MAXIMUM_PERSISTED_STORED_TIME_SECONDS,
} from '../../test/support/progressionMatrixFixtures'

const outputDirectory = resolve(import.meta.dirname, '..', '..', 'output', 'performance')
const webRoot = resolve(import.meta.dirname, '..', '..')
const fixture = loadCheckedInProgressionMatrixFixtures().find((candidate) => candidate.id === 'mature-infinity')!
const windows = [3_600, 86_400, 604_800, MAXIMUM_PERSISTED_STORED_TIME_SECONDS]
const results = []
for (const requestedSeconds of windows) results.push(runWindow(requestedSeconds))
const report = {
  schemaVersion: 1,
  scope: 'web-stored-time-worker-core',
  runIdentity: repositoryRunIdentity(),
  fixture: { id: fixture.id, fingerprint: fixture.fingerprint, saveSha256: fixture.saveSha256 },
  bounds: { stepBudgetMilliseconds: 12, wallCeilingMilliseconds: 120_000, turnCeiling: 1_000_000 },
  results,
}
mkdirSync(outputDirectory, { recursive: true })
const output = resolve(outputDirectory, 'stored-time-matrix.json')
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
console.log(`Report: ${output}`)

function repositoryRunIdentity() {
  return {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: webRoot, encoding: 'utf8' }).trim(),
    workingTreeDirty: execFileSync('git', ['status', '--porcelain'], { cwd: webRoot, encoding: 'utf8' }).trim().length > 0,
  }
}

function runWindow(requestedSeconds: number) {
  const prepared = prepareImportedSaveText(fixture.saveText, '2026-08-19T00:00:00.000Z')
  const session = new CanonicalRuntimeSession(prepared, { entitlements: { permanentDoubleIp: false } })
  const source = session.initialState
  const state = {
    ...source,
    gameState: {
      ...source.gameState,
      timeline: {
        ...source.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 1,
      },
    },
  }
  if (
    state.gameState.timeline.storedTimeAvailableSeconds >
      state.gameState.timeline.storedTimeCapacitySeconds ||
    requestedSeconds > state.gameState.timeline.storedTimeAvailableSeconds
  ) {
    throw new Error('Stored Time matrix input violates the persisted bank/capacity contract')
  }
  const sourceBefore = stableStringify(state)
  const excludedBefore = stableStringify({
    dream: state.gameState.dream,
    reality: state.gameState.reality,
    doubleTime: state.gameState.timeline.doubleTime,
  })
  const excludedStatisticsBefore = stableStringify(excludedStatistics(state.gameState.statistics))
  const wholeStartedAt = performance.now()
  const setupStartedAt = wholeStartedAt
  const simulation = new StoredTimeSimulation({
    jobId: `matrix-${requestedSeconds}`,
    state,
    requestedSeconds,
    infinityMinimumCycleSeconds: 1 / 60,
    eventContext: createProductionEventContext(),
  })
  const setupMilliseconds = performance.now() - setupStartedAt
  const startedAt = performance.now()
  let terminal = null
  let turns = 0
  while (terminal === null && turns < 1_000_000 && performance.now() - startedAt < 120_000) {
    terminal = simulation.step(12, false)
    turns += 1
  }
  const wallMilliseconds = performance.now() - startedAt
  if (terminal === null) throw new Error(`Stored Time benchmark ceiling reached for ${requestedSeconds} seconds`)
  if (terminal.type !== 'completed') throw new Error(`Stored Time unexpectedly ended as ${terminal.type} for ${requestedSeconds} seconds`)
  const excludedAfter = stableStringify({
    dream: terminal.candidate.gameState.dream,
    reality: terminal.candidate.gameState.reality,
    doubleTime: terminal.candidate.gameState.timeline.doubleTime,
  })
  const excludedStatisticsAfter = stableStringify(excludedStatistics(terminal.candidate.gameState.statistics))
  const commitStartedAt = performance.now()
  const committed = session.prepare(terminal.candidate)
  const reconstructed = new CanonicalRuntimeSession(committed, { entitlements: { permanentDoubleIp: false } }).initialState
  const commitAndReconstructionMilliseconds = performance.now() - commitStartedAt
  const wholeInProcessMilliseconds = performance.now() - wholeStartedAt
  const diagnostics = simulation.diagnostics()
  const cancellationSource = structuredClone(state)
  const cancellationSimulation = new StoredTimeSimulation({
    jobId: `cancel-${requestedSeconds}`, state: cancellationSource, requestedSeconds,
    infinityMinimumCycleSeconds: 1 / 60, eventContext: createProductionEventContext(),
  })
  cancellationSimulation.step(1, false)
  const cancellation = cancellationSimulation.step(12, true)
  const failureSource = structuredClone(state)
  const invalid = {
    ...failureSource,
    evaluationSnapshot: {
      ...failureSource.evaluationSnapshot,
      panelLifetimeSeconds: Number.NaN,
    },
  }
  const invalidBefore = stableStringify(invalid)
  const failure = new StoredTimeSimulation({
    jobId: `failure-${requestedSeconds}`, state: invalid, requestedSeconds,
    infinityMinimumCycleSeconds: 1 / 60, eventContext: createProductionEventContext(),
  }).step(12, false)
  const result = {
    requestedSeconds,
    status: 'completed',
    turns,
    setupMilliseconds,
    stepLoopMilliseconds: wallMilliseconds,
    commitAndReconstructionMilliseconds,
    wholeInProcessMilliseconds,
    consumedSeconds: terminal.consumedSeconds,
    remainingSeconds: terminal.remainingSeconds,
    bankBefore: state.gameState.timeline.storedTimeAvailableSeconds,
    capacityBefore: state.gameState.timeline.storedTimeCapacitySeconds,
    bankAfter: terminal.candidate.gameState.timeline.storedTimeAvailableSeconds,
    expectedBankAfter: state.gameState.timeline.storedTimeAvailableSeconds - requestedSeconds,
    capacityAfter: terminal.candidate.gameState.timeline.storedTimeCapacitySeconds,
    maximumChunkMilliseconds: terminal.progress.maximumChunkMilliseconds,
    excludedDreamRealityAndDoubleTimePreserved: excludedBefore === excludedAfter,
    excludedDomainStatisticsPreserved: excludedStatisticsBefore === excludedStatisticsAfter,
    reconstructionEqual: stableStringify(terminal.candidate.gameState) === stableStringify(reconstructed.gameState),
    fullRuntimeReconstructionEqual: stableStringify(terminal.candidate) === stableStringify(reconstructed),
    sourceUnchanged: sourceBefore === stableStringify(state),
    cancellationProgressed: cancellationSimulation.progress().computedSeconds > 0,
    cancellationPreservedSource: cancellation?.type === 'cancelled' && stableStringify(cancellationSource) === sourceBefore,
    failurePreservedSource: failure?.type === 'failed' && stableStringify(invalid) === invalidBefore,
    eventCounters: JSON.parse(stableStringify(diagnostics.summary)),
    policy: {
      executionKind: diagnostics.executionKind,
      representativeGroupCount: diagnostics.representativeGroupsPlanned,
      finalRemainderSeconds: diagnostics.finalRemainderPlannedSeconds,
      representativeGroupsCompleted: diagnostics.representativeGroupsCompleted,
      finalRemainderConsumedSeconds: diagnostics.finalRemainderConsumedSeconds,
    },
  }
  const required = [
    result.bankAfter === result.expectedBankAfter,
    result.capacityAfter === result.capacityBefore,
    result.excludedDreamRealityAndDoubleTimePreserved,
    result.excludedDomainStatisticsPreserved,
    result.reconstructionEqual,
    result.fullRuntimeReconstructionEqual,
    result.sourceUnchanged,
    result.cancellationProgressed,
    result.cancellationPreservedSource,
    result.failurePreservedSource,
  ]
  if (required.some((passed) => !passed)) {
    throw new Error(`Stored Time matrix invariant failed for ${requestedSeconds} seconds`)
  }
  return result
}

function excludedStatistics(statistics: Readonly<SimulationStatisticsState>) {
  const fields = ['meteorDreamResets', 'aiDreamResets', 'globalWarmingDreamResets', 'blackHoleDreamResets', 'strangeMatter', 'realityWorkers', 'automaticInfluence', 'manualInfluence', 'realityCapacityStallSeconds']
  const pick = (value: unknown) => Object.fromEntries(fields.map((field) => [field, (value as Record<string, unknown> | undefined)?.[field]]))
  const source = statistics as unknown as Record<string, unknown>
  return {
    lifetime: pick(source.lifetime), currentQuantumRun: pick(source.currentQuantumRun), recentProcessedSegment: pick(source.recentProcessedSegment),
    minuteWindows: (source.minuteWindows as unknown[]).map(pick), halfHourWindows: (source.halfHourWindows as unknown[]).map(pick), dailyWindows: (source.dailyWindows as unknown[]).map(pick),
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'bigint') return { $bigint: entry.toString() }
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    return entry
  })
}
