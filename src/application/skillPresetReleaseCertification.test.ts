import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  prepareIdb1Save,
  prepareImportedSave,
  PreparedSave,
} from '../save/prepare'
import {
  deserializeWebSave,
  serializeSharedWebSave,
  serializeWebSave,
} from '../save/serialization'
import {
  applyCanonicalInfinityReset,
} from '../simulation/canonicalInfinityReset'
import {
  applyCanonicalQuantumReset,
} from '../simulation/quantumTransitions'
import {
  routeCanonicalGameCommand,
  type CanonicalGameCommandOptions,
  type CanonicalGameRuntimeCarriers,
} from './canonicalGameCommands'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const distinctLayouts = Object.freeze([
  Object.freeze(['banking']),
  Object.freeze(['avocados']),
  Object.freeze(['startHereTree']),
  Object.freeze(['manualLabour']),
  Object.freeze(['fragmentAssembly']),
] as const)

function preparedFixture(): PreparedSave {
  return prepareIdb1Save(fixtureText).prepared
}

function gameState(): CanonicalGameStateV1 {
  return hydrateGameState(preparedFixture()).state
}

function runtimeCarriers(): Readonly<CanonicalGameRuntimeCarriers> {
  const hydrated = hydrateGameState(preparedFixture())
  return Object.freeze({
    compatibilityTuning: hydrated.compatibilityTuning,
    skillEffectEvaluationSnapshot:
      hydrated.skillEffectEvaluationSnapshot,
    storedTimeCheater: false,
    selectedSkillPresetSlot: 1,
  })
}

function commandOptions(
  selectedSkillPresetSlot = 1,
): CanonicalGameCommandOptions {
  const carriers = runtimeCarriers()
  return {
    runtimeCarriers: {
      ...carriers,
      selectedSkillPresetSlot,
    },
    runtimeEvaluation: {
      evaluate: (_candidate, previous) => ({
        accepted: true,
        snapshot:
          previous ?? carriers.skillEffectEvaluationSnapshot!,
      }),
    },
    quantumLeap: {
      requestLeap: () => ({ accepted: false, code: 'not-ready' }),
    },
    infinityReset: {
      requestReset: () => ({ accepted: false, code: 'not-ready' }),
    },
  }
}

function withLayouts(
  source: Readonly<CanonicalGameStateV1>,
  layouts: readonly (readonly string[])[] = distinctLayouts,
): CanonicalGameStateV1['skills']['presets'] {
  return source.skills.presets.map((preset, index) => ({
    ...preset,
    name: `Certification ${index + 1}`,
    botDistribution: (index + 1) / 10,
    skillIds: [...layouts[index]!],
  })) as unknown as CanonicalGameStateV1['skills']['presets']
}

function ownedSkill() {
  return {
    owned: true,
    level: 1,
    timerSeconds: 0,
    secondaryTimerSeconds: 0,
  } as const
}

function expectPresetState(
  state: Readonly<{
    gameState: CanonicalGameStateV1
    selectedSkillPresetSlot: number
  }>,
): void {
  expect(
    state.gameState.skills.presets.map((preset) => preset.skillIds),
  ).toEqual(distinctLayouts)
  expect(state.gameState.skills.activeAutoAssignment).toEqual(
    distinctLayouts[3],
  )
  expect(state.selectedSkillPresetSlot).toBe(4)
}

