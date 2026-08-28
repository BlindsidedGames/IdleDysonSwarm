import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
  SimulationTotalsState,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  applyCanonicalQuantumReset,
  applyQuantumEntanglementConversion,
  type QuantumEntanglementResult,
} from './quantumTransitions'

const UNITY_INFINITY_POINTS_PER_QUANTUM_POINT = 42n

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const emptySkillState = (): SkillRuntimeState => ({
  owned: false,
  level: 0,
  timerSeconds: 0,
  secondaryTimerSeconds: 0,
})

function fixtureState(): CanonicalGameStateV1 {
  return hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
}

function unityEntanglementReference(
  state: CanonicalGameStateV1,
): QuantumEntanglementResult {
  const availableInfinityPoints =
    state.infinity.points >= state.infinity.spentPoints
      ? state.infinity.points - state.infinity.spentPoints
      : 0n
  const requestedQuantumPoints =
    availableInfinityPoints /
    UNITY_INFINITY_POINTS_PER_QUANTUM_POINT
  const canGrowQuantumBalance =
    requestedQuantumPoints > 0n &&
    state.quantum.pointsEarned <=
      DISCRETE_MAXIMUM - requestedQuantumPoints
  const infinityPointsConsumed = canGrowQuantumBalance
    ? requestedQuantumPoints *
      UNITY_INFINITY_POINTS_PER_QUANTUM_POINT
    : 0n
  const quantumPointsGranted = canGrowQuantumBalance
    ? requestedQuantumPoints
    : 0n

  return {
    state: {
      ...state,
      meta: {
        ...state.meta,
        firstInfinityComplete: true,
      },
      infinity: canGrowQuantumBalance
        ? {
            ...state.infinity,
            points:
              state.infinity.points - infinityPointsConsumed,
          }
        : state.infinity,
      quantum: canGrowQuantumBalance
        ? {
            ...state.quantum,
            pointsEarned:
              state.quantum.pointsEarned + quantumPointsGranted,
          }
        : state.quantum,
    },
    availableInfinityPoints,
    infinityPointsConsumed,
    quantumPointsGranted,
  }
}

function unityQuantumResetReferenceWithoutAssignment(
  state: CanonicalGameStateV1,
  artifactSkillPoints: bigint,
): CanonicalGameStateV1 {
  const facilities = Object.fromEntries(
    (
      [
        'assembly_lines',
        'ai_managers',
        'servers',
        'data_centers',
        'planets',
        'matrioshka_brains',
        'birch_planets',
        'galactic_brains',
      ] as const satisfies readonly CanonicalFacilityId[]
    ).map((id) => [id, [0, 0] as const]),
  ) as CanonicalGameStateV1['dyson']['facilities']

  return {
    ...state,
    meta: {
      ...state.meta,
      firstInfinityComplete: true,
    },
    dyson: {
      ...state.dyson,
      money: 0,
      science: 0,
      bots: 0,
      workers: 0,
      researchers: 0,
      facilities,
      totalPanelsDecayed: 0,
      goalStage: 0n,
      botDistribution: 0.5,
    },
    infinity: {
      ...state.infinity,
      points: 0n,
      spentPoints: 0n,
      lastCycleDurationSeconds: 0,
      lastPointsGained: 0,
      storedTimeUsedThisCycleSeconds: 0,
      storedTimeUsedPreviousCycleSeconds: 0,
      secretsOfTheUniverse:
        state.quantum.permanentSecrets > 1n
          ? state.quantum.permanentSecrets
          : 0n,
      permanentSkillPoints: 0n,
      retainedFacilities: {
        assembly_lines: false,
        ai_managers: false,
        servers: false,
        data_centers: false,
        planets: false,
      },
      automationUnlocked: {
        research: state.quantum.unlocks.automation,
        bots: state.quantum.unlocks.automation,
      },
    },
    skills: {
      ...state.skills,
      points: artifactSkillPoints,
      fragments: 0n,
      byId: {
        androids: emptySkillState(),
        pocketAndroids: emptySkillState(),
      },
    },
    research: {
      ...state.research,
      levelsById: {},
      progressById: {},
    },
    quantum: {
      ...state.quantum,
      pointsEarned:
        state.quantum.pointsEarned < DISCRETE_MAXIMUM
          ? state.quantum.pointsEarned + 1n
          : DISCRETE_MAXIMUM,
    },
    statistics: {
      ...state.statistics,
      trackedSinceUpdate: true,
      trackingStartedMarker: state.statistics.trackedSinceUpdate
        ? state.statistics.trackingStartedMarker
        : 'tracked-since-update',
      currentQuantumRun: emptyStatisticsTotals(),
      recentProcessedSegment: emptyStatisticsTotals(),
      recentActiveAutomaticInfinityCycles: [],
    },
  }
}

