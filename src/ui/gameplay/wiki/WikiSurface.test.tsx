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
  test('shows 4.1.8 first and retains older notes', () => {
    render(
      <IntlProvider locale="en" messages={{}} onError={() => undefined}>
        <WikiSurface
          locale="en"
          progression={progression}
          initialCategory="patch-notes"
        />
      </IntlProvider>,
    )

    const latest = screen.getByRole('heading', { name: 'Version 4.1.8' }).closest('section')!
    expect(within(latest).getByRole('heading', { name: 'Most Recent' })).not.toBeNull()
    expect(within(latest).getAllByRole('listitem')).toHaveLength(10)
    const older = screen.getByRole('heading', { name: 'Version 4.1.7' }).closest('section')!
    expect(within(older).getByRole('heading', { name: 'Older' })).not.toBeNull()
    expect(within(older).getAllByRole('listitem').slice(0, 10).map((item) => item.textContent)).toEqual([
      'Added 27 achievements on Android and iOS, matching Steam. Open Achievements in Settings to view them. Achievements earned offline are saved and synced when you reconnect.',
      'Restored the Round bulk purchases wording in Bots and Research settings.',
      'Building details now distinguish Purchased Building Scaling from the assigned Production Scaling skill and show the current bonus percentage and purchase threshold.',
      'New games and Quantum resets now default to 100% workers. New-game Skill Presets also start at 100% workers.',
      'Purchased Planets now count toward What Will Come to Pass through Terra Firma and Terra Irradient, including in the displayed calculation.',
      'Fixed taps on the Bot distribution slider applying the previous allocation instead of the latest selection.',
      'Offline Time failures now include distinct error codes, with a clear message when processing is cancelled because the app was backgrounded.',
      'Added Save File to save exports on Android and desktop, with native Save As dialogs in the Android and desktop apps.',
      'Fixed progression and Offline Time processing failures caused by Regulated Academia or Shoulders of the Revolution after Infinity and Quantum resets.',
      'Clarified that Repeatable Research divides research costs by the current total production multiplier and does not affect Durability. A +300% bonus means one quarter of the normal cost.',
    ])

    const releaseHeading = screen.getByRole('heading', {
      name: 'Version 4.1.6',
    })
    const releaseSection = releaseHeading.closest('section')
    expect(releaseSection).not.toBeNull()
    const release = within(releaseSection!)

    expect(release.getByText(
      'Fixed Facility cards collapsing into narrow columns on some devices, and added the locked next-Facility preview before the first Facility is available.',
    )).not.toBeNull()
    expect(release.getByText(
      'Added an on-by-default Bots setting that keeps Active, Lifetime, and Decayed panel statistics visible in a full-width row while the controls are collapsed.',
    )).not.toBeNull()
    expect(release.getByText(
      'Moved gameplay notices into a shared notification queue, so automatic Skill Preset conflict notices remain visible when changing tabs instead of being limited to Bots.',
    )).not.toBeNull()
    expect(release.getByText(
      'Automatic Simulation disasters now explain their first occurrence with a themed dialog and show later foreground resets as timed notices across gameplay tabs. First disasters reached during Offline Time appear after its completion summary, while repeat Offline Time disasters remain summarized there.',
    )).not.toBeNull()
  })

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
  })
})
