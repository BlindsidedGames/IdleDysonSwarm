import { describe, expect, test } from 'vitest'

import {
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  type GameDecimal,
} from '../math/gameDecimal'
import { V2_EVENT_BOUNDARY_ORDER } from './eventTimeV2'
import {
  STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT_V2,
  STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2,
  STORED_TIME_FAST_MAXIMUM_GROUPS_V2,
  STORED_TIME_MAXIMUM_DURATION_SECONDS_V2,
  STORED_TIME_POLICY_SUPPORT_V2,
  createStoredTimePolicyBudgetStateV2,
  createStoredTimeRepresentativeGroupExecutionV2,
  observeStoredTimePolicyBudgetV2,
  partitionStoredTimeRepresentativeGroupsV2,
  planStoredTimePolicyV2,
  type StoredTimeHardEventV2,
  type StoredTimeNonAutomationBoundaryPhaseV2,
  type StoredTimePolicyIdV2,
  type StoredTimePolicyPlanRequestV2,
} from './storedTimePolicyV2'

function hardEvent(
  id: string,
  horizonSeconds: number,
  boundaryPhase: StoredTimeNonAutomationBoundaryPhaseV2 =
    'derived-timers-and-double-time',
): Readonly<StoredTimeHardEventV2> {
  return Object.freeze({ id, horizonSeconds, boundaryPhase })
}

function decimalText(value: GameDecimal): string {
  return gameDecimalToCanonicalString(value)
}

function request(options: Readonly<{
  policyId?: StoredTimePolicyIdV2
  duration?: number
  horizon?: number
  interval?: number
  targetIndex?: number
  hardEvents?: readonly Readonly<StoredTimeHardEventV2>[]
}> = {}): Readonly<StoredTimePolicyPlanRequestV2> {
  return Object.freeze({
    policyId: options.policyId ?? 'stored-time-fast-v1',
    policyVersion: 1,
    requestedDurationSeconds: options.duration ?? 0.35,
    initialAutomationHorizonSeconds: options.horizon ?? 0.05,
    automationIntervalSeconds: options.interval ?? 0.05,
    initialAutomationTargetIndex: options.targetIndex ?? 2,
    hardEvents: options.hardEvents ?? Object.freeze([]),
  })
}

