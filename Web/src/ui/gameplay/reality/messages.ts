import { defineMessages } from 'react-intl'

export const realityMessages = defineMessages({
  region: {
    id: 'reality.region',
    defaultMessage: 'Reality',
    description: 'Accessible name for the Unity Reality route.',
  },
  universeDesignation: {
    id: 'reality.universe-designation',
    defaultMessage: 'Universe Designation: {value}',
    description:
      'Number of the universe currently being consumed by Reality workers.',
  },
  influence: {
    id: 'reality.influence',
    defaultMessage: 'Influence: {value}',
    description: 'Current Reality Influence balance.',
  },
  artifact: {
    id: 'reality.artifact',
    defaultMessage: 'The Artifact',
    description: 'Unity title displayed in the Reality worker visual.',
  },
  artifactUndefined: {
    id: 'reality.artifact.undefined',
    defaultMessage: 'Undefined',
    description:
      'Unity artifact progress label before Speed Reduction VIII is owned.',
  },
  artifactCpuTime: {
    id: 'reality.artifact.cpu-time',
    defaultMessage: 'CPU Time',
    description:
      'Unity artifact progress label after Speed Reduction VIII is owned.',
  },
  consuming: {
    id: 'reality.consuming',
    defaultMessage: 'Consuming',
    description:
      'Unity status while Reality workers are being generated.',
  },
  consumptionHalted: {
    id: 'reality.consumption-halted',
    defaultMessage: 'Consumption Halted',
    description:
      'Unity status when a complete worker batch is waiting to be gathered.',
  },
  workerGeneration: {
    id: 'reality.worker-generation',
    defaultMessage: 'Worker generation',
    description:
      'Accessible name for the Reality worker generation progress bar.',
  },
  workersReady: {
    id: 'reality.workers-ready',
    defaultMessage: 'Workers ready',
    description:
      'Accessible name for the completed Reality worker batch progress bar.',
  },
  workersReadyValue: {
    id: 'reality.workers-ready.value',
    defaultMessage: '{current} of {total} workers ready',
    description:
      'Accessible value for the current canonical Reality worker batch.',
  },
  workersReadyCompact: {
    id: 'reality.workers-ready.compact',
    defaultMessage: '{current}/{total}',
    description:
      'Compact visible count for the current canonical Reality worker batch.',
  },
  gatherInfluence: {
    id: 'reality.gather-influence',
    defaultMessage: 'Gather Influence',
    description:
      'Unity action for converting a completed worker batch into Influence.',
  },
  gatherAccessible: {
    id: 'reality.gather-influence.accessible',
    defaultMessage: 'Gather {value} Influence',
    description:
      'Accessible label for gathering the canonical Influence amount.',
  },
  gatherPending: {
    id: 'reality.gather-influence.pending',
    defaultMessage: 'Gathering Influence…',
    description:
      'Status announced while a Gather Influence command is pending.',
  },
  gatherFailed: {
    id: 'reality.gather-influence.failed',
    defaultMessage: 'Influence was not gathered. Try again.',
    description:
      'Failure shown after the canonical Gather Influence command is rejected.',
  },
  upgrades: {
    id: 'reality.upgrades',
    defaultMessage: 'Reality Upgrades',
    description: 'Heading for Reality-layer permanent upgrades.',
  },
  strangeMatter: {
    id: 'reality.strange-matter',
    defaultMessage: 'Strange Matter: {value}',
    description:
      'Current Strange Matter balance shown with Reality upgrades.',
  },
  anomalyCategory: {
    id: 'reality.upgrades.anomaly',
    defaultMessage: 'Anomaly',
    description:
      'Unity heading containing Translation and Speed Reduction upgrades.',
  },
  translationCategory: {
    id: 'reality.upgrades.translation',
    defaultMessage: 'Translation',
    description: 'Heading for Reality translation upgrades.',
  },
  speedCategory: {
    id: 'reality.upgrades.speed',
    defaultMessage: 'Speed Reduction',
    description: 'Heading for Reality artifact-speed upgrades.',
  },
  qualityCategory: {
    id: 'reality.upgrades.quality',
    defaultMessage: 'Quality of Life',
    description: 'Heading for Reality quality-of-life upgrades.',
  },
  purchase: {
    id: 'reality.upgrades.purchase',
    defaultMessage: 'Purchase',
    description: 'Button label for purchasing a Reality upgrade.',
  },
  cost: {
    id: 'reality.upgrades.cost',
    defaultMessage: '{value} SM',
    description: 'Strange Matter cost for a Reality upgrade.',
  },
  purchaseAccessible: {
    id: 'reality.upgrades.purchase-accessible',
    defaultMessage: 'Purchase {name} for {value} Strange Matter',
    description: 'Accessible Reality-upgrade purchase action.',
  },
  purchasePending: {
    id: 'reality.upgrades.purchase-pending',
    defaultMessage: 'Purchasing {name}…',
    description: 'Status while a Reality upgrade purchase is pending.',
  },
  purchaseFailed: {
    id: 'reality.upgrades.purchase-failed',
    defaultMessage: '{name} was not purchased. Try again.',
    description:
      'Failure shown after a canonical Reality upgrade purchase is rejected.',
  },
  unavailable: {
    id: 'reality.unavailable',
    defaultMessage: 'Reality is temporarily unavailable.',
    description:
      'Failure shown when canonical Reality worker facts cannot be presented.',
  },
})

