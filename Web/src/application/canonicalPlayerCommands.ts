import {
  CANONICAL_GAME_COMMAND_KINDS,
  CANONICAL_GAME_COMMAND_SUPPORT,
} from './canonicalGameCommandSupport'
import type { CanonicalGameCommand } from './canonicalGameCommands'

/**
 * Complete frontend-dispatchable intent union. Internal away-time, bot-cap,
 * and stored-time continuation commands remain facade-private.
 */
export type CanonicalPlayerCommand =
  | CanonicalGameCommand
  | { readonly kind: 'tinker.start'; readonly repeat: boolean }
  | { readonly kind: 'tinker.set-repeat'; readonly enabled: boolean }

export type CanonicalPlayerCommandKind =
  CanonicalPlayerCommand['kind']

export const CANONICAL_PLAYER_COMMAND_SUPPORT = Object.freeze({
  ...CANONICAL_GAME_COMMAND_SUPPORT,
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
  'tinker.start',
  'tinker.set-repeat',
] as const satisfies readonly CanonicalPlayerCommandKind[])
