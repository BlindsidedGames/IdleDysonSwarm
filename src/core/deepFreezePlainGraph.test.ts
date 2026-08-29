import { describe, expect, test } from 'vitest'
import { deepFreezePlainGraph } from './deepFreezePlainGraph'

describe('plain graph deep freeze', () => {
  test('freezes an owned nested object graph without replacing it', () => {
    const source = {
      nested: { value: 1 },
      values: [{ value: 2 }],
    }

    const frozen = deepFreezePlainGraph(source)

    expect(frozen).toBe(source)
    expect(Object.isFrozen(source)).toBe(true)
    expect(Object.isFrozen(source.nested)).toBe(true)
    expect(Object.isFrozen(source.values)).toBe(true)
    expect(Object.isFrozen(source.values[0])).toBe(true)
  })

  test('retains primitives and null', () => {
    expect(deepFreezePlainGraph(null)).toBeNull()
    expect(deepFreezePlainGraph(42)).toBe(42)
    expect(deepFreezePlainGraph('value')).toBe('value')
  })

  test('does not traverse an object that is already frozen', () => {
    const child = { value: 1 }
    const source = Object.freeze({ child })

    expect(deepFreezePlainGraph(source)).toBe(source)
    expect(Object.isFrozen(child)).toBe(false)
  })
})
