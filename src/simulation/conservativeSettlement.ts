import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import {
  bitDecrement,
  bitIncrement,
  CONTINUOUS_MAXIMUM,
} from './numeric'

export interface ConservativeContinuousSettlement {
  readonly balance: number
  readonly settled: number
}

export interface ConservativeContinuousTransfer {
  readonly sourceBalance: number
  readonly destinationBalance: number
  readonly settled: number
}

export interface ConservativeDiscreteToContinuousTransfer {
  readonly sourceBalance: bigint
  readonly destinationBalance: number
  readonly settled: bigint
}

/**
 * Credits only the positive delta the destination can actually represent.
 * If nearest rounding would admit more than requested, the result steps down
 * one representable value or fails closed without changing the balance.
 */
export function settleContinuousCredit(
  balance: number,
  requested: number,
  maximum = CONTINUOUS_MAXIMUM,
): ConservativeContinuousSettlement {
  if (
    !isFiniteNonNegativeNumber(balance) ||
    !isFiniteNonNegativeNumber(requested) ||
    !isFiniteNonNegativeNumber(maximum) ||
    balance > maximum ||
    requested <= 0
  ) {
    return { balance, settled: 0 }
  }

  const admittedRequest = Math.min(
    requested,
    Math.max(0, maximum - balance),
  )
  if (admittedRequest <= 0) return { balance, settled: 0 }

  let next = balance + admittedRequest
  if (!Number.isFinite(next) || next > maximum) next = maximum
  let settled = next - balance
  if (settled > admittedRequest) {
    next = bitDecrement(next)
    settled = next - balance
  }
  if (
    !isFiniteNonNegativeNumber(next) ||
    next < balance ||
    next > maximum ||
    !Number.isFinite(settled) ||
    settled <= 0 ||
    settled > admittedRequest
  ) {
    return { balance, settled: 0 }
  }
  return { balance: next, settled }
}

/**
 * Represents an all-or-nothing authored purchase output. Unlike production
 * transfers, a purchase may not silently settle a smaller or larger delta.
 */
export function settleExactContinuousCredit(
  balance: number,
  requested: number,
  maximum = CONTINUOUS_MAXIMUM,
): ConservativeContinuousSettlement {
  const settlement = settleContinuousCredit(balance, requested, maximum)
  return settlement.settled === requested
    ? settlement
    : { balance, settled: 0 }
}

/**
 * Debits only a positive delta no greater than the request. Unlike purchase
 * charging, an unrepresentable sub-ULP request is retained rather than being
 * rounded up to a minimum one-ULP charge.
 */
export function settleContinuousDebit(
  balance: number,
  requested: number,
): ConservativeContinuousSettlement {
  if (
    !isFiniteNonNegativeNumber(balance) ||
    !isFiniteNonNegativeNumber(requested) ||
    requested <= 0
  ) {
    return { balance, settled: 0 }
  }

  const admittedRequest = Math.min(balance, requested)
  let next = balance - admittedRequest
  let settled = balance - next
  if (settled > admittedRequest) {
    next = bitIncrement(next)
    settled = balance - next
  }
  if (
    !isFiniteNonNegativeNumber(next) ||
    next > balance ||
    !Number.isFinite(settled) ||
    settled <= 0 ||
    settled > admittedRequest
  ) {
    return { balance, settled: 0 }
  }
  return { balance: next, settled }
}

/**
 * Moves one exactly represented continuous delta between balances. The source
 * and destination are retried from their original values with a monotonically
 * smaller request until both sides represent the same delta, otherwise the
 * transfer fails closed.
 */
export function settleContinuousTransfer(
  sourceBalance: number,
  destinationBalance: number,
  requested: number,
  destinationMaximum = CONTINUOUS_MAXIMUM,
): ConservativeContinuousTransfer {
  if (
    !isFiniteNonNegativeNumber(sourceBalance) ||
    !isFiniteNonNegativeNumber(destinationBalance) ||
    !isFiniteNonNegativeNumber(requested) ||
    !isFiniteNonNegativeNumber(destinationMaximum) ||
    destinationBalance > destinationMaximum ||
    requested <= 0
  ) {
    return { sourceBalance, destinationBalance, settled: 0 }
  }

  let limit = Math.min(sourceBalance, requested)
  for (let attempt = 0; attempt < 8 && limit > 0; attempt += 1) {
    const credit = settleContinuousCredit(
      destinationBalance,
      limit,
      destinationMaximum,
    )
    if (credit.settled <= 0) break
    const debit = settleContinuousDebit(sourceBalance, credit.settled)
    if (debit.settled <= 0) break
    if (debit.settled === credit.settled) {
      return {
        sourceBalance: debit.balance,
        destinationBalance: credit.balance,
        settled: debit.settled,
      }
    }
    limit = Math.min(debit.settled, credit.settled)
  }
  return { sourceBalance, destinationBalance, settled: 0 }
}

/**
 * Converts only the whole discrete units a continuous destination represents
 * exactly, allowing sub-unit floating-point noise when adding whole units to
 * a fractional balance. Unrepresented units remain in the bigint source.
 */
export function settleDiscreteToContinuousTransfer(
  sourceBalance: bigint,
  destinationBalance: number,
  requested: bigint = sourceBalance,
  destinationMaximum = CONTINUOUS_MAXIMUM,
): ConservativeDiscreteToContinuousTransfer {
  if (
    sourceBalance < 0n ||
    requested <= 0n ||
    !isFiniteNonNegativeNumber(destinationBalance) ||
    !isFiniteNonNegativeNumber(destinationMaximum) ||
    destinationBalance > destinationMaximum
  ) {
    return { sourceBalance, destinationBalance, settled: 0n }
  }

  const admittedRequest = requested < sourceBalance
    ? requested
    : sourceBalance
  let limit = Number(admittedRequest)
  if (!Number.isFinite(limit) || limit <= 0) {
    return { sourceBalance, destinationBalance, settled: 0n }
  }
  if (BigInt(limit) > admittedRequest) limit = bitDecrement(limit)

  // Subtracting the rounded sum from a fractional balance can report, for
  // example, 127.99999999999999 for a requested 128 workers. Settle the
  // authored whole units in that case, rather than retrying smaller batches.
  // Allow roundoff at the sum's precision, but never a discrepancy of even
  // half a source unit. Integer/coarse deltas still use exact settlement.
  const next = destinationBalance + limit
  const delta = next - destinationBalance
  const roundingError = Math.abs(delta - limit)
  if (
    Number.isSafeInteger(limit) &&
    Number.isFinite(next) &&
    next <= destinationMaximum &&
    delta > 0 &&
    !Number.isInteger(delta) &&
    roundingError < 0.5 &&
    roundingError <= Number.EPSILON * next
  ) {
    const settled = BigInt(limit)
    return {
      sourceBalance: sourceBalance - settled,
      destinationBalance: next,
      settled,
    }
  }

  for (let attempt = 0; attempt < 8 && limit > 0; attempt += 1) {
    const credit = settleContinuousCredit(
      destinationBalance,
      limit,
      destinationMaximum,
    )
    if (credit.settled <= 0) break
    if (!Number.isInteger(credit.settled)) {
      limit = Math.floor(credit.settled)
      continue
    }
    const settled = BigInt(credit.settled)
    if (settled > 0n && settled <= admittedRequest) {
      return {
        sourceBalance: sourceBalance - settled,
        destinationBalance: credit.balance,
        settled,
      }
    }
    limit = bitDecrement(credit.settled)
  }
  return { sourceBalance, destinationBalance, settled: 0n }
}
