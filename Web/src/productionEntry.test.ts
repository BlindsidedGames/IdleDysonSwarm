import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { describe, expect, test } from 'vitest'

const appSource = readFileSync(
  new URL('./App.tsx', import.meta.url),
  'utf8',
)
const mainSource = readFileSync(
  new URL('./main.tsx', import.meta.url),
  'utf8',
)

describe('production host entry', () => {
  test('constructs and starts one runtime outside React lifecycle effects', () => {
    expect(
      mainSource.match(
        /createProductionHostComposition\(\)/g,
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

  test('does not mount the former developer decoder or bundled save fixtures', () => {
    expect(appSource).not.toMatch(
      /decodeIdb1Save|prepareIdb1Save|fetch\(|schema-\d+|fixture/i,
    )
    expect(mainSource).not.toMatch(
      /decodeIdb1Save|prepareIdb1Save|fetch\(|schema-\d+|fixture/i,
    )
    expect(appSource).not.toMatch(/saveSchemaVersion:\s*12/)
    expect(mainSource).not.toMatch(/saveSchemaVersion:\s*12/)
    const publicFixtures = new URL(
      '../public/fixtures',
      import.meta.url,
    )
    expect(
      existsSync(publicFixtures)
        ? readdirSync(publicFixtures)
        : [],
    ).toEqual([])
  })
})
