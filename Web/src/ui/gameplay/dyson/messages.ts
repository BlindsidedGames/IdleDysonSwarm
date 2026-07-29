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
  workerProduction: {
    id: 'dyson.production-summary.worker-production',
    defaultMessage:
      '{workers} Worker Bots producing {panels} Panels /s',
    description: 'Exact Unity lower-panel worker production line.',
  },
  scienceProduction: {
    id: 'dyson.production-summary.science-production',
    defaultMessage:
      '{scientists} Science Bots producing {science} /s',
    description:
      'Unity lower-panel science production line with the science icon represented by its surrounding context.',
  },
})
