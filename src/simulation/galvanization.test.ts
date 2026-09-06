import { applyDysonProductionArrivals } from './dysonProductionArrivals'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { galvanizeCanonicalSkill, purchaseCanonicalSkill, refundCanonicalSkill, resetCanonicalSkills, runCanonicalSkillAutoAssignment } from './canonicalSkillTransactions'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { CASH_SCIENCE_SUBSKILLS } from './skillSubskills'
import { previewAddSkillToPreset, previewRemoveSkillFromPreset } from './canonicalSkillPresetTransactions'
import { adjustGalvanizedEffects } from './galvanizedSkillEffects'
import { resolveStellarSacrificesRequiredBots } from './stellarArithmetic'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'

const base = hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared)
const runtime = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }
function state() {
  return { ...base.state,
    meta: { ...base.state.meta, firstInfinityComplete: true },
    challenges: { unlocked: true, active: null, blankSlateCompleted: true, galvanizers: 5n, hasEarnedGalvanizer: true, galvanizedSkillIds: [] as readonly string[] },
    skills: { ...base.state.skills, points: 10n, byId: {}, activeAutoAssignment: [] },
  }
}
function galvanize(source: ReturnType<typeof state>, id: string) {
  const result = galvanizeCanonicalSkill(source, id)
  expect(result.accepted).toBe(true)
  if (!result.accepted) throw new Error(result.reason)
  return result.state
}

