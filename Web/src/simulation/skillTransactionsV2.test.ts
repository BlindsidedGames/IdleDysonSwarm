import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import {
  admitValidatedCanonicalGameStateV2,
  cloneCanonicalGameStateV2,
  registerCanonicalGameStateValidationAuthorityV2,
} from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type {
  CanonicalGameStateV2,
  SkillRuntimeStateV2,
} from '../game-state/typesV2'
import { gameDecimalFromNumber } from '../math/gameDecimal'
import { prepareIdb1Save } from '../save/prepare'
import {
  advanceCanonicalSkillTimersV2,
  clearedCanonicalSkillRuntimeV2,
  panelWarrantyLifetimeAdditionV2,
  previewAddCanonicalSkillToPresetV2,
  previewCanonicalSkillCatalogV2,
  previewRemoveCanonicalSkillFromPresetV2,
  productionScalingThresholdV2,
  purchaseCanonicalSkillV2,
  recalculateCanonicalSkillPointsV2,
  refundCanonicalSkillV2,
  resetCanonicalSkillsV2,
  runCanonicalSkillAutoAssignmentV2,
} from './skillTransactionsV2'

const baseState = migratePreparedSaveToV2(
  prepareIdb1Save(firstRunIdb1).prepared,
  { kind: 'trusted-same-device' },
).state

function runtime(
  owned: boolean,
  timerSeconds = 0,
  secondaryTimerSeconds = 0,
): Readonly<SkillRuntimeStateV2> {
  return Object.freeze({
    owned,
    level: owned ? 1n : 0n,
    timerSeconds,
    secondaryTimerSeconds,
  })
}

function stateWithSkills(
  owned: readonly string[] = [],
  points = 10n,
  queue: readonly string[] = [],
  timers: Readonly<Record<string, readonly [number, number]>> = {},
): CanonicalGameStateV2 {
  const byId = Object.fromEntries(
    Object.keys(baseState.skills.byId).map((id) => [
      id,
      runtime(
        owned.includes(id),
        timers[id]?.[0] ?? 0,
        timers[id]?.[1] ?? 0,
      ),
    ]),
  )
  const fragments = BigInt(
    [
      'fragmentAssembly',
      'monetaryPolicy',
      'panelWarranty',
      'productionScaling',
      'progressiveAssembly',
      'regulatedAcademia',
      'terraformingProtocols',
    ].filter((id) => owned.includes(id)).length,
  )
  return cloneCanonicalGameStateV2({
    ...baseState,
    infinity: {
      ...baseState.infinity,
      breakTarget: gameDecimalFromNumber(1),
    },
    meta: { ...baseState.meta, firstInfinityComplete: true },
    quantum: {
      ...baseState.quantum,
      unlocks: Object.fromEntries(
        Object.keys(baseState.quantum.unlocks).map((id) => [id, true]),
      ) as unknown as CanonicalGameStateV2['quantum']['unlocks'],
    },
    skills: {
      ...baseState.skills,
      points,
      fragments,
      byId,
      activeAutoAssignment: [...queue],
      autoAssignNonRefundable: true,
      presets: baseState.skills.presets.map((preset) => ({
        ...preset,
        skillIds: [...queue],
      })) as unknown as CanonicalGameStateV2['skills']['presets'],
    },
  })
}

