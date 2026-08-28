import { GAME_NUMBER_PREFIXES } from './gameNumberMagnitudes'

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

export function parseGameNumberInput(input: string): GameNumberInputParseResult {
  let numericText = input.trim()
  if (numericText.length === 0) return { ok: false, reason: 'empty' }
  if (numericText.startsWith('-')) return { ok: false, reason: 'negative' }

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

  const normalized = numericText.replace(/[,_\s]/g, '')
  const match = normalized.match(
    /^\+?(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i,
  )
  if (!match) return { ok: false, reason: 'invalid' }
  const fraction = match[2] ?? ''
  const authoredExponent = Number(match[3] ?? 0)
  if (!Number.isSafeInteger(authoredExponent)) {
    return { ok: false, reason: 'invalid' }
  }
  const coefficient = BigInt(`${match[1]}${fraction}`)
  return {
    ok: true,
    value: {
      coefficient,
      exponent: authoredExponent + magnitudeExponent - fraction.length,
    },
  }
}

export function toContinuousGameNumber(
  parsed: ParsedGameNumberInput,
): ContinuousGameNumberResult {
  if (parsed.coefficient === 0n) return { ok: true, value: 0 }
  const value = Number(`${parsed.coefficient}e${parsed.exponent}`)
  return Number.isFinite(value) && value >= 0
    ? { ok: true, value }
    : { ok: false, reason: 'above-maximum' }
}

export function toDiscreteGameNumber(
  parsed: ParsedGameNumberInput,
  maximum: bigint,
): DiscreteGameNumberResult {
  if (parsed.coefficient === 0n) return { ok: true, value: 0n }
  if (parsed.exponent >= 0) {
    const maximumDigits = maximum.toString().length
    const resultDigits = parsed.coefficient.toString().length + parsed.exponent
    if (resultDigits > maximumDigits) {
      return { ok: false, reason: 'above-maximum' }
    }
    const value = parsed.coefficient * 10n ** BigInt(parsed.exponent)
    return value <= maximum
      ? { ok: true, value }
      : { ok: false, reason: 'above-maximum' }
  }
  const divisorExponent = -parsed.exponent
  if (divisorExponent > parsed.coefficient.toString().length) {
    return { ok: false, reason: 'non-integer' }
  }
  const divisor = 10n ** BigInt(divisorExponent)
  if (parsed.coefficient % divisor !== 0n) {
    return { ok: false, reason: 'non-integer' }
  }
  const value = parsed.coefficient / divisor
  return value <= maximum
    ? { ok: true, value }
    : { ok: false, reason: 'above-maximum' }
}
