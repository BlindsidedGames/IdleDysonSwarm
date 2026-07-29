import { defineMessages } from 'react-intl'

export const basicFacilityMessages = defineMessages({
  heading: {
    id: 'dyson.facilities.heading',
    defaultMessage: 'Facilities',
    description:
      'Screen-reader heading for the early Dyson basic-facility region.',
  },
  assemblyLinesIdentity: {
    id: 'dyson.facilities.assembly-lines.identity',
    defaultMessage: 'Assembly Lines {total}({manual})',
    description:
      'Compact Unity identity with canonical total and manual Assembly Line counts.',
  },
  aiManagersIdentity: {
    id: 'dyson.facilities.ai-managers.identity',
    defaultMessage: 'AI Managers {total}({manual})',
    description:
      'Compact Unity identity with canonical total and manual AI Manager counts.',
  },
  serversIdentity: {
    id: 'dyson.facilities.servers.identity',
    defaultMessage: 'Servers {total}({manual})',
    description:
      'Compact Unity identity with canonical total and manual Server counts.',
  },
  dataCentersIdentity: {
    id: 'dyson.facilities.data-centers.identity',
    defaultMessage: 'Data Centers {total}({manual})',
    description:
      'Compact Unity identity with canonical total and manual Data Center counts.',
  },
  planetsIdentity: {
    id: 'dyson.facilities.planets.identity',
    defaultMessage: 'Planets {total}({manual})',
    description:
      'Compact Unity identity with canonical total and manual Planet counts.',
  },
  assemblyLinesProductionPerSecond: {
    id: 'dyson.facilities.assembly-lines.production-per-second',
    defaultMessage: 'Producing {rate} Bots /s',
    description:
      'Unity-authored production phrase when Assembly Lines produce at least one Bot per second.',
  },
  assemblyLinesProductionSeconds: {
    id: 'dyson.facilities.assembly-lines.production-seconds',
    defaultMessage: 'Producing 1 Bot /{interval}s',
    description:
      'Unity-authored production phrase when Assembly Lines produce less than one Bot per second.',
  },
  assemblyLinesProductionMinutes: {
    id: 'dyson.facilities.assembly-lines.production-minutes',
    defaultMessage: 'Producing 1 Bot /{interval} Min',
    description:
      'Unity-authored production phrase when Assembly Lines take at least one minute to produce a Bot.',
  },
  aiManagersProductionPerSecond: {
    id: 'dyson.facilities.ai-managers.production-per-second',
    defaultMessage: 'Generating {rate} Assembly Lines /s',
    description:
      'Unity-authored production phrase when AI Managers produce at least one Assembly Line per second.',
  },
  aiManagersProductionSeconds: {
    id: 'dyson.facilities.ai-managers.production-seconds',
    defaultMessage: 'Generating 1 Assembly Line /{interval}s',
    description:
      'Unity-authored production phrase when AI Managers take less than one minute per Assembly Line.',
  },
  aiManagersProductionMinutes: {
    id: 'dyson.facilities.ai-managers.production-minutes',
    defaultMessage: 'Generating 1 Assembly Line /{interval} Min',
    description:
      'Unity-authored production phrase when AI Managers take at least one minute per Assembly Line.',
  },
  serversProductionPerSecond: {
    id: 'dyson.facilities.servers.production-per-second',
    defaultMessage: 'Training {rate} AI Managers /s',
    description:
      'Unity-authored production phrase when Servers produce at least one AI Manager per second.',
  },
  serversProductionSeconds: {
    id: 'dyson.facilities.servers.production-seconds',
    defaultMessage: 'Training 1 AI Manager /{interval}s',
    description:
      'Unity-authored production phrase when Servers take less than one minute per AI Manager.',
  },
  serversProductionMinutes: {
    id: 'dyson.facilities.servers.production-minutes',
    defaultMessage: 'Training 1 AI Manager /{interval} Min',
    description:
      'Unity-authored production phrase when Servers take at least one minute per AI Manager.',
  },
  dataCentersProductionPerSecond: {
    id: 'dyson.facilities.data-centers.production-per-second',
    defaultMessage: 'Deploying {rate} Servers /s',
    description:
      'Unity-authored production phrase when Data Centers produce at least one Server per second.',
  },
  dataCentersProductionSeconds: {
    id: 'dyson.facilities.data-centers.production-seconds',
    defaultMessage: 'Deploying 1 Server /{interval}s',
    description:
      'Unity-authored production phrase when Data Centers take less than one minute per Server.',
  },
  dataCentersProductionMinutes: {
    id: 'dyson.facilities.data-centers.production-minutes',
    defaultMessage: 'Deploying 1 Server /{interval} Min',
    description:
      'Unity-authored production phrase when Data Centers take at least one minute per Server.',
  },
  planetsProductionPerSecond: {
    id: 'dyson.facilities.planets.production-per-second',
    defaultMessage: 'Creating {rate} Data Centers /s',
    description:
      'Unity-authored production phrase when Planets produce at least one Data Center per second.',
  },
  planetsProductionSeconds: {
    id: 'dyson.facilities.planets.production-seconds',
    defaultMessage: 'Creating 1 Data Center /{interval}s',
    description:
      'Unity-authored production phrase when Planets take less than one minute per Data Center.',
  },
  planetsProductionMinutes: {
    id: 'dyson.facilities.planets.production-minutes',
    defaultMessage: 'Creating 1 Data Center /{interval} Min',
    description:
      'Unity-authored production phrase when Planets take at least one minute per Data Center.',
  },
  purchaseAssemblyLine: {
    id: 'dyson.facilities.assembly-lines.purchase',
    defaultMessage: 'Purchase an Assembly Line',
    description: 'Exact Unity purchase prompt for an Assembly Line.',
  },
  purchaseAiManager: {
    id: 'dyson.facilities.ai-managers.purchase',
    defaultMessage: 'Purchase an AI Manager',
    description: 'Exact Unity purchase prompt for an AI Manager.',
  },
  purchaseServer: {
    id: 'dyson.facilities.servers.purchase',
    defaultMessage: 'Purchase a Server',
    description: 'Exact Unity purchase prompt for a Server.',
  },
  purchaseDataCenter: {
    id: 'dyson.facilities.data-centers.purchase',
    defaultMessage: 'Purchase a Data Center',
    description: 'Exact Unity purchase prompt for a Data Center.',
  },
  purchasePlanet: {
    id: 'dyson.facilities.planets.purchase',
    defaultMessage: 'Purchase a Planet',
    description: 'Exact Unity purchase prompt for a Planet.',
  },
  purchaseAssemblyLineAccessible: {
    id: 'dyson.facilities.assembly-lines.purchase-accessible',
    defaultMessage:
      'Purchase an Assembly Line: +{quantity}, ${cost}',
    description:
      'Accessible name for the compact Assembly Line purchase control.',
  },
  purchaseAiManagerAccessible: {
    id: 'dyson.facilities.ai-managers.purchase-accessible',
    defaultMessage: 'Purchase an AI Manager: +{quantity}, ${cost}',
    description:
      'Accessible name for the compact AI Manager purchase control.',
  },
  purchaseServerAccessible: {
    id: 'dyson.facilities.servers.purchase-accessible',
    defaultMessage: 'Purchase a Server: +{quantity}, ${cost}',
    description:
      'Accessible name for the compact Server purchase control.',
  },
  purchaseDataCenterAccessible: {
    id: 'dyson.facilities.data-centers.purchase-accessible',
    defaultMessage: 'Purchase a Data Center: +{quantity}, ${cost}',
    description:
      'Accessible name for the compact Data Center purchase control.',
  },
  purchasePlanetAccessible: {
    id: 'dyson.facilities.planets.purchase-accessible',
    defaultMessage: 'Purchase a Planet: +{quantity}, ${cost}',
    description:
      'Accessible name for the compact Planet purchase control.',
  },
  purchaseQuantity: {
    id: 'dyson.facilities.purchase.quantity',
    defaultMessage: '+{quantity}',
    description:
      'Visible canonical quantity on the compact facility purchase control.',
  },
  purchaseCost: {
    id: 'dyson.facilities.purchase.cost',
    defaultMessage: '${cost}',
    description:
      'Visible canonical cost on the compact facility purchase control.',
  },
  pending: {
    id: 'dyson.facilities.purchase.pending',
    defaultMessage: 'Purchase pending…',
    description:
      'Immediate compact feedback after a facility purchase is dispatched.',
  },
  succeeded: {
    id: 'dyson.facilities.purchase.succeeded',
    defaultMessage: 'Purchase completed.',
    description:
      'Compact confirmation after the coordinator accepts a facility purchase.',
  },
  stale: {
    id: 'dyson.facilities.purchase.stale',
    defaultMessage: 'Values changed. Review and try again.',
    description:
      'Compact safe guidance after a stale facility purchase.',
  },
  rejected: {
    id: 'dyson.facilities.purchase.rejected',
    defaultMessage: 'Purchase not completed.',
    description:
      'Compact generic feedback after a rejected facility purchase.',
  },
  failed: {
    id: 'dyson.facilities.purchase.failed',
    defaultMessage: 'Purchase unavailable.',
    description:
      'Compact generic feedback when the runtime cannot complete a facility purchase.',
  },
  insufficientFunds: {
    id: 'dyson.facilities.purchase.insufficient-funds',
    defaultMessage:
      'Not enough Cash for this purchase. Affordable quantity: {quantity}.',
    description:
      'Screen-reader-only explanation selected from the canonical insufficient-funds preview.',
  },
  locked: {
    id: 'dyson.facilities.purchase.locked',
    defaultMessage: 'This facility is locked.',
    description:
      'Screen-reader-only explanation selected from the canonical locked preview.',
  },
  maximumReached: {
    id: 'dyson.facilities.purchase.maximum-reached',
    defaultMessage: 'The maximum has been reached.',
    description:
      'Screen-reader-only explanation selected from the canonical maximum preview.',
  },
  unavailable: {
    id: 'dyson.facilities.purchase.unavailable',
    defaultMessage: 'Purchase unavailable.',
    description:
      'Screen-reader-only safe fallback for an unavailable facility purchase.',
  },
  teaser: {
    id: 'dyson.facilities.next-tier-teaser',
    defaultMessage: '????',
    description:
      'Generic non-interactive teaser shown after the final visible facility.',
  },
})
