import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { deriveAvocadoMultiplier } from '../simulation/avocadoDomain'
import { deriveCanonicalDreamDerivedFacts } from '../simulation/canonicalDreamDerivedFacts'
import { deriveBasicDysonState } from '../simulation/canonicalDysonDerivation'
import { withCanonicalBotAllocation } from '../simulation/canonicalBotAllocation'
import { createCanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import {
  advanceRealityWorkers,
} from '../simulation/realityWorkers'
import {
  CANONICAL_PLAYER_COMMAND_KINDS,
  type CanonicalPlayerCommand,
} from './canonicalPlayerCommands'
import {
  createFrontendCommandEnvelope,
  FRONTEND_COMMAND_FAMILIES,
  inspectFrontendDefinitionCoverage,
  projectDysonSwarmVisualization,
  selectFrontendApplicationSnapshot,
  selectFrontendCommandAvailability,
  selectFrontendGameplaySnapshot,
  type FrontendCommandRequirementReadiness,
  type FrontendDefinitionCoverage,
  type FrontendSnapshotContext,
} from './frontendSnapshot'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)
const firstRunFixtureUrl = new URL(
  './firstRun/generated/first-run-schema-12.idb1.txt',
  import.meta.url,
)

describe('frontend gameplay snapshot', () => {
  test.each([
    [
      0,
      {
        phase: 'stellar-swarm',
        activePanels: 0,
        completion: 0,
      },
    ],
    [
      10_000,
      {
        phase: 'stellar-swarm',
        activePanels: 10_000,
        completion: 0.5,
      },
    ],
    [
      20_000,
      {
        phase: 'galaxy',
        starsSurrounded: 1,
        completion: 0.00000000001,
      },
    ],
    [
      1_000_000_000_000_000,
      {
        phase: 'galaxy',
        starsSurrounded: 50_000_000_000,
        completion: 0.5,
      },
    ],
    [
      2_000_000_000_000_000,
      {
        phase: 'galaxy-group',
        galaxiesEngulfed: 1,
        completion: 0,
      },
    ],
    [
      20_000 * 100_000_000_000 * 1e100,
      {
        phase: 'galaxy-group',
        galaxiesEngulfed: 1e100,
        completion: Math.pow(
          100 / Math.log10(5e291),
          0.72,
        ),
      },
    ],
    [
      1e307,
      {
        phase: 'galaxy-group',
        galaxiesEngulfed: 5e291,
        completion: 1,
      },
    ],
  ] as const)(
    'projects %s active panels into bounded swarm facts',
    (activePanels, expected) => {
      expect(
        projectDysonSwarmVisualization(activePanels),
      ).toEqual(expected)
    },
  )

  test('projects lifecycle and all application revisions with the gameplay read model', () => {
    const projected = selectFrontendApplicationSnapshot(
      {
        version: 1,
        phase: 'ready',
        source: 'primary',
        revision: {
          session: 3,
          state: 8,
          durable: 7,
        },
        checkpoint: {
          kind: 'dirty',
          durableRevision: 7,
          reason: 'state-changed',
        },
        operation: 'none',
        state: fixtureRuntimeState(),
      },
      frontendContext(),
    )

    expect(projected).toMatchObject({
      phase: 'ready',
      source: 'primary',
      revision: {
        session: 3,
        state: 8,
        durable: 7,
      },
      checkpoint: {
        kind: 'dirty',
        durableRevision: 7,
      },
      operation: 'none',
    })
    if (projected.phase !== 'ready') return
    expect(projected.gameplay.resources.dyson.money).toBeTypeOf(
      'number',
    )
    expect(projected.gameplay.runtime.selectedSkillPresetSlot).toBe(1)
    expect(Object.isFrozen(projected.revision)).toBe(true)
    expect(Object.isFrozen(projected.gameplay)).toBe(true)
  })

  test('projects exact canonical resources and progression without formatting', () => {
    const source = fixtureState()
    const state: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        points: 100n,
        spentPoints: 7n,
      },
      quantum: {
        ...source.quantum,
        pointsEarned: 55n,
        pointsSpent: 13n,
      },
      timeline: {
        ...source.timeline,
        storedTimeAvailableSeconds: 91.25,
        storedTimeCapacitySeconds: 120,
        doubleTime: {
          ...source.timeline.doubleTime,
          bankSeconds: 17.5,
        },
      },
    }

    const snapshot = selectFrontendGameplaySnapshot(
      state,
      frontendContext(),
    )

    expect(snapshot.resources.dyson.money).toBe(state.dyson.money)
    expect(snapshot.resources.infinity).toMatchObject({
      points: 100n,
      spentPoints: 7n,
      availablePoints: 93n,
    })
    expect(snapshot.resources.quantum).toMatchObject({
      pointsEarned: 55n,
      pointsSpent: 13n,
      availablePoints: 42n,
    })
    expect(snapshot.resources.time).toEqual({
      storedTimeAvailableSeconds: 91.25,
      storedTimeCapacitySeconds: 120,
      doubleTimeBankSeconds: 17.5,
    })
    expect(snapshot.progression.dyson.facilities).toEqual(
      state.dyson.facilities,
    )
    expect(snapshot.progression.dream.upgrades).toEqual(
      state.dream.upgrades,
    )
    expect(snapshot.progression.statistics).toEqual(state.statistics)
  })

  test('keeps fresh imported purchase previews separate from reveal visibility', () => {
    const source = firstRunFixtureState()
    const state: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        money: 100,
      },
    }

    const snapshot = selectFrontendGameplaySnapshot(
      state,
      frontendContext(),
    )

    expect(
      snapshot.previews.dyson.basicFacilities.find(
        (preview) => preview.facilityId === 'assembly_lines',
      ),
    ).toMatchObject({
      eligible: true,
      status: 'success',
    })
    expect(snapshot.visibility.dyson).toEqual({
      showTinker: true,
      visibleBasicFacilityIds: [],
      showNextTierTeaser: true,
    })
    expect(snapshot.visibility.skills.routeUnlocked).toBe(false)
  })

  test('publishes Skills route unlock from canonical progression', () => {
    const source = firstRunFixtureState()
    const tenBots: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 10,
      },
    }
    const advancedGoal: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        goalStage: 1n,
      },
    }
    const awardedPoint: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        points: 1n,
      },
    }

    expect(
      selectFrontendGameplaySnapshot(
        tenBots,
        frontendContext(),
      ).visibility.skills.routeUnlocked,
    ).toBe(true)
    expect(
      selectFrontendGameplaySnapshot(
        advancedGoal,
        frontendContext(),
      ).visibility.skills.routeUnlocked,
    ).toBe(true)
    expect(
      selectFrontendGameplaySnapshot(
        awardedPoint,
        frontendContext(),
      ).visibility.skills.routeUnlocked,
    ).toBe(true)
  })

  test('projects checkpointed manual Assembly ownership in canonical display order', () => {
    const runtime = fixtureRuntimeState()
    runtime.gameState = dysonProgressionState(
      runtime.gameState,
      {
        assembly_lines: [0, 5],
      },
      0,
    )
    const projected = selectFrontendApplicationSnapshot(
      {
        version: 1,
        phase: 'ready',
        source: 'primary',
        revision: {
          session: 2,
          state: 5,
          durable: 5,
        },
        checkpoint: {
          kind: 'clean',
          durableRevision: 5,
        },
        operation: 'none',
        state: runtime,
      },
      frontendContext(),
    )

    expect(projected.phase).toBe('ready')
    if (projected.phase !== 'ready') return
    expect(projected.gameplay.visibility.dyson).toEqual({
      showTinker: true,
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      showNextTierTeaser: true,
    })
  })

  test('matches Unity manual-versus-total facility reveal gates', () => {
    const source = firstRunFixtureState()
    const cases = [
      {
        name: 'ten total bots reveal Assembly',
        state: dysonProgressionState(source, {}, 10),
        expected: ['assembly_lines'],
      },
      {
        name: 'automatic Assembly does not reveal AI Managers',
        state: dysonProgressionState(source, {
          assembly_lines: [5, 0],
        }),
        expected: ['assembly_lines'],
      },
      {
        name: 'owned AI Managers reveal themselves but automatic ownership does not reveal Servers',
        state: dysonProgressionState(source, {
          ai_managers: [1, 0],
        }),
        expected: ['ai_managers'],
      },
      {
        name: 'one manual AI Manager reveals Servers',
        state: dysonProgressionState(source, {
          ai_managers: [0, 1],
        }),
        expected: ['ai_managers', 'servers'],
      },
      {
        name: 'one total Server reveals Data Centers',
        state: dysonProgressionState(source, {
          servers: [1, 0],
        }),
        expected: ['servers', 'data_centers'],
      },
      {
        name: 'one total Data Center reveals Planets',
        state: dysonProgressionState(source, {
          data_centers: [1, 0],
        }),
        expected: ['data_centers', 'planets'],
      },
      {
        name: 'owned Planets remain visible',
        state: dysonProgressionState(source, {
          planets: [1, 0],
        }),
        expected: ['planets'],
      },
    ] as const

    for (const scenario of cases) {
      const snapshot = selectFrontendGameplaySnapshot(
        scenario.state,
        frontendContext(),
      )
      expect(
        snapshot.visibility.dyson.visibleBasicFacilityIds,
        scenario.name,
      ).toEqual(scenario.expected)
    }
  })

  test('matches Tinker restoration and pre/post-Quantum teaser semantics', () => {
    const source = firstRunFixtureState()
    const matureBeforeDataCenter = dysonProgressionState(source, {
      assembly_lines: [9, 1],
      ai_managers: [0, 1],
    })
    expect(
      selectFrontendGameplaySnapshot(
        matureBeforeDataCenter,
        frontendContext(),
      ).visibility.dyson.showTinker,
    ).toBe(false)

    const earlyWithDataCenter = dysonProgressionState(source, {
      data_centers: [1, 0],
    })
    expect(
      selectFrontendGameplaySnapshot(
        earlyWithDataCenter,
        frontendContext(),
      ).visibility.dyson.showTinker,
    ).toBe(false)

    const progressed = dysonProgressionState(source, {
      assembly_lines: [9, 1],
      ai_managers: [0, 1],
      servers: [1, 0],
      data_centers: [1, 0],
    })
    const beforeQuantum = selectFrontendGameplaySnapshot(
      progressed,
      frontendContext(),
    )
    expect(beforeQuantum.visibility.dyson).toEqual({
      showTinker: false,
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
        'servers',
        'data_centers',
        'planets',
      ],
      showNextTierTeaser: false,
    })

    const postQuantum: CanonicalGameStateV1 = {
      ...progressed,
      quantum: {
        ...progressed.quantum,
        pointsEarned: 1n,
      },
    }
    expect(
      selectFrontendGameplaySnapshot(
        postQuantum,
        frontendContext(),
      ).visibility.dyson.showNextTierTeaser,
    ).toBe(true)

    const galacticEligible: CanonicalGameStateV1 = {
      ...postQuantum,
      dyson: {
        ...postQuantum.dyson,
        facilities: {
          ...postQuantum.dyson.facilities,
          birch_planets: [1, 0],
        },
      },
      quantum: {
        ...postQuantum.quantum,
        unlocks: {
          ...postQuantum.quantum.unlocks,
          galacticBrains: true,
        },
      },
    }
    expect(
      selectFrontendGameplaySnapshot(
        galacticEligible,
        frontendContext(),
      ).visibility.dyson.showNextTierTeaser,
    ).toBe(false)

    const galacticOwned: CanonicalGameStateV1 = {
      ...postQuantum,
      dyson: {
        ...postQuantum.dyson,
        facilities: {
          ...postQuantum.dyson.facilities,
          galactic_brains: [0, 1],
        },
      },
    }
    expect(
      selectFrontendGameplaySnapshot(
        galacticOwned,
        frontendContext(),
      ).visibility.dyson.showNextTierTeaser,
    ).toBe(false)

    const manualLabour: CanonicalGameStateV1 = {
      ...progressed,
      skills: {
        ...progressed.skills,
        byId: {
          ...progressed.skills.byId,
          manualLabour: {
            ...(progressed.skills.byId.manualLabour ?? {
              level: 0,
              timerSeconds: 0,
              secondaryTimerSeconds: 0,
            }),
            owned: true,
          },
        },
      },
    }
    expect(
      selectFrontendGameplaySnapshot(
        manualLabour,
        frontendContext(),
      ).visibility.dyson.showTinker,
    ).toBe(true)
  })

  test('returns a detached recursively frozen read model', () => {
    const source = fixtureState()
    const context = frontendContext()
    const snapshot = selectFrontendGameplaySnapshot(
      source,
      context,
    )
    const projectedAssembly =
      snapshot.progression.dyson.facilities.assembly_lines[0]

    const mutableAssembly = source.dyson.facilities
      .assembly_lines as [number, number]
    mutableAssembly[0] += 100
    ;(
      context.quantumLeap as {
        code: string
      }
    ).code = 'changed-after-projection'
    ;(
      context.tinker as {
        elapsedSeconds: number
      }
    ).elapsedSeconds = 99

    expect(
      snapshot.progression.dyson.facilities.assembly_lines[0],
    ).toBe(projectedAssembly)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.resources)).toBe(true)
    expect(Object.isFrozen(snapshot.visibility)).toBe(true)
    expect(Object.isFrozen(snapshot.visibility.dyson)).toBe(true)
    expect(
      Object.isFrozen(
        snapshot.visibility.dyson.visibleBasicFacilityIds,
      ),
    ).toBe(true)
    expect(Object.isFrozen(snapshot.runtime.tinker)).toBe(true)
    expect(snapshot.previews.quantum.leap.code).not.toBe(
      'changed-after-projection',
    )
    expect(Object.isFrozen(context.quantumLeap)).toBe(false)
    expect(snapshot.runtime.tinker.status).toBe('ready')
    if (snapshot.runtime.tinker.status === 'ready') {
      expect(
        snapshot.runtime.tinker.value.runtime.elapsedSeconds,
      ).not.toBe(99)
      expect(Object.isFrozen(snapshot.runtime.tinker.value.runtime)).toBe(
        true,
      )
    }
    expect(
      Object.isFrozen(
        snapshot.progression.dyson.facilities.assembly_lines,
      ),
    ).toBe(true)
    expect(() => {
      ;(
        snapshot.resources.dyson as {
          money: number
        }
      ).money = 0
    }).toThrow(TypeError)
  })

  test('indexes every command kind and family and fails closed on missing runtime requirements', () => {
    const snapshot = selectFrontendGameplaySnapshot(
      fixtureState(),
      frontendContext(),
    )

    expect(Object.keys(snapshot.commands.byKind)).toEqual(
      CANONICAL_PLAYER_COMMAND_KINDS,
    )
    expect(Object.keys(snapshot.commands.byFamily)).toEqual(
      FRONTEND_COMMAND_FAMILIES,
    )
    expect(
      Object.values(snapshot.commands.byFamily).reduce(
        (sum, family) => sum + family.commandKinds.length,
        0,
      ),
    ).toBe(CANONICAL_PLAYER_COMMAND_KINDS.length)

    expect(
      snapshot.commands.byKind['dyson.set-buy-mode'],
    ).toMatchObject({
      supported: true,
      routeAvailable: true,
      status: 'available',
      missingRequirements: [],
    })
    expect(
      snapshot.commands.byKind['dyson.purchase-basic-facility'],
    ).toMatchObject({
      supported: true,
      routeAvailable: false,
      status: 'missing-runtime-requirement',
      missingRequirements: ['runtime-evaluation-port'],
    })
    expect(snapshot.commands.byKind['tinker.start']).toMatchObject({
      supported: true,
      routeAvailable: true,
      status: 'available',
    })
  })

  test('publishes all composition-ready routes with exact per-target previews', () => {
    const snapshot = selectFrontendGameplaySnapshot(
      fixtureState(),
      frontendContext(allRuntimeRequirements()),
    )

    expect(snapshot.definitionCoverage.complete).toBe(true)
    expect(
      Object.values(snapshot.commands.byKind).every(
        (command) => command.routeAvailable,
      ),
    ).toBe(true)
    expect(snapshot.previews.dyson.basicFacilities).toHaveLength(5)
    expect(snapshot.previews.dyson.megaStructures).toHaveLength(3)
    expect(snapshot.previews.research.complete).toBe(true)
    expect(snapshot.previews.research.purchases.length).toBeGreaterThan(0)
    expect(snapshot.previews.skills.complete).toBe(true)
    expect(snapshot.previews.skills.skills.length).toBeGreaterThan(100)
    expect(
      snapshot.previews.skills.skills.find(
        (skill) => skill.skillId === 'startHereTree',
      ),
    ).toEqual(
      expect.objectContaining({
        visible: expect.any(Boolean),
        unlocked: expect.any(Boolean),
        queued: expect.any(Boolean),
        visualState: expect.stringMatching(
          /^(root|fragment|owned|non-refundable|non-refundable-owned|exclusive|normal)$/,
        ),
      }),
    )
    expect(snapshot.previews.infinity.shop).toHaveLength(9)
    expect(snapshot.previews.reality.upgrades).toHaveLength(18)
    expect(snapshot.previews.quantum.upgrades).toHaveLength(20)
    expect(
      'selectorGaps' in snapshot,
    ).toBe(false)
    expect(snapshot.persistence).toEqual({
      mappingCoverageComplete: false,
      canonicalWriteAllowed: false,
      unmatchedWritePolicy: 'preserve-source',
    })
  })

  test('projects Research cards in Unity scene order with canonical presentation facts', () => {
    const source = fixtureState()
    const levelsById = Object.fromEntries(
      Object.keys(source.research.levelsById).map((id) => [id, 0]),
    )
    const state: CanonicalGameStateV1 = {
      ...dysonProgressionState(source, {}, source.dyson.bots),
      dyson: {
        ...dysonProgressionState(source, {}, source.dyson.bots).dyson,
        science: 1e20,
      },
      infinity: {
        ...source.infinity,
        automationUnlocked: {
          ...source.infinity.automationUnlocked,
          research: true,
        },
      },
      research: {
        ...source.research,
        levelsById: {
          ...levelsById,
          'research.assembly_line_upgrade': 2,
          'research.panel_lifetime_1': 1,
        },
        progressById: {
          ...source.research.progressById,
          'research.assembly_line_upgrade': 0.375,
        },
        automation: {
          buyMode: 'buy-1',
          roundedBulkBuy: false,
          enabledById: {
            ...source.research.automation.enabledById,
            'research.assembly_line_upgrade': true,
            'research.ai_manager_upgrade': false,
          },
        },
      },
    }
    const context: FrontendSnapshotContext = {
      ...frontendContext(),
      compatibilityTuning: {
        ...neutralTuning,
        assemblyLineUpgradePercent: 0.075,
      },
    }

    const cards = selectFrontendGameplaySnapshot(
      state,
      context,
    ).previews.research.cards

    expect(cards.map((card) => card.researchId)).toEqual([
      'research.assembly_line_upgrade',
      'research.ai_manager_upgrade',
      'research.server_upgrade',
      'research.data_center_upgrade',
      'research.planet_upgrade',
      'research.matrioshka_brains_upgrade',
      'research.birch_planets_upgrade',
      'research.galactic_brains_upgrade',
      'research.panel_lifetime_1',
      'research.science_boost',
      'research.money_multiplier',
      'research.panel_lifetime_2',
      'research.panel_lifetime_3',
      'research.panel_lifetime_4',
    ])
    expect(cards[0]).toMatchObject({
      researchId: 'research.assembly_line_upgrade',
      visible: true,
      maxed: false,
      automationActive: true,
      effectKind: 'percentage',
      perLevelEffect: 7.5,
      currentEffect: 15,
      projectedEffect: 22.5,
      passiveProgress: 0.375,
      selectedQuantity: 1n,
    })
    expect(
      cards.find(
        (card) =>
          card.researchId === 'research.ai_manager_upgrade',
      ),
    ).toMatchObject({
      automationActive: false,
    })
    expect(
      cards.find(
        (card) =>
          card.researchId === 'research.panel_lifetime_1',
      ),
    ).toMatchObject({
      visible: false,
      maxed: true,
      effectKind: 'panel-lifetime-seconds',
      perLevelEffect: 1,
      currentEffect: 1,
      projectedEffect: 1,
    })
    expect(
      cards.find(
        (card) =>
          card.researchId === 'research.panel_lifetime_2',
      ),
    ).toMatchObject({
      prerequisitesMet: true,
      visible: true,
      automationActive: true,
      effectKind: 'panel-lifetime-seconds',
      perLevelEffect: 2,
      currentEffect: 0,
      projectedEffect: 2,
    })
  })

  test('hides unmet facility Research until canonical ownership satisfies its prerequisite', () => {
    const source = fixtureState()
    const levelsById = Object.fromEntries(
      Object.keys(source.research.levelsById).map((id) => [id, 0]),
    )
    const lockedState: CanonicalGameStateV1 = {
      ...dysonProgressionState(source, {}),
      research: {
        ...source.research,
        levelsById,
      },
    }
    const unlockedState = dysonProgressionState(
      lockedState,
      {
        matrioshka_brains: [0, 1],
      },
      lockedState.dyson.bots,
    )
    const card = (state: CanonicalGameStateV1) =>
      selectFrontendGameplaySnapshot(
        state,
        frontendContext(),
      ).previews.research.cards.find(
        (candidate) =>
          candidate.researchId ===
          'research.matrioshka_brains_upgrade',
      )

    expect(card(lockedState)).toMatchObject({
      prerequisitesMet: false,
      visible: false,
    })
    expect(card(unlockedState)).toMatchObject({
      prerequisitesMet: true,
      visible: true,
    })
  })

  test('marks definition-dependent routes unavailable when coverage has a typed gap', () => {
    const coverage: FrontendDefinitionCoverage = {
      complete: false,
      domains: {
        'dream-upgrades': {
          complete: false,
          gaps: ['missing_definition:engineering1'],
        },
        'reality-upgrades': {
          complete: true,
          gaps: [],
        },
        'quantum-upgrades': {
          complete: true,
          gaps: [],
        },
      },
    }

    const commands = selectFrontendCommandAvailability(
      allRuntimeRequirements(),
      coverage,
    )

    expect(commands.byKind['dream.purchase-upgrade']).toMatchObject({
      routeAvailable: false,
      status: 'definition-gap',
      definitionGaps: ['missing_definition:engineering1'],
    })
    expect(commands.byKind['dream.request-reset'].routeAvailable).toBe(
      false,
    )
    expect(
      commands.byKind['dream.purchase-foundational'].routeAvailable,
    ).toBe(true)
    expect(
      commands.byKind['reality.purchase-upgrade'].routeAvailable,
    ).toBe(true)
  })

  test('inspects the checked-in canonical definition catalogs', () => {
    expect(inspectFrontendDefinitionCoverage()).toEqual({
      complete: true,
      domains: {
        'dream-upgrades': { complete: true, gaps: [] },
        'quantum-upgrades': { complete: true, gaps: [] },
        'reality-upgrades': { complete: true, gaps: [] },
      },
    })
  })

  test('projects exact no-time Dyson and Reality derived facts', () => {
    const state = fixtureState()
    const context = frontendContext()
    const snapshot = selectFrontendGameplaySnapshot(state, context)
    const expectedDyson = deriveBasicDysonState(
      withCanonicalBotAllocation(state),
      context.compatibilityTuning,
      context.entitlements,
      context.evaluationSnapshot,
    )
    const expectedReality = advanceRealityWorkers(
      state,
      0,
      context.realityWorkerTuning,
    )
    const expectedDream = deriveCanonicalDreamDerivedFacts(state, {
      effectiveDoubleTimeMultiplier: 1,
      doubleTimeActive: state.timeline.doubleTime.enabled,
      doubleTimeRate: state.timeline.doubleTime.rate,
    })

    expect(expectedDyson.ok).toBe(true)
    expect(snapshot.derived.dyson.status).toBe('ready')
    if (
      !expectedDyson.ok ||
      snapshot.derived.dyson.status !== 'ready'
    ) {
      return
    }
    expect(snapshot.derived.dyson.value.globals).toEqual(
      expectedDyson.value.globals,
    )
    expect(
      snapshot.derived.dyson.value.productionArrivalRates,
    ).toEqual(expectedDyson.value.productionArrivalRates)
    expect(
      'nextEvaluationSnapshot' in snapshot.derived.dyson.value,
    ).toBe(false)
    expect(snapshot.derived.reality).toEqual({
      status: expectedReality.status,
      generationPerSecond: expectedReality.generationPerSecond,
      workerBatchSize: context.realityWorkerTuning.workerBatchSize,
      autoGatherEnabled: state.reality.autoGather,
    })
    expect(snapshot.derived.dream).toEqual({
      productionBasis: 'base-rate',
      effectiveDoubleTimeMultiplier: 1,
      result: expectedDream,
    })
    expect(snapshot.derived.dream.result.ok).toBe(true)
    expect(snapshot.derived.avocado).toEqual(
      deriveAvocadoMultiplier(state),
    )
    expect(snapshot.runtime.tinker.status).toBe('ready')
    if (snapshot.runtime.tinker.status === 'ready') {
      expect(snapshot.runtime.tinker.value.stats.assemblyYield).toBe(
        expectedDyson.value.auxiliary.tinkerAssemblyYield,
      )
      expect(snapshot.runtime.tinker.value.canStart).toBe(true)
      expect(
        snapshot.runtime.tinker.value.timeToCompletionSeconds,
      ).toBeNull()
    }
  })

  test.each([
    [0n, { kind: 'create-bots', target: 10 }],
    [1n, { kind: 'build-assembly-lines', target: 5 }],
    [2n, { kind: 'have-active-panels', target: 20_000 }],
    [3n, { kind: 'own-planets', target: 20 }],
    [4n, { kind: 'decay-panels', target: 1_000_000_000_000 }],
    [5n, { kind: 'surround-stars', target: 1_000_000_000 }],
    [6n, { kind: 'surround-stars', target: 10_000_000_000 }],
    [7n, { kind: 'engulf-galaxies', target: 1 }],
    [8n, { kind: 'engulf-galaxies', target: 10 }],
    [9n, { kind: 'engulf-galaxies', target: 100 }],
    [
      10n,
      { kind: 'reach-bots', target: 42_000_000_000_000_000_000 },
    ],
  ] as const)(
    'projects the canonical Unity goal for stage %s',
    (goalStage, expectedGoal) => {
      const source = fixtureState()
      const snapshot = selectFrontendGameplaySnapshot(
        {
          ...source,
          dyson: {
            ...source.dyson,
            goalStage,
          },
        },
        frontendContext(),
      )

      expect(snapshot.derived.dyson.status).toBe('ready')
      if (snapshot.derived.dyson.status !== 'ready') return
      expect(
        snapshot.derived.dyson.value.presentation.currentGoal,
      ).toEqual(expectedGoal)
    },
  )

  test('fails derived Dyson and dependent Tinker facts closed together', () => {
    const source = fixtureState()
    const state: CanonicalGameStateV1 = {
      ...source,
      quantum: {
        ...source.quantum,
        cashBonusLevels: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      },
    }

    const snapshot = selectFrontendGameplaySnapshot(
      state,
      frontendContext(),
    )

    expect(snapshot.derived.dyson).toMatchObject({
      status: 'unavailable',
      issues: [
        {
          code: 'DYSON_QUANTUM_LEVEL_UNSUPPORTED',
          path: 'quantum.cashBonusLevels',
        },
      ],
    })
    expect(snapshot.runtime.tinker).toEqual({
      status: 'unavailable',
      issues:
        snapshot.derived.dyson.status === 'unavailable'
          ? snapshot.derived.dyson.issues
          : [],
    })
  })
})

