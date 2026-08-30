import type { EnabledLocale } from './localeRegistry'
import {
  getActiveNumberNotation,
  type NumberNotationMode,
} from '../number-notation'
import { GAME_NUMBER_PREFIXES } from './gameNumberMagnitudes'

export type NumericValue = number | bigint
export const NON_FINITE_NUMBER_FALLBACK = '—'
export const CAPPED_GAME_DURATION_LABEL = 'MAX'
export const MIXED_NOTATION_SCIENTIFIC_THRESHOLD = 1e21

const MIXED_NOTATION_SCIENTIFIC_BIGINT_THRESHOLD = 10n ** 21n

const GAME_ENERGY_PREFIXES = Object.freeze({
  joules: Object.freeze([
    'J', 'KJ', 'MJ', 'GJ', 'TJ', 'PJ', 'EJ', 'ZJ', 'YJ', 'RJ', 'QJ',
    'UJ', 'DJ', 'TrJ', 'QaJ', 'QiJ', 'SxJ', 'SpJ', 'OcJ', 'NoJ', 'DcJ',
  ] as const),
  watts: Object.freeze([
    'W', 'KW', 'MW', 'GW', 'TW', 'PW', 'EW', 'ZW', 'YW', 'RW', 'QW',
    'UW', 'DW', 'TrW', 'QaW', 'QiW', 'SxW', 'SpW', 'OcW', 'NoW', 'DcW',
  ] as const),
})

export type GameEnergyUnit = keyof typeof GAME_ENERGY_PREFIXES

export interface GameNumberParts {
  readonly value: string
  readonly suffix: string
}

export interface GameEnergyParts {
  readonly value: string
  readonly unit: string
}

export interface GameNumberFormatOptions {
  /**
   * Rounds values below 100 to a whole number while preserving the normal
   * three-significant-digit presentation from 100 onward.
   */
  readonly wholeBelowHundred?: boolean
  readonly notation?: NumberNotationMode
}

const numberFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>()
const pluralRulesFormatters = new Map<string, Intl.PluralRules>()

export function getNumberFormatter(
  locale: EnabledLocale,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
  return cached(
    numberFormatters,
    cacheKey(locale, options),
    () => new Intl.NumberFormat(locale, options),
  )
}

export function formatNumber(
  locale: EnabledLocale,
  value: NumericValue,
  options: Intl.NumberFormatOptions = {},
): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return NON_FINITE_NUMBER_FALLBACK
  }
  return getNumberFormatter(locale, options).format(value)
}

/**
 * Rounds to three significant digits while retaining locale-appropriate
 * decimal digits. This is display formatting only; canonical values and
 * gameplay calculations remain untouched.
 */
export function formatGameNumber(
  locale: EnabledLocale,
  value: NumericValue,
  options: GameNumberFormatOptions = {},
): string {
  const parts = formatGameNumberParts(locale, value, options)
  return `${parts.value}${parts.suffix}`
}

/** @deprecated Prefer formatGameNumber with wholeBelowHundred enabled. */
export function formatWholeGameNumber(
  locale: EnabledLocale,
  value: NumericValue,
  notation: NumberNotationMode = getActiveNumberNotation(),
): string {
  return formatGameNumber(locale, value, {
    notation,
    wholeBelowHundred: true,
  })
}

export function formatGameNumberParts(
  locale: EnabledLocale,
  value: NumericValue,
  options: GameNumberFormatOptions = {},
): GameNumberParts {
  const notation = options.notation ?? getActiveNumberNotation()
  if (typeof value === 'bigint') {
    if (value > 1000n || value < -1000n) {
      return formatLargeGameBigIntParts(locale, value, notation)
    }
    return formatGameNumberParts(locale, Number(value), options)
  }
  if (!Number.isFinite(value)) {
    return { value: NON_FINITE_NUMBER_FALLBACK, suffix: '' }
  }
  if (options.wholeBelowHundred && Math.abs(value) < 100) {
    return {
      value: formatNumber(locale, value, {
        maximumFractionDigits: 0,
        useGrouping: false,
      }),
      suffix: '',
    }
  }
  if (value === 0) {
    return {
      value: formatNumber(locale, 0, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
      }),
      suffix: '',
    }
  }

  const roundedValue = roundToThreeSignificantDigits(value)
  const resolvedNotation = resolveNumberNotation(notation, Math.abs(value))

  if (
    (Math.abs(value) > 1000 || Math.abs(roundedValue) > 1000) &&
    resolvedNotation !== 'standard'
  ) {
    return formatExponentNumberParts(locale, roundedValue, resolvedNotation)
  }

  const absolute = Math.abs(roundedValue)
  const exponentGroup = Math.max(
    Math.floor(Math.log10(absolute) / 3),
    0,
  )
  if (exponentGroup >= GAME_NUMBER_PREFIXES.length) {
    return { value: value.toExponential(2), suffix: '' }
  }

  const scale = 10 ** (exponentGroup * 3)
  const mantissa = roundedValue / scale
  const mantissaAbsolute = Math.abs(mantissa)
  const integerDigits =
    mantissaAbsolute < 1
      ? 1
      : Math.floor(Math.log10(mantissaAbsolute)) + 1
  const fractionDigits = Math.max(0, 3 - integerDigits)
  const formatted = formatNumber(locale, mantissa, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  })
  return {
    value: formatted,
    suffix: GAME_NUMBER_PREFIXES[exponentGroup],
  }
}