function dirtyResetState(): CanonicalGameStateV1 {
  const source = fixtureState()
  return {
    ...source,
    meta: {
      ...source.meta,
      tutorialComplete: false,
      firstInfinityComplete: false,
    },
    dyson: {
      ...source.dyson,
      money: 101,
      science: 102,
      bots: 103,
      workers: 104,
      researchers: 105,
      facilities: Object.fromEntries(
        Object.keys(source.dyson.facilities).map((id) => [
          id,
          [11, 12],
        ]),
      ) as CanonicalGameStateV1['dyson']['facilities'],
      manualCreationIntervalSeconds: 13,
      totalPanelsDecayed: 106,
      goalStage: 107n,
      botDistribution: 0.9,
    },
    infinity: {
      ...source.infinity,
      points: 108n,
      spentPoints: 109n,
      breakTarget: 110n,
      inProgress: true,
      botCapTransitionPending: true,
      botCapRewardsGranted: true,
      lastCycleDurationSeconds: 111,
      lastPointsGained: 112,
      storedTimeUsedThisCycleSeconds: 113,
      storedTimeUsedPreviousCycleSeconds: 114,
      secretsOfTheUniverse: 115n,
      permanentSkillPoints: 116n,
      retainedFacilities: {
        assembly_lines: true,
        ai_managers: true,
        servers: true,
        data_centers: true,
        planets: true,
      },
      automationUnlocked: {
        research: false,
        bots: false,
      },
    },
    skills: {
      ...source.skills,
      points: 117n,
      fragments: 118n,
      byId: {
        superRadiantScattering: {
          owned: true,
          level: 2,
          timerSeconds: 119,
          secondaryTimerSeconds: 120,
        },
      },
      activeAutoAssignment: [],
    },
    research: {
      ...source.research,
      levelsById: { sentinel: 121 },
      progressById: { sentinel: 0.25 },
    },
    quantum: {
      ...source.quantum,
      pointsEarned: 122n,
      permanentSecrets: 27n,
      unlocks: {
        ...source.quantum.unlocks,
        automation: true,
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
    },
    timeline: {
      ...source.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 0.075,
      dysonAutomationTargetIndex: 3,
      researchAutomationTargetIndex: 4,
      infinityBoundaryRemaining: 0.0125,
      infinityCycleSeconds: 123,
      infinityCycleStartingPoints: 124n,
      infinityHasPostResetStart: true,
    },
    statistics: {
      ...source.statistics,
      trackedSinceUpdate: false,
      trackingStartedMarker: '',
      trackedSimulatedSeconds: 125,
      currentQuantumRun: nonEmptyStatisticsTotals(1n),
      recentProcessedSegment: nonEmptyStatisticsTotals(2n),
    },
  }
}

function nonEmptyStatisticsTotals(
  value: bigint,
): SimulationTotalsState {
  return {
    ordinaryInfinityCount: value,
    breakInfinityCount: value,
    ordinaryInfinityPoints: value,
    breakInfinityPoints: value,
    botCapInfinityPoints: value,
    botCapOverflowRewards: value,
    meteorDreamResets: value,
    aiDreamResets: value,
    globalWarmingDreamResets: value,
    blackHoleDreamResets: value,
    strangeMatter: value,
    realityWorkers: value,
    automaticInfluence: value,
    manualInfluence: value,
    realityCapacityStallSeconds: Number(value),
    simulatedSeconds: Number(value),
  }
}

function emptyStatisticsTotals(): SimulationTotalsState {
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
  }
}

describe('Unity Quantum Entanglement crosscheck', () => {
  test.each([
    {
      label: 'below one group',
      infinityPoints: 41n,
      spentInfinityPoints: 0n,
      quantumPoints: 3n,
    },
    {
      label: 'one exact group',
      infinityPoints: 42n,
      spentInfinityPoints: 0n,
      quantumPoints: 3n,
    },
    {
      label: 'unspent groups with a remainder',
      infinityPoints: 117n,
      spentInfinityPoints: 16n,
      quantumPoints: 5n,
    },
    {
      label: 'overspent bookkeeping',
      infinityPoints: 1n,
      spentInfinityPoints: 2n,
      quantumPoints: 5n,
    },
    {
      label: 'exactly fills the Quantum Int64 balance',
      infinityPoints: 84n,
      spentInfinityPoints: 0n,
      quantumPoints: DISCRETE_MAXIMUM - 2n,
    },
    {
      label: 'rejects the whole purchase on output saturation',
      infinityPoints: 84n,
      spentInfinityPoints: 0n,
      quantumPoints: DISCRETE_MAXIMUM - 1n,
    },
  ])(
    'matches the transaction model for $label',
    ({
      infinityPoints,
      spentInfinityPoints,
      quantumPoints,
    }) => {
      const source = fixtureState()
      const input: CanonicalGameStateV1 = {
        ...source,
        meta: {
          ...source.meta,
          firstInfinityComplete: false,
        },
        infinity: {
          ...source.infinity,
          points: infinityPoints,
          spentPoints: spentInfinityPoints,
        },
        quantum: {
          ...source.quantum,
          pointsEarned: quantumPoints,
        },
      }
      const before = structuredClone(input)

      expect(applyQuantumEntanglementConversion(input)).toEqual(
        unityEntanglementReference(input),
      )
      expect(input).toEqual(before)
    },
  )
})

