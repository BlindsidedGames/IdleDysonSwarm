import { CloudStartupResolver, type PortableCloud } from '../platform/portableCloud'
import { serializeCloudWebSave } from '../save/serialization'
import { PreparedSave } from '../save/prepare'
import { evaluateAchievements, mergeAchievementFacts } from '../achievements/evaluate'
import type { AchievementPublication } from '../achievements/contracts'
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
  CanonicalRuntimeSession,
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
  readonly achievements?: AchievementPublication
  readonly cloud?: PortableCloud
  readonly readDeveloperOptions?: () => boolean
  /**
   * Reads the current host-owned entitlement snapshot when a writable
   * application graph or replacement save session is constructed. The UI never
   * supplies entitlement values to a player command or snapshot projection.
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
    // Validate at graph creation, then read current ownership again for each save session.
    readEntitlements(options.readHostEntitlements)
    const localResolver = new RepositoryStartupSaveResolver(
      repository,
      options.createFirstRunSave,
      'development',
    )
    const startupResolver = options.cloud === undefined
      ? localResolver
      : new CloudStartupResolver(localResolver, repository, options.cloud)
    const application = createCanonicalGameApplication({
      repository,
      startupResolver,
      sessionFactory: {
        open: (prepared) => new CanonicalRuntimeSession(prepared, {
          nowUtcMilliseconds: Date.now,
          entitlements: readEntitlements(options.readHostEntitlements),
          captureAchievements: options.achievements !== undefined,
          persistAchievements: options.achievements?.persistEvidence === true,
        }),
      },
      engine: {
        eventContext,
        retainAchievementEvidence: options.achievements?.persistEvidence === true,
      },
      storedTimeJobRunner: new BrowserStoredTimeJobRunner(),
      createTransitionalRecoveryBase: options.createFirstRunSave,
    })
    if (options.achievements !== undefined) {
      subscribeAchievementPublication(
        application,
        options.achievements,
        () => options.readDeveloperOptions?.() === true,
      )
    }
    if (options.cloud !== undefined) {
      subscribeCloudPublication(application, options.cloud)
    }
    return application
  }
}

export { createProductionEventContext } from '../simulation/productionEventContext'

/** Optional reporting observes published state without owning its publication. */
function subscribeAchievementPublication(
  application: CanonicalGameApplicationFacade,
  publication: AchievementPublication,
  readDeveloperOptions: () => boolean,
): void {
  application.subscribe((snapshot) => {
    if (snapshot.phase !== 'ready') return
    try {
      const facts = mergeAchievementFacts(
        snapshot.state.achievementEvidence,
        evaluateAchievements(snapshot.state.gameState, readDeveloperOptions()),
      )
      void publication.submit(facts).catch(() => undefined)
    } catch {
      // Optional platform reporting cannot affect committed state.
    }
  })
}

/** Cloud receives verified, clean checkpoints and suppresses unchanged revisions. */
function subscribeCloudPublication(
  application: CanonicalGameApplicationFacade,
  cloud: PortableCloud,
): void {
  let lastCheckpoint = ''
  application.subscribe((snapshot) => {
    if (
      snapshot.phase !== 'ready' ||
      snapshot.checkpoint.kind !== 'clean' ||
      snapshot.revision.state !== snapshot.revision.durable
    ) return

    const revision = `${snapshot.revision.session}:${snapshot.revision.durable}`
    if (revision === lastCheckpoint) return
    const captured = application.captureSaveTransferSnapshot()
    if (captured?.basis !== 'current') return
    lastCheckpoint = revision

    // Match the repository's durable normalization so the next launch can
    // prove this device has not changed since its last Cloud publication.
    const normalized = PreparedSave.fromDecoded(captured.prepared.copyValidatedState())
    void cloud.publish(serializeCloudWebSave(normalized.copyValidatedState()))
      .catch(() => {
        // A failed older request cannot invalidate a newer checkpoint's
        // publication. Only the latest request owns its retry marker.
        if (lastCheckpoint === revision) lastCheckpoint = ''
      })
  })
}

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
    ...(entitlements.permanentBotBoost === undefined
      ? {}
      : { permanentBotBoost: entitlements.permanentBotBoost === true }),
  })
}
