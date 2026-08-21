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
const infinityCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/infinity/infinity.css'),
  'utf8',
)
const realityCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/reality/reality.css'),
  'utf8',
)
const simulationsCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/simulations/simulations.css'),
  'utf8',
)
const quantumCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/quantum/quantum.css'),
  'utf8',
)
const statisticsCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/statistics/statistics.css'),
  'utf8',
)
const storeCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/store/store.css'),
  'utf8',
)
const controlsCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/dyson/dysonControls.css'),
  'utf8',
)
const lowerFactsCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/dyson/dysonLowerFacts.css'),
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
  it('compacts the mobile drawer and Bots lower regions without shrinking touch targets', () => {
    expect(shellCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.dyson-navigation--drawer \.dyson-navigation__link\s*\{[^}]*min-block-size:\s*var\(--target-minimum\);[^}]*font-size:\s*calc\(0\.9rem \* var\(--game-text-scale\)\);/,
    )
    expect(shellCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.dyson-navigation--drawer \.dyson-navigation__progress\s*\{[^}]*inset-inline-start:\s*2\.85rem;[^}]*inset-inline-end:\s*0\.45rem;/,
    )
    expect(controlsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.dyson-info__facts\s*\{[^}]*font-size:\s*calc\(0\.66rem \* var\(--game-text-scale\)\);/,
    )
    expect(controlsCss).toMatch(
      /\.dyson-info__overview\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 2\.8rem;/,
    )
    expect(controlsCss).not.toMatch(
      /\.dyson-info__fact\s*\{[^}]*border/,
    )
    expect(lowerFactsCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.dyson-lower-facts p\s*\{[^}]*font-size:\s*calc\(0\.76rem \* var\(--game-text-scale\)\);/,
    )
  })

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

    const botsSymbol = resources[1].querySelector(
      'img[data-symbol="bots"]',
    )
    expect(botsSymbol).toHaveAttribute('alt', '')
    expect(botsSymbol).toHaveClass('ui-inline-image-symbol')

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

  it('keeps distribution below full route content without Bots-only regions', () => {
    const { container } = render(
      <DysonGameplayShell
        {...props()}
        routeContent={{
          ariaLabel: 'Research',
          content: <p>Research cards</p>,
        }}
      />,
    )

    expect(screen.getByText('Research cards')).toBeInTheDocument()
    expect(screen.getByText('Bot distribution')).toBeInTheDocument()
    expect(screen.queryByText('Production summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Info')).not.toBeInTheDocument()
    expect(
      container.querySelector('.dyson-shell__route-content')
        ?.nextElementSibling,
    ).toHaveClass('dyson-shell__lower-regions')
  })

  it('publishes the active route theme variant for shared shell regions', () => {
    const { container } = render(
      <DysonGameplayShell
        {...props()}
        routeTheme="simulations"
        routeThemeVariant="information"
      />,
    )

    expect(container.firstElementChild).toHaveAttribute(
      'data-route-theme-variant',
      'information',
    )
  })

  it('can omit the shared resource header for routes with their own summary', () => {
    const { container } = render(
      <DysonGameplayShell
        {...props()}
        showResourceHeader={false}
      />,
    )

    expect(
      container.querySelector('.dyson-resource-header'),
    ).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute(
      'data-resource-header',
      'false',
    )
  })

  it('pins route content and supplements to their shell rows when the header is omitted', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell__route-content\s*\{[^}]*grid-row:\s*2;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__lower-regions\s*\{[^}]*grid-row:\s*3;/,
    )
  })

  it('uses the card gutter for both facilities and lower panels', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell__stage\s*\{[^}]*max\(var\(--game-card-content-inset\), env\(safe-area-inset-right\)\)[^}]*max\(var\(--game-card-content-inset\), env\(safe-area-inset-left\)\);/s,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__lower-regions\s*\{[^}]*max\(var\(--game-card-content-inset\), env\(safe-area-inset-right\)\)[^}]*max\(var\(--game-card-content-inset\), env\(safe-area-inset-left\)\);/s,
    )
    expect(shellCss).not.toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.dyson-shell__lower-regions\s*\{[^}]*padding-inline:/,
    )
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
  it('keeps the skip link fully above an inset viewport until focused', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell__skip-link\s*\{[^}]*inset-block-start:\s*max\(0\.5rem, env\(safe-area-inset-top\)\);[^}]*transform:\s*translateY\(\s*calc\(-100% - max\(0\.5rem, env\(safe-area-inset-top\)\)\)\s*\);/s,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__skip-link:focus\s*\{[^}]*transform:\s*translateY\(0\);/s,
    )
  })

  it('owns top safe-area clearance when a route omits the resource header', () => {
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-resource-header="false"\]\s+\.dyson-shell__content\s*\{[^}]*padding-block-start:\s*env\(safe-area-inset-top\);/s,
    )
    expect(shellCss).toMatch(
      /\[data-route-theme="skills"\][\s\S]*\[data-route-theme="infinity"\][\s\S]*\[data-route-theme="reality"\][\s\S]*\[data-route-theme="simulations"\][\s\S]*\[data-route-theme="quantum"\][\s\S]*\[data-route-theme="statistics"\][\s\S]*padding-block-start:\s*0;/,
    )
  })

  it('extends owned route panels through the top safe area', () => {
    expect(infinityCss).toMatch(
      /\.infinity-surface__summary\s*\{[^}]*calc\(0\.625rem \+ env\(safe-area-inset-top\)\)/s,
    )
    expect(realityCss).toMatch(
      /\.reality-surface__summary\s*\{[^}]*calc\(0\.72rem \+ env\(safe-area-inset-top\)\)/s,
    )
    expect(simulationsCss).toMatch(
      /\.simulations-surface__summary\s*\{[^}]*calc\(0\.6rem \+ env\(safe-area-inset-top\)\)/s,
    )
    expect(quantumCss).toMatch(
      /\.quantum-surface__summary\s*\{[^}]*calc\(0\.75rem \+ env\(safe-area-inset-top\)\)/s,
    )
    expect(statisticsCss).toMatch(
      /\.statistics-surface__summary\s*\{[^}]*calc\(0\.75rem \+ env\(safe-area-inset-top\)\)/s,
    )
    expect(storeCss).toMatch(
      /\.store-surface__content\s*\{[^}]*calc\(0\.75rem \+ env\(safe-area-inset-top\)\)/s,
    )
  })

  it('colors Offline Time progress from the active route theme', () => {
    expect(shellCss).toMatch(
      /\.dyson-navigation__progress i\s*\{[^}]*background:\s*var\(--navigation-progress-fill\);/s,
    )
    expect(shellCss).toMatch(
      /\[data-route-theme="research"\]\s*\{[^}]*--navigation-progress-fill:\s*#8bc7c4;/s,
    )
    expect(shellCss).toMatch(
      /\[data-route-theme="statistics"\]\s*\{[^}]*--navigation-progress-fill:\s*#91dd8f;/s,
    )
    expect(shellCss).toMatch(
      /\[data-route-theme="simulations"\]\s*\{[^}]*--navigation-progress-fill:\s*var\(--simulations-slider-accent\);/s,
    )
  })

  it('keeps late-game resource values inside three compact mobile columns', () => {
    expect(shellCss).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*\.dyson-resource-header\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);[^}]*calc\(0\.42rem \+ env\(safe-area-inset-top\)\)/,
    )
    expect(shellCss).toMatch(
      /\.dyson-resource-header__item\s*\{[^}]*overflow:\s*hidden;/s,
    )
    expect(shellCss).not.toContain('content: "Total Bots: "')
    expect(shellCss).toMatch(
      /\.dyson-resource-header__item--total-bots \.ui-inline-image-symbol,[\s\S]*block-size:\s*0\.95em;/,
    )
    expect(shellCss).toContain(
      'font-size: clamp(0.68rem, 3.6vw, 1.22rem)',
    )
  })

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
      /\.dyson-shell__playfield\s*\{[^}]*--dyson-swarm-space:\s*clamp\(5\.5rem,\s*15vh,\s*9rem\);[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__playfield\[data-has-swarm="false"\]\s*\{[^}]*--dyson-swarm-space:\s*0rem;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__swarm\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0 0 auto;[^}]*min-block-size:\s*var\(--dyson-swarm-space\);[^}]*pointer-events:\s*none;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__stage\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*calc\(var\(--dyson-swarm-space\) \+ 0\.35rem\)/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__stage::\s*-webkit-scrollbar\s*\{[^}]*display:\s*none;[^}]*inline-size:\s*0;[^}]*block-size:\s*0;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__playfield\[data-has-swarm="true"\][\s\S]*\.dyson-shell__stage::after\s*\{[^}]*position:\s*absolute;[^}]*inset-block-start:\s*calc\(100% \+ var\(--dyson-swarm-space\)\);[^}]*content:\s*"";[^}]*pointer-events:\s*none;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__side-panel\s*\{[^}]*scrollbar-color:\s*var\(--menu-scrollbar-thumb\)\s*var\(--menu-scrollbar-track\);[^}]*scrollbar-gutter:\s*stable;[^}]*scrollbar-width:\s*thin;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__side-panel::\s*-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--menu-scrollbar-thumb\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="settings"\]\s*\{[^}]*--menu-scrollbar-track:\s*#121a12;[^}]*--menu-scrollbar-thumb:\s*#364d36;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="simulations"\]\s*\{[^}]*--menu-scrollbar-track:\s*var\(--simulations-menu-background\);[^}]*--menu-scrollbar-thumb:\s*var\(--simulations-navigation-border\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell__tinker\s*\{[\s\S]*margin-block-start:\s*auto;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-resource-header\s*\{[^}]*background:\s*transparent;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-resource-header\s*\{[^}]*min-block-size:\s*4\.7rem;[^}]*padding-block:\s*max\(0\.55rem,\s*env\(safe-area-inset-top\)\)\s*0\.18rem;/,
    )
    expect(shellCss).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*\.dyson-resource-header\s*\{[^}]*min-block-size:\s*3\.2rem;[^}]*padding-block:\s*calc\(0\.42rem \+ env\(safe-area-inset-top\)\)\s*0\.12rem;/,
    )
    expect(shellCss).not.toContain(
      'linear-gradient(180deg, #1c1420 70%',
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\s*\{[^}]*--theme-page:\s*#1d151f;[^}]*--theme-panel:\s*#443148;[^}]*--theme-selected:\s*#513b56;[^}]*--theme-divider:\s*#694b70;[^}]*--theme-accent:\s*#e59aeb;/,
    )
    expect(shellCss).toMatch(
      /data-route-theme="research"[^}]*--theme-page:\s*#181f1e;[^}]*--theme-panel:\s*#334c4a;[^}]*--theme-selected:\s*#41615e;[^}]*--theme-divider:\s*#5f8a87;[^}]*--theme-accent:\s*#8bc7c4;/,
    )
    expect(shellCss).toMatch(
      /data-route-theme="simulations"[^}]*--theme-page:\s*#152337;[^}]*--theme-panel:\s*#29435f;[^}]*--theme-selected:\s*#3a6384;[^}]*--theme-divider:\s*#7b9fbe;[^}]*--theme-accent:\s*#b9ddf7;/,
    )
    expect(shellCss).toMatch(
      /data-route-theme="skills"[\s\S]*data-route-theme="offline-time"[^}]*--theme-page:\s*#1c1427;[^}]*--theme-panel:\s*#30244f;[^}]*--theme-selected:\s*#483563;[^}]*--theme-divider:\s*#5b4674;[^}]*--theme-accent:\s*#d3c2ff;/,
    )
    expect(shellCss).toMatch(
      /data-route-theme="settings"[\s\S]*data-route-theme="statistics"[^}]*--theme-page:\s*#121a12;[^}]*--theme-panel:\s*#243324;[^}]*--theme-selected:\s*#3f7042;[^}]*--theme-divider:\s*#364d36;[^}]*--theme-accent:\s*#b9dfb7;/,
    )
    const routeAccents = {
      bots: '#e59aeb',
      research: '#8bc7c4',
      skills: '#d3c2ff',
      infinity: '#d3c2ff',
      reality: '#d3c2ff',
      simulations: '#b9ddf7',
      quantum: '#d3c2ff',
      store: '#e59aeb',
      story: '#e59aeb',
      wiki: '#e59aeb',
      'offline-time': '#d3c2ff',
      statistics: '#b9dfb7',
      debug: '#b9dfb7',
      settings: '#b9dfb7',
    } as const
    for (const [route, accent] of Object.entries(routeAccents)) {
      expect(shellCss).toContain(
        `.dyson-navigation__item[data-navigation-id="${route}"] {\n  --navigation-item-accent: ${accent};`,
      )
    }
    expect(shellCss).toMatch(
      /\.dyson-navigation__icon-mask\s*\{[^}]*background:\s*currentColor;[^}]*mask-position:\s*center;[^}]*mask-size:\s*contain;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-navigation__icon\s*\{[^}]*color:\s*#f4eff5;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-navigation__link\[aria-current="page"\]\s*\.dyson-navigation__icon\s*\{[^}]*color:\s*var\(--navigation-item-accent, currentColor\);/,
    )
    expect(shellCss).toMatch(
      /data-route-theme-variant="information"[\s\S]*data-navigation-id="simulations"[^}]*--navigation-item-accent:\s*#d3c2ff;/,
    )
    expect(shellCss).toMatch(
      /data-route-theme-variant="space-age"[\s\S]*data-navigation-id="simulations"[^}]*--navigation-item-accent:\s*#b9dfb7;/,
    )
    const defaultIconMaskRule = shellCss.match(
      /\.dyson-navigation__icon-mask\s*\{([^}]*)\}/,
    )?.[1]
    expect(defaultIconMaskRule).toBeDefined()
    expect(defaultIconMaskRule).not.toContain('opacity:')
    expect(shellCss).toMatch(
      /data-route-theme="simulations"\]\s*\{[^}]*--simulations-panel-color:\s*var\(--theme-panel\);[^}]*--simulations-navigation-border:\s*var\(--theme-divider\);[^}]*--simulations-menu-active-background:\s*var\(--theme-selected\);[^}]*--simulations-menu-accent:\s*var\(--theme-accent\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme\]\s*\.dyson-resource-header,[\s\S]*\.dyson-shell\[data-route-theme\]\s*\.dyson-shell__bottom-navigation,[\s\S]*\.dyson-shell\[data-route-theme\]\s*\.dyson-shell__lower-regions\s*\{[^}]*border-color:\s*var\(--theme-divider\);[^}]*background:\s*var\(--theme-panel\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="bots"\]\s+\.dyson-resource-header,\s*\.dyson-shell\[data-route-theme="research"\]\s+\.dyson-resource-header\s*\{[^}]*border-block-end:\s*2px solid var\(--theme-divider\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="simulations"\][\s\S]*\.dyson-resource-header\s*\{[^}]*background:\s*var\(--simulations-panel-color\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="simulations"\][\s\S]*\.dyson-shell__side-panel\s*\{[^}]*border-color:\s*var\(--simulations-navigation-border\);[^}]*background:\s*var\(--simulations-menu-background\);/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="simulations"\][\s\S]*\.dyson-navigation--drawer[\s\S]*\.dyson-navigation__link\s*\{[^}]*background:\s*var\(--simulations-menu-card-background\);[^}]*color:\s*var\(--simulations-menu-text\);/,
    )
    for (const routeTheme of [
      'quantum',
      'avocato',
      'offline-time',
      'statistics',
      'story',
      'wiki',
    ]) {
      expect(shellCss).toMatch(
        new RegExp(
          `\\.dyson-shell\\[data-route-theme="${routeTheme}"\\]\\s*\\.dyson-shell__route-content,?`,
        ),
      )
    }
    expect(shellCss).toMatch(
      /\.dyson-shell\s*\{[^}]*--bot-distribution-track-color:\s*#120d14;[^}]*--bot-distribution-handle-color:\s*#c45cda;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="research"\]\s*\{[^}]*--bot-distribution-track-color:\s*#263a38;[^}]*--bot-distribution-handle-color:\s*#8bc7c4;/,
    )
    expect(controlsCss).toContain(
      'background: var(--bot-distribution-track-color);',
    )
    expect(controlsCss).toContain(
      'background: var(--bot-distribution-handle-color);',
    )
    expect(shellCss).toMatch(
      /\.dyson-shell\[data-route-theme="research"\][\s\S]*\.dyson-shell__lower-regions\s*\{[^}]*border-color:\s*#41615e;[^}]*background:\s*#334c4a;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-resource-header__item::before\s*\{[^}]*content:\s*none;[^}]*pointer-events:\s*none;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-resource-header__item--cash::before,\s*\.dyson-resource-header__item--science::before\s*\{[^}]*content:\s*none;/,
    )
    expect(shellCss).not.toContain('backdrop-filter')
  })

  it('protects rapid touch, reflow, focus and reduced-motion behavior', () => {
    expect(targetSizes.minimum).toBe(44)
    expect(shellCss).toContain('touch-action: manipulation')
    expect(shellCss).toContain('user-select: none')
    expect(shellCss).toMatch(
      /\.dyson-shell\s*\{[\s\S]*-webkit-touch-callout:\s*none;[\s\S]*-webkit-user-select:\s*none;[\s\S]*user-select:\s*none;/,
    )
    expect(shellCss).toMatch(
      /\.dyson-shell textarea,[\s\S]*\.dyson-shell \[contenteditable="true"\]\s*\{[\s\S]*user-select:\s*text;/,
    )
    expect(shellCss).not.toContain('.dyson-shell code')
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
      /@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
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
    menuHeading: 'Menu',
    closeMenuLabel: 'Close menu',
    openMenuLabel: 'Open menu',
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
