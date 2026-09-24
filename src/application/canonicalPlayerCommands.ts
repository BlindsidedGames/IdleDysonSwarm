import {
  CANONICAL_GAME_COMMAND_KINDS,
  CANONICAL_GAME_COMMAND_SUPPORT,
  type CanonicalGameCommand,
} from './canonicalGameCommands'

/**
 * Complete frontend-dispatchable intent union. Internal away-time and bot-cap
 * checkpoint commands remain facade-private.
 */
export type CanonicalPlayerCommand =
  | CanonicalGameCommand
  | { readonly kind: 'challenge.enter-blank-slate' }
  | { readonly kind: 'challenge.enter-trial-and-error' }
  | { readonly kind: 'challenge.enter-no-science' }
  | { readonly kind: 'challenge.abandon' }
  | { readonly kind: 'avocado.request-overflow-reset' }
  | { readonly kind: 'tinker.start'; readonly repeat: boolean }
  | { readonly kind: 'tinker.set-repeat'; readonly enabled: boolean }

export type CanonicalPlayerCommandKind =
  CanonicalPlayerCommand['kind']

export const CANONICAL_PLAYER_COMMAND_SUPPORT = Object.freeze({
  ...CANONICAL_GAME_COMMAND_SUPPORT,
  'challenge.enter-trial-and-error': { supported: true, authority: 'restartInfinityChallenge' },
  'challenge.enter-blank-slate': { supported: true, authority: 'restartInfinityChallenge' },
  'challenge.enter-no-science': { supported: true, authority: 'restartInfinityChallenge' },
  'challenge.abandon': { supported: true, authority: 'restartInfinityChallenge' },
  'avocado.request-overflow-reset': Object.freeze({
    supported: true,
    authority: 'applyCanonicalOverflowReset',
  }),
  'tinker.start': Object.freeze({
    supported: true,
    authority: 'CanonicalEventTimeModel.startTinker',
  }),
  'tinker.set-repeat': Object.freeze({
    supported: true,
    authority: 'CanonicalEventTimeModel.setTinkerRepeat',
  }),
} as const satisfies Readonly<
  Record<
    CanonicalPlayerCommandKind,
    {
      readonly supported: boolean
      readonly authority: string
      readonly requires?: readonly string[]
    }
  >
>)

export const CANONICAL_PLAYER_COMMAND_KINDS = Object.freeze([
  ...CANONICAL_GAME_COMMAND_KINDS,
  'challenge.enter-blank-slate',
  'challenge.enter-trial-and-error',
  'challenge.enter-no-science',
  'challenge.abandon',
  'avocado.request-overflow-reset',
  'tinker.start',
  'tinker.set-repeat',
] as const satisfies readonly CanonicalPlayerCommandKind[])