describe('permanent galvanized ownership', () => {
  test('spends once for an unowned revealed base without buying ancestors', () => {
    const next = galvanize(state(), 'scientificPlanets')
    expect(next.challenges?.galvanizers).toBe(4n)
    expect(next.skills.points).toBe(10n)
    expect(next.skills.byId.scientificPlanets.owned).toBe(true)
    expect(next.skills.byId.startHereTree?.owned).not.toBe(true)
    expect(galvanizeCanonicalSkill(next, 'scientificPlanets').accepted).toBe(false)
    expect(refundCanonicalSkill(next, 'scientificPlanets').accepted).toBe(false)
  })
  test('returns points invested in the base, but preserves its existing runtime', () => {
    const source = state()
    const next = galvanize({ ...source, skills: { ...source.skills, byId: { androids: { ...runtime, timerSeconds: 37 } } } }, 'androids')
    expect(next.skills.points).toBe(12n)
    expect(next.skills.byId.androids.timerSeconds).toBe(37)
  })
  test('requires the first challenge win, balance, and the normal reveal gate', () => {
    const source = state()
    expect(galvanizeCanonicalSkill({ ...source, challenges: { ...source.challenges, blankSlateCompleted: false } }, 'startHereTree').accepted).toBe(false)
    expect(galvanizeCanonicalSkill({ ...source, challenges: { ...source.challenges, galvanizers: 0n } }, 'startHereTree').accepted).toBe(false)
    expect(galvanizeCanonicalSkill({ ...source, quantum: { ...source.quantum, unlocks: { ...source.quantum.unlocks, stellar: false } } }, 'supernova').accepted).toBe(false)
  })
  test('survives an Infinity, Quantum reset, and a Blank Slate replay with fresh timers', () => {
    const source = state()
    const next = galvanize({ ...source, skills: { ...source.skills, byId: { androids: { ...runtime, timerSeconds: 500 } } } }, 'androids')
    const results = [applyCanonicalInfinityReset(next, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n }), applyCanonicalQuantumReset(next, 0n), restartInfinityChallenge(next, 'enter', 0n)]
    for (const result of results) {
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.state.skills.byId.androids.owned).toBe(true)
      expect(result.state.skills.byId.androids.timerSeconds).toBe(0)
      expect(validateCanonicalGameState(result.state)).toEqual({ valid: true, errors: [] })
    }
  })
  test('ordinary descendants can be purchased without a permanent base ancestors', () => {
    const next = galvanize(state(), 'scientificPlanets')
    const result = purchaseCanonicalSkill(next, 'hubbleTelescope')
    expect(result.accepted).toBe(true)
    if (!result.accepted) return
    expect(result.state.skills.byId.hubbleTelescope.owned).toBe(true)
    expect(result.state.skills.byId.startHereTree?.owned).not.toBe(true)
  })
  test('refunds an ancestor without refunding its galvanized branch', () => {
    const source = state()
    const next = galvanize({ ...source, skills: { ...source.skills, byId: { startHereTree: runtime } } }, 'scientificPlanets')
    const result = refundCanonicalSkill(next, 'startHereTree')
    expect(result.accepted).toBe(true)
    if (result.accepted) expect(result.state.skills.byId.scientificPlanets.owned).toBe(true)
  })
  test('a galvanized exclusion can coexist with its ordinary counterpart', () => {
    const next = galvanize(state(), 'economicDominance')
    const result = purchaseCanonicalSkill(next, 'scientificDominance')
    expect(result.accepted).toBe(true)
    if (result.accepted) expect(result.state.skills.byId.economicDominance.owned).toBe(true)
  })
  test('all three subskills are independently purchasable and refundable', () => {
    let next = galvanize(state(), 'startHereTree')
    for (const id of Object.values(CASH_SCIENCE_SUBSKILLS)) {
      const result = purchaseCanonicalSkill(next, id)
      expect(result.accepted).toBe(true)
      if (result.accepted) next = result.state
    }
    expect(next.skills.points).toBe(7n)
    const reset = resetCanonicalSkills(next)
    expect(reset.accepted).toBe(true)
    if (!reset.accepted) return
    expect(reset.state.skills.points).toBe(10n)
    expect(reset.state.skills.byId.startHereTree.owned).toBe(true)
    expect(galvanizeCanonicalSkill(next, CASH_SCIENCE_SUBSKILLS.decay).accepted).toBe(false)
  })
  test('preserves permanent ownership, subskills and priority through save/reload', () => {
    const next = galvanize(state(), 'startHereTree')
    const queued = { ...next, skills: { ...next.skills, activeAutoAssignment: [CASH_SCIENCE_SUBSKILLS.production, CASH_SCIENCE_SUBSKILLS.lifetime] } }
    const assigned = runCanonicalSkillAutoAssignment(queued)
    expect(assigned.accepted).toBe(true)
    if (!assigned.accepted) return
    const text = serializeWebSave(dehydrateGameState(base, assigned.state).copyValidatedState())
    const loaded = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(text))).state
    expect(loaded.challenges).toEqual(assigned.state.challenges)
    expect(loaded.skills.activeAutoAssignment).toEqual(queued.skills.activeAutoAssignment)
    expect(loaded.skills.byId[CASH_SCIENCE_SUBSKILLS.production].owned).toBe(true)
  })
  test('preset dependencies stop at permanent bases', () => {
    const next = galvanize(state(), 'scientificPlanets')
    const empty = { ...next, skills: { ...next.skills, presets: next.skills.presets.map(p => ({ ...p, skillIds: [] })) as unknown as typeof next.skills.presets } }
    const added = previewAddSkillToPreset(empty, 1, 'hubbleTelescope')
    expect(added.accepted).toBe(true)
    if (!added.accepted) return
    expect(added.nextSkillIds).not.toContain('startHereTree')
    const removed = previewRemoveSkillFromPreset(next, 1, 'startHereTree')
    expect(removed.accepted).toBe(true)
  })
})

test('galvanized structural effects retain benefits without their cost', () => {
  const source = state()
  const next = { ...source, challenges: { ...source.challenges, galvanizedSkillIds: ['shouldersOfPrecursors', 'stellarSacrifices'] } }
  expect(adjustGalvanizedEffects(next, 'Global.MoneyMultiplier', [{ id: 'effect.shouldersOfPrecursors.money_multiplier', operation: 'override', value: 20, order: 200 }])[0].operation).toBe('multiply')
  expect(resolveStellarSacrificesRequiredBots(new Set(['stellarSacrifices']), 1e20, 10, new Set(['stellarSacrifices']))).toBe(0)
  const result = applyCanonicalSkillIntervalEffects(next, next, { seconds: 10, botProductionPerSecond: 0, stellarBotsPerSecond: 0, stellarPlanetsPerSecond: 3, scienceBoostPerSecond: 0, moneyUpgradePerSecond: 0 })
  expect(result.dyson.facilities.planets[0]).toBe(next.dyson.facilities.planets[0] + 30)
})

