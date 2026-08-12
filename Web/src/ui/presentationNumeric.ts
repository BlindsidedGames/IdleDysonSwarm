import {
  compareGameDecimals,
  divideGameDecimals,
  floorGameDecimal,
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  gameDecimalToNumberChecked,
  isGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'

export type PresentationNumeric = number | bigint | GameDecimal

export function presentationDecimal(value: PresentationNumeric): GameDecimal {
  if (isGameDecimal(value)) return value
  return typeof value === 'bigint'
    ? gameDecimalFromBigInt(value)
    : gameDecimalFromNumber(value)
}

export function comparePresentationNumeric(
  left: PresentationNumeric,
  right: PresentationNumeric,
): -1 | 0 | 1 {
  return compareGameDecimals(presentationDecimal(left), presentationDecimal(right))
}

export function boundedPresentationFraction(
  value: PresentationNumeric,
  maximum: PresentationNumeric,
): number {
  if (comparePresentationNumeric(value, 0) <= 0) return 0
  if (comparePresentationNumeric(value, maximum) >= 0) return 1
  return gameDecimalToNumberChecked(
    divideGameDecimals(presentationDecimal(value), presentationDecimal(maximum)),
    { minimum: 0, maximum: 1 },
  )
}

export function boundedPresentationWholeQuotient(
  value: PresentationNumeric,
  divisor: PresentationNumeric,
  maximum: bigint,
): bigint {
  if (comparePresentationNumeric(divisor, 0) <= 0) return 0n
  const quotient = floorGameDecimal(
    divideGameDecimals(presentationDecimal(value), presentationDecimal(divisor)),
  )
  if (compareGameDecimals(quotient, gameDecimalFromBigInt(maximum)) >= 0) {
    return maximum
  }
  return gameDecimalToBigIntChecked(quotient, { maximum })
}
