import { defineMessages } from 'react-intl'

export const discoverySkillNames = defineMessages({
  startHereTree: { id: 'discovery.skill.startHereTree.name', defaultMessage: 'Cash & Discovery' },
  doubleScienceTree: { id: 'discovery.skill.doubleScienceTree.name', defaultMessage: 'Discovery Speed' },
  producedAsScienceTree: { id: 'discovery.skill.producedAsScienceTree.name', defaultMessage: 'Discovery Boost' },
})
export const discoverySkillEffects = defineMessages({
  'subskill.swarm.economyOfScale': { id: 'discovery.skill.economyOfScale.effect', defaultMessage: 'Multiplies Cash and Bots by M = max(1, log5(total facilities)). Adds min(200%, 10% × log10(M)) Discovery speed. Bonuses are additive.' },
  economicDominance: { id: 'discovery.skill.economicDominance.effect', defaultMessage: 'Multiplies Cash by 20.' },
  economicRevolution: { id: 'discovery.skill.economicRevolution.effect', defaultMessage: 'Multiplies Cash by 5.' },
  workerBoost: { id: 'discovery.skill.workerBoost.effect', defaultMessage: '+10,000% Cash production.' },
  panelMaintenance: { id: 'discovery.skill.panelMaintenance.effect', defaultMessage: 'Adds 100 seconds to Panel Lifetime.' },
  scientificPlanets: { id: 'discovery.skill.scientificPlanets.effect', defaultMessage: 'Produces log10(total Bots) Planets per second.' },
  pocketProtectors: { id: 'discovery.skill.pocketProtectors.effect', defaultMessage: 'Adds log10(total Bots) to Pocket Dimensions production.' },
  pocketMultiverse: { id: 'discovery.skill.pocketMultiverse.effect', defaultMessage: 'Pocket Protectors instead multiplies Pocket Dimensions production by log10(total Bots).' },
  tasteOfPower: { id: 'discovery.skill.tasteOfPower.effect', defaultMessage: '50% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 25% less Cash unless Fractured.' },
  indulgingInPower: { id: 'discovery.skill.indulgingInPower.effect', defaultMessage: '100% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 15% less Cash unless Fractured. Cash penalties are additive.' },
  addictionToPower: { id: 'discovery.skill.addictionToPower.effect', defaultMessage: '200% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 10% less Cash unless Fractured. Cash penalties are additive.' },
  stellarObliteration: { id: 'discovery.skill.stellarObliteration.effect', defaultMessage: 'Stellar Sacrifices Galaxies are 1,000× better. Divides Cash by Stellar Galaxies unless Fractured.' },
  startHereTree: { id: 'discovery.skill.startHereTree.effect', defaultMessage: '+20% Cash and +20% Discovery speed. Bonuses are additive.' },
  doubleScienceTree: { id: 'discovery.skill.doubleScienceTree.effect', defaultMessage: '+25% Discovery speed. Bonuses are additive.' },
  producedAsScienceTree: { id: 'discovery.skill.producedAsScienceTree.effect', defaultMessage: '+100% Discovery speed. Bonuses are additive.' },
  coldFusion: { id: 'discovery.skill.coldFusion.effect', defaultMessage: '+75% Discovery speed; halves Cash unless Fractured. Bonuses are additive.' },
  scientificRevolution: { id: 'discovery.skill.scientificRevolution.effect', defaultMessage: '+50% Discovery speed. Bonuses are additive.' },
  scientificDominance: { id: 'discovery.skill.scientificDominance.effect', defaultMessage: '+100% Discovery speed; quarters Cash unless Fractured. Bonuses are additive.' },
  paragon: { id: 'discovery.skill.paragon.effect', defaultMessage: '+150% Discovery speed. Bonuses are additive.' },
  superchargedPower: { id: 'discovery.skill.superchargedPower.effect', defaultMessage: '+50% Cash and facility production; +25% Discovery speed. Bonuses are additive.' },
  powerUnderwhelming: { id: 'discovery.skill.powerUnderwhelming.effect', defaultMessage: '+25% Discovery speed. Bonuses are additive.' },
  repeatableResearch: { id: 'discovery.skill.repeatableResearch.effect', defaultMessage: '+50% Discovery speed. Bonuses are additive.' },
  purityOfMind: { id: 'discovery.skill.purityOfMind.effect', defaultMessage: '+50% Cash and +5% Discovery speed per unspent SP. Discovery speed is capped at +200%. Bonuses are additive.' },
  purityOfSEssence: { id: 'discovery.skill.purityOfSEssence.effect', defaultMessage: 'Cash, Bots and facility production ×(1 + 0.42p + 0.13784p(p − 1)), where p is unspent SP. +2% Discovery speed per unspent SP, up to +100%. Bonuses are additive.' },
  idleSpaceFlight: { id: 'discovery.skill.idleSpaceFlight.effect', defaultMessage: '+10 × log10(1 + active panels / 100,000,000)% Discovery speed, up to +200%. Bonuses are additive.' },
  superRadiantScattering: { id: 'discovery.skill.superRadiantScattering.effect', defaultMessage: 'Increases Cash, Bots and all facility production as SRS charges. +10 × log10(1 + charge seconds / 100)% Discovery speed, up to +200% before Focused Beam. Bonuses are additive.' },
  shouldersOfGiants: { id: 'discovery.skill.shouldersOfGiants.effect', defaultMessage: '+10 × log10(1 + Scientific Planets production)% Discovery speed, up to +200%. Includes Shoulders of the Fallen. Bonuses are additive.' },
  whatCouldHaveBeen: { id: 'discovery.skill.whatCouldHaveBeen.effect', defaultMessage: '+10 × log10(1 + Pocket Dimensions production)% Discovery speed, up to +200%. Shoulder Surgery includes Shoulders of the Fallen. Bonuses are additive.' },
  shouldersOfTheRevolution: { id: 'discovery.skill.shouldersOfTheRevolution.effect', defaultMessage: '+1% Cash per completed Discovery. Bonuses are additive.' },
  shouldersOfTheEnlightened: { id: 'discovery.skill.shouldersOfTheEnlightened.effect', defaultMessage: '+10% Cash per completed Discovery while Scientific Planets is assigned. Bonuses are additive.' },
  shouldersOfTheFallen: { id: 'discovery.skill.shouldersOfTheFallen.effect', defaultMessage: 'Adds log2(1 + completed discoveries) Planets per second while Scientific Planets is assigned.' },
  regulatedAcademia: { id: 'discovery.skill.regulatedAcademia.effect', defaultMessage: 'Enhances Discovery’s production bonus by 20%, plus 10% per Fragment after the first. Bonuses are additive.' },
  shouldersOfPrecursors: { id: 'discovery.skill.shouldersOfPrecursors.effect', defaultMessage: 'Replaces Cash multipliers with total Discovery speed. When Fractured, multiplies alongside them.' },
  'subskill.cashScience.production': { id: 'discovery.skill.cashScienceProduction.effect', defaultMessage: 'Doubles Cash production and adds +25% Discovery speed. Bonuses are additive.' },
  'subskill.srs.researchActivity': { id: 'discovery.skill.researchActivity.effect', defaultMessage: '+150% SRS charging speed while assigned, enhanced by Stellar Memory. Bonuses are additive.' },
  'subskill.srs.researchConversion': { id: 'discovery.skill.researchConversion.effect', defaultMessage: '+100% SRS charging speed, enhanced by Stellar Memory. Bonuses are additive.' },
  'subskill.srs.focusedBeam': { id: 'discovery.skill.focusedBeam.effect', defaultMessage: 'Enhances SRS’s Cash bonus and Discovery-speed bonus by 50%, scaled by Stellar Memory.' },
})

