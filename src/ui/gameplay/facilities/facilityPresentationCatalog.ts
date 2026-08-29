import type { MessageDescriptor } from 'react-intl'
import type { CanonicalFacilityId } from '../../../game-state/types'
import { basicFacilityMessages as messages } from './messages'

export interface FacilityPresentationMessages {
  readonly name: MessageDescriptor
  readonly identity: MessageDescriptor
  readonly description: MessageDescriptor
  readonly purchasePrompt: MessageDescriptor
  readonly purchaseAccessible: MessageDescriptor
  readonly productionPerSecond: MessageDescriptor
  readonly productionSeconds: MessageDescriptor
  readonly productionMinutes: MessageDescriptor
}

/** Presentation-only differences for the shared eight-facility UI. */
export const facilityPresentation: Readonly<
  Record<CanonicalFacilityId, FacilityPresentationMessages>
> = {
  assembly_lines: {
    name: messages.assemblyLinesName,
    identity: messages.assemblyLinesIdentity,
    description: messages.assemblyLinesDescription,
    purchasePrompt: messages.purchaseAssemblyLine,
    purchaseAccessible: messages.purchaseAssemblyLineAccessible,
    productionPerSecond: messages.assemblyLinesProductionPerSecond,
    productionSeconds: messages.assemblyLinesProductionSeconds,
    productionMinutes: messages.assemblyLinesProductionMinutes,
  },
  ai_managers: {
    name: messages.aiManagersName,
    identity: messages.aiManagersIdentity,
    description: messages.aiManagersDescription,
    purchasePrompt: messages.purchaseAiManager,
    purchaseAccessible: messages.purchaseAiManagerAccessible,
    productionPerSecond: messages.aiManagersProductionPerSecond,
    productionSeconds: messages.aiManagersProductionSeconds,
    productionMinutes: messages.aiManagersProductionMinutes,
  },
  servers: {
    name: messages.serversName,
    identity: messages.serversIdentity,
    description: messages.serversDescription,
    purchasePrompt: messages.purchaseServer,
    purchaseAccessible: messages.purchaseServerAccessible,
    productionPerSecond: messages.serversProductionPerSecond,
    productionSeconds: messages.serversProductionSeconds,
    productionMinutes: messages.serversProductionMinutes,
  },
  data_centers: {
    name: messages.dataCentersName,
    identity: messages.dataCentersIdentity,
    description: messages.dataCentersDescription,
    purchasePrompt: messages.purchaseDataCenter,
    purchaseAccessible: messages.purchaseDataCenterAccessible,
    productionPerSecond: messages.dataCentersProductionPerSecond,
    productionSeconds: messages.dataCentersProductionSeconds,
    productionMinutes: messages.dataCentersProductionMinutes,
  },
  planets: {
    name: messages.planetsName,
    identity: messages.planetsIdentity,
    description: messages.planetsDescription,
    purchasePrompt: messages.purchasePlanet,
    purchaseAccessible: messages.purchasePlanetAccessible,
    productionPerSecond: messages.planetsProductionPerSecond,
    productionSeconds: messages.planetsProductionSeconds,
    productionMinutes: messages.planetsProductionMinutes,
  },
  matrioshka_brains: {
    name: messages.matrioshkaBrainsName,
    identity: messages.matrioshkaBrainsIdentity,
    description: messages.matrioshkaBrainsDescription,
    purchasePrompt: messages.constructMatrioshkaBrain,
    purchaseAccessible: messages.constructMegaStructureAccessible,
    productionPerSecond: messages.matrioshkaBrainsProductionPerSecond,
    productionSeconds: messages.matrioshkaBrainsProductionSeconds,
    productionMinutes: messages.matrioshkaBrainsProductionMinutes,
  },
  birch_planets: {
    name: messages.birchPlanetsName,
    identity: messages.birchPlanetsIdentity,
    description: messages.birchPlanetsDescription,
    purchasePrompt: messages.constructBirchPlanet,
    purchaseAccessible: messages.constructMegaStructureAccessible,
    productionPerSecond: messages.birchPlanetsProductionPerSecond,
    productionSeconds: messages.birchPlanetsProductionSeconds,
    productionMinutes: messages.birchPlanetsProductionMinutes,
  },
  galactic_brains: {
    name: messages.galacticBrainsName,
    identity: messages.galacticBrainsIdentity,
    description: messages.galacticBrainsDescription,
    purchasePrompt: messages.constructGalacticBrain,
    purchaseAccessible: messages.constructMegaStructureAccessible,
    productionPerSecond: messages.galacticBrainsProductionPerSecond,
    productionSeconds: messages.galacticBrainsProductionSeconds,
    productionMinutes: messages.galacticBrainsProductionMinutes,
  },
}
