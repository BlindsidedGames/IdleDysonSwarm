import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  BOT_CAP_INFINITY_REWARD,
  BOT_CAP_OVERFLOW_REWARD,
  evaluateCanonicalBotCapCheckpoint,
  FINITE_BOT_CAP,
} from './canonicalBotCapCheckpoint'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function stateWith(
  overrides: {
    readonly bots?: number
    readonly points?: bigint
    readonly overflowMultiplier?: number
    readonly pending?: boolean
    readonly rewardsGranted?: boolean
    readonly inProgress?: boolean
  } = {},
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      bots: overrides.bots ?? FINITE_BOT_CAP,
    },
    infinity: {
      ...source.infinity,
      points: overrides.points ?? 25n,
      botCapTransitionPending: overrides.pending ?? false,
      botCapRewardsGranted: overrides.rewardsGranted ?? false,
      inProgress: overrides.inProgress ?? false,
    },
    avocado: {
      ...source.avocado,
      overflowMultiplier: overrides.overflowMultiplier ?? 4,
    },
  }
}

describe('canonical bot-cap checkpoint', () => {
  test('routes an ordinary finite bot value to normal Prestige unchanged', () => {
    const state = stateWith({ bots: 42 })

    const result = evaluateCanonicalBotCapCheckpoint(state)

    expect(result.phase).toBe('normal')
    expect(result.action).toEqual({
      kind: 'continue-normal-prestige',
    })
    expect(result.candidateState).toBe(state)
    expect(result.appliedReward).toEqual({
      infinityPoints: 0n,
      overflowMultiplier: 0,
    })
  })

  test('requires the pending checkpoint to persist before rewards are classified', () => {
    const state = stateWith()
    const before = structuredClone(state)

    const result = evaluateCanonicalBotCapCheckpoint(state)

    expect(result.phase).toBe('cap-uncheckpointed')
    expect(result.action.kind).toBe('persist')
    if (result.action.kind !== 'persist') {
      throw new Error('Expected a persist action.')
    }
    expect(result.action.checkpoint).toBe('pending')
    expect(result.action.rollbackState).toBe(state)
    expect(result.candidateState.infinity.botCapTransitionPending)
      .toBe(true)
    expect(result.candidateState.infinity.botCapRewardsGranted)
      .toBe(false)
    expect(result.candidateState.infinity.points).toBe(25n)
    expect(result.candidateState.avocado.overflowMultiplier).toBe(4)
    expect(result.appliedReward.infinityPoints).toBe(0n)
    expect(state).toEqual(before)
  })

  test('builds one atomic reward checkpoint and a pending rollback candidate', () => {
    const pending = stateWith({
      pending: true,
      inProgress: true,
    })
    const before = structuredClone(pending)

    const result = evaluateCanonicalBotCapCheckpoint(pending)

    expect(result.phase).toBe('cap-pending')
    expect(result.action.kind).toBe('persist')
    if (result.action.kind !== 'persist') {
      throw new Error('Expected a persist action.')
    }
    expect(result.action.checkpoint).toBe('rewards')
    expect(result.candidateState.infinity.points).toBe(
      25n + BOT_CAP_INFINITY_REWARD,
    )
    expect(result.candidateState.avocado.overflowMultiplier).toBe(
      4 + BOT_CAP_OVERFLOW_REWARD,
    )
    expect(result.candidateState.infinity.botCapTransitionPending)
      .toBe(false)
    expect(result.candidateState.infinity.botCapRewardsGranted)
      .toBe(true)
    expect(result.candidateState.infinity.inProgress).toBe(true)
    expect(result.appliedReward).toEqual({
      infinityPoints: 1_000n,
      overflowMultiplier: 1,
    })
    expect(
      result.candidateState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(
      addExpected(
        pending.statistics.lifetime.botCapInfinityPoints,
        1_000n,
      ),
    )
    expect(
      result.candidateState.statistics.lifetime.botCapOverflowRewards,
    ).toBe(
      addExpected(
        pending.statistics.lifetime.botCapOverflowRewards,
        1n,
      ),
    )

    expect(result.action.rollbackState.infinity.points).toBe(25n)
    expect(
      result.action.rollbackState.avocado.overflowMultiplier,
    ).toBe(4)
    expect(
      result.action.rollbackState.infinity.botCapTransitionPending,
    ).toBe(true)
    expect(
      result.action.rollbackState.infinity.botCapRewardsGranted,
    ).toBe(false)
    expect(result.action.rollbackState.infinity.inProgress).toBe(false)
    expect(pending).toEqual(before)
  })

  test('retries a rolled-back pending checkpoint without duplicating rewards', () => {
    const first = evaluateCanonicalBotCapCheckpoint(
      stateWith({ pending: true }),
    )
    expect(first.action.kind).toBe('persist')
    if (first.action.kind !== 'persist') {
      throw new Error('Expected a persist action.')
    }

    const retry = evaluateCanonicalBotCapCheckpoint(
      first.action.rollbackState,
    )
    expect(retry.candidateState.infinity.points).toBe(1_025n)
    expect(retry.candidateState.avocado.overflowMultiplier).toBe(5)

    const committed = evaluateCanonicalBotCapCheckpoint(
      retry.candidateState,
    )
    expect(committed.phase).toBe('cap-rewards-granted')
    expect(committed.action).toEqual({ kind: 'prestige' })
    expect(committed.candidateState.infinity.points).toBe(1_025n)
    expect(committed.candidateState.avocado.overflowMultiplier).toBe(5)
    expect(committed.appliedReward.infinityPoints).toBe(0n)
  })

  test('resumes a rewards-granted checkpoint without regranting and restores in-progress', () => {
    const state = stateWith({
      points: 1_025n,
      overflowMultiplier: 5,
      pending: true,
      rewardsGranted: true,
      inProgress: false,
    })

    const result = evaluateCanonicalBotCapCheckpoint(state)

    expect(result.phase).toBe('cap-rewards-granted')
    expect(result.action).toEqual({ kind: 'prestige' })
    expect(result.candidateState.infinity.points).toBe(1_025n)
    expect(result.candidateState.avocado.overflowMultiplier).toBe(5)
    expect(result.candidateState.infinity.inProgress).toBe(true)
    expect(result.candidateState.infinity.botCapRewardsGranted).toBe(true)
    expect(result.appliedReward).toEqual({
      infinityPoints: 0n,
      overflowMultiplier: 0,
    })
    expect(
      result.candidateState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(state.statistics.lifetime.botCapInfinityPoints)
  })

  test.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
    ['negative', -1],
  ])('repairs %s bots and clears transition flags before persistence', (_, bots) => {
    const state = stateWith({
      bots,
      pending: true,
      rewardsGranted: true,
      inProgress: true,
    })

    const result = evaluateCanonicalBotCapCheckpoint(state)

    expect(result.phase).toBe('invalid-bots')
    expect(result.action.kind).toBe('persist')
    if (result.action.kind !== 'persist') {
      throw new Error('Expected a persist action.')
    }
    expect(result.action.checkpoint).toBe('invalid-bot-repair')
    expect(result.candidateState.dyson.bots).toBe(0)
    expect(result.candidateState.infinity.botCapTransitionPending)
      .toBe(false)
    expect(result.candidateState.infinity.botCapRewardsGranted)
      .toBe(false)
    expect(result.candidateState.infinity.inProgress).toBe(false)
    expect(result.candidateState.infinity.points).toBe(25n)
    expect(result.candidateState.avocado.overflowMultiplier).toBe(4)
    expect(result.action.rollbackState).toBe(state)
  })

  test('saturates numeric fields while still durably recording the logical reward', () => {
    const result = evaluateCanonicalBotCapCheckpoint(
      stateWith({
        points: DISCRETE_MAXIMUM,
        overflowMultiplier: Number.MAX_VALUE,
        pending: true,
      }),
    )

    expect(result.candidateState.infinity.points).toBe(DISCRETE_MAXIMUM)
    expect(result.candidateState.avocado.overflowMultiplier)
      .toBe(Number.MAX_VALUE)
    expect(result.candidateState.infinity.botCapRewardsGranted)
      .toBe(true)
    expect(result.appliedReward).toEqual({
      infinityPoints: 0n,
      overflowMultiplier: 0,
    })
    expect(
      result.candidateState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(
      stateWith().statistics.lifetime.botCapInfinityPoints,
    )
    expect(
      result.candidateState.statistics.lifetime.botCapOverflowRewards,
    ).toBe(
      addExpected(
        stateWith().statistics.lifetime.botCapOverflowRewards,
        1n,
      ),
    )
  })
})

function addExpected(left: bigint, right: bigint): bigint {
  const result = left + right
  return result > DISCRETE_MAXIMUM ? DISCRETE_MAXIMUM : result
}
