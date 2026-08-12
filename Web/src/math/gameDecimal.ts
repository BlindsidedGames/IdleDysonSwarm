import Decimal from 'break_infinity.js'

const gameDecimalBrand: unique symbol = Symbol('GameDecimal')
const issuedGameDecimals = new WeakSet<object>()

export type GameDecimal = Readonly<{
  readonly mantissa: number
  readonly exponent: number
  readonly [gameDecimalBrand]: true
}>

export type GameDecimalParts = Readonly<{
  readonly mantissa: number
  readonly exponent: number
}>

export type GameDecimalComparison = -1 | 0 | 1

export type GameDecimalNumberBounds = Readonly<{
  readonly minimum?: number
  readonly maximum?: number
}>

export type GameDecimalBigIntBounds = Readonly<{
  readonly maximum?: bigint
  readonly maximumDigits?: number
}>

export type SchedulerSecondsResolution = Readonly<{
  readonly seconds: number
  readonly reached: boolean
}>

export const GAME_DECIMAL_ENCODED_MAX_LENGTH = 64
export const GAME_DECIMAL_BIGINT_MAX_DIGITS = 4_096
export const GAME_DECIMAL_EXPONENT_LIMIT = 9_000_000_000_000_000
export const GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS = 1e-12

const canonicalDecimalPattern =
  /^([1-9](?:\.[0-9]+)?)e(0|-[1-9][0-9]*|[1-9][0-9]*)$/

type MutableGameDecimal = {
  mantissa: number
  exponent: number
  [gameDecimalBrand]: true
}

function failType(message: string): never {
  throw new TypeError(message)
}

function failRange(message: string): never {
  throw new RangeError(message)
}

function validateNormalizedParts(
  mantissa: number,
  exponent: number,
): void {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) {
    failRange('GameDecimal parts must be finite.')
  }
  if (!Number.isSafeInteger(exponent)) {
    failRange('GameDecimal exponent must be a safe integer.')
  }
  if (Object.is(exponent, -0)) {
    failRange('GameDecimal exponent zero must be normalized.')
  }
  if (Math.abs(exponent) >= GAME_DECIMAL_EXPONENT_LIMIT) {
    failRange('GameDecimal exponent is outside the supported range.')
  }
  if (Object.is(mantissa, -0)) {
    failRange('GameDecimal zero must be normalized.')
  }
  if (mantissa === 0) {
    if (exponent !== 0) {
      failRange('GameDecimal zero must have exponent zero.')
    }
    return
  }
  if (mantissa < 1 || mantissa >= 10) {
    failRange(
      'GameDecimal mantissa must be normalized and non-negative.',
    )
  }
}

function freezeGameDecimal(
  mantissa: number,
  exponent: number,
): GameDecimal {
  validateNormalizedParts(mantissa, exponent)
  const value = { mantissa, exponent } as MutableGameDecimal
  Object.defineProperty(value, gameDecimalBrand, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  })
  const frozen = Object.freeze(value)
  issuedGameDecimals.add(frozen)
  return frozen
}

function fromUpstream(value: Decimal): GameDecimal {
  let mantissa = value.mantissa
  let exponent = Object.is(value.exponent, -0) ? 0 : value.exponent
  if (!Number.isFinite(mantissa) || mantissa < 0) {
    failRange('GameDecimal dependency result must be finite and non-negative.')
  }
  if (mantissa === 0) return freezeGameDecimal(0, 0)
  // break_infinity can return a finite boundary result just outside its own
  // normalized mantissa interval after ordinary floating-point arithmetic.
  // Normalize that private dependency result before publishing our structural
  // value; callers still never receive or restore a permissive Decimal object.
  if (mantissa < 1 || mantissa >= 10) {
    const shift = Math.floor(Math.log10(mantissa))
    mantissa /= 10 ** shift
    exponent += shift
    if (mantissa >= 10) {
      mantissa /= 10
      exponent += 1
    } else if (mantissa < 1) {
      mantissa *= 10
      exponent -= 1
    }
  }
  return freezeGameDecimal(mantissa, exponent)
}

