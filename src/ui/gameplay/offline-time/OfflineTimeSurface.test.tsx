// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { StoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'
import {
  OfflineTimeSurface,
  type OfflineTimeSurfaceProps,
} from './OfflineTimeSurface'

afterEach(() => cleanup())

const resources = {
  storedTimeAvailableSeconds: 86_400,
  storedTimeCapacitySeconds: 86_400,
} as const satisfies FrontendCanonicalResources['time']

const previews = {
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
  remainingSeconds: 0,
  durableRevision: 2,
  summary: {
    preset: 'balanced',
    simulationUpdates: 12_750,
    accuracyReduced: true,
    remainingBankSeconds: 85_800,
    infinityCount: 2n,
    infinityPoints: 125n,
    dreamResetCount: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    influence: 0n,
    botGain: 0,
    facilityGains: [],
  },
  stateRevision: 2,
  activationRevision: { session: 1, state: 2 },
} as const satisfies UiRuntimePlayerCommandResult

describe('OfflineTimeSurface', () => {
  test('presents the manually spent Offline Time bank', () => {
    const { container } = renderSurface()

    expect(screen.getByText('Offline Time')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Offline Time' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Offline Time' })).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Offline Time is stored while you are away. Choose when to spend it to advance the game.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('1d 0s', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('1d 0s of 1d 0s')).toBeInTheDocument()
    expect(screen.queryByText('3h 25m 45s')).not.toBeInTheDocument()

    const progress = screen.getByRole('progressbar', {
      name: 'Offline Time storage',
    })
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(screen.queryByText('Offline Time Used')).not.toBeInTheDocument()
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
    const summary = screen.getByRole('dialog', {
      name: 'Offline Time Complete',
    })
    expect(within(summary).getByText('10m 0s')).toBeInTheDocument()
    expect(within(summary).getByText('23h 50m 0s')).toBeInTheDocument()
    expect(within(summary).getByText('125')).toBeInTheDocument()
    expect(within(summary).getByText('2.00')).toBeInTheDocument()
    expect(within(summary).getByText('Balanced (sped up)')).toBeInTheDocument()
    expect(within(summary).getByText('12.7K')).toBeInTheDocument()
    await user.click(within(summary).getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Spend Again: 10m 0s' }),
    )
    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
    expect(dispatchPlayer).toHaveBeenLastCalledWith({
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 600,
    })
  })

  test('shows net facilities only when the completed spend had no Infinity', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn().mockResolvedValue({
      ...acceptedStoredTime,
      summary: {
        ...acceptedStoredTime.summary,
        infinityCount: 0n,
        infinityPoints: 0n,
        botGain: 45,
        facilityGains: [
          { facilityId: 'assembly_lines', quantity: 12 },
          { facilityId: 'servers', quantity: 3 },
        ],
      },
    })
    renderSurface({ dispatchPlayer })

    await user.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    await user.click(screen.getByRole('button', { name: 'Tap again to confirm' }))

    const summary = await screen.findByRole('dialog', {
      name: 'Offline Time Complete',
    })
    expect(within(summary).getByRole('heading', { name: 'Facilities gained' }))
      .toBeInTheDocument()
    expect(within(summary).getByText('Assembly Lines')).toBeInTheDocument()
    expect(within(summary).getByText('Servers')).toBeInTheDocument()
    expect(within(summary).getByText('Bots gained')).toBeInTheDocument()
    expect(Array.from(
      summary.querySelectorAll('.offline-time-job__meta dt'),
      (label) => label.textContent,
    )).toEqual([
      'Time simulated',
      'Offline Time remaining',
      'Simulation accuracy',
      'Bots gained',
      'Simulation updates',
    ])
    expect(within(summary).queryByText('Infinities completed')).not.toBeInTheDocument()
  })

  test('keeps the modal through the idle commit handoff and retains the summary until dismissed', async () => {
    const user = userEvent.setup()
    const completion = deferred<UiRuntimePlayerCommandResult>()
    const job = createStoredTimeControls({ kind: 'idle' })
    renderSurface({
      storedTime: job.controls,
      dispatchPlayer: vi.fn(() => completion.promise),
    })

    await user.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    await user.click(screen.getByRole('button', { name: 'Tap again to confirm' }))
    expect(screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })).toBeVisible()

    act(() => job.set({
      kind: 'running',
      jobId: 'handoff-job',
      requestedSeconds: 60,
      computedSeconds: 30,
      fraction: 0.5,
      elapsedMilliseconds: 100,
      estimatedRemainingMilliseconds: 100,
      maximumChunkMilliseconds: 5,
    }))
    act(() => job.set({
      kind: 'committing',
      jobId: 'handoff-job',
      requestedSeconds: 60,
      computedSeconds: 60,
      fraction: 1,
      elapsedMilliseconds: 200,
      estimatedRemainingMilliseconds: 0,
      maximumChunkMilliseconds: 5,
    }))
    act(() => job.set({ kind: 'idle' }))
    expect(screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })).toBeVisible()

    await act(async () => completion.resolve(acceptedStoredTime))
    const summary = await screen.findByRole('dialog', {
      name: 'Offline Time Complete',
    })
    expect(summary).toBeVisible()
    expect(within(summary).getByRole('status')).toHaveTextContent(
      'Offline Time Complete',
    )
    expect(within(summary).getByText('125')).toBeInTheDocument()

    await user.click(within(summary).getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('restores and reports the spend-selection draft', async () => {
    const user = userEvent.setup()
    const onDraftChange = vi.fn()
    renderSurface({
      initialDraft: {
        selectedSeconds: 600,
        repeatSeconds: null,
        armed: false,
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
      armed: false,
    })
  })

  test('shows an adjacent Cancel action that only disarms confirmation', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn()
    renderSurface({ dispatchPlayer })

    await user.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    const confirm = screen.getByRole('button', { name: 'Tap again to confirm' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(confirm.parentElement).toBe(cancel.parentElement)
    expect(Array.from(confirm.parentElement!.children)).toEqual([confirm, cancel])

    await user.click(cancel)
    expect(screen.queryByRole('button', { name: 'Tap again to confirm' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spend 1m 0s' })).toBeVisible()
    expect(dispatchPlayer).not.toHaveBeenCalled()
  })

  test('admits only one spend when confirmation is tapped rapidly', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn(
      async () => await new Promise<UiRuntimePlayerCommandResult>(() => undefined),
    )
    renderSurface({ dispatchPlayer })

    await user.click(screen.getByRole('button', { name: '10 minutes' }))
    await user.click(screen.getByRole('button', { name: 'Spend 10m 0s' }))
    const confirm = screen.getByRole('button', { name: 'Tap again to confirm' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(dispatchPlayer).toHaveBeenCalledOnce()
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
    const job = createStoredTimeControls({
        kind: 'running',
        jobId: 'job-1',
        requestedSeconds: 600,
        computedSeconds: 150,
        fraction: 0.25,
        elapsedMilliseconds: 1_000,
        estimatedRemainingMilliseconds: 3_000,
        maximumChunkMilliseconds: 12,
    })
    renderSurface({
      storedTime: {
        ...job.controls,
        cancel: cancelJob,
      },
    })

    expect(screen.getByRole('progressbar', {
      name: 'Offline Time simulation progress',
    })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByText('25% complete · about 3s remaining')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel simulation' }))
    expect(cancelJob).toHaveBeenCalledOnce()
  })

  test.each(['running', 'cancelling', 'committing'] as const)(
    'disables every conflicting control while a job is %s',
    (kind) => {
      const job = createStoredTimeControls({
        kind,
        jobId: 'original-job',
        requestedSeconds: 600,
        computedSeconds: 150,
        fraction: 0.25,
        elapsedMilliseconds: 1_000,
        estimatedRemainingMilliseconds: 3_000,
        maximumChunkMilliseconds: 12,
      })
      renderSurface({
        storedTime: job.controls,
        initialDraft: kind !== 'running'
          ? { selectedSeconds: 600, repeatSeconds: 600, armed: false }
          : undefined,
      })

      expect(screen.getByRole('slider', { name: 'Spend Offline Time' }))
        .toBeDisabled()
      for (const name of ['1 minute', '10 minutes', '1 hour', 'All']) {
        expect(screen.getByRole('button', { name })).toBeDisabled()
      }
      expect(screen.getByRole('button', {
        name: kind !== 'running'
          ? 'Spend Again: 10m 0s'
          : 'Spend 1m 0s',
      }))
        .toBeDisabled()
      expect(screen.getByRole('button', { name: 'Double Storage' }))
        .toBeDisabled()
      if (kind === 'committing') {
        expect(screen.getByRole('button', { name: 'Cancel simulation' }))
          .toBeDisabled()
      }
    },
  )

  test('confirmation Cancel disarms without cancelling a programmatic active job', async () => {
    const user = userEvent.setup()
    const job = createStoredTimeControls({
      kind: 'running',
      jobId: 'programmatic-job',
      requestedSeconds: 600,
      computedSeconds: 150,
      fraction: 0.25,
      elapsedMilliseconds: 1_000,
      estimatedRemainingMilliseconds: 3_000,
      maximumChunkMilliseconds: 12,
    })
    renderSurface({
      storedTime: job.controls,
      initialDraft: {
        selectedSeconds: 600,
        repeatSeconds: null,
        armed: true,
      },
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(job.controls.cancel).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel simulation' }))
      .toBeVisible()
    expect(screen.queryByRole('button', { name: 'Cancel' }))
      .not.toBeInTheDocument()
  })

  test('makes the active job modal, traps focus, and restores the page afterwards', async () => {
    const user = userEvent.setup()
    const job = createStoredTimeControls({ kind: 'idle' })
    renderSurface({ storedTime: job.controls })
    const returnTarget = screen.getByRole('button', { name: 'Spend 1m 0s' })
    returnTarget.focus()

    act(() => job.set({
      kind: 'running',
      jobId: 'modal-job',
      requestedSeconds: 600,
      computedSeconds: 150,
      fraction: 0.25,
      elapsedMilliseconds: 1_000,
      estimatedRemainingMilliseconds: 3_000,
      maximumChunkMilliseconds: 12,
      canSpeedUp: true,
    }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    const speedUp = within(dialog).getByRole('button', { name: 'Speed up' })
    const cancel = within(dialog).getByRole('button', {
      name: 'Cancel simulation',
    })
    expect(speedUp).toHaveFocus()
    expect(within(dialog).getByRole('status')).toHaveTextContent('20% complete')
    const backdrop = dialog.parentElement
    expect(backdrop).toHaveClass('offline-time-job__backdrop')
    const modalParent = backdrop?.parentElement
    expect(modalParent).not.toBeNull()
    for (const element of [...modalParent!.children]) {
      if (element !== backdrop) expect((element as HTMLElement).inert).toBe(true)
    }

    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await user.tab()
    expect(speedUp).toHaveFocus()

    act(() => job.set({ kind: 'idle' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(returnTarget).toHaveFocus()
    for (const element of [...modalParent!.children]) {
      expect((element as HTMLElement).inert).toBeFalsy()
    }
  })

  test('focuses the Preparing dialog when no enabled action is available', async () => {
    const user = userEvent.setup()
    const completion = deferred<UiRuntimePlayerCommandResult>()
    const job = createStoredTimeControls({ kind: 'idle' })
    const { container } = renderSurface({
      storedTime: job.controls,
      dispatchPlayer: vi.fn(() => completion.promise),
    })

    await user.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    await user.click(screen.getByRole('button', { name: 'Tap again to confirm' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    expect(dialog).toHaveFocus()
    expect(dialog).toHaveAttribute('tabindex', '-1')
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Preparing simulation…',
    )
    act(() => job.set(runningStatus()))
    const cancel = within(dialog).getByRole('button', {
      name: 'Cancel simulation',
    })
    expect(dialog).toHaveFocus()
    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    dialog.focus()
    await user.tab()
    expect(cancel).toHaveFocus()
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

    await act(async () => completion.resolve(acceptedStoredTime))
  })

  test('moves focus to Continue when a running job becomes a completion summary', async () => {
    const user = userEvent.setup()
    const completion = deferred<UiRuntimePlayerCommandResult>()
    const job = createStoredTimeControls({ kind: 'idle' })
    const { container } = renderSurface({
      storedTime: job.controls,
      dispatchPlayer: vi.fn(() => completion.promise),
    })

    await user.click(screen.getByRole('button', { name: 'Spend 1m 0s' }))
    await user.click(screen.getByRole('button', { name: 'Tap again to confirm' }))
    act(() => job.set(runningStatus()))
    expect(screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })).toHaveFocus()

    act(() => job.set({ kind: 'idle' }))
    await act(async () => completion.resolve(acceptedStoredTime))

    const summary = await screen.findByRole('dialog', {
      name: 'Offline Time Complete',
    })
    const continueControl = within(summary).getByRole('button', {
      name: 'Continue',
    })
    expect(continueControl).toHaveFocus()
    expect(within(summary).getByRole('status')).toHaveTextContent(
      'Offline Time Complete',
    )
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

  test('coarsens modal progress announcements and passes an active-modal accessibility scan', async () => {
    const job = createStoredTimeControls({
      kind: 'running',
      jobId: 'accessible-job',
      requestedSeconds: 600,
      computedSeconds: 150,
      fraction: 0.25,
      elapsedMilliseconds: 1_000,
      estimatedRemainingMilliseconds: 3_000,
      maximumChunkMilliseconds: 12,
    })
    const { container } = renderSurface({ storedTime: job.controls })
    const dialog = screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    expect(dialog).not.toHaveAttribute('aria-live')
    const announcement = within(dialog).getByRole('status')
    expect(announcement).toHaveTextContent('20% complete')

    act(() => job.set({
      kind: 'running',
      jobId: 'accessible-job',
      requestedSeconds: 600,
      computedSeconds: 174,
      fraction: 0.29,
      elapsedMilliseconds: 1_200,
      estimatedRemainingMilliseconds: 2_900,
      maximumChunkMilliseconds: 12,
    }))
    expect(announcement).toHaveTextContent('20% complete')
    act(() => job.set({
      kind: 'running',
      jobId: 'accessible-job',
      requestedSeconds: 600,
      computedSeconds: 186,
      fraction: 0.31,
      elapsedMilliseconds: 1_300,
      estimatedRemainingMilliseconds: 2_800,
      maximumChunkMilliseconds: 12,
    }))
    expect(announcement).toHaveTextContent('30% complete')

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

  test('portals and contains focus when mounting with an active job', async () => {
    const user = userEvent.setup()
    const storedTime = createStoredTimeControls(runningStatus())
    renderSurface({ storedTime: storedTime.controls })
    const dialog = screen.getByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    const backdrop = dialog.parentElement
    const modalParent = backdrop?.parentElement
    expect(modalParent).toHaveClass('dyson-shell')
    const cancel = within(dialog).getByRole('button', {
      name: 'Cancel simulation',
    })
    expect(cancel).toHaveFocus()
    for (const element of [...modalParent!.children]) {
      if (element !== backdrop) expect((element as HTMLElement).inert).toBe(true)
    }
    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()

    const styles = readFileSync(
      join(process.cwd(), 'src/ui/gameplay/offline-time/offlineTime.css'),
      'utf8',
    )
    expect(styles).toMatch(
      /\.offline-time-job\s*\{[^}]*background:\s*var\(--theme-panel\);/s,
    )
    expect(styles).not.toMatch(
      /\.offline-time-job\s*\{[^}]*var\(--offline-panel/s,
    )
  })
})

function renderSurface(
  overrides: Partial<OfflineTimeSurfaceProps> = {},
) {
  const props: OfflineTimeSurfaceProps = {
    locale: 'en',
    resources,
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
      <div className="dyson-shell" data-route-theme="offline-time">
        <OfflineTimeSurface {...props} />
      </div>
    </PresentationIntlProvider>,
  )
}

function createStoredTimeControls(initial: StoredTimeJobStatus) {
  const listeners = new Set<() => void>()
  let status = initial
  return {
    controls: {
      status: () => status,
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      cancel: vi.fn(),
      speedUp: vi.fn(),
    },
    set(next: StoredTimeJobStatus) {
      status = next
      for (const listener of listeners) listener()
    },
  }
}

function runningStatus(): StoredTimeJobStatus {
  return {
    kind: 'running',
    jobId: 'theme-job',
    requestedSeconds: 60,
    computedSeconds: 30,
    fraction: 0.5,
    elapsedMilliseconds: 100,
    estimatedRemainingMilliseconds: 100,
    maximumChunkMilliseconds: 5,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
