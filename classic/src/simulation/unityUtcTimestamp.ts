import type { ParsedUtcTimestamp } from './timeResources'

const INVARIANT_DATE_TIME =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(?:\s*([AP]M))?$/i
const ISO_WITHOUT_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?$/
const EXPLICIT_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Parses the invariant-culture strings emitted by Unity DateTime.ToString
 * with AssumeUniversal + AdjustToUniversal semantics.
 */
export function parseUnityInvariantUtcTimestamp(
  value: string | null | undefined,
): ParsedUtcTimestamp {
  if (value === null || value === undefined || value.trim().length === 0) {
    return { status: 'missing' }
  }
  const trimmed = value.trim()
  if (EXPLICIT_ZONE.test(trimmed)) {
    const milliseconds = Date.parse(trimmed)
    return Number.isFinite(milliseconds)
      ? { status: 'valid', utcMilliseconds: milliseconds }
      : { status: 'invalid' }
  }

  const invariant = INVARIANT_DATE_TIME.exec(trimmed)
  if (invariant !== null) {
    const month = Number(invariant[1])
    const day = Number(invariant[2])
    const year = Number(invariant[3])
    let hour = Number(invariant[4])
    const minute = Number(invariant[5])
    const second = Number(invariant[6])
    const millisecond = fractionToMilliseconds(invariant[7])
    const meridiem = invariant[8]?.toUpperCase()
    if (meridiem !== undefined) {
      if (hour < 1 || hour > 12) return { status: 'invalid' }
      hour = hour % 12 + (meridiem === 'PM' ? 12 : 0)
    }
    return validatedUtc(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
    )
  }

  const iso = ISO_WITHOUT_ZONE.exec(trimmed)
  if (iso !== null) {
    return validatedUtc(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4]),
      Number(iso[5]),
      Number(iso[6]),
      fractionToMilliseconds(iso[7]),
    )
  }
  return { status: 'invalid' }
}

function validatedUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): ParsedUtcTimestamp {
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return { status: 'invalid' }
  }
  // Date.UTC treats years 0..99 as 1900..1999. Unity can serialize the full
  // DateTime range, so set the year after construction to preserve it exactly.
  const roundTrip = new Date(0)
  roundTrip.setUTCFullYear(year, month - 1, day)
  roundTrip.setUTCHours(hour, minute, second, millisecond)
  const utcMilliseconds = roundTrip.getTime()
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hour ||
    roundTrip.getUTCMinutes() !== minute ||
    roundTrip.getUTCSeconds() !== second
  ) {
    return { status: 'invalid' }
  }
  return { status: 'valid', utcMilliseconds }
}

function fractionToMilliseconds(value: string | undefined): number {
  if (value === undefined) return 0
  return Number(value.padEnd(3, '0').slice(0, 3))
}