function toUpstream(value: GameDecimal): Decimal {
  assertGameDecimal(value)
  return Decimal.fromMantissaExponent(value.mantissa, value.exponent)
}

function assertGameDecimal(value: unknown): asserts value is GameDecimal {
  if (!isGameDecimal(value)) {
    failType('Expected a branded GameDecimal value.')
  }
}

function makeFromValidatedParts(
  mantissa: number,
  exponent: number,
): GameDecimal {
  validateNormalizedParts(mantissa, exponent)
  return fromUpstream(Decimal.fromMantissaExponent(mantissa, exponent))
}

function validateFiniteNonNegativeNumber(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    failRange(`${name} must be finite and non-negative.`)
  }
}

function validateFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    failRange(`${name} must be finite.`)
  }
}

function integerDigitInfo(value: GameDecimal): Readonly<{
  readonly digits: string
  readonly decimalPosition: number
  readonly integer: boolean
}> {
  assertGameDecimal(value)
  if (value.mantissa === 0) {
    return Object.freeze({
      digits: '0',
      decimalPosition: 1,
      integer: true,
    })
  }
  const digits = value.mantissa.toString().replace('.', '')
  const decimalPosition = value.exponent + 1
  const integer =
    decimalPosition > 0 &&
    (decimalPosition >= digits.length ||
      /^0*$/.test(digits.slice(decimalPosition)))
  return Object.freeze({ digits, decimalPosition, integer })
}

function nextUp(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    failRange('Scheduler conversion requires a finite non-negative number.')
  }
  if (value === 0) return Number.MIN_VALUE
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value, false)
  view.setBigUint64(0, view.getBigUint64(0, false) + 1n, false)
  return view.getFloat64(0, false)
}

export const GAME_DECIMAL_ZERO = freezeGameDecimal(0, 0)
export const GAME_DECIMAL_ONE = freezeGameDecimal(1, 0)
export const GAME_DECIMAL_TEN = freezeGameDecimal(1, 1)

export function gameDecimalFromNumber(value: number): GameDecimal {
  validateFiniteNonNegativeNumber(value, 'GameDecimal number')
  if (value === 0) return freezeGameDecimal(0, 0)
  return fromUpstream(Decimal.fromNumber(value))
}

export function gameDecimalFromCanonicalString(value: string): GameDecimal {
  if (typeof value !== 'string') {
    failType('Canonical GameDecimal input must be a string.')
  }
  if (
    value.length === 0 ||
    value.length > GAME_DECIMAL_ENCODED_MAX_LENGTH
  ) {
    failRange('Canonical GameDecimal input has an invalid length.')
  }
  if (value === '0') return freezeGameDecimal(0, 0)

  const match = canonicalDecimalPattern.exec(value)
  if (match === null) {
    failRange('Canonical GameDecimal input has invalid syntax.')
  }
  const mantissaText = match[1]!
  const exponentText = match[2]!
  const mantissa = Number(mantissaText)
  const exponent = Number(exponentText)
  if (mantissa.toString() !== mantissaText) {
    failRange('Canonical GameDecimal mantissa is not normalized.')
  }
  validateNormalizedParts(mantissa, exponent)
  return makeFromValidatedParts(mantissa, exponent)
}

export function gameDecimalFromBigInt(value: bigint): GameDecimal {
  if (typeof value !== 'bigint') {
    failType('GameDecimal bigint input must be a bigint.')
  }
  if (value < 0n) {
    failRange('GameDecimal bigint must be non-negative.')
  }
  if (value === 0n) return freezeGameDecimal(0, 0)
  const digits = value.toString()
  if (digits.length > GAME_DECIMAL_BIGINT_MAX_DIGITS) {
    failRange('GameDecimal bigint exceeds the supported digit budget.')
  }
  const significantDigits = digits.slice(0, 17)
  const mantissa = Number(
    significantDigits.length === 1
      ? significantDigits
      : `${significantDigits[0]}.${significantDigits.slice(1)}`,
  )
  if (mantissa === 10) {
    return makeFromValidatedParts(1, digits.length)
  }
  return makeFromValidatedParts(mantissa, digits.length - 1)
}

