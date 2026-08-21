import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  breakpoints,
  scriptFontFamilies,
  semanticColors,
  targetSizes,
} from './tokens'

const tokensCss = readFileSync(
  new URL('./tokens.css', import.meta.url),
  'utf8',
)
const componentsCss = readFileSync(
  new URL('../components/components.css', import.meta.url),
  'utf8',
)

describe('presentation tokens', () => {
  it('keeps required normal-text pairs above WCAG AA contrast', () => {
    expect(
      contrast(
        semanticColors.textPrimary,
        semanticColors.appBackground,
      ),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(
        semanticColors.textSecondary,
        semanticColors.surface,
      ),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(
        semanticColors.accentValue,
        semanticColors.surface,
      ),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('defines approved responsive bands and minimum targets', () => {
    expect(breakpoints).toEqual({
      compactMaximum: 599,
      mediumMinimum: 600,
      mediumMaximum: 1023,
      wideMinimum: 1024,
    })
    expect(targetSizes.minimum).toBe(44)
    expect(targetSizes.preferredTouch).toBe(48)
    expect(tokensCss).toContain('--game-card-grid-gap: 0.35rem')
    expect(tokensCss).toContain('--game-card-content-inset: 0.45rem')
  })

  it('routes future script fonts by token while bundling only the Latin UI faces', () => {
    expect(scriptFontFamilies.japanese).toContain('Noto Sans JP')
    expect(scriptFontFamilies.simplifiedChinese).toContain('Noto Sans SC')
    expect(scriptFontFamilies.traditionalChinese).toContain('Noto Sans TC')
    expect(tokensCss).toContain(':root:lang(ja)')
    expect(tokensCss).toContain(':root:lang(zh-Hans)')
    expect(tokensCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(tokensCss).toContain('@media (forced-colors: active)')
    expect(tokensCss.match(/@font-face/g)).toHaveLength(3)
    expect(tokensCss).toContain('url("../assets/Lexend-Regular.ttf")')
    expect(tokensCss).toContain('url("../assets/Lexend-SemiBold.ttf")')
    expect(tokensCss).toContain('url("../assets/Lexend-Bold.ttf")')
    expect(tokensCss).not.toMatch(/url\([^)]*Noto[^)]*\)/i)
  })

  it('uses logical component layout properties', () => {
    expect(componentsCss).not.toMatch(
      /\b(?:margin|padding|border)-(?:left|right)\b/,
    )
    expect(componentsCss).toContain('border-inline-start')
    expect(componentsCss).toContain('min-block-size')
    expect(componentsCss).toContain('min-inline-size')
  })
})

function contrast(left: string, right: string): number {
  const first = luminance(left)
  const second = luminance(right)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected six-digit hex color, received ${hex}.`)
  }
  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  )
}
