import { describe, expect, test } from 'vitest'
import {
  STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT,
  STORED_TIME_FAST_MAXIMUM_GROUPS,
  planStoredTimePolicy,
} from './storedTimePolicy'

describe('Stored Time policy', () => {
  test('keeps small requests exact', () => {
    const plan = planStoredTimePolicy({
      requestedSeconds: 60,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
    })

    expect(plan).toMatchObject({
      executionKind: 'exact',
      rawAutomationBoundaries: 600,
      representativeAutomationBoundaries: 600,
      omittedAutomationBoundaries: 0,
    })
  })

  test('bounds the maximum bank independently of raw tick count', () => {
    const plan = planStoredTimePolicy({
      requestedSeconds: 42_000_000,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
    })

    expect(plan.executionKind).toBe('representative-groups')
    expect(plan.rawAutomationBoundaries).toBe(420_000_000)
    expect(plan.groups).toHaveLength(STORED_TIME_FAST_MAXIMUM_GROUPS)
    expect(plan.representativeAutomationBoundaries).toBe(4_096)
    expect(plan.omittedAutomationBoundaries).toBe(419_995_904)
    expect(
      plan.groups.reduce((total, group) => total + group.logicalRawTicks, 0),
    ).toBe(plan.rawAutomationBoundaries)
    expect(
      plan.groups.reduce((total, group) => total + group.durationSeconds, 0) +
        plan.finalRemainderSeconds,
    ).toBeCloseTo(42_000_000, 6)
  })

  test('switches only after the automatic exact boundary limit', () => {
    const exact = planStoredTimePolicy({
      requestedSeconds: STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
    })
    const fast = planStoredTimePolicy({
      requestedSeconds: STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT + 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
    })

    expect(exact.executionKind).toBe('exact')
    expect(fast.executionKind).toBe('representative-groups')
  })
})