export function integerGameDecimalFromNumber(value: number): GameDecimal {
  const result = gameDecimalFromNumber(value)
  if (!isIntegerGameDecimal(result)) {
    failRange('Integer GameDecimal number must represent a whole value.')
  }
  return result
}

export function integerGameDecimalFromCanonicalString(
  value: string,
): GameDecimal {
  const result = gameDecimalFromCanonicalString(value)
  if (!isIntegerGameDecimal(result)) {
    failRange('Integer GameDecimal string must represent a whole value.')
  }
  return result
}

export function integerGameDecimalFromBigInt(value: bigint): GameDecimal {
  return gameDecimalFromBigInt(value)
}

export function restoreGameDecimal(value: unknown): GameDecimal {
  if (typeof value !== 'object' || value === null) {
    failType('GameDecimal parts must be a plain object.')
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    failType('GameDecimal parts must be a plain object.')
  }
  const names = Object.getOwnPropertyNames(value).sort()
  if (
    names.length !== 2 ||
    names[0] !== 'exponent' ||
    names[1] !== 'mantissa' ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    failType('GameDecimal parts must contain only mantissa and exponent.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const mantissaDescriptor = descriptors.mantissa
  const exponentDescriptor = descriptors.exponent
  if (
    mantissaDescriptor === undefined ||
    exponentDescriptor === undefined ||
    !('value' in mantissaDescriptor) ||
    !('value' in exponentDescriptor) ||
    mantissaDescriptor.enumerable !== true ||
    exponentDescriptor.enumerable !== true ||
    typeof mantissaDescriptor.value !== 'number' ||
    typeof exponentDescriptor.value !== 'number'
  ) {
    failType('GameDecimal parts must be numeric data properties.')
  }
  return makeFromValidatedParts(
    mantissaDescriptor.value,
    exponentDescriptor.value,
  )
}

export function cloneGameDecimal(value: GameDecimal): GameDecimal {
  assertGameDecimal(value)
  return freezeGameDecimal(value.mantissa, value.exponent)
}

export function isGameDecimal(value: unknown): value is GameDecimal {
  if (typeof value !== 'object' || value === null) return false
  if (issuedGameDecimals.has(value)) return true
  try {
    if (
      Object.getPrototypeOf(value) !== Object.prototype ||
      !Object.isFrozen(value)
    ) {
      return false
    }
    const names = Object.getOwnPropertyNames(value).sort()
    const symbols = Object.getOwnPropertySymbols(value)
    if (
      names.length !== 2 ||
      names[0] !== 'exponent' ||
      names[1] !== 'mantissa' ||
      symbols.length !== 1 ||
      symbols[0] !== gameDecimalBrand
    ) {
      return false
    }
    const mantissaDescriptor = Object.getOwnPropertyDescriptor(
      value,
      'mantissa',
    )
    const exponentDescriptor = Object.getOwnPropertyDescriptor(
      value,
      'exponent',
    )
    const brandDescriptor = Object.getOwnPropertyDescriptor(
      value,
      gameDecimalBrand,
    )
    if (
      mantissaDescriptor === undefined ||
      exponentDescriptor === undefined ||
      brandDescriptor === undefined ||
      !('value' in mantissaDescriptor) ||
      !('value' in exponentDescriptor) ||
      !('value' in brandDescriptor) ||
      mantissaDescriptor.configurable !== false ||
      mantissaDescriptor.enumerable !== true ||
      mantissaDescriptor.writable !== false ||
      exponentDescriptor.configurable !== false ||
      exponentDescriptor.enumerable !== true ||
      exponentDescriptor.writable !== false ||
      brandDescriptor.configurable !== false ||
      brandDescriptor.enumerable !== false ||
      brandDescriptor.writable !== false ||
      brandDescriptor.value !== true ||
      typeof mantissaDescriptor.value !== 'number' ||
      typeof exponentDescriptor.value !== 'number'
    ) {
      return false
    }
    validateNormalizedParts(
      mantissaDescriptor.value,
      exponentDescriptor.value,
    )
    return true
  } catch {
    return false
  }
}

export function isFiniteGameDecimal(value: GameDecimal): boolean {
  return isGameDecimal(value)
}

export function isNonNegativeGameDecimal(value: GameDecimal): boolean {
  return isGameDecimal(value)
}

export function isZeroGameDecimal(value: GameDecimal): boolean {
  assertGameDecimal(value)
  return value.mantissa === 0
}

export function isIntegerGameDecimal(value: GameDecimal): boolean {
  return integerDigitInfo(value).integer
}

export function equalGameDecimals(
  left: GameDecimal,
  right: GameDecimal,
): boolean {
  assertGameDecimal(left)
  assertGameDecimal(right)
  return left.mantissa === right.mantissa && left.exponent === right.exponent
}

export function compareGameDecimals(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimalComparison {
  return toUpstream(left).compare(toUpstream(right))
}

export function minGameDecimal(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return cloneGameDecimal(compareGameDecimals(left, right) <= 0 ? left : right)
}

export function maxGameDecimal(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return cloneGameDecimal(compareGameDecimals(left, right) >= 0 ? left : right)
}

export function absGameDecimal(value: GameDecimal): GameDecimal {
  return fromUpstream(toUpstream(value).abs())
}

export function addGameDecimals(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return fromUpstream(toUpstream(left).add(toUpstream(right)))
}

export function subtractGameDecimals(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return fromUpstream(toUpstream(left).sub(toUpstream(right)))
}

export function multiplyGameDecimals(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return fromUpstream(toUpstream(left).mul(toUpstream(right)))
}

export function divideGameDecimals(
  dividend: GameDecimal,
  divisor: GameDecimal,
): GameDecimal {
  if (isZeroGameDecimal(divisor)) {
    failRange('GameDecimal divisor must be positive.')
  }
  return fromUpstream(toUpstream(dividend).div(toUpstream(divisor)))
}

export function powGameDecimal(
  base: GameDecimal,
  exponent: number,
): GameDecimal {
  if (typeof exponent !== 'number') {
    failType('GameDecimal power exponent must be a number.')
  }
  validateFiniteNumber(exponent, 'GameDecimal power exponent')
  if (isZeroGameDecimal(base) && exponent <= 0) {
    failRange('Zero GameDecimal base requires a positive exponent.')
  }
  return fromUpstream(toUpstream(base).pow(exponent))
}

export function logGameDecimal(
  value: GameDecimal,
  base: number,
): GameDecimal {
  if (isZeroGameDecimal(value)) {
    failRange('GameDecimal logarithm input must be positive.')
  }
  if (!Number.isFinite(base) || base <= 0 || base === 1) {
    failRange('GameDecimal logarithm base must be finite, positive, and not one.')
  }
  return gameDecimalFromNumber(toUpstream(value).log(base))
}

export function rootGameDecimal(
  value: GameDecimal,
  degree: number,
): GameDecimal {
  if (!Number.isFinite(degree) || degree <= 0) {
    failRange('GameDecimal root degree must be finite and positive.')
  }
  return powGameDecimal(value, 1 / degree)
}

export function floorGameDecimal(value: GameDecimal): GameDecimal {
  return fromUpstream(toUpstream(value).floor())
}

export function ceilGameDecimal(value: GameDecimal): GameDecimal {
  return fromUpstream(toUpstream(value).ceil())
}

export function gameDecimalToCanonicalString(value: GameDecimal): string {
  assertGameDecimal(value)
  if (value.mantissa === 0) return '0'
  const encoded = `${value.mantissa.toString()}e${value.exponent.toString()}`
  if (encoded.length > GAME_DECIMAL_ENCODED_MAX_LENGTH) {
    failRange('GameDecimal encoding exceeds the supported length.')
  }
  return encoded
}

export function decomposeGameDecimal(value: GameDecimal): GameDecimalParts {
  assertGameDecimal(value)
  return Object.freeze({
    mantissa: value.mantissa,
    exponent: value.exponent,
  })
}

export function gameDecimalToNumberChecked(
  value: GameDecimal,
  bounds: GameDecimalNumberBounds = {},
): number {
  assertGameDecimal(value)
  const minimum = bounds.minimum ?? 0
  const maximum = bounds.maximum ?? Number.MAX_VALUE
  validateFiniteNonNegativeNumber(minimum, 'GameDecimal number minimum')
  validateFiniteNonNegativeNumber(maximum, 'GameDecimal number maximum')
  if (minimum > maximum) {
    failRange('GameDecimal number bounds are inverted.')
  }
  if (
    compareGameDecimals(value, gameDecimalFromNumber(minimum)) < 0 ||
    compareGameDecimals(value, gameDecimalFromNumber(maximum)) > 0
  ) {
    failRange('GameDecimal value is outside the requested number bounds.')
  }
  const result = toUpstream(value).toNumber()
  if (
    !Number.isFinite(result) ||
    (result === 0 && !isZeroGameDecimal(value)) ||
    result < minimum ||
    result > maximum
  ) {
    failRange('GameDecimal value cannot be represented by the requested number bounds.')
  }
  return result
}

export function gameDecimalToBigIntChecked(
  value: GameDecimal,
  bounds: GameDecimalBigIntBounds = {},
): bigint {
  const maximumDigits =
    bounds.maximumDigits ?? GAME_DECIMAL_BIGINT_MAX_DIGITS
  if (
    !Number.isSafeInteger(maximumDigits) ||
    maximumDigits < 1 ||
    maximumDigits > GAME_DECIMAL_BIGINT_MAX_DIGITS
  ) {
    failRange('GameDecimal bigint digit bound is invalid.')
  }
  if (bounds.maximum !== undefined) {
    if (typeof bounds.maximum !== 'bigint') {
      failType('GameDecimal bigint maximum must be a bigint.')
    }
    if (bounds.maximum < 0n) {
      failRange('GameDecimal bigint maximum must be non-negative.')
    }
  }
  const info = integerDigitInfo(value)
  if (!info.integer) {
    failRange('GameDecimal value is not an integer.')
  }
  const outputLength = Math.max(info.digits.length, info.decimalPosition)
  if (outputLength > maximumDigits) {
    failRange('GameDecimal value exceeds the requested bigint digit bound.')
  }
  const digits =
    info.decimalPosition >= info.digits.length
      ? info.digits.padEnd(info.decimalPosition, '0')
      : info.digits.slice(0, info.decimalPosition)
  const result = BigInt(digits)
  if (bounds.maximum !== undefined && result > bounds.maximum) {
    failRange('GameDecimal value exceeds the requested bigint maximum.')
  }
  return result
}

export function gameDecimalToSchedulerSeconds(
  horizon: GameDecimal,
  sliceSeconds: number,
): SchedulerSecondsResolution {
  assertGameDecimal(horizon)
  validateFiniteNonNegativeNumber(sliceSeconds, 'Scheduler slice')
  if (isZeroGameDecimal(horizon)) {
    return Object.freeze({ seconds: 0, reached: true })
  }
  const slice = gameDecimalFromNumber(sliceSeconds)
  if (compareGameDecimals(horizon, slice) > 0) {
    return Object.freeze({ seconds: sliceSeconds, reached: false })
  }
  if (sliceSeconds < GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS) {
    return Object.freeze({ seconds: sliceSeconds, reached: false })
  }
  const minimum = gameDecimalFromNumber(
    GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
  )
  if (compareGameDecimals(horizon, minimum) < 0) {
    return Object.freeze({
      seconds: GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
      reached: true,
    })
  }

  let seconds = toUpstream(horizon).toNumber()
  if (!Number.isFinite(seconds) || seconds <= 0) {
    failRange('In-slice GameDecimal horizon cannot be converted to seconds.')
  }
  for (let index = 0; index < 2; index += 1) {
    if (compareGameDecimals(gameDecimalFromNumber(seconds), horizon) >= 0) {
      break
    }
    seconds = nextUp(seconds)
  }
  if (
    !Number.isFinite(seconds) ||
    seconds > sliceSeconds ||
    compareGameDecimals(gameDecimalFromNumber(seconds), horizon) < 0
  ) {
    failRange('In-slice GameDecimal horizon cannot be rounded upward safely.')
  }
  return Object.freeze({ seconds, reached: true })
}
