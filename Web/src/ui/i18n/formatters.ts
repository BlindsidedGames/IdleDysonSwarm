import type { EnabledLocale } from './localeRegistry'

export type NumericValue = number | bigint
export const NON_FINITE_NUMBER_FALLBACK = '—'

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