export const discoverySkillFlavour = defineMessages({
  doubleScienceTree: { id: 'discovery.skill.doubleScienceTree.flavour', defaultMessage: 'Breakthroughs in CPU manufacturing. Now with fewer unexplained smoke clouds.' },
  coldFusion: { id: 'discovery.skill.coldFusion.flavour', defaultMessage: 'Theoretical made fact. Cold fusion, solved. What else did the universe forget to hide?' },
  pocketProtectors: { id: 'discovery.skill.pocketProtectors.flavour', defaultMessage: 'Everyone wants in on this. Pocket protection is now mandatory.' },
  powerUnderwhelming: { id: 'discovery.skill.powerUnderwhelming.flavour', defaultMessage: 'Use Discovery to discover Discovery. How? We will never know.' },
  producedAsScienceTree: { id: 'discovery.skill.producedAsScienceTree.flavour', defaultMessage: 'Improved networking protocols. The breakthroughs now arrive before the meeting invitations.' },
  purityOfMind: { id: 'discovery.skill.purityOfMind.flavour', defaultMessage: 'With singular focus you clear your mind of all thoughts that do not include Cash or Discovery.' },
  regulatedAcademia: { id: 'discovery.skill.regulatedAcademia.flavour', defaultMessage: 'You find a fragment of another universe. Its knowledge strengthens your discoveries. What else might this universe hold?' },
  scientificPlanets: { id: 'discovery.skill.scientificPlanets.flavour', defaultMessage: 'Teach your Bots to discover planets. Ask them nicely not to misplace any.' },
  shouldersOfTheFallen: { id: 'discovery.skill.shouldersOfTheFallen.flavour', defaultMessage: 'A relic of a lost civilization. Excellent shoulders. Terrible instruction manual.' },
})

/** Only effects whose Fractured wording differs in the Discovery phase. */
export const discoveryFracturedEffects = defineMessages({
  coldFusion: { id: 'discovery.fractured.coldFusion', defaultMessage: '+75% Discovery speed. Bonuses are additive.' },
  scientificDominance: { id: 'discovery.fractured.scientificDominance', defaultMessage: '+100% Discovery speed. Bonuses are additive.' },
  tasteOfPower: { id: 'discovery.fractured.tasteOfPower', defaultMessage: '50% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.' },
  indulgingInPower: { id: 'discovery.fractured.indulgingInPower', defaultMessage: '100% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.' },
  addictionToPower: { id: 'discovery.fractured.addictionToPower', defaultMessage: '200% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.' },
  stellarObliteration: { id: 'discovery.fractured.stellarObliteration', defaultMessage: 'Stellar Sacrifices Galaxies are 1,000× better.' },
  shouldersOfPrecursors: { id: 'discovery.fractured.shouldersOfPrecursors', defaultMessage: 'Multiplies Cash by total Discovery speed alongside other Cash multipliers.' },
})
