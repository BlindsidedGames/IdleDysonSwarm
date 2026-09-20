import { defineMessages } from 'react-intl'

export const boostMessages = defineMessages({
  title: { id: 'store.boost.title', defaultMessage: '2× Bots' },
  description: { id: 'store.boost.description', defaultMessage: 'Double Bot gains for 5 minutes. Stack up to 10 minutes.' },
  activate: { id: 'store.boost.activate', defaultMessage: 'Activate' },
  add: { id: 'store.boost.add', defaultMessage: 'Add 5 min' },
  claim: { id: 'store.boost.claim', defaultMessage: 'Claim 5 min' },
  ready: { id: 'store.boost.ready', defaultMessage: 'Ready' },
  active: { id: 'store.boost.active', defaultMessage: '{time} remaining' },
  wait: { id: 'store.boost.wait', defaultMessage: 'Top up at 5:00' },
  permanent: { id: 'store.boost.permanent', defaultMessage: 'Permanent' },
  permanentTitle: { id: 'store.boost.permanent-title', defaultMessage: 'Permanent 2× Bots' },
  permanentDescription: { id: 'store.boost.permanent-description', defaultMessage: 'Double Bot gains without promotions. Can be switched off.' },
  games: { id: 'store.boost.games', defaultMessage: 'More games' },
  promotion: { id: 'store.boost.promotion', defaultMessage: 'Game promotion' },
  play: { id: 'store.boost.play', defaultMessage: 'Play {game}' },
  close: { id: 'store.boost.close', defaultMessage: 'Close' },
  failed: { id: 'store.boost.failed', defaultMessage: 'The boost could not be updated. Try again.' },
  navigation: { id: 'store.boost.navigation', defaultMessage: 'Store: 2× Bots, {status}' },
  used: { id: 'statistics.bot-boost-used', defaultMessage: 'Bot Boost Used' },
})