describe('exact Canonical Skill V2 transactions', () => {
  test('does not trust an authority-forged issued state for validation elision', () => {
    const source = stateWithSkills()
    const forged = Object.freeze({
      ...source,
      dyson: Object.freeze({
        ...source.dyson,
        manualCreationIntervalSeconds: 0,
      }),
    }) as Readonly<CanonicalGameStateV2>
    admitValidatedCanonicalGameStateV2(
      registerCanonicalGameStateValidationAuthorityV2(),
      forged,
    )

    expect(purchaseCanonicalSkillV2(forged, 'startHereTree')).toMatchObject({
      accepted: false,
      code: 'invalid-state',
    })
  })

  test('projects the complete catalog through the same V2 planners', () => {
    const preview = previewCanonicalSkillCatalogV2(stateWithSkills([], 10n))
    expect(preview).toMatchObject({ complete: true, definitionGap: null })
    expect(preview.skills).toHaveLength(104)
    expect(preview.skills.find(({ visualState }) => visualState === 'root')).toMatchObject({
      visible: true,
      unlocked: true,
      visualState: 'root',
      purchase: { eligible: true },
    })
    expect(Object.isFrozen(preview.skills)).toBe(true)
  })
  test('atomically purchases a dependency closure using exact bigint points', () => {
    const state = stateWithSkills([], 2n)
    const purchased = purchaseCanonicalSkillV2(state, 'assemblyLineTree')
    expect(purchased).toMatchObject({
      accepted: true,
      changed: true,
      code: 'purchased',
      affectedSkillIds: ['startHereTree', 'assemblyLineTree'],
    })
    if (!purchased.accepted) return
    expect(purchased.state.skills.points).toBe(0n)
    expect(purchased.state.skills.byId.startHereTree).toMatchObject({
      owned: true,
      level: 1n,
    })
    expect(purchased.state.skills.activeAutoAssignment).toEqual([
      'startHereTree',
      'assemblyLineTree',
    ])
    expect(state.skills.byId.startHereTree!.owned).toBe(false)
  })

  test('never narrows exact Skill Points across purchase and refund', () => {
    const hugePoints = 10n ** 100n
    const purchased = purchaseCanonicalSkillV2(
      stateWithSkills([], hugePoints),
      'startHereTree',
    )
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.state.skills.points).toBe(hugePoints - 1n)
    const refunded = refundCanonicalSkillV2(purchased.state, 'startHereTree')
    expect(refunded.accepted).toBe(true)
    if (!refunded.accepted) return
    expect(refunded.state.skills.points).toBe(hugePoints)
  })

  test('recalculates the Unity repair balance from canonical V2 sources and owned costs', () => {
    const source = stateWithSkills(['startHereTree'], 99n)
    const prepared = cloneCanonicalGameStateV2({
      ...source,
      dyson: { ...source.dyson, goalStage: 3n },
      infinity: { ...source.infinity, permanentSkillPoints: 4n },
    })

    const result = recalculateCanonicalSkillPointsV2(prepared)

    expect(result).toMatchObject({ accepted: true, changed: true, code: 'recalculated' })
    if (!result.accepted) return
    expect(result.state.skills.points).toBe(6n)
    expect(result.state.skills.byId.startHereTree!.owned).toBe(true)
  })

  test('hardens first-Infinity and Quantum fragment unlocks', () => {
    const source = stateWithSkills([], 2n)
    const locked = cloneCanonicalGameStateV2({
      ...source,
      meta: { ...source.meta, firstInfinityComplete: false },
      quantum: {
        ...source.quantum,
        unlocks: { ...source.quantum.unlocks, fragments: false },
      },
    })
    expect(purchaseCanonicalSkillV2(locked, 'fragmentAssembly')).toMatchObject({
      accepted: false,
      code: 'locked',
    })
    expect(purchaseCanonicalSkillV2(locked, 'whatWillComeToPass')).toMatchObject({
      accepted: false,
      code: 'locked',
    })
  })

  test('rejects reverse-direction authored exclusivity', () => {
    const state = stateWithSkills(['saren'], 20n)
    expect(purchaseCanonicalSkillV2(state, 'paragon')).toMatchObject({
      accepted: false,
      code: 'exclusive-conflict',
    })
  })

  test('derives fragments from exact owned fragment Skills', () => {
    const purchased = purchaseCanonicalSkillV2(
      stateWithSkills([], 1n),
      'fragmentAssembly',
    )
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.state.skills.fragments).toBe(1n)

    const refunded = refundCanonicalSkillV2(
      purchased.state,
      'fragmentAssembly',
    )
    expect(refunded.accepted).toBe(true)
    if (!refunded.accepted) return
    expect(refunded.state.skills.fragments).toBe(0n)
  })

  test('refunds descendants and removes every queued/preset dependent', () => {
    const state = stateWithSkills(
      ['startHereTree', 'assemblyLineTree'],
      0n,
      ['startHereTree', 'assemblyLineTree', 'banking'],
    )
    const refunded = refundCanonicalSkillV2(state, 'startHereTree')
    expect(refunded).toMatchObject({
      accepted: true,
      affectedSkillIds: ['assemblyLineTree', 'startHereTree'],
    })
    if (!refunded.accepted) return
    expect(refunded.state.skills.points).toBe(2n)
    expect(refunded.state.skills.activeAutoAssignment).toEqual(['banking'])
    expect(refunded.state.skills.presets[0].skillIds).toEqual(['banking'])
    expect(refunded.state.skills.byId.startHereTree!.level).toBe(0n)
  })

  test('rejects a refund cascade locked by an owned non-refundable descendant', () => {
    const state = stateWithSkills(
      ['startHereTree', 'banking', 'investmentPortfolio'],
      0n,
    )
    expect(refundCanonicalSkillV2(state, 'banking')).toMatchObject({
      accepted: false,
      code: 'not-refundable',
    })
  })

  test('auto-assignment revisits dependencies and skips locked queue entries', () => {
    const assigned = runCanonicalSkillAutoAssignmentV2(
      stateWithSkills([], 2n, ['investmentPortfolio', 'banking']),
    )
    expect(assigned).toMatchObject({
      accepted: true,
      affectedSkillIds: ['banking', 'investmentPortfolio'],
    })

    const source = stateWithSkills([], 1n, ['fragmentAssembly', 'startHereTree'])
    const locked = cloneCanonicalGameStateV2({
      ...source,
      quantum: {
        ...source.quantum,
        unlocks: { ...source.quantum.unlocks, fragments: false },
      },
    })
    expect(runCanonicalSkillAutoAssignmentV2(locked)).toMatchObject({
      accepted: true,
      affectedSkillIds: ['startHereTree'],
    })
  })

  test('manual reset preserves locked ownership but clears refundable ownership', () => {
    const reset = resetCanonicalSkillsV2(
      stateWithSkills(['banking', 'startHereTree'], 0n, ['banking']),
    )
    expect(reset.accepted).toBe(true)
    if (!reset.accepted) return
    expect(reset.state.skills.byId.banking!.owned).toBe(true)
    expect(reset.state.skills.byId.startHereTree).toMatchObject({
      owned: false,
      level: 0n,
    })
    expect(reset.state.skills.points).toBe(1n)
    expect(reset.state.skills.activeAutoAssignment).toEqual([])
  })

  test('preserves owner-local timers through assignment changes and advances only active owners', () => {
    const timers = { androids: [12, 34] as const }
    const purchased = purchaseCanonicalSkillV2(
      stateWithSkills([], 10n, [], timers),
      'androids',
    )
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.state.skills.byId.androids).toMatchObject({
      timerSeconds: 12,
      secondaryTimerSeconds: 34,
    })
    const advanced = advanceCanonicalSkillTimersV2(purchased.state, 0.25)
    expect(advanced).toMatchObject({ accepted: true, code: 'timers-advanced' })
    if (!advanced.accepted) return
    expect(advanced.state.skills.byId.androids!.timerSeconds).toBe(12.25)
    expect(advanced.state.skills.byId.idleElectricSheep!.timerSeconds).toBe(0)
    const refunded = refundCanonicalSkillV2(advanced.state, 'androids')
    expect(refunded.accepted).toBe(true)
    if (!refunded.accepted) return
    expect(refunded.state.skills.byId.androids).toMatchObject({
      owned: false,
      level: 0n,
      timerSeconds: 12.25,
      secondaryTimerSeconds: 34,
    })
    expect(clearedCanonicalSkillRuntimeV2()).toEqual({
      owned: false,
      level: 0n,
      timerSeconds: 0,
      secondaryTimerSeconds: 0,
    })
  })

  test('saturates near-maximum active timers without stranding simulation', () => {
    const purchased = purchaseCanonicalSkillV2(
      stateWithSkills(
        [],
        10n,
        [],
        { androids: [Number.MAX_VALUE / 2, 0] },
      ),
      'androids',
    )
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    const saturated = advanceCanonicalSkillTimersV2(
      purchased.state,
      Number.MAX_VALUE,
    )
    expect(saturated).toMatchObject({ accepted: true, changed: true })
    expect(saturated.state.skills.byId.androids?.timerSeconds).toBe(Number.MAX_VALUE)
    const unchanged = advanceCanonicalSkillTimersV2(saturated.state, 1)
    expect(unchanged).toMatchObject({
      accepted: true,
      changed: false,
      code: 'unchanged',
    })
  })

  test('previews dependency-complete preset add and descendant removal', () => {
    const state = stateWithSkills([], 10n, [])
    const added = previewAddCanonicalSkillToPresetV2(
      state,
      1,
      'assemblyLineTree',
    )
    expect(added).toEqual({
      accepted: true,
      changed: true,
      affectedSkillIds: ['startHereTree', 'assemblyLineTree'],
      nextSkillIds: ['startHereTree', 'assemblyLineTree'],
    })
    const queued = stateWithSkills(
      [],
      10n,
      ['startHereTree', 'assemblyLineTree'],
    )
    expect(previewRemoveCanonicalSkillFromPresetV2(
      queued,
      1,
      'startHereTree',
    )).toEqual({
      accepted: true,
      changed: true,
      affectedSkillIds: ['startHereTree', 'assemblyLineTree'],
      nextSkillIds: [],
    })
  })

  test('rejects invalid preset slots and hostile state before reading Skills', () => {
    const state = stateWithSkills([], 0n)
    expect(previewAddCanonicalSkillToPresetV2(
      state,
      0 as never,
      'startHereTree',
    )).toMatchObject({ accepted: false, nextSkillIds: [] })
    expect(previewRemoveCanonicalSkillFromPresetV2(
      state,
      6 as never,
      'startHereTree',
    )).toMatchObject({ accepted: false, nextSkillIds: [] })

    let getterCalls = 0
    const hostile = Object.create(null) as CanonicalGameStateV2
    Object.defineProperty(hostile, 'skills', {
      enumerable: true,
      get() {
        getterCalls += 1
        return state.skills
      },
    })
    expect(previewAddCanonicalSkillToPresetV2(
      hostile,
      1,
      'startHereTree',
    )).toMatchObject({ accepted: false, nextSkillIds: [] })
    expect(getterCalls).toBe(0)
  })

  test('keeps Panel Warranty Web parity and Production Scaling direct ownership', () => {
    expect(panelWarrantyLifetimeAdditionV2(
      stateWithSkills(['panelWarranty'], 0n),
    )).toBe(1)
    expect(panelWarrantyLifetimeAdditionV2(
      stateWithSkills(['panelWarranty', 'fragmentAssembly'], 0n),
    )).toBe(2)
    expect(productionScalingThresholdV2(stateWithSkills([], 0n))).toBe(100)
    expect(productionScalingThresholdV2(
      stateWithSkills(['productionScaling'], 0n),
    )).toBe(90)
  })

  test('rejects hostile accessor state without invoking it', () => {
    const state = stateWithSkills([], 1n)
    let calls = 0
    const skills = { ...state.skills }
    Object.defineProperty(skills, 'points', {
      enumerable: true,
      get() {
        calls += 1
        return 1n
      },
    })
    const hostile = Object.freeze({ ...state, skills }) as CanonicalGameStateV2
    expect(purchaseCanonicalSkillV2(hostile, 'startHereTree')).toMatchObject({
      accepted: false,
      code: 'invalid-state',
    })
    expect(calls).toBe(0)
  })
})
