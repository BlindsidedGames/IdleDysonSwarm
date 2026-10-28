import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { applyDevelopmentAction } from './canonicalDevelopmentCommands'
import { prepareIdb1Save } from '../save/prepare'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { EMPTY_DISCOVERY, purchaseDiscovery } from '../simulation/discovery'
import { completeCanonicalAvocadoMeditationStep } from '../simulation/avocadoMeditation'
import { evaluateAchievements } from '../achievements/evaluate'
import { SKILL_COSTS } from '../simulation/skillDefinitions'

const prepared = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const session = () => new CanonicalRuntimeSession(prepared, { entitlements: { permanentDoubleIp: false } })
const context = createProductionEventContext()
const owned = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }

test('signed Discovery and point adjustments subtract and clamp instead of clearing balances', () => {
  const runtime = structuredClone(session().initialState)
  runtime.gameState.discovery = { ...EMPTY_DISCOVERY, unlocked: true, completions: 11n }
  runtime.gameState.avocado.overflowPoints = 8n
  for (const amount of [-1n, -100n, 3n]) {
    expect(applyDevelopmentAction(runtime, { kind: 'add-discoveries', amount }, context).accepted).toBe(true)
    expect(applyDevelopmentAction(runtime, { kind: 'add-transcendence-points', amount }, context).accepted).toBe(true)
    expect(runtime.gameState.discovery.completions).toBe(amount === -1n ? 10n : amount === -100n ? 0n : 3n)
    expect(runtime.gameState.avocado.overflowPoints).toBe(amount === -1n ? 7n : amount === -100n ? 0n : 3n)
  }
})

test('SP recalculation includes augments but does not charge permanent Fractured skills', () => {
  const runtime = structuredClone(session().initialState)
  runtime.gameState.skills.byId = {}
  expect(applyDevelopmentAction(runtime, { kind: 'recalculate-skill-points' }, context).accepted).toBe(true)
  const unspent = runtime.gameState.skills.points
  runtime.gameState.skills.byId = { startHereTree: { ...owned }, 'subskill.cashScience.lifetime': { ...owned } }
  runtime.gameState.challenges = { ...runtime.gameState.challenges!, galvanizedSkillIds: ['startHereTree'] }
  expect(applyDevelopmentAction(runtime, { kind: 'recalculate-skill-points' }, context).accepted).toBe(true)
  expect(runtime.gameState.skills.points).toBe(unspent - 1n)
  const points = runtime.gameState.skills.points
  applyDevelopmentAction(runtime, { kind: 'recalculate-skill-points' }, context)
  expect(runtime.gameState.skills.points).toBe(points)
})

test('achievement accounting includes every assigned augment', () => {
  const state = structuredClone(session().initialState.gameState)
  state.skills.byId = Object.fromEntries([...SKILL_COSTS.keys()].map(id => [id, { ...owned }]))
  expect(evaluateAchievements(state, false).statistics['stat.skill_points_assigned'])
    .toBe(Number([...SKILL_COSTS.values()].reduce((sum, cost) => sum + cost, 0n)))
  expect(evaluateAchievements(state, false).unlocked).toContain('achievement.skill_points_42')
})

test('Discovery skips only the retired sixth secret on unlock, progression and restart', () => {
  const owner = session()
  const runtime = structuredClone(owner.initialState)
  let state = runtime.gameState
  state.discovery = { ...EMPTY_DISCOVERY }
  state.avocado.overflowPoints = 1n
  state.secretProgress = { completed: false, step: 5 }
  const unlocked = purchaseDiscovery(state, 'unlock')!
  expect(unlocked.secretProgress).toEqual({ completed: false, step: 6 })
  expect(unlocked.skills.points).toBe(state.skills.points)
  state = { ...unlocked, secretProgress: { completed: false, step: 4 } }
  const fifth = completeCanonicalAvocadoMeditationStep(state, 4)
  expect(fifth.nextRequiredStepIndex).toBe(6)
  expect(fifth.skillPointsGranted).toBe(0n)
  const seventh = completeCanonicalAvocadoMeditationStep(fifth.state, 6)
  expect(seventh.skillPointsGranted).toBe(4n)
  expect(completeCanonicalAvocadoMeditationStep(seventh.state, 6).accepted).toBe(false)
  const locked = { ...state, discovery: { ...EMPTY_DISCOVERY } }
  expect(completeCanonicalAvocadoMeditationStep(locked, 4).nextRequiredStepIndex).toBe(5)
  runtime.gameState = { ...unlocked, secretProgress: { completed: false, step: 5 } }
  const restarted = new CanonicalRuntimeSession(owner.prepare(runtime), { entitlements: { permanentDoubleIp: false } })
  expect(restarted.initialState.gameState.secretProgress.step).toBe(6)
  runtime.gameState.secretProgress.step = 2
  const earlier = new CanonicalRuntimeSession(owner.prepare(runtime), { entitlements: { permanentDoubleIp: false } })
  expect(earlier.initialState.gameState.secretProgress.step).toBe(2)
})
