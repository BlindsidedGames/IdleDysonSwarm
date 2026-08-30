import type { SaveRepository } from '../save/repository'
import {
  RepositoryStartupSaveResolver,
  type FirstRunSaveFactory,
} from '../save/startupResolver'
import {
  CANONICAL_DYSON_PRESENTATION_TUNING,
  type DysonEntitlements,
  type DysonPresentationTuning,
} from '../simulation/canonicalDysonDerivation'
import { createProductionEventContext } from '../simulation/productionEventContext'
import {
  createCanonicalGameApplication,
  type CanonicalGameApplicationFacade,
} from './canonicalGameApplication'
import {
  createCanonicalRuntimeSessionFactory,
} from './canonicalRuntimeSession'
import {
  BrowserStoredTimeJobRunner,
} from '../workers/storedTime/storedTimeJobRunner'

export interface ProductionCanonicalApplicationFactoryOptions {
  /**
   * Stream A supplies the authenticated Unity artifact through this seam.
   * The factory is invoked only after the repository proves first launch.
   */
  readonly createFirstRunSave: FirstRunSaveFactory
  /**
   * Reads the current host-owned entitlement snapshot when a writable
   * application graph is constructed. The UI never supplies entitlement
   * values to a player command or snapshot projection.
   */
  readonly readHostEntitlements: () => Readonly<DysonEntitlements>
  /**
   * Reads retained host presentation tuning. The default preserves Unity's
   * four-completions-per-second solid progress-bar threshold.
   */
  readonly readHostDysonPresentationTuning?: () => Readonly<DysonPresentationTuning>
}

export type ProductionCanonicalApplicationFactory = (
  repository: SaveRepository,
) => CanonicalGameApplicationFacade

/**
 * Captures generated gameplay authorities once for one production
 * application factory. Save-specific compatibility tuning and evaluation
 * state continue to be opened by CanonicalRuntimeSession.
 */
export function createProductionCanonicalApplicationFactory(
  options: Readonly<ProductionCanonicalApplicationFactoryOptions>,
): ProductionCanonicalApplicationFactory {
  const eventContext = createProductionEventContext(
    options.readHostDysonPresentationTuning?.() ??
      CANONICAL_DYSON_PRESENTATION_TUNING,
  )
  return (repository) => {
    const entitlements = readEntitlements(
      options.readHostEntitlements,
    )
    return createCanonicalGameApplication({
      repository,
      startupResolver: new RepositoryStartupSaveResolver(
        repository,
        options.createFirstRunSave,
        'development',
      ),
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements,
      }),
      engine: { eventContext },
      storedTimeJobRunner: new BrowserStoredTimeJobRunner(),
      createTransitionalRecoveryBase: options.createFirstRunSave,
    })
  }
}

export { createProductionEventContext } from '../simulation/productionEventContext'

function readEntitlements(
  readHostEntitlements: () => Readonly<DysonEntitlements>,
): Readonly<DysonEntitlements> {
  const entitlements = readHostEntitlements()
  if (
    entitlements === null ||
    typeof entitlements !== 'object' ||
    typeof entitlements.permanentDoubleIp !== 'boolean'
  ) {
    throw new Error(
      'Host entitlements must provide an explicit permanentDoubleIp boolean.',
    )
  }
  return Object.freeze({
    permanentDoubleIp: entitlements.permanentDoubleIp,
  })
}