export const realityUpgradeMessages = defineMessages({
  translation1Title: {
    id: 'reality.upgrades.translation1.title',
    defaultMessage: 'Translation I',
    description: 'Unity Reality upgrade title.',
  },
  translation1Description: {
    id: 'reality.upgrades.translation1.description',
    defaultMessage:
      "Begin deciphering the anomaly's code.\nGain 1 skill point.",
    description: 'Unity Reality upgrade description.',
  },
  translation2Title: {
    id: 'reality.upgrades.translation2.title',
    defaultMessage: 'Translation II',
    description: 'Unity Reality upgrade title.',
  },
  translation2Description: {
    id: 'reality.upgrades.translation2.description',
    defaultMessage:
      'The patterns are starting to make sense.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  translation3Title: {
    id: 'reality.upgrades.translation3.title',
    defaultMessage: 'Translation III',
    description: 'Unity Reality upgrade title.',
  },
  translation3Description: {
    id: 'reality.upgrades.translation3.description',
    defaultMessage:
      'Progress! More symbols decoded.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  translation4Title: {
    id: 'reality.upgrades.translation4.title',
    defaultMessage: 'Translation IV',
    description: 'Unity Reality upgrade title.',
  },
  translation4Description: {
    id: 'reality.upgrades.translation4.description',
    defaultMessage:
      'Halfway through the translation.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  translation5Title: {
    id: 'reality.upgrades.translation5.title',
    defaultMessage: 'Translation V',
    description: 'Unity Reality upgrade title.',
  },
  translation5Description: {
    id: 'reality.upgrades.translation5.description',
    defaultMessage:
      "The anomaly's secrets unfold.\nGain 1 skill point.",
    description: 'Unity Reality upgrade description.',
  },
  translation6Title: {
    id: 'reality.upgrades.translation6.title',
    defaultMessage: 'Translation VI',
    description: 'Unity Reality upgrade title.',
  },
  translation6Description: {
    id: 'reality.upgrades.translation6.description',
    defaultMessage:
      'Almost there, keep translating.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  translation7Title: {
    id: 'reality.upgrades.translation7.title',
    defaultMessage: 'Translation VII',
    description: 'Unity Reality upgrade title.',
  },
  translation7Description: {
    id: 'reality.upgrades.translation7.description',
    defaultMessage:
      'The final pieces fall into place.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  translation8Title: {
    id: 'reality.upgrades.translation8.title',
    defaultMessage: 'Translation VIII',
    description: 'Unity Reality upgrade title.',
  },
  translation8Description: {
    id: 'reality.upgrades.translation8.description',
    defaultMessage:
      'Finally finish translating the anomaly!\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed1Title: {
    id: 'reality.upgrades.speed1.title',
    defaultMessage: 'Speed Reduction I',
    description: 'Unity Reality upgrade title.',
  },
  speed1Description: {
    id: 'reality.upgrades.speed1.description',
    defaultMessage:
      '100% ▸ 95% - Magnetic fields?\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed2Title: {
    id: 'reality.upgrades.speed2.title',
    defaultMessage: 'Speed Reduction II',
    description: 'Unity Reality upgrade title.',
  },
  speed2Description: {
    id: 'reality.upgrades.speed2.description',
    defaultMessage:
      '95% ▸ 90% - Throw it at a wall?\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed3Title: {
    id: 'reality.upgrades.speed3.title',
    defaultMessage: 'Speed Reduction III',
    description: 'Unity Reality upgrade title.',
  },
  speed3Description: {
    id: 'reality.upgrades.speed3.description',
    defaultMessage:
      '90% ▸ 80% - Smack it with a bat?\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed4Title: {
    id: 'reality.upgrades.speed4.title',
    defaultMessage: 'Speed Reduction IV',
    description: 'Unity Reality upgrade title.',
  },
  speed4Description: {
    id: 'reality.upgrades.speed4.description',
    defaultMessage:
      '80% ▸ 70% - Put it under a metal press?\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed5Title: {
    id: 'reality.upgrades.speed5.title',
    defaultMessage: 'Speed Reduction V',
    description: 'Unity Reality upgrade title.',
  },
  speed5Description: {
    id: 'reality.upgrades.speed5.description',
    defaultMessage:
      '70% ▸ 50% - Bombard it with radiation?\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed6Title: {
    id: 'reality.upgrades.speed6.title',
    defaultMessage: 'Speed Reduction VI',
    description: 'Unity Reality upgrade title.',
  },
  speed6Description: {
    id: 'reality.upgrades.speed6.description',
    defaultMessage:
      '50% ▸ 25% - Design an inception machine.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed7Title: {
    id: 'reality.upgrades.speed7.title',
    defaultMessage: 'Speed Reduction VII',
    description: 'Unity Reality upgrade title.',
  },
  speed7Description: {
    id: 'reality.upgrades.speed7.description',
    defaultMessage:
      '25% ▸ 10% - Go down a few layers.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  speed8Title: {
    id: 'reality.upgrades.speed8.title',
    defaultMessage: 'Speed Reduction VIII',
    description: 'Unity Reality upgrade title.',
  },
  speed8Description: {
    id: 'reality.upgrades.speed8.description',
    defaultMessage:
      '10% ▸ 0% - Comprehention.\nGain 1 skill point.',
    description: 'Unity Reality upgrade description.',
  },
  doubleTimeOwnedTitle: {
    id: 'reality.upgrades.double-time.title',
    defaultMessage: 'Enable Time Multiplier',
    description: 'Unity Reality upgrade title.',
  },
  doubleTimeOwnedDescription: {
    id: 'reality.upgrades.double-time.description',
    defaultMessage:
      'Gather time while offline, spend it while online.',
    description: 'Unity Reality upgrade description.',
  },
  workerAutoConvertTitle: {
    id: 'reality.upgrades.auto-gather.title',
    defaultMessage: 'Automate Gather Influence',
    description: 'Unity Reality upgrade title.',
  },
  workerAutoConvertDescription: {
    id: 'reality.upgrades.auto-gather.description',
    defaultMessage:
      'No longer feel the need to click gather influence',
    description: 'Unity Reality upgrade description.',
  },
})

