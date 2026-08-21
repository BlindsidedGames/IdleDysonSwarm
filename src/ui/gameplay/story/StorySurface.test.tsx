// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import axe from 'axe-core'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { FrontendStoryDerivedFacts } from '../../../application/frontendSnapshot'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import {
  StorySurface,
  type StorySurfaceProps,
} from './StorySurface'

const storyStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'story', 'story.css'),
  'utf8',
)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const firstRunStory = {
  visibleChapterIds: ['chapter-1'],
  visiblePassageIds: ['chapter-1-intro'],
  avocatoEntryVisible: false,
} as const satisfies FrontendStoryDerivedFacts

describe('StorySurface', () => {
  test('uses compact text-scale-aware chapter headings on mobile', () => {
    expect(storyStyles).toMatch(
      /@media \(max-width: 32rem\)[\s\S]*\.story-chapter[^}]*\.ui-collapsible-section__trigger\s*\{[^}]*min-block-size:\s*var\(--target-minimum\);[^}]*font-size:\s*calc\(0\.92rem \* var\(--game-text-scale\)\);/,
    )
  })

  test('keeps chapter grouping transparent around standalone passage panels', () => {
    const { container } = renderSurface()
    const chapter = container.querySelector('.story-chapter')

    expect(chapter).not.toBeNull()
    expect(
      chapter?.querySelector(':scope > .ui-collapsible-section__heading'),
    ).not.toBeNull()
    expect(
      chapter?.querySelector(
        ':scope > .ui-collapsible-section__content > .story-chapter__passages > li',
      ),
    ).not.toBeNull()
    expect(storyStyles).toMatch(
      /\.story-chapter\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/,
    )
    expect(storyStyles).toMatch(
      /\.story-chapter > \.ui-collapsible-section__content\s*\{[^}]*background:\s*transparent;/,
    )
  })

  test('renders only canonically revealed passages', () => {
    renderSurface()

    expect(screen.getByText('Story')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Story' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Story' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chapter 1/ })).toBeInTheDocument()
    expect(screen.getByText(/computer whirring in the background/)).toBeInTheDocument()
    expect(screen.queryByText(/Before long you have 10 bots/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Chapter 2/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Visit Avocato' })).not.toBeInTheDocument()
  })

  test('groups a Speed VIII reveal under Chapter 6 even when Unity hides its heading object', () => {
    renderSurface({
      story: {
        visibleChapterIds: ['chapter-1'],
        visiblePassageIds: [
          'chapter-1-intro',
          'chapter-6-speed',
        ],
        avocatoEntryVisible: false,
      },
    })

    expect(screen.getByRole('button', { name: /Chapter 6/ })).toBeInTheDocument()
    expect(screen.getByText(/artifact slows to a crawl/)).toBeInTheDocument()
    expect(screen.queryByText(/translates the last letter/)).not.toBeInTheDocument()
  })

  test('keeps Avocato narrative in Story without exposing a functional entrance', () => {
    renderSurface({
      story: {
        visibleChapterIds: [
          'chapter-1',
          'chapter-2',
          'chapter-3',
        ],
        visiblePassageIds: [
          'chapter-1-intro',
          'chapter-3-intro',
          'chapter-3-part-2',
        ],
        avocatoEntryVisible: true,
      },
    })

    expect(screen.getByText(/avocado into the murky mists/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Visit Avocato' }),
    ).not.toBeInTheDocument()
  })

  test('alternates the authored Avocato passage once per second', () => {
    vi.useFakeTimers()
    renderSurface({
      story: {
        visibleChapterIds: ['chapter-3'],
        visiblePassageIds: ['chapter-3-part-2'],
        avocatoEntryVisible: false,
      },
    })

    expect(screen.getByText(/avocado into the murky mists/)).toBeVisible()
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText(/stare into the murky mists/)).toBeVisible()
  })

  test('keeps the passage static when reduced motion is requested', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    renderSurface({
      story: {
        visibleChapterIds: ['chapter-3'],
        visiblePassageIds: ['chapter-3-part-2'],
        avocatoEntryVisible: false,
      },
    })

    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByText(/avocado into the murky mists/)).toBeVisible()
    expect(screen.queryByText(/stare into the murky mists/)).not.toBeInTheDocument()
  })

  test('has no serious or critical accessibility violations', async () => {
    const { container } = renderSurface()
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })
})

function renderSurface(
  overrides: Partial<StorySurfaceProps> = {},
) {
  const props: StorySurfaceProps = {
    story: firstRunStory,
    ...overrides,
  }
  return render(
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as SharedMessageCatalog}
    >
      <StorySurface {...props} />
    </PresentationIntlProvider>,
  )
}
