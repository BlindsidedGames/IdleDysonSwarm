import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { TransactionalSimulationEngine } from '../core/simulationEngine'
import { getGameAsset } from '../game-data/catalog'
import { prepareIdb1Save } from '../save/prepare'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../simulation/canonicalEventTimeModel'
import { deriveBasicDysonState } from '../simulation/canonicalDysonDerivation'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { ordinaryInfinityBotThreshold } from '../simulation/infinityCycle'
import { bitDecrement, DISCRETE_MAXIMUM } from '../simulation/numeric'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import {
  createCanonicalGameEngineDefinition,
  previewCanonicalQuantumLeap,
} from './canonicalGameApplication'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function context(): CanonicalEventTimeContext {
  return {
    mode: 'active',
    automationIntervalSeconds: 1,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup([]),
  }
}

function runtime() {
  return structuredClone(
    new CanonicalRuntimeSession(
      prepareIdb1Save(fixture).prepared,
      {
        entitlements: {
          extraAnalysisPower: false,
          permanentDoubleIp: false,
        },
      },
    ).initialState,
  )
}

function enablePurity(
  state: ReturnType<typeof runtime>,
): void {
  const owned = (id: string) => ({
    ...(state.gameState.skills.byId[id] ?? {
      level: 0,
      timerSeconds: 0,
      secondaryTimerSeconds: 0,
    }),
    owned: true,
  })
  Object.assign(state, {
    gameState: {
      ...state.gameState,
      skills: {
        ...state.gameState.skills,
        activeAutoAssignment: [],
        byId: {
          ...state.gameState.skills.byId,
          purityOfMind: owned('purityOfMind'),
          purityOfBody: owned('purityOfBody'),
          purityOfSEssence: owned('purityOfSEssence'),
        },
      },
      quantum: {
        ...state.gameState.quantum,
        unlocks: {
          ...state.gameState.quantum.unlocks,
          purity: true,
        },
      },
    },
  })
}

function expectDysonDerivationReady(
  state: ReturnType<typeof runtime>,
): void {
  const derived = deriveBasicDysonState(
    state.gameState,
    state.compatibilityTuning,
    state.entitlements,
    state.evaluationSnapshot,
  )
  expect(derived.ok).toBe(true)
  if (!derived.ok) return
  expect(Object.values(derived.value.globals).every(Number.isFinite)).toBe(true)
  expect(Object.values(derived.value.rates).every(Number.isFinite)).toBe(true)
  expect(
    Object.values(derived.value.facilityModifiers).every(Number.isFinite),
  ).toBe(true)
  expect(
    Object.values(derived.value.nextEvaluationSnapshot).every(Number.isFinite),
  ).toBe(true)
}

