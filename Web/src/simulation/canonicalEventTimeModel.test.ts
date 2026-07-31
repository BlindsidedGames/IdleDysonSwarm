import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SimulationStatisticsState,
  SimulationTotalsState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  CANONICAL_QUANTUM_LEAP_INPUT,
  CanonicalEventTimeModel,
  createCapturedInfinityAssetLookup,
  deriveCanonicalArtifactSkillPoints,
  evaluateCanonicalInfinityBoundary,
  type CanonicalEventTimeContext,
  type CanonicalEventTimeState,
} from './canonicalEventTimeModel'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { SIMULATION_UPGRADE_DEFINITIONS } from './dreamEducationUpgrades'
import { advanceEventTime } from './eventTime'
import {
  REALITY_UPGRADE_DEFINITIONS,
  type RealityUpgradeDefinition,
  type RealityUpgradeId,
} from './realityUpgrades'
import { createCanonicalTinkerRuntimeState } from './canonicalTinker'
import { createSimulationSummary } from './types'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const hydrated = hydrateGameState(prepareIdb1Save(fixture).prepared)

function emptyTotals(): SimulationTotalsState {
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
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
  }
}

function emptyStatistics(
  source: Readonly<SimulationStatisticsState>,
): SimulationStatisticsState {
  const emptyWindow = (
    window: SimulationStatisticsState['minuteWindows'][number],
  ) => ({
    ...window,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
  })
  return {
    ...source,
    trackedSinceUpdate: false,
    trackingStartedMarker: '',
    trackedSimulatedSeconds: 0,
    lifetime: emptyTotals(),
    currentQuantumRun: emptyTotals(),
    recentProcessedSegment: emptyTotals(),
    lastCompletedCycle: {
      valid: false,
      breakInfinity: false,
      durationSeconds: 0,
      reward: 0n,
      dreamCause: null,
    },
    minuteWindows: source.minuteWindows.map(emptyWindow),
    halfHourWindows: source.halfHourWindows.map(emptyWindow),
    dailyWindows: source.dailyWindows.map(emptyWindow),
  }
}

