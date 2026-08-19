import { gameDataCatalog } from '../game-data/catalog'
import {
  createCapturedInfinityAssetLookup,
  prepareCanonicalEventTimeContext,
  type CanonicalEventTimeContext,
} from './canonicalEventTimeModel'
import {
  CANONICAL_DYSON_PRESENTATION_TUNING,
  type DysonPresentationTuning,
} from './canonicalDysonDerivation'
import {
  SIMULATION_UPGRADE_DEFINITIONS,
} from './dreamEducationUpgrades'
import { DEFAULT_AUTOMATION_INTERVAL_SECONDS } from './eventTime'
import { REALITY_UPGRADE_DEFINITIONS } from './realityUpgrades'
import { readRealityWorkerTuning } from './realityWorkers'

/**
 * Builds the immutable event-model authorities shared by the foreground
 * application and the Stored Time worker. Keeping this composition outside
 * either host prevents the two execution lanes from silently drifting.
 */
export function createProductionEventContext(
  dysonPresentationTuning: Readonly<DysonPresentationTuning> =
    CANONICAL_DYSON_PRESENTATION_TUNING,
): Readonly<CanonicalEventTimeContext> {
  const realityWorkerTuning = readRealityWorkerTuning()
  if (realityWorkerTuning === undefined) {
    throw new Error(
      'Generated RealitySystemTuning is unavailable or invalid.',
    )
  }
  return prepareCanonicalEventTimeContext({
    automationIntervalSeconds:
      DEFAULT_AUTOMATION_INTERVAL_SECONDS,
    dysonPresentationTuning: Object.freeze({
      ...dysonPresentationTuning,
    }),
    realityWorkerTuning: Object.freeze({
      ...realityWorkerTuning,
    }),
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup(
      gameDataCatalog.assets,
    ),
  })
}
