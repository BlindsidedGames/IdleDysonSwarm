import { performance } from 'node:perf_hooks'
import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import type {
  CanonicalGameStateV2,
  CanonicalResearchId,
} from '../game-state/typesV2'
import {
  GAME_DECIMAL_ZERO,
  GAME_DECIMAL_EXPONENT_LIMIT,
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
} from '../save/schema13'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
  V2ZeroTimePassGuard,
  advanceCanonicalEventTimeV2,
  normalizePreparedFastDreamCyclesV2,
  prepareCanonicalEventTimeCarrierV2,
  registerCanonicalTimerAggregationAuthorityV2ForWorker,
  retimePreparedCanonicalEventTimeCarrierV2,
  resumeCanonicalEventTimeV2,
  resumeCanonicalEventTimeV2FromAcknowledgedSeal,
  sealCanonicalEventTimeV2MaterialBoundary,
  type CanonicalEventTimeCarrierV2,
  type CanonicalEventTimeV2AdvanceRequest,
  type CanonicalEventTimeV2AdvanceResult,
  type CanonicalEventTimeV2Context,
  type CanonicalQueuedInputV2,
  type CanonicalQueuedDysonInputV2,
} from './canonicalEventTimeModelV2'
import { commitCanonicalDreamResetV2, quoteCanonicalDreamResetV2 } from './canonicalDreamResetV2'
import {
  runV2DysonAutomationTick,
} from './dysonV2Commands'
import {
  CAPPED_RESEARCH_V2_IDS,
  runV2ResearchAutomationTick,
} from './researchV2'

const TRUSTED_AUTHORITY = Object.freeze({ kind: 'trusted-same-device' as const })
const INFINITY_REWARD_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)
const FAST_TIMER_AGGREGATION_AUTHORITY =
  registerCanonicalTimerAggregationAuthorityV2ForWorker()
const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  TRUSTED_AUTHORITY,
)

function stateWith(options: Readonly<{
  automationHorizon?: number
  infinityHorizon?: number
  infinityCycleSeconds?: number
  storedAvailable?: number
  storedCapacity?: number
  doubleBank?: number
  doubleRate?: number
  doubleUnlocked?: boolean
  money?: number
  bots?: number
  goalStage?: bigint
  queuedSkill?: string | null
  zeroProduction?: boolean
  science?: number
  assemblyLinesManual?: number
  researchAutomationUnlocked?: boolean
  researchEnabledId?: CanonicalResearchId | null
  researchTargetIndex?: number
  researchBuyMode?: CanonicalGameStateV2['research']['automation']['buyMode']
  activeSkillTimer?: boolean
  activeSkillTimers?: readonly (
    'androids' | 'pocketAndroids' | 'superRadiantScattering'
  )[]
  activeSkillTimerSeconds?: number
}> = {}): CanonicalGameStateV2 {
  const source = migrated.state
  const zeroFacilities = Object.fromEntries(
    Object.keys(source.dyson.facilities).map((id) => [
      id,
      Object.freeze([gameDecimalFromNumber(0), gameDecimalFromNumber(0)]),
    ]),
  ) as unknown as CanonicalGameStateV2['dyson']['facilities']
  const disabledFacilities = Object.fromEntries(
    Object.keys(source.dyson.automation.enabledFacilities).map((id) => [id, false]),
  ) as unknown as CanonicalGameStateV2['dyson']['automation']['enabledFacilities']
  if (options.assemblyLinesManual !== undefined) {
    zeroFacilities.assembly_lines = Object.freeze([
      gameDecimalFromNumber(0),
      gameDecimalFromNumber(options.assemblyLinesManual),
    ])
  }
  const researchEnabledById = Object.fromEntries(
    Object.keys(source.research.automation.enabledById).map((id) => [
      id,
      options.researchEnabledId === id,
    ]),
  ) as CanonicalGameStateV2['research']['automation']['enabledById']
  const activeSkillTimers = options.activeSkillTimers ??
    (options.activeSkillTimer ? ['androids'] as const : [])
  const byId = activeSkillTimers.length > 0
    ? Object.fromEntries(Object.entries(source.skills.byId).map(([id, skill]) => [
        id,
        activeSkillTimers.includes(id as typeof activeSkillTimers[number])
          ? {
              ...skill,
              owned: true,
              timerSeconds: options.activeSkillTimerSeconds ?? 12,
            }
          : skill,
      ])) as CanonicalGameStateV2['skills']['byId']
    : source.skills.byId
  return cloneCanonicalGameStateV2({
    ...source,
    dyson: {
      ...source.dyson,
      money: options.money === undefined
        ? source.dyson.money
        : gameDecimalFromNumber(options.money),
      bots: options.bots === undefined
        ? options.zeroProduction ? gameDecimalFromNumber(0) : source.dyson.bots
        : gameDecimalFromNumber(options.bots),
      workers: options.zeroProduction ? gameDecimalFromNumber(0) : source.dyson.workers,
      researchers: options.zeroProduction ? gameDecimalFromNumber(0) : source.dyson.researchers,
      science: options.science === undefined
        ? options.zeroProduction ? gameDecimalFromNumber(0) : source.dyson.science
        : gameDecimalFromNumber(options.science),
      facilities: options.zeroProduction ? zeroFacilities : source.dyson.facilities,
      automation: options.zeroProduction
        ? { ...source.dyson.automation, enabledFacilities: disabledFacilities }
        : source.dyson.automation,
      goalStage: options.goalStage ?? source.dyson.goalStage,
    },
    skills: {
      ...source.skills,
      byId,
      activeAutoAssignment: options.queuedSkill === undefined
        ? source.skills.activeAutoAssignment
        : options.queuedSkill === null ? [] : [options.queuedSkill],
    },
    infinity: {
      ...source.infinity,
      automationUnlocked: {
        ...source.infinity.automationUnlocked,
        research: options.researchAutomationUnlocked ??
          source.infinity.automationUnlocked.research,
      },
    },
    research: {
      ...source.research,
      automation: {
        ...source.research.automation,
        buyMode: options.researchBuyMode ?? source.research.automation.buyMode,
        enabledById: options.researchEnabledId === undefined
          ? source.research.automation.enabledById
          : researchEnabledById,
      },
    },
    timeline: {
      ...source.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: options.automationHorizon ?? 1,
      infinityBoundaryRemaining: options.infinityHorizon ?? 1,
      infinityCycleSeconds: options.infinityCycleSeconds ??
        source.timeline.infinityCycleSeconds,
      storedTimeAvailableSeconds: options.storedAvailable ?? 10,
      storedTimeCapacitySeconds: options.storedCapacity ?? 10,
      researchAutomationTargetIndex: options.researchTargetIndex ??
        source.timeline.researchAutomationTargetIndex,
      doubleTime: {
        ...source.timeline.doubleTime,
        unlocked: options.doubleUnlocked ?? false,
        enabled: options.doubleUnlocked ?? false,
        bankSeconds: options.doubleBank ?? 0,
        rate: options.doubleRate ?? 0,
      },
    },
  })
}

function carrier(
  state = stateWith(),
  runtime: Readonly<CanonicalRuntimeSidecarV2> = migrated.runtime,
  revision = 7,
): Readonly<CanonicalEventTimeCarrierV2> {
  return Object.freeze({ state, runtime, revision })
}

function dreamStateWith(
  source: CanonicalGameStateV2,
  options: Readonly<{
    stage?: bigint
    resources?: Partial<CanonicalGameStateV2['dream']['resources']>
    timers?: Partial<CanonicalGameStateV2['dream']['timers']>
    parameters?: Partial<CanonicalGameStateV2['dream']['parameters']>
    railgun?: Partial<CanonicalGameStateV2['dream']['railgun']>
  }>,
): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2({
    ...source,
    dream: {
      ...source.dream,
      disasterStage: options.stage ?? source.dream.disasterStage,
      resources: { ...source.dream.resources, ...options.resources },
      timers: { ...source.dream.timers, ...options.timers },
      parameters: { ...source.dream.parameters, ...options.parameters },
      railgun: { ...source.dream.railgun, ...options.railgun },
    },
  })
}

function context(
  automationIntervalSeconds = 1,
  timerAggregationPolicy: 'disabled' | 'stored-time-fast-v1' = 'disabled',
): Readonly<CanonicalEventTimeV2Context> {
  return Object.freeze({
    automationIntervalSeconds,
    timerAggregationAuthority: timerAggregationPolicy === 'stored-time-fast-v1'
      ? FAST_TIMER_AGGREGATION_AUTHORITY
      : null,
    quantumEpochAuthority: null,
    dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
    catalogLookup: null,
    infinityRewardAuthority: INFINITY_REWARD_AUTHORITY,
  })
}

function request(
  source: Readonly<CanonicalEventTimeCarrierV2>,
  durationSeconds: number,
  options: Readonly<{
    mode?: 'active' | 'stored-time'
    materialEventBudget?: number
    context?: Readonly<CanonicalEventTimeV2Context>
    queuedInputs?: readonly Readonly<CanonicalQueuedInputV2>[]
    cancelRequested?: (() => boolean) | null
  }> = {},
): Readonly<CanonicalEventTimeV2AdvanceRequest> {
  return Object.freeze({
    carrier: source,
    durationSeconds,
    materialEventBudget: options.materialEventBudget ?? 128,
    mode: options.mode ?? 'active',
    context: options.context ?? context(),
    queuedInputs: options.queuedInputs ?? Object.freeze([]),
    cancelRequested: options.cancelRequested ?? null,
  })
}

function queuedInput(
  id: string,
  horizonSeconds: number,
  facilityId: CanonicalQueuedDysonInputV2['facilityId'],
): Readonly<CanonicalQueuedDysonInputV2> {
  return Object.freeze({
    id,
    horizonSeconds,
    commandVersion: 1,
    commandKind: 'dyson-facility-purchase',
    facilityId,
    requestedMode: 'buy-1',
    roundedBulkBuy: false,
  })
}

