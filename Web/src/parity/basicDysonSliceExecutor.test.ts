import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { createSimulationSummary } from '../simulation/types'
import {
  createBasicDysonState,
  type BasicDysonState,
} from '../simulation/dysonModel'
import type { BasicDysonSliceState } from '../simulation/basicDysonSliceEngine'
import { BasicDysonSliceParityExecutor } from './basicDysonSliceExecutor'
import { executeParityFixture, type ParityFixture } from './fixture'

interface GoldenFixture {
  readonly tickSeconds: number
  readonly initialState: Omit<BasicDysonState, 'rates'> & {
    readonly rates: BasicDysonState['rates']
  }
  readonly afterTwoTicks: Partial<BasicDysonState>
}

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../test/parity/dyson-no-skills-two-ticks.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as GoldenFixture

describe('Basic Dyson public-engine parity slice', () => {
  test('routes the two-tick Unity fixture through transactional publication', () => {
    const initialState: BasicDysonSliceState = {
      model: createBasicDysonState(fixture.initialState),
      automationTimeUntilNextEvent: fixture.tickSeconds,
      lastAdvanceSummary: createSimulationSummary(),
    }
    const before = structuredClone(initialState)
    const parityFixture: ParityFixture<BasicDysonSliceState, never> = {
      name: 'basic Dyson two-tick public-engine parity',
      source: 'unity-golden-master',
      initialState,
      commands: [],
      elapsedMilliseconds: fixture.tickSeconds * 2 * 1000,
      expectedState: initialState,
    }

    const actual = executeParityFixture(
      parityFixture,
      new BasicDysonSliceParityExecutor({
        automationIntervalSeconds: fixture.tickSeconds,
      }),
    )

    expectContinuous(actual.model, fixture.afterTwoTicks)
    expect(actual.automationTimeUntilNextEvent).toBeCloseTo(
      fixture.tickSeconds,
      14,
    )
    expect(actual.lastAdvanceSummary.ordinaryInfinityCount).toBe(0n)
    expect(actual.lastAdvanceSummary.breakInfinityCount).toBe(0n)
    expect(initialState).toEqual(before)
  })
})

function expectContinuous(actual: unknown, expected: unknown): void {
  if (typeof expected === 'number') {
    expect(actual).toBeCloseTo(expected, 14)
    return
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true)
    expected.forEach((value, index) =>
      expectContinuous((actual as unknown[])[index], value),
    )
    return
  }
  if (expected !== null && typeof expected === 'object') {
    for (const [key, value] of Object.entries(expected)) {
      expectContinuous((actual as Record<string, unknown>)[key], value)
    }
    return
  }
  expect(actual).toEqual(expected)
}
