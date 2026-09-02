// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DysonInfo, type DysonInfoProps } from './DysonControls'

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe('Bots collapsed run facts preference', () => {
  test('defaults on, preserves expanded facts, and persists an opt-out', () => {
    const view = renderInfo()

    const runFacts = screen.getByText('Run facts')
    const productionSummary = screen.getByText('Production summary')
    expect(
      runFacts.compareDocumentPosition(productionSummary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Purchase settings' }))
    const preference = screen.getByRole('checkbox', {
      name: 'Always show Active, Lifetime, and Deayed',
    })
    expect((preference as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Run facts')).not.toBeNull()

    fireEvent.click(preference)
    expect(screen.getByText('Run facts')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Purchase settings' }))
    expect(screen.queryByText('Run facts')).toBeNull()

    view.unmount()
    renderInfo()
    expect(screen.queryByText('Run facts')).toBeNull()
  })
})

function renderInfo() {
  return render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <DysonInfo {...props()} />
    </IntlProvider>,
  )
}

function props(): DysonInfoProps {
  return {
    summary: <span>Production summary</span>,
    statusSummary: <span>Run facts</span>,
    buyMode: 'buy-1',
    roundedBulkBuy: false,
    presets: [],
    presetAutomationSlot: 0,
    automationUnlocked: false,
    automationFacilityIds: [],
    automationEnabledFacilities: {} as DysonInfoProps['automationEnabledFacilities'],
    buyModeRouteAvailable: true,
    roundedBulkRouteAvailable: true,
    presetAutomationRouteAvailable: true,
    automationRouteAvailable: true,
    dispatchPlayer: vi.fn().mockResolvedValue({
      status: 'accepted',
      kind: 'transition',
      changed: true,
      stateRevision: 1,
      activationRevision: { session: 1, state: 1 },
    }),
  }
}
