/** Transcendence progression and its Avocato store always open together. */
export function isAvocatoRouteUnlocked({ firstInfinityComplete, discoveryUnlocked, overflowPending, overflowPoints, developmentOverride = false }: {
  readonly firstInfinityComplete: boolean
  readonly discoveryUnlocked: boolean
  readonly overflowPending: boolean
  readonly overflowPoints: bigint
  readonly developmentOverride?: boolean
}): boolean {
  return firstInfinityComplete || discoveryUnlocked || overflowPending || overflowPoints > 0n || developmentOverride
}
