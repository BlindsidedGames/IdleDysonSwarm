/**
 * Materialises the Web runtime catalogs from the frozen Unity handoff capsule.
 * The capsule is an unreleased development snapshot, not the public 3.0.328
 * binary. Keeping this step byte-exact makes Unity removal independent from
 * any future authored-data redesign.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const authoredRoot = resolve(webRoot, 'src/game-data/authored/unity-handoff')
const generatedRoot = resolve(webRoot, 'src/game-data/generated')
const checkOnly = process.argv.includes('--check')

const files = [
  ['catalog.v1.json', 'catalog.json', '0f7e96636565c8d2d268eaa417335b9eb049939ddd2463408540b0af64ecf665'],
  ['legacy-id-maps.v1.json', 'legacy-id-maps.json', 'c66215d18f9a06bad753dde297be3a37ec3c7a40dfa967c8fa77fd7d5fa717d6'],
  ['runtime-catalog.v1.json', 'runtime-catalog.json', 'e83e210c029bea080228edc7e891adcd5998af0e14af966d224c6381ebdca3fa'],
  ['skill-migration-data.v1.json', 'skill-migration-data.json', 'c0d8fde4cf971cfa5733cc02986c3cc729cc67570225e3ca9e95aad8b6307507'],
  ['skill-tree-presentation.v1.json', 'skill-tree-presentation.json', '28d96ae985fd91ac5ac24e4b67c36a41e968642cf15f620890e4aa6ca42ea97a'],
] as const

for (const [sourceName, outputName, expectedHash] of files) {
  const source = readFileSync(resolve(authoredRoot, sourceName))
  const actualHash = createHash('sha256').update(source).digest('hex')
  if (actualHash !== expectedHash) {
    throw new Error(`${sourceName} changed without a handoff-version update: ${actualHash}`)
  }

  const parsed = JSON.parse(source.toString('utf8')) as Record<string, unknown>
  if (sourceName === 'catalog.v1.json') {
    const assets = parsed.assets
    const kinds = parsed.countsByKind
    if (!Array.isArray(assets) || assets.length !== 559) {
      throw new Error('The handoff catalog must contain exactly 559 assets.')
    }
    if (!kinds || typeof kinds !== 'object' || Object.keys(kinds).length !== 34) {
      throw new Error('The handoff catalog must contain exactly 34 asset kinds.')
    }
  }

  const outputPath = resolve(generatedRoot, outputName)
  if (checkOnly) {
    const output = readFileSync(outputPath)
    if (!source.equals(output)) {
      throw new Error(`${outputName} is stale; run npm run data:export.`)
    }
  } else {
    writeFileSync(outputPath, source)
  }
}

console.log(
  checkOnly
    ? 'Web-authored gameplay data is valid and generated catalogs are current.'
    : 'Generated Web gameplay catalogs from the versioned handoff capsule.',
)
