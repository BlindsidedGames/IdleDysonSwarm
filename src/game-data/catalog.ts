import catalogJson from './generated/runtime-catalog.json'
import type {
  RuntimeGameAsset,
  RuntimeGameDataCatalog,
} from './types'

export const gameDataCatalog =
  catalogJson as unknown as RuntimeGameDataCatalog

const byKindAndId = new Map(
  gameDataCatalog.assets.map((asset) => [
    `${asset.kind}\0${asset.id}`,
    asset,
  ]),
)

export function getGameAsset(
  kind: string,
  id: string,
): RuntimeGameAsset | undefined {
  return byKindAndId.get(`${kind}\0${id}`)
}

export function getGameAssetsByKind(
  kind: string,
): readonly RuntimeGameAsset[] {
  return gameDataCatalog.assets.filter((asset) => asset.kind === kind)
}
