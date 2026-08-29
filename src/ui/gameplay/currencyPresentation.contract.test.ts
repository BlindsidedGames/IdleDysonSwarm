import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { formatInfinityPointAmount } from '../components/infinityPointFormatting'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('progression currency presentation contract', () => {
  test('formats Infinity Point values as whole numbers', () => {
    expect(formatInfinityPointAmount('en', 0)).toBe('0')
    expect(formatInfinityPointAmount('en', 5)).toBe('5')
    expect(formatInfinityPointAmount('en', 3.6)).toBe('4')
    expect(formatInfinityPointAmount('en', 42n)).toBe('42')
  })

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

  test('formats the Infinity navigation reward as a whole number', () => {
    const readySlice = source(
      'src/ui/gameplay/dyson/ReadyDysonSlice.tsx',
    )
    expect(readySlice).toMatch(
      /messages\.infinityRouteGain,[\s\S]*value:\s*displayWhole\(/,
    )
  })
})
