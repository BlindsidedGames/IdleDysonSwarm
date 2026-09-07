import { OVERFLOW_BOT_CAP } from './overflowBoundary'
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
  prepareCanonicalEventTimeContext,
  prepareCanonicalEventTimeContextVariants,
  withCanonicalEventTimeAutomationInterval,
  type CanonicalEventTimeContext,
  type CanonicalEventTimeState,
} from './canonicalEventTimeModel'
import { evaluateCanonicalBotCapCheckpoint } from './canonicalBotCapCheckpoint'
import { SIMULATION_UPGRADE_DEFINITIONS } from './dreamEducationUpgrades'
import { advanceEventTime } from './eventTime'
import { advanceGame } from './gameStep'
import {
  REALITY_UPGRADE_DEFINITIONS,
  type RealityUpgradeDefinition,
  type RealityUpgradeId,
} from './realityUpgrades'
import { createCanonicalTinkerRuntimeState } from './canonicalTinker'
import {
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
} from './numeric'
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
    strangeMatter: 0,
    realityWorkers: 0n,
    automaticInfluence: 0,
    manualInfluence: 0,
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
    strangeMatter: 0,
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
      automaticResetEnabled: true,
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
      influence: 0,
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
      strangeMatter: 0,
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
    mode: 'active',
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

/**
 * Legacy parity coverage for the pre-rewrite event-time adapter. Authoritative
 * active and Stored Time acceptance belongs in gameStep.test.ts; this suite
 * must not define cadence, grouping, or partition-equivalence requirements.
 */
