import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import {
  CanonicalRuntimeSession,
  type CanonicalRuntimeState,
} from '../../src/application/canonicalRuntimeSession'
import type {
  CanonicalGameStateV1,
  StoredTimeAccuracyPreset,
} from '../../src/game-state/types'
import { prepareImportedSaveText } from '../../src/save/import'
import { deriveBasicDysonState } from '../../src/simulation/canonicalDysonDerivation'
import { advanceGame } from '../../src/simulation/gameStep'
import { createBasicDysonInfinityState, infinityPointsForBots } from '../../src/simulation/infinityCycle'
import { createProductionEventContext } from '../../src/simulation/productionEventContext'
import {
  planStoredTimePolicy,
  STORED_TIME_PRESET_MAXIMUM_TICKS,
} from '../../src/simulation/storedTimePolicy'
import type { SimulationPresentationSummary } from '../../src/simulation/types'
import { StoredTimeSimulation } from '../../src/workers/storedTime/storedTimeSimulation'
import type { StoredTimeJobProgress } from '../../src/workers/storedTime/storedTimeProtocol'
import { createDeterministicMatureDysonFixture } from '../support/deterministicMatureDysonFixture'
import {
  loadCheckedInProgressionMatrixFixtures,
  MAXIMUM_PERSISTED_STORED_TIME_SECONDS,
  type ProgressionMatrixFixture,
} from '../support/progressionMatrixFixtures'

const webRoot = resolve(import.meta.dirname, '..', '..')
const outputDirectory = resolve(webRoot, 'output', 'performance')
const smoke = process.argv.includes('--smoke')
const runCeilingMilliseconds = 5 * 60 * 1_000
const processingChunkMilliseconds = 10
const predictionSafetyMultiplier = 1.25
const durations = smoke ? [600] : [600, 3_600, 86_400]
const presets = ['fast', 'balanced', 'accurate'] as const
const context = createProductionEventContext()
const checkedInFixtures = loadCheckedInProgressionMatrixFixtures()

type AutomationConfiguration = Readonly<{
  id: 'off' | 'ordinary-on' | 'below-target' | 'near-target' | 'above-target'
  enabled: boolean
  targetRelationship: 'not-applicable' | 'below-calibrated-peak' | 'at-calibrated-peak' | 'above-calibrated-peak'
}>

interface StageDefinition {
  readonly id:
    | 'pre-infinity'
    | 'mature-infinity-before-break'
    | 'post-break-late-game'
    | 'maximum-skills'
    | 'purity-line-only'
  readonly description: string
  readonly source: string
  readonly baseState: CanonicalRuntimeState
  readonly breakInfinity: boolean
  readonly calibratedPeakReward: bigint
  readonly ownedSkillCount: number
  readonly ownedSkillIds: readonly string[]
  readonly fingerprint: string
}

interface OutputSnapshot {
  readonly infinityPoints: string
  readonly money: number
  readonly science: number
  readonly bots: number
  readonly workers: number
  readonly researchers: number
  readonly dreamStrangeMatter: string
  readonly realityInfluence: string
  readonly avocadoInfinityPoints: number
  readonly avocadoInfluence: number
}

interface CompletedExecution {
  readonly executionId: string
  readonly status: 'completed'
  readonly tickCount: number
  readonly representedPresets: readonly StoredTimeAccuracyPreset[]
  readonly representativePreset: StoredTimeAccuracyPreset
  readonly requestedSeconds: number
  readonly stepSeconds: number
  readonly setupMilliseconds: number
  readonly wallMilliseconds: number
  readonly wholeMilliseconds: number
  readonly workerTurns: number
  readonly ticksPerSecond: number
  readonly maximumChunkMilliseconds: number
  readonly bank: {
    readonly beforeSeconds: number
    readonly consumedSeconds: number
    readonly afterSeconds: number
    readonly expectedAfterSeconds: number
    readonly conserved: boolean
  }
  readonly gameTime: {
    readonly speed: number
    readonly expectedAdvancedSeconds: number
    readonly observedAdvancedSeconds: number
    readonly deltaSeconds: number
  }
  readonly resetsAndIp: {
    readonly infinityPointsBefore: string
    readonly infinityPointsAfter: string
    readonly infinityPointsGained: string
    readonly ordinaryInfinityCount: string
    readonly breakInfinityCount: string
    readonly ordinaryInfinityPoints: string
    readonly breakInfinityPoints: string
    readonly botCapInfinityPoints: string
  }
  readonly resources: {
    readonly before: OutputSnapshot
    readonly after: OutputSnapshot
  }
  readonly summary: Readonly<Record<string, string | number>>
  accuracyAgainstFinestAffordable?: AccuracyDelta
  accuracyAgainstFineStep?: FineStepAccuracyDelta
}

