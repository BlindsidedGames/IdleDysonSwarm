// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { StoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'
import type { UiRuntimeStoredTimeControls } from '../../runtime'
import {
  OfflineTimeSurface,
  type OfflineTimeSurfaceProps,
} from './OfflineTimeSurface'

afterEach(() => cleanup())

describe('OfflineTimeSurface confirmation boundary', () => {
  test('disarms only the pending confirmation on an outside pointer interaction', () => {
    const onDraftChange = vi.fn()
    renderSurface({ onDraftChange })

    fireEvent.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    const confirmation = screen.getByRole('button', {
      name: 'Tap again to confirm',
    })
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeNull()

    fireEvent.pointerDown(confirmation)
    expect(
      screen.getByRole('button', { name: 'Tap again to confirm' }),
    ).not.toBeNull()

    fireEvent.pointerDown(
      screen.getByRole('heading', { name: 'Stored Offline Time' }),
      { pointerId: 1, pointerType: 'touch' },
    )

    expect(screen.getByRole('button', { name: 'Spend 1m 0s' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(onDraftChange).toHaveBeenLastCalledWith({
      selectedSeconds: 60,
      repeatSeconds: null,
      armed: false,
    })
  })

  test('keeps the explicit keyboard and screen-reader cancellation control', () => {
    renderSurface()

    fireEvent.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Spend 1m 0s' })).not.toBeNull()
  })

  test('does not cancel active processing when its backdrop is activated', () => {
    const cancel = vi.fn()
    renderSurface({
      storedTime: storedTimeControls({
        kind: 'running',
        jobId: 'job-1',
        requestedSeconds: 60,
        computedSeconds: 30,
        fraction: 0.5,
        elapsedMilliseconds: 100,
        estimatedRemainingMilliseconds: 100,
        maximumChunkMilliseconds: 10,
        canSpeedUp: false,
      }, cancel),
    })

    const dialog = screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    const backdrop = dialog.parentElement
    expect(backdrop).not.toBeNull()

    fireEvent.pointerDown(backdrop!)
    fireEvent.click(backdrop!)

    expect(cancel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', {
        name: 'Offline Time simulation progress',
      }),
    ).not.toBeNull()
  })

  test('does not dismiss a completion summary through its backdrop', async () => {
    const dispatchPlayer = vi.fn<OfflineTimeSurfaceProps['dispatchPlayer']>()
      .mockResolvedValue({
        status: 'accepted',
        kind: 'stored-time',
        admittedSeconds: 60,
        consumedSeconds: 60,
        remainingSeconds: 0,
        durableRevision: 1,
        summary: {
          preset: 'balanced',
          simulationUpdates: 1_200,
          accuracyReduced: false,
          remainingBankSeconds: 540,
          infinityCount: 0n,
          infinityPoints: 0n,
          dreamResetCount: 0n,
          strangeMatter: 0,
          realityWorkers: 0n,
          influence: 0,
          botGain: 0,
          facilityGains: [],
        },
        stateRevision: 2,
        activationRevision: { session: 1, state: 1 },
      })
    renderSurface({ dispatchPlayer })

    fireEvent.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tap again to confirm' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Offline Time Complete',
    })
    fireEvent.pointerDown(dialog.parentElement!)
    fireEvent.click(dialog.parentElement!)

    expect(
      screen.getByRole('dialog', { name: 'Offline Time Complete' }),
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeNull()
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  })
})

function renderSurface(
  overrides: Partial<OfflineTimeSurfaceProps> = {},
): void {
  const props: OfflineTimeSurfaceProps = {
    locale: 'en',
    resources: {
      storedTimeAvailableSeconds: 600,
      storedTimeCapacitySeconds: 86_400,
    },
    previews: {
      storedCapacity: {
        eligible: false,
        code: 'bank-not-full',
        currentCapacitySeconds: 86_400,
        nextCapacitySeconds: 172_800,
        consumesStoredSeconds: 0,
      },
      storedSpend: {
        maximumSeconds: 600,
        commitFirstRequired: true,
      },
    },
    storedTimeCheater: false,
    commandAvailability: {
      upgradeStoredCapacity: true,
      requestStoredTimeSpend: true,
      setStoredTimePreset: true,
    },
    dispatchPlayer: vi.fn().mockResolvedValue({
      status: 'rejected',
      kind: 'stored-time',
      code: 'test',
      reason: 'not used',
      stale: false,
      stateRevision: 1,
      activationRevision: { session: 1, state: 1 },
    }),
    ...overrides,
  }

  render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <OfflineTimeSurface {...props} />
    </IntlProvider>,
  )
}

function storedTimeControls(
  status: StoredTimeJobStatus,
  cancel: () => void,
): UiRuntimeStoredTimeControls {
  return {
    status: () => status,
    subscribe: () => () => undefined,
    cancel,
    speedUp: () => undefined,
  }
}
