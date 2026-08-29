import { formatInfinityPointAmount } from '../../components/infinityPointFormatting'
import {
  parseGameNumberInput,
  toDiscreteGameNumber,
} from '../../i18n/gameNumberInput'
import type { EnabledLocale } from '../../i18n/localeRegistry'

export const MAXIMUM_INFINITY_TARGET = 2_147_483_647n

/** Compact presentation for the editable Auto Infinity target. */
export function formatAutoInfinityTargetInput(
  locale: EnabledLocale,
  value: bigint,
): string {
  return formatInfinityPointAmount(locale, value)
}

export type InfinityTargetParseResult =
  | { readonly ok: true; readonly value: bigint }
  | {
      readonly ok: false
      readonly reason: 'empty' | 'malformed' | 'non-positive' | 'non-integer' | 'too-large'
    }

/** Parses an exact game-number input using the player's active culture. */
export function parseInfinityTargetInput(
  input: string,
  locale: EnabledLocale = 'en',
): InfinityTargetParseResult {
  const normalized = input.trim().replace(/\s*ip$/i, '').trim()
  const parsed = parseGameNumberInput(normalized, locale)
  if (!parsed.ok) {
    return {
      ok: false,
      reason: parsed.reason === 'empty'
        ? 'empty'
        : parsed.reason === 'negative'
          ? 'non-positive'
          : 'malformed',
    }
  }
  const discrete = toDiscreteGameNumber(parsed.value, MAXIMUM_INFINITY_TARGET)
  if (!discrete.ok) {
    return discrete.reason === 'above-maximum'
      ? { ok: true, value: MAXIMUM_INFINITY_TARGET }
      : { ok: false, reason: 'non-integer' }
  }
  return discrete.value < 1n
    ? { ok: false, reason: 'non-positive' }
    : { ok: true, value: discrete.value }
}

/**
 * A compact display string is intentionally lossy. Until the player edits it,
 * retain the exact canonical value instead of reparsing the abbreviation.
 */
export function resolveInfinityTargetDraft(
  input: string,
  currentTarget: bigint,
  edited: boolean,
  locale: EnabledLocale = 'en',
): InfinityTargetParseResult {
  return edited
    ? parseInfinityTargetInput(input, locale)
    : { ok: true, value: currentTarget }
}
