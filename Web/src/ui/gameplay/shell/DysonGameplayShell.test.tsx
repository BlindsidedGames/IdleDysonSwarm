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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { targetSizes } from '../../tokens/tokens'
import type { DysonGameplayShellProps } from './contracts'
import { DysonGameplayShell } from './DysonGameplayShell'

const shellCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/shell/dysonGameplayShell.css'),
  'utf8',
)
const tokensCss = readFileSync(
  resolve(process.cwd(), 'src/ui/tokens/tokens.css'),
  'utf8',
)
const rootCss = readFileSync(
  resolve(process.cwd(), 'src/index.css'),
  'utf8',
)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DysonGameplayShell', () => {
  it('provides Unity-style drawer and compact bottom navigation', () => {
    render(<DysonGameplayShell {...props()} />)

    const navigations = screen.getAllByRole('navigation', {
      name: 'Primary',
      hidden: true,
    })
    expect(navigations).toHaveLength(2)
    expect(screen.getAllByRole('navigation', {
      name: 'Primary',
    })).toHaveLength(1)

    const drawer = navigations.find(
      (navigation) => navigation.dataset.placement === 'drawer',
    )
    const bottom = navigations.find(
      (navigation) => navigation.dataset.placement === 'bottom',
    )
    expect(drawer).toBeDefined()
    expect(bottom).toBeDefined()
    expect(within(drawer!).getByText('Offline Time')).toBeInTheDocument()
    expect(within(bottom!).queryByText('Offline Time')).not.toBeInTheDocument()
    expect(
      within(bottom!).getByText('Bots').closest('[aria-current="page"]'),
    ).toBeInTheDocument()
    expect(
      within(drawer!).getByRole('button', {
        name: 'Research',
        hidden: true,
      }),
    ).toBeDisabled()
  })

  it('contains compact-menu focus and restores the opener on close', async () => {
    const user = userEvent.setup()
    const { container } = render(<DysonGameplayShell {...props()} />)
    const shell = container.querySelector('.dyson-shell')
    const openMenu = screen.getByRole('button', { name: 'Open menu' })
    const sidePanel = container.querySelector('.dyson-shell__side-panel')
    const main = container.querySelector('main')
    const bottomNavigation = container.querySelector(
      '.dyson-shell__bottom-navigation',
    )

    expect(shell).toHaveAttribute('data-menu-open', 'false')
    expect(sidePanel).toHaveAttribute('inert')
    expect(sidePanel).toHaveAttribute('aria-hidden', 'true')
    await user.click(openMenu)
    expect(shell).toHaveAttribute('data-menu-open', 'true')
    expect(openMenu).toHaveAttribute('aria-expanded', 'true')
    expect(sidePanel).not.toHaveAttribute('inert')
    expect(sidePanel).not.toHaveAttribute('aria-hidden')
    expect(sidePanel).toHaveAttribute('role', 'dialog')
    expect(sidePanel).toHaveAttribute('aria-modal', 'true')
    expect(main).toHaveAttribute('inert')
    expect(bottomNavigation).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Close menu' }))
      .toHaveFocus()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Story' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close menu' }))
      .toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Story' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(shell).toHaveAttribute('data-menu-open', 'false')
    expect(openMenu).toHaveFocus()
    expect(main).not.toHaveAttribute('inert')
    expect(bottomNavigation).not.toHaveAttribute('inert')
  })

  it('preserves canonical resource order and accessible text', () => {
    const { container } = render(<DysonGameplayShell {...props()} />)
    const resources = container.querySelectorAll('[data-resource]')

    expect(
      Array.from(resources, (resource) =>
        resource.getAttribute('data-resource'),
      ),
    ).toEqual(['cash', 'total-bots', 'science'])
    expect(resources[0]).toHaveTextContent('Cash$0$0.00 /s')
    expect(resources[1]).toHaveTextContent('Total Bots0')
    expect(resources[2]).toHaveTextContent('Science0 science0.00 /s')

    const scienceSymbols = resources[2].querySelectorAll(
      'img[data-symbol="science"]',
    )
    expect(scienceSymbols).toHaveLength(2)
    for (const symbol of scienceSymbols) {
      expect(symbol).toHaveAttribute('alt', '')
      expect(symbol).toHaveClass('ui-inline-image-symbol')
    }
    expect(
      resources[2].querySelector(
        '.ui-resource-value__content > img[data-symbol="science"]',
      ),
    ).toBeInTheDocument()
    expect(
      resources[2].querySelector(
        '.dyson-resource-header__rate > img[data-symbol="science"]',
      ),
    ).toBeInTheDocument()
  })

  it('keeps gameplay regions in the Unity screen order', () => {
    const { container } = render(<DysonGameplayShell {...props()} />)
    const labels = Array.from(
      container.querySelectorAll(
        '.dyson-shell__content > section, .dyson-shell__content section',
      ),
      (region) => region.getAttribute('aria-label'),
    ).filter(Boolean)

    expect(labels).toEqual([
      'Dyson resources',
      'Dyson swarm',
      'Facilities',
      'Tinker',
      'Info',
      'Production summary',
      'Bot distribution',
    ])
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toHaveClass('dyson-shell__route-heading')
  })

  it('sets locale direction while keeping the physical Unity header order', () => {
    const { container } = render(
      <DysonGameplayShell {...props()} direction="rtl" />,
    )

    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl')
    expect(
      container.querySelector('.dyson-resource-header'),
    ).toHaveAttribute('dir', 'ltr')
    for (const resource of container.querySelectorAll('[data-resource]')) {
      expect(resource).toHaveAttribute('dir', 'rtl')
    }
  })

  it('has no automated accessibility violations', async () => {
    const { container } = render(<DysonGameplayShell {...props()} />)
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        'landmark-unique': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

describe('Dyson gameplay responsive CSS contract', () => {
  it('keeps compact bottom navigation and switches to the permanent side menu', () => {
    expect(shellCss).toContain('@media (min-width: 1024px)')
    expect(shellCss).not.toContain('@media (min-width: 900px)')
    expect(shellCss).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.dyson-shell__side-panel\s*\{[\s\S]*position:\s*relative;/,
    )
    expect(shellCss).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.dyson-shell__bottom-navigation\s*\{\s*display:\s*none !important;/,
    )
    expect(shellCss).toContain('env(safe-area-inset-bottom)')
    expect(shellCss).toContain('overflow: hidden')
    expect(shellCss).toMatch(
      /\.dyson-shell__stage\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__tinker\s*\{[\s\S]*margin-block-start:\s*auto;/,
    )
  })

  it('protects rapid touch, reflow, focus and reduced-motion behavior', () => {
    expect(targetSizes.minimum).toBe(44)
    expect(shellCss).toContain('touch-action: manipulation')
    expect(shellCss).toContain('user-select: none')
    expect(shellCss).toContain('min-inline-size: 0')
    expect(shellCss).toContain('align-items: baseline')
    expect(shellCss).toMatch(
      /\.dyson-navigation__link:focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus\)/,
    )
    expect(tokensCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*--motion-duration-fast:\s*0ms;/,
    )
    expect(shellCss).toContain('@media (forced-colors: active)')
    expect(rootCss).not.toMatch(/\bmin-width:\s*320px/)
    expect(tokensCss).toContain('--game-text-scale: 1')
    expect(shellCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\);/,
    )
    expect(shellCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.ui-resource-value__value,[\s\S]*white-space:\s*nowrap;/,
    )
  })
})

function props(): DysonGameplayShellProps {
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
        {
          id: 'research',
          label: 'Research',
          icon: 'R',
          disabled: true,
        },
        {
          id: 'story',
          label: 'Story',
          icon: 'S',
          href: '#story',
        },
        {
          id: 'offline',
          label: 'Offline Time',
          icon: 'O',
          disabled: true,
          bottom: false,
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
    swarmVisual: {
      ariaLabel: 'Dyson swarm',
      content: <div>Swarm</div>,
    },
    tinker: {
      ariaLabel: 'Tinker',
      content: <button type="button">Tinker</button>,
    },
    hasVisibleFacilities: true,
    facilities: <section aria-label="Facilities">Facilities</section>,
    info: {
      ariaLabel: 'Info',
      content: <p>Info</p>,
    },
    productionSummary: {
      ariaLabel: 'Production summary',
      content: <p>Production summary</p>,
    },
    distribution: {
      ariaLabel: 'Bot distribution',
      content: <p>Bot distribution</p>,
    },
    sidePanelSupplement: <p>Lifetime stats</p>,
  }
}
