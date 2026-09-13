// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { FittedProductionLine } from './FittedProductionLine'
import { splitProductionDisplay } from './productionDisplay'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('keeps one resize observer across live text updates and preserves shrink/resize growth policy', () => {
  const callbacks: (() => void)[] = []
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { callbacks.push(callback) }
    observe = observe
    disconnect = disconnect
  })
  const view = render(<FittedProductionLine display={splitProductionDisplay('1 per second')} />)
  const container = view.container.querySelector('p')!
  const line = container.querySelector('span')!
  let availableWidth = 80
  let naturalWidth = 100
  Object.defineProperty(container, 'clientWidth', { get: () => availableWidth })
  Object.defineProperty(line, 'scrollWidth', { get: () => naturalWidth })

  for (let value = 2; value <= 50; value += 1) {
    view.rerender(<FittedProductionLine display={splitProductionDisplay(`${value} per second`)} />)
  }
  expect(callbacks).toHaveLength(1)
  expect(observe).toHaveBeenCalledExactlyOnceWith(container)
  expect(disconnect).not.toHaveBeenCalled()
  expect(line.style.transform).toBe('scale(0.8)')

  naturalWidth = 120
  act(() => callbacks[0]!())
  expect(line.style.transform).toBe(`scale(${80 / 120})`)
  naturalWidth = 100
  view.rerender(<FittedProductionLine display={splitProductionDisplay('shorter')} />)
  expect(line.style.transform).toBe(`scale(${80 / 120})`)
  availableWidth = 110
  act(() => callbacks[0]!())
  expect(line.style.transform).toBe('scale(1)')
  view.unmount()
  expect(disconnect).toHaveBeenCalledTimes(1)
})

test('still measures text changes when ResizeObserver is unavailable', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  const view = render(<FittedProductionLine display={splitProductionDisplay('short')} />)
  const container = view.container.querySelector('p')!
  const line = container.querySelector('span')!
  Object.defineProperty(container, 'clientWidth', { value: 50 })
  Object.defineProperty(line, 'scrollWidth', { value: 100 })
  view.rerender(<FittedProductionLine display={splitProductionDisplay('longer')} />)
  expect(line.style.transform).toBe('scale(0.5)')
})
