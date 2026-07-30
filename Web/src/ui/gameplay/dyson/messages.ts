import { defineMessages } from 'react-intl'

export const readyDysonMessages = defineMessages({
  route: {
    id: 'dyson.route.bots',
    defaultMessage: 'Bots',
    description: 'Unity Dyson route name.',
  },
  primaryNavigation: {
    id: 'dyson.navigation.primary',
    defaultMessage: 'Primary',
    description: 'Accessible name for the primary game navigation.',
  },
  sideNavigation: {
    id: 'dyson.navigation.side',
    defaultMessage: 'Game menu',
    description: 'Accessible name for the Unity side navigation.',
  },
  bottomNavigation: {
    id: 'dyson.navigation.bottom',
    defaultMessage: 'Game tabs',
    description: 'Accessible name for the compact bottom navigation.',
  },
  researchRoute: {
    id: 'navigation.research',
    defaultMessage: 'Research',
    description: 'Unity Research destination.',
  },
  skillsRoute: {
    id: 'navigation.skills',
    defaultMessage: 'Skills',
    description: 'Unity Skills destination.',
  },
  infinityRoute: {
    id: 'navigation.infinity',
    defaultMessage: 'Infinity',
    description: 'Unity Infinity destination.',
  },
  storyRoute: {
    id: 'navigation.story',
    defaultMessage: 'Story',
    description: 'Unity Story destination.',
  },
  wikiRoute: {
    id: 'navigation.wiki',
    defaultMessage: 'Wiki',
    description: 'Unity Wiki destination.',
  },
  offlineTimeRoute: {
    id: 'navigation.offline-time',
    defaultMessage: 'Offline Time',
    description: 'Unity Offline Time destination.',
  },
  settingsRoute: {
    id: 'navigation.settings',
    defaultMessage: 'Settings',
    description: 'Unity Settings destination.',
  },
  cashMultiplier: {
    id: 'dyson.menu.cash-multiplier',
    defaultMessage: 'Cash Multiplier: {value}',
    description: 'Current canonical Cash multiplier in the Unity menu.',
  },
  researchMultiplier: {
    id: 'dyson.menu.research-multiplier',
    defaultMessage: 'Research Multiplier: {value}',
    description: 'Current canonical research multiplier in the Unity menu.',
  },
  panelLifetime: {
    id: 'dyson.menu.panel-lifetime',
    defaultMessage: 'Panel Lifetime: {value} s',
    description: 'Current canonical panel lifetime in the Unity menu.',
  },
  resources: {
    id: 'dyson.resources.summary',
    defaultMessage: 'Resources',
    description: 'Accessible name for the Dyson resource summary.',
  },
  cash: {
    id: 'dyson.resources.cash',
    defaultMessage: 'Cash',
    description: 'Unity Cash resource label.',
  },
  totalBots: {
    id: 'dyson.resources.total-bots',
    defaultMessage: 'Total Bots',
    description: 'Unity Total Bots resource label.',
  },
  science: {
    id: 'dyson.resources.science',
    defaultMessage: 'Science',
    description: 'Unity Science resource label.',
  },
  cashValue: {
    id: 'dyson.resources.cash-value',
    defaultMessage: '${value}',
    description:
      'Complete localized Cash value expression, including the currency marker.',
  },
  cashRate: {
    id: 'dyson.resources.cash-rate',
    defaultMessage: '${value} /s',
    description:
      'Complete localized Cash-per-second expression.',
  },
  scienceRate: {
    id: 'dyson.resources.science-rate',
    defaultMessage: '{value} /s',
    description:
      'Complete localized Science-per-second expression.',
  },
  facilities: {
    id: 'dyson.facilities.region',
    defaultMessage: 'Facilities',
    description:
      'Accessible name for the early Dyson facility region.',
  },
  teaser: {
    id: 'dyson.facilities.teaser',
    defaultMessage: '????',
    description:
      'Generic non-interactive teaser before the next named facility is visible.',
  },
  tinker: {
    id: 'dyson.tinker.region',
    defaultMessage: 'Tinker',
    description: 'Accessible name for the Unity Tinker region.',
  },
  skipToGame: {
    id: 'dyson.navigation.skip-to-game',
    defaultMessage: 'Skip to game',
    description: 'Skip-link label for the active Dyson gameplay route.',
  },
  unavailable: {
    id: 'dyson.ready.unavailable',
    defaultMessage: 'Gameplay is temporarily unavailable.',
    description:
      'Safe fallback when canonical Dyson facts cannot be presented.',
  },
  productionSummary: {
    id: 'dyson.production-summary.region',
    defaultMessage: 'Production summary',
    description:
      'Accessible name for the lower Unity production facts; not a visible heading.',
  },
  dysonSwarm: {
    id: 'dyson.swarm.region',
    defaultMessage: 'Dyson swarm',
    description:
      'Accessible region name for the decorative Unity-style swarm visual.',
  },
  info: {
    id: 'dyson.info.title',
    defaultMessage: 'Info',
    description: 'Unity Bots information control label.',
  },
  goalCreateBots: {
    id: 'dyson.info.goal.create-bots',
    defaultMessage: 'Goal: Create {targetDisplay} Bots',
    description: 'Unity early Dyson goal to create Bots.',
  },
  goalBuildAssemblyLines: {
    id: 'dyson.info.goal.build-assembly-lines',
    defaultMessage: 'Goal: Build {targetDisplay} Assembly Lines',
    description: 'Unity Dyson goal to build Assembly Lines.',
  },
  goalHaveActivePanels: {
    id: 'dyson.info.goal.have-active-panels',
    defaultMessage: 'Goal: Have {targetDisplay} active Panels',
    description: 'Unity Dyson goal to maintain active Panels.',
  },
  goalOwnPlanets: {
    id: 'dyson.info.goal.own-planets',
    defaultMessage: 'Goal: Own {targetDisplay} Planets',
    description: 'Unity Dyson goal to own Planets.',
  },
  goalDecayPanels: {
    id: 'dyson.info.goal.decay-panels',
    defaultMessage: 'Goal: {targetDisplay} total panels decayed',
    description: 'Unity Dyson goal for lifetime decayed Panels.',
  },
  goalSurroundStars: {
    id: 'dyson.info.goal.surround-stars',
    defaultMessage: 'Goal: Surround {targetDisplay} Stars',
    description: 'Unity Dyson goal to surround Stars.',
  },
  goalEngulfGalaxies: {
    id: 'dyson.info.goal.engulf-galaxies',
    defaultMessage:
      'Goal: {target, plural, one {Engulf a Galaxy} other {Engulf {targetDisplay} Galaxies}}',
    description: 'Unity Dyson goal to engulf one or more Galaxies.',
  },
  goalReachBots: {
    id: 'dyson.info.goal.reach-bots',
    defaultMessage: 'Goal: Reach {targetDisplay} Bots',
    description: 'Unity final Dyson Bot-count goal.',
  },
  activePanels: {
    id: 'dyson.info.active-panels',
    defaultMessage: 'Active panels: <emphasis>{value}</emphasis>',
    description: 'Unity active panel metric below the first scale threshold.',
  },
  starsSurrounded: {
    id: 'dyson.info.stars-surrounded',
    defaultMessage: 'Stars Surrounded: <emphasis>{value}</emphasis>',
    description: 'Unity active panel metric at stellar scale.',
  },
  galaxiesEngulfed: {
    id: 'dyson.info.galaxies-engulfed',
    defaultMessage: 'Galaxies Engulfed: <emphasis>{value}</emphasis>',
    description: 'Unity active panel metric at galactic scale.',
  },
  panelLifetimeDetail: {
    id: 'dyson.info.panel-lifetime',
    defaultMessage: 'Panel lifetime: <emphasis>{value}</emphasis> seconds',
    description: 'Canonical panel lifetime shown in the expanded Info control.',
  },
  totalPanelsDecayed: {
    id: 'dyson.info.total-panels-decayed',
    defaultMessage: 'Total panels decayed: <emphasis>{value}</emphasis>',
    description: 'Canonical lifetime panel total shown in expanded Info.',
  },
  purchaseSettings: {
    id: 'dyson.info.purchase-settings',
    defaultMessage: 'Purchase settings',
    description:
      'Accessible label for the Unity Info-panel gear that opens building buy settings.',
  },
  purchaseAmount: {
    id: 'dyson.info.purchase-amount',
    defaultMessage: 'Building purchase amount',
    description: 'Heading for the canonical Dyson building buy mode.',
  },
  presetAutomation: {
    id: 'dyson.info.preset-automation',
    defaultMessage: 'Skill preset on opening Bots',
    description:
      'Label for choosing the skill preset automatically loaded when Bots opens.',
  },
  presetAutomationOff: {
    id: 'dyson.info.preset-automation-off',
    defaultMessage: 'Off',
    description:
      'Disables automatic skill preset loading when Bots opens.',
  },
  buyOne: {
    id: 'dyson.info.buy-mode.one',
    defaultMessage: 'x1',
    description: 'Purchase one building.',
  },
  buyTen: {
    id: 'dyson.info.buy-mode.ten',
    defaultMessage: 'x10',
    description: 'Purchase ten buildings.',
  },
  buyFifty: {
    id: 'dyson.info.buy-mode.fifty',
    defaultMessage: 'x50',
    description: 'Purchase fifty buildings.',
  },
  buyOneHundred: {
    id: 'dyson.info.buy-mode.one-hundred',
    defaultMessage: 'x100',
    description: 'Purchase one hundred buildings.',
  },
  buyMax: {
    id: 'dyson.info.buy-mode.max',
    defaultMessage: 'Max',
    description: 'Purchase the maximum canonically affordable buildings.',
  },
  roundedBulkBuy: {
    id: 'dyson.info.rounded-bulk-buy',
    defaultMessage: 'Round bulk purchases to the next milestone',
    description:
      'Unity building rounded-bulk setting controlled by the canonical command.',
  },
  purchaseSettingsFailed: {
    id: 'dyson.info.purchase-settings-failed',
    defaultMessage: 'Purchase settings were not changed.',
    description:
      'Failure feedback when a canonical Dyson buy-setting command is rejected.',
  },
  botDistribution: {
    id: 'dyson.bot-distribution.title',
    defaultMessage: 'Bot Distribution',
    description: 'Unity Bots allocation slider label.',
  },
  workerBots: {
    id: 'dyson.bot-distribution.workers',
    defaultMessage: 'Workers',
    description: 'Worker side of the bot allocation slider.',
  },
  scienceBots: {
    id: 'dyson.bot-distribution.scientists',
    defaultMessage: 'Scientists',
    description: 'Scientist side of the bot allocation slider.',
  },
  botDistributionAccessible: {
    id: 'dyson.bot-distribution.accessible-value',
    defaultMessage: '{workers} workers, {scientists} scientists',
    description: 'Accessible bot allocation slider value.',
  },
  distributionFailed: {
    id: 'dyson.bot-distribution.failed',
    defaultMessage: 'Distribution was not changed.',
    description: 'Failure feedback after a rejected allocation command.',
  },
  workerProduction: {
    id: 'dyson.production-summary.worker-production',
    defaultMessage:
      '<emphasis>{workers}</emphasis> Worker Bots producing <emphasis>{panels}</emphasis> Panels /s',
    description: 'Exact Unity lower-panel worker production line.',
  },
})
