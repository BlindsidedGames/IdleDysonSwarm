import { getGameAssetsByKind } from '../game-data/catalog'
import { RESEARCH_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { galvanizeCanonicalSkill } from './canonicalSkillTransactions'
import { validateInfinityChallenges } from './infinityChallenges'
import { previewCanonicalResearchPurchase, purchaseCanonicalResearch, runResearchAutomationTick } from './researchAutomation'
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

describe('Trial and Error', () => {
  function trial() {
    const before = unlocked()
    const result = restartInfinityChallenge({ ...before,
      infinity: { ...before.infinity, permanentSkillPoints: 10n },
      skills: { ...before.skills, activeAutoAssignment: ['startHereTree'] },
      research: { ...before.research, levelsById: { 'research.panel_lifetime_1': 1 } },
      quantum: { ...before.quantum, unlocks: { ...before.quantum.unlocks, breakTheLoop: true } },
    }, 'enter', 0n, 'trial-and-error')
    if (!result.ok) throw new Error(result.code)
    return result.state
  }
  test('starts clean, keeps skills available, and requires the ordinary Infinity boundary', () => {
    const state = trial()
    expect(state.challenges?.trialAndErrorCompleted ?? false).toBe(false)
    expect(state.research.levelsById).toEqual({})
    expect(state.skills.byId.startHereTree?.owned).toBe(true)
    expect(isBreakInfinityEnabled(state)).toBe(false)
    expect(restartInfinityChallenge(state, 'enter', 0n)).toMatchObject({ ok: false })
    expect(applyCanonicalInfinityReset(state, request)).toMatchObject({ ok: false })
    expect(applyCanonicalInfinityReset({ ...state, dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(0n) } }, { ...request, breakInfinity: true })).toMatchObject({ ok: false })
    const restored = hydrateGameState(dehydrateGameState(hydrate(), state)).state
    expect(restored.challenges?.active).toBe('trial-and-error')
    const abandoned = restartInfinityChallenge(restored, 'abandon', 0n)
    expect(abandoned.ok && abandoned.state.challenges).toMatchObject({ active: null, galvanizers: 0n })
  })
  test('awards once, persists through Overflow, and unlocks Galvanization independently', () => {
    const state = trial()
    const win = applyCanonicalInfinityReset({ ...state, dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(0n) } }, request)
    if (!win.ok) throw new Error('completion failed')
    expect(win.state.challenges).toMatchObject({ active: null, trialAndErrorCompleted: true, blankSlateCompleted: false, galvanizers: 1n })
    const galvanized = galvanizeCanonicalSkill(win.state, 'startHereTree')
    expect(galvanized.accepted).toBe(true)
    if (galvanized.accepted) expect(validateInfinityChallenges(galvanized.state.challenges)).toBeNull()
    const replay = restartInfinityChallenge(win.state, 'enter', 0n, 'trial-and-error')
    if (!replay.ok) throw new Error(replay.code)
    const again = applyCanonicalInfinityReset({ ...replay.state, dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(0n) } }, request)
    expect(again.ok && again.state.challenges?.galvanizers).toBe(1n)
    const overflow = applyCanonicalOverflowReset({ ...win.state, dyson: { ...win.state.dyson, bots: 4e242 } })
    expect(overflow.ok && overflow.state.challenges?.trialAndErrorCompleted).toBe(true)
  })
  test('blocks every research purchase and automation without changing preferences', () => {
    const initial = trial()
    const state = { ...initial, dyson: { ...initial.dyson, science: 1e30 },
      infinity: { ...initial.infinity, automationUnlocked: { ...initial.infinity.automationUnlocked, research: true } } }
    const tuning = hydrate().compatibilityTuning
    for (const asset of getGameAssetsByKind(RESEARCH_DEFINITION_ASSET_KIND)) {
      expect(previewCanonicalResearchPurchase(state, tuning, asset.id)).toMatchObject({ eligible: false, code: 'challenge-active' })
      expect(purchaseCanonicalResearch(state, tuning, asset.id)).toMatchObject({ accepted: false, state })
    }
    expect(runResearchAutomationTick(state, tuning)).toMatchObject({ state, purchases: [] })
    const abandoned = restartInfinityChallenge(state, 'abandon', 0n)
    if (!abandoned.ok) throw new Error(abandoned.code)
    expect(abandoned.state.research.automation).toEqual(state.research.automation)
    const normal = { ...abandoned.state, dyson: { ...abandoned.state.dyson, science: 1e30 } }
    expect(purchaseCanonicalResearch(normal, tuning, 'research.panel_lifetime_1').accepted).toBe(true)
  })
})

test.each(['blank-slate', 'trial-and-error'] as const)('%s retains its best completion time through replays and saving', challengeId => {
  let state = unlocked() as ReturnType<typeof enter>
  for (const seconds of [75, 90, 62.5]) {
    const started = restartInfinityChallenge(state, 'enter', 0n, challengeId)
    if (!started.ok) throw new Error(started.code)
    const reset = applyCanonicalInfinityReset({ ...started.state,
      infinity: { ...started.state.infinity, lastCycleDurationSeconds: seconds },
      dyson: { ...started.state.dyson, bots: ordinaryInfinityBotThreshold(0n) },
    }, request)
    if (!reset.ok) throw new Error('completion failed')
    state = reset.state
    expect(state.challenges?.completionSeconds?.[challengeId]).toBe(Math.min(75, seconds))
    expect(state.challenges?.galvanizers).toBe(1n)
  }
  const loaded = hydrateGameState(dehydrateGameState(hydrate(), state)).state
  expect(loaded.challenges?.completionSeconds?.[challengeId]).toBe(62.5)
  expect(validateInfinityChallenges({ ...state.challenges, completionSeconds: { [challengeId]: -1 } })).not.toBeNull()
  expect(validateInfinityChallenges({ ...state.challenges, completionSeconds: { [challengeId]: NaN } })).not.toBeNull()
})
