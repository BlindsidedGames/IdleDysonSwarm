// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  AvotationCompletionOverlay,
  AvotationProgress,
  type AvotationProgressProps,
} from './AvotationProgress'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const quantumStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'quantum', 'quantum.css'),
  'utf8',
)

describe('AvotationProgress', () => {
  test('keeps progress, the current canonical hint and skip controls in Quantum', () => {
    renderProgress()
    expect(screen.getByText('2 of 7 secrets found')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Secrets' })).toBeVisible()
    expect(document.querySelectorAll('.avocato-meditation__found-icons img')).toHaveLength(2)
    expect(document.querySelectorAll('.avocato-meditation li[data-complete="true"]')).toHaveLength(2)
    expect(document.querySelectorAll('.avocato-meditation li')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    expect(screen.getByText('Workers produced more than output.')).toBeVisible()
    expect(screen.getByRole('button', { name: '120s' })).toBeDisabled()
  })

  test('waits 120 seconds and dispatches the current step only once', async () => {
    vi.useFakeTimers()
    let settle:
      | ((result: UiRuntimePlayerCommandResult) => void)
      | undefined
    const dispatchPlayer = vi.fn(
      () =>
        new Promise<UiRuntimePlayerCommandResult>((resolve) => {
          settle = resolve
        }),
    )
    renderProgress({ dispatchPlayer })

    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    act(() => vi.advanceTimersByTime(120_000))
    const skip = screen.getByRole('button', { name: 'Skip' })
    fireEvent.click(skip)
    fireEvent.click(skip)
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'avocado.complete-meditation-step',
      requiredStepIndex: 2,
    })

    await act(async () => {
      settle?.(accepted())
      await Promise.resolve()
    })
  })

  test('shows completed progress and the one-time completion overlay', () => {
    render(
      <IntlProvider locale="en">
        <>
          <AvotationProgress
            preview={{
              eligible: false,
              requiredStepIndex: null,
              code: 'already-completed',
              skillPointReward: 4n,
            }}
            routeAvailable
            dispatchPlayer={vi.fn(async () => accepted())}
          />
          <AvotationCompletionOverlay open onDismiss={vi.fn()} />
        </>
      </IntlProvider>,
    )
    expect(screen.getByText('7 of 7 secrets found')).toBeVisible()
    expect(document.querySelectorAll('.avocato-meditation__found-icons img')).toHaveLength(7)
    expect(document.querySelector('.avocato-meditation ol')).not.toBeInTheDocument()
    expect(screen.getAllByText('Skill Points granted: 4. Well done!')).toHaveLength(2)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Avocato meditating' })).toHaveAttribute(
      'src',
      expect.stringContaining('avotation-meditation.webp'),
    )
    expect(screen.getByRole('list', { name: 'Avotation names' })).toBeVisible()
    for (const name of [
      'Gudu!',
      'QUACKERS!',
      'Holg!',
      'Latimer Cross!',
      'Mentojacka!',
      'Nuclearion!',
      'VashVash!',
    ]) {
      expect(screen.getByText(name)).toBeVisible()
    }
  })

  test('contains modal focus, closes with Escape and restores the trigger', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    function OverlayHarness() {
      const [open, setOpen] = useState(false)
      return (
        <IntlProvider locale="en">
          <button type="button" onClick={() => setOpen(true)}>Open completion</button>
          <AvotationCompletionOverlay
            open={open}
            onDismiss={() => {
              onDismiss()
              setOpen(false)
            }}
          />
        </IntlProvider>
      )
    }
    render(<OverlayHarness />)
    const trigger = screen.getByRole('button', { name: 'Open completion' })
    await user.click(trigger)

    const dismiss = screen.getByRole('button', { name: 'Continue' })
    expect(dismiss).toHaveFocus()
    expect(trigger.closest('div')).toHaveAttribute('inert')
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
    await user.tab()
    expect(dismiss).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('defines its portaled accent without relying on a Quantum ancestor', () => {
    expect(quantumStyles).toMatch(
      /\.avotation-completion\s*\{[^}]*--avotation-accent:\s*#c8b3ff;[^}]*border:\s*2px solid var\(--avotation-accent\);/,
    )
  })
})

function renderProgress(
  overrides: Partial<AvotationProgressProps> = {},
) {
  const props: AvotationProgressProps = {
    preview: {
      eligible: true,
      requiredStepIndex: 2,
      code: 'step-completed',
      skillPointReward: 4n,
    },
    routeAvailable: true,
    dispatchPlayer: vi.fn(async () => accepted()),
    ...overrides,
  }
  return render(
    <IntlProvider locale="en">
      <AvotationProgress {...props} />
    </IntlProvider>,
  )
}

function accepted(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    stateRevision: 2,
    activationRevision: { session: 1, state: 2 },
  }
}
