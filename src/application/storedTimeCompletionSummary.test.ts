import { describe, expect, test } from 'vitest'
import type { CanonicalFacilityId, SimulationTotalsState } from '../game-state/types'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import { summarizeStoredTimeCompletion } from './storedTimeCompletionSummary'

describe('summarizeStoredTimeCompletion', () => {
  test('reports tracked prestige earnings and suppresses reset facility deltas', () => {
    const before = runtime()
    const after = runtime({
      infinityCount: 2n,
      infinityPoints: 125n,
      assemblyLines: 50,
      storedTimeSeconds: 300,
    })

    expect(summarizeStoredTimeCompletion(before, after, {
      simulationUpdates: 5_000,
      initiallyPlannedUpdates: 5_000,
    })).toMatchObject({
      preset: 'balanced',
      simulationUpdates: 5_000,
      accuracyReduced: false,
      remainingBankSeconds: 300,
      infinityCount: 2n,
      infinityPoints: 125n,
      facilityGains: [],
    })
  })

  test('reports positive net facility and workforce gains without an Infinity', () => {
    const before = runtime({ assemblyLines: 10, bots: 20 })
    const after = runtime({ assemblyLines: 25, bots: 70 })

    expect(summarizeStoredTimeCompletion(before, after, {
      simulationUpdates: 1_375,
      initiallyPlannedUpdates: 5_000,
    })).toMatchObject({
      infinityCount: 0n,
      simulationUpdates: 1_375,
      accuracyReduced: true,
      botGain: 50,
      facilityGains: [{ facilityId: 'assembly_lines', quantity: 15 }],
    })
  })
})

function runtime(options: {
  readonly infinityCount?: bigint
  readonly infinityPoints?: bigint
  readonly assemblyLines?: number
  readonly bots?: number
  readonly storedTimeSeconds?: number
} = {}): CanonicalRuntimeState {
  const facilities = Object.fromEntries([
    'assembly_lines',
    'ai_managers',
    'servers',
    'data_centers',
    'planets',
    'matrioshka_brains',
    'birch_planets',
    'galactic_brains',
  ].map((id) => [
    id,
    [id === 'assembly_lines' ? options.assemblyLines ?? 0 : 0, 0],
  ])) as unknown as Readonly<Record<CanonicalFacilityId, readonly [number, number]>>
  const totals = emptyTotals({
    ordinaryInfinityCount: options.infinityCount ?? 0n,
    ordinaryInfinityPoints: options.infinityPoints ?? 0n,
  })

  return {
    gameState: {
      dyson: {
        bots: options.bots ?? 0,
        workers: 0,
        researchers: 0,
        facilities,
      },
      timeline: {
        storedTimeAvailableSeconds: options.storedTimeSeconds ?? 600,
        processing: { storedTimePreset: 'balanced' },
      },
      statistics: { lifetime: totals },
    },
  } as unknown as CanonicalRuntimeState
}

function emptyTotals(
  overrides: Partial<SimulationTotalsState> = {},
): SimulationTotalsState {
  return {
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0,
    realityWorkers: 0n,
    automaticInfluence: 0,
    manualInfluence: 0,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
    ...overrides,
  }
}
