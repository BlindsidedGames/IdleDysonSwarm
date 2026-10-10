// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { EMPTY_INFINITY_CHALLENGES } from '../../../simulation/infinityChallenges'
import { ReworkChallengesSurface } from './ReworkChallengesSurface'

afterEach(() => { cleanup(); localStorage.clear() })

test('moves focus to restart confirmation and restores it after failure/cancel', async () => {
  // This owns focus delivery, not challenge admission/receipts (application integration owns those).
  const dispatch = vi.fn().mockResolvedValue({ status: 'rejected' })
  render(<IntlProvider locale="en" messages={{}}><ReworkChallengesSurface
    progress={{ ...EMPTY_INFINITY_CHALLENGES, unlocked: true }}
    earnedIp={128n} firstInfinity breakTheLoop overflowPending={false} dispatchPlayer={dispatch} /></IntlProvider>)
  const card = within(screen.getByRole('heading', { name: 'Blank Slate' }).closest('article')!)
  const start = card.getByRole('button', { name: 'Start' })
  start.focus(); fireEvent.click(start)
  const confirm = card.getByRole<HTMLButtonElement>('button', { name: 'Confirm restart' })
  expect(document.activeElement).toBe(confirm)
  fireEvent.click(confirm)
  await screen.findByRole('alert')
  await waitFor(() => expect(confirm.disabled).toBe(false))
  expect(document.activeElement).toBe(confirm)
  const cancel = card.getByRole('button', { name: 'Cancel' })
  cancel.focus(); fireEvent.click(cancel)
  expect(document.activeElement).toBe(card.getByRole('button', { name: 'Start' }))
})
