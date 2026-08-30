import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  CANONICAL_GAME_COMMAND_KINDS,
  routeCanonicalGameCommand,
  type CanonicalGameCommand,
  type CanonicalGameCommandKind,
  type CanonicalGameCommandOptions,
  type CanonicalGameRuntimeCarriers,
  type CanonicalRuntimeEvaluationPort,
} from './canonicalGameCommands'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function hydrated() {
  return hydrateGameState(prepareIdb1Save(fixture).prepared)
}

function state(): CanonicalGameStateV1 {
  return hydrated().state
}

function carriers(): Readonly<CanonicalGameRuntimeCarriers> {
  const session = hydrated()
  return Object.freeze({
    compatibilityTuning: session.compatibilityTuning,
    skillEffectEvaluationSnapshot:
      session.skillEffectEvaluationSnapshot,
    storedTimeCheater: false,
    selectedSkillPresetSlot: 1,
  })
}

function incrementedSnapshot(
  previous: Readonly<DysonSkillEffectEvaluationSnapshot> | null,
): Readonly<DysonSkillEffectEvaluationSnapshot> {
  const base = previous ?? {
    panelsPerSecond: 0,
    panelLifetimeSeconds: 0,
    scienceMultiplier: 0,
    rudimentarySingularityProduction: 0,
    pocketDimensionsProduction: 0,
    scientificPlanetsProduction: 0,
    managerAssemblyLineProduction: 0,
  }
  return Object.freeze({
    ...base,
    panelsPerSecond: base.panelsPerSecond + 1,
  })
}

function evaluationPort(): CanonicalRuntimeEvaluationPort {
  return {
    evaluate: (_candidate, previous) => ({
      accepted: true,
      snapshot: incrementedSnapshot(previous),
    }),
  }
}

function options(
  overrides: Partial<CanonicalGameCommandOptions> = {},
): CanonicalGameCommandOptions {
  const session = hydrated()
  return {
    runtimeCarriers: {
      compatibilityTuning: session.compatibilityTuning,
      skillEffectEvaluationSnapshot:
        session.skillEffectEvaluationSnapshot,
      storedTimeCheater: false,
      selectedSkillPresetSlot: 1,
    },
    runtimeEvaluation: evaluationPort(),
    quantumLeap: {
      requestLeap: () => ({
        accepted: false,
        code: 'not-ready',
      }),
    },
    infinityReset: {
      requestReset: () => ({
        accepted: false,
        code: 'not-ready',
      }),
    },
    ...overrides,
  }
}

const COMMAND_EXAMPLES = [
  {
    kind: 'dyson.purchase-facility',
    facilityId: 'assembly_lines',
  },
  {
    kind: 'dyson.purchase-facility',
    facilityId: 'matrioshka_brains',
  },
  { kind: 'dyson.run-automation' },
  { kind: 'dyson.set-buy-mode', buyMode: 'buy-10' },
  { kind: 'dyson.set-rounded-bulk-buy', enabled: true },
  {
    kind: 'dyson.set-facility-automation',
    facilityId: 'assembly_lines',
    enabled: true,
  },
  { kind: 'dyson.set-bot-distribution', distribution: 0.42 },
  { kind: 'research.purchase', researchId: 'research.science_boost' },
  { kind: 'research.run-automation' },
  { kind: 'research.set-buy-mode', buyMode: 'buy-10' },
  { kind: 'research.set-rounded-bulk-buy', enabled: true },
  {
    kind: 'research.set-automation',
    researchId: 'research.science_boost',
    enabled: true,
  },
  { kind: 'skill.purchase', skillId: 'startHereTree' },
  { kind: 'skill.refund', skillId: 'startHereTree' },
  {
    kind: 'skill.set-auto-assignment',
    skillIds: ['startHereTree'],
  },
  {
    kind: 'skill.set-preset-assignment',
    slot: 1,
    skillIds: ['startHereTree'],
  },
  {
    kind: 'skill.set-preset-bot-distribution',
    slot: 1,
    distribution: 0.42,
  },
  { kind: 'skill.rename-preset', slot: 1, name: 'First' },
  { kind: 'skill.set-preset-color', slot: 1, colorId: 'cyan' },
  { kind: 'skill.select-preset', slot: 1 },
  {
    kind: 'skill.add-to-current-preset',
    skillId: 'startHereTree',
  },
  {
    kind: 'skill.remove-from-current-preset',
    skillId: 'startHereTree',
  },
  {
    kind: 'skill.import-preset',
    slot: 1,
    serialized:
      '{"version":1,"presetName":"First","botDistribution":0.5,"skillIds":[]}',
  },
  {
    kind: 'skill.set-tab-preset-automation',
    tab: 'bots',
    slot: 1,
  },
  {
    kind: 'skill.apply-tab-preset-automation',
    tab: 'bots',
  },
  {
    kind: 'skill.set-auto-assign-non-refundable',
    enabled: false,
  },
  { kind: 'skill.reset' },
  { kind: 'skill.run-auto-assignment' },
  {
    kind: 'dream.purchase-foundational',
    purchase: 'hunters',
  },
  { kind: 'dream.purchase-space-age', purchase: 'solar' },
  {
    kind: 'dream.purchase-upgrade',
    upgradeId: 'counterMeteor',
  },
  {
    kind: 'dream.start-education',
    educationId: 'engineering',
  },
  { kind: 'dream.request-reset' },
  { kind: 'dream.request-black-hole-reset' },
  {
    kind: 'reality.purchase-upgrade',
    upgradeId: 'translation1',
  },
  { kind: 'reality.gather-influence' },
  {
    kind: 'quantum.purchase-upgrade',
    upgradeId: 'BotMultitasking',
  },
  { kind: 'quantum.request-leap' },
  { kind: 'infinity.request-reset' },
  { kind: 'infinity.set-automatic-reset', enabled: false },
  { kind: 'infinity.set-break-target', target: 42n },
  {
    kind: 'infinity.purchase-shop-item',
    itemId: 'secret',
  },
  { kind: 'avocado.feed', source: 'influence' },
  {
    kind: 'avocado.complete-meditation-step',
    requiredStepIndex: 0,
  },
  { kind: 'time.upgrade-stored-capacity' },
  {
    kind: 'time.request-stored-time-spend',
    requestedSeconds: 120,
  },
  { kind: 'time.set-stored-time-preset', preset: 'balanced' },
  { kind: 'settings.set-processing-interval', milliseconds: 33 },
  {
    kind: 'settings.set-navigation-item-visible',
    item: 'story',
    visible: true,
  },
  {
    kind: 'navigation.set-route-discovery',
    knownRoutes: ['research'],
    unvisitedRoutes: ['research'],
  },
] as const satisfies readonly CanonicalGameCommand[]

