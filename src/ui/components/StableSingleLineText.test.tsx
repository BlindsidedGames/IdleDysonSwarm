// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { StableSingleLineText } from './StableSingleLineText'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('fits enlarged live text below the preferred floor without pulsing on value changes', () => {
  vi.useFakeTimers()
  const callbacks: ResizeObserverCallback[] = []
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    disconnect = disconnect
  })
  const view = render(<StableSingleLineText measurement="widest reference">live value</StableSingleLineText>)
  const container = view.container.firstElementChild as HTMLElement
  const visible = container.querySelector('.ui-stable-single-line-text__visible') as HTMLElement
  const measurement = container.querySelector('.ui-stable-single-line-text__measurement') as HTMLElement
  let available = 302
  let naturalWidth = 530
  const scale = () => Number.parseFloat(container.style.getPropertyValue('--ui-stable-single-line-font-size'))
  Object.defineProperty(container, 'clientWidth', { get: () => available })
  visible.getBoundingClientRect = () => ({ width: naturalWidth * scale() }) as DOMRect
  measurement.getBoundingClientRect = () => ({ width: 700 }) as DOMRect
  const resize = (target: Element) => act(() => callbacks[0]!([{ target } as ResizeObserverEntry], {} as ResizeObserver))

  resize(container)
  expect(scale() * naturalWidth).toBeLessThanOrEqual(available - 2)
  expect(scale()).toBeLessThan(0.72)
  act(() => vi.advanceTimersByTime(2000))
  const retained = scale()
  naturalWidth = 350
  view.rerender(<StableSingleLineText measurement="widest reference">shorter value</StableSingleLineText>)
  resize(visible)
  act(() => vi.advanceTimersByTime(3000))
  expect(scale()).toBe(retained)
  expect(callbacks).toHaveLength(1)

  available = 800
  resize(container)
  expect(scale()).toBe(retained)
  act(() => vi.advanceTimersByTime(2000))
  expect(scale()).toBe(1)
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