describe('legacy canonical event-time parity adapter', () => {
  test('shares prepared definitions between active and stored-time contexts', () => {
    const source = context()
    const variants = prepareCanonicalEventTimeContextVariants(source)

    expect(variants.active.mode).toBe('active')
    expect(variants.storedTime.mode).toBe('stored-time')
    expect(variants.active.dreamResetDefinitions).toBe(
      variants.storedTime.dreamResetDefinitions,
    )
    expect(variants.active.realityUpgradeDefinitions).toBe(
      variants.storedTime.realityUpgradeDefinitions,
    )
    expect(variants.active.dysonPresentationTuning).toBe(
      variants.storedTime.dysonPresentationTuning,
    )
    expect(variants.active.realityWorkerTuning).toBe(
      variants.storedTime.realityWorkerTuning,
    )
    expect(prepareCanonicalEventTimeContext(variants.active)).toBe(
      variants.active,
    )
    expect(prepareCanonicalEventTimeContext(variants.storedTime)).toBe(
      variants.storedTime,
    )
    expect(prepareCanonicalEventTimeContextVariants(source)).toBe(variants)
    const adjusted = withCanonicalEventTimeAutomationInterval(
      variants.storedTime,
      2,
      0.5,
    )
    expect(withCanonicalEventTimeAutomationInterval(
      variants.storedTime,
      2,
      0.5,
    )).toBe(adjusted)
  })

  test.each([undefined, 'background'])(
    'rejects invalid runtime mode %s before direct or variant preparation',
    (mode) => {
      const invalid = {
        ...context(),
        mode,
      } as unknown as CanonicalEventTimeContext

      expect(() => prepareCanonicalEventTimeContext(invalid)).toThrow(
        /mode must be 'active' or 'stored-time'/,
      )
      expect(() => prepareCanonicalEventTimeContextVariants(invalid)).toThrow(
        /mode must be 'active' or 'stored-time'/,
      )
    },
  )

  test('prepares detached immutable definitions once for every model clone', () => {
    const dreamDefinitions = new Map(
      [...SIMULATION_UPGRADE_DEFINITIONS].map(([key, definition]) => [
        key,
        structuredClone(definition),
      ]),
    )
    const realityDefinitions = new Map(
      [...artifactDefinitions].map(([key, definition]) => [
        key,
        structuredClone(definition),
      ]),
    )
    const sourceContext = {
      ...context(realityDefinitions),
      dreamResetDefinitions: dreamDefinitions,
    }
    const prepared = prepareCanonicalEventTimeContext(sourceContext)
    const preparedAgain = prepareCanonicalEventTimeContext(prepared)
    const preparedReality = prepared.realityUpgradeDefinitions.get(
      'translation1',
    )!
    const preparedDream = prepared.dreamResetDefinitions.get(
      'counterMeteor',
    )!
    const model = new CanonicalEventTimeModel(
      carrier({
        ...withRealityArtifacts(baseState()),
        infinity: {
          ...baseState().infinity,
          points: 42n,
        },
      }),
      prepared,
    )

    expect(preparedAgain).toBe(prepared)
    expect(prepared.realityUpgradeDefinitions).not.toBe(
      realityDefinitions,
    )
    expect(preparedReality).not.toBe(
      realityDefinitions.get('translation1'),
    )
    expect(Object.isFrozen(prepared.realityUpgradeDefinitions)).toBe(
      true,
    )
    expect(Object.isFrozen(preparedReality)).toBe(true)
    expect(Object.isFrozen(preparedReality.purchaseEffects)).toBe(true)
    expect(Object.isFrozen(preparedReality.purchaseEffects[0])).toBe(
      true,
    )
    expect(Object.isFrozen(preparedDream.prerequisites)).toBe(true)

    const sourceReality = realityDefinitions.get('translation1')!
    const sourceDream = dreamDefinitions.get('counterMeteor')!
    ;(
      sourceReality.purchaseEffects[0] as {
        numericValue: number
      }
    ).numericValue = 999
    ;(
      sourceDream.purchaseEffects[0] as {
        numericValue: number
      }
    ).numericValue = 999
    realityDefinitions.clear()
    dreamDefinitions.clear()

    expect(preparedReality.purchaseEffects[0]?.numericValue).toBe(2.5)
    expect(preparedDream.purchaseEffects[0]?.numericValue).not.toBe(999)
    expect(() =>
      (
        prepared.realityUpgradeDefinitions as Map<
          RealityUpgradeId,
          RealityUpgradeDefinition
        >
      ).clear(),
    ).toThrow(TypeError)
    expect(() =>
      (
        preparedReality.purchaseEffects as RealityUpgradeDefinition['purchaseEffects'] &
          unknown[]
      ).push(preparedReality.purchaseEffects[0]!),
    ).toThrow(TypeError)

    const clone = model.clone()
    clone.applyQueuedInput(
      { timeSeconds: 0, kind: CANONICAL_QUANTUM_LEAP_INPUT },
      createSimulationSummary(),
    )
    expect(clone.issue).toBeUndefined()
    expect(clone.lastQueuedInputOutcome?.code).toBe(
      'QUANTUM_LEAP_APPLIED',
    )
    expect(clone.state.gameState.skills.points).toBe(10n)
  })

  test('transfers its owned carrier once and rejects every later use', () => {
    const source = carrier(baseState())
    const model = new CanonicalEventTimeModel(source, context())

    const taken = model.takeState()

    expect(taken).not.toBe(source)
    expect(taken.gameState).toEqual(source.gameState)
    expect(() => model.takeState()).toThrow(/already been transferred/)
    expect(() => model.state).toThrow(/already been transferred/)
    expect(() => model.validate()).toThrow(/already been transferred/)
    expect(() => model.clone()).toThrow(/already been transferred/)
    expect(() => model.issue).toThrow(/already been transferred/)
  })

  test('adopts an application-owned carrier without cloning it', () => {
    const source = carrier(baseState())
    const model = CanonicalEventTimeModel.fromOwnedState(
      source,
      context(),
    )

    expect(model.takeState()).toBe(source)
  })

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

  test('advances every active Education subject during active time', () => {
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
    expect(result.diagnosticCode).toBeUndefined()
    expect(result.summary.disasterEvents).toEqual([])
    for (const id of educationIds) {
      expect(
        result.candidateState.state.gameState.dream.education[id]
          .progress,
      ).toBe(1)
    }
  })

  test('advances Dream and Reality under Stored Time while leaving retired Double Time state untouched', () => {
    const source = baseState()
    const gameState: CanonicalGameStateV1 = {
      ...source,
      meta: {
        ...source.meta,
        navigationRouteDiscovery: {
          knownRoutes: ['reality'],
          unvisitedRoutes: [],
        },
      },
      dyson: {
        ...source.dyson,
        bots: 10,
        science: 1_000_000_000,
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
      infinity: {
        ...source.infinity,
        automationUnlocked: {
          ...source.infinity.automationUnlocked,
          research: true,
        },
      },
      dream: {
        ...source.dream,
        disasterStage: 0n,
        resources: {
          ...source.dream.resources,
          cities: 1,
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
        education: {
          ...source.dream.education,
          engineering: {
            ...source.dream.education.engineering,
            active: true,
            complete: false,
            progress: 0,
            researchTime: 100,
          },
        },
      },
      reality: {
        ...source.reality,
        workerGenerationProgress: 0.25,
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
    const beforeDoubleTime = structuredClone(gameState.timeline.doubleTime)
    const storedContext = prepareCanonicalEventTimeContextVariants(
      context(),
    ).storedTime
    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(gameState),
        storedContext,
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    const next = result.candidateState.state.gameState
    expect(next.dream).not.toEqual(gameState.dream)
    expect(next.reality).not.toEqual(gameState.reality)
    expect(next.timeline.doubleTime).toEqual(beforeDoubleTime)
    expect(next.dyson.money).toBeGreaterThan(gameState.dyson.money)
    expect(next.dyson.bots).toBeGreaterThan(gameState.dyson.bots)
    expect(next.research.levelsById).not.toEqual(
      gameState.research.levelsById,
    )
    expect(result.summary.disasterEvents).toEqual([])
    expect(result.summary.storedTimeFirstDisasterEvents).toEqual([
      {
        cause: 'Meteor',
        strangeMatterGranted: 1,
        resetCount: 1n,
        firstLifetimeOccurrence: true,
        preResetEra: 'space-age',
      },
    ])
    const repeatState: CanonicalGameStateV1 = {
      ...gameState,
      statistics: {
        ...gameState.statistics,
        lifetime: {
          ...gameState.statistics.lifetime,
          meteorDreamResets: 1n,
        },
      },
    }
    const repeatResult = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(repeatState),
        storedContext,
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })
    expect(repeatResult.summary.disasterEvents).toEqual([])
    expect(repeatResult.summary.storedTimeFirstDisasterEvents).toEqual([])
    const activeResult = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(gameState),
        prepareCanonicalEventTimeContextVariants(context()).active,
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(activeResult.completed).toBe(true)
    expect(activeResult.diagnosticCode).toBeUndefined()
    const activeNext = activeResult.candidateState.state.gameState
    expect(activeNext.dream).not.toEqual(gameState.dream)
    expect(activeNext.dream.resetCount).toBe(
      gameState.dream.resetCount + 1n,
    )
    expect(activeNext.reality.universeDesignationCount).toBeGreaterThan(
      gameState.reality.universeDesignationCount,
    )
    expect(activeNext.timeline.doubleTime).toEqual(
      gameState.timeline.doubleTime,
    )
    expect(activeResult.summary).toMatchObject({
      meteorDreamResets: 1n,
      strangeMatter: 1,
      realityWorkers: 4n,
    })
    expect(activeResult.summary.disasterEvents).toEqual([
      {
        cause: 'Meteor',
        strangeMatterGranted: 1,
        resetCount: 1n,
        firstLifetimeOccurrence: true,
        preResetEra: 'space-age',
      },
    ])
    expect(
      activeNext.statistics.lifetime.meteorDreamResets,
    ).toBe(1n)
    expect(activeNext.statistics.lifetime.realityWorkers).toBe(4n)
  })

  test('batches at most one railgun volley at each automation boundary', () => {
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
    expect(next.dream.resources.swarmPanels).toBeGreaterThan(0n)
    expect(next.dream.resources.railgunCharge).toBeGreaterThanOrEqual(0)
    expect(next.dream.railgun.lastRoundsFired).toBeGreaterThan(0)
    expect(next.dream.railgun.lastRoundsFired).toBeLessThanOrEqual(10)
    expect(next.dream.railgun.reservedPanels).toBeGreaterThanOrEqual(0n)
    expect(next.timeline.doubleTime.bankSeconds).toBe(100)
  })

  test('does not consume the retired Double Time bank inside the domain model', () => {
    const source = baseState()
    const gameState: CanonicalGameStateV1 = {
      ...source,
      timeline: {
        ...source.timeline,
        automationTimeUntilNextEvent: 0.1,
        doubleTime: {
          unlocked: true,
          enabled: true,
          bankSeconds: 0.05,
          rate: 10,
        },
      },
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 10n,
        },
      },
    }

    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier(gameState),
        context(REALITY_UPGRADE_DEFINITIONS, 0.1),
      ),
      durationSeconds: 0.1,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    const next = result.candidateState.state.gameState
    expect(next.timeline.doubleTime.bankSeconds).toBe(0.05)
    expect(next.dream.resources.swarmPanels).toBe(1n)
    expect(next.dream.railgun.lastRoundsFired).toBe(1)
    expect(next.dream.railgun.shotsRemaining).toBe(9)
    expect(next.dream.railgun.fireProgress).toBe(0)
  })

  test('finalizes elapsed statistics before a bot-cap persistence pause', () => {
    const source = baseState()
    const capped: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: Number.MAX_VALUE,
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          breakTheLoop: true,
        },
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

  test('captures a bot milestone before reset only when the host enables evidence', () => {
    const source = baseState()
    const resetState = {...source, dyson:{...source.dyson,bots:4.2e19},timeline:{...source.timeline,infinityCycleSeconds:1}}
    const ordinary = new CanonicalEventTimeModel(carrier(resetState),context())
    const reporting = new CanonicalEventTimeModel({...carrier(resetState),achievementEvidence:{unlocked:[],statistics:{},presence:''}},context())
    ordinary.applyInfinityReset(1,createSimulationSummary())
    reporting.applyInfinityReset(1,createSimulationSummary())
    expect(reporting.issue).toBeUndefined()
    expect(reporting.state.gameState.dyson.bots).toBeLessThan(4.2e19)
    expect(reporting.state.achievementEvidence?.unlocked).toContain('achievement.bots_42qi')
    expect(ordinary.state.achievementEvidence).toBeUndefined()
    expect(reporting.state.gameState).toEqual(ordinary.state.gameState)
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

  test('continues Infinity progression under the Stored Time domain policy', () => {
    const source = baseState()
    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier({
          ...source,
          dyson: {
            ...source.dyson,
            bots: 4.2e19,
          },
        }),
        prepareCanonicalEventTimeContextVariants(context()).storedTime,
      ),
      durationSeconds: 1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    expect(result.summary.ordinaryInfinityCount).toBe(1n)
    expect(result.summary.ordinaryInfinityPoints).toBe(1n)
    expect(
      result.candidateState.state.gameState.infinity.points,
    ).toBe(1n)
  })

  test.each([
    ['ordinary active', false, false],
    ['Break active', true, false],
    ['ordinary Stored Time', false, true],
  ] as const)(
    'leaves a ready %s cycle running while automatic Infinity is disabled',
    (_label, breakTheLoop, storedTime) => {
      const source = baseState()
      const disabled: CanonicalGameStateV1 = {
        ...source,
        dyson: {
          ...source.dyson,
          bots: 4.2e19,
        },
        infinity: {
          ...source.infinity,
          automaticResetEnabled: false,
          breakTarget: 1n,
        },
        quantum: {
          ...source.quantum,
          unlocks: {
            ...source.quantum.unlocks,
            breakTheLoop,
          },
        },
      }
      expect(
        evaluateCanonicalInfinityBoundary(carrier(disabled), 1),
      ).toEqual({ status: 'not-ready' })

      const result = advanceEventTime({
        startingState: new CanonicalEventTimeModel(
          carrier(disabled),
          storedTime
            ? prepareCanonicalEventTimeContextVariants(context()).storedTime
            : context(),
        ),
        durationSeconds: 1,
        automationIntervalSeconds: 1,
        automationTimeUntilNextEvent: 1,
        infinityMinimumCycleSeconds: 1,
        processingBudgetMilliseconds: 0,
      })

      expect(result.completed).toBe(true)
      expect(result.diagnosticCode).toBeUndefined()
      expect(result.summary.ordinaryInfinityCount).toBe(0n)
      expect(result.summary.breakInfinityCount).toBe(0n)
      expect(result.candidateState.state.gameState.infinity.points).toBe(0n)
      if (storedTime) {
        expect(
          result.candidateState.state.gameState.infinity
            .currentCyclePeakIpPerMinute,
        ).toBe(0)
        expect(
          result.candidateState.state.gameState.infinity
            .currentCyclePeakReward,
        ).toBe(0n)
      } else {
        expect(
          result.candidateState.state.gameState.infinity
            .currentCyclePeakIpPerMinute,
        ).toBeGreaterThan(0)
        expect(
          result.candidateState.state.gameState.infinity
            .currentCyclePeakReward,
        ).toBeGreaterThanOrEqual(1n)
      }
      const finalBots = result.candidateState.state.gameState.dyson.bots
      if (breakTheLoop) {
        expect(finalBots).toBeGreaterThanOrEqual(4.2e19)
      } else {
        expect(finalBots).toBe(4.2e19)
      }
    },
  )

  test('keeps Strange Matter summaries finite above the legacy Int64 ceiling', () => {
    const source = baseState()
    const model = new CanonicalEventTimeModel(
      carrier({
        ...source,
        dream: {
          ...source.dream,
          disasterStage: 0n,
          resources: {
            ...source.dream.resources,
            cities: 1,
          },
        },
      }),
      context(),
    )
    const summary = createSimulationSummary()
    summary.strangeMatter = Number(DISCRETE_MAXIMUM) + 4_096

    model.applyDreamReset(summary)

    expect(model.issue).toBeUndefined()
    expect(summary.strangeMatter).toBe(Number(DISCRETE_MAXIMUM) + 4_096)
    expect(summary.meteorDreamResets).toBe(1n)
  })

  test('does not force a zero-time bot-cap prestige after eligibility is saved when automatic Infinity is disabled', () => {
    const source = baseState()
    const model = new CanonicalEventTimeModel(
      carrier({
        ...source,
        dyson: {
          ...source.dyson,
          bots: OVERFLOW_BOT_CAP,
        },
        infinity: {
          ...source.infinity,
          automaticResetEnabled: false,
          inProgress: false,
          botCapTransitionPending: true,
          botCapRewardsGranted: false,
        },
      }),
      context(),
    )

    expect(model.timeToNextMaterialEvent(10, 1)).toBeGreaterThan(0)
  })

  test('keeps Overflow eligibility latched when Stellar Sacrifices reduces Bots and they return to cap', () => {
    const source = baseState()
    const capped = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: OVERFLOW_BOT_CAP,
      },
      infinity: {
        ...source.infinity,
        automaticResetEnabled: false,
        inProgress: false,
        botCapTransitionPending: false,
        botCapRewardsGranted: false,
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          breakTheLoop: true,
          stellar: true,
        },
      },
      skills: {
        ...source.skills,
        byId: {
          ...source.skills.byId,
          stellarSacrifices: {
            ...source.skills.byId.stellarSacrifices,
            owned: true,
          },
          stellarDominance: {
            ...source.skills.byId.stellarDominance,
            owned: true,
          },
        },
      },
    }
    const pending = evaluateCanonicalBotCapCheckpoint(capped)
    expect(pending.action).toMatchObject({
      kind: 'persist',
      checkpoint: 'pending',
    })
    const reward = evaluateCanonicalBotCapCheckpoint(
      pending.candidateState,
    )
    expect(reward.candidateState.infinity.points).toBe(capped.infinity.points)
    expect(reward.candidateState.avocado).toEqual(pending.candidateState.avocado)
    const points = reward.candidateState.infinity.points
    const overflow = reward.candidateState.avocado.overflowMultiplier

    const active = advanceGame(
      carrier(reward.candidateState, {
        ...hydrated.skillEffectEvaluationSnapshot,
        panelsPerSecond: 1e120,
        panelLifetimeSeconds: 1e120,
      }),
      {
        source: 'active',
        baseSeconds: 0.1,
        automation: 'enabled',
      },
      context(),
      1 / 60,
    )

    expect(active.issue).toBeUndefined()
    expect(active.state.gameState.dyson.bots).toBeLessThan(OVERFLOW_BOT_CAP)
    expect(active.state.gameState.dyson.bots).toBeGreaterThan(0)
    expect(active.state.gameState.infinity).toMatchObject({
      points,
      automaticResetEnabled: false,
      botCapTransitionPending: true,
      botCapRewardsGranted: false,
    })
    expect(active.state.gameState.avocado.overflowMultiplier).toBe(overflow)
    expect(active.summary.botCapInfinityPoints).toBe(0n)
    expect(active.summary.botCapOverflowRewards).toBe(0n)

    const returnedToCap = {
      ...active.state.gameState,
      dyson: {
        ...active.state.gameState.dyson,
        bots: OVERFLOW_BOT_CAP,
      },
    }
    const repeated = evaluateCanonicalBotCapCheckpoint(returnedToCap)
    expect(repeated.action).toEqual({ kind: 'continue' })
    expect(repeated.candidateState.infinity.points).toBe(points)
    expect(repeated.candidateState.avocado.overflowMultiplier).toBe(overflow)
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
        prepareCanonicalEventTimeContextVariants(context()).storedTime,
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

  test.each([0, 5e-13])(
    'recovers a persisted automation phase at the zero boundary (%s)',
    (automationTimeUntilNextEvent) => {
      const source = baseState()
      const result = advanceEventTime({
        startingState: new CanonicalEventTimeModel(
          carrier({
            ...source,
            timeline: {
              ...source.timeline,
              automationTimeUntilNextEvent,
            },
          }),
          context(),
        ),
        durationSeconds: 0.01,
        automationIntervalSeconds: 1,
        automationTimeUntilNextEvent,
        infinityMinimumCycleSeconds: 10,
        processingBudgetMilliseconds: 0,
      })

      expect(result.completed).toBe(true)
      expect(result.diagnosticCode).toBeUndefined()
      expect(
        result.candidateState.state.gameState.timeline
          .automationTimeUntilNextEvent,
      ).toBeCloseTo(0.99, 12)
    },
  )

  test.each([
    {
      name: 'reset count',
      resetCount: DISCRETE_MAXIMUM,
      strangeMatter: 0,
    },
    {
      name: 'Strange Matter',
      resetCount: 0n,
      strangeMatter: CONTINUOUS_MAXIMUM,
    },
  ])(
    'does not schedule a zero-time Dream reset when the $name is saturated',
    ({ resetCount, strangeMatter }) => {
      const source = baseState()
      const result = advanceEventTime({
        startingState: new CanonicalEventTimeModel(
          carrier({
            ...source,
            dream: {
              ...source.dream,
              disasterStage: 0n,
              resetCount,
              strangeMatter,
              resources: {
                ...source.dream.resources,
                cities: 1,
              },
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
      expect(result.work.schedulerPasses).toBe(1n)
      expect(
        result.candidateState.state.gameState.dream.resetCount,
      ).toBe(resetCount)
      expect(
        result.candidateState.state.gameState.dream.strangeMatter,
      ).toBe(strangeMatter)
    },
  )

  test('keeps event-time production running when mega-structure rates saturate', () => {
    const source = baseState()
    const result = advanceEventTime({
      startingState: new CanonicalEventTimeModel(
        carrier({
          ...source,
          dyson: {
            ...source.dyson,
            facilities: {
              ...source.dyson.facilities,
              matrioshka_brains: [Number.MAX_VALUE, 0],
            },
          },
          infinity: {
            ...source.infinity,
            points: 5n,
          },
          quantum: {
            ...source.quantum,
            unlocks: {
              ...source.quantum.unlocks,
              matrioshkaBrains: true,
            },
          },
        }),
        context(),
      ),
      durationSeconds: 0.01,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      infinityMinimumCycleSeconds: 10,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.diagnosticCode).toBeUndefined()
    expect(
      result.candidateState.state.gameState.dyson.facilities.planets[0],
    ).toBe(Number.MAX_VALUE * 0.01)
  })
})
