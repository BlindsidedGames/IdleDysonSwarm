import { describe, expect, test, vi } from 'vitest'
import {
  asAutomaticUnityPurchaseEvidencePromoter,
} from './automaticPurchaseEvidence'

describe('automatic Unity purchase evidence capability', () => {
  test('rejects absent and non-callable promotion capabilities', () => {
    expect(asAutomaticUnityPurchaseEvidencePromoter(undefined)).toBeUndefined()
    expect(asAutomaticUnityPurchaseEvidencePromoter({})).toBeUndefined()
    expect(asAutomaticUnityPurchaseEvidencePromoter({
      promoteAutomaticUnityPurchaseEvidence: true,
    })).toBeUndefined()
  })

  test('retains the exact host authority when promotion is callable', () => {
    const authority = {
      promoteAutomaticUnityPurchaseEvidence: vi.fn(async () => undefined),
    }

    expect(asAutomaticUnityPurchaseEvidencePromoter(authority)).toBe(authority)
  })
})
