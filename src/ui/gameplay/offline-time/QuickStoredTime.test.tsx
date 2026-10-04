// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { QuickStoredTimeSettings } from './QuickStoredTimeSettings'
import { QuickStoredTime, StoredTimeNavigationProgress } from './QuickStoredTime'

afterEach(() => { cleanup(); localStorage.clear() })
test('disables unaffordable amounts and re-enables them as the bank grows', () => {
  const dispatchPlayer = vi.fn()
  const view = (availableSeconds: number) => <IntlProvider locale="en" messages={{}}>
    <QuickStoredTime availableSeconds={availableSeconds} disabled={false} dispatchPlayer={dispatchPlayer} onFirstDisasters={vi.fn()} />
  </IntlProvider>
  const { rerender } = render(view(59))
  for (const button of screen.getAllByRole('button')) {
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
  }
  expect(dispatchPlayer).not.toHaveBeenCalled()
  rerender(view(600))
  expect(screen.getByRole('button', { name: 'Spend 1M of Offline Time' }).hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Spend 10M of Offline Time' }).hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Spend 1HR of Offline Time' }).hasAttribute('disabled')).toBe(true)
})


test('tracks actual job progress and removes the bar when processing finishes', () => {
  let status: import('../../../workers/storedTime/storedTimeProtocol').StoredTimeJobStatus = { kind: 'idle' }
  let publish = () => {}
  const storedTime = {
    status: () => status,
    subscribe: (listener: () => void) => { publish = listener; return () => {} },
    cancel: vi.fn(), speedUp: vi.fn(),
  }
  render(<IntlProvider locale="en" messages={{}}><StoredTimeNavigationProgress storedTime={storedTime} /></IntlProvider>)
  expect(screen.queryByRole('progressbar')).toBeNull()
  const update = (fraction: number, kind: 'running' | 'committing' = 'running') => act(() => {
    status = { kind, jobId: 'test', requestedSeconds: 600, computedSeconds: fraction * 600,
      fraction, elapsedMilliseconds: 100, estimatedRemainingMilliseconds: null, maximumChunkMilliseconds: 10 }
    publish()
  })
  update(0.25)
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25')
  expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.transform).toBe('scaleX(0.25)')
  update(0.75)
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75')
  update(1, 'committing')
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  act(() => { status = { kind: 'idle' }; publish() })
  expect(screen.queryByRole('progressbar')).toBeNull()
})


test('Offline quick amount controls update the sidebar, survive remounts, and reject invalid amounts', async () => {
  const dispatchPlayer = vi.fn(async () => { throw new Error('offline') })
  const view = () => <IntlProvider locale="en" messages={{}}>
    <QuickStoredTimeSettings />
    <QuickStoredTime availableSeconds={120} disabled={false} dispatchPlayer={dispatchPlayer} onFirstDisasters={vi.fn()} />
  </IntlProvider>
  let rendered = render(view())
  const input = screen.getByRole('spinbutton', { name: 'Action 1' })
  fireEvent.change(input, { target: { value: '2' } })
  fireEvent.blur(input)
  let button = screen.getByRole('button', { name: 'Spend 2M of Offline Time' })
  fireEvent.click(button)
  expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'time.request-stored-time-spend', requestedSeconds: 120 })
  await act(async () => {})
  const updatedInput = screen.getByRole('spinbutton', { name: 'Action 1' })
  fireEvent.change(updatedInput, { target: { value: '0' } })
  fireEvent.blur(updatedInput)
  expect((screen.getByRole('spinbutton', { name: 'Action 1' }) as HTMLInputElement).value).toBe('2')
  rendered.unmount()
  rendered = render(view())
  button = screen.getByRole('button', { name: 'Spend 2M of Offline Time' })
  expect(button.hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Spend 10M of Offline Time' }).hasAttribute('disabled')).toBe(true)
  for (const [minutes, label] of [[75, '75M'], [120, '2HR'], [92_160, '1,536HR']] as const) {
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Action 1' }), { target: { value: String(minutes) } })
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Action 1' }))
    expect(screen.getByRole('button', { name: `Spend ${label} of Offline Time` })).toBeTruthy()
  }
  rendered.unmount()
  localStorage.setItem('idle-dyson-swarm:quick-stored-time-minutes', '[1,-1,60]')
  render(view())
  expect(screen.getByRole('button', { name: 'Spend 1M of Offline Time' })).not.toBeNull()
})
