import { defineMessages } from 'react-intl'

// Runtime descriptions for the benefit-led Stellar model. Compatibility capsules remain intact.
const messages = defineMessages({
  sacrifices: {
    id: 'skills.stellar.sacrifices.technical',
    defaultMessage: 'Consume Bots to create your highest owned facility, including megastructures: max(0, log10(Stellar Galaxies))² per second, multiplied by owned Stellar benefits, Discovery and Stellar Swarm. No output at one Stellar Galaxy or below. Base Bot cost equals Stars Surrounded per second, with a minimum of one.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  improvements: {
    id: 'skills.stellar.improvements.technical',
    defaultMessage: '2× Stellar output. Divide Bots required for Stellar Sacrifices by 1,000.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  dominance: {
    id: 'skills.stellar.dominance.technical',
    defaultMessage: '1,000× Stellar output. 10× Panel Lifetime while your Bots meet the coverage-based requirement calculated before this lifetime bonus. Cash is divided by 100 while active; ordinary coverage-based Bot cost is multiplied by 100.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  obliteration: {
    id: 'skills.stellar.obliteration.technical',
    defaultMessage: '1,000× Stellar output, 1,000× effective Stellar Galaxies and 1,000× Bot cost. Divide Cash and Science by effective Stellar Galaxies, with a minimum divisor of one.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  discoveryObliteration: {
    id: 'skills.stellar.obliteration.discoveryTechnical',
    defaultMessage: '1,000× Stellar output, 1,000× effective Stellar Galaxies and 1,000× Bot cost. Divide Cash by effective Stellar Galaxies, with a minimum divisor of one.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  supernova: {
    id: 'skills.stellar.supernova.technical',
    defaultMessage: '1,000× Stellar output, another 1,000× effective Stellar Galaxies and another 1,000× Bot cost. Suppress all facility bonuses from purchases, including the purchase scaling used by Stellar Swarm. Refunding restores them.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  fracturedSacrifices: {
    id: 'skills.stellar.fracturedSacrifices',
    defaultMessage: 'Create your highest owned facility, including megastructures, without consuming Bots: max(0, log10(Stellar Galaxies))² per second, multiplied by owned Stellar benefits, Discovery and Stellar Swarm. No output at one Stellar Galaxy or below.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  fracturedImprovements: {
    id: 'skills.stellar.fracturedImprovements',
    defaultMessage: '2× Stellar output and 1,000× lower Bot costs, permanently without assigned Skill Points.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  fracturedDominance: {
    id: 'skills.stellar.fracturedDominance',
    defaultMessage: '1,000× Stellar output. 10× Panel Lifetime while the normal pre-bonus Bot requirement is met. Removes this skill’s extra Bot-cost factor and Cash penalty.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  fracturedObliteration: {
    id: 'skills.stellar.fracturedObliteration',
    defaultMessage: '1,000× Stellar output and 1,000× effective Stellar Galaxies. Removes this skill’s extra Bot cost and Cash/Science penalty.',
    description: 'Web-owned Stellar skill mechanics.',
  },
  fracturedDiscoveryObliteration: {
    id: 'skills.stellar.fracturedObliteration.discoveryTechnical',
    defaultMessage: '1,000× Stellar output and 1,000× effective Stellar Galaxies. Removes this skill’s extra Bot cost and Cash penalty.',
    description: 'Fractured Obliteration mechanics after Discovery replaces Science.',
  },
  outputBonuses: {
    id: 'skills.stellar.outputBonuses',
    defaultMessage: 'Stellar output bonuses',
    description: 'Facility calculation row for combined Stellar output multipliers.',
  },
  outputBonusesDescription: {
    id: 'skills.stellar.outputBonusesDescription',
    defaultMessage: 'Combined output multipliers from Stellar Improvements, Stellar Dominance, Stellar Obliteration and Supernova.',
    description: 'Explains the combined Stellar output multipliers.',
  },
  fracturedSupernova: {
    id: 'skills.stellar.fracturedSupernova',
    defaultMessage: '1,000× Stellar output and another 1,000× effective Stellar Galaxies. Removes this skill’s extra Bot cost and restores purchase bonuses, including Stellar Swarm scaling.',
    description: 'Web-owned Stellar skill mechanics.',
  },
})

export const stellarTechnicalMessages = {
  stellarSacrifices: messages.sacrifices,
  stellarImprovements: messages.improvements,
  stellarDominance: messages.dominance,
  stellarObliteration: messages.obliteration,
  supernova: messages.supernova,
} as const

export const stellarDiscoveryObliterationMessage = messages.discoveryObliteration

export const stellarFracturedMessages = {
  stellarSacrifices: messages.fracturedSacrifices,
  stellarImprovements: messages.fracturedImprovements,
  stellarDominance: messages.fracturedDominance,
  stellarObliteration: messages.fracturedObliteration,
  supernova: messages.fracturedSupernova,
} as const

export const stellarFracturedDiscoveryObliterationMessage = messages.fracturedDiscoveryObliteration
export const stellarOutputBonusMessages = {
  name: messages.outputBonuses,
  description: messages.outputBonusesDescription,
}
