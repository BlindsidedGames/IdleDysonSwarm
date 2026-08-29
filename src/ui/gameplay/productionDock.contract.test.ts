import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Bots and Research production dock contract', () => {
  test('shares top alignment and respects both landscape safe areas', () => {
    const panelStyles = source(
      'src/ui/components/progressControlsPanel.css',
    )

    expect(panelStyles).toMatch(
      /\.ui-progress-controls-panel--production-summary\s+\.ui-progress-controls-panel__collapsed\s*\{[^}]*padding-inline-end:\s*var\(--safe-area-right\);/,
    )
    expect(panelStyles).toMatch(
      /\.ui-progress-controls-panel--production-summary\s+\.ui-progress-controls-panel__summary\s*\{[^}]*align-content:\s*start;[^}]*padding-block:\s*0\.42rem;[^}]*padding-inline:\s*max\(var\(--game-card-content-inset\), var\(--safe-area-left\)\)\s*0\.35rem;/s,
    )
  })

  test('opts both routes into the shared dock and single-production styling', () => {
    const botsSource = source('src/ui/gameplay/dyson/DysonControls.tsx')
    const readySliceSource = source(
      'src/ui/gameplay/dyson/ReadyDysonSlice.tsx',
    )
    const researchSource = source(
      'src/ui/gameplay/research/ResearchSurface.tsx',
    )

    expect(botsSource).toContain(
      'dyson-info ui-progress-controls-panel--production-summary',
    )
    expect(readySliceSource).toContain(
      'dyson-info__summary dyson-info__summary--single-production',
    )
    expect(researchSource).toContain(
      'research-surface__control-panel ui-progress-controls-panel--production-summary',
    )
    expect(researchSource).toContain(
      'research-surface__summary-line--single-production',
    )
  })

  test('uses the same maximized type rhythm on both single-line summaries', () => {
    const componentStyles = source('src/ui/components/components.css')
    const botsStyles = source('src/ui/gameplay/dyson/dysonControls.css')
    const researchStyles = source(
      'src/ui/gameplay/research/research.css',
    )

    expect(componentStyles).toMatch(
      /\.ui-stable-single-line-text__visible\s*\{[^}]*vertical-align:\s*top;/s,
    )
    expect(botsStyles).toMatch(
      /\.dyson-info__summary--single-production \.dyson-lower-facts p\s*\{[^}]*padding:\s*0;[^}]*font-size:\s*var\(--ui-text-page-title\);[^}]*line-height:\s*1\.15;/s,
    )
    expect(researchStyles).toMatch(
      /\.research-surface__summary-line--single-production\s+\.research-surface__production-line\s*\{[^}]*font-size:\s*var\(--ui-text-page-title\);[^}]*line-height:\s*1\.15;/s,
    )
  })

  test('keeps the Bots distribution gutter aligned inside the full-bleed dock', () => {
    const shellStyles = source(
      'src/ui/gameplay/shell/dysonGameplayShell.css',
    )

    expect(shellStyles).toMatch(
      /\.dyson-shell\[data-route-theme="bots"\]\s+\.dyson-shell__lower-regions\s*\{[^}]*gap:\s*0;[^}]*padding-block-start:\s*0;[^}]*padding-inline:\s*0;/s,
    )
    expect(shellStyles).toMatch(
      /\.dyson-shell\[data-route-theme="bots"\]\s+\.dyson-shell__distribution\s*\{[^}]*padding-inline:\s*max\(var\(--game-card-content-inset\), var\(--safe-area-left\)\)\s*max\(var\(--game-card-content-inset\), var\(--safe-area-right\)\);/s,
    )
  })
})
