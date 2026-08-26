// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FORWARD_PROGRESS_INTERVAL_MILLISECONDS,
  buildForwardProgressKeyframes,
  useForwardProgressAnimation,
} from './useForwardProgressAnimation'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('forward progress animation', () => {
  it('predicts the next canonical interval from the published rate', () => {
    expect(buildForwardProgressKeyframes(0.2, 1, true)).toEqual([
      { offset: 0, transform: 'scaleX(0.2)' },
      { offset: 1, transform: 'scaleX(0.233)' },
    ])
    expect(FORWARD_PROGRESS_INTERVAL_MILLISECONDS).toBe(33)
  })

  it('fills, resets and continues forward when the prediction wraps', () => {
    expect(buildForwardProgressKeyframes(0.95, 2, true)).toEqual([
      { offset: 0, transform: 'scaleX(0.95)' },
      { offset: 0.7575757575757582, transform: 'scaleX(1)' },
      { offset: 0.7575767575757583, transform: 'scaleX(0)' },
      { offset: 1, transform: 'scaleX(0.016000000000000014)' },
    ])
  })

  it('uses one bounded representative wrap at extreme forward rates', () => {
    const keyframes = buildForwardProgressKeyframes(
      0.25,
      1_280_000_000 / 128,
      true,
    )

    expect(keyframes).toEqual([
      { offset: 0, transform: 'scaleX(0.25)' },
      { offset: 0.75, transform: 'scaleX(1)' },
      { offset: 0.750001, transform: 'scaleX(0)' },
      { offset: 1, transform: 'scaleX(0.25)' },
    ])
  })

  it('keeps maximum-rate keyframes finite, bounded and ordered', () => {
    const keyframes = buildForwardProgressKeyframes(
      0.4,
      Number.MAX_VALUE,
      true,
    )
    const offsets = keyframes.map(({ offset }) => Number(offset))

    expect(keyframes.length).toBeLessThanOrEqual(4)
    expect(offsets.every(Number.isFinite)).toBe(true)
    expect(offsets.every((offset) => offset >= 0 && offset <= 1)).toBe(true)
    expect(offsets).toEqual([...offsets].sort((left, right) => left - right))
  })

  it('holds at completion instead of wrapping a one-shot cycle', () => {
    expect(buildForwardProgressKeyframes(0.95, 2, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.95)' },
      { offset: 0.7575757575757582, transform: 'scaleX(1)' },
      { offset: 1, transform: 'scaleX(1)' },
    ])
  })

  it('projects a decreasing timer toward the next canonical value', () => {
    expect(buildForwardProgressKeyframes(0.8, -1, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.8)' },
      { offset: 1, transform: 'scaleX(0.767)' },
    ])
  })

  it('holds a decreasing timer at zero when it completes mid-tick', () => {
    expect(buildForwardProgressKeyframes(0.05, -2, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.05)' },
      { offset: 0.7575757575757576, transform: 'scaleX(0)' },
      { offset: 1, transform: 'scaleX(0)' },
    ])
  })

  it('does not animate invalid, stationary or complete progress', () => {
    expect(buildForwardProgressKeyframes(0.2, 0, true)).toEqual([])
    expect(buildForwardProgressKeyframes(0.2, Number.NaN, true)).toEqual([])
    expect(buildForwardProgressKeyframes(1, 1, true)).toEqual([])
  })

  it('does not restart an unchanged animation after an unrelated render', () => {
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel } as unknown as Animation))
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate,
    })
    const view = render(createElement(ProgressHarness, {
      progress: 0.2,
      unrelated: 'first',
    }))

    expect(animate).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()

    view.rerender(createElement(ProgressHarness, {
      progress: 0.2,
      unrelated: 'second',
    }))

    expect(animate).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()

    view.rerender(createElement(ProgressHarness, {
      progress: 0.3,
      unrelated: 'second',
    }))

    expect(animate).toHaveBeenCalledTimes(2)
    expect(cancel).toHaveBeenCalledTimes(1)
    view.unmount()
    Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  })

  it('keeps canonical progress when the browser rejects an animation', () => {
    const animate = vi.fn(() => {
      throw new TypeError('Offsets must be monotonically non-decreasing.')
    })
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate,
    })

    const view = render(createElement(ProgressHarness, {
      progress: 0.4,
      unrelated: 'animation rejection',
      rate: 12_800_000_000 / 128,
    }))

    expect(animate).toHaveBeenCalledTimes(1)
    expect(
      (view.container.firstElementChild as HTMLElement).style.transform,
    ).toBe('scaleX(0.4)')
    view.unmount()
    Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  })
})

function ProgressHarness({
  progress,
  unrelated,
  rate = 1,
}: {
  readonly progress: number
  readonly unrelated: string
  readonly rate?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useForwardProgressAnimation(ref, {
    canonicalProgress: progress,
    normalizedRatePerSecond: rate,
    active: true,
    wraps: true,
    reducedMotion: false,
  })
  return createElement('div', { ref, 'data-unrelated': unrelated })
}
