import { gzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import {
  budgetFailures,
  collectInitialRequestGraph,
  createInitialRequestBudgets,
  measureGzipAssets,
} from './initialRequestBundleReport.ts'

const manifest = {
  'src/main.tsx': {
    file: 'assets/main-123.js',
    isEntry: true,
    imports: ['_shared'],
    css: ['assets/main-123.css'],
  },
  _shared: { file: 'assets/shared-456.js', css: ['assets/shared-456.css'] },
  'src/ui/i18n/catalogs/compiled/en.json': {
    file: 'assets/en-789.js',
    imports: ['_shared'],
  },
} as const

describe('initial request bundle report', () => {
  test('follows static imports and adds only locale assets not already requested', () => {
    expect(collectInitialRequestGraph(manifest, { entryKey: 'src/main.tsx' })).toEqual({
      entryKey: 'src/main.tsx',
      localeKey: 'src/ui/i18n/catalogs/compiled/en.json',
      initialAssetFiles: [
        'assets/main-123.css',
        'assets/main-123.js',
        'assets/shared-456.css',
        'assets/shared-456.js',
      ],
      localeAssetFiles: ['assets/en-789.js'],
      requestedAssetFiles: [
        'assets/en-789.js',
        'assets/main-123.css',
        'assets/main-123.js',
        'assets/shared-456.css',
        'assets/shared-456.js',
      ],
    })
  })

  test('accounts for the gzip bytes of each actual requested file', () => {
    const contents = new TextEncoder().encode('canonical bytes '.repeat(30))
    expect(measureGzipAssets(['assets/main.js'], () => contents)).toEqual([
      {
        file: 'assets/main.js',
        bytes: contents.byteLength,
        gzipBytes: gzipSync(contents).byteLength,
      },
    ])
  })

  test('counts the awaited locale JavaScript in both initial and locale budgets', () => {
    const budgets = createInitialRequestBudgets(
      [{ file: 'assets/main.js', bytes: 201 * 1024, gzipBytes: 200 * 1024 }],
      [{ file: 'assets/en.js', bytes: 1024, gzipBytes: 1024 }],
    )
    expect(budgets.map(({ actualBytes }) => actualBytes)).toEqual([
      201 * 1024,
      0,
      1024,
    ])
    expect(budgetFailures(budgets).map(({ name }) => name)).toEqual([
      'Initial first-slice JavaScript',
    ])
  })

  test('fails clearly when a required manifest root is absent', () => {
    expect(() => collectInitialRequestGraph({}, { entryKey: 'index.html' })).toThrow(
      'Vite manifest does not contain required entry: index.html',
    )
  })

  test('identifies every budget failure without treating equality as an overage', () => {
    expect(budgetFailures([
      { name: 'within', limitBytes: 10, actualBytes: 10 },
      { name: 'over', limitBytes: 10, actualBytes: 11 },
    ])).toEqual([{ name: 'over', limitBytes: 10, actualBytes: 11 }])
  })
})