export const simulationUpgradeMessages = defineMessages({
  heading: { id: 'reality.simulation-upgrades.heading', defaultMessage: 'Simulation Upgrades', description: 'Unity permanent Simulation upgrades heading on Reality.' },
  countermeasures: { id: 'reality.simulation-upgrades.countermeasures', defaultMessage: 'Countermeasures', description: 'Simulation disaster countermeasures category.' },
  education: { id: 'reality.simulation-upgrades.education', defaultMessage: 'Education', description: 'Permanent Simulation Education category.' },
  foundational: { id: 'reality.simulation-upgrades.foundational', defaultMessage: 'Foundational Era', description: 'Permanent Foundational Era upgrade category.' },
  information: { id: 'reality.simulation-upgrades.information', defaultMessage: 'Information Era', description: 'Permanent Information Era upgrade category.' },
  spaceAge: { id: 'reality.simulation-upgrades.space-age', defaultMessage: 'Space Age', description: 'Permanent Space Age upgrade category.' },
  counterMeteorTitle: { id: 'reality.simulation-upgrades.counter-meteor.title', defaultMessage: 'Counteract Meteor Storm', description: 'Unity Simulation upgrade title.' },
  counterMeteorDescription: { id: 'reality.simulation-upgrades.counter-meteor.description', defaultMessage: 'Override the simulation deleting all space rocks.', description: 'Unity Simulation upgrade description.' },
  counterAiTitle: { id: 'reality.simulation-upgrades.counter-ai.title', defaultMessage: 'Counteract AI Overlords', description: 'Unity Simulation upgrade title.' },
  counterAiDescription: { id: 'reality.simulation-upgrades.counter-ai.description', defaultMessage: 'Squish some bugs, no more Overlords.', description: 'Unity Simulation upgrade description.' },
  counterGwTitle: { id: 'reality.simulation-upgrades.counter-gw.title', defaultMessage: 'Counteract Global Warming', description: 'Unity Simulation upgrade title.' },
  counterGwDescription: { id: 'reality.simulation-upgrades.counter-gw.description', defaultMessage: 'Switching to friendlier rocket fuel should help.', description: 'Unity Simulation upgrade description.' },
  engineering1Title: { id: 'reality.simulation-upgrades.engineering1.title', defaultMessage: 'Engineering I', description: 'Unity Simulation upgrade title.' },
  engineering1Description: { id: 'reality.simulation-upgrades.engineering1.description', defaultMessage: 'Better algorithms. 10m ▸ 5m', description: 'Unity Simulation upgrade description.' },
  engineering2Title: { id: 'reality.simulation-upgrades.engineering2.title', defaultMessage: 'Engineering II', description: 'Unity Simulation upgrade title.' },
  engineering2Description: { id: 'reality.simulation-upgrades.engineering2.description', defaultMessage: 'Even better algorithms. 5m ▸ 1m', description: 'Unity Simulation upgrade description.' },
  engineering3Title: { id: 'reality.simulation-upgrades.engineering3.title', defaultMessage: 'Engineering III', description: 'Unity Simulation upgrade title.' },
  engineering3Description: { id: 'reality.simulation-upgrades.engineering3.description', defaultMessage: "I'm over this, aren't you?", description: 'Unity Simulation upgrade description.' },
  shipping1Title: { id: 'reality.simulation-upgrades.shipping1.title', defaultMessage: 'Shipping I', description: 'Unity Simulation upgrade title.' },
  shipping1Description: { id: 'reality.simulation-upgrades.shipping1.description', defaultMessage: 'Ship with ships or… Trucks. 30m ▸ 10m', description: 'Unity Simulation upgrade description.' },
  shipping2Title: { id: 'reality.simulation-upgrades.shipping2.title', defaultMessage: 'Shipping II', description: 'Unity Simulation upgrade title.' },
  shipping2Description: { id: 'reality.simulation-upgrades.shipping2.description', defaultMessage: 'Just teleport the stuff already.', description: 'Unity Simulation upgrade description.' },
  worldTrade1Title: { id: 'reality.simulation-upgrades.world-trade1.title', defaultMessage: 'World Trade I', description: 'Unity Simulation upgrade title.' },
  worldTrade1Description: { id: 'reality.simulation-upgrades.world-trade1.description', defaultMessage: 'Global trading in its raw form. 1h ▸ 30m', description: 'Unity Simulation upgrade description.' },
  worldTrade2Title: { id: 'reality.simulation-upgrades.world-trade2.title', defaultMessage: 'World Trade II', description: 'Unity Simulation upgrade title.' },
  worldTrade2Description: { id: 'reality.simulation-upgrades.world-trade2.description', defaultMessage: 'Zip here, zip there, zip everywhere. 30m ▸ 10m', description: 'Unity Simulation upgrade description.' },
  worldTrade3Title: { id: 'reality.simulation-upgrades.world-trade3.title', defaultMessage: 'World Trade III', description: 'Unity Simulation upgrade title.' },
  worldTrade3Description: { id: 'reality.simulation-upgrades.world-trade3.description', defaultMessage: 'No push button anymore.', description: 'Unity Simulation upgrade description.' },
  worldPeace1Title: { id: 'reality.simulation-upgrades.world-peace1.title', defaultMessage: 'World Peace I', description: 'Unity Simulation upgrade title.' },
  worldPeace1Description: { id: 'reality.simulation-upgrades.world-peace1.description', defaultMessage: 'Put those weapons away. 2h ▸ 1h', description: 'Unity Simulation upgrade description.' },
  worldPeace2Title: { id: 'reality.simulation-upgrades.world-peace2.title', defaultMessage: 'World Peace II', description: 'Unity Simulation upgrade title.' },
  worldPeace2Description: { id: 'reality.simulation-upgrades.world-peace2.description', defaultMessage: 'Global contracting. 1h ▸ 30m', description: 'Unity Simulation upgrade description.' },
  worldPeace3Title: { id: 'reality.simulation-upgrades.world-peace3.title', defaultMessage: 'World Peace III', description: 'Unity Simulation upgrade title.' },
  worldPeace3Description: { id: 'reality.simulation-upgrades.world-peace3.description', defaultMessage: 'No more hackers. 30m ▸ 10m', description: 'Unity Simulation upgrade description.' },
  worldPeace4Title: { id: 'reality.simulation-upgrades.world-peace4.title', defaultMessage: 'World Peace IV', description: 'Unity Simulation upgrade title.' },
  worldPeace4Description: { id: 'reality.simulation-upgrades.world-peace4.description', defaultMessage: 'Toggle booleans, why waste CPU on war.', description: 'Unity Simulation upgrade description.' },
  mathematics1Title: { id: 'reality.simulation-upgrades.mathematics1.title', defaultMessage: 'Mathematics I', description: 'Unity Simulation upgrade title.' },
  mathematics1Description: { id: 'reality.simulation-upgrades.mathematics1.description', defaultMessage: '1+1=a, a = window. 1h ▸ 30m', description: 'Unity Simulation upgrade description.' },
  mathematics2Title: { id: 'reality.simulation-upgrades.mathematics2.title', defaultMessage: 'Mathematics II', description: 'Unity Simulation upgrade title.' },
  mathematics2Description: { id: 'reality.simulation-upgrades.mathematics2.description', defaultMessage: '3.14159265358979323 = Yum. 30m ▸ 10m', description: 'Unity Simulation upgrade description.' },
  mathematics3Title: { id: 'reality.simulation-upgrades.mathematics3.title', defaultMessage: 'Mathematics III', description: 'Unity Simulation upgrade title.' },
  mathematics3Description: { id: 'reality.simulation-upgrades.mathematics3.description', defaultMessage: "Division by 0, oh it's free?", description: 'Unity Simulation upgrade description.' },
  advancedPhysics1Title: { id: 'reality.simulation-upgrades.advanced-physics1.title', defaultMessage: 'Advanced Physics I', description: 'Unity Simulation upgrade title.' },
  advancedPhysics1Description: { id: 'reality.simulation-upgrades.advanced-physics1.description', defaultMessage: 'Jenga Training. 2h ▸ 1h', description: 'Unity Simulation upgrade description.' },
  advancedPhysics2Title: { id: 'reality.simulation-upgrades.advanced-physics2.title', defaultMessage: 'Advanced Physics II', description: 'Unity Simulation upgrade title.' },
  advancedPhysics2Description: { id: 'reality.simulation-upgrades.advanced-physics2.description', defaultMessage: 'Parkour. 1h ▸ 30m', description: 'Unity Simulation upgrade description.' },
  advancedPhysics3Title: { id: 'reality.simulation-upgrades.advanced-physics3.title', defaultMessage: 'Advanced Physics III', description: 'Unity Simulation upgrade title.' },
  advancedPhysics3Description: { id: 'reality.simulation-upgrades.advanced-physics3.description', defaultMessage: 'Thrust Vectors. 30m ▸ 10m', description: 'Unity Simulation upgrade description.' },
  advancedPhysics4Title: { id: 'reality.simulation-upgrades.advanced-physics4.title', defaultMessage: 'Advanced Physics IV', description: 'Unity Simulation upgrade title.' },
  advancedPhysics4Description: { id: 'reality.simulation-upgrades.advanced-physics4.description', defaultMessage: 'Fusion is for fusing, fission no more.', description: 'Unity Simulation upgrade description.' },
  hunter1Title: { id: 'reality.simulation-upgrades.hunter1.title', defaultMessage: 'Start with 1 Hunter', description: 'Unity Simulation upgrade title.' },
  hunter2Title: { id: 'reality.simulation-upgrades.hunter2.title', defaultMessage: 'Start with 10 Hunters', description: 'Unity Simulation upgrade title.' },
  hunter3Title: { id: 'reality.simulation-upgrades.hunter3.title', defaultMessage: 'Start with 1,000 Hunters', description: 'Unity Simulation upgrade title.' },
  hunter4Title: { id: 'reality.simulation-upgrades.hunter4.title', defaultMessage: 'Purchase buys 1,000 Hunters', description: 'Unity Simulation upgrade title.' },
  gatherer1Title: { id: 'reality.simulation-upgrades.gatherer1.title', defaultMessage: 'Start with 1 Gatherer', description: 'Unity Simulation upgrade title.' },
  gatherer2Title: { id: 'reality.simulation-upgrades.gatherer2.title', defaultMessage: 'Start with 10 Gatherers', description: 'Unity Simulation upgrade title.' },
  gatherer3Title: { id: 'reality.simulation-upgrades.gatherer3.title', defaultMessage: 'Start with 1,000 Gatherers', description: 'Unity Simulation upgrade title.' },
  gatherer4Title: { id: 'reality.simulation-upgrades.gatherer4.title', defaultMessage: 'Purchase buys 1,000 Gatherers', description: 'Unity Simulation upgrade title.' },
  workerBoostTitle: { id: 'reality.simulation-upgrades.worker-boost.title', defaultMessage: 'Log10 Workers', description: 'Unity Simulation upgrade title.' },
  citiesBoostTitle: { id: 'reality.simulation-upgrades.cities-boost.title', defaultMessage: 'City Booster', description: 'Unity Simulation upgrade title.' },
  factoriesBoostTitle: { id: 'reality.simulation-upgrades.factories-boost.title', defaultMessage: 'Factories', description: 'Unity Simulation upgrade title.' },
  bots1Title: { id: 'reality.simulation-upgrades.bots1.title', defaultMessage: 'Bots I', description: 'Unity Simulation upgrade title.' },
  bots2Title: { id: 'reality.simulation-upgrades.bots2.title', defaultMessage: 'Bots II', description: 'Unity Simulation upgrade title.' },
  rockets1Title: { id: 'reality.simulation-upgrades.rockets1.title', defaultMessage: 'Rockets I', description: 'Unity Simulation upgrade title.' },
  rockets2Title: { id: 'reality.simulation-upgrades.rockets2.title', defaultMessage: 'Rockets II', description: 'Unity Simulation upgrade title.' },
  rockets3Title: { id: 'reality.simulation-upgrades.rockets3.title', defaultMessage: 'Rockets III', description: 'Unity Simulation upgrade title.' },
  sfacs1Title: { id: 'reality.simulation-upgrades.sfacs1.title', defaultMessage: 'Space Factories I', description: 'Unity Simulation upgrade title.' },
  sfacs2Title: { id: 'reality.simulation-upgrades.sfacs2.title', defaultMessage: 'Space Factories II', description: 'Unity Simulation upgrade title.' },
  sfacs3Title: { id: 'reality.simulation-upgrades.sfacs3.title', defaultMessage: 'Space Factories III', description: 'Unity Simulation upgrade title.' },
  railguns1Title: { id: 'reality.simulation-upgrades.railguns1.title', defaultMessage: 'Railguns I', description: 'Unity Simulation upgrade title.' },
  railguns2Title: { id: 'reality.simulation-upgrades.railguns2.title', defaultMessage: 'Railguns II', description: 'Unity Simulation upgrade title.' },
  foundationalDescription: { id: 'reality.simulation-upgrades.foundational.description', defaultMessage: 'Carry a stronger Foundational Era into every Simulation.', description: 'Compact permanent Foundational upgrade description.' },
  informationDescription: { id: 'reality.simulation-upgrades.information.description', defaultMessage: 'Improve Information Era production in every Simulation.', description: 'Compact permanent Information upgrade description.' },
  spaceAgeDescription: { id: 'reality.simulation-upgrades.space-age.description', defaultMessage: 'Improve simulated space production and launch speed.', description: 'Compact permanent Space Age upgrade description.' },
})
