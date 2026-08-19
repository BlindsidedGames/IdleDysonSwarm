// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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
