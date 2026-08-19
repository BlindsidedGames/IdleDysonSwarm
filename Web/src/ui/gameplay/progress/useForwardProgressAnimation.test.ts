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

  it('projects a decreasing timer toward the next canonical value', () => {
    expect(buildForwardProgressKeyframes(0.8, -1, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.8)' },
      { offset: 1, transform: 'scaleX(0.7000000000000001)' },
    ])
  })

  it('holds a decreasing timer at zero when it completes mid-tick', () => {
    expect(buildForwardProgressKeyframes(0.05, -1, false)).toEqual([
      { offset: 0, transform: 'scaleX(0.05)' },
      { offset: 0.5, transform: 'scaleX(0)' },
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
})

function ProgressHarness({
  progress,
  unrelated,
}: {
  readonly progress: number
  readonly unrelated: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useForwardProgressAnimation(ref, {
    canonicalProgress: progress,
    normalizedRatePerSecond: 1,
    active: true,
    wraps: true,
    reducedMotion: false,
  })
  return createElement('div', { ref, 'data-unrelated': unrelated })
}