interface InappropriateExecution {
  readonly executionId: string
  readonly status: 'inappropriate'
  readonly tickCount: number
  readonly representedPresets: readonly StoredTimeAccuracyPreset[]
  readonly representativePreset: StoredTimeAccuracyPreset
  readonly requestedSeconds: number
  readonly reason: 'predicted-over-five-minutes' | 'observed-five-minute-ceiling'
  readonly predictedMilliseconds: number | null
  readonly observedMilliseconds: number
  readonly partialProgress?: StoredTimeJobProgress
}

type Execution = CompletedExecution | InappropriateExecution

interface AccuracyDelta {
  readonly referenceExecutionId: string
  readonly infinityPointsGainedRelative: number | null
  readonly ordinaryInfinityCountRelative: number | null
  readonly breakInfinityCountRelative: number | null
  readonly moneyAfterRelative: number | null
  readonly scienceAfterRelative: number | null
  readonly botsAfterRelative: number | null
  readonly dreamStrangeMatterAfterRelative: number | null
  readonly realityInfluenceAfterRelative: number | null
}

interface FineStepAccuracyDelta {
  readonly referenceTickCount: number
  readonly infinityPointsGainedRelative: number | null
  readonly moneyAfterRelative: number | null
  readonly scienceAfterRelative: number | null
  readonly botsAfterRelative: number | null
  readonly dreamStrangeMatterAfterRelative: number | null
  readonly realityInfluenceAfterRelative: number | null
}

interface FineStepReference {
  readonly basis: 'stored-time shared step at the stage active-play cadence'
  readonly tickCount: number
  readonly stepSeconds: number
  readonly wallMilliseconds: number
  readonly infinityPointsGained: string
  readonly after: OutputSnapshot
}

const stageDefinitions = createStages()
const selectedStages = smoke
  ? stageDefinitions.filter((stage) => stage.id === 'pre-infinity' || stage.id === 'post-break-late-game')
  : stageDefinitions

const cases = []
for (const stage of selectedStages) {
  const configurations = smoke
    ? automationConfigurations(stage).filter((configuration) =>
        stage.id === 'pre-infinity'
          ? configuration.id === 'off'
          : configuration.id === 'near-target')
    : automationConfigurations(stage)
  for (const automation of configurations) {
    for (const requestedSeconds of durations) {
      cases.push(runCase(stage, automation, requestedSeconds))
    }
  }
}

const report = {
  schemaVersion: 2,
  kind: 'ad-style-shared-step-stored-time-matrix',
  scope: smoke ? 'smoke' : 'full',
  generatedAt: new Date().toISOString(),
  runIdentity: repositoryRunIdentity(),
  contract: {
    engine: 'StoredTimeSimulation -> advanceGame shared gameplay step',
    durationsSeconds: durations,
    nominalStepSeconds: 0.05,
    presetMaximumTicks: STORED_TIME_PRESET_MAXIMUM_TICKS,
    perSimulationCeilingMilliseconds: runCeilingMilliseconds,
    processingChunkMilliseconds,
    predictionSafetyMultiplier,
    accuracyReference: 'highest tick-count execution that completed within the per-simulation ceiling',
    fineStepSentinels: 'ten-minute cases also compare against Stored Time shared steps at the stage active-play cadence',
    timingScope: 'synchronous simulation-core timing; worker messaging, yielding, and candidate persistence are excluded',
    duplicatePolicy: 'presets with the same planned tick count share one execution',
  },
  coverageNotes: [
    'Pre-Infinity is Auto Infinity off because automatic Infinity is not yet a player-reachable setting.',
    'Before Break, Auto Infinity target values do not affect the ordinary fixed reset threshold.',
    'Break targets are relative to the best achievable active-play IP/min reward observed during a deterministic ten-minute calibration at the stage\'s configured active cadence.',
    'Purity-line-only includes Manual Labour, the authored gateway, plus all three Purity skills.',
    'Tinker remains frozen in Stored Time by the approved processing contract.',
  ],
  stages: selectedStages.map(stageMetadata),
  cases,
  totals: summarizeCases(cases),
}

mkdirSync(outputDirectory, { recursive: true })
const output = resolve(
  outputDirectory,
  smoke ? 'stored-time-matrix-smoke.json' : 'stored-time-matrix.json',
)
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
printSummary(report.cases, output)

