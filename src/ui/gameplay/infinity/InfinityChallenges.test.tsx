// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  fireEvent.click(within(screen.getByRole('heading', { name: 'Blank Slate' }).closest('article')!).getByRole('button', { name: 'Start' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(dispatch).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('heading', { name: 'Blank Slate' }).closest('article')!).getByRole('button', { name: 'Start' }))
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

test('developer tab visibility shows the challenge without granting its progression unlock', () => {
  const dispatch = vi.fn()
  render(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={EMPTY_INFINITY_CHALLENGES} developmentVisible
    overflowReached={false} dispatchPlayer={dispatch} /></IntlProvider>)
  const start = within(screen.getByRole('heading', { name: 'Blank Slate' }).closest('article')!).getByRole('button', { name: 'Start' })
  expect(start.hasAttribute('disabled')).toBe(true)
  fireEvent.click(start)
  expect(dispatch).not.toHaveBeenCalled()
})

test('Trial & Error requires confirmation and cannot be started alongside another challenge', async () => {
  const dispatch = vi.fn().mockResolvedValue({ status: 'accepted' })
  const view = render(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true }}
    overflowReached={false} dispatchPlayer={dispatch} /></IntlProvider>)
  fireEvent.click(within(screen.getByRole('heading', { name: 'Trial & Error' }).closest('article')!).getByRole('button', { name: 'Start' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(dispatch).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('heading', { name: 'Trial & Error' }).closest('article')!).getByRole('button', { name: 'Start' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm restart' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ kind: 'challenge.enter-trial-and-error' }))
  view.rerender(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true, active: 'trial-and-error' }}
    overflowReached={false} dispatchPlayer={dispatch} /></IntlProvider>)
  expect(within(screen.getByRole('heading', { name: 'Blank Slate' }).closest('article')!).getByRole('button', { name: 'Start' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText('Trial & Error active · Research purchases disabled')).not.toBeNull()
})

test('shows icon rewards and recorded completion durations without inventing old times', () => {
  render(<IntlProvider locale="en" messages={{}}><InfinityChallenges
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, trialAndErrorCompleted: true,
      completionSeconds: { 'trial-and-error': 62.5 } }}
    overflowReached={false} dispatchPlayer={vi.fn()} /></IntlProvider>)
  expect(screen.getAllByRole('img', { name: 'Catalysts: 1' })).toHaveLength(2)
  expect(screen.getByText('Completed in: 1m 2.5s')).not.toBeNull()
  expect(screen.getByText('Completed in: Unknown')).not.toBeNull()
})

test('No Science uses a Quantum confirmation and a two-Catalyst reward', async () => {
  const dispatch = vi.fn().mockResolvedValue({ status: 'accepted' })
  render(<IntlProvider locale="en" messages={{}}><InfinityChallenges progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true }} overflowReached={false} dispatchPlayer={dispatch} /></IntlProvider>)
  const card = within(screen.getByRole('heading', { name: 'No Science' }).closest('article')!)
  expect(card.getByRole('img', { name: 'Catalysts: 2' })).toBeTruthy()
  fireEvent.click(card.getByRole('button', { name: 'Start' }))
  expect(screen.getByText(/This starts a fresh Quantum run/)).toBeTruthy()
  fireEvent.click(card.getByRole('button', { name: 'Confirm restart' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ kind: 'challenge.enter-no-science' }))
})
