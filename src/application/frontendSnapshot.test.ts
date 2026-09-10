import { describe, expect, test } from 'vitest'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'
import { purchaseQuantumUpgrade, purchaseQuantumUpgradeBulk } from '../simulation/quantumUpgrades'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { selectFrontendGameplaySnapshot } from './frontendSnapshot'

const entitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

const runtime = structuredClone(
  new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-09-01T00:00:00.000Z',
    }),
    { entitlements },
  ).initialState,
)

function gameplaySnapshot(
  gameState: typeof runtime.gameState = runtime.gameState,
) {
  return selectFrontendGameplaySnapshot(gameState, {
    compatibilityTuning: runtime.compatibilityTuning,
    evaluationSnapshot: runtime.evaluationSnapshot,
    entitlements: runtime.entitlements,
    tinker: runtime.tinker,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    quantumLeap: {
      eligible: false,
      code: 'not-ready',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    },
    storedTimeCheater: runtime.storedTimeCheater,
    selectedSkillPresetSlot: runtime.selectedSkillPresetSlot,
    lastSkillPresetApplication: runtime.lastSkillPresetApplication,
  })
}

describe('frontend gameplay snapshot', () => {
  test('projects an exact next Universe Designation beyond the discrete ceiling', () => {
    const designation = DISCRETE_MAXIMUM + 42n
    const snapshot = gameplaySnapshot({
      ...runtime.gameState,
      reality: {
        ...runtime.gameState.reality,
        universeDesignationCount: designation,
      },
    })

    expect(snapshot.resources.reality.universeDesignationCount)
      .toBe(designation)
    expect(snapshot.derived.reality.nextUniverseDesignation)
      .toBe(designation + 1n)
  })
})


describe('Quantum booster purchase previews', () => {
  test.each(['CashBonus', 'ScienceBonus', 'InfluenceSpeed'] as const)(
    '%s Max previews the exact affordable effect headroom and becomes maxed after purchase',
    (upgradeId) => {
      const field = upgradeId === 'CashBonus' ? 'cashBonusLevels'
        : upgradeId === 'ScienceBonus' ? 'scienceBonusLevels' : 'influenceSpeedBonus'
      const state = structuredClone(runtime.gameState)
      // Lifetime totals can exceed the wallet cap after earning and spending again.
      state.quantum.pointsEarned = DISCRETE_MAXIMUM + 100n
      state.quantum.pointsSpent = DISCRETE_MAXIMUM
      state.quantum[field] = DISCRETE_MAXIMUM - (upgradeId === 'InfluenceSpeed' ? 7n : 2n)
      const preview = gameplaySnapshot(state).previews.quantum.upgrades.find((item) => item.upgradeId === upgradeId)!
      expect(preview.eligible).toBe(true)
      expect(preview.maximumQuantity).toBe(2n)
      const overlarge = purchaseQuantumUpgradeBulk(state, upgradeId, 3n)
      expect(overlarge.accepted).toBe(false)
      expect(overlarge.state).toBe(state)
      const result = purchaseQuantumUpgradeBulk(state, upgradeId, 'max')
      expect(result.accepted).toBe(true)
      expect(result.cost).toBe(preview.cost * preview.maximumQuantity!)
      expect(result.state.quantum.pointsSpent).toBe(DISCRETE_MAXIMUM + 2n)
      const final = gameplaySnapshot(result.state).previews.quantum.upgrades.find((item) => item.upgradeId === upgradeId)!
      expect(final.maximumQuantity).toBe(0n)
      expect(final.eligible).toBe(false)
      expect(final.code).toBe('already-maxed')
    },
  )

  test('empty wallet has a zero Max quantity without claiming the booster is maxed', () => {
    const state = structuredClone(runtime.gameState)
    state.quantum.pointsEarned = state.quantum.pointsSpent
    const preview = gameplaySnapshot(state).previews.quantum.upgrades.find((item) => item.upgradeId === 'CashBonus')!
    expect(preview.maximumQuantity).toBe(0n)
    expect(preview.code).toBe('insufficient-points')
  })
})


test.each([1n, 2n, 3n, 4n])('Influence Max preserves the final single-purchase saturation with %s remaining', (remaining) => {
  const state = structuredClone(runtime.gameState)
  state.quantum.pointsEarned = 100n
  state.quantum.pointsSpent = 0n
  state.quantum.influenceSpeedBonus = DISCRETE_MAXIMUM - remaining
  const preview = gameplaySnapshot(state).previews.quantum.upgrades.find((item) => item.upgradeId === 'InfluenceSpeed')!
  expect(preview.maximumQuantity).toBe(1n)
  const single = purchaseQuantumUpgrade(state, 'InfluenceSpeed')
  const max = purchaseQuantumUpgradeBulk(state, 'InfluenceSpeed', 'max')
  expect(single.accepted).toBe(true)
  expect(max.state).toEqual(single.state)
  expect(max.state.quantum.influenceSpeedBonus).toBe(DISCRETE_MAXIMUM)
  const overlarge = purchaseQuantumUpgradeBulk(state, 'InfluenceSpeed', 2n)
  expect(overlarge.accepted).toBe(false)
  expect(overlarge.state).toBe(state)
  const exhausted = purchaseQuantumUpgrade(max.state, 'InfluenceSpeed')
  expect(exhausted.code).toBe('already-maxed')
  expect(exhausted.cost).toBe(0n)
  expect(exhausted.state).toBe(max.state)
})
