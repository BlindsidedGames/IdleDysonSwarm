import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('facility responsive layout contract', () => {
  test('keeps the auto-fit grid separate from inline-size containment', () => {
    const styles = source(
      'src/ui/gameplay/facilities/facilities.css',
    )
    const flowRule = requiredCapture(
      styles,
      /\.dyson-facility-flow\s*\{([^}]*)\}/s,
    )

    expect(flowRule).toContain('repeat(auto-fit,')
    expect(flowRule).not.toContain('container-type:')
  })
})

function requiredCapture(sourceText: string, pattern: RegExp): string {
  const match = sourceText.match(pattern)
  if (match?.[1] === undefined) throw new Error(`Missing ${pattern}.`)
  return match[1]
}
