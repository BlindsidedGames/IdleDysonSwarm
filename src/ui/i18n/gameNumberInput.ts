import { GAME_NUMBER_PREFIXES } from './gameNumberMagnitudes'
import {
  LOCALE_REGISTRY,
  type EnabledLocale,
} from './localeRegistry'

export interface ParsedGameNumberInput {
  readonly coefficient: bigint
  readonly exponent: number
}

export type GameNumberInputParseResult =
  | { readonly ok: true; readonly value: ParsedGameNumberInput }
  | { readonly ok: false; readonly reason: 'empty' | 'negative' | 'invalid' }

export type ContinuousGameNumberResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: 'above-maximum' }

export type DiscreteGameNumberResult =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly reason: 'non-integer' | 'above-maximum' }

const SUFFIXES = GAME_NUMBER_PREFIXES
  .map((suffix, index) => ({ suffix, index }))
  .filter(({ suffix }) => suffix.length > 0)
  .sort((left, right) => right.suffix.length - left.suffix.length)

interface NumberInputCulture {
  readonly decimal: string
  readonly group?: string
  readonly digits: ReadonlyMap<string, string>
}

const numberInputCultures = new Map<EnabledLocale, NumberInputCulture>()

export function parseGameNumberInput(
  input: string,
  locale: EnabledLocale = 'en',
): GameNumberInputParseResult {
  return parseGameNumberInputWithSign(input, locale, false)
}

/** Parses a signed resource adjustment while retaining the shared exact grammar. */
export function parseSignedGameNumberInput(
  input: string,
  locale: EnabledLocale = 'en',
): GameNumberInputParseResult {
  return parseGameNumberInputWithSign(input, locale, true)
}

function parseGameNumberInputWithSign(
  input: string,
  locale: EnabledLocale,
  allowNegative: boolean,
): GameNumberInputParseResult {
  let numericText = input.trim()
  if (numericText.length === 0) return { ok: false, reason: 'empty' }
  let sign = 1n
  if (numericText.startsWith('-')) {
    if (!allowNegative) return { ok: false, reason: 'negative' }
    sign = -1n
    numericText = numericText.slice(1).trimStart()
    if (numericText.length === 0) return { ok: false, reason: 'invalid' }
  }

  let magnitudeExponent = 0
  for (const { suffix, index } of SUFFIXES) {
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = numericText.match(
      new RegExp(`^(.*?)(?:\\s*[x×]\\s*|\\s*)${escaped}$`, 'i'),
    )
    if (match?.[1]?.trim()) {
      numericText = match[1].trim()
      magnitudeExponent = index * 3
      break
    }
  }

  let normalized = normalizeLocalizedNumericText(numericText, locale)
  normalized = normalized.replace(
    /^(\+?)e(?=[+-]?\d+$)/i,
    (_match, plus: string) => `${plus}1e`,
  )
  const match = normalized.match(
    /^\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i,
  )
  if (!match) return { ok: false, reason: 'invalid' }
  const whole = match[1] ?? '0'
  const fraction = match[2] ?? match[3] ?? ''
  const authoredExponent = Number(match[4] ?? 0)
  if (!Number.isSafeInteger(authoredExponent)) {
    return { ok: false, reason: 'invalid' }
  }
  const coefficient = BigInt(`${whole}${fraction}`) * sign
  return {
    ok: true,
    value: {
      coefficient,
      exponent: authoredExponent + magnitudeExponent - fraction.length,
    },
  }
}

/** Converts localized digits and separators to the parser's exact syntax. */
export function normalizeLocalizedNumericText(
  input: string,
  locale: EnabledLocale,
): string {
  const culture = numberInputCulture(locale)
  let normalized = input
  for (const [localized, ascii] of culture.digits) {
    normalized = normalized.replaceAll(localized, ascii)
  }
  normalized = normalized.replaceAll(/[\u061c\u200e\u200f]/gu, '')
  if (culture.group !== undefined) {
    normalized = normalized.replaceAll(culture.group, '')
  }
  if (culture.decimal !== '.') {
    normalized = normalized.replaceAll(culture.decimal, '.')
  }
  return normalized.replace(/[_\s]/gu, '')
}

function numberInputCulture(locale: EnabledLocale): NumberInputCulture {
  const cached = numberInputCultures.get(locale)
  if (cached !== undefined) return cached

  const languageTag = LOCALE_REGISTRY[locale].languageTag
  const formatter = new Intl.NumberFormat(languageTag, {
    useGrouping: true,
    maximumFractionDigits: 1,
  })
  const parts = formatter.formatToParts(12_345.6)
  const culture: NumberInputCulture = {
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    group: parts.find((part) => part.type === 'group')?.value,
    digits: new Map(
      Array.from({ length: 10 }, (_, digit) => [
        new Intl.NumberFormat(languageTag, { useGrouping: false }).format(digit),
        String(digit),
      ]),
    ),
  }
  numberInputCultures.set(locale, culture)
  return culture
}

export function toContinuousGameNumber(
  parsed: ParsedGameNumberInput,
): ContinuousGameNumberResult {
  if (parsed.coefficient === 0n) return { ok: true, value: 0 }
  const value = Number(`${parsed.coefficient}e${parsed.exponent}`)
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, reason: 'above-maximum' }
}

export function toDiscreteGameNumber(
  parsed: ParsedGameNumberInput,
  maximum: bigint,
): DiscreteGameNumberResult {
  if (parsed.coefficient === 0n) return { ok: true, value: 0n }
  if (maximum < 0n) return { ok: false, reason: 'above-maximum' }
  const negative = parsed.coefficient < 0n
  const magnitude = negative ? -parsed.coefficient : parsed.coefficient
  if (parsed.exponent >= 0) {
    const maximumDigits = maximum.toString().length
    const resultDigits = magnitude.toString().length + parsed.exponent
    if (resultDigits > maximumDigits) {
      return { ok: false, reason: 'above-maximum' }
    }
    const magnitudeValue = magnitude * 10n ** BigInt(parsed.exponent)
    return magnitudeValue <= maximum
      ? { ok: true, value: negative ? -magnitudeValue : magnitudeValue }
      : { ok: false, reason: 'above-maximum' }
  }
  const divisorExponent = -parsed.exponent
  if (divisorExponent > magnitude.toString().length) {
    return { ok: false, reason: 'non-integer' }
  }
  const divisor = 10n ** BigInt(divisorExponent)
  if (magnitude % divisor !== 0n) {
    return { ok: false, reason: 'non-integer' }
  }
  const magnitudeValue = magnitude / divisor
  return magnitudeValue <= maximum
    ? { ok: true, value: negative ? -magnitudeValue : magnitudeValue }
    : { ok: false, reason: 'above-maximum' }
}
