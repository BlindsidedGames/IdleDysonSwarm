import { gzipSync } from 'node:zlib'

export interface ViteManifestEntry {
  readonly file: string
  readonly src?: string
  readonly isEntry?: boolean
  readonly imports?: readonly string[]
  readonly css?: readonly string[]
}

export type ViteManifest = Readonly<Record<string, ViteManifestEntry>>

export interface InitialRequestGraph {
  readonly entryKey: string
  readonly localeKey: string
  readonly initialAssetFiles: readonly string[]
  readonly localeAssetFiles: readonly string[]
  readonly requestedAssetFiles: readonly string[]
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
}

export const INITIAL_REQUEST_BUDGETS = Object.freeze({
  initialJavaScript: 200 * 1024,
  initialCss: 40 * 1024,
  sharedLocale: 30 * 1024,
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
 * Builds the concrete request set needed before first playable render. Vite
 * records static imports but not conditional dynamic imports, so startup's
 * selected shared catalog is deliberately supplied as a second root.
 */
export function collectInitialRequestGraph(
  manifest: ViteManifest,
  options: {
    readonly entryKey?: string
    readonly localeKey?: string
  } = {},
): InitialRequestGraph {
  // Vite's browser manifest roots the application at index.html; it owns the
  // module script that loads src/main.tsx.
  const entryKey = options.entryKey ?? 'index.html'
  const localeKey = options.localeKey ?? 'src/ui/i18n/catalogs/compiled/en.json'
  const initialAssetFiles = collectStaticAssetFiles(manifest, entryKey)
  const localeTree = collectStaticAssetFiles(manifest, localeKey)
  const initialFiles = new Set(initialAssetFiles)
  const localeAssetFiles = sortedUnique(
    localeTree.filter((file) => !initialFiles.has(file)),
  )
  return Object.freeze({
    entryKey,
    localeKey,
    initialAssetFiles,
    localeAssetFiles,
    requestedAssetFiles: sortedUnique([...initialAssetFiles, ...localeAssetFiles]),
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

/** Applies the product budgets to the complete pre-render request sequence. */
export function createInitialRequestBudgets(
  initialAssets: readonly GzipAsset[],
  localeAssets: readonly GzipAsset[],
): readonly BundleBudget[] {
  const initialTypes = classifyGzipAssets(initialAssets)
  const localeTypes = classifyGzipAssets(localeAssets)
  return Object.freeze([
    {
      name: 'Initial first-slice JavaScript',
      limitBytes: INITIAL_REQUEST_BUDGETS.initialJavaScript,
      // Startup awaits the selected catalog before React's first render, so it
      // is part of the first-slice transfer as well as its own sub-budget.
      actualBytes: sumGzipBytes([...initialTypes.js, ...localeTypes.js]),
    },
    {
      name: 'Initial first-slice CSS',
      limitBytes: INITIAL_REQUEST_BUDGETS.initialCss,
      actualBytes: sumGzipBytes([...initialTypes.css, ...localeTypes.css]),
    },
    {
      name: 'Initial shared English locale catalog',
      limitBytes: INITIAL_REQUEST_BUDGETS.sharedLocale,
      actualBytes: sumGzipBytes(localeTypes.js),
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
  return budgets.filter((budget) => budget.actualBytes > budget.limitBytes)
}