describe('canonical game application engine', () => {
  test('advances an ordinary tick without cloning complete runtime state', () => {
    const base = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })
    const cloneState = vi.fn(base.cloneState)
    const engine = new TransactionalSimulationEngine(
      runtime(),
      { ...base, cloneState },
    )
    expect(cloneState).toHaveBeenCalledTimes(1)
    const initialSnapshot = engine.snapshot()
    expect(cloneState).toHaveBeenCalledTimes(1)
    expect(Object.isFrozen(initialSnapshot.state)).toBe(true)
    expect(Object.isFrozen(initialSnapshot.state.gameState.dyson)).toBe(true)

    expect(engine.advanceBy(100)).toMatchObject({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(cloneState).toHaveBeenCalledTimes(1)
    expect(engine.snapshot().state).not.toBe(initialSnapshot.state)
    expect(cloneState).toHaveBeenCalledTimes(1)
  })

  test('replaces changed branches without mutating a shallow-fork source', () => {
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })
    const source = runtime()
    const before = structuredClone(source)
    const activeCandidate = definition.forkState!(source)

    expect(definition.advance(activeCandidate, 100)).toEqual({
      accepted: true,
      changed: true,
    })
    expect(source).toEqual(before)
    expect(activeCandidate.gameState).not.toBe(source.gameState)

    const commandCandidate = definition.forkState!(source)
    expect(definition.applyCommand(commandCandidate, {
      kind: 'internal.development-set-dyson-bots',
      bots: 1_000,
    })).toEqual({ accepted: true, changed: true })
    expect(source).toEqual(before)
    expect(commandCandidate.gameState).not.toBe(source.gameState)
  })

  test('sets the development bot count through the current canonical allocation', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          bots: 0,
          workers: 0,
          researchers: 0,
          botDistribution: 0.25,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const result = definition.applyCommand(state, {
      kind: 'internal.development-set-dyson-bots',
      bots: 1_000,
    })

    expect(result).toEqual({ accepted: true, changed: true })
    expect(state.gameState.dyson).toMatchObject({
      bots: 1_000,
      workers: 750,
      researchers: 250,
      botDistribution: 0.25,
    })
  })

  test('executes a checkpointed manual Infinity while keeping automatic resets off', () => {
    const state = runtime()
    const beforePoints = state.gameState.infinity.points
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          bots: Number.MAX_VALUE,
        },
        infinity: {
          ...state.gameState.infinity,
          points: beforePoints + 1_000n,
          automaticResetEnabled: false,
          botCapRewardsGranted: true,
        },
        timeline: {
          ...state.gameState.timeline,
          infinityCycleSeconds: 1,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: {
        ...context(),
        infinityResetAssetLookup: getGameAsset,
      },
    })

    expect(definition.applyCommand(state, {
      kind: 'infinity.request-reset',
    })).toEqual({ accepted: true, changed: true })
    expect(state.gameState.infinity).toMatchObject({
      automaticResetEnabled: false,
      points: beforePoints + 1_001n,
    })
    expect(state.gameState.dyson.bots).toBeLessThan(Number.MAX_VALUE)
  })

  test('allows manual Break Infinity below the configured automatic target', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          bots: ordinaryInfinityBotThreshold(0n) * 1.01,
        },
        infinity: {
          ...state.gameState.infinity,
          automaticResetEnabled: false,
          breakTarget: 42n,
        },
        quantum: {
          ...state.gameState.quantum,
          divisionsPurchased: 0n,
          unlocks: {
            ...state.gameState.quantum.unlocks,
            breakTheLoop: true,
          },
        },
        timeline: {
          ...state.gameState.timeline,
          infinityCycleSeconds: 1,
        },
      },
    })
    const beforePoints = state.gameState.infinity.points
    const definition = createCanonicalGameEngineDefinition({
      eventContext: {
        ...context(),
        infinityResetAssetLookup: getGameAsset,
      },
    })

    expect(definition.applyCommand(state, {
      kind: 'infinity.request-reset',
    })).toEqual({ accepted: true, changed: true })
    expect(state.gameState.infinity.points).toBe(beforePoints + 1n)
    expect(state.gameState.infinity.automaticResetEnabled).toBe(false)
  })

  test('rejects manual Infinity until the finite bot-cap checkpoint is durable', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          bots: Number.MAX_VALUE,
        },
        infinity: {
          ...state.gameState.infinity,
          automaticResetEnabled: false,
          botCapTransitionPending: false,
          botCapRewardsGranted: false,
        },
        timeline: {
          ...state.gameState.timeline,
          infinityCycleSeconds: 1,
        },
      },
    })
    const before = structuredClone(state)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: {
        ...context(),
        infinityResetAssetLookup: getGameAsset,
      },
    })

    expect(definition.applyCommand(state, {
      kind: 'infinity.request-reset',
    })).toMatchObject({
      accepted: false,
      code: 'infinity-reset:CANONICAL-EVENT-BOT-CAP-PERSISTENCE-REQUIRED',
    })
    expect(state).toEqual(before)
  })

  test('rejects an invalid development bot count without changing state', () => {
    const state = runtime()
    const before = structuredClone(state)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const result = definition.applyCommand(state, {
      kind: 'internal.development-set-dyson-bots',
      bots: Number.NaN,
    })

    expect(result).toMatchObject({
      accepted: false,
      code: 'CANONICAL-DEVELOPMENT-BOTS-INVALID',
    })
    expect(state).toEqual(before)
  })

  test('applies a coherent development Reality unlock state', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        infinity: {
          ...state.gameState.infinity,
          points: 0n,
          spentPoints: 0n,
          secretsOfTheUniverse: 0n,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const result = definition.applyCommand(state, {
      kind: 'internal.development-unlock-reality',
    })

    expect(result).toEqual({ accepted: true, changed: true })
    expect(state.gameState.infinity).toMatchObject({
      points: 27n,
      spentPoints: 27n,
      secretsOfTheUniverse: 27n,
    })
  })

  test('applies Unity-parity development grants through one canonical action', () => {
    const state = runtime()
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    for (const action of [
      { kind: 'add-skill-points', amount: 3n },
      { kind: 'add-infinity-points', amount: 4n },
      { kind: 'add-quantum-shards', amount: 5n },
      { kind: 'add-strange-matter', amount: 6 },
      { kind: 'add-influence', amount: 7 },
    ] as const) {
      expect(
        definition.applyCommand(state, {
          kind: 'internal.development-apply-action',
          action,
        }),
      ).toEqual({ accepted: true, changed: true })
    }

    expect(state.gameState.skills.points).toBeGreaterThanOrEqual(3n)
    expect(state.gameState.infinity.points).toBeGreaterThanOrEqual(4n)
    expect(state.gameState.quantum.pointsEarned).toBeGreaterThanOrEqual(5n)
    expect(state.gameState.dream.strangeMatter).toBeGreaterThanOrEqual(6)
    expect(state.gameState.reality.influence).toBeGreaterThanOrEqual(7)
  })

  test('runs Unity auto-assignment immediately after granting skill points', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        skills: {
          ...state.gameState.skills,
          points: 0n,
          activeAutoAssignment: ['assemblyLineTree'],
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-skill-points', amount: 1n },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.skills.byId.assemblyLineTree?.owned).toBe(true)
    expect(state.gameState.skills.points).toBe(0n)
  })

  test('keeps a maximum Skill Point developer grant playable with Purity', () => {
    const state = runtime()
    enablePurity(state)
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        skills: {
          ...state.gameState.skills,
          points: 0n,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: {
          kind: 'add-skill-points',
          amount: DISCRETE_MAXIMUM,
        },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.skills.points).toBe(DISCRETE_MAXIMUM)
    expectDysonDerivationReady(state)
  })

  test('reopens an affected maximum Skill Point Purity save', () => {
    const prepared = prepareIdb1Save(fixture).prepared
    const sourceSession = new CanonicalRuntimeSession(prepared, {
      entitlements: {
        extraAnalysisPower: false,
        permanentDoubleIp: false,
      },
    })
    const affected = structuredClone(sourceSession.initialState)
    enablePurity(affected)
    Object.assign(affected, {
      gameState: {
        ...affected.gameState,
        skills: {
          ...affected.gameState.skills,
          points: DISCRETE_MAXIMUM,
        },
      },
    })

    const reopened = new CanonicalRuntimeSession(
      sourceSession.prepare(affected),
      {
        entitlements: {
          extraAnalysisPower: false,
          permanentDoubleIp: false,
        },
      },
    ).initialState

    expect(reopened.gameState.skills.points).toBe(DISCRETE_MAXIMUM)
    expect(reopened.gameState.skills.byId.purityOfMind?.owned).toBe(true)
    expect(reopened.gameState.skills.byId.purityOfBody?.owned).toBe(true)
    expect(reopened.gameState.skills.byId.purityOfSEssence?.owned).toBe(true)
    expectDysonDerivationReady(reopened)
  })

  test('retains zero-point development auto-assignment behavior', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        skills: {
          ...state.gameState.skills,
          points: 1n,
          activeAutoAssignment: ['assemblyLineTree'],
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-skill-points', amount: 0n },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.skills.byId.assemblyLineTree?.owned).toBe(true)
    expect(state.gameState.skills.points).toBe(0n)
  })

  test('publishes the exact skill preset application outcome as transient runtime state', () => {
    const state = runtime()
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'skill.select-preset',
        slot: 2,
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.lastSkillPresetApplication).toMatchObject({
      applicationSequence: 1,
      slot: 2,
      trigger: 'manual',
      retainedSkillIds: expect.any(Array),
      assignedSkillIds: expect.any(Array),
      pendingSkillIds: expect.any(Array),
      blockedByRetainedSkillIds: expect.any(Array),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'skill.select-preset',
        slot: 2,
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.lastSkillPresetApplication?.applicationSequence).toBe(2)
  })

  test('routes an automatic partial preset result through sequenced presentation events', () => {
    const state = runtime()
    const source = state.gameState
    const presets = structuredClone(source.skills.presets)
    Object.assign(presets[1], {
      name: 'Conflict preset',
      skillIds: ['banking', 'shouldersOfTheEnlightened'],
    })
    Object.assign(state, {
      gameState: {
        ...source,
        skills: {
          ...source.skills,
          points: 10n,
          byId: {
            shouldersOfGiants: {
              owned: true,
              level: 1,
              timerSeconds: 0,
              secondaryTimerSeconds: 0,
            },
            shouldersOfPrecursors: {
              owned: true,
              level: 1,
              timerSeconds: 0,
              secondaryTimerSeconds: 0,
            },
          },
          presets,
          tabPresetAutomation: {
            ...source.skills.tabPresetAutomation,
            bots: 2,
          },
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: {
        ...context(),
        infinityResetAssetLookup: getGameAsset,
      },
    })

    expect(definition.applyCommand(state, {
      kind: 'skill.apply-tab-preset-automation',
      tab: 'bots',
    })).toEqual({ accepted: true, changed: true })
    expect(state.presentationEvents).toEqual([
      expect.objectContaining({
        kind: 'skill-preset-conflict',
        sequence: 1,
        presetName: 'Conflict preset',
        application: expect.objectContaining({
          trigger: 'automatic',
          blockedByRetainedSkillIds: ['shouldersOfTheEnlightened'],
        }),
      }),
    ])
  })

  test('publishes a sequenced automatic-disaster event with pre-reset facts', () => {
    const state = runtime()
    const source = state.gameState
    Object.assign(state, {
      gameState: {
        ...source,
        dream: {
          ...source.dream,
          disasterStage: 0n,
          resources: {
            ...source.dream.resources,
            cities: 1,
            spaceFactories: 0,
          },
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(definition.advance(state, 1_000)).toEqual({
      accepted: true,
      changed: true,
    })
    expect(state.presentationEvents).toEqual([
      expect.objectContaining({
        kind: 'automatic-dream-disaster',
        sequence: 1,
        cause: 'Meteor',
        strangeMatterGranted: 1,
        resetCount: 1n,
        firstLifetimeOccurrence: true,
        preResetEra: 'information',
      }),
    ])

    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dream: {
          ...state.gameState.dream,
          disasterStage: 0n,
          resources: {
            ...state.gameState.dream.resources,
            cities: 1,
          },
        },
      },
    })
    expect(definition.advance(state, 1_000).accepted).toBe(true)
    expect(state.presentationEvents.at(-1)).toMatchObject({
      sequence: 2,
      cause: 'Meteor',
      firstLifetimeOccurrence: false,
    })
  })

  test('restores the development cash action without changing player commands', () => {
    const state = runtime()
    const before = state.gameState.dyson.money
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-cash', amount: 125 },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.dyson.money).toBe(before + 125)
  })

  test('applies signed development resource adjustments with canonical floors', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          money: 100,
          bots: 75,
          workers: 0,
          researchers: 0,
        },
        skills: {
          ...state.gameState.skills,
          points: 5n,
          activeAutoAssignment: ['assemblyLineTree'],
        },
        infinity: {
          ...state.gameState.infinity,
          points: 12n,
          spentPoints: 7n,
        },
        quantum: {
          ...state.gameState.quantum,
          pointsEarned: 20n,
          pointsSpent: 11n,
        },
        reality: {
          ...state.gameState.reality,
          influence: 9,
        },
        dream: {
          ...state.gameState.dream,
          strangeMatter: 8,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    for (const action of [
      { kind: 'add-cash', amount: -150 },
      { kind: 'add-bots', amount: -25 },
      { kind: 'add-skill-points', amount: -50n },
      { kind: 'add-infinity-points', amount: -50n },
      { kind: 'add-quantum-shards', amount: -50n },
      { kind: 'add-influence', amount: -50 },
      { kind: 'add-strange-matter', amount: -50 },
    ] as const) {
      expect(
        definition.applyCommand(state, {
          kind: 'internal.development-apply-action',
          action,
        }),
      ).toEqual({ accepted: true, changed: true })
    }

    expect(state.gameState.dyson.money).toBe(0)
    expect(state.gameState.dyson.bots).toBe(50)
    expect(state.gameState.skills.points).toBe(0n)
    expect(state.gameState.skills.byId.assemblyLineTree?.owned).toBe(false)
    expect(state.gameState.infinity.points).toBe(7n)
    expect(state.gameState.quantum.pointsEarned).toBe(11n)
    expect(state.gameState.reality.influence).toBe(0)
    expect(state.gameState.dream.strangeMatter).toBe(0)
  })

  test('applies signed Stored Time adjustments without advancing gameplay', () => {
    const state = runtime()
    state.gameState.timeline = {
      ...state.gameState.timeline,
      storedTimeAvailableSeconds: 10,
      storedTimeCapacitySeconds: 100,
      doubleTime: {
        ...state.gameState.timeline.doubleTime,
        bankSeconds: 5,
      },
    }
    const dysonBefore = structuredClone(state.gameState.dyson)
    const statisticsBefore = structuredClone(state.gameState.statistics)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-offline-time', seconds: -1 },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.timeline).toMatchObject({
      storedTimeAvailableSeconds: 9,
      storedTimeCapacitySeconds: 100,
      doubleTime: { bankSeconds: 5 },
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-offline-time', seconds: -1_000 },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.timeline.storedTimeAvailableSeconds).toBe(0)
    expect(state.gameState.dyson).toEqual(dysonBefore)
    expect(state.gameState.statistics).toEqual(statisticsBefore)
  })

  test('rejects non-finite and out-of-range signed development amounts atomically', () => {
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    for (const action of [
      { kind: 'add-cash', amount: Number.NaN },
      { kind: 'add-influence', amount: Number.NEGATIVE_INFINITY },
      { kind: 'add-offline-time', seconds: Number.POSITIVE_INFINITY },
      { kind: 'add-skill-points', amount: DISCRETE_MAXIMUM + 1n },
      { kind: 'add-quantum-shards', amount: -DISCRETE_MAXIMUM - 1n },
    ] as const) {
      const state = runtime()
      const before = structuredClone(state)
      expect(
        definition.applyCommand(state, {
          kind: 'internal.development-apply-action',
          action,
        }),
      ).toMatchObject({
        accepted: false,
        code: 'CANONICAL-DEVELOPMENT-ACTION-INVALID',
      })
      expect(state).toEqual(before)
    }
  })

  test('credits debug offline time without advancing active gameplay', () => {
    const state = runtime()
    state.gameState.timeline = {
      ...state.gameState.timeline,
      storedTimeAvailableSeconds: 10,
      storedTimeCapacitySeconds: 100,
      doubleTime: {
        ...state.gameState.timeline.doubleTime,
        bankSeconds: 5,
      },
    }
    const dysonBefore = structuredClone(state.gameState.dyson)
    const statisticsBefore = structuredClone(state.gameState.statistics)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'add-offline-time', seconds: 1_000 },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.timeline).toMatchObject({
      storedTimeAvailableSeconds: 100,
      storedTimeCapacitySeconds: 100,
      doubleTime: { bankSeconds: 0 },
    })
    expect(state.gameState.dyson).toEqual(dysonBefore)
    expect(state.gameState.statistics).toEqual(statisticsBefore)
  })

  test('resets Avotation secret progress through Developer Options', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        secretProgress: { completed: true, step: 7 },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind: 'reset-secret-progress' },
      }),
    ).toEqual({ accepted: true, changed: true })
    expect(state.gameState.secretProgress).toEqual({
      completed: false,
      step: 0,
    })
  })

  test('purchases, disables, and freely re-enables Developer Options', () => {
    const state = runtime()
    Object.assign(state, {
      debugOptionsEnabled: false,
      debugEntitlementPurchased: false,
      gameState: {
        ...state.gameState,
        quantum: {
          ...state.gameState.quantum,
          pointsEarned: 100_000n,
          pointsSpent: 0n,
        },
        dream: {
          ...state.gameState.dream,
          strangeMatter: 500_000,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })
    const dispatch = (kind: 'purchase-debug-options' | 'disable-debug-options') =>
      definition.applyCommand(state, {
        kind: 'internal.development-apply-action',
        action: { kind },
      })

    expect(dispatch('purchase-debug-options')).toEqual({
      accepted: true,
      changed: true,
    })
    expect(state).toMatchObject({
      debugOptionsEnabled: true,
      debugEntitlementPurchased: true,
    })
    expect(state.gameState.quantum.pointsEarned).toBe(0n)
    expect(state.gameState.dream.strangeMatter).toBe(0)

    expect(dispatch('disable-debug-options')).toEqual({
      accepted: true,
      changed: true,
    })
    expect(state.debugOptionsEnabled).toBe(false)
    expect(dispatch('purchase-debug-options')).toEqual({
      accepted: true,
      changed: true,
    })
    expect(state.debugOptionsEnabled).toBe(true)
  })

  test('charges a representable Strange Matter step for Developer Options at the double cap', () => {
    const state = runtime()
    Object.assign(state, {
      debugOptionsEnabled: false,
      debugEntitlementPurchased: false,
      gameState: {
        ...state.gameState,
        quantum: {
          ...state.gameState.quantum,
          pointsEarned: 100_000n,
          pointsSpent: 0n,
        },
        dream: {
          ...state.gameState.dream,
          strangeMatter: Number.MAX_VALUE,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(definition.applyCommand(state, {
      kind: 'internal.development-apply-action',
      action: { kind: 'purchase-debug-options' },
    })).toEqual({ accepted: true, changed: true })
    expect(state.gameState.dream.strangeMatter)
      .toBe(bitDecrement(Number.MAX_VALUE))
  })

  test('applies trusted host entitlements without persisting a paid save claim', () => {
    const state = runtime()
    Object.assign(state, {
      debugOptionsEnabled: false,
      debugEntitlementPurchased: false,
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    expect(definition.applyCommand(state, {
      kind: 'internal.replace-host-entitlements',
      entitlements: { permanentDoubleIp: true },
    })).toEqual({ accepted: true, changed: true })
    expect(definition.applyCommand(state, {
      kind: 'internal.development-apply-action',
      action: { kind: 'enable-host-debug-options' },
    })).toEqual({ accepted: true, changed: true })
    expect(state.entitlements.permanentDoubleIp).toBe(true)
    expect(state.debugOptionsEnabled).toBe(true)
    expect(state.debugEntitlementPurchased).toBe(false)
  })

  test('routes player settings with runtime carriers as one transaction', () => {
    const state = runtime()
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const result = definition.applyCommand(state, {
      kind: 'dyson.set-buy-mode',
      buyMode: 'buy-10',
    })

    expect(result).toEqual({ accepted: true, changed: true })
    expect(state.gameState.dyson.automation.buyMode).toBe('buy-10')
  })

  test('keeps Tinker outside a stored-time candidate', () => {
    const state = runtime()
    Object.assign(state, {
      presentationEvents: [{
        kind: 'automatic-dream-disaster',
        sequence: 1,
        cause: 'Meteor',
        strangeMatterGranted: 1,
        resetCount: 1n,
        firstLifetimeOccurrence: false,
        preResetEra: 'foundational',
      }],
      gameState: {
        ...state.gameState,
        timeline: {
          ...state.gameState.timeline,
          eventClockInitialized: true,
          automationTimeUntilNextEvent: 1,
          storedTimeAvailableSeconds: 10,
        },
      },
    })
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })
    const idleReference = structuredClone(state)
    const started = definition.applyCommand(state, {
      kind: 'tinker.start',
      repeat: false,
    })
    expect(started.accepted).toBe(true)
    const tinkerBefore = structuredClone(state.tinker)
    const presentationEventsBefore = structuredClone(
      state.presentationEvents,
    )

    const result = definition.applyCommand(state, {
      kind: 'internal.advance-stored-time',
      seconds: 0.01,
    })
    const idleResult = definition.applyCommand(idleReference, {
      kind: 'internal.advance-stored-time',
      seconds: 0.01,
    })

    expect(result.accepted).toBe(true)
    expect(idleResult.accepted).toBe(true)
    expect(state.tinker).toEqual(tinkerBefore)
    expect(state.presentationEvents).toEqual(presentationEventsBefore)
    expect(state.gameState.dyson.bots)
      .toBe(idleReference.gameState.dyson.bots)
    expect(state.gameState.dyson.facilities.assembly_lines)
      .toEqual(idleReference.gameState.dyson.facilities.assembly_lines)
    expect(state.gameState.timeline.storedTimeAvailableSeconds)
      .toBeCloseTo(9.99, 12)
  })

  test('settles a final-update bot cap in synchronous Stored Time replay', () => {
    const state = runtime()
    const byId = Object.fromEntries(
      Object.entries(state.gameState.skills.byId).map(([id, skill]) => [
        id,
        {
          ...skill,
          owned: id === 'worthySacrifice',
        },
      ]),
    ) as typeof state.gameState.skills.byId
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          bots: Number.MAX_VALUE - 3e293,
          facilities: {
            ...state.gameState.dyson.facilities,
            assembly_lines: [1e294, 0],
          },
        },
        skills: {
          ...state.gameState.skills,
          byId,
        },
        infinity: {
          ...state.gameState.infinity,
          automaticResetEnabled: false,
          botCapTransitionPending: false,
          botCapRewardsGranted: false,
          inProgress: false,
        },
        quantum: {
          ...state.gameState.quantum,
          unlocks: {
            ...state.gameState.quantum.unlocks,
            breakTheLoop: true,
          },
        },
        timeline: {
          ...state.gameState.timeline,
          eventClockInitialized: true,
          automationTimeUntilNextEvent: 0.05,
          infinityCycleSeconds: 1,
          storedTimeAvailableSeconds: 0.1,
          processing: {
            ...state.gameState.timeline.processing,
            storedTimePreset: 'fast',
          },
        },
      },
    })
    const pointsBefore = state.gameState.infinity.points
    const overflowBefore = state.gameState.avocado.overflowMultiplier
    const botCapPointsBefore =
      state.gameState.statistics.lifetime.botCapInfinityPoints
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const result = definition.applyCommand(state, {
      kind: 'internal.advance-stored-time',
      seconds: 0.1,
    })

    expect(result).toEqual({ accepted: true, changed: true })
    expect(state.gameState.timeline.storedTimeAvailableSeconds).toBe(0)
    expect(state.gameState.timeline.automationTimeUntilNextEvent).toBe(0)
    expect(state.gameState.infinity).toMatchObject({
      points: pointsBefore + 1_000n,
      botCapTransitionPending: false,
      botCapRewardsGranted: true,
      inProgress: true,
    })
    expect(state.gameState.avocado.overflowMultiplier)
      .toBe(overflowBefore + 1)
    expect(state.gameState.statistics.lifetime.botCapInfinityPoints)
      .toBe(botCapPointsBefore + 1_000n)
  })

  test('forces Buy Max for stored-time automation without changing the configured mode', () => {
    const configured = runtime()
    Object.assign(configured, {
      gameState: {
        ...configured.gameState,
        dyson: {
          ...configured.gameState.dyson,
          money: 1e12,
          science: 50_000,
          bots: 0,
          facilities: {
            ...configured.gameState.dyson.facilities,
            assembly_lines: [0, 0],
          },
          automation: {
            ...configured.gameState.dyson.automation,
            buyMode: 'buy-1',
            roundedBulkBuy: false,
            enabledFacilities: {
              assembly_lines: true,
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
          ...configured.gameState.infinity,
          automationUnlocked: {
            ...configured.gameState.infinity.automationUnlocked,
            bots: true,
            research: true,
          },
        },
        research: {
          ...configured.gameState.research,
          levelsById: {
            ...configured.gameState.research.levelsById,
            'research.money_multiplier': 0,
          },
          automation: {
            buyMode: 'buy-1',
            roundedBulkBuy: false,
            enabledById: {
              ...Object.fromEntries(
                Object.keys(
                  configured.gameState.research.automation.enabledById,
                ).map((id) => [id, false]),
              ),
              'research.money_multiplier': true,
            },
          },
        },
        timeline: {
          ...configured.gameState.timeline,
          eventClockInitialized: true,
          automationTimeUntilNextEvent: 1,
          dysonAutomationTargetIndex: 0,
          infinityBoundaryRemaining: 1_000_000,
          storedTimeAvailableSeconds: 10,
        },
      },
    })
    const active = structuredClone(configured)
    const stored = structuredClone(configured)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })

    const activeResult = definition.advance(active, 1_000)
    const storedResult = definition.applyCommand(stored, {
      kind: 'internal.advance-stored-time',
      seconds: 1,
    })

    expect(activeResult).toEqual({
      accepted: true,
      changed: true,
    })
    expect(storedResult).toEqual({
      accepted: true,
      changed: true,
    })
    expect(active.gameState.dyson.facilities.assembly_lines[1]).toBe(1)
    expect(
      stored.gameState.dyson.facilities.assembly_lines[1],
    ).toBeGreaterThan(1)
    expect(stored.gameState.dyson.automation.buyMode).toBe('buy-1')
    expect(
      active.gameState.research.levelsById['research.money_multiplier'],
    ).toBe(1)
    expect(
      stored.gameState.research.levelsById['research.money_multiplier'],
    ).toBeGreaterThan(1)
    expect(stored.gameState.research.automation.buyMode).toBe('buy-1')
  })

  test('discards the whole stored-time candidate when cancellation follows progress', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        timeline: {
          ...state.gameState.timeline,
          eventClockInitialized: true,
          automationTimeUntilNextEvent: 1,
          storedTimeAvailableSeconds: 10,
        },
      },
    })
    const before = structuredClone(state)
    const definition = createCanonicalGameEngineDefinition({
      eventContext: context(),
    })
    let polls = 0

    const result = definition.applyCommand(state, {
      kind: 'internal.advance-stored-time',
      seconds: 2,
      cancelRequested: () => ++polls > 1,
    })

    expect(result).toMatchObject({
      accepted: false,
      code: 'CANONICAL-STORED-TIME-CANCELLED',
    })
    expect(polls).toBeGreaterThan(1)
    expect(state).toEqual(before)
  })

  test('previews Quantum Leap non-mutatingly with exact gate and branch', () => {
    const state = runtime()
    Object.assign(state, {
      gameState: {
        ...state.gameState,
        infinity: {
          ...state.gameState.infinity,
          points: 41n,
        },
      },
    })
    const below = structuredClone(state)

    expect(previewCanonicalQuantumLeap(state, context())).toEqual({
      eligible: false,
      code: 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    })
    expect(state).toEqual(below)

    Object.assign(state, {
      gameState: {
        ...state.gameState,
        infinity: {
          ...state.gameState.infinity,
          points: 42n,
        },
        quantum: {
          ...state.gameState.quantum,
          unlocks: {
            ...state.gameState.quantum.unlocks,
            quantumEntanglement: true,
          },
        },
      },
    })
    const entangled = structuredClone(state)
    const preview = previewCanonicalQuantumLeap(state, context())
    expect(preview.branch).toBe('entanglement')
    expect(preview.artifactSkillPoints).toBeNull()
    expect(state).toEqual(entangled)
  })
})


test('mobile candidates retain a proven milestone before a later command removes its condition', () => {
  const state = runtime()
  state.achievementEvidence = {unlocked:[], statistics:{}, presence:''}
  state.gameState.dyson.bots = 4.2e19
  const definition = createCanonicalGameEngineDefinition({eventContext: context(), retainAchievementEvidence:true})
  const candidate = definition.forkState!(state)
  expect(candidate.achievementEvidence?.unlocked).toContain('achievement.bots_42qi')
  // A command can reduce progress after the transaction forks. Its evidence
  // must survive, while a rejected candidate cannot mutate the source.
  expect(state.achievementEvidence.unlocked).toEqual([])
  const reduced = {...candidate, gameState:{...candidate.gameState, dyson:{...candidate.gameState.dyson,bots:0}}}
  expect(definition.forkState!(reduced).achievementEvidence?.unlocked).toContain('achievement.bots_42qi')
})
