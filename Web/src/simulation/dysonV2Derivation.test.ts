import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import { getGameAsset } from '../game-data/catalog'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { hydrateGameState } from '../game-state/mapping'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { canonicalFragmentSkillKeySet } from '../game-state/numericFieldManifest'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  type GameDecimal,
} from '../math/gameDecimal'
import { prepareIdb1Save } from '../save/prepare'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import {
  advanceActiveDysonV2FromCauses,
  advanceOfflineDysonV2FromCauses,
  deriveDysonV2FromCauses,
  getDysonV2CompiledSkillPlanCacheDiagnosticsForTests,
  inheritPreparedDysonV2SkillPlanForFastV2,
  registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2,
} from './dysonV2Derivation'
import { DYSON_V2_FACILITY_IDS } from './dysonV2Production'

const prepared = prepareIdb1Save(firstRunIdb1).prepared
const migration = migratePreparedSaveToV2(prepared, {
  kind: 'trusted-same-device',
})
const baseState = migration.state
const runtime = migration.runtime
const legacyEvidence = migration.legacyRuntimeEvidence

function normalized(value: GameDecimal): string {
  if (value.mantissa === 0) return '0'
  return `${Number(value.mantissa.toPrecision(14))}e${value.exponent}`
}

function stateWith(
  mutate: (source: CanonicalGameStateV2) => CanonicalGameStateV2,
): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2(mutate(baseState))
}

function ownSkill(source: CanonicalGameStateV2, id: string): CanonicalGameStateV2 {
  return {
    ...source,
    skills: {
      ...source.skills,
      byId: {
        ...source.skills.byId,
        [id]: { ...source.skills.byId[id]!, owned: true },
      },
    },
  }
}

function fullyOwnedState(timerSeconds = 12): CanonicalGameStateV2 {
  return stateWith((source) => ({
    ...source,
    dyson: {
      ...source.dyson,
      bots: gameDecimalFromNumber(1_000_000),
      workers: gameDecimalFromNumber(500_000),
      researchers: gameDecimalFromNumber(500_000),
      totalPanelsDecayed: gameDecimalFromNumber(1_000),
      facilities: Object.fromEntries(
        DYSON_V2_FACILITY_IDS.map((id) => [
          id,
          [gameDecimalFromNumber(100), gameDecimalFromNumber(100)],
        ]),
      ) as CanonicalGameStateV2['dyson']['facilities'],
    },
    skills: {
      ...source.skills,
      points: 104n,
      fragments: 7n,
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          { ...skill, owned: true, timerSeconds },
        ]),
      ),
    },
  }))
}