function formatLargeGameBigIntParts(
  locale: EnabledLocale,
  value: bigint,
  notation: NumberNotationMode,
): GameNumberParts {
  const negative = value < 0n
  const absoluteValue = negative ? -value : value
  const digits = absoluteValue.toString()
  let significantDigits = Number(digits.slice(0, 3))
  if (digits.length > 3 && Number(digits[3]) >= 5) {
    significantDigits += 1
  }
  const carried = significantDigits === 1000
  if (carried) significantDigits = 100
  const effectiveLength = digits.length + (carried ? 1 : 0)
  const resolvedNotation = resolveBigIntNumberNotation(
    notation,
    absoluteValue,
  )
  const exponentGroup = Math.floor((effectiveLength - 1) / 3)
  const exponent = resolvedNotation === 'scientific'
    ? effectiveLength - 1
    : exponentGroup * 3
  const integerDigits = effectiveLength - exponent
  const fractionDigits = Math.max(0, 3 - integerDigits)
  const mantissa = significantDigits / 10 ** fractionDigits
  const formatted = formatNumber(locale, negative ? -mantissa : mantissa, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  })

  if (resolvedNotation !== 'standard') {
    return { value: formatted, suffix: `e${exponent}` }
  }
  return exponentGroup < GAME_NUMBER_PREFIXES.length
    ? { value: formatted, suffix: GAME_NUMBER_PREFIXES[exponentGroup] }
    : { value: `${formatted}e${exponentGroup * 3}`, suffix: '' }
}

type ResolvedNumberNotation = Exclude<NumberNotationMode, 'mixed'>

function resolveNumberNotation(
  notation: NumberNotationMode,
  absoluteValue: number,
): ResolvedNumberNotation {
  if (notation !== 'mixed') return notation
  return absoluteValue >= MIXED_NOTATION_SCIENTIFIC_THRESHOLD
    ? 'scientific'
    : 'standard'
}

function resolveBigIntNumberNotation(
  notation: NumberNotationMode,
  absoluteValue: bigint,
): ResolvedNumberNotation {
  if (notation !== 'mixed') return notation
  return absoluteValue >= MIXED_NOTATION_SCIENTIFIC_BIGINT_THRESHOLD
    ? 'scientific'
    : 'standard'
}

function formatExponentNumberParts(
  locale: EnabledLocale,
  value: number,
  notation: Exclude<NumberNotationMode, 'standard'>,
): GameNumberParts {
  const absolute = Math.abs(value)
  const scientificExponent = Math.floor(Math.log10(absolute))
  const exponent = notation === 'scientific'
    ? scientificExponent
    : Math.floor(scientificExponent / 3) * 3
  const mantissa = value / 10 ** exponent
  const integerDigits = Math.floor(Math.log10(Math.abs(mantissa))) + 1
  const fractionDigits = Math.max(0, 3 - integerDigits)
  return {
    value: formatNumber(locale, mantissa, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: false,
    }),
    suffix: `e${exponent}`,
  }
}

function roundToThreeSignificantDigits(value: number): number {
  const rounded = Number(value.toPrecision(3))
  return Number.isFinite(rounded) ? rounded : value
}

/**
 * Matches CalcUtils.FormatEnergy for Simulation energy values, including its
 * SI-specific watt and joule prefixes rather than the game's number suffixes.
 */
export function formatGameEnergy(
  locale: EnabledLocale,
  value: number,
  unit: GameEnergyUnit,
  notation: NumberNotationMode = getActiveNumberNotation(),
): string {
  const parts = formatGameEnergyParts(locale, value, unit, notation)
  return parts.unit ? `${parts.value} ${parts.unit}` : parts.value
}

export function formatGameEnergyParts(
  locale: EnabledLocale,
  value: number,
  unit: GameEnergyUnit,
  notation: NumberNotationMode = getActiveNumberNotation(),
): GameEnergyParts {
  const prefixes = GAME_ENERGY_PREFIXES[unit]
  if (value === Number.MAX_VALUE) return { value: 'MAX', unit: '' }
  if (!Number.isFinite(value) || value < 0) {
    return { value: 'ERR', unit: '' }
  }
  if (value === 0) return { value: '0.00', unit: prefixes[0] }

  const resolvedNotation = resolveNumberNotation(notation, value)
  if (value > 1000 && resolvedNotation !== 'standard') {
    const parts = formatExponentNumberParts(locale, value, resolvedNotation)
    return { value: `${parts.value}${parts.suffix}`, unit: prefixes[0] }
  }

  const exponentGroup = Math.max(
    Math.floor(Math.log10(Math.abs(value)) / 3),
    0,
  )
  const scale = 10 ** (exponentGroup * 3)
  const mantissa = value / scale
  const mantissaAbsolute = Math.abs(mantissa)
  const integerDigits = mantissaAbsolute < 1
    ? 1
    : Math.floor(Math.log10(mantissaAbsolute)) + 1
  const fractionDigits = Math.max(0, 3 - integerDigits)
  const truncationFactor = 10 ** fractionDigits
  const truncated = Math.trunc(mantissa * truncationFactor) / truncationFactor
  const formatted = formatNumber(locale, truncated, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  })

  return exponentGroup < prefixes.length
    ? { value: formatted, unit: prefixes[exponentGroup] }
    : { value: `${formatted}e${exponentGroup * 3}`, unit: '' }
}

