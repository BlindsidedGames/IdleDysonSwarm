import { expect, test } from 'vitest'
import { isAvocatoRouteUnlocked } from './avocatoNavigation'

test.each([
  ['before either unlock', false, false, 0n, false, false],
  ['Quantum purchase before Overflow', true, false, 0n, false, true],
  ['Overflow pending without the purchase', false, true, 0n, false, true],
  ['after Overflow clears the purchase', false, false, 1n, false, true],
  ['developer override', false, false, 0n, true, true],
] as const)('%s', (_name, purchased, overflowPending, overflowPoints, developmentOverride, expected) => {
  expect(isAvocatoRouteUnlocked({ purchased, overflowPending, overflowPoints, developmentOverride })).toBe(expected)
})
