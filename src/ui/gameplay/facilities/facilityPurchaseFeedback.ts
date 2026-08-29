export interface FacilityPresentationRevision {
  readonly session: number
  readonly state: number
}

export type FacilityPurchaseFeedback = {
  readonly state: 'success' | 'stale' | 'rejected' | 'failed'
  readonly revision: FacilityPresentationRevision
  readonly activationRevision: FacilityPresentationRevision
}

export function sameFacilityRevision(
  left: FacilityPresentationRevision,
  right: FacilityPresentationRevision,
): boolean {
  return left.session === right.session && left.state === right.state
}

export function facilityFeedbackMatchesRevision(
  feedback: FacilityPurchaseFeedback | undefined,
  revision: FacilityPresentationRevision,
): boolean {
  return feedback !== undefined && (
    sameFacilityRevision(feedback.revision, revision) ||
    sameFacilityRevision(feedback.activationRevision, revision)
  )
}