/**
 * Matches CalcUtils.FormatTime(..., shortForm: true) for elapsed gameplay
 * durations while retaining locale-appropriate digits.
 */
export function formatGameDuration(
  locale: EnabledLocale,
  seconds: number,
  options: {
    readonly maximumFractionDigits?: number
    readonly minimumSignificantDigits?: number
    readonly maximumSignificantDigits?: number
  } = {},
): string {
  if (!Number.isFinite(seconds)) return NON_FINITE_NUMBER_FALLBACK
  if (Math.abs(seconds) >= Number.MAX_VALUE) {
    return CAPPED_GAME_DURATION_LABEL
  }

  const maximumFractionDigits = Math.max(
    0,
    Math.floor(options.maximumFractionDigits ?? 0),
  )
  const maximumSignificantDigits = options.maximumSignificantDigits === undefined
    ? undefined
    : Math.max(1, Math.floor(options.maximumSignificantDigits))
  const minimumSignificantDigits = options.minimumSignificantDigits === undefined
    ? undefined
    : Math.max(1, Math.floor(options.minimumSignificantDigits))
  const totalSeconds = maximumFractionDigits > 0 || maximumSignificantDigits !== undefined
    ? Math.abs(seconds)
    : Math.floor(Math.abs(seconds))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor(totalSeconds / 3_600) % 24
  const minutes = Math.floor(totalSeconds / 60) % 60
  const remainingSeconds = totalSeconds -
    days * 86_400 -
    hours * 3_600 -
    minutes * 60
  const components: string[] = []
  const unit = (
    value: number,
    suffix: string,
    fractionDigits = 0,
    minimumSignificant?: number,
    significantDigits?: number,
  ) =>
    `${formatNumber(locale, value, {
      maximumFractionDigits: fractionDigits,
      minimumSignificantDigits: minimumSignificant,
      maximumSignificantDigits: significantDigits,
      useGrouping: false,
    })}${suffix}`

  if (days > 0) components.push(unit(days, 'd'))
  if (hours > 0) components.push(unit(hours, 'h'))
  if (minutes > 0) components.push(unit(minutes, 'm'))
  components.push(unit(
    remainingSeconds,
    's',
    maximumFractionDigits,
    minimumSignificantDigits,
    maximumSignificantDigits,
  ))
  return components.join(' ')
}

export function getDateTimeFormatter(
  locale: EnabledLocale,
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat {
  return cached(
    dateFormatters,
    cacheKey(locale, options),
    () => new Intl.DateTimeFormat(locale, options),
  )
}

export function formatDateTime(
  locale: EnabledLocale,
  value: Date | number,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return getDateTimeFormatter(locale, options).format(value)
}

export function getRelativeTimeFormatter(
  locale: EnabledLocale,
  options: Intl.RelativeTimeFormatOptions = {},
): Intl.RelativeTimeFormat {
  return cached(
    relativeTimeFormatters,
    cacheKey(locale, options),
    () => new Intl.RelativeTimeFormat(locale, options),
  )
}

export function formatRelativeTime(
  locale: EnabledLocale,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: Intl.RelativeTimeFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return NON_FINITE_NUMBER_FALLBACK
  return getRelativeTimeFormatter(locale, options).format(value, unit)
}

export function getPluralRules(
  locale: EnabledLocale,
  options: Intl.PluralRulesOptions = {},
): Intl.PluralRules {
  return cached(
    pluralRulesFormatters,
    cacheKey(locale, options),
    () => new Intl.PluralRules(locale, options),
  )
}

export function selectPlural(
  locale: EnabledLocale,
  value: number,
  options: Intl.PluralRulesOptions = {},
): Intl.LDMLPluralRule {
  return getPluralRules(locale, options).select(value)
}

export function clearFormatterCachesForTests(): void {
  numberFormatters.clear()
  dateFormatters.clear()
  relativeTimeFormatters.clear()
  pluralRulesFormatters.clear()
}

function cached<T>(
  cache: Map<string, T>,
  key: string,
  create: () => T,
): T {
  const existing = cache.get(key)
  if (existing) return existing
  const created = create()
  cache.set(key, created)
  return created
}

function cacheKey(
  locale: EnabledLocale,
  options: object,
): string {
  const entries = Object.entries(options).sort(([left], [right]) =>
    left.localeCompare(right),
  )
  return `${locale}:${JSON.stringify(entries)}`
}
