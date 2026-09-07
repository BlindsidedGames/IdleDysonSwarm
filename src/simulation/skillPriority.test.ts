import { readFileSync } from 'node:fs'
import { hydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import { runCanonicalSkillAutoAssignment } from './canonicalSkillTransactions'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { describe, expect, test } from 'vitest'
import { normalizeSkillAssignment, resolveSkillPurchaseOrder } from './canonicalSkillPresetTransactions'

const definitions = new Map([
  ['root', { required: [], shadowRequired: [] }],
  ['branch', { required: ['root'], shadowRequired: [] }],
  ['target', { required: ['branch'], shadowRequired: ['shadow'] }],
  ['shadow', { required: ['root'], shadowRequired: [] }],
  ['other', { required: [], shadowRequired: [] }],
])

describe('preset spending priority', () => {
  test('preserves display order separately from dependency purchase order', () => {
    expect(normalizeSkillAssignment(['scientificPlanets', 'startHereTree', 'scientificPlanets']))
      .toEqual(['scientificPlanets', 'startHereTree'])
    expect(resolveSkillPurchaseOrder(['target', 'other', 'root'], new Set(), definitions))
      .toEqual(['root', 'branch', 'shadow', 'target', 'other'])
  })
  test('an owned permanent prerequisite stops ancestor expansion', () => {
    expect(resolveSkillPurchaseOrder(['target', 'other'], new Set(['branch', 'shadow']), definitions))
      .toEqual(['target', 'other'])
  })
  test('shared prerequisites are bought only once', () => {
    expect(resolveSkillPurchaseOrder(['branch', 'shadow', 'target'], new Set(), definitions))
      .toEqual(['root', 'branch', 'shadow', 'target'])
  })
})

function priorityState() {
  const fixture = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
  const state = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  return { ...state, infinity: { ...state.infinity, permanentSkillPoints: 2n }, meta: { ...state.meta, firstInfinityComplete: true },
    skills: { ...state.skills, points: 2n, byId: {}, activeAutoAssignment: ['avocados', 'banking'], autoAssignNonRefundable: true } }
}

test('waits for an expensive priority instead of spending on a cheaper later entry', () => {
  const state = priorityState()
  const result = runCanonicalSkillAutoAssignment({ ...state, skills: { ...state.skills, points: 1n } })
  expect(result.accepted).toBe(true)
  if (!result.accepted) return
  expect(result.state.skills.points).toBe(1n)
  expect(result.state.skills.byId.banking?.owned).not.toBe(true)
})

test('live and Infinity assignment resolve the same priority closure', () => {
  const state = priorityState()
  const live = runCanonicalSkillAutoAssignment(state)
  const reset = applyCanonicalInfinityReset(state, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n })
  expect(live.accepted).toBe(true)
  expect(reset.ok).toBe(true)
  if (!reset.ok || !live.accepted) return
  expect(reset.autoAssignedSkillIds).toEqual(live.affectedSkillIds)
  expect(reset.state.skills.points).toBe(live.state.skills.points)
})
