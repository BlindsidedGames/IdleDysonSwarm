import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { formatInfinityPointAmount } from '../components/infinityPointFormatting'
import { formatGameNumber } from '../i18n/formatters'
import { ENABLED_LOCALES } from '../i18n/localeRegistry'
import {
  formatAutoInfinityTargetInput,
  MAXIMUM_INFINITY_TARGET,
  parseInfinityTargetInput,
  resolveInfinityTargetDraft,
} from './infinity/parseInfinityTarget'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('progression currency presentation contract', () => {
  test('formats Infinity Point values as whole numbers', () => {
    expect(formatInfinityPointAmount('en', 0)).toBe('0')
    expect(formatInfinityPointAmount('en', 5)).toBe('5')
    expect(formatInfinityPointAmount('en', 3.6)).toBe('4')
    expect(formatInfinityPointAmount('en', 42n)).toBe('42')
    expect(formatInfinityPointAmount('en', 999n)).toBe('999')
    expect(formatInfinityPointAmount('en', 1_000n)).toBe('1.00K')
    expect(formatInfinityPointAmount('en', 1_234.5)).toBe('1.23K')
  })

  test('keeps decimal formatting optional below one hundred', () => {
    expect(formatGameNumber('en', 5)).toBe('5.00')
    expect(formatGameNumber('en', 42)).toBe('42.0')
    expect(formatGameNumber('en', 5, {
      wholeBelowHundred: true,
    })).toBe('5')
    expect(formatGameNumber('en', 42.4, {
      wholeBelowHundred: true,
    })).toBe('42')
    expect(formatGameNumber('en', 100, {
      wholeBelowHundred: true,
    })).toBe('100')
    expect(formatGameNumber('en', 1_234, {
      wholeBelowHundred: true,
    })).toBe('1.23K')
  })

  test('keeps an untouched compact Auto Infinity target exact', () => {
    const target = 1_234_567n
    const display = formatAutoInfinityTargetInput('en', target)

    expect(display).toBe('1.23M')
    expect(resolveInfinityTargetDraft(display, target, false)).toEqual({
      ok: true,
      value: target,
    })
    expect(resolveInfinityTargetDraft(display, target, true)).toEqual({
      ok: true,
      value: 1_230_000n,
    })
  })

  test('clamps an edited Auto Infinity target only at the true maximum', () => {
    expect(parseInfinityTargetInput('2147483647')).toEqual({
      ok: true,
      value: MAXIMUM_INFINITY_TARGET,
    })
    expect(parseInfinityTargetInput('2.15B')).toEqual({
      ok: true,
      value: MAXIMUM_INFINITY_TARGET,
    })
    expect(parseInfinityTargetInput('2.14B')).toEqual({
      ok: true,
      value: 2_140_000_000n,
    })
  })

  test.each([
    ['fr', '1,23M'],
    ['de', '1,23M'],
    ['pt-BR', '1,23M'],
    ['ru', '1,23M'],
  ] as const)('parses a compact %s Auto Infinity target', (locale, input) => {
    expect(parseInfinityTargetInput(input, locale)).toEqual({
      ok: true,
      value: 1_230_000n,
    })
  })

  test.each(ENABLED_LOCALES)(
    'parses its own compact Auto Infinity display in %s after editing',
    (locale) => {
      const display = formatAutoInfinityTargetInput(locale, 1_234_567n)
      expect(parseInfinityTargetInput(display, locale)).toEqual({
        ok: true,
        value: 1_230_000n,
      })
    },
  )

  test('uses currency icons instead of visible resource names', () => {
    const quantum = source('src/ui/gameplay/quantum/QuantumSurface.tsx')
    const infinity = source('src/ui/gameplay/infinity/InfinitySurface.tsx')

    expect(quantum).toContain('className="ui-visually-hidden"')
    expect(quantum).toContain('<QuantumShardAmount')
    expect(quantum).toContain('<InfinityPointSymbol />')
    expect(infinity).toContain('<InfinityPointAmount')
    expect(infinity).toContain('<InfinityCurrencySentence')
    expect(infinity).toContain('<BotsThresholdSentence')
  })

  test('puts the tinted Science icon before the Research production value', () => {
    const research = source('src/ui/gameplay/research/ResearchSurface.tsx')

    expect(research).toMatch(/science:\s*\(\s*<InlineResourceAmount/s)
    expect(research).toContain('leadingSymbol={<ScienceSymbol tint />}')
    expect(research).toContain('scienceIcon: null')
    expect(research).toMatch(
      /import[\s\S]*ScienceSymbol,[\s\S]*from '\.\.\/\.\.\/components'/,
    )
  })

  test('reuses the resource header baseline system for inline currencies', () => {
    const amount = source('src/ui/components/InlineResourceAmount.tsx')
    const infinity = source('src/ui/gameplay/infinity/InfinitySurface.tsx')

    expect(amount).toContain("'ui-resource-value__content'")
    expect(infinity).toContain('className="infinity-bots-amount"')
    expect(infinity).toContain('className="infinity-manual-reset__reward"')
  })

  test('keeps Simulation formulas on the significant-digit formatter', () => {
    const simulations = source(
      'src/ui/gameplay/simulations/SimulationsSurface.tsx',
    )

    expect(simulations).toContain(
      'const display = (value: number | bigint) => formatGameNumber(locale, value)',
    )
    expect(simulations).toContain('const displayCurrency =')
    expect(simulations).toContain('wholeBelowHundred: true')
    expect(simulations).toContain('timerDetailRows(timer, intl, display)')
    expect(simulations).toMatch(
      /highlightedNumber\(\s*locale,\s*influence,\s*\{ wholeBelowHundred: true \},\s*\)/,
    )
  })

  test('uses whole-below-hundred formatting for both Reality purchase regions', () => {
    const reality = source(
      'src/ui/gameplay/reality/RealitySurface.tsx',
    )
    const simulationUpgrades = source(
      'src/ui/gameplay/simulations/SimulationUpgradeRegion.tsx',
    )

    expect(reality).toContain('wholeBelowHundred: true')
    expect(simulationUpgrades).toContain('wholeBelowHundred: true')
  })

  test('formats both visible representations of the Reality consuming bar as discrete Influence', () => {
    const reality = source(
      'src/ui/gameplay/reality/RealitySurface.tsx',
    )
    const workersReadyFormatting = reality.match(
      /formatGameNumber\(locale, resources\.workersReady, \{\s*wholeBelowHundred: true,\s*\}\)/g,
    )

    expect(workersReadyFormatting).toHaveLength(3)
  })

  test('formats the Infinity navigation reward as a whole number', () => {
    const readySlice = source(
      'src/ui/gameplay/dyson/ReadyDysonSlice.tsx',
    )
    expect(readySlice).toMatch(
      /messages\.infinityRouteGain,[\s\S]*value:\s*displayWhole\(/,
    )
  })
})