function baseState(): CanonicalGameStateV1 {
  const source = hydrated.state
  return {
    ...source,
    meta: {
      ...source.meta,
      tutorialComplete: false,
      firstInfinityComplete: false,
    },
    dyson: {
      ...source.dyson,
      money: 0,
      science: 0,
      bots: 0,
      workers: 0,
      researchers: 0,
      facilities: {
        assembly_lines: [0, 0],
        ai_managers: [0, 0],
        servers: [0, 0],
        data_centers: [0, 0],
        planets: [0, 0],
        matrioshka_brains: [0, 0],
        birch_planets: [0, 0],
        galactic_brains: [0, 0],
      },
      totalPanelsDecayed: 0,
      goalStage: 0n,
      automation: {
        ...source.dyson.automation,
        enabledFacilities: {
          assembly_lines: false,
          ai_managers: false,
          servers: false,
          data_centers: false,
          planets: false,
          matrioshka_brains: false,
          birch_planets: false,
          galactic_brains: false,
        },
      },
    },
    infinity: {
      ...source.infinity,
      points: 0n,
      spentPoints: 0n,
      breakTarget: 1n,
      inProgress: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      permanentSkillPoints: 0n,
      secretsOfTheUniverse: 0n,
      automationUnlocked: {
        research: false,
        bots: false,
      },
    },
    skills: {
      ...source.skills,
      points: 0n,
      fragments: 0n,
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          {
            ...skill,
            owned: false,
            level: 0,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        ]),
      ),
      activeAutoAssignment: [],
    },
    research: {
      ...source.research,
      levelsById: Object.fromEntries(
        Object.keys(source.research.levelsById).map((id) => [id, 0]),
      ),
      progressById: Object.fromEntries(
        Object.keys(source.research.progressById).map((id) => [id, 0]),
      ),
      automation: {
        ...source.research.automation,
        enabledById: Object.fromEntries(
          Object.keys(source.research.automation.enabledById).map(
            (id) => [id, false],
          ),
        ),
      },
    },
    reality: {
      universeDesignationCount: 0n,
      workersReady: 0n,
      workerGenerationProgress: 0,
      influence: 0n,
      autoGather: false,
    },
    quantum: {
      ...source.quantum,
      pointsEarned: 0n,
      pointsSpent: 0n,
      divisionsPurchased: 0n,
      permanentSecrets: 0n,
      influenceSpeedBonus: 0n,
      cashBonusLevels: 0n,
      scienceBonusLevels: 0n,
      unlocks: Object.fromEntries(
        Object.keys(source.quantum.unlocks).map((id) => [id, false]),
      ) as unknown as CanonicalGameStateV1['quantum']['unlocks'],
    },
    avocado: {
      unlocked: false,
      infinityPoints: 0,
      influence: 0,
      strangeMatter: 0,
      overflowMultiplier: 0,
    },
    timeline: {
      ...source.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 1,
      infinityBoundaryRemaining: 1,
      infinityCycleSeconds: 0,
      infinityCycleStartingPoints: 0n,
      infinityHasPostResetStart: false,
      doubleTime: {
        unlocked: false,
        enabled: false,
        bankSeconds: 0,
        rate: 1,
      },
    },
    secretProgress: {
      completed: false,
      step: 0,
    },
    dream: {
      ...source.dream,
      resources: {
        hunters: 0n,
        gatherers: 0n,
        community: 0,
        housing: 0,
        villages: 0,
        workers: 0,
        cities: 0,
        factories: 0,
        bots: 0,
        rockets: 0,
        energy: 0,
        spaceFactories: 0,
        dysonPanels: 0n,
        railgunCharge: 0,
        solarPanels: 0,
        fusion: 0,
        swarmPanels: 0n,
      },
      disasterStage: 42n,
      strangeMatter: 0n,
      upgrades: Object.fromEntries(
        Object.keys(source.dream.upgrades).map((id) => [id, false]),
      ) as CanonicalGameStateV1['dream']['upgrades'],
      railgun: {
        firing: false,
        fireProgress: 0,
        shotsRemaining: 0,
      },
    },
    statistics: emptyStatistics(source.statistics),
  }
}

function carrier(
  gameState: CanonicalGameStateV1,
  evaluationSnapshot = hydrated.skillEffectEvaluationSnapshot,
): CanonicalEventTimeState {
  return {
    gameState,
    compatibilityTuning: hydrated.compatibilityTuning,
    evaluationSnapshot,
    entitlements: {
      permanentDoubleIp: false,
    },
    tinker: createCanonicalTinkerRuntimeState(),
  }
}

function context(
  realityUpgradeDefinitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  > = REALITY_UPGRADE_DEFINITIONS,
  automationIntervalSeconds = 1,
): CanonicalEventTimeContext {
  return {
    automationIntervalSeconds,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions,
    infinityResetAssetLookup:
      createCapturedInfinityAssetLookup([]),
  }
}

function artifactDefinition(
  key: RealityUpgradeId,
  ...effects: readonly [effectType: number, numericValue: number][]
): RealityUpgradeDefinition {
  return {
    key,
    cost: 0n,
    prerequisites: [],
    purchaseEffects: effects.map(([effectType, numericValue]) => ({
      effectType,
      targetKey: null,
      boolValue: false,
      numericValue,
    })),
  }
}

function withRealityArtifacts(
  source: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  return {
    ...source,
    dream: {
      ...source.dream,
      upgrades: {
        ...source.dream.upgrades,
        translation1: true,
        translation2: false,
        speed1: true,
      },
    },
    secretProgress: {
      ...source.secretProgress,
      completed: true,
    },
  }
}

const artifactDefinitions = new Map<
  RealityUpgradeId,
  RealityUpgradeDefinition
>([
  [
    'translation1',
    artifactDefinition('translation1', [2, 2.5], [1, 99]),
  ],
  ['translation2', artifactDefinition('translation2', [2, 101])],
  ['speed1', artifactDefinition('speed1', [2, 3.5])],
])