function createStages(): readonly StageDefinition[] {
  const midSwarm = fixtureById('mid-swarm')
  const matureInfinity = fixtureById('mature-infinity')
  const maximumSkills = fixtureById('maximum-skills')
  return Object.freeze([
    stageFromFixture(
      'pre-infinity',
      'Pre-Infinity run with every basic Dyson facility visible.',
      midSwarm,
    ),
    stageFromFixture(
      'mature-infinity-before-break',
      'Mature ordinary-Infinity economy before Break The Loop.',
      matureInfinity,
    ),
    syntheticLateGameStage(
      'post-break-late-game',
      'Post-Break late-game economy with no Skills purchased.',
      maximumSkills,
      [],
    ),
    syntheticLateGameStage(
      'maximum-skills',
      'Post-Break late-game economy with every deterministic non-conflicting Skill purchased.',
      maximumSkills,
      'maximum-canonical',
    ),
    syntheticLateGameStage(
      'purity-line-only',
      'Post-Break late-game economy with only the Purity branch and its gateway purchased.',
      maximumSkills,
      ['manualLabour', 'purityOfMind', 'purityOfBody', 'purityOfSEssence'],
    ),
  ])
}

function stageFromFixture(
  id: StageDefinition['id'],
  description: string,
  fixture: ProgressionMatrixFixture,
): StageDefinition {
  const baseState = runtimeFromFixture(fixture)
  return finishStage({
    id,
    description,
    source: `checked-in progression fixture:${fixture.id}`,
    baseState,
    breakInfinity: baseState.gameState.quantum.unlocks.breakTheLoop,
    ownedSkillCount: ownedSkillIds(baseState.gameState).length,
    ownedSkillIds: Object.freeze(ownedSkillIds(baseState.gameState)),
    fingerprint: fixture.fingerprint,
  })
}

function syntheticLateGameStage(
  id: StageDefinition['id'],
  description: string,
  shellFixture: ProgressionMatrixFixture,
  skillIds: readonly string[] | 'maximum-canonical',
): StageDefinition {
  const shell = runtimeFromFixture(shellFixture)
  const gameState = createDeterministicMatureDysonFixture({
    ownedSkillIds: skillIds === 'maximum-canonical' ? [] : skillIds,
  })
  const adjustedGameState = skillIds === 'maximum-canonical'
    ? {
        ...gameState,
        skills: structuredClone(shell.gameState.skills),
      }
    : {
        ...gameState,
        skills: {
          ...gameState.skills,
          points: 200n - BigInt(skillIds.length === 0 ? 0 : 7),
        },
      }
  const baseState = refreshEvaluationSnapshot({ ...shell, gameState: adjustedGameState })
  const skills = ownedSkillIds(baseState.gameState)
  return finishStage({
    id,
    description,
    source: `deterministic late-game state using ${shellFixture.id} runtime compatibility data`,
    baseState,
    breakInfinity: baseState.gameState.quantum.unlocks.breakTheLoop,
    ownedSkillCount: skills.length,
    ownedSkillIds: Object.freeze(skills),
    fingerprint: createHash('sha256').update(stableStringify(baseState.gameState)).digest('hex'),
  })
}

function finishStage(
  stage: Omit<StageDefinition, 'calibratedPeakReward'>,
): StageDefinition {
  return Object.freeze({
    ...stage,
    calibratedPeakReward: stage.breakInfinity
      ? calibratePeakReward(stage.baseState)
      : 0n,
  })
}

function calibratePeakReward(source: CanonicalRuntimeState): bigint {
  const stepSeconds =
    source.gameState.timeline.processing.activeIntervalMilliseconds / 1_000
  let state: CanonicalRuntimeState = {
    ...structuredClone(source),
    gameState: {
      ...structuredClone(source.gameState),
      infinity: {
        ...structuredClone(source.gameState.infinity),
        automaticResetEnabled: false,
        currentCyclePeakIpPerMinute: 0,
        currentCyclePeakReward: 0n,
      },
    },
  }
  const calibrationSteps = Math.ceil(600 / stepSeconds)
  for (let step = 0; step < calibrationSteps; step += 1) {
    const advanced = advanceGame(
      state,
      { source: 'active', baseSeconds: stepSeconds, automation: 'enabled' },
      context,
      1 / 60,
    )
    if (advanced.issue !== undefined || advanced.botCapPersistenceRequired) {
      throw new Error(
        `Peak calibration could not advance ${source.gameState.timeline.processing.activeIntervalMilliseconds} ms: ${advanced.issue ?? 'bot-cap persistence required'}`,
      )
    }
    state = advanced.state
  }
  const peak = state.gameState.infinity.currentCyclePeakReward ?? 0n
  return peak > 0n ? peak : breakRewardAtStart(source)
}

