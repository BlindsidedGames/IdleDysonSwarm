import { defineMessages } from 'react-intl'

export const basicFacilityMessages = defineMessages({
  heading: {
    id: 'dyson.facilities.heading',
    defaultMessage: 'Facilities',
    description:
      'Screen-reader heading for the early Dyson basic-facility region.',
  },
  assemblyLinesName: {
    id: 'dyson.facilities.assembly-lines.name',
    defaultMessage: 'Assembly Lines',
    description:
      'Visible localized name for the Assembly Lines facility.',
  },
  aiManagersName: {
    id: 'dyson.facilities.ai-managers.name',
    defaultMessage: 'AI Managers',
    description:
      'Visible localized name for the AI Managers facility.',
  },
  serversName: {
    id: 'dyson.facilities.servers.name',
    defaultMessage: 'Servers',
    description:
      'Visible localized name for the Servers facility.',
  },
  dataCentersName: {
    id: 'dyson.facilities.data-centers.name',
    defaultMessage: 'Data Centers',
    description:
      'Visible localized name for the Data Centers facility.',
  },
  planetsName: {
    id: 'dyson.facilities.planets.name',
    defaultMessage: 'Planets',
    description:
      'Visible localized name for the Planets facility.',
  },
  matrioshkaBrainsName: {
    id: 'dyson.facilities.matrioshka-brains.name',
    defaultMessage: 'Matrioshka Brains',
    description:
      'Localized upstream-source name for Matrioshka Brains.',
  },
  birchPlanetsName: {
    id: 'dyson.facilities.birch-planets.name',
    defaultMessage: 'Birch Planets',
    description:
      'Localized upstream-source name for Birch Planets.',
  },
  galacticBrainsName: {
    id: 'dyson.facilities.galactic-brains.name',
    defaultMessage: 'Galactic Brains',
    description:
      'Localized upstream-source name for Galactic Brains.',
  },
  unknownFacility: {
    id: 'dyson.facilities.unknown.name',
    defaultMessage: 'Unknown facility',
    description:
      'Safe fallback when an unrecognized canonical upstream source is projected.',
  },
  assemblyLinesDescription: {
    id: 'dyson.facilities.assembly-lines.description',
    defaultMessage:
      "Build assembly lines that create bots for you, that way you don't have to work so hard!",
    description: 'Exact Unity Assembly Lines panel description.',
  },
  aiManagersDescription: {
    id: 'dyson.facilities.ai-managers.description',
    defaultMessage:
      'Purchase AI Managers which automatically handle Assembly Line Creation!',
    description: 'Exact Unity AI Managers panel description.',
  },
  serversDescription: {
    id: 'dyson.facilities.servers.description',
    defaultMessage:
      'Acquire more server space so you can run more Managers. Totally worth it!',
    description: 'Exact Unity Servers panel description.',
  },
  dataCentersDescription: {
    id: 'dyson.facilities.data-centers.description',
    defaultMessage:
      'More Data Centers mean more Servers, more Servers mean more Bots, Bots are good.',
    description: 'Exact Unity Data Centers panel description.',
  },
  planetsDescription: {
    id: 'dyson.facilities.planets.description',
    defaultMessage:
      'Discover and settle on new Planets and Cover them with Data Centers!',
    description: 'Exact Unity Planets panel description.',
  },
  manualCount: {
    id: 'dyson.facilities.manual-count',
    defaultMessage: '({manual})',
    description:
      'Visible parenthesized manual-owned count beside a facility total.',
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
  details: {
    id: 'dyson.facilities.details',
    defaultMessage: 'Details',
    description: 'Unity facility production-breakdown button.',
  },
  productionProgressAccessible: {
    id: 'dyson.facilities.production-progress-accessible',
    defaultMessage: '{facility} production',
    description:
      'Accessible name for a facility production-cycle progress bar.',
  },
  baseProduction: {
    id: 'dyson.facilities.details.base-production',
    defaultMessage: 'Base',
    description:
      'Label for base per-unit production in the facility details dialog.',
  },
  facilityCount: {
    id: 'dyson.facilities.details.facility-count',
    defaultMessage: '{facility} Count',
    description:
      'Label for the ordered facility-count contribution row.',
  },
  facilityModifier: {
    id: 'dyson.facilities.details.facility-modifier',
    defaultMessage: 'Facility modifier',
    description:
      'Label for the ordered facility-modifier contribution row.',
  },
  outputAdjustments: {
    id: 'dyson.facilities.details.output-adjustments',
    defaultMessage: 'Output adjustments',
    description:
      'Label for the ordered final output-adjustment contribution row.',
  },
  automaticManualTupleAccessible: {
    id: 'dyson.facilities.details.automatic-manual-tuple',
    defaultMessage:
      'Automatic {automatic}, manually purchased {manual}',
    description:
      'Accessible expansion of the automatic/manual facility-count tuple.',
  },
  conditionIdentifier: {
    id: 'dyson.facilities.details.condition-identifier',
    defaultMessage: 'Condition identifier: {identifier}',
    description:
      'Technical fallback for a canonical condition without localized display text.',
  },
  condition: {
    id: 'dyson.facilities.details.condition',
    defaultMessage: 'Condition: {condition}',
    description:
      'Localized condition text supported by detached presentation fixtures.',
  },
  upstreamSources: {
    id: 'dyson.facilities.details.upstream-sources',
    defaultMessage: 'Upstream Sources',
    description: 'Heading for canonical upstream facility sources.',
  },
  producedBy: {
    id: 'dyson.facilities.details.produced-by',
    defaultMessage: 'Produced by {facility} ({rate})',
    description:
      'Canonical upstream facility and its per-second contribution.',
  },
  effect: {
    id: 'dyson.facilities.details.legend.effect',
    defaultMessage: 'Effect',
    description: 'Effect legend label in facility details.',
  },
  value: {
    id: 'dyson.facilities.details.legend.value',
    defaultMessage: 'Value',
    description: 'Value legend label in facility details.',
  },
  delta: {
    id: 'dyson.facilities.details.legend.delta',
    defaultMessage: '+Delta/-Delta',
    description: 'Delta legend label in facility details.',
  },
  total: {
    id: 'dyson.facilities.details.legend.total',
    defaultMessage: 'Total',
    description: 'Total legend label in facility details.',
  },
  effectLegendAccessible: {
    id: 'dyson.facilities.details.legend.accessible',
    defaultMessage: 'Effect, Value, positive or negative Delta, Total',
    description:
      'Screen-reader text for the color-coded facility effect legend.',
  },
  closeDetails: {
    id: 'dyson.facilities.close-details',
    defaultMessage: 'Close',
    description: 'Closes the facility details panel.',
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
