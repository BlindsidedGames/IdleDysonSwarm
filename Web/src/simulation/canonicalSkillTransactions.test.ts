import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  previewCanonicalSkillCatalog,
  purchaseCanonicalSkill,
  refundCanonicalSkill,
  resetCanonicalSkills,
  runCanonicalSkillAutoAssignment,
} from './canonicalSkillTransactions'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function runtime(owned: boolean): SkillRuntimeState {
  return {
    owned,
    level: 0,
    timerSeconds: 0,
    secondaryTimerSeconds: 0,
  }
}

function stateWithSkills(
  owned: readonly string[] = [],
  points = 10n,
  queue: readonly string[] = [],
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  const byId = Object.fromEntries(
    Object.keys(source.skills.byId).map((id) => [
      id,
      runtime(owned.includes(id)),
    ]),
  )
  return {
    ...source,
    meta: {
      ...source.meta,
      firstInfinityComplete: true,
    },
    quantum: {
      ...source.quantum,
      unlocks: Object.fromEntries(
        Object.keys(source.quantum.unlocks).map((id) => [id, true]),
      ) as unknown as CanonicalGameStateV1['quantum']['unlocks'],
    },
    skills: {
      ...source.skills,
      points,
      fragments: 0n,
      byId,
      activeAutoAssignment: queue,
      autoAssignNonRefundable: true,
      presets: source.skills.presets.map((preset) => ({
        ...preset,
        skillIds: queue,
      })) as CanonicalGameStateV1['skills']['presets'],
    },
  }
}

