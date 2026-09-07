// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { EMPTY_INFINITY_CHALLENGES } from '../../../simulation/infinityChallenges'
import { InfinityChallenges } from './InfinityChallenges'

afterEach(cleanup)
test('requires confirmation and keeps a failed restart retryable', async () => {
  const dispatch = vi.fn().mockResolvedValue({ status: 'rejected' })
  render(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true }}
    overflowReached={false} dispatchPlayer={dispatch} /></IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Start Blank Slate' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(dispatch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Start Blank Slate' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm restart' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ kind: 'challenge.enter-blank-slate' }))
  await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull())
  expect(screen.getByRole('button', { name: 'Confirm restart' }).hasAttribute('disabled')).toBe(false)
})
test('blocks challenge restart while Overflow is pending', () => {
  render(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true, active: 'blank-slate' }}
    overflowReached dispatchPlayer={vi.fn()} /></IntlProvider>)
  expect(screen.getByRole('button', { name: 'Abandon challenge' }).hasAttribute('disabled')).toBe(true)
})
