import catalogJson from './generated/runtime-catalog.json'
import type {
  RuntimeGameAsset,
  RuntimeGameDataCatalog,
} from './types'

const legacyCatalog = catalogJson as unknown as RuntimeGameDataCatalog

// Current gameplay overrides belong outside the frozen Unity compatibility capsule.
export const gameDataCatalog: RuntimeGameDataCatalog = {
  ...legacyCatalog,
  assets: legacyCatalog.assets.map((asset) => asset.kind === 'GameData.SkillDefinition' &&
    (asset.id === 'banking' || asset.id === 'investmentPortfolio')
    ? { ...asset, data: { ...asset.data, refundable: true } }
    : asset),
}

// Keep kind and ID as separate keys: this lookup runs throughout each game
// step, so rebuilding and hashing a joined string creates avoidable work.
const byKindAndId = new Map<string, Map<string, RuntimeGameAsset>>()
const firstById = new Map<string, RuntimeGameAsset>()
for (const asset of gameDataCatalog.assets) {
  if (!firstById.has(asset.id)) firstById.set(asset.id, asset)
  let assetsById = byKindAndId.get(asset.kind)
  if (assetsById === undefined) {
    assetsById = new Map()
    byKindAndId.set(asset.kind, assetsById)
  }
  assetsById.set(asset.id, asset)
}

export function getGameAsset(
  kind: string,
  id: string,
): RuntimeGameAsset | undefined {
  return byKindAndId.get(kind)?.get(id)
}

export function getGameAssetsByKind(
  kind: string,
): readonly RuntimeGameAsset[] {
  return gameDataCatalog.assets.filter((asset) => asset.kind === kind)
}

/** Resolves ID-only legacy references using the first authored match. */
export function getGameAssetById(id: string): RuntimeGameAsset | undefined {
  return firstById.get(id)
}
