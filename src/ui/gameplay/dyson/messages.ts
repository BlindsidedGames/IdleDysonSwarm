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
  menuHeading: {
    id: 'dyson.menu.heading',
    defaultMessage: 'Menu',
    description: 'Visible heading for the responsive game menu.',
  },
  closeMenu: {
    id: 'dyson.menu.close',
    defaultMessage: 'Close menu',
    description: 'Closes the compact game menu.',
  },
  openMenu: {
    id: 'dyson.menu.open',
    defaultMessage: 'Open menu',
    description: 'Opens the compact game menu.',
  },
  moreMenu: {
    id: 'dyson.menu.more',
    defaultMessage: 'More',
    description: 'Visible label for the bottom navigation drawer affordance.',
  },
  moreMenuNew: {
    id: 'dyson.menu.more-new',
    defaultMessage: 'More, new content',
    description:
      'Accessible label when a newly unlocked route is inside the responsive menu.',
  },
  infinityRouteNew: {
    id: 'dyson.navigation.infinity-new',
    defaultMessage: 'Infinity, new',
    description:
      'Accessible label for the newly unlocked Infinity destination.',
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
  realityRoute: {
    id: 'navigation.reality',
    defaultMessage: 'Reality',
    description: 'Unity Reality destination.',
  },
  simulationsRoute: {
    id: 'navigation.simulations',
    defaultMessage: 'Simulations',
    description: 'Unity live Simulations destination.',
  },
  quantumRoute: {
    id: 'navigation.quantum',
    defaultMessage: 'Quantum',
    description: 'Unity Quantum destination.',
  },
  quantumControls: {
    id: 'dyson.route.quantum.controls',
    defaultMessage: 'Quantum controls',
    description: 'Accessible name for the fixed Quantum progress and purchase controls.',
  },
  quantumProgress: {
    id: 'navigation.quantum-progress',
    defaultMessage: '{destination}, {current} of {required} Infinity Points',
    description:
      'Accessible Infinity Point unlock progress for a visible but locked destination.',
  },
  avocatoRoute: {
    id: 'navigation.avocato',
    defaultMessage: 'Avocato',
    description: 'Unity Avocato sub-destination.',
  },
  statisticsRoute: {
    id: 'navigation.statistics',
    defaultMessage: 'Statistics',
    description: 'Statistics destination.',
  },
  storeRoute: {
    id: 'navigation.store',
    defaultMessage: 'Store',
    description: 'Native-only Store destination.',
  },
  realitySecretsProgress: {
    id: 'navigation.reality-secrets-progress',
    defaultMessage:
      '{destination}, {current} of {required} Secrets of the Universe',
    description:
      'Accessible Secret unlock progress for a visible but locked destination.',
  },
  infinityBotsProgress: {
    id: 'navigation.infinity-bots-progress',
    defaultMessage: '{destination}, {current} of {required} Bots',
    description:
      'Accessible Bot unlock progress for the visible but locked Infinity destination.',
  },
  simulationsInfluenceProgress: {
    id: 'navigation.simulations-influence-progress',
    defaultMessage: '{destination}, {current} of {required} Influence gathered',
    description:
      'Accessible manual Influence unlock progress for the visible but locked Simulations destination.',
  },
  infinityRouteGain: {
    id: 'navigation.infinity-gain',
    defaultMessage: 'Infinity +{value}',
    description:
      'Unity Infinity destination with the canonical projected Break reward.',
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
  offlineTimeProgress: {
    id: 'navigation.offline-time-progress',
    defaultMessage: 'Offline Time, {stored} of {capacity} stored',
    description:
      'Accessible storage progress for the Offline Time destination.',
  },
  settingsRoute: {
    id: 'navigation.settings',
    defaultMessage: 'Settings',
    description: 'Unity Settings destination.',
  },
  debugRoute: {
    id: 'navigation.debug-options',
    defaultMessage: 'Debug Options',
    description: 'Development-only Unity Debug Options destination.',
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
  compactActivePanels: {
    id: 'dyson.info.compact.active-panels',
    defaultMessage: 'Active: <emphasis>{value}</emphasis>',
    description: 'Compact active panel fact in the Bots summary.',
  },
  compactStarsSurrounded: {
    id: 'dyson.info.compact.stars-surrounded',
    defaultMessage: 'Stars: <emphasis>{value}</emphasis>',
    description: 'Compact stars-surrounded fact in the Bots summary.',
  },
  compactGalaxiesEngulfed: {
    id: 'dyson.info.compact.galaxies-engulfed',
    defaultMessage: 'Galaxies: <emphasis>{value}</emphasis>',
    description: 'Compact galaxies-engulfed fact in the Bots summary.',
  },
  compactPanelLifetime: {
    id: 'dyson.info.compact.panel-lifetime',
    defaultMessage: 'Lifetime: <emphasis>{value}s</emphasis>',
    description: 'Compact panel-lifetime fact in the Bots summary.',
  },
  compactTotalPanelsDecayed: {
    id: 'dyson.info.compact.total-panels-decayed',
    defaultMessage: 'Decayed: <emphasis>{value}</emphasis>',
    description: 'Compact total-panels-decayed fact in the Bots summary.',
  },
  compactGoalBots: {
    id: 'dyson.info.compact.goal-bots',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Bots</emphasis>',
    description: 'Compact Bot goal in the Bots summary.',
  },
  compactGoalAssemblyLines: {
    id: 'dyson.info.compact.goal-assembly-lines',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Lines</emphasis>',
    description: 'Compact Assembly Line goal in the Bots summary.',
  },
  compactGoalPanels: {
    id: 'dyson.info.compact.goal-panels',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Panels</emphasis>',
    description: 'Compact active Panel goal in the Bots summary.',
  },
  compactGoalPlanets: {
    id: 'dyson.info.compact.goal-planets',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Planets</emphasis>',
    description: 'Compact Planet goal in the Bots summary.',
  },
  compactGoalDecayed: {
    id: 'dyson.info.compact.goal-decayed',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Decayed</emphasis>',
    description: 'Compact decayed Panel goal in the Bots summary.',
  },
  compactGoalStars: {
    id: 'dyson.info.compact.goal-stars',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Stars</emphasis>',
    description: 'Compact Star goal in the Bots summary.',
  },
  compactGoalGalaxies: {
    id: 'dyson.info.compact.goal-galaxies',
    defaultMessage: 'Goal: <emphasis>{targetDisplay} Galaxies</emphasis>',
    description: 'Compact Galaxy goal in the Bots summary.',
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
  autoPurchase: {
    id: 'dyson.settings.auto-purchase',
    defaultMessage: 'Auto-purchase',
    description: 'Heading for per-facility Bots automation controls.',
  },
  toggleAll: {
    id: 'dyson.settings.auto-purchase-toggle-all',
    defaultMessage: 'Toggle All',
    description: 'Sets every visible Bots auto-purchase option together.',
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
  presetPartiallyApplied: {
    id: 'dyson.info.preset-partially-applied',
    defaultMessage:
      '{presetName} was partially applied. {retainedCount, plural, one {# unrefundable skill remains assigned} other {# unrefundable skills remain assigned}}, leaving {blockedCount, plural, one {# preset skill queued for later} other {# preset skills queued for later}}. Open Skills for details.',
    description:
      'Non-blocking result after an automatic tab preset switch is constrained by retained skills.',
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
  botMultitaskingEfficiency: {
    id: 'dyson.bot-distribution.multitasking-efficiency',
    defaultMessage:
      '<workers>Workers</workers> and <science>Scientists</science> efficiency at 100%',
    description:
      'Compact bot efficiency summary shown after Bot Multitasking is purchased. Workers and Scientists are separately color-coded.',
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
