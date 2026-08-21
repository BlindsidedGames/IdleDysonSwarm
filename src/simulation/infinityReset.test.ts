import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  applyInfinityResetTransition,
  type InfinityResetState,
} from './infinityReset'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
} from './dysonModel'

interface FixtureCase {
  readonly name: string
  readonly startingPoints: string
  readonly requestedReward: string
  readonly breakInfinity: boolean
  readonly bankedSkillPoints: string
  readonly artifactSkillPoints: string
  readonly permanentSkillPoints: string
  readonly offlineTimeUsedThisInfinity: number
  readonly retainedFacilities: BasicDysonFacilityId[]
  readonly expectedPoints: string
  readonly expectedReward: string
  readonly expectedBots: number
  readonly expectedRetainedOwned: number
  readonly expectedSkillPoints: string
}

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/infinity-reset-transitions.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { readonly cases: readonly FixtureCase[] }

function createState(entry: FixtureCase): InfinityResetState {
  return {
    points: BigInt(entry.startingPoints),
    permanentSkillPoints: BigInt(entry.permanentSkillPoints),
    retainedFacilities: Object.fromEntries(
      BASIC_DYSON_FACILITY_IDS.map((id) => [
        id,
        entry.retainedFacilities.includes(id),
      ]),
    ) as Record<BasicDysonFacilityId, boolean>,
    offlineTimeUsedThisInfinity: entry.offlineTimeUsedThisInfinity,
    offlineTimeUsedPreviousInfinity: 7,
    firstInfinityDone: false,
    tutorial: false,
    infinityInProgress: true,
    botCapTransitionPending: true,
    botCapRewardsGranted: true,
    lastInfinityPointsGained: 0,
    bots: 123.5,
    facilities: {
      assembly_lines: [2, 3],
      ai_managers: [4, 1],
      servers: [2, 0],
      data_centers: [1, 0],
      planets: [1, 0],
    },
    skillPoints: 99n,
    fragments: 4n,
    statistics: {
      ordinaryCount: 0n,
      ordinaryPoints: 0n,
      breakCount: 0n,
      breakPoints: 0n,
      botCapRewards: 0n,
    },
  }
}

describe('Infinity durable transition parity', () => {
  test.each(fixture.cases)('$name', (entry) => {
    const state = createState(entry)
    const outcome = applyInfinityResetTransition(state, {
      breakInfinity: entry.breakInfinity,
      requestedReward: BigInt(entry.requestedReward),
      bankedSkillPoints: BigInt(entry.bankedSkillPoints),
      artifactSkillPoints: BigInt(entry.artifactSkillPoints),
      botCapTransition: false,
    })

    expect(outcome.applied).toBe(true)
    expect(outcome.rewardGranted).toBe(BigInt(entry.expectedReward))
    expect(state.points).toBe(BigInt(entry.expectedPoints))
    expect(state.bots).toBe(entry.expectedBots)
    expect(state.skillPoints).toBe(BigInt(entry.expectedSkillPoints))
    expect(state.offlineTimeUsedPreviousInfinity).toBe(
      entry.offlineTimeUsedThisInfinity,
    )
    expect(state.offlineTimeUsedThisInfinity).toBe(0)
    expect(state.infinityInProgress).toBe(false)
    expect(state.botCapTransitionPending).toBe(false)
    expect(state.botCapRewardsGranted).toBe(false)
    expect(state.firstInfinityDone).toBe(true)
    expect(state.tutorial).toBe(true)
    expect(state.fragments).toBe(0n)

    for (const id of BASIC_DYSON_FACILITY_IDS) {
      expect(state.facilities[id][1]).toBe(
        entry.retainedFacilities.includes(id)
          ? entry.expectedRetainedOwned
          : 0,
      )
    }
    if (entry.breakInfinity) {
      expect(state.statistics.breakCount).toBe(1n)
      expect(state.statistics.breakPoints).toBe(
        BigInt(entry.expectedReward),
      )
    } else {
      expect(state.statistics.ordinaryCount).toBe(1n)
      expect(state.statistics.ordinaryPoints).toBe(
        BigInt(entry.expectedReward),
      )
    }
  })

  test('records and clears the durable bot-cap checkpoint', () => {
    const state = createState(fixture.cases[0]!)
    const outcome = applyInfinityResetTransition(state, {
      breakInfinity: false,
      requestedReward: 1n,
      bankedSkillPoints: 0n,
      artifactSkillPoints: 0n,
      botCapTransition: true,
    })

    expect(outcome.applied).toBe(true)
    expect(state.statistics.botCapRewards).toBe(1n)
    expect(state.botCapTransitionPending).toBe(false)
    expect(state.botCapRewardsGranted).toBe(false)
  })

  test('invalid requests mutate nothing', () => {
    const state = createState(fixture.cases[0]!)
    const before = structuredClone(state)
    const outcome = applyInfinityResetTransition(state, {
      breakInfinity: false,
      requestedReward: -1n,
      bankedSkillPoints: 0n,
      artifactSkillPoints: 0n,
      botCapTransition: false,
    })

    expect(outcome.applied).toBe(false)
    expect(state).toEqual(before)
  })
})
