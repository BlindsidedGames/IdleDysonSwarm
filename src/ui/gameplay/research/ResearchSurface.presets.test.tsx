// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ResearchSurface } from './ResearchSurface'

beforeEach(() => localStorage.clear())
afterEach(cleanup)
const botsKey = 'idle-dyson-swarm.bots.show-preset-quick-actions.v1'

function view() {
  return <IntlProvider locale="en">
    <ResearchSurface cards={[]} locale="en" researchers={1} sciencePerSecond={1}
      buyMode="buy-1" roundedBulkBuy={false} presets={[]} presetAutomationSlot={0}
      automationUnlocked={false} automationEnabledById={{}} automationResearchIds={[]}
      purchaseRouteAvailable buyModeRouteAvailable roundedBulkRouteAvailable presetAutomationRouteAvailable automationRouteAvailable
      presetQuickActions={<button>Preset quick action</button>} dispatchPlayer={vi.fn()} />
  </IntlProvider>
}

test('Research visibility persists independently from Bots, without duplicating expanded controls', () => {
  localStorage.setItem(botsKey, 'true')
  let mounted = render(view())
  expect(screen.queryByRole('button', {name: 'Preset quick action'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Research purchase settings'}))
  expect(screen.getAllByRole('button', {name: 'Preset quick action'})).toHaveLength(1)
  fireEvent.click(screen.getByRole('checkbox', {name: 'Always show preset quick actions'}))
  expect(screen.getAllByRole('button', {name: 'Preset quick action'})).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', {name: 'Research purchase settings'}))
  expect(screen.getByRole('button', {name: 'Preset quick action'})).toBeTruthy()
  mounted.unmount()
  localStorage.setItem(botsKey, 'false')
  mounted = render(view())
  expect(screen.getByRole('button', {name: 'Preset quick action'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button', {name: 'Research purchase settings'}))
  fireEvent.click(screen.getByRole('checkbox', {name: 'Always show preset quick actions'}))
  fireEvent.click(screen.getByRole('button', {name: 'Research purchase settings'}))
  expect(screen.queryByRole('button', {name: 'Preset quick action'})).toBeNull()
  expect(localStorage.getItem(botsKey)).toBe('false')
  mounted.unmount()
  render(view())
  expect(screen.queryByRole('button', {name: 'Preset quick action'})).toBeNull()
})
