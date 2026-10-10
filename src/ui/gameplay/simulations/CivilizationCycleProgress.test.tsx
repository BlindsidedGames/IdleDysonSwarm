// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CivilizationCycleProgress } from './CivilizationCycleProgress'

// Distinct from the engine's conservation tests: exercise actual presentation
// under coarse publications, interruptions and mode changes. The Animation
// stub records browser instructions; it never calculates or supplies progress.
let now = 0
let reducedMotion = false
const mediaListeners = new Set<() => void>()
const originalAnimate = HTMLElement.prototype.animate
const animations: { frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: ReturnType<typeof vi.fn> }[] = []
beforeEach(() => {
  now = 0; reducedMotion = false; animations.length = 0; mediaListeners.clear()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reducedMotion }, addEventListener(_event: string, listener: () => void) { mediaListeners.add(listener) }, removeEventListener(_event: string, listener: () => void) { mediaListeners.delete(listener) } }))
  HTMLElement.prototype.animate = function(frames, options) {
    const animation = { frames: frames as Keyframe[], options: options as KeyframeAnimationOptions, cancel: vi.fn() }
    animations.push(animation)
    return animation as unknown as Animation
  }
})
afterEach(() => {
  cleanup(); HTMLElement.prototype.animate = originalAnimate
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})

const initial = {
  label: 'Gathering', value: 20, maximum: 100, valueText: '8s', timerText: '8s',
  sampleSeconds: 0, cycleKey: 'gathering:0', gameSpeed: 1, active: true,
  cycleRate: .1, locale: 'en' as const,
}
function view(props = initial) {
  return <IntlProvider locale="en" messages={{}}><CivilizationCycleProgress {...props} /></IntlProvider>
}
const fill = (container: HTMLElement) => container.querySelector<HTMLElement>('.civilization-cycle-fill')!
const progress = (container: HTMLElement) => container.querySelector<HTMLProgressElement>('progress')!
const mode = (container: HTMLElement) => container.querySelector('.civilization-cycle')!.getAttribute('data-presentation')

test('coarse samples and worker reallocation interpolate only observed work without restarting on ordinary rerenders', () => {
  const mounted = render(view())
  now = 1_000
  const next = { ...initial, value: 30, sampleSeconds: 1 }
  mounted.rerender(view(next))
  expect(animations[0].frames).toEqual([{ transform: 'scaleX(0.2)' }, { transform: 'scaleX(0.3)' }])
  expect(animations[0].options.duration).toBe(1_000)
  expect(progress(mounted.container).value).toBe(30)
  now = 1_500
  mounted.rerender(view({ ...next, valueText: '7.5s', timerText: '7.5s' }))
  expect(animations).toHaveLength(1)
  expect(animations[0].cancel).not.toHaveBeenCalled()
  mounted.rerender(view({ ...next, value: 35, sampleSeconds: 1.5, cycleRate: .05 }))
  expect(animations[1].frames).toEqual([{ transform: 'scaleX(0.25)' }, { transform: 'scaleX(0.35)' }])
  expect(animations[1].options.duration).toBe(500)
  expect(animations[0].cancel).toHaveBeenCalledOnce()
  expect(progress(mounted.container).value).toBe(35)
})

test('speed changes rebase from the current displayed value, and a blocked job stops at authoritative work', () => {
  const mounted = render(view())
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1 }))
  now = 1_500
  mounted.rerender(view({ ...initial, value: 40, sampleSeconds: 2, gameSpeed: 2 }))
  expect(animations[1].frames).toEqual([{ transform: 'scaleX(0.25)' }, { transform: 'scaleX(0.4)' }])
  expect(animations[1].options.duration).toBe(500)
  mounted.rerender(view({ ...initial, value: 40, sampleSeconds: 2, active: false, timerText: '∞', valueText: 'Waiting for workers' }))
  expect(animations[1].cancel).toHaveBeenCalledOnce()
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.4)')
  expect(progress(mounted.container).getAttribute('aria-valuetext')).toBe('Waiting for workers')
  now = 5_000
  mounted.rerender(view({ ...initial, value: 40, sampleSeconds: 2, active: false }))
  expect(animations).toHaveLength(2)
  mounted.rerender(view({ ...initial, value: 40, sampleSeconds: 2 }))
  expect(animations).toHaveLength(2)
  now = 6_000
  mounted.rerender(view({ ...initial, value: 45, sampleSeconds: 3 }))
  expect(animations[2].frames).toEqual([{ transform: 'scaleX(0.4)' }, { transform: 'scaleX(0.45)' }])
})

