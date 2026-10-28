// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useDiscoveryBarMotion } from './useDiscoveryBarMotion'

let now = 0
let sequence = 0
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  now = 0
  frames = new Map()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++sequence, callback); return sequence })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function frame(time: number) {
  act(() => {
    now = time
    const pending = [...frames.values()]
    frames.clear()
    pending.forEach(callback => callback(time))
  })
}
const initial = { tier: { completions: 0n, progress: 300 }, incoming: 0n }

it('shows normal progress immediately, animates transferred completions, and catches up within two seconds', () => {
  const { result, rerender } = renderHook(({ tier, incoming }) => useDiscoveryBarMotion(tier, 3600, incoming), { initialProps: initial })
  rerender({ tier: { completions: 0n, progress: 600 }, incoming: 0n })
  expect(result.current.progress).toBe(600)
  const destination = { completions: 6n, progress: 1200 }
  rerender({ tier: destination, incoming: 1n })
  expect(result.current).toEqual({ completions: 0n, progress: 600 })
  frame(500)
  expect(result.current.completions).toBeGreaterThan(0n)
  expect(result.current.completions).toBeLessThan(6n)
  expect(result.current.progress).toBeGreaterThanOrEqual(0)
  expect(result.current.progress).toBeLessThan(3600)
  // Incoming awards retarget the current animation; they never queue another two seconds.
  rerender({ tier: { completions: 12n, progress: 1800 }, incoming: 2n })
  frame(2000)
  expect(result.current).toEqual({ completions: 12n, progress: 1800 })
  expect(frames.size).toBe(0)
})

it('settles resets, hidden pages and unmount without replaying old awards', () => {
  const { result, rerender, unmount } = renderHook(({ tier, incoming }) => useDiscoveryBarMotion(tier, 3600, incoming), { initialProps: initial })
  rerender({ tier: { completions: 3n, progress: 200 }, incoming: 1n })
  frame(250)
  rerender({ tier: { completions: 0n, progress: 0 }, incoming: 0n })
  expect(result.current).toEqual({ completions: 0n, progress: 0 })
  expect(frames.size).toBe(0)
  const end = { completions: 1000000000000000n, progress: 90 }
  rerender({ tier: end, incoming: 1000n })
  frame(300)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(result.current).toEqual(end)
  expect(frames.size).toBe(0)
  unmount()
  expect(frames.size).toBe(0)
})

it('respects reduced motion and does not animate saved progress on mount', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { result, rerender } = renderHook(({ tier, incoming }) => useDiscoveryBarMotion(tier, 3600, incoming), { initialProps: initial })
  expect(result.current).toEqual(initial.tier)
  const end = { completions: 5n, progress: 40 }
  rerender({ tier: end, incoming: 1n })
  expect(result.current).toEqual(end)
  expect(frames.size).toBe(0)
})

it('keeps moving forward when ordinary ticking wraps the target during a large transfer', () => {
  const { result, rerender } = renderHook(({ tier, incoming }) => useDiscoveryBarMotion(tier, 3600, incoming), { initialProps: initial })
  rerender({ tier: { completions: 6n, progress: 3590 }, incoming: 1n })
  frame(500)
  const before = Number(result.current.completions) * 3600 + result.current.progress
  rerender({ tier: { completions: 7n, progress: 10 }, incoming: 1n })
  frame(510)
  const after = Number(result.current.completions) * 3600 + result.current.progress
  expect(after).toBeGreaterThanOrEqual(before)
  frame(2000)
  expect(result.current).toEqual({ completions: 7n, progress: 10 })
})

it('starts a bounded new animation when a foreground stall missed the previous deadline', () => {
  const { result, rerender } = renderHook(({ tier, incoming }) => useDiscoveryBarMotion(tier, 3600, incoming), { initialProps: initial })
  rerender({ tier: { completions: 6n, progress: 100 }, incoming: 1n })
  // No RAF executes during the stall.
  now = 3000
  const destination = { completions: 12n, progress: 200 }
  rerender({ tier: destination, incoming: 2n })
  frame(5000)
  expect(result.current).toEqual(destination)
  expect(frames.size).toBe(0)
})