function refreshEvaluationSnapshot(state: CanonicalRuntimeState): CanonicalRuntimeState {
  let evaluationSnapshot = state.evaluationSnapshot
  for (let pass = 0; pass < 8; pass += 1) {
    const derived = deriveBasicDysonState(
      state.gameState,
      state.compatibilityTuning,
      state.entitlements,
      evaluationSnapshot,
      context.dysonPresentationTuning,
    )
    if (!derived.ok) {
      throw new Error(`Synthetic stage derivation failed: ${derived.issues[0]?.detail ?? 'unknown issue'}`)
    }
    const next = derived.value.nextEvaluationSnapshot
    if (stableStringify(next) === stableStringify(evaluationSnapshot)) break
    evaluationSnapshot = next
  }
  return { ...state, evaluationSnapshot }
}

function automationConfigurations(stage: StageDefinition): readonly AutomationConfiguration[] {
  if (stage.id === 'pre-infinity') {
    return [{ id: 'off', enabled: false, targetRelationship: 'not-applicable' }]
  }
  if (!stage.breakInfinity) {
    return [
      { id: 'off', enabled: false, targetRelationship: 'not-applicable' },
      { id: 'ordinary-on', enabled: true, targetRelationship: 'not-applicable' },
    ]
  }
  return [
    { id: 'off', enabled: false, targetRelationship: 'not-applicable' },
    { id: 'below-target', enabled: true, targetRelationship: 'below-calibrated-peak' },
    { id: 'near-target', enabled: true, targetRelationship: 'at-calibrated-peak' },
    { id: 'above-target', enabled: true, targetRelationship: 'above-calibrated-peak' },
  ]
}

function runCase(
  stage: StageDefinition,
  automation: AutomationConfiguration,
  requestedSeconds: number,
) {
  const startingReward = breakRewardAtStart(stage.baseState)
  const breakTarget = targetForConfiguration(
    automation,
    stage.calibratedPeakReward,
  )
  const plans = Object.fromEntries(presets.map((preset) => {
    const plan = planStoredTimePolicy({ requestedSeconds, preset })
    return [preset, { plannedTicks: plan.plannedTicks, stepSeconds: plan.initialStepSeconds }]
  })) as Record<StoredTimeAccuracyPreset, { plannedTicks: number; stepSeconds: number }>
  const grouped = new Map<number, StoredTimeAccuracyPreset[]>()
  for (const preset of presets) {
    const ticks = plans[preset].plannedTicks
    grouped.set(ticks, [...(grouped.get(ticks) ?? []), preset])
  }

  const executions: Execution[] = []
  let conservativeTicksPerSecond: number | null = null
  for (const [tickCount, representedPresets] of [...grouped.entries()].sort(([left], [right]) => left - right)) {
    const representativePreset = representedPresets[0]
    const predictedMilliseconds = conservativeTicksPerSecond === null
      ? null
      : tickCount / conservativeTicksPerSecond * 1_000 * predictionSafetyMultiplier
    const executionId = `${stage.id}:${automation.id}:${requestedSeconds}:${tickCount}`
    if (predictedMilliseconds !== null && predictedMilliseconds >= runCeilingMilliseconds) {
      executions.push({
        executionId,
        status: 'inappropriate',
        tickCount,
        representedPresets,
        representativePreset,
        requestedSeconds,
        reason: 'predicted-over-five-minutes',
        predictedMilliseconds,
        observedMilliseconds: 0,
      })
      continue
    }
    const execution = runExecution({
      executionId,
      stage,
      automation,
      breakTarget,
      requestedSeconds,
      tickCount,
      representedPresets,
      representativePreset,
      predictedMilliseconds,
    })
    executions.push(execution)
    const measuredThroughput = execution.status === 'completed'
      ? execution.ticksPerSecond
      : execution.partialProgress?.ticksPerSecond ?? 0
    if (measuredThroughput > 0) {
      conservativeTicksPerSecond = conservativeTicksPerSecond === null
        ? measuredThroughput
        : Math.min(conservativeTicksPerSecond, measuredThroughput)
    }
  }

  const completed = executions.filter((execution): execution is CompletedExecution => execution.status === 'completed')
  const reference = completed.at(-1)
  if (reference !== undefined) {
    for (const execution of completed) {
      execution.accuracyAgainstFinestAffordable = accuracyDelta(execution, reference)
    }
  }
  const fineStepReference = requestedSeconds === 600
    ? runFineStepReference({
        stage,
        automation,
        breakTarget,
        requestedSeconds,
      })
    : null
  if (fineStepReference !== null) {
    for (const execution of completed) {
      execution.accuracyAgainstFineStep = fineStepAccuracyDelta(
        execution,
        fineStepReference,
      )
    }
  }
  const executionByTicks = new Map(executions.map((execution) => [execution.tickCount, execution]))
  return {
    caseId: `${stage.id}:${automation.id}:${requestedSeconds}`,
    stageId: stage.id,
    automation: {
      ...automation,
      startingReward: startingReward.toString(),
      calibratedPeakReward: stage.calibratedPeakReward.toString(),
      calibrationActiveSeconds: stage.breakInfinity ? 600 : 0,
      configuredTarget: breakTarget.toString(),
    },
    requestedSeconds,
    presets: Object.fromEntries(presets.map((preset) => {
      const plan = plans[preset]
      return [preset, { ...plan, executionId: executionByTicks.get(plan.plannedTicks)?.executionId }]
    })),
    finestAffordableExecutionId: reference?.executionId ?? null,
    fineStepReference,
    executions,
  }
}

