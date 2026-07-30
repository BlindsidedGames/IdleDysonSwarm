import { gzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import {
  budgetFailures,
  budgetWarnings,
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
    assets: [
      'assets/source-regular.ttf',
      'assets/navigation.png',
    ],
  },
  _shared: { file: 'assets/shared-456.js', css: ['assets/shared-456.css'] },
  'src/ui/i18n/catalogs/compiled/en.json': {
    file: 'assets/en-789.js',
    imports: ['_shared'],
  },
  'src/ui/gameplay/facilities/index.ts': {
    file: 'assets/facilities-321.js',
    imports: ['src/main.tsx'],
  },
} as const

describe('initial request bundle report', () => {
  test('follows static imports and adds only locale assets not already requested', () => {
    expect(collectInitialRequestGraph(manifest, { entryKey: 'src/main.tsx' })).toEqual({
      entryKey: 'src/main.tsx',
      localeKey: 'src/ui/i18n/catalogs/compiled/en.json',
      freshBotsKey: 'src/ui/gameplay/facilities/index.ts',
      bootAssetFiles: [
        'assets/main-123.css',
        'assets/main-123.js',
        'assets/shared-456.css',
        'assets/shared-456.js',
      ],
      localeAssetFiles: ['assets/en-789.js'],
      freshBotsAssetFiles: ['assets/facilities-321.js'],
      sourceFontAssetFiles: ['assets/source-regular.ttf'],
      measuredAssetFiles: [
        'assets/en-789.js',
        'assets/facilities-321.js',
        'assets/main-123.css',
        'assets/main-123.js',
        'assets/shared-456.css',
        'assets/shared-456.js',
        'assets/source-regular.ttf',
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

  test('warns for provisional JavaScript while enforcing the other resource limits', () => {
    const budgets = createInitialRequestBudgets(
      [{ file: 'assets/main.js', bytes: 201 * 1024, gzipBytes: 200 * 1024 }],
      [{ file: 'assets/en.js', bytes: 1024, gzipBytes: 1024 }],
      [{ file: 'assets/source.ttf', bytes: 250 * 1024, gzipBytes: 1 }],
    )
    expect(budgets.map(({ actualBytes }) => actualBytes)).toEqual([
      201 * 1024,
      0,
      1024,
      250 * 1024,
    ])
    expect(budgetFailures(budgets)).toEqual([])
    expect(budgetWarnings(budgets).map(({ name }) => name)).toEqual([
      'Boot-graph JavaScript',
    ])
  })

  test('enforces aggregate raw source-font transfer independently of gzip', () => {
    const budgets = createInitialRequestBudgets(
      [],
      [],
      [
        {
          file: 'assets/source-regular.ttf',
          bytes: 130 * 1024,
          gzipBytes: 10,
        },
        {
          file: 'assets/source-bold.ttf',
          bytes: 121 * 1024,
          gzipBytes: 10,
        },
      ],
    )
    expect(budgetFailures(budgets).map(({ name }) => name)).toEqual([
      'Initial source-locale fonts',
    ])
  })

  test('fails clearly when a required manifest root is absent', () => {
    expect(() => collectInitialRequestGraph({}, { entryKey: 'index.html' })).toThrow(
      'Vite manifest does not contain required entry: index.html',
    )
  })

  test('identifies every budget failure without treating equality as an overage', () => {
    expect(budgetFailures([
      {
        name: 'within',
        limitBytes: 10,
        actualBytes: 10,
        transfer: 'gzip',
        enforcement: 'enforced',
      },
      {
        name: 'over',
        limitBytes: 10,
        actualBytes: 11,
        transfer: 'gzip',
        enforcement: 'enforced',
      },
      {
        name: 'provisional',
        limitBytes: 10,
        actualBytes: 11,
        transfer: 'gzip',
        enforcement: 'provisional-warning',
      },
    ])).toEqual([{
      name: 'over',
      limitBytes: 10,
      actualBytes: 11,
      transfer: 'gzip',
      enforcement: 'enforced',
    }])
  })
})
