import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  BasicDysonSimulationModel,
  breakInfinityBotThreshold,
  createBasicDysonState,
  infinityPointsForBots,
  ordinaryInfinityBotThreshold,
  type BasicDysonState,
  type BasicDysonStateInput,
} from './dysonModel'
import { advanceEventTime } from './eventTime'

interface GoldenFixture {
  readonly tickSeconds: number
  readonly initialState: Omit<BasicDysonState, 'rates'> & {
    readonly rates: BasicDysonState['rates']
  }
  readonly afterOneTick: Partial<BasicDysonState>
  readonly afterTwoTicks: Partial<BasicDysonState>
}

interface StaticSkillFixture {
  readonly tickSeconds: number
  readonly ownedSkills: string[]
  readonly initialRates: BasicDysonState['rates']
  readonly botsAfterOneTick: number
  readonly assemblyLinesAfterOneTick: number
}

interface InfinityBoundaryFixture {
  readonly ordinaryRequirement: number
  readonly division19Requirement: number
  readonly exponent: number
  readonly breakCase: {
    readonly target: string
    readonly rewardMultiplier: string
    readonly requiredBaseReward: string
    readonly botRequirement: number
    readonly expectedReward: string
  }
}

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../test/parity/dyson-no-skills-two-ticks.json', import.meta.url),
    ),
    'utf8',
  ),
) as GoldenFixture

const staticSkillFixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/dyson-static-skills-one-tick.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as StaticSkillFixture

const infinityBoundaryFixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/infinity-trigger-boundaries.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as InfinityBoundaryFixture

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

function runTicks(
  count: number,
  state = createBasicDysonState(fixture.initialState),
): BasicDysonState {
  const model = new BasicDysonSimulationModel(
    state,
  )
  const result = advanceEventTime({
    startingState: model,
    durationSeconds: fixture.tickSeconds * count,
    automationIntervalSeconds: fixture.tickSeconds,
    automationTimeUntilNextEvent: fixture.tickSeconds,
    processingBudgetMilliseconds: 0,
  })
  expect(result.completed).toBe(true)
  return result.candidateState.state
}

describe('basic Dyson Unity golden master', () => {
  test('reproduces the initial Unity-derived rates', () => {
    const state = createBasicDysonState(fixture.initialState)
    expectContinuous(state.rates, fixture.initialState.rates)
  })

  test('reproduces one canonical tick', () => {
    expectContinuous(runTicks(1), fixture.afterOneTick)
  })

  test('reproduces two canonical ticks with start-of-tick rates', () => {
    expectContinuous(runTicks(2), fixture.afterTwoTicks)
  })

  test('does not mutate the caller state while simulating a clone', () => {
    const state = createBasicDysonState(fixture.initialState)
    const before = structuredClone(state)
    runTicks(2, state)
    expect(state).toEqual(before)
  })

  test('saturates continuous production without creating Infinity', () => {
    const state = createBasicDysonState({
      ...fixture.initialState,
      science: Number.MAX_VALUE,
      scienceMultiplier: Number.MAX_VALUE,
    })
    const result = runTicks(1, state)

    expect(result.science).toBe(Number.MAX_VALUE)
    expect(Object.values(result.rates).every(Number.isFinite)).toBe(true)
  })

  test('rejects a negative gameplay balance before advancing', () => {
    const state = createBasicDysonState({
      ...fixture.initialState,
      money: -1,
    })
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: fixture.tickSeconds,
      processingBudgetMilliseconds: 0,
    })

    expect(result.validationStatus).toBe('invalid-state')
    expect(result.diagnosticCode).toBe('SIM-DYSON-NON-FINITE')
    expect(result.consumedSeconds).toBe(0)
  })
})

describe('static Dyson skill effects', () => {
  test('reproduces Unity rates and one tick from exported effects', () => {
    const state = createBasicDysonState({
      ...fixture.initialState,
      money: 0,
      science: 0,
      bots: 0,
      panels: 0,
      ownedSkills: staticSkillFixture.ownedSkills,
    })
    expectContinuous(state.rates, staticSkillFixture.initialRates)

    const after = runTicks(1, state)
    expectContinuous(after.bots, staticSkillFixture.botsAfterOneTick)
    expectContinuous(
      after.facilities.assembly_lines[0],
      staticSkillFixture.assemblyLinesAfterOneTick,
    )
  })

  test('rejects an uncharacterized skill instead of silently mis-simulating', () => {
    expect(() =>
      createBasicDysonState({
        ...fixture.initialState,
        ownedSkills: ['androids'],
      }),
    ).toThrow(/not yet been characterized/)
  })

  test('uses pre-materialized canonical effects instead of the temporary skill helper', () => {
    const baseline = createBasicDysonState(fixture.initialState)
    const state = createBasicDysonState({
      ...fixture.initialState,
      ownedSkills: ['androids'],
      skillEffectsByStat: {
        'Global.PanelsPerSecond': [
          {
            id: 'test.dynamic-panels',
            operation: 'multiply',
            value: 3,
            order: 30,
          },
        ],
        'Facility.AssemblyLine.Production': [
          {
            id: 'test.dynamic-assembly',
            operation: 'multiply',
            value: 4,
            order: 30,
          },
        ],
      },
    })

    expect(state.rates.panels).toBe(baseline.rates.panels * 3)
    expect(state.rates.bots).toBe(baseline.rates.bots * 4)
  })
})

