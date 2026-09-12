import { expect, test } from 'vitest'
import { gameDataCatalog, getGameAsset, getGameAssetById } from './catalog'

test('catalog lookup preserves every authored identity and exact kind/ID matching', () => {
  const reference = new Map(gameDataCatalog.assets.map((asset) => [
    `${asset.kind}\0${asset.id}`, asset,
  ]))
  for (const asset of gameDataCatalog.assets) {
    expect(getGameAssetById(asset.id)).toBe(gameDataCatalog.assets.find((entry) => entry.id === asset.id))
    expect(getGameAsset(asset.kind, asset.id)).toBe(reference.get(`${asset.kind}\0${asset.id}`))
    expect(getGameAsset(asset.kind, `${asset.id} `)).toBeUndefined()
    expect(getGameAsset(`${asset.kind}\0`, asset.id)).toBeUndefined()
  }
  expect(getGameAssetById('missing')).toBeUndefined()
  expect(getGameAsset('', '')).toBeUndefined()
  expect(getGameAsset('missing', 'missing')).toBeUndefined()
})