describe('frontend command envelopes', () => {
  test('captures a detached frozen command with application revisions', () => {
    const command: CanonicalPlayerCommand = {
      kind: 'infinity.set-break-target',
      target: 99n,
    }
    const envelope = createFrontendCommandEnvelope(
      { session: 4, state: 12, durable: 9 },
      command,
    )

    ;(
      command as {
        kind: 'infinity.set-break-target'
        target: bigint
      }
    ).target = 1n

    expect(envelope).toEqual({
      sessionRevision: 4,
      expectedStateRevision: 12,
      command: {
        kind: 'infinity.set-break-target',
        target: 99n,
      },
    })
    expect(Object.isFrozen(envelope)).toBe(true)
    expect(Object.isFrozen(envelope.command)).toBe(true)
  })

  test('accepts transient Tinker player commands', () => {
    expect(
      createFrontendCommandEnvelope(
        { session: 2, state: 5, durable: 5 },
        { kind: 'tinker.start', repeat: true },
      ),
    ).toEqual({
      sessionRevision: 2,
      expectedStateRevision: 5,
      command: {
        kind: 'tinker.start',
        repeat: true,
      },
    })
  })

  test.each([
    { session: -1, state: 0, durable: null },
    { session: 0.5, state: 0, durable: null },
    { session: 0, state: Number.MAX_SAFE_INTEGER + 1, durable: null },
  ])('rejects invalid optimistic revisions %#', (revision) => {
    expect(() =>
      createFrontendCommandEnvelope(revision, {
        kind: 'time.set-double-time-rate',
        rate: 2,
      }),
    ).toThrow(/revision must be a non-negative safe integer/)
  })
})

