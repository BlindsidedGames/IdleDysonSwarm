// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { StableSingleLineText } from './StableSingleLineText'

const componentStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'components', 'components.css'),
  'utf8',
)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('StableSingleLineText', () => {
  test('enforces a clipped single line while retaining an unscaled measurer', () => {
    expect(componentStyles).toMatch(
      /\.ui-stable-single-line-text\s*\{[^}]*overflow:\s*hidden;[^}]*white-space:\s*nowrap;/s,
    )
    expect(componentStyles).toMatch(
      /\.ui-stable-single-line-text__visible\s*\{[^}]*font-size:\s*var\(--ui-stable-single-line-font-size, 1em\);[^}]*vertical-align:\s*top;[^}]*white-space:\s*nowrap;/s,
    )
    expect(componentStyles).toMatch(
      /\.ui-stable-single-line-text__measurement\s*\{[^}]*inline-size:\s*max-content;[^}]*visibility:\s*hidden;/s,
    )
  })

  test('reduces immediately and grows after the layout stays quiet', () => {
    vi.useFakeTimers()
    let resize: ResizeObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback
        }
        observe = observe
        disconnect = disconnect
      },
    )

    const rendered = render(
      <StableSingleLineText measurement="widest possible sentence">
        live sentence
      </StableSingleLineText>,
    )
    const container = rendered.container.querySelector<HTMLElement>(
      '.ui-stable-single-line-text',
    )
    const measurement = rendered.container.querySelector<HTMLElement>(
      '.ui-stable-single-line-text__measurement',
    )
    if (container === null || measurement === null) {
      throw new Error('Expected stable single-line elements to render.')
    }

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 200,
    })
    measurement.getBoundingClientRect = () => ({
      width: 250,
    } as DOMRect)
    act(() => resize?.([], {} as ResizeObserver))

    expect(container).toHaveStyle(
      '--ui-stable-single-line-font-size: 0.792em',
    )
    expect(observe).toHaveBeenCalledTimes(2)

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 500,
    })
    measurement.getBoundingClientRect = () => ({
      width: 100,
    } as DOMRect)
    act(() => resize?.([], {} as ResizeObserver))

    expect(container).toHaveStyle(
      '--ui-stable-single-line-font-size: 0.792em',
    )

    act(() => vi.advanceTimersByTime(1_500))
    act(() => resize?.([], {} as ResizeObserver))
    act(() => vi.advanceTimersByTime(1_999))
    expect(container).toHaveStyle(
      '--ui-stable-single-line-font-size: 0.792em',
    )

    act(() => vi.advanceTimersByTime(1))
    expect(container).toHaveStyle(
      '--ui-stable-single-line-font-size: 1em',
    )
    rendered.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  test('uses its readability floor for exceptionally narrow containers', () => {
    let resize: ResizeObserverCallback | undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const rendered = render(
      <StableSingleLineText measurement="widest" minimumScale={0.75}>
        live
      </StableSingleLineText>,
    )
    const container = rendered.container.querySelector<HTMLElement>(
      '.ui-stable-single-line-text',
    )
    const measurement = rendered.container.querySelector<HTMLElement>(
      '.ui-stable-single-line-text__measurement',
    )
    if (container === null || measurement === null) {
      throw new Error('Expected stable single-line elements to render.')
    }
    Object.defineProperty(container, 'clientWidth', { value: 50 })
    measurement.getBoundingClientRect = () => ({ width: 500 } as DOMRect)
    act(() => resize?.([], {} as ResizeObserver))

    expect(container).toHaveStyle(
      '--ui-stable-single-line-font-size: 0.75em',
    )
  })
})
