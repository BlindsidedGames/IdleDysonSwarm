/** Quantum purchase and reaching Overflow independently grant route access. */
export function isAvocatoRouteUnlocked({ purchased, overflowPending, overflowPoints, developmentOverride = false }: {
  readonly purchased: boolean
  readonly overflowPending: boolean
  readonly overflowPoints: bigint
  readonly developmentOverride?: boolean
}): boolean {
  return purchased || overflowPending || overflowPoints > 0n || developmentOverride
}
