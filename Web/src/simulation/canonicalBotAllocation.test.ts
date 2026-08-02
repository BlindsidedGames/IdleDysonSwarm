import { describe, expect, test } from 'vitest'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  deriveCanonicalBotAllocation,
  withCanonicalBotAllocation,
} from './canonicalBotAllocation'

describe('canonical bot allocation', () => {
  test.each([
    [0, 0.5, 0, 0],
    [1, 0.5, 1, 0],
    [10, 0.5, 5, 5],
    [11.9, 0.25, 9, 2],
    // Unity stores this value as a float; 0.01f is slightly below one
    // hundredth, so the researcher side deliberately floors to zero.
    [100, 0.01, 99, 0],
  ])(
    'matches Unity whole-bot floor/ceiling allocation for %s bots at %s',
    (bots, distribution, workers, researchers) => {
      expect(
        deriveCanonicalBotAllocation(
          state({ bots, distribution }),
        ),
      ).toEqual({ workers, researchers })
    },
  )

  test('assigns every bot to both roles after Bot Multitasking', () => {
    expect(
      deriveCanonicalBotAllocation(
        state({
          bots: 11.9,
          distribution: 0.9,
          botMultitasking: true,
        }),
      ),
    ).toEqual({ workers: 11.9, researchers: 11.9 })
  })

  test('repairs stale compatibility fields without mutating the source', () => {
    const source = state({ bots: 10, distribution: 0.5 })
    const synchronized = withCanonicalBotAllocation(source)

    expect(synchronized.dyson).toMatchObject({
      workers: 5,
      researchers: 5,
    })
    expect(source.dyson).toMatchObject({
      workers: 0,
      researchers: 0,
    })
  })
})

function state(options: {
  readonly bots: number
  readonly distribution: number
  readonly botMultitasking?: boolean
}): CanonicalGameStateV1 {
  return {
    modelVersion: 1,
    meta: {} as CanonicalGameStateV1['meta'],
    dyson: {
      money: 0,
      science: 0,
      bots: options.bots,
      workers: 0,
      researchers: 0,
      facilities: {} as CanonicalGameStateV1['dyson']['facilities'],
      manualCreationIntervalSeconds: 0,
      totalPanelsDecayed: 0,
      goalStage: 0n,
      botDistribution: options.distribution,
      automation: {} as CanonicalGameStateV1['dyson']['automation'],
    },
    infinity: {} as CanonicalGameStateV1['infinity'],
    skills: {} as CanonicalGameStateV1['skills'],
    research: {} as CanonicalGameStateV1['research'],
    reality: {} as CanonicalGameStateV1['reality'],
    quantum: {
      unlocks: {
        botMultitasking: options.botMultitasking ?? false,
      },
    } as CanonicalGameStateV1['quantum'],
    avocado: {} as CanonicalGameStateV1['avocado'],
    timeline: {} as CanonicalGameStateV1['timeline'],
    secretProgress: {} as CanonicalGameStateV1['secretProgress'],
    dream: {} as CanonicalGameStateV1['dream'],
    statistics: {} as CanonicalGameStateV1['statistics'],
  }
}
