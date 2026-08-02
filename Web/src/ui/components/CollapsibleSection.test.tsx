// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  CollapsibleSection,
} from './CollapsibleSection'
import { disclosurePreferenceKey } from './disclosurePreference'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('CollapsibleSection', () => {
  test('uses the whole native header button as an accessible disclosure trigger', async () => {
    renderSection()
    const trigger = screen.getByRole('button', { name: 'Foundational Era' })
    const content = screen.getByText('Hunters')

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', content.parentElement?.id)

    trigger.focus()
    await userEvent.setup().keyboard('{Enter}')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Hunters')).not.toBeInTheDocument()

    await userEvent.setup().keyboard(' ')
    expect(screen.getByText('Hunters')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-controls')
  })

  test('persists a versioned UI-only preference under the stable feature key', async () => {
    const { unmount } = renderSection()
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )

    expect(localStorage.getItem(disclosurePreferenceKey('simulations.foundational')))
      .toBe('{"version":1,"expanded":false}')

    unmount()
    renderSection()
    expect(screen.getByRole('button', { name: 'Foundational Era' }))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Hunters')).not.toBeInTheDocument()
  })

  test('ignores malformed or differently versioned preferences', () => {
    const key = disclosurePreferenceKey('simulations.foundational')
    localStorage.setItem(key, '{bad json')
    const { unmount } = renderSection(false)
    expect(screen.getByRole('button', { name: 'Foundational Era' }))
      .toHaveAttribute('aria-expanded', 'false')

    unmount()
    localStorage.setItem(key, '{"version":2,"expanded":true}')
    renderSection(false)
    expect(screen.getByRole('button', { name: 'Foundational Era' }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  test('keeps working when browser storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable')
    })
    renderSection()
    const trigger = screen.getByRole('button', { name: 'Foundational Era' })

    await userEvent.setup().click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Hunters')).not.toBeInTheDocument()
  })
})

function renderSection(defaultExpanded = true) {
  return render(
    <CollapsibleSection
      storageKey="simulations.foundational"
      title="Foundational Era"
      defaultExpanded={defaultExpanded}
    >
      <a href="#hunters">Hunters</a>
    </CollapsibleSection>,
  )
}
