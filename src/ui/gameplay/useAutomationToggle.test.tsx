// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { useAutomationToggle } from './useAutomationToggle'

afterEach(cleanup)

function deferred() {
  let resolve!: (result: { status: string }) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<{ status: string }>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('only the latest intent settles, independently for each automation ID', async () => {
  const older = deferred()
  const newer = deferred()
  const other = deferred()
  const queue = [older, newer, other]
  const view = renderHook(() => useAutomationToggle<string>(() => queue.shift()!.promise))

  act(() => {
    view.result.current.setAutomation('panels', true)
    view.result.current.setAutomation('panels', false)
    view.result.current.setAutomation('science', true)
  })
  await act(async () => older.reject(new Error('stale failure')))
  expect(view.result.current.overrides).toEqual({ panels: false, science: true })
  expect([...view.result.current.failures]).toEqual([])

  await act(async () => other.resolve({ status: 'rejected' }))
  expect(view.result.current.overrides).toEqual({ panels: false })
  expect([...view.result.current.failures]).toEqual(['science'])
  await act(async () => newer.resolve({ status: 'accepted' }))
  expect(view.result.current.overrides).toEqual({})
  expect([...view.result.current.failures]).toEqual(['science'])
})

test('new intent clears failure and returns to the latest canonical value after acceptance', async () => {
  const first = deferred()
  const retry = deferred()
  const queue = [first, retry]
  const view = renderHook(({ canonical }) => {
    const toggle = useAutomationToggle<string>(() => queue.shift()!.promise)
    return { ...toggle, enabled: toggle.overrides.panels ?? canonical }
  }, { initialProps: { canonical: false } })

  act(() => view.result.current.setAutomation('panels', true))
  expect(view.result.current.enabled).toBe(true)
  await act(async () => first.reject(new Error('offline')))
  expect(view.result.current.enabled).toBe(false)
  expect(view.result.current.failures.has('panels')).toBe(true)

  act(() => view.result.current.setAutomation('panels', true))
  expect(view.result.current.failures.size).toBe(0)
  view.rerender({ canonical: true })
  await act(async () => retry.resolve({ status: 'accepted' }))
  expect(view.result.current.overrides).toEqual({})
  expect(view.result.current.enabled).toBe(true)
})

test('late completion after unmount cannot alter a newly mounted control', async () => {
  const pending = deferred()
  const first = renderHook(() => useAutomationToggle<string>(() => pending.promise))
  act(() => first.result.current.setAutomation('panels', true))
  first.unmount()
  const next = renderHook(() => useAutomationToggle<string>(() => pending.promise))
  await act(async () => pending.resolve({ status: 'rejected' }))
  expect(next.result.current.overrides).toEqual({})
  expect(next.result.current.failures.size).toBe(0)
})
