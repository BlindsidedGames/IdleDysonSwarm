// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it } from 'vitest'
import { EMPTY_DISCOVERY, EMPTY_DISCOVERY_TIER } from '../../../simulation/discovery'
import { DiscoverySurface } from './DiscoverySurface'

afterEach(cleanup)

it.each([1, 2, 3])('shows only the %i unlocked tier sections with their own effects and weighted speed sources', count => {
  const state = { ...EMPTY_DISCOVERY, unlocked: true,
    ...(count > 1 ? { elevation: { ...EMPTY_DISCOVERY_TIER } } : {}),
    ...(count > 2 ? { enlightenment: { ...EMPTY_DISCOVERY_TIER } } : {}) }
  const effects = { speed: 2, elevationSpeed: 1.625, enlightenmentSpeed: 1.4375,
    sources: [{ id: 'coldFusion', bonus: 0.75 }, { id: 'discovery.speed', bonus: 0.25 }],
    enhancement: 0, strength: 10, multiplier: 10, nextMultiplier: 10.1, cashBotsMultiplier: 10, lifetime: 30 }
  const { container } = render(<IntlProvider locale="en"><DiscoverySurface state={state} effects={effects} locale="en" gameSpeed={1} /></IntlProvider>)
  fireEvent.click(container.querySelector('summary')!)
  const sections = screen.getAllByRole('region')
  expect(sections).toHaveLength(count)
  const discovery = within(screen.getByRole('region', { name: 'Discovery' }))
  expect(discovery.getByText('Facility production')).toBeTruthy()
  expect(discovery.getByText('+75.0%')).toBeTruthy()
  expect(discovery.queryByText('Cash & Bots') !== null).toBe(count === 1)
  expect(discovery.queryByText('Base panel lifetime') !== null).toBe(count < 3)
  if (count > 1) {
    const elevation = within(screen.getByRole('region', { name: 'Elevation' }))
    expect(elevation.getByText('Cash & Bots')).toBeTruthy()
    expect(elevation.getByText('+37.5%')).toBeTruthy()
    expect(elevation.getByText('Discovery: +30m')).toBeTruthy()
  }
  if (count > 2) {
    const enlightenment = within(screen.getByRole('region', { name: 'Enlightenment' }))
    expect(enlightenment.getByText('Base panel lifetime')).toBeTruthy()
    expect(enlightenment.getByText('+18.8%')).toBeTruthy()
    expect(enlightenment.getByText('Elevation: +10m')).toBeTruthy()
  }
})