function fixtureState(): CanonicalGameStateV1 {
  const prepared = prepareIdb1Save(
    readFileSync(fixtureUrl, 'utf8'),
  ).prepared
  return hydrateGameState(prepared).state
}

function firstRunFixtureState(): CanonicalGameStateV1 {
  const prepared = prepareIdb1Save(
    readFileSync(firstRunFixtureUrl, 'utf8'),
  ).prepared
  return hydrateGameState(prepared).state
}

function dysonProgressionState(
  source: CanonicalGameStateV1,
  facilities: Partial<
    CanonicalGameStateV1['dyson']['facilities']
  >,
  bots = 0,
): CanonicalGameStateV1 {
  return {
    ...source,
    dyson: {
      ...source.dyson,
      bots,
      facilities: {
        assembly_lines: [0, 0],
        ai_managers: [0, 0],
        servers: [0, 0],
        data_centers: [0, 0],
        planets: [0, 0],
        matrioshka_brains: [0, 0],
        birch_planets: [0, 0],
        galactic_brains: [0, 0],
        ...facilities,
      },
    },
  }
}

function fixtureRuntimeState() {
  const prepared = prepareIdb1Save(
    readFileSync(fixtureUrl, 'utf8'),
  ).prepared
  const hydrated = hydrateGameState(prepared)
  return {
    gameState: hydrated.state,
    compatibilityTuning: hydrated.compatibilityTuning,
    evaluationSnapshot:
      hydrated.skillEffectEvaluationSnapshot,
    entitlements: {
      permanentDoubleIp: false,
    },
    tinker: createCanonicalTinkerRuntimeState(),
    storedTimeCheater: false,
    selectedSkillPresetSlot: 1 as const,
  }
}

