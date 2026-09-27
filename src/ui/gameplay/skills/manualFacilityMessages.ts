import { defineMessages } from 'react-intl'
import { MANUAL_FACILITY_AUGMENTS } from '../../../simulation/skillSubskills'
import { basicFacilityMessages as facilities } from '../facilities/messages'

export const manualFacilityMessages = defineMessages({
  name: { id: 'skills.manualFacility.name', defaultMessage: 'Hand-built {facility}' },
  effect: { id: 'skills.manualFacility.effect', defaultMessage: 'Tinker also creates 2% of your {facility}, capped at 20 seconds of their incoming facility production. Versatile Production Tactics applies.' },
  brainEffect: { id: 'skills.manualFacility.brain-effect', defaultMessage: 'Tinker also creates 2% of your Galactic Brains, capped at 20 seconds of their production output, or 1 Brain if higher. Versatile Production Tactics applies before the cap.' },
})

export const manualFacilityPresentation = [
  { ...MANUAL_FACILITY_AUGMENTS[0], name: facilities.aiManagersName, icon: 'aiManagerTree.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[1], name: facilities.serversName, icon: 'serverTree.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[2], name: facilities.dataCentersName, icon: 'dataCenterTree.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[3], name: facilities.planetsName, icon: 'planetsTree.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[4], name: facilities.matrioshkaBrainsName, icon: 'quantumComputing.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[5], name: facilities.birchPlanetsName, icon: 'planetAssembly.webp' },
  { ...MANUAL_FACILITY_AUGMENTS[6], name: facilities.galacticBrainsName, icon: 'galacticPradigmShift.webp' },
] as const