function runFineStepReference(input: {
  readonly stage: StageDefinition
  readonly automation: AutomationConfiguration
  readonly breakTarget: bigint
  readonly requestedSeconds: number
}): FineStepReference {
  let state = stateForExecution({
    ...input,
    representativePreset: 'accurate',
  })
  const pointsBefore = state.gameState.infinity.points
  const activeStepSeconds =
    state.gameState.timeline.processing.activeIntervalMilliseconds / 1_000
  const tickCount = Math.ceil(input.requestedSeconds / activeStepSeconds)
  const stepSeconds = input.requestedSeconds / tickCount
  const startedAt = performance.now()
  for (let tick = 0; tick < tickCount; tick += 1) {
    if (performance.now() - startedAt >= runCeilingMilliseconds) {
      throw new Error(
        `${input.stage.id}:${input.automation.id}: fine-step sentinel exceeded five minutes`,
      )
    }
    const advanced = advanceGame(
      state,
      {
        source: 'stored-time',
        baseSeconds: stepSeconds,
        automation: 'enabled',
      },
      context,
      1 / 60,
    )
    if (advanced.issue !== undefined || advanced.botCapPersistenceRequired) {
      throw new Error(
        `${input.stage.id}:${input.automation.id}: fine-step sentinel failed: ${advanced.issue ?? 'bot-cap persistence required'}`,
      )
    }
    state = advanced.state
  }
  return {
    basis: 'stored-time shared step at the stage active-play cadence',
    tickCount,
    stepSeconds,
    wallMilliseconds: performance.now() - startedAt,
    infinityPointsGained: (
      state.gameState.infinity.points - pointsBefore
    ).toString(),
    after: outputSnapshot(state.gameState),
  }
}

