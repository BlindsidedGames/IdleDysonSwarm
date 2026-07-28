import catalogJson from './generated/catalog.json'
import type {
  ExportedGameAsset,
  ExportedGameDataCatalog,
} from './types'

export const gameDataCatalog =
  catalogJson as unknown as ExportedGameDataCatalog

const byKindAndId = new Map(
  gameDataCatalog.assets.map((asset) => [
    `${asset.kind}\0${asset.id}`,
    asset,
  ]),
)

export function getGameAsset(
  kind: string,
  id: string,
): ExportedGameAsset | undefined {
  return byKindAndId.get(`${kind}\0${id}`)
}

export function getGameAssetsByKind(
  kind: string,
): readonly ExportedGameAsset[] {
  return gameDataCatalog.assets.filter((asset) => asset.kind === kind)
}
