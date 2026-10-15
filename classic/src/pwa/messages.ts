import { defineMessages } from 'react-intl'

export const pwaUpdateMessages = defineMessages({
  title: {
    id: 'pwa.update.title',
    defaultMessage: 'Update ready',
    description: 'Heading for the non-blocking installed PWA update prompt.',
  },
  body: {
    id: 'pwa.update.body',
    defaultMessage: 'A new version has downloaded. Save your progress before applying it.',
    description: 'Explanation shown when a background PWA update is waiting.',
  },
  accept: {
    id: 'pwa.update.accept',
    defaultMessage: 'Save and update',
    description: 'Explicit action that checkpoints the game before activating a waiting PWA update.',
  },
  applying: {
    id: 'pwa.update.applying',
    defaultMessage: 'Saving progress and applying the update…',
    description: 'Status shown while a waiting PWA update is being safely activated.',
  },
  failed: {
    id: 'pwa.update.failed',
    defaultMessage: 'The update was not applied. Your current game remains open.',
    description: 'Failure message when a checkpoint prevents PWA update activation.',
  },
  retry: {
    id: 'pwa.update.retry',
    defaultMessage: 'Try again',
    description: 'Action that retries safe activation of a waiting PWA update.',
  },
})