test('clock-only publications finish the original bounded tween without extending its lag', () => {
  const mounted = render(view())
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 10 }))
  expect(animations[0].options.duration).toBe(1_000)
  for (let n = 1; n <= 20; n++) {
    now = 1_000 + n * 100
    mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 10 + n / 10 }))
  }
  expect(animations).toHaveLength(1)
  expect(animations[0].cancel).not.toHaveBeenCalled()
  mounted.rerender(view({ ...initial, value: 35, sampleSeconds: 13 }))
  expect(animations[1].frames).toEqual([{ transform: 'scaleX(0.3)' }, { transform: 'scaleX(0.35)' }])
  expect(progress(mounted.container).value).toBe(35)
})

test.each([0, -1, NaN, Infinity, undefined])('invalid or missing rate %s stops animation and clears solid activity', cycleRate => {
  const mounted = render(view({ ...initial, cycleRate: 20 }))
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1, cycleRate: cycleRate as number }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.3)')
  expect(progress(mounted.container).value).toBe(30)
  expect(animations).toHaveLength(0)
})

test.each([0, -1, NaN, Infinity, undefined])('invalid or missing work %s cannot imply progress or solid activity', maximum => {
  const mounted = render(view({ ...initial, cycleRate: 20 }))
  mounted.rerender(view({ ...initial, maximum: maximum as number, cycleRate: 20 }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0)')
  expect(progress(mounted.container).value).toBe(0)
  expect(progress(mounted.container).max).toBe(1)
  expect(animations).toHaveLength(0)
})

test.each([-1, 101, NaN, Infinity, undefined])('invalid or missing progress %s remains empty and inactive', value => {
  const mounted = render(view({ ...initial, value: value as number, cycleRate: 20 }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0)')
  expect(progress(mounted.container).value).toBe(0)
})

test.each([
  { sampleSeconds: NaN }, { sampleSeconds: Infinity }, { sampleSeconds: -1 },
  { gameSpeed: NaN }, { gameSpeed: Infinity }, { gameSpeed: -1 },
])('invalid publication or speed %j cancels in-flight work without projecting it', invalid => {
  const mounted = render(view())
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1 }))
  mounted.rerender(view({ ...initial, value: 35, sampleSeconds: 2, ...invalid }))
  expect(animations).toHaveLength(1)
  expect(animations[0].cancel).toHaveBeenCalledOnce()
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.35)')
  expect(progress(mounted.container).value).toBe(35)
})

test.each([
  { name: 'Forager completion receipt', changes: { value: 5, cycleKey: 'gathering:1' } },
  { name: 'Farming repeated cycle', changes: { value: 0 } },
  { name: 'different construction recipe', changes: { value: 40, maximum: 200, cycleKey: 'home:1' } },
  { name: 'reopened earlier state', changes: { value: 25, sampleSeconds: .5 } },
])('$name resets immediately rather than animating backward or borrowing work', ({ changes }) => {
  const mounted = render(view())
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1 }))
  now = 1_500
  const reset = { ...initial, sampleSeconds: 2, ...changes }
  mounted.rerender(view(reset))
  expect(animations).toHaveLength(1)
  expect(animations[0].cancel).toHaveBeenCalledOnce()
  expect(fill(mounted.container).style.transform).toBe(`scaleX(${reset.value / reset.maximum})`)
  expect(progress(mounted.container).value).toBe(reset.value)
})

