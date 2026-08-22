import { readFileSync, readdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const GAMEPLAY_ROOT = resolve(import.meta.dirname, '..', 'gameplay')

const SCALABLE_NUMBER_SURFACES = [
  'debug/DebugSurface.tsx',
  'dyson/DysonControls.tsx',
  'dyson/DysonLowerFacts.tsx',
  'dyson/ReadyDysonSlice.tsx',
  'facilities/BasicFacilityRegion.tsx',
  'facilities/MegaStructureRegion.tsx',
  'infinity/InfinitySurface.tsx',
  'quantum/AvocatoSurface.tsx',
  'quantum/QuantumSurface.tsx',
  'reality/RealitySurface.tsx',
  'research/ResearchSurface.tsx',
  'settings/SettingsSurface.tsx',
  'simulations/SimulationUpgradeRegion.tsx',
  'simulations/SimulationsSurface.tsx',
  'skills/SkillsSurface.tsx',
  'statistics/StatisticsSurface.tsx',
  'tinker/TinkerSurface.tsx',
] as const

describe('selected game-number surface audit', () => {
  test.each(SCALABLE_NUMBER_SURFACES)(
    '%s routes scalable values through the shared formatter',
    (relativePath) => {
      expect(readFileSync(resolve(GAMEPLAY_ROOT, relativePath), 'utf8'))
        .toMatch(/formatGame(?:Number|Energy)/)
    },
  )

  test('keeps direct ad-hoc decimal and exponent formatting out of gameplay UI', () => {
    const violations = readdirSync(GAMEPLAY_ROOT, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) =>
        entry.isFile() &&
        extname(entry.name) === '.tsx' &&
        !entry.name.endsWith('.test.tsx'))
      .flatMap((entry) => {
        const file = resolve(entry.parentPath, entry.name)
        const source = readFileSync(file, 'utf8')
        return [...source.matchAll(/\.(?:toFixed|toLocaleString|toExponential)\s*\(/g)]
          .map((match) => `${file}:${source.slice(0, match.index).split('\n').length}`)
      })
    expect(violations).toEqual([])
  })
})
