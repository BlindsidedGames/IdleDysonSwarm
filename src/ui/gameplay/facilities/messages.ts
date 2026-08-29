import { defineMessages } from 'react-intl'

export const basicFacilityMessages = defineMessages({
  automaticPurchase: {
    id: 'dyson.facilities.purchase.automatic',
    defaultMessage: 'Auto',
    description: 'Compact facility purchase label while automation is enabled.',
  },
  automaticPurchaseQuantity: {
    id: 'dyson.facilities.purchase.automatic-quantity',
    defaultMessage: 'Auto ({quantity})',
    description:
      'Compact facility purchase label showing the quantity used by automation.',
  },
  automaticPurchaseAccessible: {
    id: 'dyson.facilities.purchase.automatic-accessible',
    defaultMessage:
      '{facility} is purchased automatically in batches of {quantity} for {cost}',
    description:
      'Accessible facility automation label with its configured quantity and cost.',
  },
  heading: {
    id: 'dyson.facilities.heading',
    defaultMessage: 'Facilities',
    description:
      'Screen-reader heading for the early Dyson basic-facility region.',
  },
  megaStructuresHeading: {
    id: 'dyson.facilities.mega-structures.heading',
    defaultMessage: 'Mega-Structures',
    description:
      'Screen-reader heading for the Dyson mega-structure region.',
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
  matrioshkaBrainsIdentity: {
    id: 'dyson.facilities.matrioshka-brains.identity',
    defaultMessage: 'Matrioshka Brains {total}({manual})',
    description:
      'Compact identity with canonical total and manual Matrioshka Brain counts.',
  },
  birchPlanetsIdentity: {
    id: 'dyson.facilities.birch-planets.identity',
    defaultMessage: 'Birch Planets {total}({manual})',
    description:
      'Compact identity with canonical total and manual Birch Planet counts.',
  },
  galacticBrainsIdentity: {
    id: 'dyson.facilities.galactic-brains.identity',
    defaultMessage: 'Galactic Brains {total}({manual})',
    description:
      'Compact identity with canonical total and manual Galactic Brain counts.',
  },
  matrioshkaBrainsDescription: {
    id: 'dyson.facilities.matrioshka-brains.description',
    defaultMessage:
      'Massive stellar computing structures that consume planets to produce more planets.',
    description: 'Exact authored Matrioshka Brains description.',
  },
  birchPlanetsDescription: {
    id: 'dyson.facilities.birch-planets.description',
    defaultMessage:
      'Supermassive planetary shells that consume Matrioshka Brains to produce more Matrioshka Brains.',
    description: 'Exact authored Birch Planets description.',
  },
  galacticBrainsDescription: {
    id: 'dyson.facilities.galactic-brains.description',
    defaultMessage:
      'The ultimate mega-structure requiring both Matrioshka Brains and Birch Planets. Produces Birch Planets.',
    description: 'Exact authored Galactic Brains description.',
  },
  constructMatrioshkaBrain: {
    id: 'dyson.facilities.matrioshka-brains.purchase',
    defaultMessage: 'Construct a Matrioshka Brain',
    description: 'Exact authored Matrioshka Brain purchase prompt.',
  },
  constructBirchPlanet: {
    id: 'dyson.facilities.birch-planets.purchase',
    defaultMessage: 'Construct a Birch Planet',
    description: 'Exact authored Birch Planet purchase prompt.',
  },
  constructGalacticBrain: {
    id: 'dyson.facilities.galactic-brains.purchase',
    defaultMessage: 'Construct a Galactic Brain',
    description: 'Exact authored Galactic Brain purchase prompt.',
  },
  constructMegaStructureAccessible: {
    id: 'dyson.facilities.mega-structure.purchase-accessible',
    defaultMessage: '{prompt}: +{quantity}, ${cost}',
    description:
      'Accessible name for a compact mega-structure purchase control.',
  },
  megaOutput: {
    id: 'dyson.facilities.mega-structure.details.output',
    defaultMessage: 'Produces',
    description: 'Label for the facility produced by a mega-structure.',
  },
  megaOutputDescription: {
    id: 'dyson.facilities.mega-structure.details.output-description',
    defaultMessage: 'Produces {facility}',
    description: 'Output facility produced by a mega-structure.',
  },
  megaProducedCountBy: {
    id: 'dyson.facilities.mega-structure.details.produced-count-by',
    defaultMessage: '{count} produced by {facility}',
    description: 'Automatic mega-structure count and its upstream producer.',
  },
  finalProduction: {
    id: 'dyson.facilities.mega-structure.details.final-production',
    defaultMessage: 'Final production',
    description: 'Label for the final mega-structure production rate.',
  },
  productionRateValue: {
    id: 'dyson.facilities.mega-structure.details.production-rate-value',
    defaultMessage: '{value} /s',
    description:
      'Formatted per-second production value in mega-structure details.',
  },
  unlockCondition: {
    id: 'dyson.facilities.mega-structure.details.unlock-condition',
    defaultMessage: 'Unlock condition',
    description: 'Label for a mega-structure unlock condition.',
  },
  megaUnlockRequirement: {
    id: 'dyson.facilities.mega-structure.details.unlock-requirement',
    defaultMessage:
      'Requires the {structure} Quantum unlock and ownership of {prerequisite}.',
    description:
      'Canonical sequential visibility condition for a mega-structure.',
  },
  matrioshkaBrainsProductionPerSecond: {
    id: 'dyson.facilities.matrioshka-brains.production-per-second',
    defaultMessage: 'Synthesizing {rate} Planets /s',
    description: 'Authored Matrioshka Brain production phrase.',
  },
  matrioshkaBrainsProductionInterval: {
    id: 'dyson.facilities.matrioshka-brains.production-interval',
    defaultMessage: 'Synthesizing 1 Planet /{interval}',
    description:
      'Authored Matrioshka Brain production phrase below one unit per second.',
  },
  birchPlanetsProductionPerSecond: {
    id: 'dyson.facilities.birch-planets.production-per-second',
    defaultMessage: 'Assembling {rate} Matrioshka Brains /s',
    description: 'Authored Birch Planet production phrase.',
  },
  birchPlanetsProductionInterval: {
    id: 'dyson.facilities.birch-planets.production-interval',
    defaultMessage: 'Assembling 1 Matrioshka Brain /{interval}',
    description:
      'Authored Birch Planet production phrase below one unit per second.',
  },
  galacticBrainsProductionPerSecond: {
    id: 'dyson.facilities.galactic-brains.production-per-second',
    defaultMessage: 'Manifesting {rate} Birch Planets /s',
    description: 'Authored Galactic Brain production phrase.',
  },
  galacticBrainsProductionInterval: {
    id: 'dyson.facilities.galactic-brains.production-interval',
    defaultMessage: 'Manifesting 1 Birch Planet /{interval}',
    description:
      'Authored Galactic Brain production phrase below one unit per second.',
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
  currentProduction: {
    id: 'dyson.facilities.details.current-production',
    defaultMessage: 'Current production',
    description: 'Heading for the live facility production summary.',
  },
  perGameSecond: {
    id: 'dyson.facilities.details.per-game-second',
    defaultMessage: '{rate} / game second',
    description: 'Facility output per simulated game second.',
  },
  perRealSecond: {
    id: 'dyson.facilities.details.per-real-second',
    defaultMessage: '{rate} / second',
    description: 'Facility output per real second after game speed.',
  },
  calculationHeading: {
    id: 'dyson.facilities.details.calculation-heading',
    defaultMessage: 'How this is calculated',
    description: 'Heading for the ordered facility production pipeline.',
  },
  baseStage: {
    id: 'dyson.facilities.details.stage.base',
    defaultMessage: 'Base Output',
    description: 'First facility calculation stage.',
  },
  countStage: {
    id: 'dyson.facilities.details.stage.count',
    defaultMessage: 'Working facilities',
    description: 'Facility count calculation stage.',
  },
  powerStage: {
    id: 'dyson.facilities.details.stage.power',
    defaultMessage: 'Facility Power',
    description: 'Research, skill, and prestige modifier stage.',
  },
  productionModifiersStage: {
    id: 'dyson.facilities.details.stage.production-modifiers',
    defaultMessage: 'Production Modifiers',
    description: 'Research, skill, prestige, and purchase modifier stage.',
  },
  researchGroup: {
    id: 'dyson.facilities.details.group.research',
    defaultMessage: 'Research',
    description: 'Facility modifiers provided by the Research tab.',
  },
  skillTreeGroup: {
    id: 'dyson.facilities.details.group.skill-tree',
    defaultMessage: 'Skill Tree',
    description: 'Facility modifiers provided by assigned skills.',
  },
  otherBonusesGroup: {
    id: 'dyson.facilities.details.group.other-bonuses',
    defaultMessage: 'Other Bonuses',
    description: 'Facility modifiers provided by prestige and other systems.',
  },
  purchaseStage: {
    id: 'dyson.facilities.details.stage.purchase',
    defaultMessage: 'Purchase Bonuses',
    description: 'Manual purchase and Terra calculation stage.',
  },
  timeStage: {
    id: 'dyson.facilities.details.stage.time',
    defaultMessage: 'Time',
    description: 'Game speed calculation stage.',
  },
  noActiveEffects: {
    id: 'dyson.facilities.details.no-active-effects',
    defaultMessage: 'No active effects',
    description: 'Shown when a calculation stage has no active modifiers.',
  },
  automaticFacilities: {
    id: 'dyson.facilities.details.automatic-facilities',
    defaultMessage: 'Produced',
    description: 'Automatic facility count label.',
  },
  manuallyPurchased: {
    id: 'dyson.facilities.details.manually-purchased',
    defaultMessage: 'Manually purchased',
    description: 'Manual facility count label.',
  },
  terraTransferDescription: {
    id: 'dyson.facilities.details.terra-transfer-description',
    defaultMessage: 'Adds {count} effective purchased Planets',
    description: 'Explanation of an active Terra facility transfer.',
  },
  sourceTechnicalDetails: {
    id: 'dyson.facilities.details.source-technical-details',
    defaultMessage: 'Formula',
    description: 'Expandable formula label for a non-trivial effect.',
  },
  notAssigned: {
    id: 'dyson.facilities.details.formula.not-assigned',
    defaultMessage: 'Not assigned',
    description: 'Formula dependency that is not currently assigned.',
  },
  requirementMet: {
    id: 'dyson.facilities.details.formula.requirement-met',
    defaultMessage: 'Requirement met',
    description: 'Formula dependency whose prerequisite is active.',
  },
  replacedBy: {
    id: 'dyson.facilities.details.formula.replaced-by',
    defaultMessage: 'Replaced by {skill}',
    description: 'Formula effect superseded by another assigned Skill.',
  },
  formulaResult: {
    id: 'dyson.facilities.details.formula.result',
    defaultMessage: 'Result',
    description: 'Final value in an expanded facility source formula.',
  },
  scienceBots: {
    id: 'dyson.facilities.details.formula.science-bots',
    defaultMessage: 'Science Bots',
    description: 'Current Science Bot input in a facility source formula.',
  },
  workerBots: {
    id: 'dyson.facilities.details.formula.worker-bots',
    defaultMessage: 'Worker Bots',
    description: 'Current Worker Bot input in a facility source formula.',
  },
  panelsPerSecond: {
    id: 'dyson.facilities.details.formula.panels-per-second',
    defaultMessage: 'Panels per second',
    description: 'Current panel production input in a formula.',
  },
  panelLifetime: {
    id: 'dyson.facilities.details.formula.panel-lifetime',
    defaultMessage: 'Panel lifetime',
    description: 'Current panel lifetime input in a formula.',
  },
  galaxiesEngulfed: {
    id: 'dyson.facilities.details.formula.galaxies-engulfed',
    defaultMessage: 'Galaxies engulfed',
    description: 'Calculated engulfed-galaxy input in a formula.',
  },
  scienceBoostLevel: {
    id: 'dyson.facilities.details.formula.science-boost-level',
    defaultMessage: 'Science Boost research level',
    description: 'Current Science Boost research level in a formula.',
  },
  managerAssemblyProduction: {
    id: 'dyson.facilities.details.formula.manager-assembly-production',
    defaultMessage: 'AI Manager production',
    description: 'Current AI Manager Assembly Line production in a formula.',
  },
  fragments: {
    id: 'dyson.facilities.details.formula.fragments',
    defaultMessage: 'Fragments',
    description: 'Current Skill Fragment input in a facility formula.',
  },
  assignedSkillPoints: {
    id: 'dyson.facilities.details.formula.assigned-skill-points',
    defaultMessage: 'Assigned Skill Points',
    description: 'Current assigned Skill Point input in a formula.',
  },
  effectivePlanets: {
    id: 'dyson.facilities.details.formula.effective-planets',
    defaultMessage: 'Effective Planets',
    description: 'Planet count after applicable count modifiers.',
  },
  starsSurrounded: {
    id: 'dyson.facilities.details.formula.stars-surrounded',
    defaultMessage: 'Stars Surrounded',
    description: 'Current surrounded-star input in a formula.',
  },
  manualDataCenters: {
    id: 'dyson.facilities.details.formula.manual-data-centers',
    defaultMessage: 'Purchased Data Centers',
    description: 'Manually purchased Data Center input in a formula.',
  },
  elapsedSkillTime: {
    id: 'dyson.facilities.details.formula.elapsed-skill-time',
    defaultMessage: 'Elapsed assigned time',
    description: 'Elapsed time since assigning a timed Skill.',
  },
  manualPurchases: {
    id: 'dyson.facilities.details.manual-purchases',
    defaultMessage: 'Manual Purchases',
    description: 'Manual purchasing route in facility acquisition details.',
  },
  manualAcquisitionDescription: {
    id: 'dyson.facilities.details.manual-acquisition-description',
    defaultMessage: '{count} {facility} purchased directly',
    description: 'Manual facility acquisition count and facility name.',
  },
  howYouGain: {
    id: 'dyson.facilities.details.how-you-gain',
    defaultMessage: 'How you gain {facility}',
    description: 'Heading separating acquisition from production power.',
  },
  gameSpeed: {
    id: 'dyson.facilities.details.game-speed',
    defaultMessage: 'Game speed',
    description: 'Game speed effect name.',
  },
  gameSpeedDescription: {
    id: 'dyson.facilities.details.game-speed-description',
    defaultMessage: 'Each real second advances {speed} game seconds',
    description: 'Explanation of game speed conversion.',
  },
  infinityPower: {
    id: 'dyson.facilities.details.infinity-power',
    defaultMessage: 'Infinity',
    description: 'Infinity prestige contribution name.',
  },
  secretsPower: {
    id: 'dyson.facilities.details.secrets-power',
    defaultMessage: 'Secrets of the Universe',
    description: 'Secrets prestige contribution name.',
  },
  avocatoPower: {
    id: 'dyson.facilities.details.avocato-power',
    defaultMessage: 'Avocato',
    description: 'Avocato prestige contribution name.',
  },
  milestone50: {
    id: 'dyson.facilities.details.milestone-50',
    defaultMessage: '50 purchased milestone',
    description: 'Manual purchase milestone contribution name.',
  },
  milestone100: {
    id: 'dyson.facilities.details.milestone-100',
    defaultMessage: '100 purchased milestone',
    description: 'Manual purchase milestone contribution name.',
  },
  numericSafety: {
    id: 'dyson.facilities.details.numeric-safety',
    defaultMessage: 'Numeric safety limit',
    description: 'Canonical number clamping contribution name.',
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
  insufficientCash: {
    id: 'dyson.facilities.purchase.insufficient-cash',
    defaultMessage: 'Not enough Cash for this purchase.',
    description:
      'Screen-reader explanation for a mega-structure purchase that is too expensive.',
  },
  prerequisiteNotMet: {
    id: 'dyson.facilities.purchase.prerequisite-not-met',
    defaultMessage:
      'Construct the preceding mega-structure before purchasing this one.',
    description:
      'Screen-reader explanation for a sequential mega-structure prerequisite.',
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
