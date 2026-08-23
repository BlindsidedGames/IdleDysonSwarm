import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/ui/gameplay/${path}`), 'utf8')

describe('gameplay structural palette contract', () => {
  it('maps every route family to the approved five structural roles', () => {
    const shell = css('shell/dysonGameplayShell.css')

    expect(shell).toMatch(
      /\.dyson-shell\s*\{[^}]*--theme-page:\s*#1d151f;[^}]*--theme-panel:\s*#443148;[^}]*--theme-selected:\s*#513b56;[^}]*--theme-divider:\s*#694b70;[^}]*--theme-accent:\s*#e59aeb;/,
    )
    expect(shell).toMatch(
      /data-route-theme="research"[^}]*--theme-page:\s*#181f1e;[^}]*--theme-panel:\s*#334c4a;[^}]*--theme-selected:\s*#41615e;[^}]*--theme-divider:\s*#5f8a87;[^}]*--theme-accent:\s*#8bc7c4;/,
    )
    expect(shell).toMatch(
      /data-route-theme="simulations"[^}]*--theme-page:\s*#152337;[^}]*--theme-panel:\s*#29435f;[^}]*--theme-selected:\s*#3a6384;[^}]*--theme-divider:\s*#7b9fbe;[^}]*--theme-accent:\s*#b9ddf7;/,
    )
    expect(shell).toMatch(
      /data-route-theme="skills"[\s\S]*data-route-theme="offline-time"[^}]*--theme-page:\s*#1c1427;[^}]*--theme-panel:\s*#30244f;[^}]*--theme-selected:\s*#483563;[^}]*--theme-divider:\s*#5b4674;[^}]*--theme-accent:\s*#d3c2ff;/,
    )
    expect(shell).toMatch(
      /data-route-theme="settings"[\s\S]*data-route-theme="statistics"[^}]*--theme-page:\s*#121a12;[^}]*--theme-panel:\s*#243324;[^}]*--theme-selected:\s*#3f7042;[^}]*--theme-divider:\s*#364d36;[^}]*--theme-accent:\s*#b9dfb7;/,
    )
  })

  it('makes every route surface consume shared structural roles', () => {
    const expectations = {
      'facilities/facilities.css': [
        'border: 2px solid var(--theme-divider)',
        'background: var(--theme-panel)',
        'background: var(--theme-accent)',
      ],
      'research/research.css': [
        'background: var(--theme-page)',
        'background: var(--theme-panel)',
        'background: var(--theme-selected)',
        'background: var(--theme-accent)',
      ],
      'skills/skills.css': [
        '--skills-panel: var(--theme-panel)',
        '--skills-panel-light: var(--theme-selected)',
        'border-block-start: 1px solid var(--theme-divider)',
      ],
      'infinity/infinity.css': [
        '--infinity-panel: var(--theme-panel)',
        '--infinity-panel-raised: var(--theme-selected)',
        '--infinity-accent: var(--theme-accent)',
        'background: var(--theme-page)',
      ],
      'reality/reality.css': [
        '--reality-panel: var(--theme-panel)',
        '--reality-panel-raised: var(--theme-selected)',
        '--reality-accent: var(--theme-accent)',
        'border-block-end: 2px solid var(--theme-divider)',
      ],
      'simulations/simulations.css': [
        '--simulation-era-background: var(--theme-page)',
        '--simulation-era-summary: var(--theme-panel)',
        '--simulation-era-divider: var(--theme-divider)',
      ],
      'quantum/quantum.css': [
        '--quantum-panel: var(--theme-panel)',
        '--quantum-raised: var(--theme-selected)',
        '--quantum-accent: var(--theme-accent)',
        'background: var(--theme-page)',
      ],
      'store/store.css': [
        'background: var(--theme-page)',
        'background: var(--theme-panel)',
        'background: var(--theme-accent)',
      ],
      'story/story.css': [
        '--story-background: var(--theme-page)',
        '--story-panel: var(--theme-panel)',
        '--story-panel-raised: var(--theme-selected)',
        '--story-accent: var(--theme-accent)',
      ],
      'wiki/wiki.css': [
        '--wiki-background: var(--theme-page)',
        '--wiki-panel: var(--theme-panel)',
        '--wiki-panel-raised: var(--theme-selected)',
        '--wiki-accent: var(--theme-accent)',
      ],
      'offline-time/offlineTime.css': [
        '--offline-panel: var(--theme-panel)',
        '--offline-panel-raised: var(--theme-selected)',
        '--offline-accent: var(--theme-accent)',
        'background: var(--theme-page)',
      ],
      'statistics/statistics.css': [
        '--statistics-panel: var(--theme-panel)',
        '--statistics-panel-raised: var(--theme-selected)',
        '--statistics-accent: var(--theme-accent)',
      ],
      'debug/debugSurface.css': [
        'background: var(--theme-page)',
        'background: var(--theme-panel)',
        'background: var(--theme-selected)',
      ],
      'settings/settingsSurface.css': [
        'border: 2px solid var(--theme-divider)',
        'background: var(--theme-panel)',
        'background: var(--theme-selected)',
      ],
    } as const

    for (const [path, requiredValues] of Object.entries(expectations)) {
      const source = css(path)
      for (const value of requiredValues) {
        expect(source, `${path} should contain ${value}`).toContain(value)
      }
    }
  })

  it('keeps route chrome and purchased states on the selected palette', () => {
    const shell = css('shell/dysonGameplayShell.css')
    const readySlice = css('dyson/ReadyDysonSlice.tsx')
    const quantum = css('quantum/quantum.css')
    const reality = css('reality/reality.css')

    expect(readySlice).toContain(
      "routeTheme={debugActive ? 'statistics' : storeActive ? 'bots' : route}",
    )
    expect(shell).toMatch(
      /\.dyson-navigation__item\[data-navigation-id="store"\]\s*\{[^}]*--navigation-item-accent:\s*#e59aeb;/,
    )
    expect(shell).toMatch(
      /\.dyson-shell\[data-route-theme\]\s*\.dyson-resource-header,[\s\S]*\.dyson-shell\[data-route-theme\]\s*\.dyson-shell__lower-regions\s*\{[^}]*background:\s*var\(--theme-panel\);/,
    )
    expect(shell).toMatch(
      /\.dyson-resource-header__item::before\s*\{[^}]*content:\s*none;/,
    )
    expect(shell).toMatch(
      /\.dyson-shell\[data-route-theme="bots"\]\s+\.dyson-resource-header,\s*\.dyson-shell\[data-route-theme="research"\]\s+\.dyson-resource-header\s*\{[^}]*border-block-end:\s*2px solid var\(--theme-divider\);/,
    )
    expect(quantum).toMatch(
      /\.quantum-upgrade-card--complete\s*\{\s*background:\s*var\(--quantum-panel\);\s*\}/,
    )
    expect(quantum).toContain(
      'background: var(--quantum-action-disabled)',
    )
    expect(reality).toMatch(
      /\.reality-avocato-entry\s+\.ui-button\s*\{[^}]*background:\s*var\(--theme-accent\);[^}]*color:\s*var\(--theme-page\);/,
    )
  })
})
