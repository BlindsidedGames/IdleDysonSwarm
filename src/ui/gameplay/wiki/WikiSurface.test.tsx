// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import { WikiSurface } from './WikiSurface'

afterEach(() => cleanup())

const progression = Object.freeze({
  infinityPoints: 0n,
  quantumPoints: 0n,
  secretsOfTheUniverse: 0n,
  infinityAchieved: false,
  realityUnlocked: false,
})

describe('Wiki patch-note content', () => {
  test('keeps the 1 September campaign notes factual and grouped under 4.1.5', () => {
    render(
      <IntlProvider locale="en" messages={{}} onError={() => undefined}>
        <WikiSurface
          locale="en"
          progression={progression}
          initialCategory="patch-notes"
        />
      </IntlProvider>,
    )

    const releaseHeading = screen.getByRole('heading', {
      name: 'Version 4.1.5',
    })
    const releaseSection = releaseHeading.closest('section')
    expect(releaseSection).not.toBeNull()
    const release = within(releaseSection!)

    const datedHeading = release.getByRole('heading', {
      name: '1 September 2026',
    })
    const datedList = datedHeading.nextElementSibling
    expect(datedList).toBeInstanceOf(HTMLUListElement)
    const datedNotes = within(datedList as HTMLElement)
    expect(datedNotes.getByText(
      'The free Community boost can now be activated even at zero Influence, without spending any Influence.',
    )).not.toBeNull()
    expect(datedNotes.getByText(
      'Completed Offline Time summaries now close reliably with Continue or a tap outside the dialog, prevent that tap from reaching the page underneath, and return focus to an available Offline Time control.',
    )).not.toBeNull()
    expect(datedNotes.getByText(
      'Added durable compatibility checks for universe designations beyond the signed 64-bit range, Purity at maximum Skill Points through Stored Time and save reloads, and Division-adjusted final Bot goals.',
    )).not.toBeNull()
    const earlierHeading = release.getByRole('heading', {
      name: 'Earlier 4.1.5 updates',
    })
    const earlierList = earlierHeading.nextElementSibling
    expect(earlierList).toBeInstanceOf(HTMLUListElement)
    const earlierNotes = within(earlierList as HTMLElement)
    expect(earlierNotes.getByText(
      'Tapping outside a pending Offline Time confirmation now dismisses it, while active processing remains protected.',
    )).not.toBeNull()
    expect(screen.queryByText('Version 4.1.6')).toBeNull()
  })
})