describe('dormant Dyson V2 cause derivation', () => {
  test('matches the schema-12 V1 authority with test-only approximate parity', () => {
    const v1 = hydrateGameState(prepared).state
    const authority = deriveBasicDysonState(
      v1,
      legacyEvidence.compatibilityTuning,
      { permanentDoubleIp: false },
      legacyEvidence.skillEffectEvaluationSnapshot,
    )
    expect(authority.ok).toBe(true)
    if (!authority.ok) throw new Error(JSON.stringify(authority.issues))

    const actual = deriveDysonV2FromCauses(baseState, runtime)
    for (const [id, expected] of Object.entries(
      authority.value.productionArrivalRates,
    )) {
      expect(normalized(actual.production.rates[id as keyof typeof actual.production.rates])).toBe(
        normalized(gameDecimalFromNumber(expected)),
      )
    }
  })

  test('uses the same captured cause/kernel order for active and offline slices', () => {
    expect(advanceActiveDysonV2FromCauses(baseState, runtime, 10)).toEqual(
      advanceOfflineDysonV2FromCauses(baseState, runtime, 10),
    )
  })

  test('uses Production Scaling ownership for the exact 90/100 planet threshold', () => {
    const withPlanetCount = (
      count: number,
      productionScaling: boolean,
    ): CanonicalGameStateV2 => stateWith((source) => {
      let next = ownSkill(source, 'versatileProductionTactics')
      if (productionScaling) next = ownSkill(next, 'productionScaling')
      return {
        ...next,
        dyson: {
          ...next.dyson,
          facilities: {
            ...next.dyson.facilities,
            planets: [gameDecimalFromNumber(count), gameDecimalFromNumber(0)],
          },
        },
        skills: {
          ...next.skills,
          fragments: productionScaling ? 1n : 0n,
        },
      }
    })
    expect(gameDecimalToCanonicalString(
      deriveDysonV2FromCauses(withPlanetCount(89, true), runtime)
        .parameters.facilityModifiers.planets,
    )).toBe('1e0')
    expect(gameDecimalToCanonicalString(
      deriveDysonV2FromCauses(withPlanetCount(90, true), runtime)
        .parameters.facilityModifiers.planets,
    )).toBe('1.5e0')
    expect(gameDecimalToCanonicalString(
      deriveDysonV2FromCauses(withPlanetCount(99, false), runtime)
        .parameters.facilityModifiers.planets,
    )).toBe('1e0')
    expect(gameDecimalToCanonicalString(
      deriveDysonV2FromCauses(withPlanetCount(100, false), runtime)
        .parameters.facilityModifiers.planets,
    )).toBe('1.5e0')
  })

  test('reacts independently to research, Secrets, Skills, total IP, Quantum, and Avocado causes', () => {
    const causeBase = stateWith((source) => ({
      ...source,
      dyson: {
        ...source.dyson,
        bots: gameDecimalFromNumber(100),
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [gameDecimalFromNumber(1), gameDecimalFromNumber(1)],
        },
      },
    }))
    const fromCauseBase = (
      mutate: (source: CanonicalGameStateV2) => CanonicalGameStateV2,
    ) => cloneCanonicalGameStateV2(mutate(causeBase))
    const baseline = deriveDysonV2FromCauses(causeBase, runtime)
    const cases = [
      fromCauseBase((source) => ({
        ...source,
        research: {
          ...source.research,
          levelsById: {
            ...source.research.levelsById,
            'research.money_multiplier': gameDecimalFromNumber(2),
          },
        },
      })),
      fromCauseBase((source) => ({
        ...source,
        infinity: { ...source.infinity, secretsOfTheUniverse: 2n },
      })),
      fromCauseBase((source) => ownSkill(source, 'superchargedPower')),
      fromCauseBase((source) => ({
        ...source,
        infinity: {
          ...source.infinity,
          availablePoints: gameDecimalFromNumber(1),
          allocatedPoints: gameDecimalFromNumber(1),
        },
      })),
      fromCauseBase((source) => ({
        ...source,
        quantum: {
          ...source.quantum,
          cashBonusLevels: gameDecimalFromNumber(2),
        },
      })),
      fromCauseBase((source) => ({
        ...source,
        avocado: {
          ...source.avocado,
          unlocked: true,
          infinityPoints: gameDecimalFromNumber(100),
        },
      })),
    ]
    const results = cases.map((state) => deriveDysonV2FromCauses(state, runtime))

    expect(results[0]!.parameters.moneyMultiplier).not.toEqual(baseline.parameters.moneyMultiplier)
    expect(results[1]!.parameters.moneyMultiplier).not.toEqual(baseline.parameters.moneyMultiplier)
    expect(results[2]!.production.rates.money).not.toEqual(baseline.production.rates.money)
    expect(results[2]!.production.rates.bots).not.toEqual(baseline.production.rates.bots)
    expect(results[3]!.production.rates.bots).not.toEqual(baseline.production.rates.bots)
    expect(results[4]!.parameters.moneyMultiplier).not.toEqual(baseline.parameters.moneyMultiplier)
    expect(results[5]!.parameters.moneyMultiplier).not.toEqual(baseline.parameters.moneyMultiplier)
  })

  test('translates generated Burn Out into positive-magnitude subtract', () => {
    const state = stateWith((source) => ownSkill(source, 'burnOut'))
    const actual = deriveDysonV2FromCauses(state, runtime)
    const lifetimeEffects = actual.parameters.effects?.panelLifetimeSeconds ?? []

    expect(lifetimeEffects).toContainEqual({
      id: 'effect.burnOut.panel_lifetime',
      operation: 'subtract',
      value: gameDecimalFromNumber(5),
      order: 13,
    })
    expect(gameDecimalToCanonicalString(actual.production.panelLifetimeSeconds)).toBe('5e0')
  })

  test('keeps huge scalable causes and rates beyond native number range', () => {
    const facilities = Object.fromEntries(
      DYSON_V2_FACILITY_IDS.map((id) => [
        id,
        [gameDecimalFromCanonicalString('1e500'), baseState.dyson.facilities[id][1]],
      ]),
    ) as CanonicalGameStateV2['dyson']['facilities']
    const state = stateWith((source) => ({
      ...source,
      dyson: {
        ...source.dyson,
        bots: gameDecimalFromCanonicalString('1e500'),
        facilities,
      },
      infinity: {
        ...source.infinity,
        availablePoints: gameDecimalFromCanonicalString('1e500'),
      },
      quantum: {
        ...source.quantum,
        cashBonusLevels: gameDecimalFromCanonicalString('1e500'),
      },
    }))
    const actual = deriveDysonV2FromCauses(state, runtime)

    expect(actual.production.rates.money.exponent).toBeGreaterThan(308)
    expect(actual.production.rates.bots.exponent).toBeGreaterThan(308)
    expect(actual.nextEvaluationSnapshot.panelsPerSecond.exponent).toBeGreaterThan(308)
  })

  test('publishes and consumes a Decimal-native next evaluation snapshot', () => {
    const state = stateWith((source) => ownSkill({
      ...source,
      dyson: {
        ...source.dyson,
        bots: gameDecimalFromNumber(100),
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [gameDecimalFromNumber(0), gameDecimalFromNumber(1)],
        },
      },
      research: {
        ...source.research,
        levelsById: {
          ...source.research.levelsById,
          'research.panel_lifetime_1': 1n,
        },
      },
    }, 'stayingPower'))
    const initial = deriveDysonV2FromCauses(state, runtime)
    const runtimeEvidence = Object.freeze({
      dysonTuningProfile: runtime.dysonTuningProfile,
      dysonEvaluationSnapshot: initial.nextEvaluationSnapshot,
    })
    const next = deriveDysonV2FromCauses(state, runtimeEvidence)

    expect(gameDecimalToCanonicalString(initial.nextEvaluationSnapshot.panelLifetimeSeconds)).toBe('1.1e1')
    expect(
      Object.values(initial.nextEvaluationSnapshot).every(
        (value) => Object.isFrozen(value),
      ),
    ).toBe(true)
    expect(next.production.rates.bots).not.toEqual(initial.production.rates.bots)
  })

  test('requires a closed native runtime sidecar without invoking getters', () => {
    const initial = deriveDysonV2FromCauses(baseState, runtime)
    const runtimeWithSnapshot = (dysonEvaluationSnapshot: unknown) => Object.freeze({
      dysonTuningProfile: runtime.dysonTuningProfile,
      dysonEvaluationSnapshot,
    })
    const runtimeSnapshotEntries = Object.entries(initial.nextEvaluationSnapshot)
    for (const snapshot of [
      Object.freeze(Object.fromEntries(runtimeSnapshotEntries.slice(1))),
      Object.freeze({ ...initial.nextEvaluationSnapshot, extra: gameDecimalFromNumber(0) }),
      Object.freeze({}),
      { ...initial.nextEvaluationSnapshot },
    ]) {
      expect(() => deriveDysonV2FromCauses(baseState, runtimeWithSnapshot(snapshot) as never)).toThrow()
    }
    let getterCalls = 0
    const runtimeSnapshotWithGetter = {
      ...initial.nextEvaluationSnapshot,
    } as Record<string, unknown>
    delete runtimeSnapshotWithGetter.panelsPerSecond
    Object.defineProperty(runtimeSnapshotWithGetter, 'panelsPerSecond', {
      configurable: false,
      enumerable: true,
      get: () => {
        getterCalls += 1
        return initial.nextEvaluationSnapshot.panelsPerSecond
      },
    })
    Object.freeze(runtimeSnapshotWithGetter)
    expect(() => deriveDysonV2FromCauses(
      baseState,
      runtimeWithSnapshot(runtimeSnapshotWithGetter) as never,
    )).toThrow('declared data fields')

    const invalidDecimal = Object.freeze({
      ...initial.nextEvaluationSnapshot.panelsPerSecond,
    })
    const invalidRuntimeSnapshot = Object.freeze({
      ...initial.nextEvaluationSnapshot,
      panelsPerSecond: invalidDecimal,
    })
    expect(() => deriveDysonV2FromCauses(baseState, Object.freeze({
      dysonTuningProfile: runtime.dysonTuningProfile,
      dysonEvaluationSnapshot: invalidRuntimeSnapshot,
    }) as never)).toThrow('frozen GameDecimal')
    const profileWithGetter = Object.freeze(Object.defineProperty({
      dysonEvaluationSnapshot: runtime.dysonEvaluationSnapshot,
    }, 'dysonTuningProfile', {
      configurable: false,
      enumerable: true,
      get: () => {
        getterCalls += 1
        return runtime.dysonTuningProfile
      },
    }))
    expect(() => deriveDysonV2FromCauses(baseState, profileWithGetter as never)).toThrow(
      'declared data fields',
    )
    expect(() => deriveDysonV2FromCauses(baseState, Object.freeze({
      ...runtime,
      dysonTuningProfile: 'open-vector',
    }) as never)).toThrow('unsupported')
    expect(getterCalls).toBe(0)
  })

  test('fails closed on required generated catalog gaps', () => {
    expect(() =>
      deriveDysonV2FromCauses(baseState, runtime, (kind, id) =>
        kind === 'GameData.ResearchDefinition' && id === 'research.money_multiplier'
          ? undefined
          : getGameAsset(kind, id),
      ),
    ).toThrow('reference list')
    expect(() =>
      deriveDysonV2FromCauses(baseState, runtime, (kind, id) =>
        kind === 'GameData.SkillDatabase' && id === 'SkillDatabase'
          ? undefined
          : getGameAsset(kind, id),
      ),
    ).toThrow('SkillDatabase')
  })

  test('fails closed on extra Skill keys and unsupported effect operations', () => {
    const database = getGameAsset('GameData.SkillDatabase', 'SkillDatabase')!
    expect(() =>
      deriveDysonV2FromCauses(baseState, runtime, (kind, id) =>
        kind === 'GameData.SkillDatabase' && id === 'SkillDatabase'
          ? {
              ...database,
              data: {
                ...database.data,
                skills: [
                  ...(database.data.skills as readonly unknown[]),
                  { id: 'future-skill' },
                ] as never,
              },
            }
          : getGameAsset(kind, id),
      ),
    ).toThrow('drifted')

    const burnOut = stateWith((source) => ownSkill(source, 'burnOut'))
    const effect = getGameAsset(
      'GameData.EffectDefinition',
      'effect.burnOut.panel_lifetime',
    )!
    expect(() =>
      deriveDysonV2FromCauses(burnOut, runtime, (kind, id) =>
        kind === 'GameData.EffectDefinition' &&
        id === 'effect.burnOut.panel_lifetime'
          ? { ...effect, data: { ...effect.data, operation: 99 } }
          : getGameAsset(kind, id),
      ),
    ).toThrow('unsupported operation')
  })

  test('rejects duplicate SkillDatabase references before effects can double-apply', () => {
    const database = getGameAsset('GameData.SkillDatabase', 'SkillDatabase')!
    const skills = database.data.skills as readonly unknown[]
    expect(() =>
      deriveDysonV2FromCauses(baseState, runtime, (kind, id) =>
        kind === 'GameData.SkillDatabase' && id === 'SkillDatabase'
          ? {
              ...database,
              data: {
                ...database.data,
                skills: [...skills, skills[0]] as never,
              },
            }
          : getGameAsset(kind, id),
      ),
    ).toThrow('drifted')
  })

  test('uses raw dynamic thresholds for Dyson Subsidies and Galactic Paradigm Shift', () => {
    const seed = deriveDysonV2FromCauses(baseState, runtime)
    const withSnapshot = (
      panelsPerSecond: number,
    ) => Object.freeze({
      dysonTuningProfile: runtime.dysonTuningProfile,
      dysonEvaluationSnapshot: Object.freeze({
        ...seed.nextEvaluationSnapshot,
        panelsPerSecond: gameDecimalFromNumber(panelsPerSecond),
        panelLifetimeSeconds: gameDecimalFromNumber(1),
      }),
    })
    const subsidies = deriveDysonV2FromCauses(
      stateWith((source) => ownSkill(source, 'dysonSubsidies')),
      withSnapshot(30_000),
    )
    const paradigm = deriveDysonV2FromCauses(
      stateWith((source) => ownSkill(source, 'galacticPradigmShift')),
      withSnapshot(3_000_000_000_000_000),
    )

    expect(gameDecimalToCanonicalString(
      subsidies.parameters.facilityModifiers.assembly_lines,
    )).toBe('2e0')
    expect(gameDecimalToCanonicalString(
      paradigm.parameters.facilityModifiers.planets,
    )).toBe('3e0')
  })

  test('omits only near-identity Skill effects using the V1 1e-12 rule', () => {
    const supercharged = stateWith((source) => ownSkill(source, 'superchargedPower'))
    const multiplierEffect = getGameAsset(
      'GameData.EffectDefinition',
      'effect.supercharged_power.assembly_lines',
    )!
    const multiplierResult = deriveDysonV2FromCauses(
      supercharged,
      runtime,
      (kind, id) => kind === 'GameData.EffectDefinition' &&
        id === 'effect.supercharged_power.assembly_lines'
        ? { ...multiplierEffect, data: { ...multiplierEffect.data, value: 1 + 5e-13 } }
        : getGameAsset(kind, id),
    )
    expect(
      multiplierResult.parameters.effects?.assembly_lines?.some(
        (effect) => effect.id === 'effect.supercharged_power.assembly_lines',
      ),
    ).toBe(false)

    const burnOut = stateWith((source) => ownSkill(source, 'burnOut'))
    const subtractEffect = getGameAsset(
      'GameData.EffectDefinition',
      'effect.burnOut.panel_lifetime',
    )!
    const subtractResult = deriveDysonV2FromCauses(
      burnOut,
      runtime,
      (kind, id) => kind === 'GameData.EffectDefinition' &&
        id === 'effect.burnOut.panel_lifetime'
        ? { ...subtractEffect, data: { ...subtractEffect.data, value: -5e-13 } }
        : getGameAsset(kind, id),
    )
    expect(subtractResult.parameters.effects?.panelLifetimeSeconds).toEqual([])
    expect(gameDecimalToCanonicalString(
      subtractResult.production.panelLifetimeSeconds,
    )).toBe('1e1')

    const unauthorized = stateWith((source) => ownSkill(source, 'panelLifetime20Tree'))
    const unauthorizedEffect = getGameAsset(
      'GameData.EffectDefinition',
      'effect.panelLifetime20Tree.panel_lifetime',
    )!
    expect(() => deriveDysonV2FromCauses(
      unauthorized,
      runtime,
      (kind, id) => kind === 'GameData.EffectDefinition' &&
        id === 'effect.panelLifetime20Tree.panel_lifetime'
        ? { ...unauthorizedEffect, data: { ...unauthorizedEffect.data, value: -5e-13 } }
        : getGameAsset(kind, id),
    )).toThrow('outside the closed translation contract')
  })

  test('bounds Panel Warranty fragments before bigint-to-number conversion', () => {
    const panelWarranty = baseState.skills.byId.panelWarranty!
    const hostile = Object.freeze({
      ...baseState,
      skills: Object.freeze({
        ...baseState.skills,
        fragments: BigInt(canonicalFragmentSkillKeySet.length + 1),
        byId: Object.freeze({
          ...baseState.skills.byId,
          panelWarranty: Object.freeze({ ...panelWarranty, owned: true }),
        }),
      }),
    }) as CanonicalGameStateV2

    expect(() => deriveDysonV2FromCauses(hostile, runtime)).toThrow(
      `between zero and ${canonicalFragmentSkillKeySet.length}`,
    )
  })

  test('classifies every generated Dyson effect for the closed Skill catalog', () => {
    const populated = stateWith((source) => ({
      ...source,
      dyson: {
        ...source.dyson,
        bots: gameDecimalFromNumber(1_000_000_000),
        workers: gameDecimalFromNumber(500_000_000),
        researchers: gameDecimalFromNumber(500_000_000),
        totalPanelsDecayed: gameDecimalFromNumber(1_000_000),
        facilities: Object.fromEntries(
          DYSON_V2_FACILITY_IDS.map((id) => [
            id,
            [gameDecimalFromNumber(100), gameDecimalFromNumber(100)],
          ]),
        ) as CanonicalGameStateV2['dyson']['facilities'],
      },
    }))
    const allOwned = Object.freeze({
      ...populated,
      skills: Object.freeze({
        ...populated.skills,
        points: 104n,
        fragments: 7n,
        byId: Object.freeze(Object.fromEntries(
          Object.entries(populated.skills.byId).map(([id, skill]) => [
            id,
            Object.freeze({ ...skill, owned: true, timerSeconds: 100 }),
          ]),
        )),
      }),
    }) as CanonicalGameStateV2

    expect(() => deriveDysonV2FromCauses(allOwned, runtime)).not.toThrow()
  })

  test('caches only compiled default Skill structure while reevaluating dynamic causes', () => {
    const populated = fullyOwnedState()
    const coldState = stateWith(() => ({
      ...populated,
      skills: {
        ...populated.skills,
        byId: {
          ...populated.skills.byId,
          superRadiantScattering: {
            ...populated.skills.byId.superRadiantScattering!,
            level: 37n,
          },
        },
      },
    }))
    const before = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()
    const cold = deriveDysonV2FromCauses(coldState, runtime)
    const afterCold = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()
    const hot = deriveDysonV2FromCauses(coldState, runtime)
    const afterHot = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()

    expect(hot).toEqual(cold)
    expect(afterCold.compilations).toBe(before.compilations + 1)
    expect(afterHot.hits).toBe(afterCold.hits + 1)

    const laterTimers = stateWith(() => ({
      ...coldState,
      skills: {
        ...coldState.skills,
        byId: Object.fromEntries(Object.entries(coldState.skills.byId).map(
          ([id, skill]) => [id, {
            ...skill,
            timerSeconds: id === 'androids' || id === 'pocketAndroids' ||
                id === 'superRadiantScattering'
              ? 42
              : skill.timerSeconds,
          }],
        )),
      },
    }))
    const timerResult = deriveDysonV2FromCauses(laterTimers, runtime)
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests().hits)
      .toBe(afterHot.hits + 1)
    expect(timerResult.parameters.facilityModifiers.assembly_lines)
      .not.toEqual(hot.parameters.facilityModifiers.assembly_lines)

    const changedConditionState = stateWith(() => ({
      ...laterTimers,
      dyson: {
        ...laterTimers.dyson,
        facilities: {
          ...laterTimers.dyson.facilities,
          assembly_lines: [gameDecimalFromNumber(0), gameDecimalFromNumber(0)],
        },
      },
    }))
    const conditionResult = deriveDysonV2FromCauses(changedConditionState, runtime)
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests().hits)
      .toBe(afterHot.hits + 2)
    expect(conditionResult.parameters.effects?.assembly_lines)
      .not.toEqual(timerResult.parameters.effects?.assembly_lines)

    const changedSnapshotRuntime = Object.freeze({
      ...runtime,
      dysonEvaluationSnapshot: Object.freeze({
        ...runtime.dysonEvaluationSnapshot,
        panelLifetimeSeconds: gameDecimalFromNumber(1_000),
      }),
    })
    const snapshotResult = deriveDysonV2FromCauses(
      changedConditionState,
      changedSnapshotRuntime,
    )
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests().hits)
      .toBe(afterHot.hits + 3)
    expect(snapshotResult.parameters.facilityModifiers.assembly_lines)
      .not.toEqual(conditionResult.parameters.facilityModifiers.assembly_lines)

    const changedTuningState = stateWith(() => ({
      ...changedConditionState,
      infinity: {
        ...changedConditionState.infinity,
        secretsOfTheUniverse: 9n,
      },
    }))
    const tuningResult = deriveDysonV2FromCauses(changedTuningState, runtime)
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests().hits)
      .toBe(afterHot.hits + 4)
    expect(tuningResult.parameters.facilityModifiers.assembly_lines)
      .not.toEqual(snapshotResult.parameters.facilityModifiers.assembly_lines)

    const ownershipMiss = stateWith(() => ({
      ...coldState,
      skills: {
        ...coldState.skills,
        byId: {
          ...coldState.skills.byId,
          androids: { ...coldState.skills.byId.androids!, owned: false },
        },
      },
    }))
    deriveDysonV2FromCauses(ownershipMiss, runtime)
    const afterOwnershipMiss = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()
    expect(afterOwnershipMiss.compilations).toBe(afterCold.compilations + 1)

    const levelMiss = stateWith(() => ({
      ...coldState,
      skills: {
        ...coldState.skills,
        byId: {
          ...coldState.skills.byId,
          androids: { ...coldState.skills.byId.androids!, level: 2n },
        },
      },
    }))
    deriveDysonV2FromCauses(levelMiss, runtime)
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests().compilations)
      .toBe(afterOwnershipMiss.compilations + 1)

    let customLookupCalls = 0
    const customLookup = (kind: string, id: string) => {
      customLookupCalls += 1
      return getGameAsset(kind, id)
    }
    const diagnosticsBeforeCustom = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()
    deriveDysonV2FromCauses(coldState, runtime, customLookup)
    const firstCustomCalls = customLookupCalls
    deriveDysonV2FromCauses(coldState, runtime, customLookup)
    expect(customLookupCalls).toBe(firstCustomCalls * 2)
    expect(getDysonV2CompiledSkillPlanCacheDiagnosticsForTests())
      .toEqual(diagnosticsBeforeCustom)
  })

  test('inherits a compiled plan only across frozen timer-only prepared states', () => {
    const source = fullyOwnedState(10)
    deriveDysonV2FromCauses(source, runtime)
    const nextById = Object.freeze({
      ...source.skills.byId,
      androids: Object.freeze({
        ...source.skills.byId.androids!,
        timerSeconds: 11,
      }),
    })
    const before = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()
    const authority = registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2()
    inheritPreparedDysonV2SkillPlanForFastV2(authority, source.skills.byId, nextById)
    const inherited = Object.freeze({
      ...source,
      skills: Object.freeze({ ...source.skills, byId: nextById }),
    }) as CanonicalGameStateV2
    deriveDysonV2FromCauses(inherited, runtime)
    const after = getDysonV2CompiledSkillPlanCacheDiagnosticsForTests()

    expect(after.hits).toBe(before.hits + 1)
    expect(after.compilations).toBe(before.compilations)

    const hostileById = Object.freeze({
      ...source.skills.byId,
      androids: Object.freeze({
        ...source.skills.byId.androids!,
        owned: false,
        timerSeconds: 11,
      }),
    })
    expect(() => inheritPreparedDysonV2SkillPlanForFastV2(
      authority,
      source.skills.byId,
      hostileById,
    )).toThrow("changed 'androids' structurally")

    const hostileNonTimerById = Object.freeze({
      ...source.skills.byId,
      banking: Object.freeze({
        ...source.skills.byId.banking!,
        level: 99n,
      }),
    })
    expect(() => inheritPreparedDysonV2SkillPlanForFastV2(
      Object.freeze({
        kind: 'prepared-dyson-skill-plan-inheritance-v1',
      }),
      source.skills.byId,
      hostileNonTimerById,
    )).toThrow('requires frozen records')
  })

  test('reuses only the proven snapshot-independent three-timer derivation', () => {
    const timerState = stateWith((source) => [
      'androids',
      'pocketAndroids',
      'superRadiantScattering',
    ].reduce(
      (current, id) => ownSkill(current, id),
      source,
    ))
    const first = deriveDysonV2FromCauses(timerState, runtime)
    const changedSnapshotRuntime = Object.freeze({
      ...runtime,
      dysonEvaluationSnapshot: Object.freeze({
        ...runtime.dysonEvaluationSnapshot,
        panelsPerSecond: gameDecimalFromCanonicalString('1e500'),
        panelLifetimeSeconds: gameDecimalFromNumber(1_000),
      }),
    })
    const second = deriveDysonV2FromCauses(timerState, changedSnapshotRuntime)

    expect(second).toBe(first)

    const snapshotDependent = stateWith((_source) => ownSkill(
      timerState,
      'oneMinutePlan',
    ))
    const before = deriveDysonV2FromCauses(snapshotDependent, runtime)
    const after = deriveDysonV2FromCauses(
      snapshotDependent,
      changedSnapshotRuntime,
    )
    expect(after).not.toBe(before)
    expect(after.parameters.facilityModifiers.assembly_lines)
      .not.toEqual(before.parameters.facilityModifiers.assembly_lines)
  })

  test('does not mutate canonical state or the native runtime sidecar', () => {
    const stateBefore = structuredClone(baseState)
    const runtimeBefore = structuredClone(runtime)
    const result = deriveDysonV2FromCauses(baseState, runtime)

    expect(baseState).toEqual(stateBefore)
    expect(runtime).toEqual(runtimeBefore)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.parameters)).toBe(true)
    expect(Object.isFrozen(result.production)).toBe(true)
  })
})
