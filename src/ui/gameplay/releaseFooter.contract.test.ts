import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('persistent release footer layout contract', () => {
  test('uses the lowest whole-percent mix that meets normal-text AA contrast', () => {
    const styles = source('src/ui/gameplay/shell/dysonGameplayShell.css')
    const tokens = source('src/ui/tokens/tokens.css')
    const textColor = requiredHexCapture(
      tokens,
      /--color-text-primary:\s*(#[0-9a-f]{6});/i,
    )
    const mixPercent = Number(requiredCapture(
      styles,
      /\.dyson-shell__release-footer\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--color-text-primary\) ([0-9.]+)%, transparent\);/s,
    ))
    const panelColors = [...styles.matchAll(
      /--theme-panel:\s*(#[0-9a-f]{6});/gi,
    )].map((match) => match[1])

    expect(panelColors.length).toBeGreaterThan(0)
    const minimumContrast = minimumMixedContrast(
      textColor,
      panelColors,
      mixPercent / 100,
    )
    const previousWholePercentContrast = minimumMixedContrast(
      textColor,
      panelColors,
      (mixPercent - 1) / 100,
    )

    expect(minimumContrast).toBeGreaterThanOrEqual(4.5)
    expect(previousWholePercentContrast).toBeLessThan(4.5)
  })

  test('keeps compact presentation inside existing bottom navigation chrome', () => {
    const shell = source('src/ui/gameplay/shell/DysonGameplayShell.tsx')
    const styles = source('src/ui/gameplay/shell/dysonGameplayShell.css')
    const bottomNavigation = shell.indexOf(
      'className="dyson-shell__bottom-navigation"',
    )
    const compactFooter = shell.indexOf(
      'dyson-shell__release-footer--compact',
    )

    expect(compactFooter).toBeGreaterThan(bottomNavigation)
    expect(styles).toMatch(
      /\.dyson-shell__release-footer--compact\s*\{[^}]*position:\s*absolute;/s,
    )
    expect(styles).toMatch(
      /\.dyson-shell__release-footer--compact\s*\{[^}]*var\(--safe-area-bottom\)/s,
    )
    expect(styles).toMatch(
      /grid-template-rows:\s*minmax\(0, 1fr\)\s*calc\(var\(--bottom-navigation-height\) \+ var\(--safe-area-bottom\)\);/s,
    )
    expect(styles).toMatch(
      /\.dyson-shell__release-footer\s*\{[^}]*text-align:\s*center;/s,
    )
  })

  test('moves wide presentation into the permanent side rail', () => {
    const shell = source('src/ui/gameplay/shell/DysonGameplayShell.tsx')
    const styles = source('src/ui/gameplay/shell/dysonGameplayShell.css')
    const sidePanel = shell.indexOf('className="dyson-shell__side-panel"')
    const sideFooter = shell.indexOf('dyson-shell__release-footer--side')

    expect(sideFooter).toBeGreaterThan(sidePanel)
    expect(styles).toMatch(
      /\.dyson-shell__release-footer--side\s*\{[^}]*display:\s*none;[^}]*grid-row:\s*4;/s,
    )
    expect(styles).toMatch(
      /@media \(min-width: 1080px\)[\s\S]*\.dyson-shell__release-footer--side\s*\{[^}]*display:\s*block;/,
    )
  })
})

type Rgb = readonly [number, number, number]

function requiredCapture(sourceText: string, pattern: RegExp): string {
  const match = sourceText.match(pattern)
  if (match?.[1] === undefined) throw new Error(`Missing ${pattern}.`)
  return match[1]
}

function requiredHexCapture(sourceText: string, pattern: RegExp): Rgb {
  return hexToRgb(requiredCapture(sourceText, pattern))
}

function minimumMixedContrast(
  foreground: Rgb,
  backgrounds: readonly string[],
  opacity: number,
): number {
  return Math.min(...backgrounds.map((backgroundHex) => {
    const background = hexToRgb(backgroundHex)
    const composite: Rgb = [
      mixChannel(foreground[0], background[0], opacity),
      mixChannel(foreground[1], background[1], opacity),
      mixChannel(foreground[2], background[2], opacity),
    ]
    return contrastRatio(composite, background)
  }))
}

function mixChannel(
  foreground: number,
  background: number,
  opacity: number,
): number {
  return foreground * opacity + background * (1 - opacity)
}

function hexToRgb(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function contrastRatio(left: Rgb, right: Rgb): number {
  const leftLuminance = relativeLuminance(left)
  const rightLuminance = relativeLuminance(right)
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  )
}

function relativeLuminance(color: Rgb): number {
  const [red, green, blue] = color.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}
