import { gzipSync } from 'node:zlib'

export interface ViteManifestEntry {
  readonly file: string
  readonly src?: string
  readonly isEntry?: boolean
  readonly imports?: readonly string[]
  readonly css?: readonly string[]
  readonly assets?: readonly string[]
}

export type ViteManifest = Readonly<Record<string, ViteManifestEntry>>

export interface InitialRequestGraph {
  readonly entryKey: string
  readonly localeKey: string
  readonly freshBotsKey: string
  readonly bootAssetFiles: readonly string[]
  readonly localeAssetFiles: readonly string[]
  readonly freshBotsAssetFiles: readonly string[]
  readonly sourceFontAssetFiles: readonly string[]
  readonly measuredAssetFiles: readonly string[]
}

export interface GzipAsset {
  readonly file: string
  readonly bytes: number
  readonly gzipBytes: number
}

export interface BundleBudget {
  readonly name: string
  readonly limitBytes: number
  readonly actualBytes: number
  readonly transfer: 'gzip' | 'raw'
  readonly enforcement: 'enforced' | 'provisional-warning'
}

export const INITIAL_REQUEST_BUDGETS = Object.freeze({
  // The measured pre-separation baseline was 300.03 KiB gzip. Keep a small
  // deterministic-build allowance while preventing a return to that size.
  initialJavaScriptCeiling: 301 * 1024,
  initialJavaScriptMilestone: 250 * 1024,
  initialCss: 40 * 1024,
  sharedLocale: 30 * 1024,
  sourceLocaleFonts: 250 * 1024,
})

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function requireManifestEntry(
  manifest: ViteManifest,
  key: string,
): ViteManifestEntry {
  const entry = manifest[key]
  if (entry === undefined) {
    throw new Error(`Vite manifest does not contain required entry: ${key}`)
  }
  return entry
}

/** Traverses only statically imported manifest entries and their CSS assets. */
export function collectStaticAssetFiles(
  manifest: ViteManifest,
  entryKey: string,
): readonly string[] {
  const visited = new Set<string>()
  const assets = new Set<string>()
  const visit = (key: string): void => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = requireManifestEntry(manifest, key)
    assets.add(entry.file)
    entry.css?.forEach((file) => assets.add(file))
    entry.imports?.forEach(visit)
  }
  visit(entryKey)
  return sortedUnique(assets)
}

/**
 * Separates the boot graph from resources loaded to complete the approved
 * fresh Bots surface. Vite records static imports but not conditional dynamic
 * imports, so the startup locale and fresh-save facility presentation are
 * deliberately supplied as additional roots.
 */
export function collectInitialRequestGraph(
  manifest: ViteManifest,
  options: {
    readonly entryKey?: string
    readonly localeKey?: string
    readonly freshBotsKey?: string
  } = {},
): InitialRequestGraph {
  // Vite's browser manifest roots the application at index.html; it owns the
  // module script that loads src/main.tsx.
  const entryKey = options.entryKey ?? 'index.html'
  const localeKey = options.localeKey ?? 'src/ui/i18n/catalogs/compiled/en.json'
  const freshBotsKey =
    options.freshBotsKey ?? 'src/ui/gameplay/facilities/index.ts'
  const bootAssetFiles = collectStaticAssetFiles(manifest, entryKey)
  const localeTree = collectStaticAssetFiles(manifest, localeKey)
  const bootFiles = new Set(bootAssetFiles)
  const localeAssetFiles = sortedUnique(
    localeTree.filter((file) => !bootFiles.has(file)),
  )
  const bootAndLocaleFiles = new Set([
    ...bootAssetFiles,
    ...localeAssetFiles,
  ])
  const freshBotsAssetFiles = sortedUnique(
    collectStaticAssetFiles(manifest, freshBotsKey).filter(
      (file) => !bootAndLocaleFiles.has(file),
    ),
  )
  const sourceFontAssetFiles = sortedUnique(
    (requireManifestEntry(manifest, entryKey).assets ?? []).filter(
      (file) => /\.(?:otf|ttf|woff2?)$/i.test(file),
    ),
  )
  return Object.freeze({
    entryKey,
    localeKey,
    freshBotsKey,
    bootAssetFiles,
    localeAssetFiles,
    freshBotsAssetFiles,
    sourceFontAssetFiles,
    measuredAssetFiles: sortedUnique([
      ...bootAssetFiles,
      ...localeAssetFiles,
      ...freshBotsAssetFiles,
      ...sourceFontAssetFiles,
    ]),
  })
}

