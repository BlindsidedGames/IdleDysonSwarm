import { expect, test } from 'vitest'
import { isAvocatoRouteUnlocked } from './avocatoNavigation'

test.each([
  ['before progression', false, false, false, 0n, false, false],
  ['first Infinity', true, false, false, 0n, false, true],
  ['existing Discovery', false, true, false, 0n, false, true],
  ['Transcendence pending', false, false, true, 0n, false, true],
  ['saved TP', false, false, false, 1n, false, true],
  ['developer override', false, false, false, 0n, true, true],
] as const)('%s', (_name, firstInfinityComplete, discoveryUnlocked, overflowPending, overflowPoints, developmentOverride, expected) => {
  expect(isAvocatoRouteUnlocked({ firstInfinityComplete, discoveryUnlocked, overflowPending, overflowPoints, developmentOverride })).toBe(expected)
})
