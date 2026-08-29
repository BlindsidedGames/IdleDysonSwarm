import { describe, expect, test } from 'vitest'
import {
  facilityFeedbackMatchesRevision,
  sameFacilityRevision,
  type FacilityPurchaseFeedback,
} from './facilityPurchaseFeedback'

const feedback: FacilityPurchaseFeedback = {
  state: 'success',
  revision: { session: 2, state: 4 },
  activationRevision: { session: 2, state: 3 },
}

describe('facility purchase feedback revisions', () => {
  test('matches identical session and state revisions', () => {
    expect(sameFacilityRevision({ session: 2, state: 4 }, feedback.revision))
      .toBe(true)
    expect(sameFacilityRevision({ session: 3, state: 4 }, feedback.revision))
      .toBe(false)
    expect(sameFacilityRevision({ session: 2, state: 5 }, feedback.revision))
      .toBe(false)
  })

  test('retains feedback for its result or activation revision only', () => {
    expect(facilityFeedbackMatchesRevision(feedback, { session: 2, state: 4 }))
      .toBe(true)
    expect(facilityFeedbackMatchesRevision(feedback, { session: 2, state: 3 }))
      .toBe(true)
    expect(facilityFeedbackMatchesRevision(feedback, { session: 2, state: 5 }))
      .toBe(false)
    expect(facilityFeedbackMatchesRevision(undefined, feedback.revision))
      .toBe(false)
  })
})
