import { describe, expect, it } from 'vitest'
import {
  projectPresentationValue,
  SMOOTH_PRESENTATION_MAXIMUM_LEAD_SECONDS,
} from './smoothPresentation'

describe('smooth numeric presentation', () => {
  it('projects a visible value between canonical ticks', () => {
    expect(projectPresentationValue(100, 20, 0.05)).toBe(101)
  })

  it('never extrapolates farther than the next tick can reasonably arrive', () => {
    expect(projectPresentationValue(100, 20, 10)).toBe(
      100 + 20 * SMOOTH_PRESENTATION_MAXIMUM_LEAD_SECONDS,
    )
  })

  it('clamps countdowns and saturating values without affecting canonical state', () => {
    expect(projectPresentationValue(0.03, -1, 0.1)).toBe(0)
    expect(
      projectPresentationValue(
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        0.1,
      ),
    ).toBe(Number.MAX_VALUE)
  })

  it('does not project invalid rates', () => {
    expect(projectPresentationValue(42, Number.NaN, 0.1)).toBe(42)
  })
})
