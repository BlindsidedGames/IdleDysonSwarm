import { describe, expect, it } from 'vitest'
import {
  FORWARD_PROGRESS_INTERVAL_MILLISECONDS,
  buildForwardProgressKeyframes,
} from './useForwardProgressAnimation'

describe('forward progress animation', () => {
  it('predicts the next canonical interval from the published rate', () => {
    expect(buildForwardProgressKeyframes(0.2, 1, true)).toEqual([
      { offset: 0, transform: 'scaleX(0.2)' },
      { offset: 1, transform: 'scaleX(0.30000000000000004)' },
    ])
    expect(FORWARD_PROGRESS_INTERVAL_MILLISECONDS).toBe(100)
  })

  it('fills, resets and continues forward when the prediction wraps', () => {
    expect(buildForwardProgressKeyframes(0.95, 1, true)).toEqual([
      { offset: 0, transform: 'scaleX(0.95)' },
      { offset: 0.5000000000000004, transform: 'scaleX(1)' },
      { offset: 0.5000010000000005, transform: 'scaleX(0)' },
      { offset: 1, transform: 'scaleX(0.050000000000000044)' },
    ])
  })

  it('holds at completion instead of wrapping a one-shot cycle', () => {
    expect(buildForwardProgressKeyframes(0.95, 1, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.95)' },
      { offset: 0.5000000000000004, transform: 'scaleX(1)' },
      { offset: 1, transform: 'scaleX(1)' },
    ])
  })

  it('does not animate invalid, stationary or complete progress', () => {
    expect(buildForwardProgressKeyframes(0.2, 0, true)).toEqual([])
    expect(buildForwardProgressKeyframes(0.2, Number.NaN, true)).toEqual([])
    expect(buildForwardProgressKeyframes(1, 1, true)).toEqual([])
  })
})