test.each([false, true])('solid activity uses real cycle frequency and hysteresis; reduced motion=%s', reduced => {
  reducedMotion = reduced
  const enter = reduced ? 1 : 2, exit = reduced ? .9 : 1.8
  const mounted = render(view({ ...initial, cycleRate: enter - .01 }))
  expect(mode(mounted.container)).toBe('cycle')
  mounted.rerender(view({ ...initial, cycleRate: enter }))
  expect(mode(mounted.container)).toBe('solid')
  expect(fill(mounted.container).style.transform).toBe('scaleX(1)')
  expect(progress(mounted.container).value).toBe(20)
  expect(progress(mounted.container).max).toBe(100)
  expect(progress(mounted.container).getAttribute('aria-valuetext')).toBe('8s')
  expect(mounted.container.querySelector('.civilization-job-timer')?.textContent).toBe(reduced ? '1.00/s' : '2.00/s')
  mounted.rerender(view({ ...initial, cycleRate: exit }))
  expect(mode(mounted.container)).toBe('solid')
  // Actual fast completion cannot flash a zero fill or falsely report 100%.
  mounted.rerender(view({ ...initial, value: 0, cycleKey: 'gathering:1', cycleRate: exit }))
  expect(mode(mounted.container)).toBe('solid')
  expect(fill(mounted.container).style.transform).toBe('scaleX(1)')
  expect(progress(mounted.container).value).toBe(0)
  mounted.rerender(view({ ...initial, cycleRate: exit - .01 }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.2)')
  mounted.rerender(view({ ...initial, cycleRate: enter }))
  mounted.rerender(view({ ...initial, active: false, cycleRate: 20, timerText: '∞' }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.2)')
  expect(mounted.container.querySelector('.civilization-job-timer')?.textContent).toBe('∞')
  mounted.rerender(view({ ...initial, cycleRate: enter - .01 }))
  expect(mode(mounted.container)).toBe('cycle')
})

test('reduced motion still smoothly displays slow real progress', () => {
  reducedMotion = true
  const mounted = render(view({ ...initial, cycleRate: .5 }))
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1, cycleRate: .5 }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(animations[0].frames).toEqual([{ transform: 'scaleX(0.2)' }, { transform: 'scaleX(0.3)' }])
})

test('changing reduced motion immediately applies its lower frequency threshold', () => {
  const mounted = render(view({ ...initial, cycleRate: 1.5 }))
  expect(mode(mounted.container)).toBe('cycle')
  act(() => { reducedMotion = true; for (const listener of mediaListeners) listener() })
  expect(mode(mounted.container)).toBe('solid')
  act(() => { reducedMotion = false; for (const listener of mediaListeners) listener() })
  expect(mode(mounted.container)).toBe('cycle')
})

test('pausing clears solid mode even with a previously fast rate', () => {
  const mounted = render(view({ ...initial, cycleRate: 20 }))
  mounted.rerender(view({ ...initial, cycleRate: 20, gameSpeed: 0 }))
  expect(mode(mounted.container)).toBe('cycle')
  expect(fill(mounted.container).style.transform).toBe('scaleX(0.2)')
  expect(animations).toHaveLength(0)
})

test('countdown decimal/units and infinity keep their widest measured space through scale changes', () => {
  let fontSize = 10
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => ({ fontSize: `${fontSize}px` }) as CSSStyleDeclaration)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    return { width: (this.textContent?.length ?? 0) * fontSize * .6 } as DOMRect
  })
  const mounted = render(view({ ...initial, timerText: '11.1s' }))
  const timer = mounted.container.querySelector<HTMLElement>('.civilization-job-timer')!
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('3em')
  mounted.rerender(view({ ...initial, timerText: '11s' }))
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('3em')
  mounted.rerender(view({ ...initial, timerText: '1m 59.9s' }))
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('4.8em')
  fontSize = 20
  mounted.rerender(view({ ...initial, timerText: '1m 59.8s' }))
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('4.8em')
  mounted.rerender(view({ ...initial, timerText: '∞', active: false }))
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('4.8em')
})

test('native resize observation keeps timer space stable and disconnects when the row leaves', () => {
  let notify = () => {}, width = 50, fontSize = 10
  const disconnect = vi.fn(), observe = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback }
    observe = observe
    disconnect = disconnect
  })
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => ({ fontSize: `${fontSize}px` }) as CSSStyleDeclaration)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width }) as DOMRect)
  const mounted = render(view())
  const timer = mounted.container.querySelector<HTMLElement>('.civilization-job-timer')!
  expect(observe).toHaveBeenCalledOnce()
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('5em')
  width = 100; fontSize = 20; act(notify)
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('5em')
  width = 140; act(notify)
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('7em')
  width = 40; act(notify)
  expect(timer.style.getPropertyValue('--civilization-timer-width')).toBe('7em')
  mounted.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})

test.each(['missing', 'rejected'] as const)('a %s compositor falls back to real progress and unmount cancels animation', failure => {
  const mounted = render(view())
  now = 1_000
  mounted.rerender(view({ ...initial, value: 30, sampleSeconds: 1 }))
  mounted.unmount()
  expect(animations[0].cancel).toHaveBeenCalledOnce()
  HTMLElement.prototype.animate = failure === 'missing' ? undefined as unknown as HTMLElement['animate'] : () => { throw Error('Unsupported animation') }
  const fallback = render(view())
  now = 2_000
  fallback.rerender(view({ ...initial, value: 35, sampleSeconds: 1 }))
  expect(fill(fallback.container).style.transform).toBe('scaleX(0.35)')
  expect(progress(fallback.container).value).toBe(35)
})