describe('Unity PrestigeDoubleWiper crosscheck', () => {
  test('matches the complete durable reset matrix without auto-assignment', () => {
    const input = dirtyResetState()
    const before = structuredClone(input)
    const result = applyCanonicalQuantumReset(input, 4n)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.state).toEqual(
      unityQuantumResetReferenceWithoutAssignment(input, 4n),
    )
    expect(result.quantumPointGranted).toBe(1n)
    expect(result.autoAssignedSkillIds).toEqual([])
    expect(input).toEqual(before)
  })

  test('preserves root flags and event-clock state outside the replaced containers', () => {
    const input = dirtyResetState()
    const result = applyCanonicalQuantumReset(input, 0n)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect({
      infinityInProgress: result.state.infinity.inProgress,
      botCapTransitionPending:
        result.state.infinity.botCapTransitionPending,
      botCapRewardsGranted:
        result.state.infinity.botCapRewardsGranted,
      breakTarget: result.state.infinity.breakTarget,
      timeline: result.state.timeline,
    }).toEqual({
      infinityInProgress: input.infinity.inProgress,
      botCapTransitionPending:
        input.infinity.botCapTransitionPending,
      botCapRewardsGranted:
        input.infinity.botCapRewardsGranted,
      breakTarget: input.infinity.breakTarget,
      timeline: input.timeline,
    })
  })

  test('creates only the two durable zero-timer entries before an empty assignment', () => {
    const input = dirtyResetState()
    const result = applyCanonicalQuantumReset(input, 0n)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.state.skills.byId).toEqual({
      androids: emptySkillState(),
      pocketAndroids: emptySkillState(),
    })
    expect(
      result.state.skills.byId.superRadiantScattering,
    ).toBeUndefined()
  })

  test('retains timer entries alongside dependency-ordered auto-assignment', () => {
    const source = dirtyResetState()
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        activeAutoAssignment: [
          'startHereTree',
          'doubleScienceTree',
        ],
      },
    }
    const result = applyCanonicalQuantumReset(input, 2n)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.autoAssignedSkillIds).toEqual([
      'startHereTree',
      'doubleScienceTree',
    ])
    expect(result.state.skills.points).toBe(0n)
    expect(result.state.skills.byId).toEqual({
      startHereTree: {
        owned: true,
        level: 1,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      },
      doubleScienceTree: {
        owned: true,
        level: 1,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      },
      androids: emptySkillState(),
      pocketAndroids: emptySkillState(),
    })
  })

  test.each([
    {
      permanentSecrets: 0n,
      expectedSessionSecrets: 0n,
    },
    {
      permanentSecrets: 1n,
      expectedSessionSecrets: 0n,
    },
    {
      permanentSecrets: 2n,
      expectedSessionSecrets: 2n,
    },
    {
      permanentSecrets: 27n,
      expectedSessionSecrets: 27n,
    },
  ])(
    'restores $permanentSecrets permanent secrets as $expectedSessionSecrets session secrets',
    ({ permanentSecrets, expectedSessionSecrets }) => {
      const source = dirtyResetState()
      const input: CanonicalGameStateV1 = {
        ...source,
        quantum: {
          ...source.quantum,
          permanentSecrets,
        },
      }
      const result = applyCanonicalQuantumReset(input, 0n)

      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.state.infinity.secretsOfTheUniverse).toBe(
        expectedSessionSecrets,
      )
    },
  )

  test('still completes the reset when the Quantum balance is saturated', () => {
    const source = dirtyResetState()
    const input: CanonicalGameStateV1 = {
      ...source,
      quantum: {
        ...source.quantum,
        pointsEarned: DISCRETE_MAXIMUM,
      },
    }
    const result = applyCanonicalQuantumReset(input, 0n)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.quantumPointGranted).toBe(0n)
    expect(result.state.quantum.pointsEarned).toBe(
      DISCRETE_MAXIMUM,
    )
    expect(result.state.dyson.money).toBe(0)
  })
})