function allRuntimeRequirements():
  FrontendCommandRequirementReadiness {
  return {
    'compatibility-tuning': true,
    'quantum-leap-port': true,
    'runtime-evaluation-port': true,
    'selected-skill-preset-carrier': true,
    'stored-time-cheater-carrier': true,
    'stored-time-commit-first-runner': true,
  }
}

const neutralTuning: Readonly<DysonCompatibilityTuning> =
  Object.freeze({
    panelsPerSecMulti: 1,
    scienceBoostPercent: 0,
    moneyMultiUpgradePercent: 0,
    assemblyLineUpgradePercent: 0,
    aiManagerUpgradePercent: 0,
    serverUpgradePercent: 0,
    dataCenterUpgradePercent: 0,
    planetUpgradePercent: 0,
    matrioshkaUpgradePercent: 0,
    birchUpgradePercent: 0,
    galacticUpgradePercent: 0,
  })

function frontendContext(
  runtimeRequirements: FrontendCommandRequirementReadiness = {},
): FrontendSnapshotContext {
  const runtime = fixtureRuntimeState()
  return {
    runtimeRequirements,
    compatibilityTuning: neutralTuning,
    evaluationSnapshot: runtime.evaluationSnapshot,
    entitlements: runtime.entitlements,
    tinker: { ...runtime.tinker },
    realityWorkerTuning: {
      workerBatchSize: 100n,
      baseWorkerGenerationSpeed: 1,
    },
    quantumLeap: {
      eligible: false,
      code: 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    },
    storedTimeCheater: false,
    selectedSkillPresetSlot: runtime.selectedSkillPresetSlot,
  }
}
