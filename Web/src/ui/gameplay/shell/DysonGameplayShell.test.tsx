// @vitest-environment jsdom
/// <reference types="node" />

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import axe from 'axe-core'
import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { targetSizes } from '../../tokens/tokens'
import type {
  DysonGameplayShellProps,
} from './contracts'
import { DysonGameplayShell } from './DysonGameplayShell'

const shellCss = readFileSync(
  resolve(
    process.cwd(),
    'src/ui/gameplay/shell/dysonGameplayShell.css',
  ),
  'utf8',
)
const tinkerCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/tinker/tinker.css'),
  'utf8',
)
const facilitiesCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/facilities/facilities.css'),
  'utf8',
)
const tokensCss = readFileSync(
  resolve(process.cwd(), 'src/ui/tokens/tokens.css'),
  'utf8',
)

afterEach(cleanup)

describe('DysonGameplayShell', () => {
  it('renders one main landmark, a working skip link, and both responsive navigation sources', () => {
    const { container } = render(<DysonGameplayShell {...laterProps()} />)

    const main = screen.getByRole('main')
    const skipLink = screen.getByRole('link', {
      name: 'Skip to Dyson gameplay',
    })
    expect(skipLink).toHaveAttribute('href', `#${main.id}`)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toBeInTheDocument()

    const rail = container.querySelector('.dyson-shell__rail')
    const bottom = container.querySelector(
      '.dyson-shell__bottom-navigation',
    )
    expect(rail).not.toBeNull()
    expect(bottom).not.toBeNull()
    expect(
      (rail as Node).compareDocumentPosition(main) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      main.compareDocumentPosition(bottom as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const navigations = screen.getAllByRole('navigation', {
      name: 'Primary',
    })
    expect(navigations).toHaveLength(2)
    for (const navigation of navigations) {
      expect(within(navigation).getByText('Bots').closest(
        '[aria-current="page"]',
      )).toBeInTheDocument()
      expect(
        within(navigation).queryByRole('link', { name: 'Bots' }),
      ).not.toBeInTheDocument()
      expect(
        within(navigation).queryByText('Research'),
      ).not.toBeInTheDocument()
    }
  })

  it('preserves Cash, Total Bots, Science order and keeps formatted facts isolated', () => {
    const { container } = render(<DysonGameplayShell {...freshProps()} />)
    const resources = container.querySelectorAll('[data-resource]')

    expect(
      Array.from(resources, (resource) =>
        resource.getAttribute('data-resource'),
      ),
    ).toEqual(['cash', 'total-bots', 'science'])
    expect(resources[0]).toHaveTextContent('Cash$0$0.00 /s')
    expect(resources[1]).toHaveTextContent('Total Bots0')
    expect(resources[2]).toHaveTextContent('Science0 science0.00 /s')
    expect(resources[0]).toHaveClass(
      'dyson-resource-header__item--cash',
    )
    expect(resources[1]).toHaveClass(
      'dyson-resource-header__item--total-bots',
    )
    expect(resources[2]).toHaveClass(
      'dyson-resource-header__item--science',
    )
  })

  it('renders the fresh facility region exactly once without adding a card grid', () => {
    const { container } = render(<DysonGameplayShell {...freshProps()} />)

    expect(
      screen.getByRole('region', { name: 'Tinker' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Assembly Lines')).not.toBeInTheDocument()
    expect(screen.getAllByText('????')).toHaveLength(1)
    expect(
      screen.getAllByRole('region', { name: 'Facilities' }),
    ).toHaveLength(1)
    expect(container.querySelector('.dyson-shell__facility-grid')).toBeNull()
  })

  it('places one caller-owned facility region after Tinker without remapping its children', () => {
    const { container } = render(<DysonGameplayShell {...laterProps()} />)
    const tinker = screen.getByRole('region', { name: 'Tinker' })
    const facilities = screen.getByRole('region', {
      name: 'Facilities',
    })
    const facilityIds = Array.from(
      facilities.querySelectorAll('[data-facility-id]'),
      (facility) => facility.getAttribute('data-facility-id'),
    )

    expect(facilityIds).toEqual(['assembly-lines', 'ai-managers'])
    expect(
      tinker.compareDocumentPosition(facilities) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(container.querySelectorAll('.dyson-shell__facility-region')).toHaveLength(1)
    expect(screen.getAllByText('????')).toHaveLength(1)
  })

  it('omits absent Tinker without creating a presentation placeholder', () => {
    const props = laterProps()
    const { container } = render(
      <DysonGameplayShell
        {...props}
        tinker={undefined}
      />,
    )

    expect(
      screen.queryByRole('region', { name: 'Tinker' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('.dyson-shell__tinker')).toBeNull()
    expect(
      screen.getByRole('region', { name: 'Facilities' }),
    ).toBeInTheDocument()
  })

  it('sets locale direction while preserving the physical Unity resource positions', () => {
    const { container } = render(
      <DysonGameplayShell {...freshProps()} direction="rtl" />,
    )
    const shell = container.firstElementChild
    const resourceHeader = container.querySelector(
      '.dyson-resource-header',
    )
    const resourceItems = container.querySelectorAll('[data-resource]')

    expect(shell).toHaveAttribute('dir', 'rtl')
    expect(resourceHeader).toHaveAttribute('dir', 'ltr')
    for (const resource of resourceItems) {
      expect(resource).toHaveAttribute('dir', 'rtl')
    }
  })

  it('has no automated accessibility violations in the later-progression state', async () => {
    const { container } = render(<DysonGameplayShell {...laterProps()} />)
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        // Vitest does not apply responsive styles to axe's static DOM. The
        // focused CSS contract below proves that exactly one of these two
        // source-ordered navigation landmarks is visible at each breakpoint.
        'landmark-unique': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

describe('Dyson gameplay responsive CSS contract', () => {
  it('switches source-ordered rail and bottom navigation at the approved medium boundary', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell__rail\s*\{\s*display:\s*none;/,
    )
    expect(shellCss).toContain('@media (min-width: 600px)')
    expect(shellCss).toMatch(
      /@media \(min-width: 600px\)[\s\S]*\.dyson-shell__rail\s*\{\s*display:\s*block;/,
    )
    expect(shellCss).toMatch(
      /@media \(min-width: 600px\)[\s\S]*\.dyson-shell__bottom-navigation\s*\{\s*display:\s*none;/,
    )
    expect(shellCss).toContain('@media (min-width: 1024px)')
  })

  it('keeps wide Tinker and the caller-owned facility region in the approved stage geometry', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell__stage\[data-has-tinker="true"\]\[data-has-visible-facilities="true"\]\s*\{\s*grid-template-columns:\s*minmax\(16rem,\s*0\.9fr\)\s*minmax\(24rem,\s*1\.35fr\);/,
    )
    expect(shellCss).not.toContain('.dyson-shell__facility-grid')
    expect(shellCss).not.toContain('.dyson-shell__teaser')
  })

  it('keeps 320px and zoom reflow bounded without physical directional spacing', () => {
    expect(targetSizes.minimum).toBe(44)
    expect(shellCss).toContain(
      'min-block-size: var(--target-minimum)',
    )
    expect(shellCss).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(shellCss).toContain('max-inline-size: 100%')
    expect(shellCss).toContain('overflow-x: hidden')
    expect(shellCss).toContain('env(safe-area-inset-bottom)')
    expect(shellCss).toContain(
      '@media (max-width: 599px) and (orientation: landscape)',
    )
    expect(shellCss).not.toMatch(
      /(?:^|\n)\s*(?:margin|padding|border|inset)-(?:left|right)\s*:/,
    )
  })

  it('locks the compact portrait and 200% zoom proxy to one bounded content column', () => {
    const compactRules = shellCss.slice(
      0,
      shellCss.indexOf('@media (min-width: 600px)'),
    )
    expect(compactRules).toContain(
      'grid-template-columns: minmax(0, 1fr)',
    )
    expect(compactRules).toContain('max-inline-size: 100%')
    expect(compactRules).toContain('overflow-y: auto')
    expect(compactRules).not.toMatch(
      /min-inline-size:\s*\d+(?:\.\d+)?px/,
    )
    expect(facilitiesCss).toMatch(
      /@media \(max-width: 359px\)[\s\S]*flex-direction:\s*column/,
    )
  })

  it.each([
    {
      band: 'compact portrait at 320px',
      evidence: [
        '.dyson-shell__rail {',
        'display: none;',
        'grid-template-columns: minmax(0, 1fr)',
      ],
    },
    {
      band: 'compact landscape below 600px',
      evidence: [
        '@media (max-width: 599px) and (orientation: landscape)',
        'min-block-size: 8rem',
      ],
    },
    {
      band: 'medium from 600px',
      evidence: [
        '@media (min-width: 600px)',
        'grid-template-columns: minmax(9.5rem, 11rem) minmax(0, 1fr)',
      ],
    },
    {
      band: 'wide from 1024px',
      evidence: [
        '@media (min-width: 1024px)',
        'grid-template-columns: minmax(13rem, 15rem) minmax(0, 1fr)',
      ],
    },
  ])('keeps the approved $band contract explicit', ({ evidence }) => {
    for (const declaration of evidence) {
      expect(shellCss).toContain(declaration)
    }
  })

  it('routes reduced motion and forced colors through the gameplay surfaces', () => {
    expect(tokensCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*--motion-duration-fast:\s*0ms;[\s\S]*--motion-duration-standard:\s*0ms;/,
    )
    expect(tinkerCss).toContain(
      'background-color var(--motion-duration-fast)',
    )
    for (const css of [shellCss, tinkerCss, facilitiesCss]) {
      expect(css).toContain('@media (forced-colors: active)')
      expect(css).toContain('forced-color-adjust: auto')
    }
    expect(shellCss).toMatch(
      /\.dyson-navigation__link:focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus\)/,
    )
    expect(tinkerCss).toMatch(
      /\.tinker-surface__control:focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus\)/,
    )
  })
})

function freshProps(): DysonGameplayShellProps {
  return {
    direction: 'ltr',
    skipLinkLabel: 'Skip to Dyson gameplay',
    heading: 'Bots',
    navigation: {
      ariaLabel: 'Primary',
      items: [
        {
          id: 'bots',
          label: 'Bots',
          icon: 'B',
          current: true,
        },
      ],
    },
    resources: {
      ariaLabel: 'Dyson resources',
      cash: {
        label: 'Cash',
        value: '$0',
        rate: '$0.00 /s',
      },
      totalBots: {
        label: 'Total Bots',
        value: '0',
      },
      science: {
        label: 'Science',
        value: '0 science',
        rate: '0.00 /s',
      },
    },
    tinker: {
      ariaLabel: 'Tinker',
      content: <button type="button">Tinker</button>,
    },
    hasVisibleFacilities: false,
    facilities: (
      <section aria-label="Facilities">
        <div data-next-tier-teaser>????</div>
      </section>
    ),
    productionSummary: {
      ariaLabel: 'Production summary',
      content: <p>Production summary</p>,
    },
    botDistribution: {
      ariaLabel: 'Bot Distribution',
      content: <p>Bot Distribution</p>,
    },
  }
}

function laterProps(): DysonGameplayShellProps {
  return {
    ...freshProps(),
    hasVisibleFacilities: true,
    facilities: (
      <section aria-label="Facilities">
        <div className="candidate-facility-grid">
          <article data-facility-id="assembly-lines">
            <h2>Assembly Lines</h2>
            <button type="button">Buy Assembly Line</button>
          </article>
          <article data-facility-id="ai-managers">
            <h2>AI Managers</h2>
            <button type="button">Buy AI Manager</button>
          </article>
          <div data-next-tier-teaser>????</div>
        </div>
      </section>
    ),
  }
}
