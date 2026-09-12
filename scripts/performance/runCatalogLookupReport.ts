import { strict as assert } from 'node:assert'
import { gameDataCatalog, getGameAsset, getGameAssetById } from '../../src/game-data/catalog'
import { benchmarkOperations } from './benchmarkOperations'

// Preserve the pre-optimization joined-key index as the differential oracle.
const referenceIndex = new Map(gameDataCatalog.assets.map((asset) => [
  `${asset.kind}\0${asset.id}`, asset,
]))
const cases = [
  ...gameDataCatalog.assets.map((asset) => [asset.kind, asset.id] as const),
  ['missing', 'missing'],
  [gameDataCatalog.assets[0]!.kind, 'missing'],
  ['missing', gameDataCatalog.assets[0]!.id],
] as const
const reference = (kind: string, id: string) => referenceIndex.get(`${kind}\0${id}`)
for (const [kind, id] of cases) assert.equal(reference(kind, id), getGameAsset(kind, id))

function sweep(lookup: typeof getGameAsset): number {
  let found = 0
  for (const [kind, id] of cases) if (lookup(kind, id) !== undefined) found += 1
  return found
}
const referenceById = (_kind: string, id: string) =>
  gameDataCatalog.assets.find((asset) => asset.id === id)
for (const [, id] of cases) {
  assert.equal(referenceById('', id), getGameAssetById(id))
}
const options = { samples: 300, batchSize: 20, warmupIterations: 100 }
console.log(JSON.stringify({
  kind: 'catalog-lookups',
  node: process.version,
  casesPerSweep: cases.length,
  exactReferenceParity: true,
  note: 'Advisory time per full catalog sweep, including missing lookups.',
  byKindAndId: benchmarkOperations({
    reference: () => sweep(reference),
    candidate: () => sweep(getGameAsset),
  }, options),
  byId: benchmarkOperations({
    reference: () => sweep(referenceById),
    candidate: () => sweep((_kind, id) => getGameAssetById(id)),
  }, options),
}, null, 2))
