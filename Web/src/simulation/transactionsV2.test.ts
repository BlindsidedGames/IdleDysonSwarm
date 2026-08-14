import { describe, expect, test } from 'vitest'

import {
  GAME_DECIMAL_MAXIMUM,
  GAME_DECIMAL_EXPONENT_LIMIT,
  compareGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  integerGameDecimalFromNumber,
  isGameDecimal,
} from '../math/gameDecimal'
import {
  V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS,
  V2_FIXED_PRICE_BUY_MAX_BATCH_CAP,
  commitV2AtomicExchange,
  commitV2Purchase,
  correctV2BulkEstimate,
  exponentialCostV2,
  geometricSeriesCostV2,
  maximumAffordableGeometricBatchesV2,
  quoteV2AtomicExchange,
  quoteV2FixedPriceBuyMax,
  quoteV2GeometricBuyMax,
  quoteV2Purchase,
  selectV2PurchaseBatches,
  type V2AtomicAccount,
} from './transactionsV2'

const decimal = gameDecimalFromNumber
const integer = integerGameDecimalFromNumber
const encoded = gameDecimalToCanonicalString

function purchaseRequest(
  overrides: Partial<Parameters<typeof quoteV2Purchase>[0]> = {},
): Parameters<typeof quoteV2Purchase>[0] {
  return {
    currencyPath: '$.dyson.money',
    sourceRevision: 7,
    requestedMode: 'buy-10',
    balance: integer(100),
    balanceSemantic: 'integer',
    output: integer(0),
    outputSemantic: 'integer',
    batches: integer(2),
    unitsPerPurchase: integer(3),
    quotedCost: decimal(100),
    integerCost: true,
    negligibleDebitPolicy: 'allow-for-purchase',
    ...overrides,
  }
}