describe('stored-time V2 policy core', () => {
  test('owns one closed immutable policy ID/version source', () => {
    expect(STORED_TIME_POLICY_SUPPORT_V2).toEqual([
      { id: 'stored-time-fast-v1', version: 1 },
      { id: 'stored-time-balanced-v1', version: 1 },
      { id: 'stored-time-exact-v1', version: 1 },
    ])
    expect(Object.isFrozen(STORED_TIME_POLICY_SUPPORT_V2)).toBe(true)
    expect(STORED_TIME_POLICY_SUPPORT_V2.every(Object.isFrozen)).toBe(true)
  })

  test('forces every policy through exact raw replay at 4096 boundaries or fewer', () => {
    const plans = STORED_TIME_POLICY_SUPPORT_V2.map(({ id }) =>
      planStoredTimePolicyV2(request({ policyId: id }))
    )
    for (const plan of plans) {
      expect(plan.executionKind).toBe('exact-raw-ticks')
      expect(plan.automaticExact).toBe(true)
      expect(plan.rawAutomationBoundaries).toBe(7n)
      expect(plan.representativeAutomationBoundaries).toBe(7n)
      expect(plan.omittedAutomationBoundaries).toBe(0n)
      expect(decimalText(plan.prefix)).toBe('5e-2')
      expect(decimalText(plan.finalRemainder)).toBe('0')
      expect(decimalText(plan.finalRawAutomationTimeUntilNextEvent)).toBe('5e-2')
      expect(plan.finalRawAutomationTargetIndex).toBe(1)
      expect(plan.finalPlannedAutomationTargetIndex).toBe(1)
      expect(plan.groups).toEqual([])
    }
    expect(plans.find((plan) =>
      plan.policyId === 'stored-time-balanced-v1'
    )?.balancedWallBudgetMilliseconds).toBe(
      STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2,
    )

    const threshold = planStoredTimePolicyV2(request({
      duration: Number(STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT_V2),
      horizon: 1,
      interval: 1,
    }))
    expect(threshold.rawAutomationBoundaries).toBe(4_096n)
    expect(threshold.executionKind).toBe('exact-raw-ticks')
  })

  test('normalizes Fast with chronological q/r assignment and exact raw phase contracts', () => {
    const plan = planStoredTimePolicyV2(request({
      duration: 250,
      horizon: 0.05,
      interval: 0.05,
      targetIndex: 3,
    }))
    expect(plan.executionKind).toBe('fast-representative-groups')
    expect(plan.rawAutomationBoundaries).toBe(5_000n)
    expect(plan.groups).toHaveLength(STORED_TIME_FAST_MAXIMUM_GROUPS_V2)
    expect(plan.representativeAutomationBoundaries).toBe(4_096n)
    expect(plan.omittedAutomationBoundaries).toBe(904n)
    expect(plan.groups.slice(0, 904).every((group) =>
      group.logicalRawTicks === 2n
    )).toBe(true)
    expect(plan.groups.slice(904).every((group) =>
      group.logicalRawTicks === 1n
    )).toBe(true)
    expect(plan.groups[0]).toMatchObject({
      capturesRatesAtStart: true,
      executesOneAutomationAtEnd: true,
      advancesTargetIndexOnce: true,
    })
    expect(decimalText(plan.groups[0].startsAt)).toBe('0')
    expect(decimalText(plan.groups[0].continuousDuration)).toBe('1e-1')
    expect(decimalText(plan.groups[0].endsAt)).toBe('1e-1')
    expect(decimalText(plan.groups.at(-1)!.endsAt)).toBe('2.5e2')
    expect(decimalText(plan.finalRemainder)).toBe('0')
    expect(decimalText(plan.finalRawAutomationTimeUntilNextEvent)).toBe('5e-2')
    expect(plan.finalRawAutomationTargetIndex).toBe(3)
    expect(plan.finalPlannedAutomationTargetIndex).toBe(3)
    expect(plan.omittedTicksPurchaseNothing).toBe(true)
    expect(plan.omittedTicksDoNotRotateTarget).toBe(true)
  })

  test('keeps an initial due-now automation exact before positive Fast grouping', () => {
    const exact = planStoredTimePolicyV2(request({
      duration: 0.2,
      horizon: 0,
      interval: 0.1,
      targetIndex: 0,
    }))
    expect(exact.initialDueBoundary).toBe(true)
    expect(exact.rawAutomationBoundaries).toBe(3n)
    expect(exact.futureAutomationBoundaries).toBe(2n)
    expect(decimalText(exact.prefix)).toBe('1e-1')
    expect(exact.finalRawAutomationTargetIndex).toBe(3)

    const fast = planStoredTimePolicyV2(request({
      duration: 5_000,
      horizon: 0,
      interval: 1,
      targetIndex: 0,
    }))
    expect(fast.initialDueBoundary).toBe(true)
    expect(fast.rawAutomationBoundaries).toBe(5_001n)
    expect(fast.groups).toHaveLength(4_096)
    expect(fast.representativeAutomationBoundaries).toBe(4_097n)
    expect(fast.groups.every((group) =>
      compareGameDecimals(group.continuousDuration, gameDecimalFromNumber(0)) > 0
    )).toBe(true)
  })

  test('plans a full-bank tiny interval in O(4096) without narrowing logical ticks', () => {
    const plan = planStoredTimePolicyV2(request({
      duration: STORED_TIME_MAXIMUM_DURATION_SECONDS_V2,
      horizon: 1e-12,
      interval: 1e-12,
    }))
    expect(plan.rawAutomationBoundaries).toBe(42_000_000_000_000_000_000n)
    expect(plan.groups).toHaveLength(4_096)
    expect(plan.groups.reduce(
      (total, group) => total + group.logicalRawTicks,
      0n,
    )).toBe(plan.rawAutomationBoundaries)
    const smallest = plan.groups.at(-1)!.logicalRawTicks
    const largest = plan.groups[0].logicalRawTicks
    expect(largest - smallest).toBeLessThanOrEqual(1n)
  })

  test('keeps long fractional bank geometry Decimal-native and remainder-exact', () => {
    const duration = 12_345_678.901234567
    const plan = planStoredTimePolicyV2(request({
      duration,
      horizon: 1e-12,
      interval: 1e-12,
    }))
    expect(plan.groups).toHaveLength(STORED_TIME_FAST_MAXIMUM_GROUPS_V2)
    for (let index = 1; index < plan.groups.length; index += 1) {
      expect(compareGameDecimals(
        plan.groups[index - 1].endsAt,
        plan.groups[index].startsAt,
      )).toBe(0)
    }
    const terminal = plan.groups.at(-1)!.endsAt
    expect(compareGameDecimals(
      addGameDecimals(terminal, plan.finalRemainder),
      gameDecimalFromNumber(duration),
    )).toBe(0)
    expect(compareGameDecimals(
      plan.groups.at(-1)!.remainingRequestedDurationAfter,
      plan.finalRemainder,
    )).toBe(0)
    expect(compareGameDecimals(
      plan.requestedDuration,
      gameDecimalFromNumber(duration),
    )).toBe(0)
    expect(compareGameDecimals(
      terminal,
      gameDecimalFromNumber(duration),
    )).toBeLessThanOrEqual(0)
    expect(plan.groups.every((group) =>
      Object.isFrozen(group.startsAt) &&
      Object.isFrozen(group.continuousDuration) &&
      Object.isFrozen(group.endsAt)
    )).toBe(true)
  })

  test('is invariant under downstream 1/8/128 group partitions', () => {
    const plan = planStoredTimePolicyV2(request({
      duration: 250,
      horizon: 0.05,
      interval: 0.05,
    }))
    for (const size of [1, 8, 128]) {
      const flattened = partitionStoredTimeRepresentativeGroupsV2(
        plan,
        size,
      ).flat()
      expect(flattened).toEqual(plan.groups)
    }
    expect(planStoredTimePolicyV2(request({
      duration: 250,
      horizon: 0.05,
      interval: 0.05,
    }))).toEqual(plan)
  })

  test('orders coincident hard events canonically around representative automation', () => {
    const plan = planStoredTimePolicyV2(request({
      duration: 250.025,
      horizon: 0.05,
      interval: 0.05,
      hardEvents: Object.freeze([
        hardEvent('infinity', 0.1, 'infinity-reset'),
        hardEvent('queued-a', 0.1, 'queued-input'),
        hardEvent('derived', 0.1, 'derived-timers-and-double-time'),
        hardEvent('production', 0.1, 'production-arrival'),
        hardEvent('bot', 0.1, 'bot-cap-transition'),
        hardEvent('queued-Z', 0.1, 'queued-input'),
        hardEvent('dream', 0.1, 'dream-reset'),
        hardEvent('inside-next', 0.15),
        hardEvent('final-remainder', 250.01),
      ]),
    }))
    expect(plan.hardEventSplits.slice(0, 7).map((event) => [
      event.id,
      event.boundaryPhase,
      event.boundaryOrder,
    ])).toEqual([
      ['production', 'production-arrival', 0],
      ['queued-Z', 'queued-input', 1],
      ['queued-a', 'queued-input', 1],
      ['derived', 'derived-timers-and-double-time', 3],
      ['dream', 'dream-reset', 4],
      ['bot', 'bot-cap-transition', 5],
      ['infinity', 'infinity-reset', 6],
    ])
    for (const event of plan.hardEventSplits.slice(0, 7)) {
      expect(event.phase).toBe('representative-group')
      expect(event.groupIndex).toBe(0)
      expect(decimalText(event.offsetWithinPhase)).toBe('1e-1')
      expect(event.coincidentWithRepresentativeBoundary).toBe(true)
      expect(event.createsRepresentativeAutomation).toBe(false)
    }
    expect(plan.hardEventSplits.at(-2)).toMatchObject({
      id: 'inside-next',
      phase: 'representative-group',
      groupIndex: 1,
      createsRepresentativeAutomation: false,
    })
    expect(decimalText(plan.hardEventSplits.at(-2)!.offsetWithinPhase)).toBe('5e-2')
    expect(plan.hardEventSplits.at(-1)).toMatchObject({
      id: 'final-remainder',
      phase: 'final-remainder',
      groupIndex: null,
      createsRepresentativeAutomation: false,
    })
    expect(decimalText(plan.hardEventSplits.at(-1)!.offsetWithinPhase)).toBe('1e-2')
    const first = createStoredTimeRepresentativeGroupExecutionV2(plan, 0)
    expect(first.boundaryOrder).toBe(V2_EVENT_BOUNDARY_ORDER)
    expect(first.segments).toHaveLength(1)
    expect(decimalText(first.segments[0].duration)).toBe('1e-1')
    expect(first.segments[0].preRepresentativeAutomationEvents.map(
      (event) => event.id,
    )).toEqual(['production', 'queued-Z', 'queued-a'])
    expect(first.segments[0].executesRepresentativeAutomationAtTerminal).toBe(true)
    expect(first.segments[0].postRepresentativeAutomationEvents.map(
      (event) => event.id,
    )).toEqual(['derived', 'dream', 'bot', 'infinity'])
    expect(
      first.segments[0].appliesGoalTransitionsAndSnapshotAtDerivedPhase,
    ).toBe(true)
    expect(first.segments[0].goalTransitionsAndSnapshotPhase).toBe(
      'derived-timers-and-double-time',
    )
    expect(first.segments[0].recaptureRatesAfterTerminalEvents).toBe(true)
    expect(first).toMatchObject({
      executeOneRepresentativeAutomation: true,
      advanceTargetIndexOnce: true,
      applyGoalTransitionsAfterAutomation: true,
      recaptureRatesForNextGroup: true,
    })
    expect(first.logicalRawTicks).toBe(2n)
    expect(first.omittedRawTicks).toBe(1n)
  })

  test('keeps Balanced and Exact on raw replay with an injected monotonic budget only', () => {
    const balancedPlan = planStoredTimePolicyV2(request({
      policyId: 'stored-time-balanced-v1',
      duration: 250,
      horizon: 0.05,
      interval: 0.05,
    }))
    const exactPlan = planStoredTimePolicyV2(request({
      policyId: 'stored-time-exact-v1',
      duration: 250,
      horizon: 0.05,
      interval: 0.05,
    }))
    expect(balancedPlan.executionKind).toBe('exact-raw-ticks')
    expect(balancedPlan.balancedWallBudgetMilliseconds).toBe(
      STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2,
    )
    expect(exactPlan.executionKind).toBe('exact-raw-ticks')
    expect(exactPlan.balancedWallBudgetMilliseconds).toBeNull()

    const started = createStoredTimePolicyBudgetStateV2(
      'stored-time-balanced-v1',
      1_000,
    )
    const warming = observeStoredTimePolicyBudgetV2(started, 60_999)
    expect(warming.expired).toBe(false)
    const expired = observeStoredTimePolicyBudgetV2(warming, 61_000)
    expect(expired).toMatchObject({
      elapsedMilliseconds: 60_000,
      expired: true,
    })
    expect(() => observeStoredTimePolicyBudgetV2(expired, 60_999)).toThrow(
      /backwards/i,
    )
    const exactBudget = observeStoredTimePolicyBudgetV2(
      createStoredTimePolicyBudgetStateV2('stored-time-exact-v1', 0),
      1_000_000,
    )
    expect(exactBudget.limitMilliseconds).toBeNull()
    expect(exactBudget.expired).toBe(false)
  })

  test('rejects hostile planner, refinement, and budget shapes without invoking getters', () => {
    expect(() => planStoredTimePolicyV2(Object.freeze({
      ...request(),
      extra: true,
    }) as never)).toThrow(/exactly its declared/i)
    expect(() => planStoredTimePolicyV2(Object.freeze({
      ...request(),
      policyVersion: 2,
    }) as never)).toThrow(/unsupported/i)
    expect(() => planStoredTimePolicyV2(request({ interval: 1e-13 }))).toThrow(
      /interval.*closed bounds/i,
    )
    expect(() => planStoredTimePolicyV2(request({ horizon: -0 }))).toThrow(
      /horizon.*closed bounds/i,
    )
    expect(() => planStoredTimePolicyV2(request({
      hardEvents: Object.freeze([
        hardEvent('duplicate', 0.1),
        hardEvent('duplicate', 0.2),
      ]),
    }))).toThrow(/unique/i)
    expect(() => planStoredTimePolicyV2(request({
      hardEvents: Object.freeze([
        Object.freeze({
          id: 'not-a-hard-event',
          horizonSeconds: 0.1,
          boundaryPhase: 'automation',
        }) as never,
      ]),
    }))).toThrow(/non-automation boundary phase/i)

    const alteredPrototype = Object.create(Array.prototype) as unknown[]
    let arrayPrototypeGetterCalls = 0
    Object.defineProperty(alteredPrototype, '0', {
      get() {
        arrayPrototypeGetterCalls += 1
        return hardEvent('inherited', 0.1)
      },
    })
    const hostileArray: unknown[] = []
    hostileArray.length = 1
    Object.setPrototypeOf(hostileArray, alteredPrototype)
    Object.freeze(hostileArray)
    expect(() => planStoredTimePolicyV2(request({
      hardEvents: hostileArray as readonly Readonly<StoredTimeHardEventV2>[],
    }))).toThrow(/bounded frozen array/i)
    expect(arrayPrototypeGetterCalls).toBe(0)

    let getterCalls = 0
    const hostile = Object.freeze(Object.defineProperty({}, 'policyId', {
      enumerable: true,
      get() {
        getterCalls += 1
        return 'stored-time-fast-v1'
      },
    }))
    expect(() => planStoredTimePolicyV2(hostile as never)).toThrow()
    expect(getterCalls).toBe(0)
    expect(() => createStoredTimeRepresentativeGroupExecutionV2(
      Object.freeze({}) as never,
      0,
    )).toThrow(/module-issued/i)
    expect(() => partitionStoredTimeRepresentativeGroupsV2(
      planStoredTimePolicyV2(request({ duration: 250 })),
      0,
    )).toThrow(/partition size/i)
  })
})
