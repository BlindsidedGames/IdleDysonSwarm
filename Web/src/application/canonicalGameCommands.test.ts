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
    ...overrides,
  }
}

const COMMAND_EXAMPLES = [
  {
    kind: 'dyson.purchase-basic-facility',
    facilityId: 'assembly_lines',
  },
  {
    kind: 'dyson.purchase-mega-structure',
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
  { kind: 'time.set-double-time-rate', rate: 4 },
  { kind: 'time.upgrade-stored-capacity' },
  {
    kind: 'time.request-stored-time-spend',
    requestedSeconds: 120,
  },
] as const satisfies readonly CanonicalGameCommand[]

type MissingCommandKind = Exclude<
  CanonicalGameCommandKind,
  (typeof COMMAND_EXAMPLES)[number]['kind']
>
const ALL_COMMAND_KINDS_COVERED:
  [MissingCommandKind] extends [never] ? true : never = true

describe('canonical game command router', () => {
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
        kind: 'dyson.purchase-mega-structure',
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
      code: 'dyson-mega:success',
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
        kind: 'dyson.purchase-mega-structure',
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
        kind: 'dyson.purchase-mega-structure',
        facilityId: 'galactic_brains',
      },
      options(),
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'dyson-mega:locked',
    })
    expect(result.state).toBe(original)
  })

  test('routes representative Dream, Reality, Quantum, Avocado, and time actions', () => {
    const dream = routeCanonicalGameCommand(
      {
        ...state(),
        reality: {
          ...state().reality,
          influence: 1_000_000n,
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
        influence: 0n,
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

    const avocadoInput = {
      ...state(),
      reality: {
        ...state().reality,
        influence: 42n,
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

    const timeInput = {
      ...state(),
      timeline: {
        ...state().timeline,
        doubleTime: {
          ...state().timeline.doubleTime,
          unlocked: true,
          rate: 0,
        },
      },
    }
    const time = routeCanonicalGameCommand(
      timeInput,
      { kind: 'time.set-double-time-rate', rate: 7.9 },
      options(),
    )
    expect(time).toMatchObject({
      accepted: true,
      changed: true,
      code: 'time-double-rate:set',
      state: {
        timeline: { doubleTime: { rate: 7 } },
      },
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

  test('does not call runtime evaluation for an accepted no-op', () => {
    const original = {
      ...state(),
      timeline: {
        ...state().timeline,
        doubleTime: {
          ...state().timeline.doubleTime,
          unlocked: true,
          rate: 4,
        },
      },
    }
    const evaluate = vi.fn()
    const originalCarriers = carriers()
    const result = routeCanonicalGameCommand(
      original,
      { kind: 'time.set-double-time-rate', rate: 4 },
      {
        runtimeCarriers: originalCarriers,
        runtimeEvaluation: { evaluate },
      },
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: false,
      code: 'time-double-rate:unchanged',
    })
    expect(result.state).toBe(original)
    expect(result.runtimeCarriers).toBe(originalCarriers)
    expect(evaluate).not.toHaveBeenCalled()
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