describe('dormant V2 Decimal transaction primitives', () => {
  test('quotes exact affordability and scales units by purchase batches', () => {
    const quote = quoteV2Purchase(purchaseRequest())

    expect(quote).toMatchObject({
      accepted: true,
      changed: true,
      rejection: 'none',
      sourceRevision: 7,
      currencyPath: '$.dyson.money',
    })
    expect(encoded(quote.batches)).toBe('2e0')
    expect(encoded(quote.unitsGranted)).toBe('6e0')
    expect(encoded(quote.quotedCost)).toBe('1e2')
    expect(encoded(quote.debitedAmount)).toBe('1e2')
    expect(encoded(quote.expectedBalance)).toBe('0')
    expect(encoded(quote.expectedOutput)).toBe('6e0')
    expect(Object.isFrozen(quote)).toBe(true)
  })

  test('ceil-rounds integer costs and keeps ordinary costs unrounded', () => {
    const integerQuote = quoteV2Purchase(purchaseRequest({
      balance: integer(2),
      quotedCost: decimal(1.01),
    }))
    const ordinaryQuote = quoteV2Purchase(purchaseRequest({
      balance: decimal(2),
      balanceSemantic: 'ordinary',
      quotedCost: decimal(1.01),
      integerCost: false,
    }))

    expect(encoded(integerQuote.quotedCost)).toBe('2e0')
    expect(encoded(integerQuote.expectedBalance)).toBe('0')
    expect(encoded(ordinaryQuote.quotedCost)).toBe('1.01e0')
    expect(encoded(ordinaryQuote.expectedBalance)).toBe('9.9e-1')
  })

  test('uses strict comparison with no affordability epsilon', () => {
    const balance = decimal(99.99999999999999)
    const quote = quoteV2Purchase(purchaseRequest({
      balance,
      balanceSemantic: 'ordinary',
      integerCost: false,
    }))

    expect(quote.accepted).toBe(false)
    expect(quote.rejection).toBe('insufficient-funds')
    expect(encoded(quote.expectedBalance)).toBe(encoded(balance))
  })

  test('treats the playable maximum cost as an unaffordable sentinel', () => {
    const quote = quoteV2Purchase(purchaseRequest({
      balance: GAME_DECIMAL_MAXIMUM,
      balanceSemantic: 'ordinary',
      output: decimal(0),
      outputSemantic: 'ordinary',
      batches: integer(1),
      unitsPerPurchase: integer(1),
      quotedCost: GAME_DECIMAL_MAXIMUM,
      integerCost: false,
    }))

    expect(quote.accepted).toBe(false)
    expect(quote.rejection).toBe('maximum-reached')
    expect(encoded(quote.quotedCost)).toBe(encoded(GAME_DECIMAL_MAXIMUM))
  })

  test('allows a represented-free purchase debit only under explicit policy', () => {
    const huge = gameDecimalFromCanonicalString('1e400')
    const allowed = quoteV2Purchase(purchaseRequest({
      balance: huge,
      balanceSemantic: 'ordinary',
      output: huge,
      outputSemantic: 'ordinary',
      batches: integer(1),
      unitsPerPurchase: integer(1),
      quotedCost: integer(1),
      integerCost: false,
      negligibleDebitPolicy: 'allow-for-purchase',
    }))
    const forbidden = quoteV2Purchase(purchaseRequest({
      balance: huge,
      balanceSemantic: 'ordinary',
      output: decimal(0),
      outputSemantic: 'ordinary',
      batches: integer(1),
      unitsPerPurchase: integer(1),
      quotedCost: integer(1),
      integerCost: false,
      negligibleDebitPolicy: 'reject',
    }))

    expect(allowed.accepted).toBe(true)
    expect(allowed.changed).toBe(false)
    expect(encoded(allowed.debitedAmount)).toBe('0')
    expect(encoded(allowed.expectedBalance)).toBe('1e400')
    expect(encoded(allowed.expectedOutput)).toBe('1e400')
    expect(forbidden.accepted).toBe(false)
    expect(forbidden.rejection).toBe('negligible-debit-forbidden')
  })

  test('commits immutable quotes once and rejects stale or mismatched state', () => {
    const balance = integer(100)
    const output = integer(0)
    const quote = quoteV2Purchase(purchaseRequest({ balance, output }))
    const committed = commitV2Purchase(quote, {
      revision: 7,
      balance,
      output,
    })
    const stale = commitV2Purchase(quote, {
      revision: 8,
      balance,
      output,
    })
    const mismatched = commitV2Purchase(quote, {
      revision: 7,
      balance: integer(99),
      output,
    })

    expect(committed).toMatchObject({
      accepted: true,
      changed: true,
      revision: 8,
    })
    expect(stale.rejection).toBe('stale-revision')
    expect(mismatched.rejection).toBe('state-mismatch')
    expect(encoded(stale.balance)).toBe('1e2')
    expect(encoded(mismatched.balance)).toBe('9.9e1')
    expect(committed.balance).not.toBe(quote.expectedBalance)
    expect(committed.output).not.toBe(quote.expectedOutput)
    expect(quote.sourceBalance).not.toBe(balance)
    expect(quote.sourceOutput).not.toBe(output)
    expect(Object.isFrozen(committed)).toBe(true)
  })

  test('rejects caller-forged quote payloads and rederives issued quotes', () => {
    const balance = integer(100)
    const output = integer(0)
    const issued = quoteV2Purchase(purchaseRequest({ balance, output }))
    const forged = Object.freeze({
      ...issued,
      expectedBalance: integer(99),
    })

    const rejected = commitV2Purchase(forged, {
      revision: 7,
      balance,
      output,
    })
    const accepted = commitV2Purchase(issued, {
      revision: 7,
      balance,
      output,
    })

    expect(rejected.rejection).toBe('quote-rejected')
    expect(encoded(rejected.balance)).toBe('1e2')
    expect(accepted.accepted).toBe(true)
  })

  test('rejects hostile unissued purchase quotes without reading them', () => {
    const current = {
      revision: 7,
      balance: integer(100),
      output: integer(0),
    }
    let getterCalls = 0
    const accessorBacked = Object.defineProperties({}, {
      accepted: { get: () => { getterCalls += 1; return true } },
      sourceRevision: { get: () => { getterCalls += 1; return 7 } },
      quotedCost: { get: () => { getterCalls += 1; return integer(1) } },
      expectedBalance: { get: () => { getterCalls += 1; return integer(99) } },
    })
    const hostileCommit = commitV2Purchase as unknown as (
      quote: unknown,
      state: Parameters<typeof commitV2Purchase>[1],
    ) => ReturnType<typeof commitV2Purchase>

    for (const hostile of [
      null,
      undefined,
      1,
      'quote',
      Object.create(null),
      accessorBacked,
    ]) {
      expect(() => hostileCommit(hostile, current)).not.toThrow()
      const rejected = hostileCommit(hostile, current)
      expect(rejected).toMatchObject({
        accepted: false,
        changed: false,
        rejection: 'quote-rejected',
        revision: 7,
      })
      expect(encoded(rejected.balance)).toBe('1e2')
      expect(encoded(rejected.output)).toBe('0')
      expect(encoded(rejected.quotedCost)).toBe('0')
    }
    expect(getterCalls).toBe(0)
  })

  test('requires checked non-negative safe-integer number revisions', () => {
    for (const sourceRevision of [
      -1,
      -0,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const quote = quoteV2Purchase(purchaseRequest({ sourceRevision }))
      expect(quote).toMatchObject({
        accepted: false,
        rejection: 'invalid-request',
      })
    }

    const compileTimeBigIntRevision = () => quoteV2Purchase({
      ...purchaseRequest(),
      // @ts-expect-error Application revisions remain bounded numbers.
      sourceRevision: 1n,
    })
    void compileTimeBigIntRevision

    const exhausted = quoteV2Purchase(purchaseRequest({
      sourceRevision: Number.MAX_SAFE_INTEGER,
    }))
    expect(commitV2Purchase(exhausted, {
      revision: Number.MAX_SAFE_INTEGER,
      balance: integer(100),
      output: integer(0),
    }).rejection).toBe('revision-exhausted')
  })

  test('increments revision for debit-only changes and preserves it for true represented no-ops', () => {
    const huge = gameDecimalFromCanonicalString('1e400')
    const debitOnly = quoteV2Purchase(purchaseRequest({
      balance: integer(1_000),
      output: huge,
      outputSemantic: 'ordinary',
      batches: integer(1),
      unitsPerPurchase: integer(1),
      quotedCost: integer(10),
    }))
    const noOp = quoteV2Purchase(purchaseRequest({
      balance: huge,
      balanceSemantic: 'ordinary',
      output: huge,
      outputSemantic: 'ordinary',
      batches: integer(1),
      unitsPerPurchase: integer(1),
      quotedCost: integer(1),
      integerCost: false,
    }))

    const debitOnlyCommit = commitV2Purchase(debitOnly, {
      revision: 7,
      balance: integer(1_000),
      output: huge,
    })
    const noOpCommit = commitV2Purchase(noOp, {
      revision: 7,
      balance: huge,
      output: huge,
    })

    expect(debitOnly.changed).toBe(true)
    expect(debitOnlyCommit.revision).toBe(8)
    expect(noOp.changed).toBe(false)
    expect(noOpCommit).toMatchObject({
      accepted: true,
      changed: false,
      revision: 7,
    })
  })

  test('preserves buy 1, 10, 50, 100, rounded, and max batch semantics', () => {
    const selected = (
      mode: Parameters<typeof selectV2PurchaseBatches>[0]['mode'],
      rounded = false,
      currentOwned = integer(0),
    ) => encoded(selectV2PurchaseBatches({
      mode,
      rounded,
      currentOwned,
      affordable: integer(123),
    }))

    expect(selected('buy-1')).toBe('1e0')
    expect(selected('buy-10')).toBe('1e1')
    expect(selected('buy-50')).toBe('5e1')
    expect(selected('buy-100')).toBe('1e2')
    expect(selected('buy-max')).toBe('1.23e2')
    expect(selected('buy-10', true, integer(17))).toBe('3e0')
    expect(selected('buy-50', true, integer(100))).toBe('5e1')
  })

  test('caps fixed-price Buy Max at exactly 1000 batches and scales batch units', () => {
    const quote = quoteV2FixedPriceBuyMax({
      ...purchaseRequest({
        balance: gameDecimalFromCanonicalString('1e400'),
        balanceSemantic: 'ordinary',
        output: integer(0),
        batches: integer(1),
        unitsPerPurchase: integer(7),
        quotedCost: integer(1),
      }),
      pricePerBatch: integer(2),
    })
    const limitedByFunds = quoteV2FixedPriceBuyMax({
      ...purchaseRequest({
        balance: integer(19),
        batches: integer(1),
        unitsPerPurchase: integer(4),
        quotedCost: integer(1),
      }),
      pricePerBatch: integer(2),
    })

    expect(encoded(V2_FIXED_PRICE_BUY_MAX_BATCH_CAP)).toBe('1e3')
    expect(encoded(quote.batches)).toBe('1e3')
    expect(encoded(quote.unitsGranted)).toBe('7e3')
    expect(encoded(quote.quotedCost)).toBe('2e3')
    expect(encoded(limitedByFunds.batches)).toBe('9e0')
    expect(encoded(limitedByFunds.unitsGranted)).toBe('3.6e1')
  })

  test('handles ratio one through the fixed-price 1000-batch policy', () => {
    const quote = quoteV2GeometricBuyMax({
      ...purchaseRequest({
        balance: gameDecimalFromCanonicalString('1e100'),
        balanceSemantic: 'ordinary',
        batches: integer(1),
        unitsPerPurchase: integer(5),
        quotedCost: integer(1),
      }),
      firstBatchCost: integer(3),
      ratio: 1,
    })

    expect(quote.accepted).toBe(true)
    expect(encoded(quote.batches)).toBe('1e3')
    expect(encoded(quote.unitsGranted)).toBe('5e3')
    expect(encoded(quote.quotedCost)).toBe('3e3')
  })

  test('computes exponential and geometric costs without quantity narrowing', () => {
    expect(encoded(exponentialCostV2(integer(2), 3, integer(4))))
      .toBe('1.6199999999999999e2')
    expect(encoded(geometricSeriesCostV2(integer(2), 3, integer(3))))
      .toBe('2.6e1')
    expect(encoded(geometricSeriesCostV2(integer(2), 1, integer(3))))
      .toBe('6e0')

    const beyondDouble = exponentialCostV2(
      gameDecimalFromCanonicalString('1e400'),
      10,
      integer(1_000),
    )
    expect(encoded(beyondDouble)).toBe('1e1400')
  })

  test('estimates geometric Buy Max then authoritatively recomputes cost', () => {
    const exact = quoteV2GeometricBuyMax({
      ...purchaseRequest({
        balance: integer(70),
        batches: integer(1),
        unitsPerPurchase: integer(2),
        quotedCost: integer(1),
      }),
      firstBatchCost: integer(10),
      ratio: 2,
    })
    const huge = quoteV2GeometricBuyMax({
      ...purchaseRequest({
        balance: gameDecimalFromCanonicalString('1e410'),
        balanceSemantic: 'ordinary',
        output: gameDecimalFromCanonicalString('1e400'),
        outputSemantic: 'ordinary',
        batches: integer(1),
        unitsPerPurchase: integer(1),
        quotedCost: integer(1),
        integerCost: false,
      }),
      firstBatchCost: gameDecimalFromCanonicalString('1e400'),
      ratio: 10,
    })

    expect(exact.accepted).toBe(true)
    expect(encoded(exact.batches)).toBe('3e0')
    expect(encoded(exact.quotedCost)).toBe('7e1')
    expect(encoded(exact.unitsGranted)).toBe('6e0')
    expect(huge.accepted).toBe(true)
    expect(encoded(huge.batches)).toBe('1e1')
    expect(huge.batches.exponent).toBeLessThan(100)
  })

  test('accepts 1.05 and the nearest representable ratio above one', () => {
    const ratio105Cost = geometricSeriesCostV2(
      integer(10),
      1.05,
      integer(5),
    )
    const ratio105 = quoteV2GeometricBuyMax({
      ...purchaseRequest({
        balance: ratio105Cost,
        balanceSemantic: 'ordinary',
        batches: integer(1),
        unitsPerPurchase: integer(1),
        quotedCost: integer(1),
        integerCost: false,
      }),
      firstBatchCost: integer(10),
      ratio: 1.05,
    })

    const nearestRatio = 1 + Number.EPSILON
    const nearestCost = geometricSeriesCostV2(
      integer(1),
      nearestRatio,
      integer(20),
    )
    let evaluations = 0
    const nearestCorrected = correctV2BulkEstimate(
      integer(20),
      nearestCost,
      (batches) => {
        evaluations += 1
        return geometricSeriesCostV2(
          integer(1),
          nearestRatio,
          batches,
        )
      },
    )

    expect(ratio105.accepted).toBe(true)
    expect(encoded(ratio105.batches)).toBe('5e0')
    expect(encoded(nearestCost)).toBe('2e1')
    expect(nearestCorrected.accepted).toBe(true)
    expect(encoded(nearestCorrected.batches)).toBe('2e1')
    expect(evaluations).toBeLessThanOrEqual(
      V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS + 1,
    )
  })

  test('applies at most 16 downward corrections and otherwise fails closed', () => {
    let evaluations = 0
    const failed = correctV2BulkEstimate(
      integer(20),
      integer(3),
      (batches) => {
        evaluations += 1
        return batches
      },
    )
    const corrected = correctV2BulkEstimate(
      integer(5),
      integer(3),
      (batches) => batches,
    )

    expect(failed).toEqual({
      accepted: false,
      rejection: 'correction-limit',
      batches: gameDecimalFromNumber(0),
      cost: gameDecimalFromNumber(0),
      corrections: V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS,
    })
    expect(evaluations).toBe(
      V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS + 1,
    )
    expect(corrected.accepted).toBe(true)
    expect(corrected.corrections).toBe(2)
    expect(encoded(corrected.batches)).toBe('3e0')
  })

  test('corrects an affordability estimate when subtracting one is below Decimal precision', () => {
    const available = gameDecimalFromCanonicalString(
      `1e${GAME_DECIMAL_EXPONENT_LIMIT - 1}`,
    )
    const result = maximumAffordableGeometricBatchesV2({
      available,
      firstBatchCost: gameDecimalFromCanonicalString('4.2e19'),
      ratio: 3.9,
      integerCost: false,
    })

    expect(result.accepted).toBe(true)
    expect(result.corrections).toBeGreaterThan(0)
    expect(compareGameDecimals(result.cost, available)).toBeLessThanOrEqual(0)
  })

  test('fails fast for a quantity beyond the practical bigint budget', () => {
    const enormousQuantity = gameDecimalFromCanonicalString('1e5000')
    let evaluations = 0
    const result = correctV2BulkEstimate(
      enormousQuantity,
      gameDecimalFromCanonicalString('1e400'),
      (batches) => {
        evaluations += 1
        return geometricSeriesCostV2(integer(1), 1.1, batches)
      },
    )

    expect(result).toMatchObject({
      accepted: false,
      rejection: 'invalid-request',
      corrections: 0,
    })
    expect(evaluations).toBe(1)
  })

  test('rejects invalid geometric domains without changing represented state', () => {
    const request = {
      ...purchaseRequest({
        balance: integer(10),
        batches: integer(1),
        quotedCost: integer(1),
      }),
      firstBatchCost: integer(1),
      ratio: 0.5,
    }
    const quote = quoteV2GeometricBuyMax(request)

    expect(quote.accepted).toBe(false)
    expect(quote.rejection).toBe('invalid-request')
    expect(encoded(quote.expectedBalance)).toBe('1e1')
    expect(encoded(quote.expectedOutput)).toBe('0')
  })

  test('quotes and commits multi-source recipes atomically', () => {
    const accounts = [
      account('housing', 10, 'integer'),
      account('energy', 20, 'ordinary'),
      account('villages', 1, 'integer'),
    ] as const
    const quote = quoteV2AtomicExchange({
      sourceRevision: 9,
      accounts,
      debits: [
        { accountId: 'housing', amount: integer(4) },
        { accountId: 'energy', amount: decimal(5) },
      ],
      credits: [
        { accountId: 'villages', amount: integer(2) },
      ],
    })
    const committed = commitV2AtomicExchange(quote, {
      revision: 9,
      accounts,
    })

    expect(quote.accepted).toBe(true)
    expect(committed).toMatchObject({
      accepted: true,
      changed: true,
      revision: 10,
    })
    expect(Object.fromEntries(
      committed.accounts.map((entry) => [entry.id, encoded(entry.balance)]),
    )).toEqual({
      housing: '6e0',
      energy: '1.5e1',
      villages: '3e0',
    })
    expect(accounts[0].balance).toBeDefined()
    expect(encoded(accounts[0].balance)).toBe('1e1')
  })

  test('rejects hostile unissued atomic quotes without reading them', () => {
    const current = {
      revision: 9,
      accounts: [
        account('housing', 10, 'integer'),
        account('energy', 20, 'ordinary'),
      ],
    }
    let getterCalls = 0
    const accessorBacked = Object.defineProperties({}, {
      accepted: { get: () => { getterCalls += 1; return true } },
      sourceRevision: { get: () => { getterCalls += 1; return 9 } },
      before: { get: () => { getterCalls += 1; return current.accounts } },
      after: { get: () => { getterCalls += 1; return current.accounts } },
    })
    const hostileCommit = commitV2AtomicExchange as unknown as (
      quote: unknown,
      state: Parameters<typeof commitV2AtomicExchange>[1],
    ) => ReturnType<typeof commitV2AtomicExchange>

    for (const hostile of [
      null,
      undefined,
      1,
      'quote',
      Object.create(null),
      accessorBacked,
    ]) {
      expect(() => hostileCommit(hostile, current)).not.toThrow()
      const rejected = hostileCommit(hostile, current)
      expect(rejected).toMatchObject({
        accepted: false,
        changed: false,
        rejection: 'quote-rejected',
        revision: 9,
      })
      expect(rejected.accounts.map((entry) => encoded(entry.balance)))
        .toEqual(['1e1', '2e1'])
    }
    expect(getterCalls).toBe(0)
  })

  test('rejects negligible transfer debits and credits with no partial mutation', () => {
    const huge = gameDecimalFromCanonicalString('1e400')
    const debitRejected = quoteV2AtomicExchange({
      sourceRevision: 1,
      accounts: [
        { id: 'fuel', balance: huge, semantic: 'ordinary' },
        account('engine', 0, 'ordinary'),
      ],
      debits: [{ accountId: 'fuel', amount: decimal(1) }],
      credits: [{ accountId: 'engine', amount: decimal(1) }],
    })
    const creditRejected = quoteV2AtomicExchange({
      sourceRevision: 1,
      accounts: [
        account('fuel', 10, 'ordinary'),
        { id: 'engine', balance: huge, semantic: 'ordinary' },
      ],
      debits: [{ accountId: 'fuel', amount: decimal(1) }],
      credits: [{ accountId: 'engine', amount: decimal(1) }],
    })

    expect(debitRejected.rejection).toBe('unrepresented-debit')
    expect(creditRejected.rejection).toBe('unrepresented-credit')
    for (const quote of [debitRejected, creditRejected]) {
      expect(quote.accepted).toBe(false)
      expect(quote.changed).toBe(false)
      expect(quote.after.map((entry) => encoded(entry.balance)))
        .toEqual(quote.before.map((entry) => encoded(entry.balance)))
    }
  })

  test('rejects insufficient, fractional integer, stale, and aliased exchanges', () => {
    const shared = integer(10)
    const accounts = [
      { id: 'left', balance: shared, semantic: 'integer' as const },
      { id: 'right', balance: shared, semantic: 'integer' as const },
    ]
    const insufficient = quoteV2AtomicExchange({
      sourceRevision: 1,
      accounts,
      debits: [{ accountId: 'left', amount: integer(11) }],
      credits: [{ accountId: 'right', amount: integer(1) }],
    })
    const fractional = quoteV2AtomicExchange({
      sourceRevision: 1,
      accounts,
      debits: [{ accountId: 'left', amount: decimal(0.5) }],
      credits: [{ accountId: 'right', amount: integer(1) }],
    })
    const valid = quoteV2AtomicExchange({
      sourceRevision: 1,
      accounts,
      debits: [{ accountId: 'left', amount: integer(1) }],
      credits: [{ accountId: 'right', amount: integer(1) }],
    })
    const stale = commitV2AtomicExchange(valid, {
      revision: 2,
      accounts,
    })

    expect(insufficient.rejection).toBe('insufficient-source')
    expect(fractional.accepted).toBe(false)
    expect(stale.rejection).toBe('stale-revision')
    expect(valid.before[0]!.balance).not.toBe(shared)
    expect(valid.before[1]!.balance).not.toBe(shared)
    expect(valid.before[0]!.balance).not.toBe(valid.before[1]!.balance)
    expect(valid.after[0]!.balance).not.toBe(valid.before[0]!.balance)
    expect(valid.before.every((entry) => isGameDecimal(entry.balance)))
      .toBe(true)
    expect(Object.isFrozen(valid.before)).toBe(true)
    expect(Object.isFrozen(valid.after)).toBe(true)
  })
})

function account(
  id: string,
  value: number,
  semantic: 'ordinary' | 'integer',
): V2AtomicAccount {
  return Object.freeze({
    id,
    balance: semantic === 'integer' ? integer(value) : decimal(value),
    semantic,
  })
}
