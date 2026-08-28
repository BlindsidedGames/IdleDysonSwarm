// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { AvocatoSurface, type AvocatoSurfaceProps } from './AvocatoSurface'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AvocatoSurface', () => {
  test('presents multiplicative feed breakdown and authored late-game copy', () => {
    renderSurface()
    expect(screen.getByText('Avocato')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Avocato' })).not.toBeInTheDocument()
    expect(screen.getByText('Total boost to Cash, Science, and Buildings')).toBeInTheDocument()
    expect(screen.getByText('Infinity Multiplier')).toBeInTheDocument()
    expect(screen.getByText('Influence Multiplier')).toBeInTheDocument()
    expect(screen.getByText('Strange Matter Multiplier')).toBeInTheDocument()
    expect(screen.getByText('Overflow')).toBeInTheDocument()
    expect(screen.queryByText(/secrets found/)).not.toBeInTheDocument()
  })

  test('keeps the feed economy hidden before its Quantum unlock', () => {
    renderSurface({ unlocked: false })
    expect(screen.queryByText('Meditation')).not.toBeInTheDocument()
    expect(screen.queryByText('Total boost to Cash, Science, and Buildings')).not.toBeInTheDocument()
    expect(screen.queryByText('Infinity Multiplier')).not.toBeInTheDocument()
    expect(screen.queryByText('Overflow')).not.toBeInTheDocument()
  })

  test('feeds the complete canonical source once while pending', async () => {
    let settle: ((result: UiRuntimePlayerCommandResult) => void) | undefined
    const dispatchPlayer = vi.fn(() => new Promise<UiRuntimePlayerCommandResult>((resolve) => { settle = resolve }))
    renderSurface({ dispatchPlayer })

    const feed = screen.getByRole('button', { name: 'Feed all Influence to Avocato' })
    fireEvent.click(feed)
    fireEvent.click(feed)
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'avocado.feed', source: 'influence' })

    settle?.(accepted())
    await screen.findByRole('button', { name: 'Feed all Influence to Avocato' })
  })

  test('has no serious or critical accessibility violations', async () => {
    const { container } = renderSurface()
    const result = await axe.run(container)
    expect(result.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
  })
})

function renderSurface(overrides: Partial<AvocatoSurfaceProps> = {}) {
  const props: AvocatoSurfaceProps = {
    locale: 'en',
    unlocked: true,
    resources: { infinityPoints: 1000, influence: 100, strangeMatter: 10, overflowMultiplier: 0.5 },
    spendable: { infinityPoints: 42n, influence: 128, strangeMatter: 64 },
    derived: { infinityPoints: 3, influence: 2, strangeMatter: 1, overflow: 1.5, total: 9 },
    previews: {
      feeds: [
        { source: 'infinity-points', eligible: true, amount: 42, code: 'fed' },
        { source: 'influence', eligible: true, amount: 128, code: 'fed' },
        { source: 'strange-matter', eligible: true, amount: 64, code: 'fed' },
      ],
      meditation: { eligible: true, requiredStepIndex: 2, code: 'step-completed', skillPointReward: 4n },
    },
    commandAvailability: { feed: true },
    dispatchPlayer: vi.fn(async () => accepted()),
    ...overrides,
  }
  return render(<IntlProvider locale="en"><AvocatoSurface {...props} /></IntlProvider>)
}

function accepted(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted', kind: 'transition', changed: true, stateRevision: 2,
    activationRevision: { session: 1, state: 2 },
  }
}
