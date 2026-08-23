export const MAXIMUM_INFINITY_TARGET = 2_147_483_647n

export type InfinityTargetParseResult =
  | { readonly ok: true; readonly value: bigint }
  | {
      readonly ok: false
      readonly reason: 'empty' | 'malformed' | 'non-positive' | 'non-integer' | 'too-large'
    }

const SUFFIX_EXPONENTS: Readonly<Record<string, number>> = Object.freeze({
  k: 3,
  m: 6,
  b: 9,
  t: 12,
  qa: 15,
  qi: 18,
})

/** Parses exact, English game-number input without passing through a float. */
export function parseInfinityTargetInput(
  input: string,
): InfinityTargetParseResult {
  const normalized = input.trim().replace(/\s*ip$/i, '').trim()
  if (normalized.length === 0) return { ok: false, reason: 'empty' }

  const match = normalized.match(
    /^([+-]?)([\d,_ ]+(?:\.\d*)?|\.\d+)(?:(?:e([+-]?\d+))|([a-z]+))?$/i,
  )
  if (match === null) return { ok: false, reason: 'malformed' }
  if (match[1] === '-') return { ok: false, reason: 'non-positive' }

  const [groupedWhole = '', fraction = ''] = match[2]!.split('.')
  const whole = normalizeGroupedWhole(groupedWhole)
  if (whole === null || !/^\d*$/.test(fraction)) {
    return { ok: false, reason: 'malformed' }
  }

  const suffix = match[4]?.toLowerCase()
  const suffixExponent = suffix === undefined
    ? 0
    : SUFFIX_EXPONENTS[suffix]
  if (suffix !== undefined && suffixExponent === undefined) {
    return { ok: false, reason: 'malformed' }
  }
  const explicitExponent = match[3] === undefined
    ? suffixExponent
    : Number(match[3])
  if (
    !Number.isSafeInteger(explicitExponent) ||
    explicitExponent > 100 ||
    explicitExponent < -100
  ) {
    return { ok: false, reason: 'too-large' }
  }

  const digitsText = `${whole}${fraction}`.replace(/^0+(?=\d)/, '')
  const digits = BigInt(digitsText.length === 0 ? '0' : digitsText)
  const decimalShift = explicitExponent - fraction.length
  let value: bigint
  if (decimalShift >= 0) {
    value = digits * 10n ** BigInt(decimalShift)
  } else {
    const divisor = 10n ** BigInt(-decimalShift)
    if (digits % divisor !== 0n) {
      return { ok: false, reason: 'non-integer' }
    }
    value = digits / divisor
  }

  if (value < 1n) return { ok: false, reason: 'non-positive' }
  if (value > MAXIMUM_INFINITY_TARGET) {
    return { ok: false, reason: 'too-large' }
  }
  return { ok: true, value }
}

function normalizeGroupedWhole(value: string): string | null {
  if (/^\d+$/.test(value) || value === '') return value

  const separators = [...new Set(value.match(/[,_ ]/g) ?? [])]
  if (separators.length !== 1) return null
  const groups = value.split(separators[0]!)
  if (
    groups.length < 2 ||
    !/^\d{1,3}$/.test(groups[0]!) ||
    groups.slice(1).some((group) => !/^\d{3}$/.test(group))
  ) {
    return null
  }
  return groups.join('')
}