function infinityReadyState(
  overrides: Partial<NonNullable<BasicDysonStateInput['infinity']>>,
): BasicDysonState {
  return createBasicDysonState({
    ...fixture.initialState,
    money: 123,
    science: 456,
    bots: infinityBoundaryFixture.ordinaryRequirement,
    panels: 789,
    workers: 10,
    researchers: 10,
    facilities: {
      assembly_lines: [0, 0],
      ai_managers: [0, 0],
      servers: [0, 0],
      data_centers: [0, 0],
      planets: [0, 0],
    },
    ownedSkills: [],
    automation: {
      enabledFacilities: [],
      buyMode: 'buy-1',
      roundedBulkBuy: false,
    },
    infinity: {
      exponent: infinityBoundaryFixture.exponent,
      ...overrides,
    },
  })
}

describe('integrated Unity Infinity boundaries', () => {
  test('matches ordinary and division-adjusted bot requirements', () => {
    expect(ordinaryInfinityBotThreshold(0n)).toBe(
      infinityBoundaryFixture.ordinaryRequirement,
    )
    expect(ordinaryInfinityBotThreshold(19n)).toBe(
      infinityBoundaryFixture.division19Requirement,
    )
  })

  test('maps the Break slider target to the exact base reward threshold', () => {
    const state = infinityReadyState({
      breakTheLoop: true,
      breakTarget: BigInt(infinityBoundaryFixture.breakCase.target),
      permanentDoubleIp: true,
      quantumDoubleIp: true,
    })
    const actualThreshold = breakInfinityBotThreshold(state.infinity)
    expect(
      Math.abs(
        actualThreshold -
          infinityBoundaryFixture.breakCase.botRequirement,
      ) / infinityBoundaryFixture.breakCase.botRequirement,
    ).toBeLessThan(
      1e-15,
    )
    expect(
      infinityPointsForBots(
        infinityBoundaryFixture.breakCase.botRequirement,
        state.infinity,
      ),
    ).toBe(BigInt(infinityBoundaryFixture.breakCase.expectedReward))
  })

  test('executes ordinary Infinity at the minimum cycle boundary', () => {
    const state = infinityReadyState({
      points: 41n,
      quantumDoubleIp: true,
      permanentSkillPoints: 2n,
      bankedSkillPoints: 2n,
      artifactSkillPoints: 3n,
      retainedFacilities: {
        assembly_lines: true,
        ai_managers: false,
        servers: false,
        data_centers: false,
        planets: false,
      },
    })
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: 1 / 60,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.summary.ordinaryInfinityCount).toBe(1n)
    expect(result.summary.ordinaryInfinityPoints).toBe(2n)
    expect(result.candidateState.state.infinity.points).toBe(43n)
    expect(result.candidateState.state.bots).toBe(10)
    expect(result.candidateState.state.money).toBe(0)
    expect(result.candidateState.state.science).toBe(0)
    expect(result.candidateState.state.infinity.skillPoints).toBe(7n)
    expect(
      result.candidateState.state.infinity.bankedSkillPoints,
    ).toBe(0n)
    expect(
      result.candidateState.state.infinity.secondsInCurrentCycle,
    ).toBe(0)
  })

  test('finds a production threshold crossing between clock events', () => {
    const state = infinityReadyState({
      divisionsPurchased: 19n,
    })
    state.bots = 1
    state.facilities.assembly_lines[0] = 12
    state.rates = createBasicDysonState(state).rates
    const expectedCrossing =
      (infinityBoundaryFixture.division19Requirement - state.bots) /
      state.rates.bots
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: 4,
      automationIntervalSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.summary.ordinaryInfinityCount).toBe(1n)
    expect(result.summary.ordinaryInfinityPoints).toBe(1n)
    expect(
      Math.abs(result.events[0]!.timeSeconds - expectedCrossing),
    ).toBeLessThan(1e-12)
  })

  test('executes Break Infinity for the slider reward and both x2 flags', () => {
    const state = infinityReadyState({
      points: 1_000n,
      breakTheLoop: true,
      breakTarget: BigInt(infinityBoundaryFixture.breakCase.target),
      permanentDoubleIp: true,
      quantumDoubleIp: true,
    })
    state.bots = infinityBoundaryFixture.breakCase.botRequirement
    const model = new BasicDysonSimulationModel(state)
    const result = advanceEventTime({
      startingState: model,
      durationSeconds: 1 / 60,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.summary.breakInfinityCount).toBe(1n)
    expect(result.summary.breakInfinityPoints).toBe(100n)
    expect(result.candidateState.state.infinity.points).toBe(1_100n)
    expect(result.candidateState.state.bots).toBe(1)
  })

  test('applies a queued slider change to only the unprocessed segment', () => {
    const state = infinityReadyState({
      breakTheLoop: true,
      breakTarget: 1_000n,
      permanentDoubleIp: true,
      quantumDoubleIp: true,
    })
    state.bots = infinityBoundaryFixture.breakCase.botRequirement
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: 1 / 60,
      processingBudgetMilliseconds: 0,
      queuedInputs: [
        {
          timeSeconds: 0.005,
          kind: 'break-target',
          discreteValue: 100n,
          id: 'slider',
        },
      ],
    })

    expect(result.completed).toBe(true)
    expect(result.summary.breakInfinityCount).toBe(1n)
    expect(result.summary.breakInfinityPoints).toBe(100n)
    expect(result.candidateState.state.infinity.breakTarget).toBe(100n)
  })

  test('advances unreachable Break time without inventing a reset', () => {
    const state = infinityReadyState({
      breakTheLoop: true,
      breakTarget: 100n,
      permanentDoubleIp: true,
      quantumDoubleIp: true,
    })
    state.bots = 1
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: 1,
      automationIntervalSeconds: 0.1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.summary.breakInfinityCount).toBe(0n)
    expect(
      result.candidateState.state.infinity.secondsInCurrentCycle,
    ).toBeCloseTo(1, 14)
  })
})