export function classifyGzipAssets(
  assets: readonly GzipAsset[],
): Readonly<Record<'js' | 'css', readonly GzipAsset[]>> {
  const js: GzipAsset[] = []
  const css: GzipAsset[] = []
  for (const asset of assets) {
    if (asset.file.endsWith('.js')) js.push(asset)
    if (asset.file.endsWith('.css')) css.push(asset)
  }
  return Object.freeze({ js, css })
}

export function sumGzipBytes(assets: readonly GzipAsset[]): number {
  return assets.reduce((total, asset) => total + asset.gzipBytes, 0)
}

export function sumRawBytes(assets: readonly GzipAsset[]): number {
  return assets.reduce((total, asset) => total + asset.bytes, 0)
}

/** Applies the current product policy to the measured boot resources. */
export function createInitialRequestBudgets(
  bootAssets: readonly GzipAsset[],
  localeAssets: readonly GzipAsset[],
  sourceFontAssets: readonly GzipAsset[],
): readonly BundleBudget[] {
  const bootTypes = classifyGzipAssets(bootAssets)
  const localeTypes = classifyGzipAssets(localeAssets)
  return Object.freeze([
    {
      name: 'Boot-graph JavaScript no-regression ceiling',
      limitBytes: INITIAL_REQUEST_BUDGETS.initialJavaScriptCeiling,
      // Startup awaits the selected catalog before React's first render, so it
      // is part of the boot graph as well as its own sub-budget.
      actualBytes: sumGzipBytes([...bootTypes.js, ...localeTypes.js]),
      transfer: 'gzip',
      enforcement: 'enforced',
    },
    {
      name: 'Boot-graph JavaScript first milestone',
      limitBytes: INITIAL_REQUEST_BUDGETS.initialJavaScriptMilestone,
      actualBytes: sumGzipBytes([...bootTypes.js, ...localeTypes.js]),
      transfer: 'gzip',
      enforcement: 'provisional-warning',
    },
    {
      name: 'Boot-graph CSS',
      limitBytes: INITIAL_REQUEST_BUDGETS.initialCss,
      actualBytes: sumGzipBytes([...bootTypes.css, ...localeTypes.css]),
      transfer: 'gzip',
      enforcement: 'enforced',
    },
    {
      name: 'Boot-graph shared English locale catalog',
      limitBytes: INITIAL_REQUEST_BUDGETS.sharedLocale,
      actualBytes: sumGzipBytes(localeTypes.js),
      transfer: 'gzip',
      enforcement: 'enforced',
    },
    {
      name: 'Initial source-locale fonts',
      limitBytes: INITIAL_REQUEST_BUDGETS.sourceLocaleFonts,
      actualBytes: sumRawBytes(sourceFontAssets),
      transfer: 'raw',
      enforcement: 'enforced',
    },
  ])
}

export function measureGzipAssets(
  files: readonly string[],
  readFile: (file: string) => Uint8Array,
): readonly GzipAsset[] {
  return files.map((file) => {
    const bytes = readFile(file)
    return Object.freeze({
      file,
      bytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes).byteLength,
    })
  })
}

export function budgetFailures(
  budgets: readonly BundleBudget[],
): readonly BundleBudget[] {
  return budgets.filter(
    (budget) =>
      budget.enforcement === 'enforced' &&
      budget.actualBytes > budget.limitBytes,
  )
}

export function budgetWarnings(
  budgets: readonly BundleBudget[],
): readonly BundleBudget[] {
  return budgets.filter(
    (budget) =>
      budget.enforcement === 'provisional-warning' &&
      budget.actualBytes > budget.limitBytes,
  )
}
