import { gzipSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { build, type Plugin, type Rollup } from 'vite'

interface RenderedModule {
  readonly id: string
  readonly renderedBytes: number
}

interface RenderedChunk {
  readonly file: string
  readonly entry: boolean
  readonly dynamicEntry: boolean
  readonly imports: readonly string[]
  readonly dynamicImports: readonly string[]
  readonly modules: readonly RenderedModule[]
}

const webRoot = resolve(import.meta.dirname, '..')
const distRoot = resolve(webRoot, 'dist')
const reportRoot = resolve(webRoot, 'reports', 'bundle-composition')
const chunks: RenderedChunk[] = []

function normalizeModuleId(id: string): string {
  const relativeId = relative(webRoot, id).replaceAll('\\', '/')
  return relativeId.startsWith('../') ? id.replaceAll('\\', '/') : relativeId
}

function compositionPlugin(): Plugin {
  return {
    name: 'idle-dyson-swarm-bundle-composition-report',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        chunks.push({
          file: output.fileName,
          entry: output.isEntry,
          dynamicEntry: output.isDynamicEntry,
          imports: [...output.imports].sort(),
          dynamicImports: [...output.dynamicImports].sort(),
          modules: Object.entries(output.modules)
            .map(([id, module]) => ({
              id: normalizeModuleId(id),
              renderedBytes: (module as Rollup.RenderedModule).renderedLength,
            }))
            .filter((module) => module.renderedBytes > 0)
            .sort((left, right) => right.renderedBytes - left.renderedBytes),
        })
      }
    },
  }
}

await build({
  root: webRoot,
  mode: 'production',
  plugins: [compositionPlugin()],
})

const serviceWorker = readFileSync(resolve(distRoot, 'service-worker.js'), 'utf8')
const precacheMatch = serviceWorker.match(
  /const PRECACHE_URLS = Object\.freeze\((\[[\s\S]*?\])\);/,
)
if (precacheMatch?.[1] === undefined) {
  throw new Error('Generated service worker does not expose its precache URL list.')
}
const precacheUrls = JSON.parse(precacheMatch[1]) as readonly string[]
const precacheFiles = precacheUrls.map((url) => {
  const pathname = decodeURIComponent(new URL(url, 'https://bundle.invalid').pathname)
  const file = pathname === '/play/'
    ? 'index.html'
    : pathname.replace(/^\/play\//, '')
  const contents = readFileSync(resolve(distRoot, file))
  return {
    file,
    rawBytes: contents.byteLength,
    gzipBytes: gzipSync(contents).byteLength,
  }
})
const precacheTransfer = {
  assetCount: precacheFiles.length,
  rawBytes: precacheFiles.reduce((total, asset) => total + asset.rawBytes, 0),
  gzipBytes: precacheFiles.reduce((total, asset) => total + asset.gzipBytes, 0),
}

const measuredChunks = chunks
  .map((chunk) => {
    const contents = readFileSync(resolve(distRoot, chunk.file))
    return {
      ...chunk,
      rawBytes: contents.byteLength,
      gzipBytes: gzipSync(contents).byteLength,
    }
  })
  .sort((left, right) => right.gzipBytes - left.gzipBytes)
const entryChunk = measuredChunks.find((chunk) => chunk.entry)
if (entryChunk === undefined) throw new Error('Production build did not emit an entry chunk.')

const report = {
  version: 1,
  command: 'npm run report:bundle-composition',
  entry: {
    file: entryChunk.file,
    rawBytes: entryChunk.rawBytes,
    gzipBytes: entryChunk.gzipBytes,
  },
  precacheTransfer,
  chunks: measuredChunks,
}
const lines = [
  'Idle Dyson Swarm production bundle composition',
  `Entry: ${entryChunk.file} (${entryChunk.rawBytes} B raw, ${entryChunk.gzipBytes} B gzip)`,
  `PWA precache: ${precacheTransfer.assetCount} assets (${precacheTransfer.rawBytes} B raw, ${precacheTransfer.gzipBytes} B gzip)`,
  '',
  'JavaScript chunks:',
  ...measuredChunks.map(
    (chunk) =>
      `  ${chunk.file}  ${chunk.rawBytes} B raw  ${chunk.gzipBytes} B gzip  ${chunk.modules.length} modules`,
  ),
  '',
  'Largest entry modules by rendered size:',
  ...entryChunk.modules.slice(0, 30).map(
    (module) => `  ${module.renderedBytes} B  ${module.id}`,
  ),
]

mkdirSync(reportRoot, { recursive: true })
writeFileSync(
  resolve(reportRoot, 'bundle-composition.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
writeFileSync(
  resolve(reportRoot, 'bundle-composition.txt'),
  `${lines.join('\n')}\n`,
)
console.log(lines.join('\n'))
