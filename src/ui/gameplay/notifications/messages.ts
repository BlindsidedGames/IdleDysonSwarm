import { defineMessages } from 'react-intl'

export const gameplayNotificationMessages = defineMessages({
  catalystEarned: { id: 'gameplay.notifications.catalyst-earned', defaultMessage: '+{count} {count, plural, one {Catalyst} other {Catalysts}}', description: 'Timed notice for newly awarded Simulation catalysts.' },
  firstCatalystTitle: { id: 'gameplay.notifications.first-catalyst-title', defaultMessage: 'Your first Catalyst', description: 'First catalyst reward popup heading.' },
  firstCatalystBody: { id: 'gameplay.notifications.first-catalyst-body', defaultMessage: 'You earned {count, plural, one {a Catalyst} other {{count} Catalysts}}. Spend Catalysts in Skills to permanently fracture a base skill. Fractured skills stay active without using Skill Points and have their downsides disabled.', description: 'Explains the purpose of the first awarded catalysts.' },
  viewSkills: { id: 'gameplay.notifications.view-skills', defaultMessage: 'View Skills', description: 'Open Skills from the first catalyst popup.' },
  continue: {
    id: 'gameplay.notifications.continue',
    defaultMessage: 'Continue',
    description: 'Primary action dismissing a first-disaster dialog.',
  },
  viewCountermeasures: {
    id: 'gameplay.notifications.view-countermeasures',
    defaultMessage: 'View Countermeasures',
    description: 'Dismisses a disaster dialog and opens the Reality tab.',
  },
  meteorTitle: {
    id: 'gameplay.notifications.disaster.meteor.title',
    defaultMessage: 'Meteor Storm',
    description: 'Title for a Meteor Storm disaster notification.',
  },
  aiTitle: {
    id: 'gameplay.notifications.disaster.ai.title',
    defaultMessage: 'AI Overlords',
    description: 'Title for an AI Overlords disaster notification.',
  },
  globalWarmingTitle: {
    id: 'gameplay.notifications.disaster.global-warming.title',
    defaultMessage: 'Global Warming',
    description: 'Title for a Global Warming disaster notification.',
  },
  meteorDialog: {
    id: 'gameplay.notifications.disaster.meteor.dialog',
    defaultMessage: 'The simulated world was destroyed by a meteor storm. Simulation progress has reset and you gained {reward} Strange Matter. Purchase Counteract Meteor Storm in the Reality tab to survivive it.',
    description: 'First Meteor Storm disaster explanation.',
  },
  aiDialog: {
    id: 'gameplay.notifications.disaster.ai.dialog',
    defaultMessage: 'The simulated world was taken over by AI Overlords. Simulation progress has reset and you gained {reward} Strange Matter. Purchase Counteract AI Overlords in the Reality tab to survivive it.',
    description: 'First AI Overlords disaster explanation.',
  },
  globalWarmingDialog: {
    id: 'gameplay.notifications.disaster.global-warming.dialog',
    defaultMessage: 'The simulated world was destroyed by global warming. Simulation progress has reset and you gained {reward} Strange Matter. Purchase Counteract Global Warming in the Reality tab to survivive it.',
    description: 'First Global Warming disaster explanation.',
  },
  disasterBanner: {
    id: 'gameplay.notifications.disaster.repeat',
    defaultMessage: '{cause} reset the Simulation · +{reward} Strange Matter',
    description: 'Timed notification for one repeat automatic disaster.',
  },
  disasterBannerMultiple: {
    id: 'gameplay.notifications.disaster.repeat-multiple',
    defaultMessage: '{cause} reset {count} Simulations · +{reward} Strange Matter',
    description: 'Timed notification for coalesced repeat automatic disasters.',
  },
})