function runExecution(input: {
  readonly executionId: string
  readonly stage: StageDefinition
  readonly automation: AutomationConfiguration
  readonly breakTarget: bigint
  readonly requestedSeconds: number
  readonly tickCount: number
  readonly representedPresets: readonly StoredTimeAccuracyPreset[]
  readonly representativePreset: StoredTimeAccuracyPreset
  readonly predictedMilliseconds: number | null
}): Execution {
  const wholeStartedAt = performance.now()
  const state = stateForExecution(input)
  const before = outputSnapshot(state.gameState)
  const bankBefore = state.gameState.timeline.storedTimeAvailableSeconds
  const statisticsBefore = state.gameState.statistics.lifetime.simulatedSeconds
  const pointsBefore = state.gameState.infinity.points
  const setupStartedAt = performance.now()
  const simulation = new StoredTimeSimulation({
    jobId: input.executionId,
    state,
    requestedSeconds: input.requestedSeconds,
    infinityMinimumCycleSeconds: 1 / 60,
    eventContext: context,
  })
  const setupMilliseconds = performance.now() - setupStartedAt
  const startedAt = performance.now()
  let terminal = null
  let turns = 0
  while (terminal === null) {
    const remainingBudgetMilliseconds = runCeilingMilliseconds - (performance.now() - startedAt)
    if (remainingBudgetMilliseconds <= 0) break
    terminal = simulation.step(
      Math.min(processingChunkMilliseconds, remainingBudgetMilliseconds),
      false,
    )
    turns += 1
  }
  const wallMilliseconds = performance.now() - startedAt
  if (terminal === null) {
    return {
      executionId: input.executionId,
      status: 'inappropriate',
      tickCount: input.tickCount,
      representedPresets: input.representedPresets,
      representativePreset: input.representativePreset,
      requestedSeconds: input.requestedSeconds,
      reason: 'observed-five-minute-ceiling',
      predictedMilliseconds: input.predictedMilliseconds,
      observedMilliseconds: wallMilliseconds,
      partialProgress: simulation.progress(),
    }
  }
  if (terminal.type !== 'completed') {
    throw new Error(`${input.executionId}: Stored Time ended as ${terminal.type}`)
  }
  const diagnostics = simulation.diagnostics()
  if (diagnostics.initialTicks !== input.tickCount || terminal.progress.completedTicks !== input.tickCount) {
    throw new Error(`${input.executionId}: planned/executed tick count drifted`)
  }
  const candidate = terminal.candidate
  const bankAfter = candidate.gameState.timeline.storedTimeAvailableSeconds
  const expectedBankAfter = bankBefore - input.requestedSeconds
  const observedGameSeconds = candidate.gameState.statistics.lifetime.simulatedSeconds - statisticsBefore
  const gameSpeed = candidate.gameState.timeline.doubleTime.unlocked ? 2 : 1
  const expectedGameSeconds = input.requestedSeconds * gameSpeed
  const wholeMilliseconds = performance.now() - wholeStartedAt
  return {
    executionId: input.executionId,
    status: 'completed',
    tickCount: input.tickCount,
    representedPresets: input.representedPresets,
    representativePreset: input.representativePreset,
    requestedSeconds: input.requestedSeconds,
    stepSeconds: input.requestedSeconds / input.tickCount,
    setupMilliseconds,
    wallMilliseconds,
    wholeMilliseconds,
    workerTurns: turns,
    ticksPerSecond: input.tickCount / Math.max(wallMilliseconds / 1_000, Number.EPSILON),
    maximumChunkMilliseconds: terminal.progress.maximumChunkMilliseconds,
    bank: {
      beforeSeconds: bankBefore,
      consumedSeconds: terminal.consumedSeconds,
      afterSeconds: bankAfter,
      expectedAfterSeconds: expectedBankAfter,
      conserved: approximatelyEqual(bankAfter, expectedBankAfter),
    },
    gameTime: {
      speed: gameSpeed,
      expectedAdvancedSeconds: expectedGameSeconds,
      observedAdvancedSeconds: observedGameSeconds,
      deltaSeconds: observedGameSeconds - expectedGameSeconds,
    },
    resetsAndIp: {
      infinityPointsBefore: pointsBefore.toString(),
      infinityPointsAfter: candidate.gameState.infinity.points.toString(),
      infinityPointsGained: (candidate.gameState.infinity.points - pointsBefore).toString(),
      ordinaryInfinityCount: diagnostics.summary.ordinaryInfinityCount.toString(),
      breakInfinityCount: diagnostics.summary.breakInfinityCount.toString(),
      ordinaryInfinityPoints: diagnostics.summary.ordinaryInfinityPoints.toString(),
      breakInfinityPoints: diagnostics.summary.breakInfinityPoints.toString(),
      botCapInfinityPoints: diagnostics.summary.botCapInfinityPoints.toString(),
    },
    resources: { before, after: outputSnapshot(candidate.gameState) },
    summary: summaryOutput(diagnostics.summary),
  }
}

function stateForExecution(input: {
  readonly stage: StageDefinition
  readonly automation: AutomationConfiguration
  readonly breakTarget: bigint
  readonly requestedSeconds: number
  readonly representativePreset: StoredTimeAccuracyPreset
}): CanonicalRuntimeState {
  const source = structuredClone(input.stage.baseState)
  const capacity = Math.max(input.requestedSeconds, source.gameState.timeline.storedTimeCapacitySeconds)
  if (capacity > MAXIMUM_PERSISTED_STORED_TIME_SECONDS) {
    throw new Error('Benchmark request exceeds the persisted Stored Time capacity contract')
  }
  return {
    ...source,
    gameState: {
      ...source.gameState,
      infinity: {
        ...source.gameState.infinity,
        automaticResetEnabled: input.automation.enabled,
        breakTarget: input.breakTarget,
      },
      timeline: {
        ...source.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.1,
        storedTimeAvailableSeconds: capacity,
        storedTimeCapacitySeconds: capacity,
        processing: {
          ...source.gameState.timeline.processing,
          storedTimePreset: input.representativePreset,
        },
      },
    },
  }
}

