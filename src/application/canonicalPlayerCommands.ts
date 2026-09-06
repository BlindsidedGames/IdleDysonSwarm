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
  | { readonly kind: 'avocado.request-overflow-reset' }
  | { readonly kind: 'tinker.start'; readonly repeat: boolean }
  | { readonly kind: 'tinker.set-repeat'; readonly enabled: boolean }

export type CanonicalPlayerCommandKind =
  CanonicalPlayerCommand['kind']

export const CANONICAL_PLAYER_COMMAND_SUPPORT = Object.freeze({
  ...CANONICAL_GAME_COMMAND_SUPPORT,
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
  'avocado.request-overflow-reset',
  'tinker.start',
  'tinker.set-repeat',
] as const satisfies readonly CanonicalPlayerCommandKind[])
