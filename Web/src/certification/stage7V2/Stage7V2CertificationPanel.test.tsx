// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import axe from 'axe-core'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import { STORED_TIME_FAST_DISCLOSURE_V2 } from '../../simulation/storedTimePolicyDisclosureV2'
import type { Stage7V2CertificationDiagnostics } from './certificationHost'
import { Stage7V2CertificationPanel } from './Stage7V2CertificationPanel'
import type {
  Stage7V2CertificationUiBinding,
  Stage7V2CertificationUiSnapshot,
} from './certificationUiModel'

const styles = readFileSync(
  resolve(process.cwd(), 'src/certification/stage7V2/stage7V2CertificationPanel.css'),
  'utf8',
)

afterEach(cleanup)

const READY: Readonly<Stage7V2CertificationDiagnostics> = Object.freeze({
  status: 'ready',
  requestedSeconds: 0,
  processedSeconds: 0,
  computedRawTicks: '0',
  representativeGroups: 0,
  durableSeconds: 0,
  remainingSeconds: 0,
  unconsumedFromDurableCheckpointSeconds: 0,
  progress: 0,
  elapsedMilliseconds: 0,
  etaMilliseconds: null,
  predictedTotalMilliseconds: null,
  checkpoints: 0,
  maximumChunkMilliseconds: 0,
  maximumAtomicEventMilliseconds: 0,
  cancelRemainingAvailable: false,
  retryAvailable: false,
  reloadRequired: false,
  message: null,
})

function fakeBinding(initial: Partial<Stage7V2CertificationUiSnapshot> = {}) {
  let snapshot: Readonly<Stage7V2CertificationUiSnapshot> = Object.freeze({
    diagnostics: READY,
    policyId: 'stored-time-fast-v1',
    actionPending: false,
    announcement: '',
    ...initial,
  })
  const listeners = new Set<() => void>()
  const calls = {
    loadPolicy: vi.fn(async () => undefined),
    selectPolicy: vi.fn(async (policyId: StoredTimePolicyIdV2) => {
      update({ policyId })
    }),
    pause: vi.fn(async () => undefined),
    cancelRemaining: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    reload: vi.fn(),
  }
  const update = (values: Partial<Stage7V2CertificationUiSnapshot>): void => {
    snapshot = Object.freeze({ ...snapshot, ...values })
    for (const listener of listeners) listener()
  }
  const binding: Readonly<Stage7V2CertificationUiBinding> = Object.freeze({
    snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    ...calls,
  })
  return { binding, calls, update }
}

describe('Stage7V2CertificationPanel', () => {
  it('is accessible, explains every policy, and never starts work on render', async () => {
    const fake = fakeBinding()
    const { container } = render(<Stage7V2CertificationPanel binding={fake.binding} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Stored Time' })).toBeVisible()
    expect(screen.getByText(/4,096 or fewer raw ticks automatically use Exact/)).toBeVisible()
    expect(screen.getByText(/no more than 4,096 representative groups/)).toBeVisible()
    expect(screen.getByText(/up to 60 seconds/)).toBeVisible()
    expect(screen.getByText(/pauses at the next authentic boundary/)).toBeVisible()
    expect(screen.getByText(/every automation tick/)).toBeVisible()
    expect(screen.getByRole('note')).toHaveTextContent(STORED_TIME_FAST_DISCLOSURE_V2.text)
    expect(screen.getByRole('progressbar', { name: 'Stored Time progress' })).toHaveValue(0)
    expect(fake.calls.loadPolicy).toHaveBeenCalledTimes(1)
    expect(fake.calls.pause).not.toHaveBeenCalled()
    expect(fake.calls.retry).not.toHaveBeenCalled()
    expect(fake.calls.cancelRemaining).not.toHaveBeenCalled()
    expect((await axe.run(container)).violations).toEqual([])
  })

  it('supports keyboard policy selection and persists only the selected local policy', async () => {
    const user = userEvent.setup()
    const fake = fakeBinding()
    render(<Stage7V2CertificationPanel binding={fake.binding} />)

    const balanced = screen.getByRole('radio', { name: /Balanced/ })
    balanced.focus()
    await user.keyboard('[Space]')
    expect(fake.calls.selectPolicy).toHaveBeenCalledWith('stored-time-balanced-v1')
    expect(balanced).toBeChecked()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Fast/ }))
    expect(screen.getByRole('note')).toHaveTextContent(/splitting the same Stored Time/)
  })

  it('shows cancellation only from host-projected five-second eligibility and explains durable refund', async () => {
    const user = userEvent.setup()
    const fake = fakeBinding()
    render(<Stage7V2CertificationPanel binding={fake.binding} />)
    expect(screen.queryByRole('button', { name: 'Cancel Remaining' })).not.toBeInTheDocument()

    act(() => fake.update({ diagnostics: Object.freeze({
      ...READY,
      status: 'started',
      requestedSeconds: 12,
      processedSeconds: 4,
      durableSeconds: 3,
      remainingSeconds: 8,
      unconsumedFromDurableCheckpointSeconds: 9,
      progress: 1 / 3,
      elapsedMilliseconds: 5_000,
      etaMilliseconds: 1_100,
      predictedTotalMilliseconds: 6_100,
      checkpoints: 2,
      cancelRemainingAvailable: true,
    }) }))

    expect(screen.getByText('4.0 seconds')).toBeVisible()
    expect(screen.getByText('8.0 seconds')).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
    expect(screen.getByText(/refunds 9.0 seconds of unconsumed Stored Time from the last durable checkpoint/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel Remaining' }))
    expect(fake.calls.cancelRemaining).toHaveBeenCalledTimes(1)
  })

  it('exposes pause, retry, and reload-required commands from host status only', async () => {
    const user = userEvent.setup()
    const fake = fakeBinding({ diagnostics: Object.freeze({ ...READY, status: 'started' }) })
    render(<Stage7V2CertificationPanel binding={fake.binding} />)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(fake.calls.pause).toHaveBeenCalledTimes(1)

    act(() => fake.update({ diagnostics: Object.freeze({
      ...READY,
      status: 'resumable-failure',
      retryAvailable: true,
      message: 'Worker package changed. Retry with a fresh launcher.',
    }) }))
    await user.click(screen.getByRole('button', { name: 'Retry from checkpoint' }))
    expect(fake.calls.retry).toHaveBeenCalledTimes(1)

    act(() => fake.update({ diagnostics: Object.freeze({
      ...READY,
      status: 'reload-required',
      reloadRequired: true,
    }) }))
    await user.click(screen.getByRole('button', { name: 'Reload saved state' }))
    expect(fake.calls.reload).toHaveBeenCalledTimes(1)
  })

  it('keeps narrow layouts usable and removes motion when requested', () => {
    expect(styles).toMatch(/@media \(max-width: 599px\)[\s\S]*grid-template-columns:\s*repeat\(2/)
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition:\s*none/)
    expect(styles).toMatch(/min-block-size:\s*var\(--target-minimum\)/)
    expect(styles).not.toMatch(/border-radius:\s*999px/)
  })
})
