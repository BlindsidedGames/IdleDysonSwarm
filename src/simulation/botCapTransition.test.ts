import { OVERFLOW_BOT_CAP } from './overflowBoundary'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  BasicDysonSimulationModel,
  createBasicDysonState,
  type BasicDysonState,
  type BasicDysonStateInput,
} from './dysonModel'
import { advanceEventTime } from './eventTime'

interface OrdinaryCase {
  readonly name: string
  readonly startingPoints: string
  readonly startingOverflow: number
  readonly startingLegacyOverflow: number
  readonly pending: boolean
  readonly rewardsGranted: boolean
  readonly expectedPoints: string
  readonly expectedSpecialPoints: string
}

interface BotCapFixture {
  readonly ordinaryCases: readonly OrdinaryCase[]
  readonly breakCase: {
    readonly startingPoints: string
    readonly baseRewardAtCap: string
    readonly rewardMultiplier: string
    readonly expectedBreakReward: string
    readonly expectedPoints: string
  }
}

const productionFixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/dyson-no-skills-two-ticks.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { readonly initialState: BasicDysonStateInput }

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/bot-cap-transition.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as BotCapFixture

function createBotCapState(
  infinity: NonNullable<BasicDysonStateInput['infinity']>,
): BasicDysonState {
  return createBasicDysonState({
    ...productionFixture.initialState,
    money: 10,
    science: 20,
    bots: Number.MAX_VALUE,
    panels: 30,
    workers: 40,
    researchers: 50,
    ownedSkills: [],
    facilities: {
      assembly_lines: [0, 0],
      ai_managers: [0, 0],
      servers: [0, 0],
      data_centers: [0, 0],
      planets: [0, 0],
    },
    automation: {
      enabledFacilities: [],
      buyMode: 'buy-1',
      roundedBulkBuy: false,
    },
    infinity,
  })
}

function advanceCap(state: BasicDysonState) {
  return advanceEventTime({
    startingState: new BasicDysonSimulationModel(state),
    durationSeconds: 0.001,
    automationIntervalSeconds: 0.1,
    processingBudgetMilliseconds: 0,
  })
}

describe('legacy bot-cap adapter no longer awards automatic rewards', () => {
  test.each(fixture.ordinaryCases)('$name', (entry) => {
    const result = advanceCap(
      createBotCapState({
        points: BigInt(entry.startingPoints),
        overflowMultiplier: entry.startingOverflow,
        legacyOverflowMultiplier: entry.startingLegacyOverflow,
        botCapTransitionPending: entry.pending,
        botCapRewardsGranted: entry.rewardsGranted,
        infinityInProgress: entry.rewardsGranted,
      }),
    )
    const state = result.candidateState.state

    expect(result.completed).toBe(true)
    expect(state.infinity.points).toBe(BigInt(entry.startingPoints))
    expect(state.infinity.overflowMultiplier).toBe(entry.startingOverflow)
    expect(state.infinity.legacyOverflowMultiplier).toBe(entry.startingLegacyOverflow)
    expect(state.bots).toBe(OVERFLOW_BOT_CAP)
    expect(state.infinity.botCapTransitionPending).toBe(true)
    expect(state.infinity.botCapRewardsGranted).toBe(false)
    expect(state.infinity.infinityInProgress).toBe(false)
    expect(result.summary.botCapInfinityPoints).toBe(
      0n,
    )
    expect(result.summary.botCapOverflowRewards).toBe(
      0n,
    )
    expect(result.summary.ordinaryInfinityCount).toBe(0n)
    expect(result.summary.ordinaryInfinityPoints).toBe(0n)
    expect(state.infinity.statistics.botCapRewards).toBe(0n)
  })

  test('does not combine a Break reward with Overflow', () => {
    const entry = fixture.breakCase
    const result = advanceCap(
      createBotCapState({
        points: BigInt(entry.startingPoints),
        breakTheLoop: true,
        breakTarget: 100n,
        permanentDoubleIp: true,
        quantumDoubleIp: true,
      }),
    )

    expect(result.completed).toBe(true)
    expect(result.summary.botCapInfinityPoints).toBe(0n)
    expect(result.summary.botCapOverflowRewards).toBe(0n)
    expect(result.summary.breakInfinityCount).toBe(0n)
    expect(result.summary.breakInfinityPoints).toBe(
      0n,
    )
    expect(result.candidateState.state.infinity.points).toBe(
      BigInt(entry.startingPoints),
    )
  })

  test('preserves old finite balances without recording a new reward', () => {
    const result = advanceCap(
      createBotCapState({
        points: 9_223_372_036_854_775_807n,
        overflowMultiplier: Number.MAX_VALUE,
        legacyOverflowMultiplier: Number.MAX_VALUE,
      }),
    )

    expect(result.completed).toBe(true)
    expect(result.candidateState.state.infinity.points).toBe(
      9_223_372_036_854_775_807n,
    )
    expect(
      result.candidateState.state.infinity.overflowMultiplier,
    ).toBe(Number.MAX_VALUE)
    expect(result.summary.botCapInfinityPoints).toBe(0n)
    expect(result.summary.botCapOverflowRewards).toBe(0n)
    expect(
      result.candidateState.state.infinity.statistics.botCapRewards,
    ).toBe(0n)
  })

  test('preserves pending eligibility after bot spending', () => {
    const state = createBotCapState({
      botCapTransitionPending: true,
    })
    state.bots = 42
    const result = advanceCap(state)

    expect(result.completed).toBe(true)
    expect(result.candidateState.state.infinity.botCapTransitionPending).toBe(true)
    expect(result.summary.botCapOverflowRewards).toBe(0n)
  })
})
