import { describe, expect, test } from 'vitest'
import { SECRET_REVEAL_ORDER } from './secretRevealOrder'

describe('secret reveal order', () => {
  test('preserves the characterized 27-position presentation sequence', () => {
    expect(SECRET_REVEAL_ORDER).toEqual([
      0, 1, 2, 3, 4,
      6, 7, 8, 9, 10, 11, 12,
      14, 15, 16,
      29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18,
    ])
    expect(new Set(SECRET_REVEAL_ORDER).size).toBe(27)
  })
})
