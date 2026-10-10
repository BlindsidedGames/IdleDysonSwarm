import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('persistent release footer layout contract', () => {
  test('keeps the intentional low-prominence support metadata treatment', () => {
    const styles = source('src/ui/gameplay/shell/dysonGameplayShell.css')
    const mixPercent = Number(requiredCapture(
      styles,
      /\.dyson-shell__release-footer\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--color-text-primary\) ([0-9.]+)%, transparent\);/s,
    ))

    expect(mixPercent).toBe(30)
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

function requiredCapture(sourceText: string, pattern: RegExp): string {
  const match = sourceText.match(pattern)
  if (match?.[1] === undefined) throw new Error(`Missing ${pattern}.`)
  return match[1]
}
