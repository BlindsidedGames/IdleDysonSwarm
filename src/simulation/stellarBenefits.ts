/** Owned benefits persist after fracture; fracture removes its existing downside. */
export function stellarOrdinaryOutputMultiplier(owned: ReadonlySet<string>): number {
  return (owned.has('stellarImprovements') ? 2 : 1) *
    (owned.has('stellarDominance') ? 1000 : 1) *
    (owned.has('stellarObliteration') ? 1000 : 1) *
    (owned.has('supernova') ? 1000 : 1)
}
