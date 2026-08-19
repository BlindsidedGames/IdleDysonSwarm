import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('Ready Dyson destination loading boundary', () => {
  test('keeps destination-only surfaces behind React lazy imports', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/ui/gameplay/dyson/ReadyDysonSlice.tsx'),
      'utf8',
    )

    for (const component of [
      'SettingsSurface',
      'DebugSurface',
      'SimulationTimeControl',
      'QuantumControlPanel',
      'AvotationCompletionOverlay',
      'StoreRouteSurface',
      'StorySurface',
      'WikiSurface',
      'OfflineTimeSurface',
      'StatisticsSurface',
    ]) {
      expect(source).toMatch(
        new RegExp(`const ${component} = lazy\\(async \\(\\) =>`),
      )
    }

    expect(source).not.toContain("from '../../../store/storefront'")
    expect(source).not.toMatch(
      /import\s*\{[^}]*SettingsSurface[^}]*\}\s*from\s*['"]\.\.\/settings['"]/s,
    )
    expect(source).not.toMatch(
      /import\s*\{[^}]*SimulationTimeControl[^}]*\}\s*from\s*['"]\.\.\/simulations\/SimulationsSurface['"]/s,
    )
    expect(source).not.toContain('fallback={null}')
    expect(source.match(/fallback=\{<LazySurfacePending/g)?.length)
      .toBeGreaterThanOrEqual(6)
  })
})