describe('canonical skill transactions', () => {
  test('previews the complete authored catalog through exact purchase and refund authorities', () => {
    const state = stateWithSkills(
      ['startHereTree', 'assemblyLineTree'],
      0n,
    )
    const before = structuredClone(state)
    const preview = previewCanonicalSkillCatalog(state)
    const start = preview.skills.find(
      (skill) => skill.skillId === 'startHereTree',
    )

    expect(preview.complete).toBe(true)
    expect(preview.definitionGap).toBeNull()
    expect(preview.skills).toHaveLength(
      Object.keys(state.skills.byId).length,
    )
    expect(start).toMatchObject({
      skillId: 'startHereTree',
      cost: 1n,
      owned: true,
      visible: true,
      unlocked: true,
      queued: false,
      visualState: 'owned',
      purchase: {
        eligible: false,
        code: 'already-owned',
      },
      refund: {
        eligible: true,
        code: 'refundable',
        affectedSkillIds: ['assemblyLineTree', 'startHereTree'],
        pointsReturned: 2n,
        fragmentsRemoved: 0n,
      },
    })
    expect(Object.isFrozen(preview)).toBe(true)
    expect(Object.isFrozen(preview.skills)).toBe(true)
    expect(Object.isFrozen(start?.refund)).toBe(true)
    expect(state).toEqual(before)
  })

  test('publishes canonical Unity visibility for first-Infinity and quantum-gated branches', () => {
    const unlockedState = stateWithSkills([], 10n)
    const lockedState: CanonicalGameStateV1 = {
      ...unlockedState,
      meta: {
        ...unlockedState.meta,
        firstInfinityComplete: false,
      },
      quantum: {
        ...unlockedState.quantum,
        unlocks: {
          ...unlockedState.quantum.unlocks,
          fragments: false,
          purity: false,
          terra: false,
          power: false,
          paragade: false,
          stellar: false,
        },
      },
    }

    const locked = previewCanonicalSkillCatalog(lockedState)
    for (const skillId of [
      'whatWillComeToPass',
      'fragmentAssembly',
      'purityOfMind',
      'terraFirma',
      'superchargedPower',
      'paragon',
      'stellarSacrifices',
    ]) {
      expect(
        locked.skills.find((skill) => skill.skillId === skillId),
        skillId,
      ).toMatchObject({
        visible: false,
        unlocked: false,
        purchase: {
          eligible: false,
          code: 'SKILL-LOCKED',
        },
      })
    }

    const unlocked = previewCanonicalSkillCatalog(unlockedState)
    for (const skillId of [
      'whatWillComeToPass',
      'fragmentAssembly',
      'purityOfMind',
      'terraFirma',
      'superchargedPower',
      'paragon',
      'stellarSacrifices',
    ]) {
      expect(
        unlocked.skills.find((skill) => skill.skillId === skillId),
        skillId,
      ).toMatchObject({
        visible: true,
        unlocked: true,
      })
    }
  })

  test('publishes canonical Unity node visual precedence and queue membership', () => {
    const state = stateWithSkills(
      [
        'startHereTree',
        'manualLabour',
        'renegade',
        'scientificPlanets',
        'shouldersOfGiants',
      ],
      10n,
      ['manualLabour', 'fragmentAssembly'],
    )
    const preview = previewCanonicalSkillCatalog(state)
    const skill = (skillId: string) =>
      preview.skills.find((candidate) => candidate.skillId === skillId)

    expect(skill('startHereTree')).toMatchObject({
      visualState: 'non-refundable-owned',
      queued: false,
    })
    expect(skill('fragmentAssembly')).toMatchObject({
      visualState: 'fragment',
      queued: true,
    })
    expect(skill('manualLabour')).toMatchObject({
      visualState: 'owned',
      queued: true,
    })
    expect(skill('banking')).toMatchObject({
      visualState: 'non-refundable',
      queued: false,
    })
    expect(skill('shouldersOfGiants')).toMatchObject({
      visualState: 'non-refundable-owned',
      queued: false,
    })
    expect(skill('scientificPlanets')).toMatchObject({
      visualState: 'non-refundable-owned',
      queued: false,
    })
    expect(skill('paragon')).toMatchObject({
      visualState: 'exclusive',
      queued: false,
    })
    expect(skill('workerEfficiencyTree')).toMatchObject({
      visualState: 'normal',
      queued: false,
    })
  })

  test('publishes root styling when no dynamic non-refundable lock is owned', () => {
    const preview = previewCanonicalSkillCatalog(
      stateWithSkills([], 10n),
    )
    expect(
      preview.skills.find(
        (skill) => skill.skillId === 'startHereTree',
      ),
    ).toMatchObject({
      visualState: 'root',
      queued: false,
    })
  })

  test('previews blocked purchase and refund reasons without optimistic eligibility', () => {
    const blocked = previewCanonicalSkillCatalog(
      stateWithSkills([], 10n),
    )
    expect(
      blocked.skills.find(
        (skill) => skill.skillId === 'assemblyLineTree',
      )?.purchase,
    ).toMatchObject({
      eligible: false,
      code: 'SKILL-REQUIREMENT',
    })

    const lockedRefund = previewCanonicalSkillCatalog(
      stateWithSkills(['banking', 'investmentPortfolio'], 0n),
    )
    expect(
      lockedRefund.skills.find(
        (skill) => skill.skillId === 'banking',
      )?.refund,
    ).toMatchObject({
      eligible: false,
      code: 'SKILL-NOT-REFUNDABLE',
    })
  })

  test('enforces authored requirements and atomically purchases an eligible skill', () => {
    const blocked = stateWithSkills([], 2n)
    const rejected = purchaseCanonicalSkill(blocked, 'assemblyLineTree')
    expect(rejected).toMatchObject({
      accepted: false,
      code: 'SKILL-REQUIREMENT',
      state: blocked,
    })

    const eligible = stateWithSkills(['startHereTree'], 2n)
    const purchased = purchaseCanonicalSkill(eligible, 'assemblyLineTree')
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.state.skills.points).toBe(1n)
    expect(purchased.state.skills.byId.assemblyLineTree?.owned).toBe(true)
    expect(purchased.state.skills.activeAutoAssignment).toContain(
      'assemblyLineTree',
    )
    expect(eligible.skills.byId.assemblyLineTree?.owned).toBe(false)
  })

  test('tracks fragment ownership with fragment skill purchases', () => {
    const state = stateWithSkills([], 1n)
    const purchased = purchaseCanonicalSkill(state, 'fragmentAssembly')
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.state.skills.fragments).toBe(1n)
  })

  test('refunds recursive owned dependents and removes them from queues', () => {
    const state = stateWithSkills(
      ['startHereTree', 'assemblyLineTree'],
      0n,
      ['startHereTree', 'assemblyLineTree', 'banking'],
    )
    const refunded = refundCanonicalSkill(state, 'startHereTree')
    expect(refunded.accepted).toBe(true)
    if (!refunded.accepted) return
    expect(refunded.affectedSkillIds).toEqual([
      'assemblyLineTree',
      'startHereTree',
    ])
    expect(refunded.state.skills.points).toBe(2n)
    expect(refunded.state.skills.byId.startHereTree?.owned).toBe(false)
    expect(refunded.state.skills.byId.assemblyLineTree?.owned).toBe(false)
    expect(refunded.state.skills.activeAutoAssignment).toEqual(['banking'])
    expect(refunded.state.skills.presets[0].skillIds).toEqual(['banking'])
  })

  test('rejects a cascade containing an intrinsically non-refundable skill', () => {
    const state = stateWithSkills(['banking', 'investmentPortfolio'], 0n)
    const refunded = refundCanonicalSkill(state, 'banking')
    expect(refunded).toMatchObject({
      accepted: false,
      code: 'SKILL-NOT-REFUNDABLE',
      state,
    })
  })

  test('auto-assignment revisits a blocked entry after its prerequisite is assigned', () => {
    const state = stateWithSkills(
      [],
      2n,
      ['investmentPortfolio', 'banking'],
    )
    const assigned = runCanonicalSkillAutoAssignment(state)
    expect(assigned.accepted).toBe(true)
    if (!assigned.accepted) return
    expect(assigned.affectedSkillIds).toEqual([
      'banking',
      'investmentPortfolio',
    ])
    expect(assigned.state.skills.points).toBe(0n)
    expect(assigned.state.skills.byId.banking?.owned).toBe(true)
    expect(assigned.state.skills.byId.investmentPortfolio?.owned).toBe(true)
  })

  test('global reset preserves locked skills but clears refundable ones and live queue', () => {
    const state = stateWithSkills(
      ['banking', 'startHereTree'],
      0n,
      ['banking', 'startHereTree'],
    )
    const reset = resetCanonicalSkills(state)
    expect(reset.accepted).toBe(true)
    if (!reset.accepted) return
    expect(reset.state.skills.byId.banking?.owned).toBe(true)
    expect(reset.state.skills.byId.startHereTree?.owned).toBe(false)
    expect(reset.state.skills.points).toBe(1n)
    expect(reset.state.skills.activeAutoAssignment).toEqual([])
  })
})
