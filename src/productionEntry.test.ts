import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const mainSource = readFileSync(
  new URL('./main.tsx', import.meta.url),
  'utf8',
)

describe('production host entry', () => {
  test('constructs and starts one runtime outside React lifecycle effects', () => {
    expect(
      mainSource.match(
        /createProductionHostComposition\(\{/g,
      ),
    ).toHaveLength(1)
    expect(
      mainSource.match(/composition\.runtime\.start\(\)/g),
    ).toHaveLength(1)
    expect(mainSource).not.toMatch(/useEffect|useLayoutEffect/)
    expect(mainSource).toContain('copy={boundaryCopy}')
    expect(mainSource).toContain(
      'reloadSafely={composition.reloadSafely}',
    )
    expect(mainSource).toContain('actions={boundaryActions}')
    expect(mainSource).toMatch(
      /recoveryExportAvailable:\s*composition\.runtime\.recoveryExportAvailable/,
    )
    expect(mainSource).toMatch(
      /exportRecovery:\s*composition\.runtime\.exportLastRecovery/,
    )
    expect(mainSource).not.toMatch(
      /runtime\.shutdown\(\)|window\.location\.reload\(\)/,
    )
  })
})