describe('canonical whole-game event-time model', () => {
  test('synchronizes bot allocation and advances the complete early Dyson production chain', () => {
    const source = baseState()
    const gameState: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 10,
        workers: 0,
        researchers: 0,
        botDistribution: 0.5,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [0, 1],
          ai_managers: [0, 1],
          servers: [0, 1],
          data_centers: [0, 1],
          planets: [0, 1],
        },
      },
    }

    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(gameState),
        context(),
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    const next = result.candidateState.state.gameState.dyson
    expect(next.workers).toBe(5)
    expect(next.researchers).toBe(5)
    expect(next.money).toBeGreaterThan(0)
    expect(next.science).toBeGreaterThan(0)
    expect(next.totalPanelsDecayed).toBeGreaterThan(0)
    expect(next.bots).toBeGreaterThan(10)
    expect(next.facilities.assembly_lines[0]).toBeGreaterThan(0)
    expect(next.facilities.ai_managers[0]).toBeGreaterThan(0)
    expect(next.facilities.servers[0]).toBeGreaterThan(0)
    expect(next.facilities.data_centers[0]).toBeGreaterThan(0)
  })

  test('advances every active Education subject through active and stored event time', () => {
    const educationIds = [
      'engineering',
      'shipping',
      'worldTrade',
      'worldPeace',
      'mathematics',
      'advancedPhysics',
    ] as const
    const source = baseState()
    const activeEducation = Object.fromEntries(
      educationIds.map((id) => [
        id,
        {
          ...source.dream.education[id],
          active: true,
          complete: false,
          progress: 0,
          researchTime: 100,
        },
      ]),
    ) as unknown as CanonicalGameStateV1['dream']['education']
    const gameState: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        education: activeEducation,
      },
      timeline: {
        ...source.timeline,
        doubleTime: {
          unlocked: true,
          enabled: true,
          bankSeconds: 10,
          rate: 2,
        },
      },
    }

    for (const advanceTinker of [true, false]) {
      const result = advanceEventTime({
        startingState: new CanonicalEventTimeModel(
          carrier(gameState),
          { ...context(), advanceTinker },
        ),
        durationSeconds: 1,
        automationIntervalSeconds: 1,
        automationTimeUntilNextEvent: 1,
        infinityMinimumCycleSeconds: 10,
        processingBudgetMilliseconds: 0,
      })

      expect(result.completed).toBe(true)
      expect(result.diagnosticCode).toBeUndefined()
      for (const id of educationIds) {
        expect(
          result.candidateState.state.gameState.dream.education[id]
            .progress,
        ).toBe(3)
      }
    }
  })

  test('keeps adaptive railgun volleys exact across Double Time event boundaries', () => {
    const source = baseState()
    const gameState: CanonicalGameStateV1 = {
      ...source,
      timeline: {
        ...source.timeline,
        automationTimeUntilNextEvent: 0.1,
        doubleTime: {
          unlocked: true,
          enabled: true,
          bankSeconds: 100,
          rate: 2,
        },
      },
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 1_000_000_000,
          railgunCharge: 175_000_000,
          spaceFactories: 10,
          dysonPanels: 14n,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
          railgunActivator1: true,
          railgunActivator2: true,
        },
      },
    }

    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(gameState),
        context(REALITY_UPGRADE_DEFINITIONS, 0.1),
      ),
      durationSeconds: 1.1,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    const next = result.candidateState.state.gameState
    expect(next.dream.resources.swarmPanels).toBe(140n)
    expect(next.dream.resources.railgunCharge).toBe(0)
    expect(next.dream.railgun).toEqual({
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
    })
    expect(next.timeline.doubleTime.bankSeconds).toBeCloseTo(97.8)
  })

  test('finalizes elapsed statistics before a bot-cap persistence pause', () => {
    const source = baseState()
    const capped: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: Number.MAX_VALUE,
      },
    }
    const model = new CanonicalEventTimeModel(
      carrier(capped),
      context(),
    )
    const summary = createSimulationSummary()
    model.advanceContinuous(0.5)
    model.applyProductionArrivals(summary)
    model.applyDerivedTimersAndDoubleTime(0.5, summary)
    model.applyDreamReset(summary)
    model.applyBotCapTransition(summary)

    expect(model.validate())
      .toBe('CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED')
    expect(
      model.state.gameState.statistics
        .trackedSimulatedSeconds,
    ).toBeCloseTo(0.5, 12)
  })

  test('uses total Infinity points for the 42 gate and selects only the unlocked branch', () => {
    const below = new CanonicalEventTimeModel(
      carrier({
        ...baseState(),
        infinity: {
          ...baseState().infinity,
          points: 41n,
        },
      }),
      context(),
    )
    below.applyQueuedInput(
      { timeSeconds: 0, kind: CANONICAL_QUANTUM_LEAP_INPUT },
      createSimulationSummary(),
    )
    expect(below.lastQueuedInputOutcome).toEqual({
      accepted: false,
      changed: false,
      code: 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS',
    })
    expect(below.state.gameState.infinity.points).toBe(41n)

    const entangledState = baseState()
    const entangled = new CanonicalEventTimeModel(
      carrier({
        ...entangledState,
        infinity: {
          ...entangledState.infinity,
          points: 84n,
          spentPoints: 42n,
        },
        quantum: {
          ...entangledState.quantum,
          unlocks: {
            ...entangledState.quantum.unlocks,
            quantumEntanglement: true,
          },
        },
      }),
      context(),
    )
    entangled.applyQueuedInput(
      { timeSeconds: 0, kind: CANONICAL_QUANTUM_LEAP_INPUT },
      createSimulationSummary(),
    )
    expect(entangled.lastQueuedInputOutcome?.code).toBe(
      'QUANTUM_ENTANGLEMENT_APPLIED',
    )
    expect(entangled.state.gameState.infinity.points).toBe(42n)
    expect(entangled.state.gameState.quantum.pointsEarned).toBe(1n)
    expect(entangled.state.gameState.dyson).toEqual(
      entangledState.dyson,
    )
  })

  test('derives artifact points internally and preserves only owned AddSkillPoints effects across Infinity and Quantum', () => {
    const source = withRealityArtifacts(baseState())
    const derived = deriveCanonicalArtifactSkillPoints(
      source,
      artifactDefinitions,
    )
    expect(derived).toEqual({ ok: true, value: 10n })

    const infinityState: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 4.2e19,
      },
      timeline: {
        ...source.timeline,
        infinityCycleSeconds: 1,
      },
    }
    const infinity = new CanonicalEventTimeModel(
      carrier(infinityState),
      context(artifactDefinitions),
    )
    infinity.applyInfinityReset(1, createSimulationSummary())
    expect(infinity.issue).toBeUndefined()
    expect(infinity.state.gameState.skills.points).toBe(10n)

    const quantum = new CanonicalEventTimeModel(
      carrier({
        ...source,
        infinity: {
          ...source.infinity,
          points: 42n,
        },
      }),
      context(artifactDefinitions),
    )
    quantum.applyQueuedInput(
      { timeSeconds: 0, kind: CANONICAL_QUANTUM_LEAP_INPUT },
      createSimulationSummary(),
    )
    expect(quantum.issue).toBeUndefined()
    expect(quantum.lastQueuedInputOutcome?.code).toBe(
      'QUANTUM_LEAP_APPLIED',
    )
    expect(quantum.state.gameState.skills.points).toBe(10n)
    expect(quantum.state.gameState.infinity.points).toBe(0n)
    expect(quantum.state.gameState.quantum.pointsEarned).toBe(1n)
  })

  test('uses exact Infinity boundaries and records a colliding interval summary once after resets', () => {
    const source = baseState()
    const collision: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 4.2e19,
      },
      infinity: {
        ...source.infinity,
        points: 42n,
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          quantumEntanglement: true,
        },
      },
      dream: {
        ...source.dream,
        disasterStage: 0n,
        resources: {
          ...source.dream.resources,
          villages: 25,
          cities: 0,
        },
      },
    }
    expect(
      evaluateCanonicalInfinityBoundary(carrier(collision), 1),
    ).toEqual({ status: 'not-ready' })

    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(collision),
        context(),
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 1,
      processingBudgetMilliseconds: 0,
      queuedInputs: [
        {
          timeSeconds: 1,
          kind: CANONICAL_QUANTUM_LEAP_INPUT,
          id: 'collision',
        },
      ],
    })

    expect(result.diagnosticCode).toBeUndefined()
    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    expect(result.events.map((event) => event.kind)).toEqual([
      'production-arrival',
      'queued-input',
      'automation',
    ])
    expect(result.summary).toMatchObject({
      ordinaryInfinityCount: 1n,
      ordinaryInfinityPoints: 1n,
      meteorDreamResets: 1n,
      strangeMatter: 1n,
      realityWorkers: 4n,
    })
    const statistics = result.candidateState.state.gameState.statistics
    expect(statistics.trackedSimulatedSeconds).toBe(1)
    expect(statistics.lifetime.simulatedSeconds).toBe(1)
    expect(statistics.lifetime.ordinaryInfinityCount).toBe(1n)
    expect(statistics.lifetime.ordinaryInfinityPoints).toBe(1n)
    expect(statistics.lifetime.meteorDreamResets).toBe(1n)
    expect(statistics.lifetime.strangeMatter).toBe(1n)
    expect(statistics.lifetime.realityWorkers).toBe(4n)
  })

  test('publishes one dynamic recalculation per material interval and survives split reconstruction', () => {
    const source = baseState()
    const dynamicSource: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        workers: 40,
        researchers: 10,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [5, 0],
          ai_managers: [2, 0],
          servers: [1, 0],
        },
      },
      skills: {
        ...source.skills,
        byId: {
          ...source.skills.byId,
          rocketMania: {
            ...source.skills.byId.rocketMania!,
            owned: true,
          },
        },
      },
      timeline: {
        ...source.timeline,
        automationTimeUntilNextEvent: 0.5,
      },
    }
    const previousSnapshot = {
      ...hydrated.skillEffectEvaluationSnapshot,
      panelsPerSecond: 400,
      panelLifetimeSeconds: 20,
    }
    const originalCarrier = carrier(
      dynamicSource,
      previousSnapshot,
    )
    const untouched = structuredClone(originalCarrier)
    const whole = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        originalCarrier,
        context(REALITY_UPGRADE_DEFINITIONS, 0.5),
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 0.5,
      automationTimeUntilNextEvent: 0.5,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })
    const first = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        originalCarrier,
        context(REALITY_UPGRADE_DEFINITIONS, 0.5),
      ),
      durationSeconds: 0.5,
      automationIntervalSeconds: 0.5,
      automationTimeUntilNextEvent: 0.5,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })
    const expectedFirst = deriveBasicDysonState(
      first.candidateState.state.gameState,
      originalCarrier.compatibilityTuning,
      originalCarrier.entitlements,
      previousSnapshot,
    )
    expect(expectedFirst.ok).toBe(true)
    if (!expectedFirst.ok) {
      throw new Error(JSON.stringify(expectedFirst.issues))
    }
    expect(first.candidateState.state.evaluationSnapshot).toEqual(
      expectedFirst.value.nextEvaluationSnapshot,
    )
    const reconstructed = new CanonicalEventTimeModel(
      structuredClone(first.candidateState.state),
      context(REALITY_UPGRADE_DEFINITIONS, 0.5),
    )
    const second = advanceEventTime({
      startingState: reconstructed,
      durationSeconds: 0.5,
      automationIntervalSeconds: 0.5,
      automationTimeUntilNextEvent:
        first.automationTimeUntilNextEvent,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(originalCarrier).toEqual(untouched)
    expect(second.completed).toBe(true)
    expect(second.candidateState.state.compatibilityTuning).toEqual(
      whole.candidateState.state.compatibilityTuning,
    )
    expect(second.candidateState.state.evaluationSnapshot).toEqual(
      whole.candidateState.state.evaluationSnapshot,
    )
    expect(
      second.candidateState.state.gameState.timeline,
    ).toEqual(whole.candidateState.state.gameState.timeline)
    expect(
      second.candidateState.state.gameState.statistics.lifetime,
    ).toEqual(
      whole.candidateState.state.gameState.statistics.lifetime,
    )
    expect(
      second.candidateState.state.gameState.statistics.currentQuantumRun,
    ).toEqual(
      whole.candidateState.state.gameState.statistics.currentQuantumRun,
    )
  })

  test('fails closed when an owned Reality artifact definition is absent', () => {
    const source = withRealityArtifacts(baseState())
    const model = new CanonicalEventTimeModel(
      carrier({
        ...source,
        infinity: {
          ...source.infinity,
          points: 42n,
        },
      }),
      context(new Map()),
    )

    model.applyQueuedInput(
      { timeSeconds: 0, kind: CANONICAL_QUANTUM_LEAP_INPUT },
      createSimulationSummary(),
    )

    expect(model.lastQueuedInputOutcome).toEqual({
      accepted: false,
      changed: false,
      code: 'CANONICAL_EVENT_QUANTUM_RESET_REJECTED',
    })
    expect(model.issue).toMatchObject({
      code: 'CANONICAL_EVENT_REALITY_DEFINITION_MISSING',
      path: 'gameData.realityUpgrades.translation1',
    })
    expect(model.state.gameState.infinity.points).toBe(42n)
  })

  test('keeps Tinker timing backend-owned and lands its reward at the exact material horizon', () => {
    const source = baseState()
    const model = new CanonicalEventTimeModel(
      carrier({
        ...source,
        dyson: {
          ...source.dyson,
          manualCreationIntervalSeconds: 2,
        },
        timeline: {
          ...source.timeline,
          automationTimeUntilNextEvent: 10,
        },
      }),
      context(REALITY_UPGRADE_DEFINITIONS, 10),
    )

    expect(model.startTinker(false)).toBe(true)
    expect(model.timeToNextMaterialEvent(10, 10)).toBe(1.9)

    const result = advanceEventTime({
      startingState: model,
      durationSeconds: 1.9,
      automationIntervalSeconds: 10,
      automationTimeUntilNextEvent: 10,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.diagnosticCode).toBeUndefined()
    expect(result.completed).toBe(true)
    expect(result.candidateState.state.gameState.dyson.bots).toBe(1)
    expect(
      result.candidateState.state.gameState.dyson
        .manualCreationIntervalSeconds,
    ).toBe(1)
    expect(result.candidateState.state.tinker).toMatchObject({
      running: false,
      repeat: false,
      elapsedSeconds: 0,
    })
  })

  test('advances goals through the active-time event boundary', () => {
    const source = baseState()
    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier({
          ...source,
          dyson: {
            ...source.dyson,
            bots: 10,
          },
        }),
        context(),
      ),
      durationSeconds: 0.1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    expect(
      result.candidateState.state.gameState.dyson.goalStage,
    ).toBe(1n)
    expect(
      result.candidateState.state.gameState.skills.points,
    ).toBe(1n)
  })

  test('advances goals through the stored-time event path', () => {
    const source = baseState()
    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier({
          ...source,
          dyson: {
            ...source.dyson,
            goalStage: 1n,
            facilities: {
              ...source.dyson.facilities,
              assembly_lines: [0, 5],
            },
          },
        }),
        { ...context(), advanceTinker: false },
      ),
      durationSeconds: 0.1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    expect(
      result.candidateState.state.gameState.dyson.goalStage,
    ).toBe(2n)
    expect(
      result.candidateState.state.gameState.skills.points,
    ).toBe(1n)
  })
})
