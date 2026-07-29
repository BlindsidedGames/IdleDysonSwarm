import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import {
  budgetFailures,
  collectInitialRequestGraph,
  createInitialRequestBudgets,
  measureGzipAssets,
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

function formatAsset(asset: { readonly file: string; readonly gzipBytes: number }): string {
  return `  ${asset.file}  ${asset.gzipBytes} B gzip`
}

const manifest = readManifest()
const graph = collectInitialRequestGraph(manifest)
const assets = measureGzipAssets(graph.requestedAssetFiles, (file) =>
  readFileSync(resolve(distRoot, file)),
)
const byFile = new Map(assets.map((asset) => [asset.file, asset]))
const initialAssets = graph.initialAssetFiles.map((file) => byFile.get(file)!)
const localeAssets = graph.localeAssetFiles.map((file) => byFile.get(file)!)
const budgets = createInitialRequestBudgets(initialAssets, localeAssets)
const failures = budgetFailures(budgets)
const report = Object.freeze({
  version: 1,
  mode: 'enforced',
  manifest: relative(webRoot, manifestPath).replaceAll('\\', '/'),
  graph,
  assets,
  budgets: budgets.map((budget) => ({
    ...budget,
    passed: budget.actualBytes <= budget.limitBytes,
  })),
})
const lines = [
  'Idle Dyson Swarm initial-request bundle report',
  `Mode: ${report.mode}`,
  `Manifest: ${report.manifest}`,
  '',
  'Requested before first playable render:',
  ...assets.map(formatAsset),
  '',
  'Budgets:',
  ...report.budgets.map((budget) =>
    `  ${budget.passed ? 'PASS' : 'FAIL'}  ${budget.name}: ${kibibytes(budget.actualBytes)} / ${kibibytes(budget.limitBytes)}`,
  ),
]
mkdirSync(reportRoot, { recursive: true })
writeFileSync(resolve(reportRoot, 'initial-request-bundle.json'), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(resolve(reportRoot, 'initial-request-bundle.txt'), `${lines.join('\n')}\n`)
console.log(lines.join('\n'))
if (failures.length > 0) {
  process.exitCode = 1
}
