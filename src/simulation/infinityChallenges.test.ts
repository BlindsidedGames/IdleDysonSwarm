import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { EMPTY_INFINITY_CHALLENGES, isBreakInfinityEnabled } from './infinityChallenges'
import { ordinaryInfinityBotThreshold } from './infinityCycle'

const hydrate = () => hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-06T00:00:00.000Z' }))
const unlocked = () => {
  const state = hydrate().state
  return { ...state, meta: { ...state.meta, firstInfinityComplete: true }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true } }
}
const request = { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n }
function enter() {
  const result = restartInfinityChallenge(unlocked(), 'enter', 0n)
  if (!result.ok) throw new Error(result.code)
  return result.state
}

describe('Blank Slate', () => {
  test('unlocks on a genuine Infinity, not challenge entry or abandonment', () => {
    expect(restartInfinityChallenge(hydrate().state, 'enter', 0n)).toMatchObject({ ok: false })
    const reset = applyCanonicalInfinityReset(hydrate().state, request)
    expect(reset.ok && reset.state.challenges?.unlocked).toBe(true)
  })
  test('entry clears the run and skills without an IP reward or Infinity count', () => {
    const before = unlocked()
    const result = restartInfinityChallenge({ ...before,
      dyson: { ...before.dyson, bots: 100, money: 999, science: 888 },
      skills: { ...before.skills, byId: { banking: { owned: true, level: 1, timerSeconds: 20, secondaryTimerSeconds: 0 } }, activeAutoAssignment: ['biggerBots'] },
      quantum: { ...before.quantum, unlocks: { ...before.quantum.unlocks, breakTheLoop: true } },
    }, 'enter', 0n)
    if (!result.ok) throw new Error(result.code)
    expect(result.state.challenges?.active).toBe('blank-slate')
    expect(result.state.dyson).toMatchObject({ bots: 1, money: 0, science: 0 })
    expect(Object.values(result.state.skills.byId).some(skill => skill.owned)).toBe(false)
    expect(result.state.statistics).toEqual(before.statistics)
    expect(result.state.infinity.points).toBe(before.infinity.points)
    expect(isBreakInfinityEnabled(result.state)).toBe(false)
    expect(result.state.quantum.unlocks.breakTheLoop).toBe(true)
  })
  test('blocks skill purchases, preset automation and resets at the command boundary', () => {
    const state = enter()
    for (const command of [
      { kind: 'skill.purchase', skillId: 'biggerBots' },
      { kind: 'skill.apply-tab-preset-automation', tab: 'bots' },
      { kind: 'skill.reset' },
    ] as const) {
      expect(routeCanonicalGameCommand(state, command)).toMatchObject({ accepted: false, code: 'skill:challenge-active' })
    }
  })
  test('rejects premature or Break Infinity completion without changing the active run', () => {
    const state = enter()
    expect(applyCanonicalInfinityReset(state, request)).toMatchObject({ ok: false, state })
    expect(applyCanonicalInfinityReset({ ...state, dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(0n) } }, { ...request, breakInfinity: true })).toMatchObject({ ok: false })
  })
  test('abandonment returns a fresh normal run with no completion or reward', () => {
    const state = enter()
    const result = restartInfinityChallenge(state, 'abandon', 0n)
    if (!result.ok) throw new Error(result.code)
    expect(result.state.challenges).toMatchObject({ active: null, blankSlateCompleted: false, galvanizers: 0n })
    expect(result.state.statistics).toEqual(state.statistics)
    expect(result.state.dyson.bots).toBe(1)
    expect(restartInfinityChallenge(result.state, 'abandon', 0n)).toMatchObject({ ok: false })
  })
  test('completion awards exactly one galvanizer; replay cannot farm it', () => {
    const state = enter()
    const ready = { ...state, dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(0n) } }
    const result = applyCanonicalInfinityReset(ready, request)
    if (!result.ok) throw new Error('reset failed')
    expect(result.state.challenges).toMatchObject({ active: null, blankSlateCompleted: true, galvanizers: 1n, hasEarnedGalvanizer: true })
    const replay = restartInfinityChallenge(result.state, 'enter', 0n)
    if (!replay.ok) throw new Error(replay.code)
    const second = applyCanonicalInfinityReset({ ...replay.state, dyson: { ...replay.state.dyson, bots: ready.dyson.bots } }, request)
    expect(second.ok && second.state.challenges?.galvanizers).toBe(1n)
    const overflow = applyCanonicalOverflowReset({ ...result.state, dyson: { ...result.state.dyson, bots: 4e242 } })
    expect(overflow.ok && overflow.state.challenges).toEqual(result.state.challenges)
  })
  test('save round trips retain active restrictions and earned currency independently', () => {
    const base = hydrate()
    const state = enter()
    const resumed = hydrateGameState(dehydrateGameState(base, state)).state
    expect(resumed.challenges).toEqual(state.challenges)
    expect(isBreakInfinityEnabled(resumed)).toBe(false)
  })
})
