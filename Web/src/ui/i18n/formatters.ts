import type { EnabledLocale } from './localeRegistry'

export type NumericValue = number | bigint
export const NON_FINITE_NUMBER_FALLBACK = '—'

const GAME_NUMBER_PREFIXES = Object.freeze([
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc',
  'OcDc', 'NoDc', 'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg',
  'SxVg', 'SpVg', 'OcVg', 'NoVg', 'Tg', 'UTg', 'DTg', 'TTg',
  'QaTg', 'QiTg', 'SxTg', 'SpTg', 'OcTg', 'NoTg', 'Qag',
  'UQag', 'DQag', 'TQag', 'QaQag', 'QiQag', 'SxQag', 'SpQag',
  'OcQag', 'NoQag', 'Qig', 'UQig', 'DQig', 'TQig', 'QaQig',
  'QiQig', 'SxQig', 'SpQig', 'OcQig', 'NoQig', 'Sxg', 'USxg',
  'DSxg', 'TSxg', 'QaSxg', 'QiSxg', 'SxSxg', 'SpSxg',
  'OcSxg', 'NoSxg', 'Spg', 'USpg', 'DSpg', 'TSpg', 'QaSpg',
  'QiSpg', 'SxSpg', 'SpSpg', 'OcSpg', 'NoSpg', 'Ocg', 'UOcg',
  'DOcg', 'TOcg', 'QaOcg', 'QiOcg', 'SxOcg', 'SpOcg', 'OcOcg',
  'NoOcg', 'Nog', 'UNog', 'DNog', 'TNog', 'QaNog', 'QiNog',
  'SxNog', 'SpNog', 'OcNog', 'NoNog', 'Ce', 'UCe', 'DCe',
] as const)

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
 * Matches the Unity game's three-digit, truncated mantissa presentation while
 * retaining locale-appropriate decimal digits. This is display formatting
 * only; canonical values and gameplay calculations remain untouched.
 */
export function formatGameNumber(
  locale: EnabledLocale,
  value: NumericValue,
): string {
  if (typeof value === 'bigint') {
    if (
      value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      return formatNumber(locale, value, { useGrouping: false })
    }
    return formatGameNumber(locale, Number(value))
  }
  if (!Number.isFinite(value)) return NON_FINITE_NUMBER_FALLBACK
  if (value === 0) {
    return formatNumber(locale, 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    })
  }

  const absolute = Math.abs(value)
  const exponentGroup = Math.max(
    Math.floor(Math.log10(absolute) / 3),
    0,
  )
  if (exponentGroup >= GAME_NUMBER_PREFIXES.length) {
    return value.toExponential(2)
  }

  const scale = 10 ** (exponentGroup * 3)
  const mantissa = value / scale
  const mantissaAbsolute = Math.abs(mantissa)
  const integerDigits =
    mantissaAbsolute < 1
      ? 1
      : Math.floor(Math.log10(mantissaAbsolute)) + 1
  const fractionDigits = Math.max(0, 3 - integerDigits)
  const truncationFactor = 10 ** fractionDigits
  const truncated =
    Math.trunc(mantissa * truncationFactor) / truncationFactor
  const formatted = formatNumber(locale, truncated, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  })
  return `${formatted}${GAME_NUMBER_PREFIXES[exponentGroup]}`
}

/**
 * Matches CalcUtils.FormatTime(..., shortForm: true) for elapsed gameplay
 * durations while retaining locale-appropriate digits.
 */
export function formatGameDuration(
  locale: EnabledLocale,
  seconds: number,
): string {
  if (!Number.isFinite(seconds)) return NON_FINITE_NUMBER_FALLBACK

  const totalSeconds = Math.floor(Math.abs(seconds))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor(totalSeconds / 3_600) % 24
  const minutes = Math.floor(totalSeconds / 60) % 60
  const remainingSeconds = totalSeconds % 60
  const components: string[] = []
  const unit = (value: number, suffix: string) =>
    `${formatNumber(locale, value, {
      maximumFractionDigits: 0,
      useGrouping: false,
    })}${suffix}`

  if (days > 0) components.push(unit(days, 'd'))
  if (hours > 0) components.push(unit(hours, 'h'))
  if (minutes > 0) components.push(unit(minutes, 'm'))
  components.push(unit(remainingSeconds, 's'))
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
