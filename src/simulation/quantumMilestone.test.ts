import { expect, it } from 'vitest'
import { createDeterministicMatureDysonFixture } from '../../scripts/support/deterministicMatureDysonFixture'
import { hasCompletedQuantum } from './quantumMilestone'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalQuantumReset } from './quantumTransitions'

it('infers a legacy completed Quantum from lifetime Transcendence after wallets are spent', () => {
  const state = createDeterministicMatureDysonFixture()
  state.quantum.pointsEarned = 0n
  state.avocado.overflowPoints = 0n
  state.statistics.lifetime.botCapOverflowRewards = 1n
  expect(hasCompletedQuantum(state)).toBe(true)
  const reset = applyCanonicalInfinityReset(state, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n })
  expect(reset.ok).toBe(true)
  if (reset.ok) expect(reset.state.dyson.facilities.assembly_lines).toEqual([1, 0])
  expect(hasCompletedQuantum({ ...state, meta: { ...state.meta, firstQuantumComplete: false } })).toBe(false)
})

it('grants a generated starter on Quantum but not on a pre-Quantum challenge restart', () => {
  const state = createDeterministicMatureDysonFixture()
  state.meta.firstQuantumComplete = false
  const restart = applyCanonicalQuantumReset(state, 0n, undefined, { restartOnly: true })
  expect(restart.ok).toBe(true)
  if (restart.ok) {
    expect(hasCompletedQuantum(restart.state)).toBe(false)
    expect(restart.state.dyson.facilities.assembly_lines).toEqual([0, 0])
  }
  const quantum = applyCanonicalQuantumReset(state, 0n)
  expect(quantum.ok).toBe(true)
  if (quantum.ok) {
    expect(quantum.state.meta.firstQuantumComplete).toBe(true)
    expect(quantum.state.dyson.facilities.assembly_lines).toEqual([1, 0])
    const infinity = applyCanonicalInfinityReset(quantum.state, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n })
    expect(infinity.ok).toBe(true)
    if (infinity.ok) expect(infinity.state.dyson.facilities.assembly_lines).toEqual([1, 0])
  }
})
