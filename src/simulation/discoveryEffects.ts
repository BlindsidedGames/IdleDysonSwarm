import { regulatedAcademiaPercentagePoints } from './moneyScienceSkillEffects'
import type { CanonicalGameStateV1 } from '../game-state/types'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import { DISCOVERY_TUNING as T, discoveryGrowingBonus as G, discoveryBaseStrength, discoveryProductionMultiplier, EMPTY_DISCOVERY } from './discovery'
import { avocadoDysonMultiplier } from './dysonPrestigeEffects'
import { hasCashScienceSubskill, hasSrsAugment } from './skillSubskills'
import { stellarMemoryMultiplier } from './srsAugments'
import { resolvePanelArea } from './stellarArithmetic'
import { tryResolvePlanetGenerationDynamicEffect } from './planetGenerationDynamicEffects'
import { tryResolveShouldersAccrualDynamicEffect } from './shouldersTinkerDynamicEffects'

export interface DiscoveryEffects {
  readonly speed: number
  readonly sources: readonly { readonly id: string; readonly bonus: number }[]
  readonly enhancement: number
  readonly strength: number
  readonly multiplier: number
  readonly nextMultiplier: number
  readonly secondsToNext: number
}

/** Shared authority for simulation, previews and the UI. No research state is read. */
export function deriveDiscoveryEffects(state: CanonicalGameStateV1, snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>): DiscoveryEffects {
  const discovery = state.discovery ?? EMPTY_DISCOVERY
  const owned = new Set(Object.entries(state.skills.byId).filter(([, v]) => v.owned).map(([id]) => id))
  const sources: { id: string; bonus: number }[] = []
  const add = (id: string, bonus: number) => { if (bonus > 0) sources.push({ id, bonus }) }
  if (discovery.unlocked) {
    add('discovery.speed', T.speedPerPurchase * Number(discovery.speedUpgrades))
    for (const [id, bonus] of Object.entries(T.skillSpeed)) {
      if (id === 'subskill.cashScience.production' ? hasCashScienceSubskill(state, 'production') : owned.has(id)) add(id, bonus)
    }
    if (owned.has('purityOfMind')) add('purityOfMind', Math.min(2, 0.05 * Number(state.skills.points)))
    if (owned.has('purityOfSEssence')) add('purityOfSEssence', Math.min(1, 0.02 * Number(state.skills.points)))
    if (owned.has('idleSpaceFlight')) add('idleSpaceFlight', G(resolvePanelArea(snapshot.panelsPerSecond, snapshot.panelLifetimeSeconds) / 1e8))
    if (owned.has('superRadiantScattering')) add('superRadiantScattering', G(state.skills.byId.superRadiantScattering.timerSeconds / 100) *
      (hasSrsAugment(state, 'focusedBeam') ? 1 + 0.5 * stellarMemoryMultiplier(state) : 1))
    // Reuse the facility contribution formulas, replacing only the retired level input.
    const scienceBoostLevel = 0
    const scientificPlanetsProduction = tryResolvePlanetGenerationDynamicEffect('effect.scientificPlanets.planets_per_second', {
      discoveryCompletions: discovery.completions,
      ownedSkills: owned, researchers: state.dyson.bots, fragments: state.skills.fragments,
      assemblyLines: state.dyson.facilities.assembly_lines, planets: state.dyson.facilities.planets,
      panelsPerSecond: snapshot.panelsPerSecond, panelLifetimeSeconds: snapshot.panelLifetimeSeconds,
      bots: state.dyson.bots, scienceBoostLevel,
    }) ?? 0
    for (const id of ['shouldersOfGiants', 'whatCouldHaveBeen']) {
      if (owned.has(id)) add(id, G(tryResolveShouldersAccrualDynamicEffect(`effect.${id}.science_boost_per_second`, {
        discoveryCompletions: discovery.completions,
        ownedSkills: owned, scienceBoostLevel, scientificPlanetsProduction,
        pocketDimensionsProduction: snapshot.pocketDimensionsProduction,
      }) ?? 0))
    }
    add('quantum.science-booster', G(Number(state.quantum.scienceBonusLevels)))
    add('avocado', G(avocadoDysonMultiplier(state.avocado) - 1))
    add('secrets.discovery-speed', T.speedSecrets.filter(n => state.infinity.secretsOfTheUniverse >= BigInt(n)).length * 0.05)
  }
  const speed = 1 + sources.reduce((sum, source) => sum + source.bonus, 0)
  const enhancement = discovery.unlocked ?
    (owned.has('regulatedAcademia') ? regulatedAcademiaPercentagePoints(Number(state.skills.fragments)) / 100 : 0) +
    T.strengthSecrets.filter(n => state.infinity.secretsOfTheUniverse >= BigInt(n)).length * 0.02 : 0
  return {
    speed, sources, enhancement, strength: discoveryBaseStrength(discovery),
    multiplier: discoveryProductionMultiplier(discovery, enhancement),
    nextMultiplier: discoveryProductionMultiplier({ ...discovery, completions: discovery.completions + 1n }, enhancement),
    secondsToNext: (T.completionProgress - discovery.progress) / speed,
  }
}