type MissingCommandKind = Exclude<
  CanonicalGameCommandKind,
  (typeof COMMAND_EXAMPLES)[number]['kind']
>
const ALL_COMMAND_KINDS_COVERED:
  [MissingCommandKind] extends [never] ? true : never = true

describe('canonical game command router', () => {
  test('persists known and unvisited navigation routes idempotently', () => {
    const original = state()
    const changed = routeCanonicalGameCommand(original, {
      kind: 'navigation.set-route-discovery',
      knownRoutes: ['research', 'skills'],
      unvisitedRoutes: ['research'],
    })

    expect(changed.accepted).toBe(true)
    expect(changed.changed).toBe(true)
    expect(changed.state.meta.navigationRouteDiscovery).toEqual({
      knownRoutes: ['research', 'skills'],
      unvisitedRoutes: ['research'],
    })

    const unchanged = routeCanonicalGameCommand(changed.state, {
      kind: 'navigation.set-route-discovery',
      knownRoutes: ['research', 'skills'],
      unvisitedRoutes: ['research'],
    })
    expect(unchanged.changed).toBe(false)
  })

  test('updates a persisted navigation shortcut preference idempotently', () => {
    const original = state()
    const current =
      original.meta.navigationVisibility?.story ?? false
    const changed = routeCanonicalGameCommand(original, {
      kind: 'settings.set-navigation-item-visible',
      item: 'story',
      visible: !current,
    })

    expect(changed.accepted).toBe(true)
    expect(changed.changed).toBe(true)
    expect(changed.state.meta.navigationVisibility?.story).toBe(!current)

    const unchanged = routeCanonicalGameCommand(changed.state, {
      kind: 'settings.set-navigation-item-visible',
      item: 'story',
      visible: !current,
    })
    expect(unchanged.accepted).toBe(true)
    expect(unchanged.changed).toBe(false)
  })

  test('updates every known destination without discarding future entries', () => {
    const original = state()
    const seeded = {
      ...original,
      meta: {
        ...original.meta,
        navigationVisibility: {
          ...original.meta.navigationVisibility!,
          'future-destination': true,
        },
      },
    }
    const changed = routeCanonicalGameCommand(seeded, {
      kind: 'settings.set-navigation-item-visible',
      item: 'store',
      visible: true,
    })
    expect(changed.state.meta.navigationVisibility?.store).toBe(true)
    expect(
      changed.state.meta.navigationVisibility?.['future-destination'],
    ).toBe(true)
  })

  test('keeps an exhaustive routable example for every union member', () => {
    expect(ALL_COMMAND_KINDS_COVERED).toBe(true)
    expect(
      new Set(COMMAND_EXAMPLES.map((command) => command.kind)),
    ).toEqual(new Set(CANONICAL_GAME_COMMAND_KINDS))

    for (const command of COMMAND_EXAMPLES) {
      const original = state()
      const result = routeCanonicalGameCommand(
        original,
        command,
        options(),
      )
      expect(result).toEqual(
        expect.objectContaining({
          accepted: expect.any(Boolean),
          changed: expect.any(Boolean),
          code: expect.any(String),
          state: expect.any(Object),
          issues: expect.any(Array),
          runtimeCarriers: expect.any(Object),
          intents: expect.any(Array),
        }),
      )
      if (!result.accepted) {
        expect(result.changed).toBe(false)
        expect(result.state).toBe(original)
      }
    }
  })

  test('publishes a changed state and refreshed evaluation snapshot atomically', () => {
    const original = deepFreeze(megaPurchaseState())
    const originalCarriers = carriers()
    const nextSnapshot = incrementedSnapshot(
      originalCarriers.skillEffectEvaluationSnapshot,
    )
    const evaluate = vi.fn(() => ({
      accepted: true as const,
      snapshot: nextSnapshot,
    }))

    const result = routeCanonicalGameCommand(
      original,
      {
        kind: 'dyson.purchase-facility',
        facilityId: 'matrioshka_brains',
      },
      {
        runtimeCarriers: originalCarriers,
        runtimeEvaluation: { evaluate },
      },
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'dyson-facility:success',
    })
    expect(result.state).not.toBe(original)
    expect(result.state.dyson.money).toBeLessThan(
      original.dyson.money,
    )
    expect(
      result.state.dyson.facilities.matrioshka_brains[1],
    ).toBeGreaterThan(0)
    expect(
      result.runtimeCarriers.skillEffectEvaluationSnapshot,
    ).toBe(nextSnapshot)
    expect(evaluate).toHaveBeenCalledWith(
      result.state,
      originalCarriers.skillEffectEvaluationSnapshot,
    )
    expect(original.dyson.facilities.matrioshka_brains).toEqual([
      0,
      0,
    ])
  })

  test('rolls back the whole transaction when runtime evaluation rejects', () => {
    const original = deepFreeze(megaPurchaseState())
    const originalCarriers = carriers()

    const result = routeCanonicalGameCommand(
      original,
      {
        kind: 'dyson.purchase-facility',
        facilityId: 'matrioshka_brains',
      },
      {
        runtimeCarriers: originalCarriers,
        runtimeEvaluation: {
          evaluate: () => ({
            accepted: false,
            code: 'derived-state-invalid',
          }),
        },
      },
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'runtime-evaluation-rejected',
    })
    expect(result.state).toBe(original)
    expect(result.runtimeCarriers).toBe(originalCarriers)
  })

  test('preserves exact state identity when a delegated domain gate rejects', () => {
    const original = deepFreeze(state())
    const result = routeCanonicalGameCommand(
      original,
      {
        kind: 'dyson.purchase-facility',
        facilityId: 'galactic_brains',
      },
      options(),
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'dyson-facility:locked',
    })
    expect(result.state).toBe(original)
  })

  test('routes representative Dream, Reality, Quantum, Avocado, and time actions', () => {
    const dream = routeCanonicalGameCommand(
      {
        ...state(),
        reality: {
          ...state().reality,
          influence: 1_000_000,
        },
      },
      {
        kind: 'dream.purchase-foundational',
        purchase: 'hunters',
      },
      options(),
    )
    expect(dream).toMatchObject({
      accepted: true,
      changed: true,
      code: 'dream-foundational:success',
    })

    const realityInput = {
      ...state(),
      reality: {
        ...state().reality,
        workersReady: 1_000_000n,
        influence: 0,
      },
    }
    const reality = routeCanonicalGameCommand(
      realityInput,
      { kind: 'reality.gather-influence' },
      options(),
    )
    expect(reality).toMatchObject({
      accepted: true,
      changed: true,
      code: 'reality-gather:success',
    })

    const quantumInput = {
      ...state(),
      quantum: {
        ...state().quantum,
        pointsEarned: 100n,
        pointsSpent: 0n,
        unlocks: {
          ...state().quantum.unlocks,
          botMultitasking: false,
        },
      },
    }
    const quantum = routeCanonicalGameCommand(
      quantumInput,
      {
        kind: 'quantum.purchase-upgrade',
        upgradeId: 'BotMultitasking',
      },
      options(),
    )
    expect(quantum).toMatchObject({
      accepted: true,
      changed: true,
      code: 'quantum-upgrade:purchased',
    })

    const quantumBulk = routeCanonicalGameCommand(
      quantum.state,
      {
        kind: 'quantum.purchase-upgrade',
        upgradeId: 'CashBonus',
        quantity: 10n,
      },
      options(),
    )
    expect(quantumBulk).toMatchObject({
      accepted: true,
      changed: true,
      code: 'quantum-upgrade:purchased',
      state: {
        quantum: {
          cashBonusLevels: 10n,
          pointsSpent: 11n,
        },
      },
    })

    const avocadoInput = {
      ...state(),
      reality: {
        ...state().reality,
        influence: 42,
      },
      avocado: {
        ...state().avocado,
        unlocked: true,
        influence: 0,
      },
    }
    const avocado = routeCanonicalGameCommand(
      avocadoInput,
      { kind: 'avocado.feed', source: 'influence' },
      options(),
    )
    expect(avocado).toMatchObject({
      accepted: true,
      changed: true,
      code: 'avocado:fed',
    })

  })

  test('synchronizes bot allocation immediately when selecting a preset', () => {
    const source = state()
    const presets = [...source.skills.presets] as [
      typeof source.skills.presets[0],
      typeof source.skills.presets[1],
      typeof source.skills.presets[2],
      typeof source.skills.presets[3],
      typeof source.skills.presets[4],
    ]
    presets[1] = {
      ...presets[1],
      skillIds: [],
      botDistribution: 0.8,
    }
    const input: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 10,
        workers: 5,
        researchers: 5,
        botDistribution: 0.5,
      },
      skills: {
        ...source.skills,
        presets,
        activeAutoAssignment: [],
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          botMultitasking: false,
        },
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.select-preset', slot: 2 },
      options({
        runtimeCarriers: {
          ...carriers(),
          selectedSkillPresetSlot: 1,
        },
      }),
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:preset-selected',
      state: {
        dyson: {
          botDistribution: 0.8,
          workers: 2,
          researchers: 8,
        },
      },
      runtimeCarriers: {
        selectedSkillPresetSlot: 2,
      },
    })
  })

  test('adds dependency closure to the active and selected preset queues', () => {
    const source = state()
    const presets = [...source.skills.presets]
    presets[0] = { ...presets[0]!, skillIds: [] }
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        activeAutoAssignment: [],
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.add-to-current-preset',
        skillId: 'androids',
      },
      options(),
    )

    const expected = [
      'startHereTree',
      'workerEfficiencyTree',
      'panelLifetime20Tree',
      'androids',
    ]
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:preset-skill-added',
      state: {
        skills: {
          activeAutoAssignment: expected,
        },
      },
    })
    expect(result.state.skills.presets[0].skillIds).toEqual(expected)
  })

  test('removes queued dependants from the active and selected preset queues', () => {
    const source = state()
    const queue = [
      'startHereTree',
      'workerEfficiencyTree',
      'panelLifetime20Tree',
      'androids',
      'banking',
    ]
    const presets = [...source.skills.presets]
    presets[0] = { ...presets[0]!, skillIds: queue }
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        activeAutoAssignment: queue,
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.remove-from-current-preset',
        skillId: 'workerEfficiencyTree',
      },
      options(),
    )

    const expected = [
      'startHereTree',
      'panelLifetime20Tree',
      'banking',
    ]
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:preset-skill-removed',
      state: {
        skills: {
          activeAutoAssignment: expected,
        },
      },
    })
    expect(result.state.skills.presets[0].skillIds).toEqual(expected)
  })

  test('synchronizes manual assignment only into the selected preset', () => {
    const source = state()
    const presets = source.skills.presets.map((preset, index) => ({
      ...preset,
      skillIds: index === 0 ? ['banking'] : [],
    })) as unknown as CanonicalGameStateV1['skills']['presets']
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        points: 1n,
        byId: {},
        activeAutoAssignment: [],
        presets,
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.purchase', skillId: 'startHereTree' },
      options({
        runtimeCarriers: {
          ...carriers(),
          selectedSkillPresetSlot: 2,
        },
      }),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.state.skills.activeAutoAssignment).toEqual([
      'startHereTree',
    ])
    expect(result.state.skills.presets[1].skillIds).toEqual([
      'startHereTree',
    ])
    expect(result.state.skills.presets[0]).toBe(presets[0])
    expect(result.state.skills.presets.slice(2)).toEqual(presets.slice(2))
  })

  test('unassigns from only the selected preset and preserves the other four', () => {
    const source = state()
    const queue = ['startHereTree']
    const presets = source.skills.presets.map((preset) => ({
      ...preset,
      skillIds: queue,
    })) as unknown as CanonicalGameStateV1['skills']['presets']
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        points: 0n,
        byId: {
          startHereTree: {
            owned: true,
            level: 1,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        },
        activeAutoAssignment: queue,
        presets,
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.refund', skillId: 'startHereTree' },
      options({
        runtimeCarriers: {
          ...carriers(),
          selectedSkillPresetSlot: 3,
        },
      }),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.state.skills.activeAutoAssignment).toEqual([])
    expect(result.state.skills.presets[2].skillIds).toEqual([])
    for (const index of [0, 1, 3, 4]) {
      expect(result.state.skills.presets[index]).toBe(presets[index])
      expect(result.state.skills.presets[index].skillIds).toEqual(queue)
    }
  })

  test('Reset Skills clears only the selected desired layout', () => {
    const source = state()
    const queue = ['startHereTree']
    const presets = source.skills.presets.map((preset) => ({
      ...preset,
      skillIds: queue,
    })) as unknown as CanonicalGameStateV1['skills']['presets']
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        byId: {
          startHereTree: {
            owned: true,
            level: 1,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        },
        activeAutoAssignment: queue,
        presets,
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.reset' },
      options({
        runtimeCarriers: {
          ...carriers(),
          selectedSkillPresetSlot: 4,
        },
      }),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.state.skills.activeAutoAssignment).toEqual([])
    expect(result.state.skills.presets[3].skillIds).toEqual([])
    for (const index of [0, 1, 2, 4]) {
      expect(result.state.skills.presets[index]).toBe(presets[index])
    }
  })

  test('previews retained conflicts and applies compatible preset parts only after confirmation', () => {
    const source = state()
    const presets = [...source.skills.presets]
    presets[1] = {
      ...presets[1]!,
      skillIds: ['shouldersOfTheEnlightened'],
    }
    const input: CanonicalGameStateV1 = {
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
        activeAutoAssignment: [],
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    }
    const commandOptions = options({
      runtimeCarriers: {
        ...carriers(),
        selectedSkillPresetSlot: 1,
      },
    })

    const blocked = routeCanonicalGameCommand(
      input,
      { kind: 'skill.select-preset', slot: 2 },
      commandOptions,
    )
    expect(blocked).toMatchObject({
      accepted: false,
      changed: false,
      code: 'skill:preset-retained-conflict',
    })
    expect(blocked.state).toBe(input)

    const confirmed = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.select-preset',
        slot: 2,
        retainedConflictPolicy: {
          kind: 'confirmed',
          retainedSkillIds: [
            'shouldersOfGiants',
            'shouldersOfPrecursors',
          ],
          blockedSkillIds: ['shouldersOfTheEnlightened'],
        },
      },
      commandOptions,
    )
    expect(confirmed).toMatchObject({
      accepted: true,
      changed: true,
      runtimeCarriers: { selectedSkillPresetSlot: 2 },
    })
    expect(confirmed.state.skills.byId.shouldersOfPrecursors?.owned).toBe(true)
    expect(
      confirmed.state.skills.byId.shouldersOfTheEnlightened?.owned,
    ).not.toBe(true)
    expect(confirmed.state.skills.activeAutoAssignment).toEqual([
      'shouldersOfTheEnlightened',
    ])
    expect(confirmed.state.skills.presets).toBe(input.skills.presets)

    const stale = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.select-preset',
        slot: 2,
        retainedConflictPolicy: {
          kind: 'confirmed',
          retainedSkillIds: ['shouldersOfGiants'],
          blockedSkillIds: ['shouldersOfTheEnlightened'],
        },
      },
      commandOptions,
    )
    expect(stale).toMatchObject({
      accepted: false,
      changed: false,
      code: 'skill:preset-preview-stale',
    })
    expect(stale.state).toBe(input)
  })

  test('reselects the stored current preset without copying a divergent live queue', () => {
    const source = state()
    const presets = [...source.skills.presets]
    presets[0] = { ...presets[0]!, skillIds: [] }
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        points: 0n,
        byId: {
          startHereTree: {
            owned: true,
            level: 1,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        },
        activeAutoAssignment: ['startHereTree'],
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.select-preset', slot: 1 },
      options(),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.state.skills.activeAutoAssignment).toEqual([])
    expect(result.state.skills.presets[0].skillIds).toEqual([])
    expect(result.state.skills.byId.startHereTree?.owned).toBe(false)
  })

  test('imports a validated Unity v1 preset atomically and rejects malformed input', () => {
    const source = state()
    const serialized = JSON.stringify({
      version: 1,
      presetName: 'Imported Science',
      botDistribution: 0.8,
      skillIds: [],
      colorId: 'rose',
    })
    const imported = routeCanonicalGameCommand(
      source,
      {
        kind: 'skill.import-preset',
        slot: 1,
        serialized,
      },
      options(),
    )

    expect(imported).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:preset-imported-and-loaded',
      state: {
        dyson: { botDistribution: 0.8 },
        skills: {
          activeAutoAssignment: [],
        },
      },
    })
    expect(imported.state.skills.presets[0]).toEqual({
      name: 'Imported Science',
      botDistribution: 0.8,
      skillIds: [],
      colorId: 'rose',
    })

    const rejected = routeCanonicalGameCommand(
      source,
      {
        kind: 'skill.import-preset',
        slot: 1,
        serialized: '{"version":99}',
      },
      options(),
    )
    expect(rejected).toMatchObject({
      accepted: false,
      changed: false,
      code: 'skill:preset-import-unsupported-version',
    })
    expect(rejected.state).toBe(source)
  })

  test('sets a validated preset color without changing its queue', () => {
    const source = state()
    const originalQueue = source.skills.presets[1].skillIds
    const result = routeCanonicalGameCommand(
      source,
      {
        kind: 'skill.set-preset-color',
        slot: 2,
        colorId: 'pink',
      },
      options(),
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:preset-color-set',
    })
    expect(result.state.skills.presets[1]).toMatchObject({
      colorId: 'pink',
      skillIds: originalQueue,
    })
    expect(result.state.skills.activeAutoAssignment).toEqual(
      source.skills.activeAutoAssignment,
    )
  })

  test('persists and immediately applies a nonzero tab preset override', () => {
    const source = state()
    const presets = [...source.skills.presets]
    presets[1] = {
      ...presets[1]!,
      skillIds: [],
      botDistribution: 0.8,
    }
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.set-tab-preset-automation',
        tab: 'research',
        slot: 2,
      },
      options(),
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:tab-preset-automation-set-and-applied',
      state: {
        dyson: { botDistribution: 0.8 },
        skills: {
          tabPresetAutomation: { research: 2 },
        },
      },
      runtimeCarriers: {
        selectedSkillPresetSlot: 2,
      },
    })
  })

  test('automatically applies compatible preset parts around retained skills', () => {
    const source = state()
    const presets = [...source.skills.presets]
    presets[1] = {
      ...presets[1]!,
      skillIds: ['shouldersOfTheEnlightened'],
    }
    const input: CanonicalGameStateV1 = {
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
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
        tabPresetAutomation: {
          ...source.skills.tabPresetAutomation,
          bots: 2,
        },
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.apply-tab-preset-automation', tab: 'bots' },
      options(),
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'skill:tab-preset-applied',
      runtimeCarriers: { selectedSkillPresetSlot: 2 },
    })
    expect(result.state.skills.byId.shouldersOfPrecursors?.owned).toBe(
      true,
    )
    expect(result.state.skills.byId.shouldersOfTheEnlightened?.owned)
      .not.toBe(true)
    expect(result.state.skills.activeAutoAssignment).toEqual([
      'shouldersOfTheEnlightened',
    ])
    expect(result.state.skills.presets).toBe(input.skills.presets)
  })

  test('delegates Leap gate and branch choice without command-supplied rewards', () => {
    const original = deepFreeze(state())
    const requestLeap = vi.fn(
      (source: Readonly<CanonicalGameStateV1>) => ({
        accepted: true as const,
        changed: true,
        code: 'entanglement',
        state: {
          ...source,
          quantum: {
            ...source.quantum,
            pointsEarned: source.quantum.pointsEarned + 1n,
          },
        },
      }),
    )

    const result = routeCanonicalGameCommand(
      original,
      { kind: 'quantum.request-leap' },
      options({ quantumLeap: { requestLeap } }),
    )

    expect(requestLeap).toHaveBeenCalledExactlyOnceWith(original)
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'quantum-leap:entanglement',
    })
    expect(original.quantum.pointsEarned + 1n).toBe(
      result.state.quantum.pointsEarned,
    )
  })

  test('toggles automatic Infinity before or after Break The Loop without runtime evaluation', () => {
    const source = state()
    const automaticHistory = [{
      breakInfinity: true,
      automatic: true,
      configuredTarget: 83n,
      reward: 83n,
      durationSeconds: 0.1,
      processingSource: 'active' as const,
      activeIntervalMilliseconds: 33,
    }]
    const original = {
      ...source,
      infinity: {
        ...source.infinity,
        automaticResetEnabled: true,
        currentCyclePeakIpPerMinute: 74_208.1448,
        currentCyclePeakReward: 82n,
      },
      statistics: {
        ...source.statistics,
        recentActiveAutomaticInfinityCycles: automaticHistory,
      },
    }
    const evaluate = vi.fn()
    const disabled = routeCanonicalGameCommand(
      original,
      { kind: 'infinity.set-automatic-reset', enabled: false },
      options({
        runtimeEvaluation: { evaluate },
      }),
    )

    expect(disabled).toMatchObject({
      accepted: true,
      changed: true,
      code: 'infinity-automatic-reset:set',
      state: {
        infinity: {
          automaticResetEnabled: false,
          currentCyclePeakIpPerMinute: 0,
          currentCyclePeakReward: 0n,
        },
      },
    })
    expect(disabled.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
    expect(evaluate).not.toHaveBeenCalled()

    const unchanged = routeCanonicalGameCommand(
      disabled.state,
      { kind: 'infinity.set-automatic-reset', enabled: false },
      options(),
    )
    expect(unchanged).toMatchObject({
      accepted: true,
      changed: false,
      code: 'infinity-automatic-reset:unchanged',
    })
    expect(unchanged.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])

    const broken = {
      ...disabled.state,
      timeline: {
        ...disabled.state.timeline,
        infinityCycleSeconds:
          disabled.state.timeline.infinityCycleSeconds + 2,
      },
      infinity: {
        ...disabled.state.infinity,
        currentCyclePeakIpPerMinute: 74_208.1448,
        currentCyclePeakReward: 82n,
        manualCalibrationObservedActiveSeconds: 2,
      },
      quantum: {
        ...disabled.state.quantum,
        unlocks: {
          ...disabled.state.quantum.unlocks,
          breakTheLoop: true,
        },
      },
    }
    const enabled = routeCanonicalGameCommand(
      broken,
      { kind: 'infinity.set-automatic-reset', enabled: true },
      options(),
    )
    expect(enabled).toMatchObject({
      accepted: true,
      changed: true,
      state: {
        infinity: {
          automaticResetEnabled: true,
          currentCyclePeakIpPerMinute: 74_208.1448,
          currentCyclePeakReward: 82n,
          manualPeakIpPerMinute: 74_208.1448,
          manualPeakReward: 82n,
          activeAutomaticThroughputCycleEligible: false,
        },
      },
    })
    expect(enabled.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])

    const immature = routeCanonicalGameCommand(
      {
        ...disabled.state,
        timeline: {
          ...disabled.state.timeline,
          infinityCycleSeconds:
            disabled.state.timeline.infinityCycleSeconds + 0.5,
        },
        infinity: {
          ...disabled.state.infinity,
          currentCyclePeakIpPerMinute: 20_000,
          currentCyclePeakReward: 12n,
          manualPeakIpPerMinute: 74_208.1448,
          manualPeakReward: 82n,
          manualCalibrationObservedActiveSeconds: 0.5,
        },
      },
      { kind: 'infinity.set-automatic-reset', enabled: true },
      options(),
    )
    expect(immature.state.infinity).toMatchObject({
      automaticResetEnabled: true,
      manualPeakIpPerMinute: 74_208.1448,
      manualPeakReward: 82n,
    })

    const disabledAgain = routeCanonicalGameCommand(
      {
        ...immature.state,
        statistics: {
          ...immature.state.statistics,
          recentActiveAutomaticInfinityCycles: automaticHistory,
        },
      },
      { kind: 'infinity.set-automatic-reset', enabled: false },
      options(),
    )
    expect(disabledAgain.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
    const enabledAgain = routeCanonicalGameCommand(
      {
        ...disabledAgain.state,
        timeline: {
          ...disabledAgain.state.timeline,
          infinityCycleSeconds:
            disabledAgain.state.timeline.infinityCycleSeconds + 0.25,
        },
        infinity: {
          ...disabledAgain.state.infinity,
          currentCyclePeakIpPerMinute: 30_000,
          currentCyclePeakReward: 20n,
          manualCalibrationObservedActiveSeconds: 0.25,
        },
      },
      { kind: 'infinity.set-automatic-reset', enabled: true },
      options(),
    )
    expect(enabledAgain.state.infinity).toMatchObject({
      automaticResetEnabled: true,
      manualPeakIpPerMinute: 74_208.1448,
      manualPeakReward: 82n,
    })
    expect(enabledAgain.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
  })

  test('invalidates automatic throughput measurement when target or cadence changes', () => {
    const source = state()
    const history = [{
      breakInfinity: true,
      automatic: true,
      configuredTarget: 83n,
      reward: 83n,
      durationSeconds: 0.1,
      processingSource: 'active' as const,
      activeIntervalMilliseconds: 33,
    }]
    const measuring = {
      ...source,
      infinity: {
        ...source.infinity,
        breakTarget: 83n,
        activeAutomaticThroughputCycleEligible: true,
      },
      quantum: {
        ...source.quantum,
        unlocks: { ...source.quantum.unlocks, breakTheLoop: true },
      },
      statistics: {
        ...source.statistics,
        recentActiveAutomaticInfinityCycles: history,
      },
    }
    const targetChanged = routeCanonicalGameCommand(
      measuring,
      { kind: 'infinity.set-break-target', target: 84n },
      options(),
    )
    expect(targetChanged.state.infinity.activeAutomaticThroughputCycleEligible)
      .toBe(false)
    expect(targetChanged.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])

    const cadenceChanged = routeCanonicalGameCommand(
      measuring,
      { kind: 'settings.set-processing-interval', milliseconds: 34 },
      options(),
    )
    expect(cadenceChanged.state.infinity.activeAutomaticThroughputCycleEligible)
      .toBe(false)
    expect(cadenceChanged.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
  })

  test('invalidates Infinity calibration and throughput when permanent Double Time is purchased', () => {
    const source = state()
    const history = [{
      breakInfinity: true,
      automatic: true,
      configuredTarget: 83n,
      reward: 83n,
      durationSeconds: 0.1,
      processingSource: 'active' as const,
      activeIntervalMilliseconds: 33,
    }]
    const calibrated = {
      ...source,
      dream: {
        ...source.dream,
        strangeMatter: 100,
      },
      infinity: {
        ...source.infinity,
        currentCyclePeakIpPerMinute: 74_208.1448,
        currentCyclePeakReward: 82n,
        manualPeakIpPerMinute: 74_208.1448,
        manualPeakReward: 82n,
        manualCalibrationObservedActiveSeconds: 3,
        activeAutomaticThroughputCycleEligible: true,
      },
      statistics: {
        ...source.statistics,
        recentActiveAutomaticInfinityCycles: history,
      },
      timeline: {
        ...source.timeline,
        doubleTime: {
          ...source.timeline.doubleTime,
          unlocked: false,
        },
      },
    }

    const result = routeCanonicalGameCommand(
      calibrated,
      {
        kind: 'reality.purchase-upgrade',
        upgradeId: 'doubleTimeOwned',
      },
      options(),
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'reality-upgrade:purchased',
      state: {
        infinity: {
          currentCyclePeakIpPerMinute: 0,
          currentCyclePeakReward: 0n,
          manualPeakIpPerMinute: 0,
          manualPeakReward: 0n,
          manualCalibrationObservedActiveSeconds: 0,
          activeAutomaticThroughputCycleEligible: false,
        },
        timeline: {
          doubleTime: { unlocked: true },
        },
      },
    })
    expect(result.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
    expect(calibrated.infinity.manualPeakReward).toBe(82n)
    expect(calibrated.statistics.recentActiveAutomaticInfinityCycles)
      .toBe(history)
  })

  test('routes manual Infinity through the event-model reset port', () => {
    const original = state()
    const next = {
      ...original,
      infinity: {
        ...original.infinity,
        points: original.infinity.points + 1n,
      },
    }
    const requestReset = vi.fn(() => ({
      accepted: true as const,
      changed: true,
      code: 'APPLIED',
      state: next,
    }))

    const result = routeCanonicalGameCommand(
      original,
      { kind: 'infinity.request-reset' },
      options({ infinityReset: { requestReset } }),
    )

    expect(requestReset).toHaveBeenCalledExactlyOnceWith(original)
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'infinity-reset:APPLIED',
      state: { infinity: { points: next.infinity.points } },
    })
  })

  test('returns stored-time repair metadata with state as one transaction', () => {
    const original = {
      ...state(),
      timeline: {
        ...state().timeline,
        storedTimeAvailableSeconds: 100,
        storedTimeCapacitySeconds: 100,
      },
    }
    const originalCarriers = {
      ...carriers(),
      storedTimeCheater: false,
    }

    const result = routeCanonicalGameCommand(
      original,
      { kind: 'time.upgrade-stored-capacity' },
      {
        runtimeCarriers: originalCarriers,
        runtimeEvaluation: evaluationPort(),
      },
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'time-stored-capacity:upgraded',
      state: {
        timeline: {
          storedTimeAvailableSeconds: 0,
          storedTimeCapacitySeconds: 200,
        },
      },
      runtimeCarriers: { storedTimeCheater: false },
    })
    expect(original.timeline.storedTimeAvailableSeconds).toBe(100)
    expect(original.timeline.storedTimeCapacitySeconds).toBe(100)
  })

})

function megaPurchaseState(): CanonicalGameStateV1 {
  const source = state()
  return {
    ...source,
    dyson: {
      ...source.dyson,
      money: 1e20,
      facilities: {
        ...source.dyson.facilities,
        planets: [0, 1],
        matrioshka_brains: [0, 0],
      },
    },
    quantum: {
      ...source.quantum,
      unlocks: {
        ...source.quantum.unlocks,
        matrioshkaBrains: true,
      },
    },
  }
}

function deepFreeze<T>(value: T): T {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Object.isFrozen(value)
  ) {
    Object.freeze(value)
    for (const child of Object.values(value)) {
      deepFreeze(child)
    }
  }
  return value
}
