import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import {
  budgetFailures,
  budgetWarnings,
  classifyGzipAssets,
  collectInitialRequestGraph,
  createInitialRequestBudgets,
  measureGzipAssets,
  sumGzipBytes,
  type ViteManifest,
} from './initialRequestBundleReport.ts'

const webRoot = resolve(import.meta.dirname, '..')
const distRoot = resolve(webRoot, 'dist')
const manifestPath = resolve(distRoot, '.vite', 'manifest.json')
const reportRoot = resolve(webRoot, 'reports', 'initial-request-bundle')

function kibibytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

function readManifest(): ViteManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ViteManifest
}

function formatGzipAsset(asset: { readonly file: string; readonly gzipBytes: number }): string {
  return `  ${asset.file}  ${asset.gzipBytes} B gzip`
}

function formatRawAsset(asset: { readonly file: string; readonly bytes: number }): string {
  return `  ${asset.file}  ${asset.bytes} B transferred`
}

const manifest = readManifest()
const graph = collectInitialRequestGraph(manifest)
const assets = measureGzipAssets(graph.measuredAssetFiles, (file) =>
  readFileSync(resolve(distRoot, file)),
)
const byFile = new Map(assets.map((asset) => [asset.file, asset]))
const bootAssets = graph.bootAssetFiles.map((file) => byFile.get(file)!)
const localeAssets = graph.localeAssetFiles.map((file) => byFile.get(file)!)
const freshBotsAssets = graph.freshBotsAssetFiles.map(
  (file) => byFile.get(file)!,
)
const sourceFontAssets = graph.sourceFontAssetFiles.map(
  (file) => byFile.get(file)!,
)
const budgets = createInitialRequestBudgets(
  bootAssets,
  localeAssets,
  sourceFontAssets,
)
const failures = budgetFailures(budgets)
const warnings = budgetWarnings(budgets)
const bootJavaScriptBytes = sumGzipBytes([
  ...classifyGzipAssets(bootAssets).js,
  ...classifyGzipAssets(localeAssets).js,
])
const freshBotsJavaScriptBytes = sumGzipBytes(
  classifyGzipAssets(freshBotsAssets).js,
)
const report = Object.freeze({
  version: 2,
  mode: 'mixed-enforcement',
  manifest: relative(webRoot, manifestPath).replaceAll('\\', '/'),
  graph,
  assets,
  measurements: {
    bootJavaScriptGzipBytes: bootJavaScriptBytes,
    completedFreshBotsJavaScriptGzipBytes:
      bootJavaScriptBytes + freshBotsJavaScriptBytes,
    freshBotsDynamicJavaScriptGzipBytes: freshBotsJavaScriptBytes,
  },
  budgets: budgets.map((budget) => ({
    ...budget,
    outcome:
      budget.actualBytes <= budget.limitBytes
        ? 'within-limit'
        : budget.enforcement === 'enforced'
          ? 'failure'
          : 'warning',
  })),
})
const lines = [
  'Idle Dyson Swarm boot and fresh-Bots bundle report',
  'Policy: 200 KiB boot JavaScript is provisional; CSS, locale, and source-font limits are enforced.',
  `Manifest: ${report.manifest}`,
  '',
  'Boot graph (entry plus awaited English catalog):',
  ...[...bootAssets, ...localeAssets].map(formatGzipAsset),
  `  Total JavaScript: ${kibibytes(bootJavaScriptBytes)} gzip`,
  '',
  'Additional dynamic assets required to complete the fresh Bots surface:',
  ...(freshBotsAssets.length > 0
    ? freshBotsAssets.map(formatGzipAsset)
    : ['  None']),
  `  Completed fresh Bots JavaScript: ${kibibytes(bootJavaScriptBytes + freshBotsJavaScriptBytes)} gzip`,
  '',
  'Initial source-locale fonts:',
  ...sourceFontAssets.map(formatRawAsset),
  '',
  'Policy results:',
  ...report.budgets.map((budget) =>
    `  ${
      budget.outcome === 'failure'
        ? 'FAIL'
        : budget.outcome === 'warning'
          ? 'WARN'
          : budget.enforcement === 'enforced'
            ? 'PASS'
            : 'WITHIN TARGET'
    }  ${budget.name}: ${kibibytes(budget.actualBytes)} / ${kibibytes(budget.limitBytes)} ${budget.transfer === 'gzip' ? 'gzip' : 'transferred'} (${budget.enforcement})`,
  ),
]
mkdirSync(reportRoot, { recursive: true })
writeFileSync(resolve(reportRoot, 'initial-request-bundle.json'), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(resolve(reportRoot, 'initial-request-bundle.txt'), `${lines.join('\n')}\n`)
console.log(lines.join('\n'))
if (warnings.length > 0) {
  console.warn(
    'The provisional JavaScript target was exceeded; the report remains successful so enforced packaging checks can continue.',
  )
}
if (failures.length > 0) {
  process.exitCode = 1
}
