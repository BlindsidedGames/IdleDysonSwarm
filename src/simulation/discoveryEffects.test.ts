import { describe, expect, it } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT as snapshot, DETERMINISTIC_DYSON_TUNING as tuning } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { deriveDiscoveryEffects } from './discoveryEffects'
import { EMPTY_DISCOVERY, DISCOVERY_TUNING, discoveryGrowingBonus } from './discovery'
import { SRS_AUGMENTS } from './skillSubskills'

function fixture(skills: string[] = []) {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: skills })
  state.infinity.secretsOfTheUniverse = 0n
  state.quantum.scienceBonusLevels = 0n
  state.discovery = { ...EMPTY_DISCOVERY, unlocked: true }
  state.research.levelsById = {}
  state.dyson.workers = state.dyson.bots
  state.dyson.researchers = 0
  return state
}
function derive(state: ReturnType<typeof fixture>) {
  const result = deriveBasicDysonState(state, tuning, { permanentDoubleIp: false }, snapshot)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

describe('Discovery effect conversions', () => {
  it.each(Object.entries(DISCOVERY_TUNING.skillSpeed).filter(([id]) => !id.startsWith('subskill.')))('%s adds only its authored speed benefit', (id, bonus) => {
    const state = fixture([id])
    expect(deriveDiscoveryEffects(state, snapshot).speed - deriveDiscoveryEffects(fixture(), snapshot).speed).toBeCloseTo(bonus)
  })
  it('caps Purity bonuses and does not convert negative Science effects', () => {
    const state = fixture(['purityOfMind', 'purityOfSEssence', 'economicDominance', 'tasteOfPower', 'indulgingInPower', 'addictionToPower', 'stellarObliteration'])
    state.skills.points = 1000n
    expect(deriveDiscoveryEffects(state, snapshot).speed - deriveDiscoveryEffects(fixture(), snapshot).speed).toBe(3)
  })
  it('applies live Academia and Secrets above one without modifying lifetime', () => {
    const state = fixture(['regulatedAcademia'])
    state.skills.fragments = 2n
    state.infinity.secretsOfTheUniverse = 3n
    const effects = deriveDiscoveryEffects(state, snapshot)
    expect(effects.enhancement).toBeCloseTo(0.34)
    expect(effects.multiplier).toBeCloseTo(13.06)
    expect(effects.strength).toBe(10)
    state.skills.byId.regulatedAcademia.owned = false
    expect(deriveDiscoveryEffects(state, snapshot).multiplier).toBeCloseTo(10.36)
  })
  it.each([[], ['powerOverwhelming'], ['scientificPlanets', 'pocketDimensions', 'pocketProtectors'], ['shouldersOfPrecursors']])('applies production once after ordinary effects: %j', skills => {
    const state = fixture(skills)
    // Compare two Discovery strengths with identical lifetime. No scientists, research or bonuses change.
    const base = derive(state)
    const enhanced = { ...state, skills: { ...state.skills, byId: { ...state.skills.byId, regulatedAcademia: { ...state.skills.byId.regulatedAcademia, owned: true } } } }
    const after = derive(enhanced)
    const ratio = deriveDiscoveryEffects(enhanced, snapshot).multiplier / deriveDiscoveryEffects(state, snapshot).multiplier
    expect(after.rates.money / base.rates.money).toBeCloseTo(ratio, 8)
    expect(after.rates.bots / base.rates.bots).toBeCloseTo(ratio, 8)
    expect(after.globals.panelLifetimeSeconds).toBe(base.globals.panelLifetimeSeconds)
    expect(after.planetPricingModifier).toEqual(base.planetPricingModifier)
  })
  it('Focused Beam enhances both sides independent of allocation', () => {
    const state = fixture(['superRadiantScattering'])
    state.skills.byId.superRadiantScattering.timerSeconds = 10000
    const base = deriveDiscoveryEffects(state, snapshot)
    state.challenges = { ...state.challenges, galvanizedSkillIds: ['superRadiantScattering'] }
    state.skills.byId[SRS_AUGMENTS.focusedBeam] = { ...state.skills.byId.superRadiantScattering, owned: true }
    const after = deriveDiscoveryEffects(state, snapshot)
    expect(after.speed - base.speed).toBeCloseTo(discoveryGrowingBonus(100) * 0.5)
  })
})