function derive(source: ReturnType<typeof galvanize>) {
  const result = deriveBasicDysonState(source, base.compatibilityTuning, { permanentDoubleIp: false }, base.skillEffectEvaluationSnapshot)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.issues[0].detail)
  return result.value
}

test('subskills change actual production and decay credit without recursively multiplying history', () => {
  const source = state()
  const root = galvanize({ ...source, dyson: { ...source.dyson, workers: 1000, researchers: 1000, totalPanelsDecayed: 100 } }, 'startHereTree')
  const ordinary = derive(root)
  const withProduction = { ...root, skills: { ...root.skills, byId: { ...root.skills.byId, [CASH_SCIENCE_SUBSKILLS.production]: runtime } } }
  const production = derive(withProduction)
  expect(production.rates.money).toBe(ordinary.rates.money * 2)
  expect(production.rates.science).toBe(ordinary.rates.science * 2)
  const withLifetime = { ...root, skills: { ...root.skills, byId: { ...root.skills.byId, [CASH_SCIENCE_SUBSKILLS.lifetime]: runtime } } }
  expect(derive(withLifetime).globals.panelLifetimeSeconds).toBe(ordinary.globals.panelLifetimeSeconds + 5)
  const withDecay = { ...root, skills: { ...root.skills, byId: { ...root.skills.byId, [CASH_SCIENCE_SUBSKILLS.decay]: runtime } } }
  const once = applyDysonProductionArrivals(withDecay, ordinary.productionArrivalRates, 1)
  const twice = applyDysonProductionArrivals(once, ordinary.productionArrivalRates, 1)
  expect(twice.dyson.totalPanelsDecayed).toBe(100 + ordinary.rates.panels * 20)
})

test('a galvanized numerical tradeoff keeps its gain and removes its penalty', () => {
  const source = state()
  const plain = derive(source)
  const ordinary = { ...source, skills: { ...source.skills, byId: { economicDominance: runtime } } }
  const regular = derive(ordinary)
  const permanent = derive(galvanize(ordinary, 'economicDominance'))
  expect(permanent.globals.moneyMultiplier).toBe(regular.globals.moneyMultiplier)
  expect(permanent.globals.scienceMultiplier).toBe(plain.globals.scienceMultiplier)
  expect(regular.globals.scienceMultiplier).toBe(plain.globals.scienceMultiplier / 4)
})

test('partial Power galvanization removes only permanent skills penalties', () => {
  const source = state()
  const powers = ['tasteOfPower', 'indulgingInPower', 'addictionToPower']
  const owned = { ...source, skills: { ...source.skills,
    byId: Object.fromEntries(powers.map(id => [id, runtime])),
  } }
  const baseline = derive(source)
  const ordinary = derive(owned)
  const partial = derive({ ...owned, challenges: { ...owned.challenges,
    galvanizedSkillIds: ['indulgingInPower'],
  } })
  const permanent = derive({ ...owned, challenges: { ...owned.challenges,
    galvanizedSkillIds: powers,
  } })
  for (const key of ['moneyMultiplier', 'scienceMultiplier'] as const) {
    expect(ordinary.globals[key]).toBeCloseTo(baseline.globals[key] * 0.5)
    expect(partial.globals[key]).toBeCloseTo(baseline.globals[key] * 0.65)
    expect(permanent.globals[key]).toBeCloseTo(baseline.globals[key])
  }
})

test('Overflow preserves permanent bases even after their Quantum reveal gate resets', () => {
  const source = state()
  const unlocked = { ...source, quantum: { ...source.quantum, unlocks: { ...source.quantum.unlocks, stellar: true } } }
  const permanent = galvanize(unlocked, 'supernova')
  const overflow = applyCanonicalOverflowReset({ ...permanent, dyson: { ...permanent.dyson, bots: 4e242 } })
  expect(overflow.ok).toBe(true)
  if (!overflow.ok) return
  expect(overflow.state.skills.byId.supernova.owned).toBe(true)
  expect(overflow.state.challenges?.galvanizedSkillIds).toContain('supernova')
})
