export interface RuntimeAssetReference {
  readonly id: string | null
}

export interface AssetReference extends RuntimeAssetReference {
  readonly path: string | null
  readonly guid: string
  readonly fileId: number
}

export type RuntimeAssetValue =
  | null
  | boolean
  | number
  | string
  | RuntimeAssetReference
  | readonly RuntimeAssetValue[]
  | { readonly [key: string]: RuntimeAssetValue }

export interface RuntimeGameAsset {
  readonly id: string
  readonly kind: string
  readonly data: Readonly<Record<string, RuntimeAssetValue>>
}

export interface RuntimeGameDataCatalog {
  readonly formatVersion: 1
  readonly assets: readonly RuntimeGameAsset[]
  readonly countsByKind: Readonly<Record<string, number>>
}

export type ExportedAssetValue =
  | null
  | boolean
  | number
  | string
  | AssetReference
  | readonly ExportedAssetValue[]
  | { readonly [key: string]: ExportedAssetValue }

export interface ExportedGameAsset extends RuntimeGameAsset {
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
