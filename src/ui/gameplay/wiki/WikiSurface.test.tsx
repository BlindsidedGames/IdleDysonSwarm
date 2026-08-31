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
  test('keeps the four merged fixes in the existing 4.1.5 section', () => {
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

    expect(release.getByText(
      'Universe designations now continue beyond the former 64-bit ceiling.',
    )).not.toBeNull()
    expect(release.getByText(
      'The 42 Qi Bot goal now follows Division and stays aligned with the current Infinity requirement.',
    )).not.toBeNull()
    expect(release.getByText(
      'Having maximum Skill Points with Purity no longer makes gameplay unavailable, and affected saves reopen normally.',
    )).not.toBeNull()
    expect(release.getByText(
      'Tapping outside a pending Offline Time confirmation now dismisses it, while active processing remains protected.',
    )).not.toBeNull()
    expect(screen.queryByText('Version 4.1.6')).toBeNull()
  })
})