function breakRewardAtStart(state: CanonicalRuntimeState): bigint {
  if (!state.gameState.quantum.unlocks.breakTheLoop) return 1n
  return infinityPointsForBots(
    state.gameState.dyson.bots,
    createBasicDysonInfinityState({
      points: state.gameState.infinity.points,
      permanentSkillPoints: state.gameState.infinity.permanentSkillPoints,
      breakTheLoop: true,
      divisionsPurchased: state.gameState.quantum.divisionsPurchased,
      breakTarget: state.gameState.infinity.breakTarget,
      permanentDoubleIp: state.entitlements.permanentDoubleIp,
      quantumDoubleIp: state.gameState.quantum.unlocks.doubleInfinityPoints,
      secondsInCurrentCycle: state.gameState.timeline.infinityCycleSeconds,
    }),
  )
}

function targetForConfiguration(configuration: AutomationConfiguration, peakReward: bigint): bigint {
  const reward = peakReward > 0n ? peakReward : 1n
  switch (configuration.targetRelationship) {
    case 'below-calibrated-peak': return reward > 1n ? reward / 4n : 1n
    case 'at-calibrated-peak': return reward
    case 'above-calibrated-peak': return reward * 5n
    case 'not-applicable': return 1n
  }
}

function outputSnapshot(state: CanonicalGameStateV1): OutputSnapshot {
  return {
    infinityPoints: state.infinity.points.toString(),
    money: state.dyson.money,
    science: state.dyson.science,
    bots: state.dyson.bots,
    workers: state.dyson.workers,
    researchers: state.dyson.researchers,
    dreamStrangeMatter: state.dream.strangeMatter.toString(),
    realityInfluence: state.reality.influence.toString(),
    avocadoInfinityPoints: state.avocado.infinityPoints,
    avocadoInfluence: state.avocado.influence,
  }
}

function summaryOutput(summary: Readonly<SimulationPresentationSummary>): Readonly<Record<string, string | number>> {
  return Object.fromEntries(Object.entries(summary).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? value.toString() : value,
  ]))
}

function accuracyDelta(candidate: CompletedExecution, reference: CompletedExecution): AccuracyDelta {
  return {
    referenceExecutionId: reference.executionId,
    infinityPointsGainedRelative: bigintRelativeDelta(
      BigInt(candidate.resetsAndIp.infinityPointsGained),
      BigInt(reference.resetsAndIp.infinityPointsGained),
    ),
    ordinaryInfinityCountRelative: bigintRelativeDelta(
      BigInt(candidate.resetsAndIp.ordinaryInfinityCount),
      BigInt(reference.resetsAndIp.ordinaryInfinityCount),
    ),
    breakInfinityCountRelative: bigintRelativeDelta(
      BigInt(candidate.resetsAndIp.breakInfinityCount),
      BigInt(reference.resetsAndIp.breakInfinityCount),
    ),
    moneyAfterRelative: numberRelativeDelta(candidate.resources.after.money, reference.resources.after.money),
    scienceAfterRelative: numberRelativeDelta(candidate.resources.after.science, reference.resources.after.science),
    botsAfterRelative: numberRelativeDelta(candidate.resources.after.bots, reference.resources.after.bots),
    dreamStrangeMatterAfterRelative: bigintRelativeDelta(
      BigInt(candidate.resources.after.dreamStrangeMatter),
      BigInt(reference.resources.after.dreamStrangeMatter),
    ),
    realityInfluenceAfterRelative: bigintRelativeDelta(
      BigInt(candidate.resources.after.realityInfluence),
      BigInt(reference.resources.after.realityInfluence),
    ),
  }
}

function fineStepAccuracyDelta(
  candidate: CompletedExecution,
  reference: FineStepReference,
): FineStepAccuracyDelta {
  return {
    referenceTickCount: reference.tickCount,
    infinityPointsGainedRelative: bigintRelativeDelta(
      BigInt(candidate.resetsAndIp.infinityPointsGained),
      BigInt(reference.infinityPointsGained),
    ),
    moneyAfterRelative: numberRelativeDelta(
      candidate.resources.after.money,
      reference.after.money,
    ),
    scienceAfterRelative: numberRelativeDelta(
      candidate.resources.after.science,
      reference.after.science,
    ),
    botsAfterRelative: numberRelativeDelta(
      candidate.resources.after.bots,
      reference.after.bots,
    ),
    dreamStrangeMatterAfterRelative: bigintRelativeDelta(
      BigInt(candidate.resources.after.dreamStrangeMatter),
      BigInt(reference.after.dreamStrangeMatter),
    ),
    realityInfluenceAfterRelative: bigintRelativeDelta(
      BigInt(candidate.resources.after.realityInfluence),
      BigInt(reference.after.realityInfluence),
    ),
  }
}

