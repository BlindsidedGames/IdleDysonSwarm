// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { QuickStoredTime, StoredTimeNavigationProgress } from './QuickStoredTime'

afterEach(cleanup)
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
  expect(screen.getByRole('button', { name: 'Spend 1 M of Offline Time' }).hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Spend 10 M of Offline Time' }).hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Spend 1 HR of Offline Time' }).hasAttribute('disabled')).toBe(true)
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
