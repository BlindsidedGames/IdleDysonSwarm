import { defineMessages, type MessageDescriptor } from 'react-intl'

/**
 * Shared player-facing messages. IDs are stable presentation contracts and
 * every descriptor carries translator context. Destination messages belong in
 * their destination chunk rather than this startup catalog.
 */
export const sharedMessages = defineMessages({
  loading: {
    id: 'shared.status.loading',
    defaultMessage: 'Loading…',
    description:
      'Short status shown while a player-facing operation is in progress.',
  },
  ready: {
    id: 'shared.status.ready',
    defaultMessage: 'Ready',
    description:
      'Short status shown when the requested player-facing surface is ready.',
  },
  success: {
    id: 'shared.status.success',
    defaultMessage: 'Completed',
    description:
      'Short status confirming that a player-requested operation completed.',
  },
  error: {
    id: 'shared.status.error',
    defaultMessage: 'Something went wrong',
    description:
      'General player-facing error heading; specific recovery detail follows it.',
  },
  dismiss: {
    id: 'shared.action.dismiss',
    defaultMessage: 'Dismiss',
    description:
      'Button label that closes non-destructive status feedback.',
  },
  tryAgain: {
    id: 'shared.action.try-again',
    defaultMessage: 'Try again',
    description:
      'Button label that repeats a safe presentation or loading operation.',
  },
  ownedCount: {
    id: 'shared.facility.owned-count',
    defaultMessage: '{count, plural, one {# owned} other {# owned}}',
    description:
      'Owned quantity for a facility. count is the canonical owned quantity.',
  },
  progressValue: {
    id: 'shared.progress.value',
    defaultMessage: '{current, number} of {maximum, number}',
    description:
      'Text equivalent for determinate progress using canonical current and maximum values.',
  },
  localeChanged: {
    id: 'shared.locale.changed',
    defaultMessage: 'Language changed to {languageName}',
    description:
      'Polite announcement after the presentation language changes. languageName is localized.',
  },
} as const satisfies Record<string, MessageDescriptor>)

export type SharedMessageName = keyof typeof sharedMessages
export type SharedMessageId =
  (typeof sharedMessages)[SharedMessageName]['id']
