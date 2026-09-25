import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { SUBSKILL_ASSETS } from './skillSubskills'

export const SKILL_DEFINITION_ASSETS = Object.freeze([
  ...getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND), ...SUBSKILL_ASSETS,
])

export const SKILL_COSTS: ReadonlyMap<string, bigint> = new Map(
  SKILL_DEFINITION_ASSETS.map(asset => {
    const cost = asset.data.cost
    if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 0) {
      throw new Error(`Invalid skill cost: ${asset.id}`)
    }
    return [asset.id, BigInt(cost)] as const
  }),
)