describe('Skill preset release certification', () => {
  test('retains dynamically unrefundable ownership without rewriting any preset', () => {
    const source = gameState()
    const planned = routeCanonicalGameCommand(
      {
        ...source,
        skills: {
          ...source.skills,
          activeAutoAssignment: [],
          presets: withLayouts(source, [[], [], [], [], []]),
        },
      },
      {
        kind: 'skill.add-to-current-preset',
        skillId: 'shouldersOfGiants',
      },
      commandOptions(1),
    )
    expect(planned.accepted).toBe(true)
    const ownedClosure = planned.state.skills.presets[0].skillIds
    const presets = withLayouts(source, [
      ownedClosure,
      [],
      ['avocados'],
      ['manualLabour'],
      ['fragmentAssembly'],
    ])
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        points: 0n,
        byId: Object.fromEntries(
          ownedClosure.map((skillId) => [skillId, ownedSkill()]),
        ),
        activeAutoAssignment: [...ownedClosure],
        presets,
      },
    }

    const result = routeCanonicalGameCommand(
      input,
      { kind: 'skill.select-preset', slot: 2 },
      commandOptions(1),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.skillPresetApplication?.retainedSkillIds).toEqual(
      expect.arrayContaining(['startHereTree', 'shouldersOfGiants']),
    )
    expect(result.state.skills.byId.startHereTree?.owned).toBe(true)
    expect(result.state.skills.presets).toBe(presets)
    for (let index = 0; index < presets.length; index += 1) {
      expect(result.state.skills.presets[index]).toBe(presets[index])
    }
  })

  test('keeps locked and merely unaffordable target Skills queued', () => {
    const source = gameState()
    const target = [
      'avocados',
      'unsuspiciousAlgorithms',
      'agressiveAlgorithms',
    ]
    const presets = withLayouts(source, [
      ['banking'],
      target,
      ['startHereTree'],
      ['manualLabour'],
      ['fragmentAssembly'],
    ])
    const input: CanonicalGameStateV1 = {
      ...source,
      meta: {
        ...source.meta,
        firstInfinityComplete: false,
      },
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
      { kind: 'skill.select-preset', slot: 2 },
      commandOptions(1),
    )

    expect(result).toMatchObject({ accepted: true, changed: true })
    expect(result.state.skills.byId.avocados?.owned).not.toBe(true)
    expect(
      result.state.skills.byId.unsuspiciousAlgorithms?.owned,
    ).not.toBe(true)
    expect(result.skillPresetApplication).toMatchObject({
      assignedSkillIds: [],
      pendingSkillIds: target,
    })
    expect(result.state.skills.activeAutoAssignment).toEqual(target)
    expect(result.state.skills.presets).toBe(presets)
    expect(result.state.skills.presets[1].skillIds).toEqual(target)
  })

  test('applies dependency add/remove cascades to only the selected preset', () => {
    const source = gameState()
    const presets = withLayouts(source, [
      ['banking'],
      ['avocados'],
      [],
      ['manualLabour'],
      ['fragmentAssembly'],
    ])
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        activeAutoAssignment: [],
        presets,
      },
    }
    const untouchedSlots = [0, 1, 3, 4] as const

    const added = routeCanonicalGameCommand(
      input,
      {
        kind: 'skill.add-to-current-preset',
        skillId: 'androids',
      },
      commandOptions(3),
    )
    const dependencyClosure = [
      'startHereTree',
      'workerEfficiencyTree',
      'panelLifetime20Tree',
      'androids',
    ]

    expect(added).toMatchObject({ accepted: true, changed: true })
    expect(added.state.skills.activeAutoAssignment).toEqual(
      dependencyClosure,
    )
    expect(added.state.skills.presets[2].skillIds).toEqual(
      dependencyClosure,
    )
    for (const slot of untouchedSlots) {
      expect(added.state.skills.presets[slot]).toBe(presets[slot])
    }

    const removed = routeCanonicalGameCommand(
      added.state,
      {
        kind: 'skill.remove-from-current-preset',
        skillId: 'workerEfficiencyTree',
      },
      commandOptions(3),
    )

    expect(removed).toMatchObject({ accepted: true, changed: true })
    expect(removed.state.skills.activeAutoAssignment).toEqual([
      'startHereTree',
      'panelLifetime20Tree',
    ])
    expect(removed.state.skills.presets[2].skillIds).toEqual([
      'startHereTree',
      'panelLifetime20Tree',
    ])
    for (const slot of untouchedSlots) {
      expect(removed.state.skills.presets[slot]).toBe(presets[slot])
    }
  })

  test('reapplies the selected desired queue after Infinity and a higher reset clears retained conflicts', () => {
    const source = gameState()
    const blankPresets = withLayouts(source, [[], [], [], [], []])
    const planned = routeCanonicalGameCommand(
      {
        ...source,
        skills: {
          ...source.skills,
          activeAutoAssignment: [],
          presets: blankPresets,
        },
      },
      {
        kind: 'skill.add-to-current-preset',
        skillId: 'shouldersOfTheEnlightened',
      },
      commandOptions(4),
    )
    expect(planned.accepted).toBe(true)
    const desired = planned.state.skills.presets[3].skillIds
    expect(desired.at(-1)).toBe('shouldersOfTheEnlightened')

    const presets = withLayouts(source, [
      ['banking'],
      ['avocados'],
      ['manualLabour'],
      desired,
      ['fragmentAssembly'],
    ])
    const input: CanonicalGameStateV1 = {
      ...source,
      meta: {
        ...source.meta,
        firstInfinityComplete: true,
      },
      infinity: {
        ...source.infinity,
        permanentSkillPoints: 100n,
      },
      skills: {
        ...source.skills,
        byId: Object.fromEntries([
          ...desired
            .filter((skillId) => skillId !== 'shouldersOfTheEnlightened')
            .map((skillId) => [skillId, ownedSkill()] as const),
          ['shouldersOfPrecursors', ownedSkill()] as const,
        ]),
        points: 0n,
        activeAutoAssignment: [...desired],
        autoAssignNonRefundable: true,
        presets,
      },
    }

    const blockedBeforeReset = routeCanonicalGameCommand(
      input,
      { kind: 'skill.select-preset', slot: 4 },
      commandOptions(1),
    )
    expect(blockedBeforeReset).toMatchObject({
      accepted: false,
      code: 'skill:preset-retained-conflict',
    })

    const infinity = applyCanonicalInfinityReset(input, {
      breakInfinity: false,
      requestedReward: 1n,
      artifactSkillPoints: 0n,
    })
    expect(infinity.ok).toBe(true)
    if (!infinity.ok) return
    expect(
      infinity.state.skills.byId.shouldersOfTheEnlightened?.owned,
    ).toBe(true)
    expect(
      infinity.state.skills.byId.shouldersOfPrecursors?.owned,
    ).toBe(false)
    expect(infinity.state.skills.presets).toBe(presets)
    expect(infinity.state.skills.activeAutoAssignment).toBe(
      input.skills.activeAutoAssignment,
    )

    const higher = applyCanonicalQuantumReset(input, 100n)
    expect(higher.ok).toBe(true)
    if (!higher.ok) return
    expect(
      higher.state.skills.byId.shouldersOfTheEnlightened?.owned,
    ).toBe(true)
    expect(
      higher.state.skills.byId.shouldersOfPrecursors?.owned,
    ).not.toBe(true)
    expect(higher.state.skills.presets).toBe(presets)
    expect(higher.state.skills.activeAutoAssignment).toBe(
      input.skills.activeAutoAssignment,
    )
  })

  test('preserves five distinct layouts through checkpoint, reload, export, and import', () => {
    const session = new CanonicalRuntimeSession(preparedFixture(), {
      entitlements: {
        extraAnalysisPower: false,
        permanentDoubleIp: false,
      },
    })
    const checkpointState = {
      ...session.initialState,
      gameState: {
        ...session.initialState.gameState,
        skills: {
          ...session.initialState.gameState.skills,
          activeAutoAssignment: [...distinctLayouts[3]],
          presets: withLayouts(session.initialState.gameState),
        },
      },
      selectedSkillPresetSlot: 4 as const,
    }
    const checkpoint = session.prepare(checkpointState)

    const reloaded = new CanonicalRuntimeSession(
      PreparedSave.fromDecoded(
        deserializeWebSave(
          serializeWebSave(checkpoint.copyValidatedState()),
        ),
      ),
      {
        entitlements: {
          extraAnalysisPower: false,
          permanentDoubleIp: false,
        },
      },
    ).initialState
    expectPresetState(reloaded)

    const exported = serializeSharedWebSave(
      checkpoint.copyValidatedState(),
    )
    const imported = prepareImportedSave(
      PreparedSave.fromDecoded(deserializeWebSave(exported)),
      '2026-08-30T00:00:00.000Z',
    )
    const importedState = new CanonicalRuntimeSession(imported, {
      entitlements: {
        extraAnalysisPower: false,
        permanentDoubleIp: false,
      },
    }).initialState
    expectPresetState(importedState)
  })
})
