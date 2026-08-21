// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import { LazySurfacePending } from './LazySurfacePending'

afterEach(cleanup)

describe('LazySurfacePending', () => {
  test('shows and announces the localized pending state', () => {
    render(
      <PresentationIntlProvider
        locale="en"
        messages={enCatalog as SharedMessageCatalog}
      >
        <LazySurfacePending />
      </PresentationIntlProvider>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading…')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  test('provides a visible overlay state for a deferred dialog', () => {
    render(
      <PresentationIntlProvider
        locale="en"
        messages={enCatalog as SharedMessageCatalog}
      >
        <LazySurfacePending overlay />
      </PresentationIntlProvider>,
    )

    expect(screen.getByRole('status'))
      .toHaveClass('dyson-shell__lazy-pending--overlay')
  })
})