function bigintRelativeDelta(candidate: bigint, reference: bigint): number | null {
  if (reference === 0n) return candidate === 0n ? 0 : null
  const scale = 1_000_000_000n
  const scaled = (candidate - reference) * scale / (reference < 0n ? -reference : reference)
  const result = Number(scaled) / Number(scale)
  return Number.isFinite(result) ? result : null
}

function numberRelativeDelta(candidate: number, reference: number): number | null {
  if (!Number.isFinite(candidate) || !Number.isFinite(reference)) return null
  if (reference === 0) return candidate === 0 ? 0 : null
  return (candidate - reference) / Math.abs(reference)
}

function summarizeCases(matrixCases: readonly ReturnType<typeof runCase>[]) {
  const executions = matrixCases.flatMap((entry) => entry.executions)
  return {
    caseCount: matrixCases.length,
    presetRequests: matrixCases.length * presets.length,
    uniqueTickCountExecutions: executions.length,
    completedExecutions: executions.filter((execution) => execution.status === 'completed').length,
    inappropriateExecutions: executions.filter((execution) => execution.status === 'inappropriate').length,
    completedTicks: executions.reduce(
      (total, execution) => total + (execution.status === 'completed' ? execution.tickCount : 0),
      0,
    ),
    completedWallMilliseconds: executions.reduce(
      (total, execution) => total + (execution.status === 'completed' ? execution.wallMilliseconds : execution.observedMilliseconds),
      0,
    ),
  }
}

function stageMetadata(stage: StageDefinition) {
  return {
    id: stage.id,
    description: stage.description,
    source: stage.source,
    fingerprint: stage.fingerprint,
    breakInfinity: stage.breakInfinity,
    calibratedPeakReward: stage.calibratedPeakReward.toString(),
    ownedSkillCount: stage.ownedSkillCount,
    ownedSkillIds: stage.ownedSkillIds,
    gameSpeed: stage.baseState.gameState.timeline.doubleTime.unlocked ? 2 : 1,
  }
}

function printSummary(matrixCases: readonly ReturnType<typeof runCase>[], output: string): void {
  const totals = summarizeCases(matrixCases)
  console.log(`Stored Time matrix (${smoke ? 'smoke' : 'full'}): ${totals.completedExecutions}/${totals.uniqueTickCountExecutions} unique executions completed.`)
  console.log(`Simulated ${totals.completedTicks.toLocaleString()} coarse gameplay ticks in ${(totals.completedWallMilliseconds / 1_000).toFixed(2)}s wall time.`)
  if (totals.inappropriateExecutions > 0) {
    console.log(`${totals.inappropriateExecutions} executions were marked inappropriate by the five-minute predictive/observed ceiling.`)
  }
  console.log(`Report: ${output}`)
}

function fixtureById(id: string): ProgressionMatrixFixture {
  const fixture = checkedInFixtures.find((candidate) => candidate.id === id)
  if (fixture === undefined) throw new Error(`Missing checked-in progression fixture '${id}'`)
  return fixture
}

function runtimeFromFixture(fixture: ProgressionMatrixFixture): CanonicalRuntimeState {
  const prepared = prepareImportedSaveText(fixture.saveText, '2026-08-19T00:00:00.000Z')
  return new CanonicalRuntimeSession(prepared, {
    entitlements: { permanentDoubleIp: false },
  }).initialState
}

function ownedSkillIds(state: CanonicalGameStateV1): string[] {
  return Object.entries(state.skills.byId)
    .filter(([, skill]) => skill.owned)
    .map(([id]) => id)
    .sort()
}

function repositoryRunIdentity() {
  const git = (...args: string[]) => execFileSync('git', [
    '-c', 'filter.lfs.process=',
    '-c', 'filter.lfs.required=false',
    '-c', 'filter.lfs.clean=cat',
    ...args,
  ], { cwd: webRoot, encoding: 'utf8' }).trim()
  return {
    revision: git('rev-parse', 'HEAD'),
    workingTreeDirty: git('status', '--porcelain').length > 0,
  }
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-12)
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'bigint') return { $bigint: entry.toString() }
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)))
    }
    return entry
  })
}
