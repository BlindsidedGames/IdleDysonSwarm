import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { prepareIdb1Save } from '../save/prepare'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
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

describe('canonical game application engine', () => {
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
    expect(state.gameState.dyson.bots)
      .toBe(idleReference.gameState.dyson.bots)
    expect(state.gameState.dyson.facilities.assembly_lines)
      .toEqual(idleReference.gameState.dyson.facilities.assembly_lines)
    expect(state.gameState.timeline.storedTimeAvailableSeconds)
      .toBeCloseTo(9.99, 12)
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
