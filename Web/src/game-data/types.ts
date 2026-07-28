export interface AssetReference {
  readonly id: string | null
  readonly path: string | null
  readonly guid: string
  readonly fileId: number
}

export type ExportedAssetValue =
  | null
  | boolean
  | number
  | string
  | AssetReference
  | readonly ExportedAssetValue[]
  | { readonly [key: string]: ExportedAssetValue }

export interface ExportedGameAsset {
  readonly id: string
  readonly kind: string
  readonly path: string
  readonly guid: string
  readonly sourceHash: string
  readonly data: Readonly<Record<string, ExportedAssetValue>>
}

export interface ExportedGameDataCatalog {
  readonly formatVersion: 1
  readonly assets: readonly ExportedGameAsset[]
  readonly countsByKind: Readonly<Record<string, number>>
}

export interface LegacyIdMaps {
  readonly skillLegacyKeyToId: Readonly<Record<string, string>>
  readonly researchIds: readonly string[]
}