describe('dormant CanonicalEventTimeModelV2', () => {
  test('advances a combined state at the representational ceiling without overflow', () => {
    const exponent = GAME_DECIMAL_EXPONENT_LIMIT - 1
    const high = gameDecimalFromCanonicalString(`1e${exponent}`)
    const lower = gameDecimalFromCanonicalString(`5e${exponent - 1}`)
    const source = stateWith()
    const state = cloneCanonicalGameStateV2({
      ...source,
      dyson: { ...source.dyson, money: high, science: lower, bots: high, workers: lower, researchers: lower, totalPanelsDecayed: lower },
      infinity: { ...source.infinity, availablePoints: high, allocatedPoints: lower, breakTarget: high, lastPointsGained: lower },
      reality: { ...source.reality, universeDesignationCount: high, influence: high },
      quantum: { ...source.quantum, availableShards: high, lifetimeEarnedShards: high, influenceSpeedBonus: high, cashBonusLevels: high, scienceBonusLevels: high },
    })

    const result = advanceCanonicalEventTimeV2(request(carrier(state), 0.1))
    expect(result.status).toBe('completed')
  })

  test('initializes the first Infinity horizon instead of treating an uninitialized zero clock as due', () => {
    const baseline = stateWith({
      automationHorizon: 0,
      infinityHorizon: 0,
      zeroProduction: true,
      goalStage: 0n,
    })
    const state = cloneCanonicalGameStateV2({
      ...baseline,
      timeline: {
        ...baseline.timeline,
        eventClockInitialized: false,
        automationTimeUntilNextEvent: 0,
        infinityBoundaryRemaining: 0,
      },
    })

    const result = advanceCanonicalEventTimeV2(request(carrier(state), 0.1))

    expect(result.status).toBe('completed')
    expect(result.consumedSeconds).toBe(0.1)
    expect(result.carrier.state.timeline.eventClockInitialized).toBe(true)
    expect(result.carrier.state.timeline.infinityBoundaryRemaining).toBeGreaterThan(0)
    expect(result.summary.infinityResetCount).toBe(0n)
  })

  test('prepares one strict carrier admission and keeps its first chunk below 100ms', () => {
    const admitted = carrier(stateWith())
    const prepared = prepareCanonicalEventTimeCarrierV2(admitted)
    expect(prepared).toBe(admitted)
    expect(prepareCanonicalEventTimeCarrierV2(prepared)).toBe(prepared)

    const started = performance.now()
    const result = advanceCanonicalEventTimeV2(request(prepared, 0.01, {
      materialEventBudget: 8,
    }))
    const elapsed = performance.now() - started
    expect(result.status).toBe('completed')
    expect(elapsed).toBeLessThan(100)
  })

  test('retimes only admitted carriers while structurally sharing immutable branches', () => {
    const unprepared = carrier(stateWith())
    expect(() => retimePreparedCanonicalEventTimeCarrierV2(
      unprepared,
      0.25,
      3,
    )).toThrow('must be admitted')

    const prepared = prepareCanonicalEventTimeCarrierV2(unprepared)
    const retimed = retimePreparedCanonicalEventTimeCarrierV2(
      prepared,
      0.25,
      3,
    )
    expect(retimed.runtime).toBe(prepared.runtime)
    expect(retimed.state.skills).toBe(prepared.state.skills)
    expect(retimed.state.statistics).toBe(prepared.state.statistics)
    expect(retimed.state.timeline).not.toBe(prepared.state.timeline)
    expect(retimed.state.timeline).toMatchObject({
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 0.25,
      dysonAutomationTargetIndex: 3,
    })
    expect(prepareCanonicalEventTimeCarrierV2(retimed)).toBe(retimed)
    expect(() => retimePreparedCanonicalEventTimeCarrierV2(
      retimed,
      -0,
      3,
    )).toThrow('finite and non-negative')
    expect(() => retimePreparedCanonicalEventTimeCarrierV2(
      retimed,
      0.25,
      8,
    )).toThrow('from 0 through 7')
  })

  test('preserves exact state/runtime across binary-exact caller partitions', () => {
    const source = carrier(stateWith({ automationHorizon: 1, infinityHorizon: 1 }))
    const whole = advanceCanonicalEventTimeV2(request(source, 0.0625))
    const first = advanceCanonicalEventTimeV2(request(source, 0.03125))
    const second = advanceCanonicalEventTimeV2(request(first.carrier, 0.03125))
    expect(second.carrier.state).toEqual(whole.carrier.state)
    expect(second.carrier.runtime).toEqual(whole.carrier.runtime)
    expect(first.summary.baseSimulationSeconds + second.summary.baseSimulationSeconds)
      .toBe(whole.summary.baseSimulationSeconds)
    expect(first.summary.dreamSimulationSeconds + second.summary.dreamSimulationSeconds)
      .toBe(whole.summary.dreamSimulationSeconds)
  })

  test.each(['active', 'stored-time'] as const)(
    'advances Reality and statistics identically across %s material partitions',
    (mode) => {
      const baseline = stateWith({
        automationHorizon: 2,
        infinityHorizon: 2,
        storedAvailable: 10,
        storedCapacity: 10,
        zeroProduction: true,
        goalStage: 10n,
      })
      const state = cloneCanonicalGameStateV2({
        ...baseline,
        quantum: {
          ...baseline.quantum,
          influenceSpeedBonus: gameDecimalFromNumber(3),
        },
        reality: {
          ...baseline.reality,
          universeDesignationCount: GAME_DECIMAL_ZERO,
          influence: GAME_DECIMAL_ZERO,
          workersReady: 0n,
          workerGenerationProgress: 0,
          autoGather: false,
        },
      })
      const source = carrier(state)
      const whole = advanceCanonicalEventTimeV2(request(source, 1, { mode }))
      const first = advanceCanonicalEventTimeV2(request(source, 0.5, { mode }))
      const second = advanceCanonicalEventTimeV2(request(first.carrier, 0.5, { mode }))

      expect(second.carrier.state).toEqual(whole.carrier.state)
      expect(second.carrier.runtime).toEqual(whole.carrier.runtime)
      expect(addGameDecimals(
        first.summary.realityWorkers,
        second.summary.realityWorkers,
      )).toEqual(whole.summary.realityWorkers)
      expect(addGameDecimals(
        first.summary.automaticInfluence,
        second.summary.automaticInfluence,
      )).toEqual(whole.summary.automaticInfluence)
      expect(
        first.summary.realityCapacityStallSeconds +
          second.summary.realityCapacityStallSeconds,
      ).toBe(whole.summary.realityCapacityStallSeconds)
      expect(gameDecimalToCanonicalString(whole.summary.realityWorkers)).toBe('7e0')
      expect(whole.carrier.state.reality.workersReady).toBe(7n)
      expect(whole.carrier.state.statistics.lifetime.realityWorkers).toEqual(
        addGameDecimals(state.statistics.lifetime.realityWorkers, gameDecimalFromNumber(7)),
      )
      expect(whole.carrier.state.statistics.lifetime.simulatedSeconds)
        .toBe(state.statistics.lifetime.simulatedSeconds + 1)
      expect(whole.carrier.state.statistics.trackedSimulatedSeconds)
        .toBe(state.statistics.trackedSimulatedSeconds + 1)
    },
  )

  test('keeps Reality window attribution exact across a caller/restart boundary', () => {
    const baseline = stateWith({
      automationHorizon: 2,
      infinityHorizon: 2,
      zeroProduction: true,
      storedAvailable: 20,
      storedCapacity: 20,
      goalStage: 10n,
    })
    const state = cloneCanonicalGameStateV2({
      ...baseline,
      quantum: {
        ...baseline.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(3),
      },
      reality: {
        ...baseline.reality,
        universeDesignationCount: GAME_DECIMAL_ZERO,
        influence: GAME_DECIMAL_ZERO,
        workersReady: 0n,
        workerGenerationProgress: 0,
        autoGather: false,
      },
      statistics: {
        ...baseline.statistics,
        trackedSimulatedSeconds: 59.5,
      },
    })
    const source = carrier(state)
    const whole = advanceCanonicalEventTimeV2(request(source, 1))
    const first = advanceCanonicalEventTimeV2(request(source, 0.5))
    const restarted = advanceCanonicalEventTimeV2(request(first.carrier, 0.5))
    expect(restarted.carrier.state).toEqual(whole.carrier.state)
    expect(restarted.carrier.state.statistics.minuteWindows)
      .toEqual(whole.carrier.state.statistics.minuteWindows)
  })

  test('uses raw material seconds for Reality while Double Time accelerates Dream only', () => {
    const baseline = stateWith({
      automationHorizon: 2,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
      doubleUnlocked: true,
      doubleBank: 10,
      doubleRate: 1,
    })
    const state = cloneCanonicalGameStateV2({
      ...baseline,
      quantum: {
        ...baseline.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(3),
      },
      reality: {
        ...baseline.reality,
        universeDesignationCount: GAME_DECIMAL_ZERO,
        influence: GAME_DECIMAL_ZERO,
        workersReady: 0n,
        workerGenerationProgress: 0,
        autoGather: false,
      },
    })
    const result = advanceCanonicalEventTimeV2(request(carrier(state), 1))
    expect(result.summary.baseSimulationSeconds).toBe(1)
    expect(result.summary.dreamSimulationSeconds).toBe(2)
    expect(gameDecimalToCanonicalString(result.summary.realityWorkers)).toBe('7e0')
    expect(result.carrier.state.reality.workersReady).toBe(7n)
  })

  test('captures Dream production at tick start and applies Double Time before raw Reality time', () => {
    const base = stateWith({
      automationHorizon: 2,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
    })
    const dream = dreamStateWith(base, {
      resources: {
        hunters: gameDecimalFromNumber(1),
        community: GAME_DECIMAL_ZERO,
      },
      timers: { hunterTimerProgress: 2 },
    })
    const raw = advanceCanonicalEventTimeV2(request(carrier(dream), 1))
    const acceleratedSource = cloneCanonicalGameStateV2({
      ...dream,
      timeline: {
        ...dream.timeline,
        doubleTime: {
          ...dream.timeline.doubleTime,
          unlocked: true,
          enabled: true,
          bankSeconds: 10,
          rate: 1,
        },
      },
    })
    const accelerated = advanceCanonicalEventTimeV2(
      request(carrier(acceleratedSource), 0.5),
    )
    expect(accelerated.carrier.state.dream.resources.community)
      .toEqual(raw.carrier.state.dream.resources.community)
    expect(accelerated.carrier.state.dream.timers.hunterTimerProgress)
      .toBe(raw.carrier.state.dream.timers.hunterTimerProgress)
    expect(gameDecimalToCanonicalString(accelerated.summary.dreamRequested.community))
      .toBe('1e0')
    expect(accelerated.summary.dreamSimulationSeconds).toBe(1)
    expect(accelerated.summary.baseSimulationSeconds).toBe(0.5)
  })

  test.each(['active', 'stored-time'] as const)(
    'preserves %s resource debits through owned Skill timers and Dream production',
    (mode) => {
      const base = stateWith({
        automationHorizon: 2,
        infinityHorizon: 2,
        storedAvailable: 10,
        storedCapacity: 10,
        zeroProduction: true,
        goalStage: 10n,
        activeSkillTimer: true,
        activeSkillTimerSeconds: 12,
        doubleUnlocked: true,
        doubleBank: 10,
        doubleRate: 1,
      })
      const dream = dreamStateWith(base, {
        resources: { hunters: gameDecimalFromNumber(1) },
        timers: { hunterTimerProgress: 2 },
      })
      const source = carrier(dream)
      const whole = advanceCanonicalEventTimeV2(request(source, 0.5, { mode }))
      expect(whole.carrier.state.timeline.doubleTime.bankSeconds).toBe(9.5)
      expect(whole.carrier.state.timeline.storedTimeAvailableSeconds)
        .toBe(mode === 'stored-time' ? 9.5 : 10)
      expect(whole.carrier.state.skills.byId.androids!.timerSeconds).toBe(12.5)
      expect(gameDecimalToCanonicalString(
        whole.carrier.state.dream.resources.community,
      )).toBe('1e0')

      const first = advanceCanonicalEventTimeV2(request(source, 0.25, { mode }))
      const encoded = encodeSchema13WebSave({
        savedAtUtc: '2026-08-09T00:00:00.000Z',
        state: first.carrier.state,
        runtime: first.carrier.runtime,
      })
      const decoded = decodeSchema13WebSave(encoded)
      const reloaded = advanceCanonicalEventTimeV2(request(
        carrier(decoded.state, decoded.runtime, first.carrier.revision),
        0.25,
        { mode },
      ))
      expect(reloaded.carrier.state).toEqual(whole.carrier.state)
      expect(reloaded.carrier.runtime).toEqual(whole.carrier.runtime)
    },
  )

  test('runs Dream conversions before an automatic reset at the same boundary', () => {
    const base = stateWith({
      automationHorizon: 0,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
    })
    const sourceState = dreamStateWith(base, {
      stage: 1n,
      resources: {
        housing: gameDecimalFromNumber(10),
        villages: gameDecimalFromNumber(24),
        cities: GAME_DECIMAL_ZERO,
      },
    })
    const result = advanceCanonicalEventTimeV2(request(carrier(sourceState), 0.125))
    expect(result.status).toBe('completed')
    expect(result.summary.automationTicks).toBe(1n)
    expect(result.summary.dreamResetCount).toBe(1n)
    expect(result.carrier.state.dream.resetCount).toBe(sourceState.dream.resetCount + 1n)
    expect(gameDecimalToCanonicalString(result.summary.dreamStrangeMatterRequested))
      .toBe('1e0')
    expect(result.carrier.runtime).not.toBe(migrated.runtime)
  })

  test('does not replay an acknowledged Dream reset across a yielded continuation', () => {
    const base = stateWith({
      automationHorizon: 1,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
    })
    const ready = dreamStateWith(base, {
      stage: 1n,
      resources: { cities: gameDecimalFromNumber(1) },
    })
    const source = carrier(ready)
    const uninterrupted = advanceCanonicalEventTimeV2(request(source, 0.125))
    let resumed = advanceCanonicalEventTimeV2(request(source, 0.125, {
      materialEventBudget: 1,
    }))
    expect(resumed.status).toBe('yielded')
    while (resumed.status === 'yielded') {
      resumed = resumeCanonicalEventTimeV2(resumed.continuation!)
    }
    expect(resumed.status).toBe('completed')
    expect(resumed.carrier).toEqual(uninterrupted.carrier)
    expect(resumed.summary.dreamResetCount).toBe(1n)
    expect(resumed.carrier.state.dream.resetCount).toBe(ready.dream.resetCount + 1n)
  })

  test('preserves Dream state and runtime across a schema reload partition', () => {
    const base = stateWith({
      automationHorizon: 2,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
    })
    const dream = dreamStateWith(base, {
      resources: {
        hunters: gameDecimalFromNumber(1),
        community: GAME_DECIMAL_ZERO,
      },
      timers: { hunterTimerProgress: 2 },
    })
    const source = carrier(dream)
    const whole = advanceCanonicalEventTimeV2(request(source, 1))
    const first = advanceCanonicalEventTimeV2(request(source, 0.5))
    const encoded = encodeSchema13WebSave({
      savedAtUtc: '2026-08-09T00:00:00.000Z',
      state: first.carrier.state,
      runtime: first.carrier.runtime,
    })
    const decoded = decodeSchema13WebSave(encoded)
    const reloaded = advanceCanonicalEventTimeV2(request(
      carrier(decoded.state, decoded.runtime, first.carrier.revision),
      0.5,
    ))
    expect(reloaded.carrier.state).toEqual(whole.carrier.state)
    expect(reloaded.carrier.runtime).toEqual(whole.carrier.runtime)
    expect(addGameDecimals(
      first.summary.dreamRequested.community,
      reloaded.summary.dreamRequested.community,
    )).toEqual(whole.summary.dreamRequested.community)
    expect(addGameDecimals(
      first.summary.dreamEffective.community,
      reloaded.summary.dreamEffective.community,
    )).toEqual(whole.summary.dreamEffective.community)
  })

  test('persists the full railgun interval across boost, yield, and schema boundaries', () => {
    const base = stateWith({
      automationHorizon: 1,
      infinityHorizon: 2,
      zeroProduction: true,
      goalStage: 10n,
      doubleUnlocked: true,
      doubleBank: 0.25,
      doubleRate: 1,
    })
    const railgunState = dreamStateWith(base, {
      stage: 42n,
      resources: {
        railgunCharge: gameDecimalFromNumber(10),
        dysonPanels: GAME_DECIMAL_ZERO,
        swarmPanels: GAME_DECIMAL_ZERO,
      },
      parameters: {
        communityBoostClock: 0.3,
        railgunMaxCharge: gameDecimalFromNumber(1),
      },
      railgun: {
        firing: true,
        fireProgress: 0,
        shotsRemaining: 10,
        activeRailguns: 1,
        reservedPanels: gameDecimalFromNumber(10),
      },
    })
    const source = carrier(railgunState)
    const whole = advanceCanonicalEventTimeV2(request(source, 1))
    expect(whole.status).toBe('completed')
    expect(whole.carrier.state.dream.railgun).toMatchObject({
      pendingBaseSeconds: 0,
      pendingDreamSeconds: 0,
      lastRoundsFired: 10,
    })
    expect(gameDecimalToCanonicalString(
      whole.carrier.state.dream.resources.swarmPanels,
    )).toBe('1e1')

    const first = advanceCanonicalEventTimeV2(request(source, 0.3))
    expect(first.carrier.state.dream.railgun).toMatchObject({
      pendingBaseSeconds: 0.3,
      pendingDreamSeconds: 0.55,
    })
    const encoded = encodeSchema13WebSave({
      savedAtUtc: '2026-08-09T00:00:00.000Z',
      state: first.carrier.state,
      runtime: first.carrier.runtime,
    })
    const decoded = decodeSchema13WebSave(encoded)
    const reloaded = advanceCanonicalEventTimeV2(request(
      carrier(decoded.state, decoded.runtime, first.carrier.revision),
      0.7,
    ))
    expect(reloaded.carrier.state).toEqual(whole.carrier.state)
    expect(reloaded.carrier.runtime).toEqual(whole.carrier.runtime)

    let yielded = advanceCanonicalEventTimeV2(request(source, 1, {
      materialEventBudget: 1,
    }))
    while (yielded.status === 'yielded') {
      yielded = resumeCanonicalEventTimeV2(yielded.continuation!)
    }
    expect(yielded.carrier).toEqual(whole.carrier)
  })

  test('commits one authentic Dream reset at a Stored Time Fast boundary', () => {
    const base = stateWith({
      automationHorizon: 1,
      infinityHorizon: 2,
      storedAvailable: 10,
      storedCapacity: 10,
      zeroProduction: true,
      goalStage: 10n,
    })
    const ready = dreamStateWith(base, {
      stage: 1n,
      resources: { cities: gameDecimalFromNumber(1) },
    })
    const source = carrier(ready)
    const result = advanceCanonicalEventTimeV2(request(source, 0.125, {
      mode: 'stored-time',
      context: context(1, 'stored-time-fast-v1'),
    }))
    expect(result).toMatchObject({ status: 'completed', consumedSeconds: 0.125 })
    expect(result.carrier.state.dream.resetCount).toBe(
      source.state.dream.resetCount + 1n,
    )
    expect(result.summary.dreamResetCount).toBe(1n)
    expect(result.summary.dreamMeteorResetCount).toBe(1n)
  })

  test('accepts only an issued stable post-reset Fast recurrence', () => {
    const readyBase = dreamStateWith(stateWith({
      automationHorizon: 1,
      infinityHorizon: 10_000,
      storedAvailable: 10_000,
      storedCapacity: 10_000,
      doubleBank: 10_000,
      doubleRate: 1,
      doubleUnlocked: true,
      zeroProduction: true,
      goalStage: 10n,
    }), { stage: 1n, resources: { cities: gameDecimalFromNumber(1) } })
    const ready = cloneCanonicalGameStateV2({
      ...readyBase,
      reality: { ...readyBase.reality, workersReady: 128n, autoGather: false },
    })
    const firstSource = Object.freeze({ revision: 1, state: ready, runtime: migrated.runtime })
    const first = commitCanonicalDreamResetV2(
      quoteCanonicalDreamResetV2(firstSource, Object.freeze({ kind: 'automatic' })),
      firstSource,
    ).publication!
    const cycleSeconds = 1
    const totals = (value: typeof first.state.statistics.lifetime) => Object.freeze({
      ...value,
      simulatedSeconds: value.simulatedSeconds + cycleSeconds,
    })
    const cycleReady = cloneCanonicalGameStateV2({
      ...first.state,
      dream: { ...first.state.dream, resources: { ...first.state.dream.resources, cities: gameDecimalFromNumber(1) } },
      timeline: {
        ...first.state.timeline,
        dysonAutomationTargetIndex:
          (first.state.timeline.dysonAutomationTargetIndex + 1) % 8,
        researchAutomationTargetIndex:
          first.state.infinity.automationUnlocked.research
            ? (first.state.timeline.researchAutomationTargetIndex + 1) % 14
            : first.state.timeline.researchAutomationTargetIndex,
        storedTimeAvailableSeconds: first.state.timeline.storedTimeAvailableSeconds - cycleSeconds,
        infinityBoundaryRemaining: first.state.timeline.infinityBoundaryRemaining - cycleSeconds,
        infinityCycleSeconds: first.state.timeline.infinityCycleSeconds + cycleSeconds,
        doubleTime: { ...first.state.timeline.doubleTime, bankSeconds: first.state.timeline.doubleTime.bankSeconds - first.state.timeline.doubleTime.rate * cycleSeconds },
      },
      statistics: {
        ...first.state.statistics,
        trackedSimulatedSeconds: first.state.statistics.trackedSimulatedSeconds + cycleSeconds,
        lifetime: totals(first.state.statistics.lifetime),
        currentQuantumRun: totals(first.state.statistics.currentQuantumRun),
        recentProcessedSegment: totals(first.state.statistics.recentProcessedSegment),
      },
    })
    const secondSource = Object.freeze({ revision: 2, state: cycleReady, runtime: first.runtime })
    const second = commitCanonicalDreamResetV2(
      quoteCanonicalDreamResetV2(secondSource, Object.freeze({ kind: 'automatic' })),
      secondSource,
    ).publication!
    const started = performance.now()
    const normalized = normalizePreparedFastDreamCyclesV2(Object.freeze({
      previousPostResetCarrier: carrier(first.state, first.runtime, 1),
      currentPostResetCarrier: carrier(second.state, second.runtime, 1),
      additionalCycles: 4096n,
      cycleSegmentSeconds: Object.freeze([cycleSeconds]),
      automationExecutionsPerCycle: 1,
      timerAggregationAuthority: FAST_TIMER_AGGREGATION_AUTHORITY,
    }))
    expect(normalized).not.toBeNull()
    expect(normalized!.cycles).toBe(4096n)
    expect(normalized!.carrier.state.dream.resetCount).toBe(
      second.state.dream.resetCount + 4096n,
    )
    expect(normalized!.carrier.state.skills.points).toBe(second.state.skills.points)
    expect(normalized!.carrier.runtime).not.toBe(second.runtime)
    expect(Object.isFrozen(normalized!.carrier.runtime.dysonEvaluationSnapshot))
      .toBe(true)
    expect(performance.now() - started).toBeLessThan(200)
    const unstableState = cloneCanonicalGameStateV2({
      ...second.state,
      dream: {
        ...second.state.dream,
        resources: {
          ...second.state.dream.resources,
          community: gameDecimalFromNumber(1),
        },
      },
    })
    expect(normalizePreparedFastDreamCyclesV2(Object.freeze({
      previousPostResetCarrier: carrier(first.state, first.runtime, 1),
      currentPostResetCarrier: carrier(unstableState, second.runtime, 1),
      additionalCycles: 1n,
      cycleSegmentSeconds: Object.freeze([cycleSeconds]),
      automationExecutionsPerCycle: 1,
      timerAggregationAuthority: FAST_TIMER_AGGREGATION_AUTHORITY,
    }))).toBeNull()
    let getters = 0
    const hostile = Object.defineProperty({}, 'previousPostResetCarrier', {
      enumerable: true,
      get() { getters += 1; return carrier(first.state, first.runtime, 1) },
    })
    expect(() => normalizePreparedFastDreamCyclesV2(hostile as never))
      .toThrow(/closed data object/u)
    expect(getters).toBe(0)
  })

  test('fails closed before Fast normalization can collapse a railgun interval', () => {
    const base = stateWith({
      automationHorizon: 1,
      infinityHorizon: 2,
      storedAvailable: 10,
      storedCapacity: 10,
      zeroProduction: true,
      goalStage: 10n,
    })
    const capable = cloneCanonicalGameStateV2({
      ...base,
      dream: {
        ...base.dream,
        upgrades: { ...base.dream.upgrades, railguns1: true },
      },
    })
    const source = carrier(capable)
    const result = advanceCanonicalEventTimeV2(request(source, 0.125, {
      mode: 'stored-time',
      context: context(1, 'stored-time-fast-v1'),
    }))
    expect(result).toMatchObject({
      status: 'blocked-unported-event',
      consumedSeconds: 0,
      diagnosticCode: 'V2_DREAM_RAILGUN_FAST_REQUIRES_NORMALIZATION',
    })
    expect(result.carrier).toBe(source)
  })

  test('publishes automatic Influence and worker statistics from one exact Reality batch', () => {
    const baseline = stateWith({
      automationHorizon: 40,
      infinityHorizon: 40,
      zeroProduction: true,
      goalStage: 10n,
    })
    const state = cloneCanonicalGameStateV2({
      ...baseline,
      quantum: {
        ...baseline.quantum,
        influenceSpeedBonus: GAME_DECIMAL_ZERO,
      },
      reality: {
        ...baseline.reality,
        universeDesignationCount: GAME_DECIMAL_ZERO,
        influence: GAME_DECIMAL_ZERO,
        workersReady: 0n,
        workerGenerationProgress: 0,
        autoGather: true,
      },
    })
    const result = advanceCanonicalEventTimeV2(request(carrier(state), 32))
    expect(result.carrier.state.reality).toMatchObject({
      workersReady: 0n,
      workerGenerationProgress: 0,
    })
    expect(gameDecimalToCanonicalString(result.carrier.state.reality.influence))
      .toBe('1.28e2')
    expect(gameDecimalToCanonicalString(result.summary.realityWorkers)).toBe('1.28e2')
    expect(gameDecimalToCanonicalString(result.summary.automaticInfluence)).toBe('1.28e2')
    expect(result.carrier.state.statistics.lifetime.realityWorkers).toEqual(
      addGameDecimals(state.statistics.lifetime.realityWorkers, gameDecimalFromNumber(128)),
    )
    expect(result.carrier.state.statistics.lifetime.automaticInfluence).toEqual(
      addGameDecimals(state.statistics.lifetime.automaticInfluence, gameDecimalFromNumber(128)),
    )
  })

  test('keeps analytic automation skipping exact for Reality state and statistics', () => {
    const source = carrier(stateWith({
      automationHorizon: 1,
      infinityHorizon: 100,
      storedAvailable: 20,
      storedCapacity: 20,
      zeroProduction: true,
      goalStage: 10n,
    }))
    const fast = advanceCanonicalEventTimeV2(request(source, 16.125, {
      mode: 'stored-time',
      context: context(1),
    }))
    const raw = advanceCanonicalEventTimeV2(request(source, 16.125, {
      mode: 'stored-time',
      context: context(1),
      queuedInputs: Object.freeze([
        queuedInput('future-noop', 50, 'assembly_lines'),
      ]),
    }))
    expect(fast.summary.analyticallySkippedAutomationTicks).toBeGreaterThan(0n)
    expect(raw.summary.analyticallySkippedAutomationTicks).toBe(0n)
    expect(fast.carrier.state).toEqual(raw.carrier.state)
    expect(fast.carrier.runtime).toEqual(raw.carrier.runtime)
    expect(fast.summary.realityWorkers).toEqual(raw.summary.realityWorkers)
    expect(fast.summary.automaticInfluence).toEqual(raw.summary.automaticInfluence)
    expect(fast.summary.realityCapacityStallSeconds)
      .toBe(raw.summary.realityCapacityStallSeconds)
  })

  test('finalizes every caller endpoint and survives schema-13 reload without ephemeral recurrence state', () => {
    const first = advanceCanonicalEventTimeV2(request(carrier(), 0.03125))
    expect(first.status).toBe('completed')
    expect(Object.keys(first.carrier)).toEqual(['state', 'runtime', 'revision'])
    expect(first.summary.boundaryOrder).toEqual([
      'production-arrival',
      'queued-input',
      'automation',
      'derived-timers-and-double-time',
      'dream-reset',
      'bot-cap-transition',
      'infinity-reset',
    ])
    expect(first.summary.boundaryPasses).toEqual({
      'production-arrival': 1n,
      'queued-input': 1n,
      automation: 1n,
      'derived-timers-and-double-time': 1n,
      'dream-reset': 1n,
      'bot-cap-transition': 1n,
      'infinity-reset': 1n,
    })
    expect(first.summary.boundaryDigest).toMatch(/^[0-9a-f]{16}$/u)
    expect('handlerOrder' in first.summary).toBe(false)

    const encoded = encodeSchema13WebSave({
      savedAtUtc: '2026-08-08T00:00:00.000Z',
      state: first.carrier.state,
      runtime: first.carrier.runtime,
    })
    const decoded = decodeSchema13WebSave(encoded)
    const continued = advanceCanonicalEventTimeV2(
      request(carrier(decoded.state, decoded.runtime, first.carrier.revision), 0.03125),
    )
    const uninterrupted = advanceCanonicalEventTimeV2(
      request(first.carrier, 0.03125),
    )
    expect(continued.carrier.state).toEqual(uninterrupted.carrier.state)
    expect(continued.carrier.runtime).toEqual(uninterrupted.carrier.runtime)
    expect(continued.carrier.revision).toBe(uninterrupted.carrier.revision)
  })

  test('uses one public revision per accepted outer advance despite internal automation', () => {
    const result = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({ automationHorizon: 0.0625 })),
      0.0625,
      { context: context(0.0625) },
    ))
    expect(result.summary.automationTicks).toBe(1n)
    expect(result.carrier.revision).toBe(8)
  })

  test('runs Research after Dyson automation and applies purchased effects on the next interval', () => {
    const targetIndex = 1
    const common = {
      automationHorizon: 1,
      infinityHorizon: 10,
      zeroProduction: true,
      science: 100_000,
      assemblyLinesManual: 1,
      researchAutomationUnlocked: true,
      researchTargetIndex: targetIndex,
    } as const
    const purchasing = carrier(stateWith({
      ...common,
      researchEnabledId: 'research.assembly_line_upgrade',
    }))
    const control = carrier(stateWith({
      ...common,
      researchEnabledId: null,
    }))
    const purchasedFirst = advanceCanonicalEventTimeV2(request(
      purchasing,
      1,
      { context: context(1) },
    ))
    const controlFirst = advanceCanonicalEventTimeV2(request(
      control,
      1,
      { context: context(1) },
    ))
    expect(purchasedFirst.carrier.state.dyson.bots)
      .toEqual(controlFirst.carrier.state.dyson.bots)
    expect(gameDecimalToCanonicalString(
      purchasedFirst.carrier.state.research.levelsById[
        'research.assembly_line_upgrade'
      ],
    )).toBe('1e0')
    expect(purchasedFirst.carrier.state.timeline).toMatchObject({
      dysonAutomationTargetIndex:
        (purchasing.state.timeline.dysonAutomationTargetIndex + 1) % 8,
      researchAutomationTargetIndex: (targetIndex + 1) % 14,
    })

    const purchasedSecond = advanceCanonicalEventTimeV2(request(
      purchasedFirst.carrier,
      1,
      { context: context(1) },
    ))
    const controlSecond = advanceCanonicalEventTimeV2(request(
      controlFirst.carrier,
      1,
      { context: context(1) },
    ))
    expect(compareGameDecimals(
      purchasedSecond.carrier.state.dyson.bots,
      controlSecond.carrier.state.dyson.bots,
    )).toBeGreaterThan(0)
  })

  test.each([
    {
      name: 'bots locked with positive currencies',
      botsUnlocked: false,
      researchUnlocked: false,
      dysonEnabled: true,
      researchEnabled: false,
      cappedResearchComplete: false,
      money: 1e100,
      science: 1e100,
    },
    {
      name: 'all Dyson and Research targets disabled with positive currencies',
      botsUnlocked: true,
      researchUnlocked: true,
      dysonEnabled: false,
      researchEnabled: false,
      cappedResearchComplete: true,
      money: 1e100,
      science: 1e100,
    },
    {
      name: 'zero currencies with enabled Dyson and Research targets',
      botsUnlocked: true,
      researchUnlocked: true,
      dysonEnabled: true,
      researchEnabled: true,
      cappedResearchComplete: false,
      money: 0,
      science: 0,
    },
  ])('certifies the same no-op automation result as authentic quotes: $name', ({
    botsUnlocked,
    researchUnlocked,
    dysonEnabled,
    researchEnabled,
    cappedResearchComplete,
    money,
    science,
  }) => {
    const base = stateWith({
      automationHorizon: 0.5,
      zeroProduction: true,
      money,
      science,
    })
    const enabledFacilities = Object.freeze(Object.fromEntries(
      Object.keys(base.dyson.automation.enabledFacilities)
        .map((id) => [id, dysonEnabled]),
    )) as CanonicalGameStateV2['dyson']['automation']['enabledFacilities']
    const enabledResearch = Object.freeze(Object.fromEntries(
      Object.keys(base.research.automation.enabledById)
        .map((id) => [id, researchEnabled]),
    )) as CanonicalGameStateV2['research']['automation']['enabledById']
    const source = cloneCanonicalGameStateV2({
      ...base,
      dyson: {
        ...base.dyson,
        automation: { ...base.dyson.automation, enabledFacilities },
      },
      infinity: {
        ...base.infinity,
        automationUnlocked: {
          ...base.infinity.automationUnlocked,
          bots: botsUnlocked,
          research: researchUnlocked,
        },
      },
      research: {
        ...base.research,
        levelsById: cappedResearchComplete
          ? {
              ...base.research.levelsById,
              ...Object.fromEntries(CAPPED_RESEARCH_V2_IDS.map((id) => [id, 1n])),
            }
          : base.research.levelsById,
        automation: { ...base.research.automation, enabledById: enabledResearch },
      },
    })
    const result = advanceCanonicalEventTimeV2(request(
      carrier(source, migrated.runtime, 17),
      0.5,
      { context: context(0.5) },
    ))
    expect(result.status).toBe('completed')
    const dyson = runV2DysonAutomationTick(source, 0, 'preserve-configured-mode')
    const authentic = researchUnlocked
      ? runV2ResearchAutomationTick(
          dyson.state,
          migrated.runtime,
          dyson.revision,
          'preserve-configured-mode',
        )
      : dyson
    expect(result.carrier.state.dyson).toEqual(authentic.state.dyson)
    expect(result.carrier.state.research).toEqual(authentic.state.research)
    expect(result.carrier.revision).toBe(18)
    expect(result.carrier.state.timeline.dysonAutomationTargetIndex).toBe(
      (source.timeline.dysonAutomationTargetIndex + 1) % 8,
    )
    expect(result.carrier.state.timeline.researchAutomationTargetIndex).toBe(
      researchUnlocked
        ? (source.timeline.researchAutomationTargetIndex + 1) % 14
        : source.timeline.researchAutomationTargetIndex,
    )
  })

  test('rejects a represented no-op publication at the safe-integer ceiling', () => {
    const source = stateWith({ zeroProduction: true, money: 0, science: 0 })
    expect(() => advanceCanonicalEventTimeV2(request(
      carrier(source, migrated.runtime, Number.MAX_SAFE_INTEGER),
      0.5,
      { context: context(0.5) },
    ))).toThrow(/revision/u)
  })

  test('does not certify disabled Research toggles while an auto-group cap is incomplete', () => {
    const base = stateWith({
      automationHorizon: 0.5,
      zeroProduction: true,
      money: 1e100,
      science: 1e100,
      researchAutomationUnlocked: true,
      researchEnabledId: null,
    })
    const source = cloneCanonicalGameStateV2({
      ...base,
      infinity: {
        ...base.infinity,
        automationUnlocked: {
          ...base.infinity.automationUnlocked,
          bots: false,
          research: true,
        },
      },
    })
    const result = advanceCanonicalEventTimeV2(request(
      carrier(source),
      0.5,
      { context: context(0.5) },
    ))
    expect(result.status).toBe('completed')
    expect(result.carrier.state.research.levelsById['research.panel_lifetime_1'])
      .toBe(1n)
  })

  test('uses configured Research mode actively and force-max during stored time', () => {
    const source = stateWith({
      automationHorizon: 0.5,
      infinityHorizon: 10,
      storedAvailable: 2,
      storedCapacity: 2,
      zeroProduction: true,
      science: 1_000_000_000,
      researchAutomationUnlocked: true,
      researchEnabledId: 'research.money_multiplier',
      researchTargetIndex: 6,
      researchBuyMode: 'buy-1',
    })
    const active = advanceCanonicalEventTimeV2(request(
      carrier(source),
      0.5,
      { context: context(0.5) },
    ))
    const stored = advanceCanonicalEventTimeV2(request(
      carrier(source),
      0.5,
      { context: context(0.5), mode: 'stored-time' },
    ))
    expect(gameDecimalToCanonicalString(
      active.carrier.state.research.levelsById['research.money_multiplier'],
    )).toBe('1e0')
    expect(compareGameDecimals(
      stored.carrier.state.research.levelsById['research.money_multiplier'],
      active.carrier.state.research.levelsById['research.money_multiplier'],
    )).toBeGreaterThan(0)
    expect(stored.carrier.state.timeline.researchAutomationTargetIndex).toBe(7)
  })

  test('advances active Skill timers once by raw production seconds', () => {
    const source = carrier(stateWith({
      activeSkillTimer: true,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 2,
    }))
    const result = advanceCanonicalEventTimeV2(request(source, 0.25))
    expect(result.carrier.state.skills.byId.androids?.timerSeconds).toBe(12.25)
    expect(source.state.skills.byId.androids?.timerSeconds).toBe(12)
  })

  test('normalizes all active Skill timers across a stable Fast skip exactly', () => {
    const timerIds = [
      'androids',
      'pocketAndroids',
      'superRadiantScattering',
    ] as const
    const source = carrier(stateWith({
      automationHorizon: 0.125,
      infinityHorizon: 1_000,
      zeroProduction: true,
      storedAvailable: 20,
      storedCapacity: 20,
      activeSkillTimers: timerIds,
      activeSkillTimerSeconds: 12,
    }))
    const fast = advanceCanonicalEventTimeV2(request(source, 14.5, {
      context: context(0.125, 'stored-time-fast-v1'),
      mode: 'stored-time',
    }))
    const raw = advanceCanonicalEventTimeV2(request(source, 14.5, {
      context: context(0.125),
      queuedInputs: Object.freeze([
        queuedInput('disable-fast-skip', 100, 'assembly_lines'),
      ]),
    }))
    expect(fast.status).toBe('completed')
    expect(raw.status).toBe('completed')
    expect(fast.summary.analyticallySkippedAutomationTicks).toBeGreaterThan(0n)
    for (const id of timerIds) {
      expect(fast.carrier.state.skills.byId[id]!.timerSeconds)
        .toBe(raw.carrier.state.skills.byId[id]!.timerSeconds)
    }
    expect(source.state.skills.byId.androids!.timerSeconds).toBe(12)
  })

  test('saturates timer-aware Fast normalization at the bounded maximum', () => {
    const interval = 1 / 1_048_576
    const timerIds = [
      'androids',
      'pocketAndroids',
      'superRadiantScattering',
    ] as const
    const source = carrier(stateWith({
      automationHorizon: interval,
      infinityHorizon: 10,
      zeroProduction: true,
      storedAvailable: 20,
      storedCapacity: 20,
      activeSkillTimers: timerIds,
      activeSkillTimerSeconds: Number.MAX_VALUE,
    }))
    let active = advanceCanonicalEventTimeV2(request(source, interval * 100, {
      context: context(interval),
    }))
    while (active.status === 'yielded') {
      active = resumeCanonicalEventTimeV2(active.continuation!)
    }
    expect(active.status).toBe('completed')
    expect(active.summary.analyticallySkippedAutomationTicks).toBe(0n)
    const started = performance.now()
    const stored = advanceCanonicalEventTimeV2(request(source, 1, {
      context: context(interval, 'stored-time-fast-v1'),
      mode: 'stored-time',
    }))
    expect(stored.status).toBe('stored-time-exhausted')
    expect(stored.remainingSeconds).toBeGreaterThan(0)
    expect(stored.remainingSeconds).toBeLessThanOrEqual(1e-12)
    expect(stored.summary.analyticallySkippedAutomationTicks).toBeGreaterThan(0n)
    for (const id of timerIds) {
      expect(active.carrier.state.skills.byId[id]!.timerSeconds)
        .toBe(Number.MAX_VALUE)
      expect(stored.carrier.state.skills.byId[id]!.timerSeconds)
        .toBe(Number.MAX_VALUE)
    }
    expect(performance.now() - started).toBeLessThan(100)
  })

  test('applies stable same-time queued commands before automation', () => {
    const inputs = Object.freeze([
      queuedInput('assembly-1', 0.0625, 'assembly_lines'),
      queuedInput('assembly-2', 0.0625, 'assembly_lines'),
    ])
    const result = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({
        automationHorizon: 0.0625,
        money: 1e100,
      })),
      0.0625,
      { context: context(0.0625), queuedInputs: inputs },
    ))
    expect(result.status).toBe('completed')
    expect(result.summary.automationTicks).toBe(1n)
    expect(result.summary.boundaryOrder.slice(0, 3)).toEqual([
      'production-arrival', 'queued-input', 'automation',
    ])
    expect(result.summary.boundaryPasses['queued-input']).toBe(1n)
    expect(result.summary.boundaryPasses.automation).toBe(1n)
    expect(compareGameDecimals(
      result.carrier.state.dyson.facilities.assembly_lines[1],
      migrated.state.dyson.facilities.assembly_lines[1],
    )).toBeGreaterThan(0)
    expect(compareGameDecimals(
      result.carrier.state.dyson.facilities.assembly_lines[1],
      gameDecimalFromNumber(2),
    )).toBeGreaterThanOrEqual(0)
  })

  test('applies versioned Quantum purchase and state-derived Entanglement once before automation',()=>{
    const purchaseState=cloneCanonicalGameStateV2({...stateWith({automationHorizon:1,infinityHorizon:100,zeroProduction:true}),quantum:{...migrated.state.quantum,availableShards:gameDecimalFromNumber(10),lifetimeEarnedShards:gameDecimalFromNumber(30)}})
    const purchase=advanceCanonicalEventTimeV2(request(carrier(purchaseState),.1,{queuedInputs:Object.freeze([Object.freeze({id:'quantum-double-ip',horizonSeconds:0,commandVersion:1 as const,commandKind:'quantum-upgrade-purchase' as const,upgradeId:'DoubleIP' as const,requestedMode:'buy-1' as const})])}))
    expect(purchase.carrier.state.quantum.unlocks.doubleInfinityPoints).toBe(true)
    expect(purchase.carrier.revision).toBe(8)
    const entangledState=cloneCanonicalGameStateV2({...stateWith({automationHorizon:1,infinityHorizon:100,zeroProduction:true}),infinity:{...migrated.state.infinity,availablePoints:gameDecimalFromNumber(84),allocatedPoints:GAME_DECIMAL_ZERO},quantum:{...migrated.state.quantum,availableShards:gameDecimalFromNumber(1),lifetimeEarnedShards:gameDecimalFromNumber(1),unlocks:{...migrated.state.quantum.unlocks,quantumEntanglement:true}}}),input=Object.freeze({id:'quantum-action',horizonSeconds:0,commandVersion:1 as const,commandKind:'quantum-action' as const}),first=advanceCanonicalEventTimeV2(request(carrier(entangledState),.1,{materialEventBudget:1,queuedInputs:Object.freeze([input])}))
    expect(first.status).toBe('yielded');expect(first.summary.quantumEntanglementCount).toBe(1n);expect(gameDecimalToCanonicalString(first.summary.quantumAvailableShardsEffective)).toBe('2e0');expect(gameDecimalToCanonicalString(first.summary.quantumInfinityPointsConsumed)).toBe('8.4e1')
    const resumed=resumeCanonicalEventTimeV2(first.continuation!);expect(resumed.status).toBe('completed');expect(resumed.summary.quantumEntanglementCount).toBe(1n);expect(gameDecimalToCanonicalString(resumed.carrier.state.quantum.availableShards)).toBe('3e0');expect(gameDecimalToCanonicalString(resumed.carrier.state.infinity.availablePoints)).toBe('0')
  })

  test('publishes ordinary Quantum reset accounting and rejects duplicate or malformed commands',()=>{
    const resetState=cloneCanonicalGameStateV2({...stateWith({automationHorizon:1,infinityHorizon:100,zeroProduction:true}),infinity:{...migrated.state.infinity,availablePoints:gameDecimalFromNumber(31),allocatedPoints:gameDecimalFromNumber(11)},secretProgress:{completed:true,step:7},quantum:{...migrated.state.quantum,availableShards:gameDecimalFromNumber(2),lifetimeEarnedShards:gameDecimalFromNumber(3),unlocks:{...migrated.state.quantum.unlocks,quantumEntanglement:false}}}),action=Object.freeze({id:'leap',horizonSeconds:0,commandVersion:1 as const,commandKind:'quantum-action' as const}),result=advanceCanonicalEventTimeV2(request(carrier(resetState),.01,{queuedInputs:Object.freeze([action])}))
    expect(result.summary.quantumResetCount).toBe(1n);expect(result.summary.quantumEntanglementCount).toBe(0n);expect(result.summary.quantumResetSkillPointsFinal).toBe(4n);expect(gameDecimalToCanonicalString(result.summary.quantumInfinityPointsConsumed)).toBe('4.2e1');expect(result.carrier.state.infinity.availablePoints).toEqual(GAME_DECIMAL_ZERO);expect(result.carrier.state.infinity.allocatedPoints).toEqual(GAME_DECIMAL_ZERO)
    expect(()=>advanceCanonicalEventTimeV2(request(carrier(resetState),.01,{queuedInputs:Object.freeze([action,action])}))).toThrow(/unique/u)
    expect(()=>advanceCanonicalEventTimeV2(request(carrier(resetState),.01,{queuedInputs:Object.freeze([Object.freeze({...action,extra:true}) as never])}))).toThrow(/declared data fields/u)
  })

  test('orders queued Entanglement before a simultaneous authentic Infinity reset',()=>{const base=stateWith({automationHorizon:1,infinityHorizon:0,infinityCycleSeconds:1,bots:4.2e19,zeroProduction:true,goalStage:10n}),state=cloneCanonicalGameStateV2({...base,infinity:{...base.infinity,availablePoints:gameDecimalFromNumber(84),allocatedPoints:GAME_DECIMAL_ZERO},quantum:{...base.quantum,availableShards:gameDecimalFromNumber(1),lifetimeEarnedShards:gameDecimalFromNumber(1),unlocks:{...base.quantum.unlocks,quantumEntanglement:true}}}),input=Object.freeze({id:'entangle-before-infinity',horizonSeconds:0,commandVersion:1 as const,commandKind:'quantum-action' as const}),source=carrier(state),result=advanceCanonicalEventTimeV2(request(source,.125,{queuedInputs:Object.freeze([input])}));expect(result.status).toBe('completed');expect(result.summary.quantumEntanglementCount).toBe(1n);expect(result.summary.infinityResetCount).toBe(1n);expect(result.summary.boundaryOrder.indexOf('queued-input')).toBeLessThan(result.summary.boundaryOrder.indexOf('infinity-reset'));expect(gameDecimalToCanonicalString(result.carrier.state.quantum.availableShards)).toBe('3e0');expect(result.carrier.state.statistics.lastCompletedCycle.breakInfinity).toBe(false);expect(result.carrier.revision).toBe(source.revision+1)})

  test('invalidates a simultaneous Infinity due bit after an ordinary Quantum leap',()=>{const base=stateWith({automationHorizon:1,infinityHorizon:0,infinityCycleSeconds:1,bots:4.2e19,zeroProduction:true,goalStage:10n}),state=cloneCanonicalGameStateV2({...base,infinity:{...base.infinity,availablePoints:gameDecimalFromNumber(31),allocatedPoints:gameDecimalFromNumber(11)},quantum:{...base.quantum,unlocks:{...base.quantum.unlocks,quantumEntanglement:false}}}),input=Object.freeze({id:'leap-before-infinity',horizonSeconds:0,commandVersion:1 as const,commandKind:'quantum-action' as const}),result=advanceCanonicalEventTimeV2(request(carrier(state),.01,{queuedInputs:Object.freeze([input])}));expect(result.status).toBe('completed');expect(result.summary.quantumResetCount).toBe(1n);expect(result.summary.infinityResetCount).toBe(0n);expect(result.carrier.state.timeline.infinityBoundaryRemaining).toBeGreaterThan(0);expect(result.carrier.state.statistics.lastCompletedCycle.breakInfinity).toBe(false)})

  test('performs bounded goal progression and default-catalog skill auto-assignment before snapshot publication', () => {
    const result = advanceCanonicalEventTimeV2(request(carrier(stateWith({
      bots: 10,
      goalStage: 0n,
      queuedSkill: 'startHereTree',
    })), 0.01))
    expect(result.status).toBe('completed')
    expect(result.summary.goalStagesCompleted).toContain(0n)
    expect(result.carrier.state.dyson.goalStage).toBeGreaterThanOrEqual(1n)
    expect(result.carrier.state.skills.byId.startHereTree?.owned).toBe(true)
  })

  test('blocks canonical Infinity due state even when dormant caller flags are false', () => {
    const zero = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({ infinityHorizon: 0 })),
      0.1,
    ))
    expect(zero).toMatchObject({
      status: 'blocked-unported-event',
      diagnosticCode: 'V2_INFINITY_RESET_NOT_READY',
      consumedSeconds: 0,
    })
    expect(zero.carrier).toBe(zero.carrier)

    const nearer = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({ automationHorizon: 1, infinityHorizon: 0.05 })),
      0.1,
    ))
    expect(nearer).toMatchObject({
      status: 'blocked-unported-event',
      diagnosticCode: 'V2_INFINITY_RESET_NOT_READY',
      consumedSeconds: 0,
    })
  })

  test('commits a ready Infinity boundary after bot-cap handling with one outer revision', () => {
    const source = carrier(stateWith({
      automationHorizon: 1,
      infinityHorizon: 0,
      infinityCycleSeconds: 1,
      bots: 4.2e19,
      zeroProduction: true,
    }))
    const result = advanceCanonicalEventTimeV2(request(source, 0.125))
    expect(result.status).toBe('completed')
    expect(result.carrier.revision).toBe(source.revision + 1)
    expect(result.summary.infinityResetCount).toBe(1n)
    expect(result.summary.lastInfinityResetElapsedSeconds).toBe(0)
    expect(result.summary.boundaryOrder.indexOf('bot-cap-transition'))
      .toBeLessThan(result.summary.boundaryOrder.indexOf('infinity-reset'))
    expect(result.carrier.state.statistics.lifetime.ordinaryInfinityCount)
      .toBe(source.state.statistics.lifetime.ordinaryInfinityCount + 1n)
    expect(result.carrier.state.timeline.infinityCycleSeconds).toBe(0.125)
    expect(source.state.timeline.infinityBoundaryRemaining).toBe(0)
  })

  test('orders simultaneous Dream then Infinity resets without replay', () => {
    const base = stateWith({
      automationHorizon: 1,
      infinityHorizon: 0,
      infinityCycleSeconds: 1,
      bots: 4.2e19,
      zeroProduction: true,
      goalStage: 10n,
    })
    const ready = dreamStateWith(base, {
      stage: 1n,
      resources: { cities: gameDecimalFromNumber(1) },
    })
    const source = carrier(ready)
    const uninterrupted = advanceCanonicalEventTimeV2(request(source, 0.125))
    expect(uninterrupted.status).toBe('completed')
    expect(uninterrupted.carrier.revision).toBe(source.revision + 1)
    expect(uninterrupted.summary).toMatchObject({
      dreamResetCount: 1n,
      dreamMeteorResetCount: 1n,
      infinityResetCount: 1n,
    })
    expect(uninterrupted.carrier.state.dream.resetCount)
      .toBe(source.state.dream.resetCount + 1n)
    expect(gameDecimalToCanonicalString(uninterrupted.carrier.state.dream.strangeMatter))
      .toBe('1e0')
    expect(uninterrupted.carrier.state.statistics.lifetime.meteorDreamResets)
      .toBe(source.state.statistics.lifetime.meteorDreamResets + 1n)
    expect(uninterrupted.carrier.state.statistics.lastCompletedCycle.dreamCause)
      .toBeNull()
    expect(uninterrupted.carrier.runtime).not.toBe(source.runtime)

    let resumed = advanceCanonicalEventTimeV2(request(source, 0.125, {
      materialEventBudget: 1,
    }))
    while (resumed.status === 'yielded') {
      resumed = resumeCanonicalEventTimeV2(resumed.continuation!)
    }
    expect(resumed.carrier).toEqual(uninterrupted.carrier)
    expect(resumed.summary.dreamResetCount).toBe(1n)
    expect(resumed.summary.infinityResetCount).toBe(1n)
  })

  test('clamps only selected sub-1e-12 scheduler countdowns after upward conversion', () => {
    const automation = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({ automationHorizon: 1e-13, infinityHorizon: 1 })),
      1e-12,
      { context: context(1) },
    ))
    expect(automation.status).toBe('completed')
    expect(automation.summary.automationTicks).toBe(1n)
    expect(automation.carrier.state.timeline.automationTimeUntilNextEvent).toBe(1)

    const infinity = advanceCanonicalEventTimeV2(request(
      carrier(stateWith({ automationHorizon: 1, infinityHorizon: 1e-13 })),
      1e-12,
    ))
    expect(infinity).toMatchObject({
      status: 'blocked-unported-event',
      diagnosticCode: 'V2_INFINITY_RESET_NOT_READY',
    })
  })

  test('shares active/stored policy and accounts Double Time exhaustion without an extra publication', () => {
    const source = carrier(stateWith({
      doubleUnlocked: true,
      doubleBank: 0.25,
      doubleRate: 2,
      storedAvailable: 1,
    }))
    const active = advanceCanonicalEventTimeV2(request(source, 0.25))
    const stored = advanceCanonicalEventTimeV2(request(source, 0.25, { mode: 'stored-time' }))
    expect(active.summary).toMatchObject({
      automationPolicy: 'preserve-configured-mode',
      advanceActiveOnlyTinker: true,
      baseSimulationSeconds: 0.25,
      dreamSimulationSeconds: 0.5,
    })
    expect(stored.summary).toMatchObject({
      automationPolicy: 'force-buy-max',
      advanceActiveOnlyTinker: false,
      storedTimeConsumedSeconds: 0.25,
    })
    expect(stored.carrier.state.timeline.storedTimeAvailableSeconds).toBe(0.75)
    expect(active.materialEvents).toBe(1)
  })

  test('cancellation is all-or-nothing and never debits stored time', () => {
    let calls = 0
    const source = carrier(stateWith({ automationHorizon: 0.05, storedAvailable: 1 }))
    const result = advanceCanonicalEventTimeV2(request(source, 0.1, {
      mode: 'stored-time',
      context: context(0.05),
      cancelRequested: () => ++calls > 1,
    }))
    expect(result.status).toBe('cancelled')
    expect(result.carrier).toBe(source)
    expect(result.summary.storedTimeConsumedSeconds).toBe(0)
    expect(result.carrier.revision).toBe(7)
  })

  test('enforces represented progress and the 32-pass zero-time guard', () => {
    const guard = new V2ZeroTimePassGuard()
    expect(() => guard.recordRepresentedOutcome(false)).toThrow('V2_ZERO_TIME_EVENT_NO_PROGRESS')
    for (let index = 0; index < 32; index += 1) guard.recordRepresentedOutcome(true)
    expect(() => guard.recordRepresentedOutcome(true)).toThrow('V2_ZERO_TIME_PASS_LIMIT')
  })

  test('rejects closed-shape/accessor hostility without invoking getters', () => {
    let reads = 0
    const hostile = Object.freeze(Object.defineProperty({}, 'carrier', {
      enumerable: true,
      get: () => {
        reads += 1
        return carrier()
      },
    }))
    expect(() => advanceCanonicalEventTimeV2(
      hostile as unknown as CanonicalEventTimeV2AdvanceRequest,
    )).toThrow(/declared data fields/i)
    expect(reads).toBe(0)

    const forgedContinuation = Object.freeze(Object.defineProperty({}, 'kind', {
      enumerable: true,
      get: () => {
        reads += 1
        return 'canonical-event-time-v2-continuation'
      },
    }))
    expect(() => resumeCanonicalEventTimeV2(
      forgedContinuation as never,
    )).toThrow(/not module-issued/i)
    expect(reads).toBe(0)

    const extraQueue = Object.freeze([
      Object.freeze({ ...queuedInput('x', 0, 'assembly_lines'), extra: true }),
    ])
    expect(() => advanceCanonicalEventTimeV2(request(carrier(), 0.1, {
      queuedInputs: extraQueue as unknown as readonly CanonicalQueuedDysonInputV2[],
    }))).toThrow(/declared data fields/i)
  })

  test('restricts issued timer aggregation authority to Stored Time Fast callers', () => {
    const source = carrier(stateWith())
    expect(() => advanceCanonicalEventTimeV2(request(source, 0.1, {
      context: Object.freeze({
        ...context(),
        timerAggregationAuthority: Object.freeze({
          policy: 'stored-time-fast-v1',
        }),
        quantumEpochAuthority: null,
      }) as never,
    }))).toThrow(/was not issued/i)
    expect(() => advanceCanonicalEventTimeV2(request(source, 0.1, {
      context: context(0.1, 'stored-time-fast-v1'),
      mode: 'active',
    }))).toThrow(/restricted to Stored Time/i)
  })

  test('rejects deeply frozen semantic and closed-shape V2 violations', () => {
    const source = stateWith()
    const invalidGoal = Object.freeze({
      ...source,
      dyson: Object.freeze({ ...source.dyson, goalStage: 11n }),
    }) as CanonicalGameStateV2
    expect(() => advanceCanonicalEventTimeV2(request(carrier(invalidGoal), 0.01)))
      .toThrow(/goal stage must be from 0 through 10/i)

    const extra = Object.freeze({ ...source, extra: true }) as unknown as CanonicalGameStateV2
    expect(() => advanceCanonicalEventTimeV2(request(carrier(extra), 0.01)))
      .toThrow(/exactly the declared closed keys/i)
  })

  test.each([0, -1, 1.5, 129, Number.MAX_SAFE_INTEGER])(
    'rejects hostile material-event budget %s',
    (materialEventBudget) => {
      expect(() => advanceCanonicalEventTimeV2(request(carrier(), 0.01, {
        materialEventBudget,
      }))).toThrow(/material-event budget must be a safe integer from 1 through 128/i)
    },
  )

  test('requires the material-event budget as a closed request field', () => {
    const complete = request(carrier(), 0.01)
    const {
      materialEventBudget: _materialEventBudget,
      ...missingBudget
    } = complete
    expect(() => advanceCanonicalEventTimeV2(
      Object.freeze(missingBudget) as unknown as CanonicalEventTimeV2AdvanceRequest,
    )).toThrow(/exactly its declared data fields/i)
  })

  test('preserves immutable source branches and Decimal snapshots beyond Number range', () => {
    const baseline = stateWith({ money: 1e300 })
    const source = carrier(cloneCanonicalGameStateV2({
      ...baseline,
      dyson: {
        ...baseline.dyson,
        goalStage: 10n,
        facilities: {
          ...baseline.dyson.facilities,
          assembly_lines: Object.freeze([
            gameDecimalFromCanonicalString('1e400'),
            baseline.dyson.facilities.assembly_lines[1],
          ]),
        },
      },
    }))
    const skills = source.state.skills
    const statistics = source.state.statistics
    const before = gameDecimalToCanonicalString(source.state.dyson.money)
    const result = advanceCanonicalEventTimeV2(request(source, 0.01))
    expect(gameDecimalToCanonicalString(source.state.dyson.money)).toBe(before)
    expect(result.carrier.state.skills).toBe(skills)
    expect(result.carrier.state.statistics).not.toBe(statistics)
    expect(Object.isFrozen(result.carrier.state)).toBe(true)
    expect(Object.values(result.carrier.runtime.dysonEvaluationSnapshot)
      .every((value) => Object.isFrozen(value))).toBe(true)
    expect(result.carrier.runtime.dysonEvaluationSnapshot.panelsPerSecond.exponent)
      .toBeGreaterThan(308)
  })

  test('characterizes warmed endpoint advancement below the 100ms budget', () => {
    const source = carrier()
    advanceCanonicalEventTimeV2(request(source, 0.01))
    const samples = Array.from({ length: 7 }, () => {
      const started = performance.now()
      advanceCanonicalEventTimeV2(request(source, 0.01))
      return performance.now() - started
    }).sort((left, right) => left - right)
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!
    expect(p95).toBeLessThan(100)
  })

  test('analytically skips exact stable force-max cycles without work proportional to tick count', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.05,
      infinityHorizon: 1_000,
      storedAvailable: 200,
      storedCapacity: 200,
      zeroProduction: true,
      goalStage: 10n,
    }))
    advanceCanonicalEventTimeV2(request(source, 0.01, {
      cancelRequested: () => true,
    }))
    const started = performance.now()
    const result = advanceCanonicalEventTimeV2(request(source, 100.01, {
      mode: 'stored-time',
      context: context(0.05),
    }))
    const elapsed = performance.now() - started
    expect(result.status).toBe('completed')
    expect(result.summary.analyticallySkippedAutomationTicks).toBeGreaterThan(1_000n)
    expect(result.summary.automationPolicy).toBe('force-buy-max')
    expect(result.carrier.state.timeline.dysonAutomationTargetIndex)
      .toBe(source.state.timeline.dysonAutomationTargetIndex)
    expect(elapsed).toBeLessThan(100)
  })

  test('retains one outer publication revision across bounded-yield continuation', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 1,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 1,
    }))
    const first = advanceCanonicalEventTimeV2(request(source, 0.13, {
      context: context(0.001),
    }))
    expect(first.status).toBe('yielded')
    expect(first.carrier.revision).toBe(source.revision)
    expect(first.carrier).toBe(source)
    expect(first.remainingSeconds).toBeGreaterThan(0)
    expect(first.continuation).toBeDefined()

    const completed = resumeCanonicalEventTimeV2(first.continuation!)
    expect(completed.status).toBe('completed')
    expect(completed.carrier.revision).toBe(source.revision + 1)
  })

  test('rebases a processed queue across yield without replaying its command', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 1,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 1,
      zeroProduction: true,
      money: 1e100,
      goalStage: 10n,
    }))
    const first = advanceCanonicalEventTimeV2(request(source, 0.13, {
      context: context(0.001),
      queuedInputs: Object.freeze([
        queuedInput('once', 0, 'assembly_lines'),
      ]),
    }))
    expect(first.status).toBe('yielded')
    const completed = resumeCanonicalEventTimeV2(first.continuation!)
    expect(completed.status).toBe('completed')
    expect(compareGameDecimals(
      completed.carrier.state.dyson.facilities.assembly_lines[1],
      gameDecimalFromNumber(1),
    )).toBe(0)
    expect(completed.carrier.revision).toBe(source.revision + 1)
  })

  test('seals authentic material boundaries and restarts acknowledged checkpoints exactly', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 1,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 1,
      zeroProduction: true,
      money: 1e100,
      goalStage: 10n,
    }))
    const inputs = Object.freeze([queuedInput('once', 0, 'assembly_lines')])
    const run = (
      materialEventBudget: number,
      checkpointEveryYield: number,
    ): Readonly<{
      result: Readonly<CanonicalEventTimeV2AdvanceResult>
      checkpoints: number
    }> => {
      let result = advanceCanonicalEventTimeV2(request(source, 0.009, {
        context: context(0.001),
        queuedInputs: inputs,
        materialEventBudget,
      }))
      let yields = 0
      let checkpoints = 0
      while (result.status === 'yielded') {
        yields += 1
        if (yields % checkpointEveryYield !== 0) {
          result = resumeCanonicalEventTimeV2(result.continuation!)
          continue
        }
        const seal = sealCanonicalEventTimeV2MaterialBoundary(
          result.continuation!,
        )
        expect(seal.originRevision).toBe(source.revision)
        expect(seal.acknowledgedBaseRevision).toBe(
          source.revision + checkpoints,
        )
        expect(seal.remainingSeconds).toBeGreaterThan(0)
        expect(seal.remainingQueuedInputs.map((input) => input.id)).not
          .toContain('once')
        expect(Object.isFrozen(seal)).toBe(true)
        expect(Object.isFrozen(seal.summary.boundaryPasses)).toBe(true)
        const acknowledged = Object.freeze({
          ...seal.carrier,
          revision: seal.acknowledgedBaseRevision + 1,
        })
        checkpoints += 1
        result = resumeCanonicalEventTimeV2FromAcknowledgedSeal(
          seal,
          acknowledged,
        )
      }
      return Object.freeze({ result, checkpoints })
    }

    const uninterrupted = run(128, 1)
    const checkpointEveryYield = run(1, 1)
    const alternatingCheckpoints = run(1, 2)
    const oneCheckpoint = run(8, 1)
    for (const candidate of [
      checkpointEveryYield,
      alternatingCheckpoints,
      oneCheckpoint,
    ]) {
      expect(candidate.result.status).toBe('completed')
      expect(candidate.result.carrier.state).toEqual(
        uninterrupted.result.carrier.state,
      )
      expect(candidate.result.carrier.runtime).toEqual(
        uninterrupted.result.carrier.runtime,
      )
      expect(candidate.result.summary).toEqual(uninterrupted.result.summary)
      expect(candidate.result.carrier.revision).toBe(
        source.revision + candidate.checkpoints + 1,
      )
      expect(encodeSchema13WebSave({
        savedAtUtc: '2026-08-08T00:00:00.000Z',
        state: candidate.result.carrier.state,
        runtime: candidate.result.carrier.runtime,
      })).toBe(encodeSchema13WebSave({
        savedAtUtc: '2026-08-08T00:00:00.000Z',
        state: uninterrupted.result.carrier.state,
        runtime: uninterrupted.result.carrier.runtime,
      }))
      expect(compareGameDecimals(
        candidate.result.carrier.state.dyson.facilities.assembly_lines[1],
        gameDecimalFromNumber(1),
      )).toBe(0)
    }
    expect(uninterrupted.checkpoints).toBe(0)
    expect(checkpointEveryYield.checkpoints).toBeGreaterThan(1)
    expect(oneCheckpoint.checkpoints).toBe(1)
  })

  test('rejects forged and reused material-boundary tokens without invoking getters', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 1,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 1,
    }))
    const yielded = advanceCanonicalEventTimeV2(request(source, 0.003, {
      context: context(0.001),
      materialEventBudget: 1,
    }))
    expect(yielded.status).toBe('yielded')
    const seal = sealCanonicalEventTimeV2MaterialBoundary(
      yielded.continuation!,
    )
    expect(() => sealCanonicalEventTimeV2MaterialBoundary(
      yielded.continuation!,
    )).toThrow(/module-issued continuation/i)
    expect(() => resumeCanonicalEventTimeV2(yielded.continuation!)).toThrow(
      /module-issued/i,
    )

    let getterCalls = 0
    const forged = Object.freeze(Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() {
        getterCalls += 1
        return 'canonical-event-time-v2-material-boundary-seal'
      },
    }))
    expect(() => resumeCanonicalEventTimeV2FromAcknowledgedSeal(
      forged as never,
      source,
    )).toThrow(/module-issued material-boundary seal/i)
    expect(getterCalls).toBe(0)

    const acknowledged = Object.freeze({
      ...seal.carrier,
      revision: seal.acknowledgedBaseRevision + 1,
    })
    resumeCanonicalEventTimeV2FromAcknowledgedSeal(seal, acknowledged)
    expect(() => resumeCanonicalEventTimeV2FromAcknowledgedSeal(
      seal,
      acknowledged,
    )).toThrow(/module-issued material-boundary seal/i)

    const wrongRevisionYield = advanceCanonicalEventTimeV2(request(source, 0.003, {
      context: context(0.001),
      materialEventBudget: 1,
    }))
    const wrongRevisionSeal = sealCanonicalEventTimeV2MaterialBoundary(
      wrongRevisionYield.continuation!,
    )
    expect(() => resumeCanonicalEventTimeV2FromAcknowledgedSeal(
      wrongRevisionSeal,
      wrongRevisionSeal.carrier,
    )).toThrow(/increment.*exactly once/i)
    expect(() => resumeCanonicalEventTimeV2FromAcknowledgedSeal(
      wrongRevisionSeal,
      acknowledged,
    )).toThrow(/module-issued material-boundary seal/i)
  })

  test('budget 1, 8, and 128 yields are publication-equivalent with stable queue behavior', () => {
    const source = carrier(stateWith({
      automationHorizon: 0.001,
      infinityHorizon: 1,
      doubleUnlocked: true,
      doubleBank: 1,
      doubleRate: 1,
      zeroProduction: true,
      money: 1e100,
      goalStage: 10n,
    }))
    const inputs = Object.freeze([queuedInput('once', 0, 'assembly_lines')])
    advanceCanonicalEventTimeV2(request(source, 0.001, {
      cancelRequested: () => true,
    }))

    const drain = (materialEventBudget: number): Readonly<{
      result: Readonly<CanonicalEventTimeV2AdvanceResult>
      chunkMilliseconds: readonly number[]
    }> => {
      const chunkMilliseconds: number[] = []
      let started = performance.now()
      let result = advanceCanonicalEventTimeV2(request(source, 0.02, {
        context: context(0.001),
        queuedInputs: inputs,
        materialEventBudget,
      }))
      chunkMilliseconds.push(performance.now() - started)
      while (result.status === 'yielded') {
        started = performance.now()
        result = resumeCanonicalEventTimeV2(result.continuation!)
        chunkMilliseconds.push(performance.now() - started)
      }
      return Object.freeze({
        result,
        chunkMilliseconds: Object.freeze(chunkMilliseconds),
      })
    }

    const one = drain(1)
    const eight = drain(8)
    const maximum = drain(128)
    for (const candidate of [one, eight, maximum]) {
      expect(candidate.result.status).toBe('completed')
      expect(candidate.result.carrier.revision).toBe(source.revision + 1)
      expect(compareGameDecimals(
        candidate.result.carrier.state.dyson.facilities.assembly_lines[1],
        gameDecimalFromNumber(1),
      )).toBe(0)
    }
    expect(eight.result.carrier).toEqual(one.result.carrier)
    expect(maximum.result.carrier).toEqual(one.result.carrier)
    expect(eight.result.summary).toEqual(one.result.summary)
    expect(maximum.result.summary).toEqual(one.result.summary)
    expect(Math.max(...one.chunkMilliseconds)).toBeLessThan(100)
    expect(Math.max(...eight.chunkMilliseconds)).toBeLessThan(100)
    expect(Math.max(...maximum.chunkMilliseconds)).toBeLessThan(100)
  })
})
