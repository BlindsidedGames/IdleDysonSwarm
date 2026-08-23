import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

describe('Dyson gameplay shell CSS contract', () => {
  test('gives every gameplay checkbox a visible themed tick', () => {
    const source = readCss('./dysonGameplayShell.css')

    expect(source).toContain(
      ':is(.dyson-shell, .skill-details-dialog__backdrop)',
    )
    expect(source).toMatch(
      /input\[type="checkbox"\]\s*\{[^}]*appearance:\s*none;[^}]*background:\s*var\(--theme-page\);/s,
    )
    expect(source).toMatch(
      /input\[type="checkbox"\]:checked\s*\{[^}]*background-color:\s*var\(--theme-accent\);[^}]*background-image:\s*url\("data:image\/svg\+xml,[^}]*background-repeat:\s*no-repeat;/s,
    )
    expect(source).not.toContain('input[type="checkbox"]::after')
    expect(source).not.toContain(
      'input[type="checkbox"]:focus-visible',
    )
  })

  test('keeps a growing route list on one continuously scaled row', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('./dysonGameplayShell.css', import.meta.url),
      ),
      'utf8',
    )

    expect(source).not.toContain(
      'grid-template-columns: repeat(7',
    )
    expect(source).toContain('overflow: hidden')
    expect(source).toContain('flex: 1 1 0')
    expect(source).toContain('var(--bottom-navigation-menu-width)')
    expect(source).toContain('var(--bottom-navigation-icon-size)')
    expect(source).toContain('var(--bottom-navigation-label-size)')
    expect(source).toMatch(
      /\.dyson-shell__menu-icon\s*\{[^}]*grid-template-rows:\s*repeat\(3, 1fr\);[^}]*block-size:[^}]*--bottom-navigation-icon-size/s,
    )
  })

  test('shows every bottom label only when Include text is enabled', () => {
    const source = readCss('./dysonGameplayShell.css')

    expect(source).toMatch(
      /\.dyson-navigation--bottom \.dyson-navigation__label\s*\{[^}]*position:\s*absolute;[^}]*clip:\s*rect\(0 0 0 0\);/s,
    )
    expect(source).toContain('[data-include-text="true"]')
    expect(source).not.toContain('[data-size="large"]')
    expect(source).not.toContain('text-overflow: ellipsis')
  })

  test('lets the Settings scroller meet the real navigation boundary', () => {
    const source = readCss('./dysonGameplayShell.css')

    expect(source).toMatch(
      /\.dyson-shell\[data-route-theme="settings"\]\s*\.dyson-shell__route-content,[\s\S]*\{\s*padding:\s*0;/,
    )
  })

  test('contains full-height routes and delegates scrolling to their inner regions', () => {
    const shell = readCss('./dysonGameplayShell.css')
    const reality = readCss('../reality/reality.css')
    const simulations = readCss('../simulations/simulations.css')

    expect(shell).toMatch(
      /\.dyson-shell__content\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;[^}]*min-block-size:\s*0;[^}]*overflow:\s*hidden;/s,
    )
    expect(shell).toMatch(
      /\.dyson-shell__route-content\s*\{[^}]*block-size:\s*100%;[^}]*min-block-size:\s*0;[^}]*overflow:\s*hidden;/s,
    )

    expectContainedRoute(reality, 'reality-surface', 'reality-surface__content')
    expectContainedRoute(
      simulations,
      'simulations-surface',
      'simulations-surface__scroll-region',
    )
    expect(simulations).toMatch(
      /\.simulation-details\s*\{[^}]*max-block-size:\s*calc\(100dvh - 1\.5rem\);[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;/s,
    )
    expect(simulations).toMatch(
      /\.simulation-details__facts > div\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) max-content;/s,
    )
    expect(simulations).toMatch(
      /\.simulation-details__facts dd\s*\{[^}]*text-align:\s*end;[^}]*white-space:\s*nowrap;/s,
    )
  })
})

function readCss(relativeUrl: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativeUrl, import.meta.url)),
    'utf8',
  )
}

function expectContainedRoute(
  source: string,
  surfaceClass: string,
  scrollClass: string,
): void {
  expect(source).toMatch(
    new RegExp(
      `\\.${surfaceClass}\\s*\\{[^}]*block-size:\\s*100%;[^}]*min-block-size:\\s*0;[^}]*overflow:\\s*hidden;`,
      's',
    ),
  )
  expect(source).toMatch(
    new RegExp(
      `\\.${scrollClass}\\s*\\{[^}]*min-block-size:\\s*0;[^}]*overflow-y:\\s*auto;[^}]*scrollbar-width:\\s*none;[^}]*touch-action:\\s*pan-y;`,
      's',
    ),
  )
  expect(source).toMatch(
    new RegExp(
      `\\.${scrollClass}::\\-webkit-scrollbar\\s*\\{[^}]*display:\\s*none;[^}]*inline-size:\\s*0;[^}]*block-size:\\s*0;`,
      's',
    ),
  )
}
