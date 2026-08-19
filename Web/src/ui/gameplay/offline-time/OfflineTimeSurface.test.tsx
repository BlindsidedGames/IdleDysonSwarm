// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendCanonicalProgression,
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  OfflineTimeSurface,
  type OfflineTimeSurfaceProps,
} from './OfflineTimeSurface'

afterEach(() => cleanup())

const resources = {
  storedTimeAvailableSeconds: 86_400,
  storedTimeCapacitySeconds: 86_400,
  doubleTimeBankSeconds: 12_345,
} as const satisfies FrontendCanonicalResources['time']

const infinityUsage = {
  storedTimeUsedThisCycleSeconds: 3_661,
  storedTimeUsedPreviousCycleSeconds: 600,
} as const satisfies Pick<
  FrontendCanonicalProgression['infinity'],
  | 'storedTimeUsedThisCycleSeconds'
  | 'storedTimeUsedPreviousCycleSeconds'
>

const previews = {
  doubleTimeRate: { minimum: 0, maximum: 10, current: 4 },
  storedCapacity: {
    eligible: true,
    code: 'upgradable',
    currentCapacitySeconds: 86_400,
    nextCapacitySeconds: 172_800,
    consumesStoredSeconds: 86_400,
  },
  storedSpend: {
    maximumSeconds: 86_400,
    commitFirstRequired: true,
  },
} as const satisfies FrontendGameplayPreviews['time']

const acceptedTransition = {
  status: 'accepted',
  kind: 'transition',
  changed: true,
  stateRevision: 2,
  activationRevision: { session: 1, state: 2 },
} as const satisfies UiRuntimePlayerCommandResult

const acceptedStoredTime = {
  status: 'accepted',
  kind: 'stored-time',
  admittedSeconds: 600,
  consumedSeconds: 600,
  remainingSeconds: 85_800,
  durableRevision: 2,
  stateRevision: 2,
  activationRevision: { session: 1, state: 2 },
} as const satisfies UiRuntimePlayerCommandResult

describe('OfflineTimeSurface', () => {
  test('presents the Unity stored-time bank separately from Simulation Double Time', () => {
    const { container } = renderSurface()

    expect(screen.getByText('Offline Time')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Offline Time' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Offline Time' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/separate from Simulation Double Time/),
    ).toBeInTheDocument()
    expect(screen.getByText('1d 0s', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('1d 0s of 1d 0s')).toBeInTheDocument()
    expect(screen.queryByText('3h 25m 45s')).not.toBeInTheDocument()

    const progress = screen.getByRole('progressbar', {
      name: 'Offline Time storage',
    })
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(within(screen.getByRole('heading', { name: 'Offline Time Used' }).parentElement!).getByText('1h 1m 1s')).toBeInTheDocument()
    expect(container.querySelector('.offline-time-surface')).toBeInTheDocument()
  })

  test('uses Unity quick selections and requires a second confirmation before spending', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn().mockResolvedValue(acceptedStoredTime)
    renderSurface({ dispatchPlayer })

    await user.click(screen.getByRole('button', { name: '10 minutes' }))
    const spend = screen.getByRole('button', { name: 'Spend 10m 0s' })
    await user.click(spend)

    expect(dispatchPlayer).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Tap again to confirm' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Tap again to confirm' }),
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 600,
    })
    expect(
      await screen.findByText('Advanced the game by 10m 0s.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Spend Again: 10m 0s' }),
    )
    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
    expect(dispatchPlayer).toHaveBeenLastCalledWith({
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 600,
    })
  })

  test('restores and reports the spend-selection draft', async () => {
    const user = userEvent.setup()
    const onDraftChange = vi.fn()
    renderSurface({
      initialDraft: {
        selectedSeconds: 600,
        repeatSeconds: null,
      },
      onDraftChange,
    })

    expect(screen.getByRole('slider', { name: 'Spend Offline Time' }))
      .toHaveValue('600')
    expect(screen.getByRole('button', { name: '10 minutes' }))
      .toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '1 hour' }))
    expect(onDraftChange).toHaveBeenLastCalledWith({
      selectedSeconds: 3_600,
      repeatSeconds: null,
    })
  })

  test('dispatches the canonical full-bank storage upgrade', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn().mockResolvedValue(acceptedTransition)
    renderSurface({ dispatchPlayer })

    expect(
      screen.getByText('Consume the full bank to increase capacity to 2d 0s.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Double Storage' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'time.upgrade-stored-capacity',
    })
  })

  test('disables spending when clock protection has disabled Offline Time', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn()
    renderSurface({ storedTimeCheater: true, dispatchPlayer })

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Offline Time is disabled for this save.')
    const spend = screen.getByRole('button', { name: 'Spend 1m 0s' })
    expect(spend).toBeDisabled()
    await user.click(spend)
    expect(dispatchPlayer).not.toHaveBeenCalled()
  })

  test('shows worker progress and cancels without issuing another command', async () => {
    const user = userEvent.setup()
    const cancelJob = vi.fn()
    renderSurface({
      jobStatus: {
        kind: 'running',
        jobId: 'job-1',
        requestedSeconds: 600,
        computedSeconds: 150,
        fraction: 0.25,
        elapsedMilliseconds: 1_000,
        estimatedRemainingMilliseconds: 3_000,
        maximumChunkMilliseconds: 12,
      },
      cancelJob,
    })

    expect(screen.getByRole('progressbar', {
      name: 'Offline Time simulation progress',
    })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByText('25% complete · about 3s remaining')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel simulation' }))
    expect(cancelJob).toHaveBeenCalledOnce()
  })

  test('has no serious or critical accessibility violations', async () => {
    const { container } = renderSurface()
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })
})

function renderSurface(
  overrides: Partial<OfflineTimeSurfaceProps> = {},
) {
  const props: OfflineTimeSurfaceProps = {
    locale: 'en',
    resources,
    infinityUsage,
    previews,
    storedTimeCheater: false,
    commandAvailability: {
      upgradeStoredCapacity: true,
      requestStoredTimeSpend: true,
    },
    dispatchPlayer: vi.fn().mockResolvedValue(acceptedTransition),
    ...overrides,
  }

  return render(
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as SharedMessageCatalog}
    >
      <OfflineTimeSurface {...props} />
    </PresentationIntlProvider>,
  )
}
