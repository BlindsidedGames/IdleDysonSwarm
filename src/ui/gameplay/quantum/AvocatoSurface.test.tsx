// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { AvocatoSurface, type AvocatoSurfaceProps } from './AvocatoSurface'

afterEach(cleanup)
type Result = Awaited<ReturnType<AvocatoSurfaceProps['dispatchPlayer']>>
const accepted = { status: 'accepted' } as Result
const rejected = { status: 'rejected' } as Result

function setup(dispatchPlayer: AvocatoSurfaceProps['dispatchPlayer'], eligible = true) {
  return render(<IntlProvider locale="en" messages={{}}>
    <AvocatoSurface locale="en" unlocked
      resources={{ infinityPoints: 1000, influence: 1000, strangeMatter: 1000, overflowMultiplier: 3, overflowPoints: 0n }}
      spendable={{ infinityPoints: 0n, influence: 0, strangeMatter: 0 }}
      derived={{ infinityPoints: 3, influence: 3, strangeMatter: 3, overflow: 4, total: 108 }}
      previews={{ feeds: [], overflow: { eligible, threshold: 4e242 },
        meditation: { eligible: false, requiredStepIndex: null, code: 'already-completed', skillPointReward: 0n } }}
      commandAvailability={{ feed: true, overflowReset: true }} dispatchPlayer={dispatchPlayer} />
  </IntlProvider>)
}

describe('Avocato Overflow confirmation', () => {
  test('requires confirmation, allows cancellation, and prevents repeated dispatch while saving', async () => {
    let complete!: (value: Result) => void
    const dispatch = vi.fn<AvocatoSurfaceProps['dispatchPlayer']>(() => new Promise((resolve) => { complete = resolve }))
    setup(dispatch)
    expect(screen.getByText(/Reality and Simulation progress/)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Overflow for 1 point' }))
    expect(dispatch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(dispatch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Overflow for 1 point' }))
    const confirm = screen.getByRole('button', { name: 'Confirm Overflow' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'avocado.request-overflow-reset' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    await act(async () => complete(accepted))
    expect(screen.queryByRole('button', { name: 'Confirm Overflow' })).toBeNull()
  })

  test('shows a failed save without claiming a reward and allows retry', async () => {
    const dispatch = vi.fn<AvocatoSurfaceProps['dispatchPlayer']>().mockResolvedValueOnce(rejected).mockResolvedValueOnce(accepted)
    setup(dispatch)
    fireEvent.click(screen.getByRole('button', { name: 'Overflow for 1 point' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm Overflow' })) })
    expect(screen.getByRole('alert').textContent).toContain('Your current run has been kept')
    expect(screen.getByRole('heading', { name: /Overflow Points: 0/ })).not.toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm Overflow' })) })
    expect(dispatch).toHaveBeenCalledTimes(2)
  })

  test('keeps the reset disabled until the canonical boundary is reached', () => {
    const dispatch = vi.fn<AvocatoSurfaceProps['dispatchPlayer']>()
    setup(dispatch, false)
    const button = screen.getByRole('button', { name: 'Overflow for 1 point' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByText(/They do not boost production yet/)).not.toBeNull()
  })
})
