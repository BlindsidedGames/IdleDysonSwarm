import { defineMessages } from 'react-intl'

export const researchMessages = defineMessages({
  region: {
    id: 'research.region',
    defaultMessage: 'Research',
    description: 'Accessible name for the Unity Research route.',
  },
  assemblyLine: {
    id: 'research.name.assembly-line',
    defaultMessage: 'Assembly Line',
    description: 'Unity Research card name.',
  },
  aiManager: {
    id: 'research.name.ai-manager',
    defaultMessage: 'AI Manager',
    description: 'Unity Research card name.',
  },
  server: {
    id: 'research.name.server',
    defaultMessage: 'Server',
    description: 'Unity Research card name.',
  },
  dataCenter: {
    id: 'research.name.data-center',
    defaultMessage: 'Data Center',
    description: 'Unity Research card name.',
  },
  planet: {
    id: 'research.name.planet',
    defaultMessage: 'Planet',
    description: 'Unity Research card name.',
  },
  matrioshkaBrains: {
    id: 'research.name.matrioshka-brains',
    defaultMessage: 'Matrioshka Brains',
    description: 'Unity Research card name.',
  },
  birchPlanets: {
    id: 'research.name.birch-planets',
    defaultMessage: 'Birch Planets',
    description: 'Unity Research card name.',
  },
  galacticBrains: {
    id: 'research.name.galactic-brains',
    defaultMessage: 'Galactic Brains',
    description: 'Unity Research card name.',
  },
  science: {
    id: 'research.name.science',
    defaultMessage: 'Science',
    description: 'Unity Research card name.',
  },
  cash: {
    id: 'research.name.cash',
    defaultMessage: 'Cash',
    description: 'Unity Research card name.',
  },
  durabilityUpgrade: {
    id: 'research.name.durability-upgrade',
    defaultMessage: 'Durability Upgrade',
    description: 'Unity title for each Panel Lifetime research card.',
  },
  boostTitle: {
    id: 'research.card.boost-title',
    defaultMessage: '{name} boosts <value>{level}</value>',
    description: 'Unity Research card title with its current level.',
  },
  boostTitleAccessible: {
    id: 'research.card.boost-title-accessible',
    defaultMessage: '{name} boosts {level}',
    description:
      'Plain accessible version of the Unity Research card title.',
  },
  purchaseBoost: {
    id: 'research.card.purchase-boost',
    defaultMessage:
      'Purchase for a boost! (<value>{perLevel}%</value> per level)',
    description: 'Research effect line before its first purchase.',
  },
  boosting: {
    id: 'research.card.boosting',
    defaultMessage: 'Boosting by <value>{current}%</value>',
    description: 'Research effect line for an owned research.',
  },
  boostingProjected: {
    id: 'research.card.boosting-projected',
    defaultMessage:
      'Boosting by <value>{current}%</value> -> <value>{projected}%</value>',
    description: 'Research effect line when the quoted purchase changes the boost.',
  },
  lifetimeEffect: {
    id: 'research.card.lifetime-effect',
    defaultMessage:
      'Increases Panel Lifetime by <value>{seconds}s</value>',
    description: 'Effect line for a Unity Panel Lifetime upgrade.',
  },
  assemblyDescription: {
    id: 'research.description.assembly-line',
    defaultMessage:
      'Training algorithms make your Assembly Lines more efficient, thus producing more bots!',
    description: 'Unity Assembly Line research description.',
  },
  aiDescription: {
    id: 'research.description.ai-manager',
    defaultMessage:
      'Refactoring code makes your AI Managers more efficient, thus producing more Assembly Lines!',
    description: 'Unity AI Manager research description.',
  },
  serverDescription: {
    id: 'research.description.server',
    defaultMessage:
      'Upgrade to the latest Server Technology, allows your servers to run more AI Managers!',
    description: 'Unity Server research description.',
  },
  dataCenterDescription: {
    id: 'research.description.data-center',
    defaultMessage:
      'Efficiency protocols allow you to improve the efficiency of your Data Centers.',
    description: 'Unity Data Center research description.',
  },
  machineWorldDescription: {
    id: 'research.description.machine-world',
    defaultMessage:
      'Terraform some of your planets. Machine worlds allow more room for Servers!',
    description:
      'Unity description shared by Planet and mega-facility research cards.',
  },
  lifetimeOneDescription: {
    id: 'research.description.lifetime-one',
    defaultMessage:
      'Many researchers were sacrificed developing this upgrade. Their noggins were not up to the task!',
    description: 'Unity first Panel Lifetime research description.',
  },
  lifetimeLaterDescription: {
    id: 'research.description.lifetime-later',
    defaultMessage:
      'Through the sacrifice of many determined science bots this upgrade was made available.',
    description: 'Unity later Panel Lifetime research description.',
  },
  scienceDescription: {
    id: 'research.description.science',
    defaultMessage:
      'Upgrades to networking allow bots to work more efficently together boosting Science production!',
    description: 'Unity Science research description.',
  },
  cashDescription: {
    id: 'research.description.cash',
    defaultMessage:
      'Refined marketing strategies allow you to increase the price of your energy yielding better income!',
    description: 'Unity Cash research description.',
  },
  automatic: {
    id: 'research.purchase.automatic',
    defaultMessage: 'Auto',
    description: 'Unity label for an automatically purchased research.',
  },
  purchased: {
    id: 'research.purchase.purchased',
    defaultMessage: 'Purchased',
    description: 'Unity label for a completed one-time Research card.',
  },
  purchaseQuantity: {
    id: 'research.purchase.quantity',
    defaultMessage: '+{quantity}',
    description: 'Quoted canonical Research purchase quantity.',
  },
  purchaseAccessible: {
    id: 'research.purchase.accessible',
    defaultMessage:
      'Purchase {title}: {quantity} levels for {cost} Science',
    description: 'Accessible name for a Research purchase button.',
  },
  automaticAccessible: {
    id: 'research.purchase.automatic-accessible',
    defaultMessage: '{title} is purchased automatically',
    description: 'Accessible name for an automatic Research card button.',
  },
  purchasedAccessible: {
    id: 'research.purchase.purchased-accessible',
    defaultMessage: '{title} is purchased',
    description: 'Accessible name for a completed Research card button.',
  },
  purchaseFailed: {
    id: 'research.purchase.failed',
    defaultMessage: 'Research was not purchased.',
    description: 'Failure feedback after a rejected Research purchase.',
  },
  purchasePending: {
    id: 'research.purchase.pending',
    defaultMessage: 'Purchasing research.',
    description: 'Status feedback while a Research purchase is pending.',
  },
  purchaseSettings: {
    id: 'research.settings.open',
    defaultMessage: 'Research purchase settings',
    description: 'Accessible label for the Research footer settings gear.',
  },
  purchaseAmount: {
    id: 'research.settings.purchase-amount',
    defaultMessage: 'Research purchase amount',
    description: 'Heading for canonical Research buy mode controls.',
  },
  buyOne: {
    id: 'research.settings.buy-mode.one',
    defaultMessage: 'x1',
    description: 'Purchase one Research level.',
  },
  buyTen: {
    id: 'research.settings.buy-mode.ten',
    defaultMessage: 'x10',
    description: 'Purchase ten Research levels.',
  },
  buyFifty: {
    id: 'research.settings.buy-mode.fifty',
    defaultMessage: 'x50',
    description: 'Purchase fifty Research levels.',
  },
  buyOneHundred: {
    id: 'research.settings.buy-mode.one-hundred',
    defaultMessage: 'x100',
    description: 'Purchase one hundred Research levels.',
  },
  buyMax: {
    id: 'research.settings.buy-mode.max',
    defaultMessage: 'Max',
    description: 'Purchase the maximum canonically affordable Research levels.',
  },
  roundedBulkBuy: {
    id: 'research.settings.rounded-bulk-buy',
    defaultMessage: 'Round bulk purchases to the next milestone',
    description: 'Unity Research rounded-bulk setting.',
  },
  settingsFailed: {
    id: 'research.settings.failed',
    defaultMessage: 'Research purchase settings were not changed.',
    description: 'Failure feedback after a rejected Research setting command.',
  },
  productionSummary: {
    id: 'research.production-summary',
    defaultMessage:
      '<researcherValue>{researchers}</researcherValue> Researchers producing <scienceValue>{science}</scienceValue>{scienceIcon}/s',
    description: 'Unity Research footer production summary.',
  },
  empty: {
    id: 'research.empty',
    defaultMessage: 'No research is currently available.',
    description: 'Safe empty state when no canonical Research cards are visible.',
  },
})
