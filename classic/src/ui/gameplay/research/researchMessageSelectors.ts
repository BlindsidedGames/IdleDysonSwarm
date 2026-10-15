import type { MessageDescriptor } from 'react-intl'
import { researchMessages as messages } from './messages'

export function researchNameMessage(
  researchId: string,
): MessageDescriptor {
  switch (researchId) {
    case 'research.assembly_line_upgrade':
      return messages.assemblyLine
    case 'research.ai_manager_upgrade':
      return messages.aiManager
    case 'research.server_upgrade':
      return messages.server
    case 'research.data_center_upgrade':
      return messages.dataCenter
    case 'research.planet_upgrade':
      return messages.planet
    case 'research.matrioshka_brains_upgrade':
      return messages.matrioshkaBrains
    case 'research.birch_planets_upgrade':
      return messages.birchPlanets
    case 'research.galactic_brains_upgrade':
      return messages.galacticBrains
    case 'research.science_boost':
      return messages.science
    case 'research.money_multiplier':
      return messages.cash
    default:
      return messages.durabilityUpgrade
  }
}

export function researchDescriptionMessage(
  researchId: string,
): MessageDescriptor {
  switch (researchId) {
    case 'research.assembly_line_upgrade':
      return messages.assemblyDescription
    case 'research.ai_manager_upgrade':
      return messages.aiDescription
    case 'research.server_upgrade':
      return messages.serverDescription
    case 'research.data_center_upgrade':
      return messages.dataCenterDescription
    case 'research.planet_upgrade':
    case 'research.matrioshka_brains_upgrade':
    case 'research.birch_planets_upgrade':
    case 'research.galactic_brains_upgrade':
      return messages.machineWorldDescription
    case 'research.panel_lifetime_1':
      return messages.lifetimeOneDescription
    case 'research.science_boost':
      return messages.scienceDescription
    case 'research.money_multiplier':
      return messages.cashDescription
    default:
      return messages.lifetimeLaterDescription
  }
}
