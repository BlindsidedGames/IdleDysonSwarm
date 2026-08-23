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
    expect(preview.reset).toEqual({
      refundableSkillIds: ['assemblyLineTree', 'startHereTree'],
      retainedSkillIds: [],
      queuedSkillIds: [],
    })
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
        pointsRequired: 0n,
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

  test('previews canonical prerequisite cascades and blocked actions without optimistic eligibility', () => {
    const affordable = previewCanonicalSkillCatalog(
      stateWithSkills([], 2n),
    )
    expect(
      affordable.skills.find(
        (skill) => skill.skillId === 'assemblyLineTree',
      )?.purchase,
    ).toMatchObject({
      eligible: true,
      code: 'purchasable',
      affectedSkillIds: ['startHereTree', 'assemblyLineTree'],
      pointsRequired: 2n,
    })

    const blocked = previewCanonicalSkillCatalog(
      stateWithSkills([], 1n),
    )
    expect(
      blocked.skills.find(
        (skill) => skill.skillId === 'assemblyLineTree',
      )?.purchase,
    ).toMatchObject({
      eligible: false,
      code: 'SKILL-INSUFFICIENT-POINTS',
      affectedSkillIds: ['startHereTree', 'assemblyLineTree'],
      pointsRequired: 2n,
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

  test('atomically purchases missing prerequisites in dependency order', () => {
    const blocked = stateWithSkills([], 1n)
    const rejected = purchaseCanonicalSkill(
      blocked,
      'assemblyLineTree',
    )
    expect(rejected).toMatchObject({
      accepted: false,
      code: 'SKILL-INSUFFICIENT-POINTS',
      state: blocked,
    })

    const eligible = stateWithSkills([], 2n)
    const purchased = purchaseCanonicalSkill(eligible, 'assemblyLineTree')
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.affectedSkillIds).toEqual([
      'startHereTree',
      'assemblyLineTree',
    ])
    expect(purchased.state.skills.points).toBe(0n)
    expect(purchased.state.skills.byId.startHereTree?.owned).toBe(true)
    expect(purchased.state.skills.byId.assemblyLineTree?.owned).toBe(true)
    expect(purchased.state.skills.activeAutoAssignment).toEqual([
      'startHereTree',
      'assemblyLineTree',
    ])
    expect(eligible.skills.byId.startHereTree?.owned).toBe(false)
    expect(eligible.skills.byId.assemblyLineTree?.owned).toBe(false)
  })

  test('purchases a multi-branch prerequisite closure with one exact total', () => {
    const state = stateWithSkills([], 5n)
    const preview = previewCanonicalSkillCatalog(state).skills.find(
      (skill) => skill.skillId === 'parallelProcessing',
    )
    expect(preview?.purchase).toMatchObject({
      eligible: true,
      pointsRequired: 5n,
      affectedSkillIds: [
        'startHereTree',
        'serverTree',
        'aiManagerTree',
        'assemblyLineTree',
        'parallelProcessing',
      ],
    })

    const purchased = purchaseCanonicalSkill(
      state,
      'parallelProcessing',
    )
    expect(purchased.accepted).toBe(true)
    if (!purchased.accepted) return
    expect(purchased.affectedSkillIds).toEqual(
      preview?.purchase.affectedSkillIds,
    )
    expect(purchased.state.skills.points).toBe(0n)
    for (const skillId of purchased.affectedSkillIds) {
      expect(purchased.state.skills.byId[skillId]?.owned).toBe(true)
    }
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

  test('quotes the accepted 34 to 33 Purity cliff before spending a point', () => {
    const state = stateWithSkills(
      ['purityOfMind', 'purityOfBody', 'purityOfSEssence'],
      34n,
    )
    const preview = previewCanonicalSkillCatalog(state).skills.find(
      ({ skillId }) => skillId === 'fragmentAssembly',
    )
    const impact = preview?.purchase.productionImpact
    expect(impact).toMatchObject({ pointsBefore: 34n, pointsAfter: 33n })
    expect(impact?.purity?.cashScienceBefore).toBeCloseTo(
      Math.pow(1.5, 34) * Math.pow(1.42, 34),
      10,
    )
    expect(impact?.purity?.cashScienceAfter).toBeCloseTo(
      Math.pow(1.5, 33) * Math.pow(1.42, 33),
      10,
    )
    expect(impact?.purity?.botsBefore).toBeCloseTo(
      Math.pow(1.25, 34) * Math.pow(1.42, 34),
      10,
    )
  })

  test('quotes exact Supernova suppression by facility', () => {
    const source = stateWithSkills(
      ['stellarSacrifices', 'stellarObliteration', 'avocados', 'ultimateSwarm'],
      10n,
    )
    const state = {
      ...source,
      dyson: {
        ...source.dyson,
        facilities: Object.fromEntries(
          Object.entries(source.dyson.facilities).map(([id, pair]) => [
            id,
            id === 'assembly_lines' ||
            id === 'ai_managers' ||
            id === 'servers' ||
            id === 'data_centers' ||
            id === 'planets'
              ? [pair[0], 101]
              : pair,
          ]),
        ),
      },
    } as CanonicalGameStateV1
    const preview = previewCanonicalSkillCatalog(state).skills.find(
      ({ skillId }) => skillId === 'supernova',
    )
    expect(preview?.purchase.productionImpact?.manualPurchase)
      .toHaveLength(5)
    expect(
      preview?.purchase.productionImpact?.manualPurchase?.every(
        ({ beforeMultiplier, afterMultiplier }) =>
          beforeMultiplier > 1 && afterMultiplier === 1,
      ),
    ).toBe(true)

    const ownedSource = stateWithSkills(
      [
        'stellarSacrifices',
        'stellarObliteration',
        'supernova',
        'avocados',
        'ultimateSwarm',
      ],
      6n,
    )
    const owned = {
      ...ownedSource,
      dyson: state.dyson,
    } as CanonicalGameStateV1
    const direct = previewCanonicalSkillCatalog(owned).skills.find(
      ({ skillId }) => skillId === 'supernova',
    )
    expect(
      direct?.refund.productionImpact?.manualPurchase?.every(
        ({ beforeMultiplier, afterMultiplier }) =>
          beforeMultiplier === 1 && afterMultiplier > 1,
      ),
    ).toBe(true)

    const cascade = previewCanonicalSkillCatalog(owned).skills.find(
      ({ skillId }) => skillId === 'stellarObliteration',
    )
    expect(cascade?.refund.affectedSkillIds).toEqual([
      'supernova',
      'stellarObliteration',
    ])
    expect(
      cascade?.refund.productionImpact?.manualPurchase?.every(
        ({ beforeMultiplier, afterMultiplier }) =>
          beforeMultiplier === 1 && afterMultiplier > 1,
      ),
    ).toBe(true)
  })
})
