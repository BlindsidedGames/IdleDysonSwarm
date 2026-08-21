import rawFixture from './first-dyson-slice.fixture.json'

export type FrozenFirstDysonSliceFixture = Readonly<
  typeof rawFixture
>

/**
 * Returns a recursively detached and frozen artifact for first-slice UI tests.
 * Consumers receive recorded facts and coordinator outcomes only; no gameplay
 * mutators or economy calculations are available through this module.
 */
export function loadFrozenFirstDysonSliceFixture(): FrozenFirstDysonSliceFixture {
  return deepFreeze(structuredClone(rawFixture))
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry)
    }
    Object.freeze(value)
  }
  return value
}
