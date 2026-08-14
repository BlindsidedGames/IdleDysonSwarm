import type { DeepReadonly } from '../core/contracts'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import type { CanonicalPlayerCommand } from '../application/canonicalPlayerCommands'
import {
  adoptPreparedCanonicalRuntimePublicationV2,
  createCanonicalRuntimePublicationV2,
  registerCanonicalRuntimeApplicationAuthorityV2,
  stageCanonicalRuntimeAdvanceV2,
  type CanonicalRuntimePublicationV2,
} from '../application/canonicalRuntimeSessionV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import type { InfinityRewardAuthorityV2 } from '../simulation/infinityEconomyV2'
import { commitDreamCommandV2, quoteDreamCommandV2 } from '../application/dreamStrangeMatterAuthorityV2'
import type { FrontendApplicationSnapshot, FrontendGameplayPreviewDemand } from '../application/frontendSnapshot'
import { Stage7V2BrowserIndexedDbStorage } from '../certification/stage7V2/browserIndexedDbStorage'
import { Stage7V2CertificationRepository } from '../certification/stage7V2/repository'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  floorGameDecimal,
  ceilGameDecimal,
  addGameDecimals,
  gameDecimalFromBigInt,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  isGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
} from '../math/gameDecimal'
import { decodeSchema13WebSave, encodeSchema13WebSave } from '../save/schema13'
import { prepareImportedSaveText } from '../save/import'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'
import { QUANTUM_CONSTANTS } from '../simulation/quantumUpgrades'
import type {
  DecodedSchema13WebSave,
  Schema13PlatformState,
  Schema13WebSaveSource,
} from '../save/schema13'
import type { Stage7V2CertificationHostResult } from '../certification/stage7V2/certificationHost'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import {
  previewAddSkillToPreset,
  previewRemoveSkillFromPreset,
  parseCanonicalSkillPreset,
} from '../simulation/canonicalSkillPresetTransactions'
import { CANONICAL_V2_NO_DORMANT_DUE_EVENTS } from '../simulation/canonicalEventTimeModelV2'
import {
  commitCanonicalDreamResetV2,
  quoteCanonicalDreamResetV2,
} from '../simulation/canonicalDreamResetV2'
import {
  commitCanonicalQuantumResetV2,
  quoteCanonicalQuantumResetV2,
} from '../simulation/canonicalQuantumResetV2'
import {
  createCanonicalTinkerRuntimeState,
  type CanonicalTinkerRuntimeState,
} from '../simulation/canonicalTinker'
import {
  advanceCanonicalTinkerV2,
  deriveCanonicalTinkerStatsV2,
  setCanonicalTinkerRepeatV2,
  startCanonicalTinkerV2,
} from '../simulation/canonicalTinkerV2'
import {
  commitV2DysonFacilityPurchase,
  quoteV2DysonFacilityPurchase,
  runV2DysonAutomationTick,
} from '../simulation/dysonV2Commands'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import {
  commitInfinityShopPurchaseV2,
  quoteInfinityShopPurchaseV2,
} from '../simulation/infinityShopV2'
import {
  commitV2ResearchPurchase,
  quoteV2ResearchPurchase,
  runV2ResearchAutomationTick,
} from '../simulation/researchV2'
import {
  commitQuantumUpgradeV2,
  quoteQuantumUpgradeV2,
} from '../simulation/quantumV2'
import {
  commitAvocadoCommandV2,
  quoteAvocadoCommandV2,
  registerAvocadoStrangeMatterAccountV2ForOwner,
} from '../simulation/avocadoV2'
import { gatherRealityInfluenceV2 } from '../simulation/realityV2'
import {
  purchaseCanonicalSkillV2,
  previewAddCanonicalSkillToPresetV2,
  previewRemoveCanonicalSkillFromPresetV2,
  refundCanonicalSkillV2,
  recalculateCanonicalSkillPointsV2,
  resetCanonicalSkillsV2,
  runCanonicalSkillAutoAssignmentV2,
} from '../simulation/skillTransactionsV2'
import { defaultSkillPresetColorId } from '../game-state/skillPresetColors'
import {
  setV2DoubleTimeRate,
  upgradeV2StoredTimeCapacity,
} from '../simulation/timeResourcesV2'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeFoundationStatus,
  UiRuntimeDevelopmentAction,
  UiRuntimeDevelopmentActionResult,
  UiRuntimeDevelopmentControls,
  UiRuntimeDevelopmentResult,
  UiRuntimeImportRequest,
  UiRuntimeImportResult,
  UiRuntimePlayerCommandResult,
  UiRuntimeStatusListener,
  UiRuntimeStorageStatus,
} from '../ui/runtime'
import type { UiRuntimeDevelopmentRealityResult } from '../ui/runtime/contracts'
import { selectFrontendApplicationSnapshotV2, projectLegacyPresentationState } from './frontendSnapshotV2'

const BUILD_SCOPE = 'stage8-v2-full-game-v1'
const DEFAULT_PLATFORM = Object.freeze({
  debugOptions: false,
  debugEverEnabled: false,
  cheater: false,
  unlockAllTabs: false,
})
const DEFAULT_INFINITY_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)
const APPLICATION_AUTHORITY = registerCanonicalRuntimeApplicationAuthorityV2()

export interface V2GameRuntimeController {
  readonly runtime: BrowserUiRuntimeFoundation
  setHugeInspectionValues(): Promise<void>
  resetIsolatedSave(): Promise<void>
  checkpoint(): Promise<boolean>
}

export interface V2GameRuntimeRepository {
  recoverNewestValid(): Promise<Readonly<{
    readonly save: Readonly<DecodedSchema13WebSave>
    readonly platform: Readonly<Schema13PlatformState>
    readonly revision: number
  }> | null>
  checkpointPrepared(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ): Promise<void>
  importPortable(
    portableSave: string,
    receivingPlatform: Readonly<Schema13PlatformState>,
  ): Promise<Readonly<{
    readonly revision: number
    readonly portableSave: string
    readonly platform: Readonly<Schema13PlatformState>
  }>>
  exportPortable(): Promise<string | null>
  exportRetainedImport(): Promise<string | null>
  cleanup(): Promise<void>
}

export interface V2GameRuntimeOptions {
  readonly repository?: Readonly<V2GameRuntimeRepository>
  readonly beforeStart?: (takeover: boolean) => Promise<void>
  readonly afterShutdown?: () => Promise<void>
  readonly createStoredTimeHost?: (
    publication: Readonly<CanonicalRuntimePublicationV2>,
    platform: Readonly<Schema13PlatformState>,
  ) => V2StoredTimeHostPort
  readonly lifecycle?: Readonly<LifecycleAdapter>
  readonly infinityRewardAuthority?: () => Readonly<InfinityRewardAuthorityV2>
}

export interface V2StoredTimeHostPort {
  snapshot(): Readonly<CanonicalRuntimePublicationV2>
  adoptExternalPublication(
    publication: Readonly<CanonicalRuntimePublicationV2>,
    platform?: Readonly<Schema13PlatformState>,
  ): void
  confirmDurableReadmission(): Promise<Readonly<Stage7V2CertificationHostResult>>
  returnFromSuspension(request: Readonly<{
    expectedRevision: number
    nowUtcMilliseconds: number
    savedAtUtc: string
    restartMonotonicSampling: () => void
  }>): Promise<Readonly<Stage7V2CertificationHostResult>>
  startStoredTime(request: Readonly<{
    expectedRevision: number
    requestedDurationSeconds: number
  }>): Promise<Readonly<Stage7V2CertificationHostResult>>
  awaitStoredTimeTerminal(): Promise<Readonly<Stage7V2CertificationHostResult>>
  pauseForLifecycle(
    reason?: string,
    foregroundResidueSeconds?: number,
  ): Promise<Readonly<Stage7V2CertificationHostResult>>
}

export function createV2GameRuntimeController(
  options: Readonly<V2GameRuntimeOptions> = {},
): V2GameRuntimeController {
  const implementation = new V2GameRuntime(options)
  return Object.freeze({
    runtime: implementation.facade(),
    setHugeInspectionValues: () => implementation.setHugeInspectionValues(),
    resetIsolatedSave: () => implementation.resetIsolatedSave(),
    checkpoint: () => implementation.requestCheckpoint(),
  })
}

class V2GameRuntime {
  readonly #repository: Readonly<V2GameRuntimeRepository>
  readonly #beforeStart: (takeover: boolean) => Promise<void>
  readonly #afterShutdown: () => Promise<void>
  readonly #createStoredTimeHost: V2GameRuntimeOptions['createStoredTimeHost']
  readonly #lifecycle: Readonly<LifecycleAdapter> | null
  readonly #infinityRewardAuthority: () => Readonly<InfinityRewardAuthorityV2>
  readonly #statusListeners = new Set<UiRuntimeStatusListener>()
  readonly #snapshotListeners = new Set<(snapshot: DeepReadonly<FrontendApplicationSnapshot>) => void>()
  #status: UiRuntimeFoundationStatus = Object.freeze({ phase: 'idle' })
  #publication: Readonly<CanonicalRuntimePublicationV2> | null = null
  #snapshot: DeepReadonly<FrontendApplicationSnapshot> = Object.freeze({
    version: 1,
    phase: 'idle',
  })
  #sessionRevision = 0
  #durableRevision = 0
  // The production shell opens on Bots and synchronously publishes before
  // React can report its route. Avoid constructing every hidden tab's strict
  // V2 quote set during startup and each intervening runtime publication.
  #previewDemand: FrontendGameplayPreviewDemand = 'bots'
  #activeTimer: ReturnType<typeof setInterval> | null = null
  #advancing = false
  #activeAdvancePromise: Promise<void> | null = null
  #maxActiveAdvanceMs = 0
  #checkpointTimer: ReturnType<typeof setTimeout> | null = null
  #checkpointTail: Promise<boolean> = Promise.resolve(true)
  #maxCheckpointMs = 0
  #tinker: CanonicalTinkerRuntimeState = createCanonicalTinkerRuntimeState()
  #platform: Readonly<Schema13PlatformState> = DEFAULT_PLATFORM
  #writerStarted = false
  #storedTimeHost: V2StoredTimeHostPort | null = null
  #recoveryText: string | null = null
  #unsubscribeLifecycle: (() => void) | null = null
  #lifecycleTail: Promise<void> = Promise.resolve()
  #mutationTail: Promise<void> = Promise.resolve()

  constructor(options: Readonly<V2GameRuntimeOptions>) {
    this.#repository = options.repository ?? new Stage7V2CertificationRepository({
      buildScope: BUILD_SCOPE,
      storage: new Stage7V2BrowserIndexedDbStorage(BUILD_SCOPE),
    })
    this.#beforeStart = options.beforeStart ?? (async () => undefined)
    this.#afterShutdown = options.afterShutdown ?? (async () => undefined)
    this.#createStoredTimeHost = options.createStoredTimeHost
    this.#lifecycle = options.lifecycle ?? null
    this.#infinityRewardAuthority = options.infinityRewardAuthority ?? (() => DEFAULT_INFINITY_AUTHORITY)
  }

  facade(): BrowserUiRuntimeFoundation {
    const development: UiRuntimeDevelopmentControls | undefined = import.meta.env.DEV
      ? Object.freeze({
          status: () => this.#developmentStatus(),
          setDysonBots: (bots: number) => this.#setDevelopmentDysonBots(bots),
          unlockReality: () => this.#unlockDevelopmentReality(),
          apply: (action: UiRuntimeDevelopmentAction) => this.#applyDevelopmentAction(action),
          simulateOfflineTime: (seconds: number) => this.#simulateDevelopmentOfflineTime(seconds),
        })
      : undefined
    return {
      status: () => this.#status,
      subscribeStatus: (listener) => this.#subscribeStatus(listener),
      snapshot: () => this.#snapshot,
      subscribeSnapshot: (listener) => this.#subscribeSnapshot(listener),
      receiverLocalEntitlements: () => Object.freeze({
        developerOptionsPurchased: this.#platform.debugEverEnabled,
      }),
      start: () => this.start(false),
      takeOverWriterOwnership: () => this.start(true),
      dispatchPlayer: (command) => this.dispatchPlayer(command),
      ...(development === undefined ? {} : { development }),
      setGameplayPreviewDemand: (demand) => {
        this.#previewDemand = demand
        this.#publishSnapshot()
      },
      previewSkillPresetQueueChange: (request) => {
        const state = this.#requirePublication().state
        const legacy = projectLegacyPresentationState(state)
        return request.included
          ? previewAddSkillToPreset(legacy, request.slot, request.skillId)
          : previewRemoveSkillFromPreset(legacy, request.slot, request.skillId)
      },
      exportSkillPreset: (slot) => JSON.stringify(
        projectLegacyPresentationState(this.#requirePublication().state)
          .skills.presets[slot - 1],
      ),
      previewSkillPresetImport: (serialized) => parseCanonicalSkillPreset(serialized),
      previewImport: (request) => this.previewImport(request),
      importSave: (request) => this.importSave(request),
      inspectStorage: () => this.inspectStorage(),
      requestCheckpoint: () => this.requestCheckpoint(),
      checkpointBeforeSafeReload: () => this.requestCheckpoint(),
      recoveryExportAvailable: () => this.#recoveryText !== null,
      readCurrentSaveText: () => this.#repository.exportPortable(),
      exportCurrentSave: () => this.exportCurrentSave(),
      exportLastRecovery: () => this.exportLastRecovery(),
      copyLastRecovery: () => this.copyLastRecovery(),
      readClipboardText: () => navigator.clipboard.readText(),
      writeClipboardText: (value) => navigator.clipboard.writeText(value),
      openExternalUrl: async (url) => { window.open(url, '_blank', 'noopener,noreferrer') },
      shutdown: () => this.shutdown(),
    }
  }

  async start(takeover = false): Promise<UiRuntimeFoundationStatus> {
    if (this.#status.phase === 'ready') return this.#status
    this.#setStatus(Object.freeze({ phase: 'starting' }))
    this.#snapshot = Object.freeze({ version: 1, phase: 'starting' })
    this.#notifySnapshot()
    try {
      await this.#beforeStart(takeover)
      this.#writerStarted = true
      let current = await this.#repository.recoverNewestValid()
      if (current === null) {
        const migrated = migratePreparedSaveToV2(
          createDeterministicUnityFirstRunPreparedSave(),
          Object.freeze({ kind: 'trusted-same-device' }),
        )
        const initial = createCanonicalRuntimePublicationV2(Object.freeze({
          revision: 0,
          state: migrated.state,
          runtime: migrated.runtime,
        }))
        await this.#checkpointPublication(initial)
        current = await this.#repository.recoverNewestValid()
      }
      if (current === null) throw new Error('The isolated schema13 game save could not be opened.')
      this.#publication = createCanonicalRuntimePublicationV2(Object.freeze({
        revision: current.revision,
        state: current.save.state,
        runtime: current.save.runtime,
      }))
      this.#platform = current.platform
      this.#recoveryText = await this.#repository.exportRetainedImport()
      if (this.#createStoredTimeHost !== undefined) {
        this.#storedTimeHost = this.#createStoredTimeHost(
          this.#publication,
          this.#platform,
        )
        const admission = await this.#storedTimeHost.confirmDurableReadmission()
        if (admission.status === 'returned-time-required') {
          const returned = await this.#storedTimeHost.returnFromSuspension(Object.freeze({
            expectedRevision: this.#publication.revision,
            nowUtcMilliseconds: Date.now(),
            savedAtUtc: new Date().toISOString(),
            restartMonotonicSampling: () => undefined,
          }))
          if (returned.status !== 'ready') {
            throw new Error(returned.error ?? `V2 return ended as ${returned.status}.`)
          }
          this.#publication = returned.publication
          this.#durableRevision = returned.publication.revision
        } else if (admission.status !== 'ready') {
          throw new Error(admission.error ?? `V2 durable admission ended as ${admission.status}.`)
        }
      }
      this.#sessionRevision += 1
      this.#durableRevision = current.revision
      this.#setStatus(Object.freeze({ phase: 'ready', warnings: [] }))
      this.#publishSnapshot()
      this.#unsubscribeLifecycle = this.#lifecycle?.subscribe((phase) => {
        this.#lifecycleTail = this.#lifecycleTail
          .then(() => this.#handleLifecycle(phase))
          .catch(() => undefined)
      }) ?? null
      if (this.#lifecycle?.currentPhase() === 'active' || this.#lifecycle === null) {
        this.#startActiveTimer()
      }
      return this.#status
    } catch (error) {
      if (this.#writerStarted) {
        await this.#afterShutdown().catch(() => undefined)
        this.#writerStarted = false
      }
      this.#setStatus(Object.freeze({
        phase: 'blocked',
        code: 'startup-failed',
        reason: error instanceof Error ? error.message : String(error),
      }))
      return this.#status
    }
  }

  async dispatchPlayer(command: CanonicalPlayerCommand): Promise<UiRuntimePlayerCommandResult> {
    return this.#serializeMutation(() => this.#dispatchPlayer(command))
  }

  async #dispatchPlayer(command: CanonicalPlayerCommand): Promise<UiRuntimePlayerCommandResult> {
    const commandStarted = performance.now()
    await this.#awaitActiveAdvance()
    const source = this.#publication
    const activationRevision = Object.freeze({
      session: this.#sessionRevision,
      state: source?.revision ?? 0,
    })
    if (source === null || this.#status.phase !== 'ready') {
      return Object.freeze({
        status: 'rejected', kind: 'transition', code: 'V2-NOT-READY',
        reason: 'The V2 game is not ready.', stale: false,
        stateRevision: source?.revision ?? 0, activationRevision,
      })
    }
    if (command.kind === 'time.request-stored-time-spend') {
      return this.#dispatchStoredTime(source, command.requestedSeconds, activationRevision)
    }
    try {
      const next = this.#routeCommand(source, command)
      const authorityCompleted = performance.now()
      if (next === null) {
        return Object.freeze({
          status: 'rejected', kind: 'transition', code: 'V2-COMMAND-REJECTED',
          reason: `The V2 authority rejected '${command.kind}'.`, stale: false,
          stateRevision: source.revision, activationRevision,
        })
      }
      const changed = next !== source
      if (changed) this.#adopt(next)
      const completed = performance.now()
      document.documentElement.dataset.v2LastCommandKind = command.kind
      document.documentElement.dataset.v2LastCommandAuthorityMs =
        (authorityCompleted - commandStarted).toFixed(3)
      document.documentElement.dataset.v2LastCommandTotalMs =
        (completed - commandStarted).toFixed(3)
      return Object.freeze({
        status: 'accepted', kind: 'transition', changed,
        stateRevision: next.revision, activationRevision,
      })
    } catch (error) {
      return Object.freeze({
        status: 'rejected', kind: 'transition', code: 'V2-COMMAND-FAILED',
        reason: error instanceof Error ? error.message : String(error), stale: false,
        stateRevision: source.revision, activationRevision,
      })
    }
  }

  async setHugeInspectionValues(): Promise<void> {
    const source = this.#requirePublication()
    const huge = gameDecimalFromCanonicalString('1e1000')
    const fifty = gameDecimalFromNumber(50)
    const hundred = gameDecimalFromNumber(100)
    const state = cloneCanonicalGameStateV2({
      ...source.state,
      dyson: {
        ...source.state.dyson,
        money: huge,
        science: huge,
        bots: hundred,
        workers: fifty,
        researchers: fifty,
        goalStage: 1n,
      },
      infinity: { ...source.state.infinity, availablePoints: huge },
      skills: { ...source.state.skills, points: 100n },
      reality: { ...source.state.reality, influence: huge },
      dream: { ...source.state.dream, strangeMatter: huge },
      quantum: { ...source.state.quantum, availableShards: huge, lifetimeEarnedShards: huge },
    })
    this.#adopt(this.#publicationWithState(source, state, source.revision + 1))
    await this.requestCheckpoint()
  }

  #developmentStatus() {
    const publication = this.#publication
    if (publication === null) {
      return Object.freeze({ enabled: false, entitled: false, quantumShards: 0n, strangeMatter: 0n })
    }
    return Object.freeze({
      enabled: this.#platform.debugOptions,
      entitled: this.#platform.debugEverEnabled,
      quantumShards: gameDecimalToBigIntChecked(
        floorGameDecimal(publication.state.quantum.availableShards),
      ),
      strangeMatter: gameDecimalToBigIntChecked(
        floorGameDecimal(publication.state.dream.strangeMatter),
      ),
    })
  }

  async #setDevelopmentDysonBots(bots: number): Promise<UiRuntimeDevelopmentResult> {
    if (!Number.isFinite(bots) || bots < 0) return developmentRejected('V2-DEVELOPMENT-BOTS-INVALID', 'Bot count must be finite and non-negative.')
    const source = this.#requireDevelopmentPublication()
    if ('applied' in source) return source
    const next = floorGameDecimal(gameDecimalFromNumber(bots))
    const publication = this.#replaceState(source, {
      ...source.state,
      dyson: { ...source.state.dyson, bots: next },
    })
    this.#adopt(publication)
    await this.requestCheckpoint()
    return Object.freeze({ applied: true, bots, stateRevision: publication.revision, durableRevision: this.#durableRevision })
  }

  async #unlockDevelopmentReality(): Promise<UiRuntimeDevelopmentRealityResult> {
    const source = this.#requireDevelopmentPublication()
    if ('applied' in source) return source
    const secrets = QUANTUM_CONSTANTS.maximumSecrets
    const publication = this.#replaceState(source, {
      ...source.state,
      meta: {
        ...source.state.meta,
        firstInfinityComplete: true,
        navigationVisibility: { story: true, wiki: true, statistics: true },
      },
      infinity: { ...source.state.infinity, secretsOfTheUniverse: secrets },
      quantum: { ...source.state.quantum, permanentSecrets: secrets },
    })
    this.#platform = Object.freeze({ ...this.#platform, unlockAllTabs: true })
    this.#adopt(publication)
    await this.requestCheckpoint()
    return Object.freeze({ applied: true, secretsOfTheUniverse: secrets, stateRevision: publication.revision, durableRevision: this.#durableRevision })
  }

  async #applyDevelopmentAction(action: UiRuntimeDevelopmentAction): Promise<UiRuntimeDevelopmentActionResult> {
    const source = this.#requireDevelopmentPublication(action.kind === 'unlock-debug-options')
    if ('applied' in source) return source
    if (action.kind === 'unlock-debug-options') {
      this.#platform = Object.freeze({ ...this.#platform, debugOptions: true, debugEverEnabled: true })
      await this.#checkpointPublication(source)
      this.#durableRevision = source.revision
      this.#publishSnapshot()
      return developmentApplied(source.revision, this.#durableRevision)
    }
    if (action.kind === 'disable-debug-options') {
      this.#platform = Object.freeze({ ...this.#platform, debugOptions: false })
      await this.#checkpointPublication(source)
      this.#durableRevision = source.revision
      this.#publishSnapshot()
      return developmentApplied(source.revision, this.#durableRevision)
    }
    if (action.kind === 'purchase-debug-options') {
      const entitled = this.#platform.debugEverEnabled
      const shardCost = gameDecimalFromCanonicalString('1e5')
      const matterCost = gameDecimalFromCanonicalString('5e5')
      let state = source.state
      if (!entitled) {
        try {
          state = cloneCanonicalGameStateV2({
            ...state,
            quantum: { ...state.quantum, availableShards: subtractGameDecimals(state.quantum.availableShards, shardCost) },
            dream: { ...state.dream, strangeMatter: subtractGameDecimals(state.dream.strangeMatter, matterCost) },
          })
        } catch {
          return developmentRejected('V2-DEVELOPMENT-UNAFFORDABLE', 'Developer Options require 100,000 Quantum Shards and 500,000 Strange Matter.')
        }
      }
      this.#platform = Object.freeze({ ...this.#platform, debugOptions: true, debugEverEnabled: true })
      const publication = state === source.state ? source : this.#publicationWithState(source, state, source.revision + 1)
      if (publication !== source) this.#adopt(publication)
      await this.#checkpointPublication(publication)
      this.#durableRevision = publication.revision
      this.#publishSnapshot()
      return developmentApplied(publication.revision, this.#durableRevision)
    }
    if (!this.#platform.debugOptions) return developmentRejected('V2-DEVELOPMENT-NOT-ENABLED', 'Developer Options are not enabled.')

    const state = source.state
    let candidate: Parameters<typeof cloneCanonicalGameStateV2>[0]
    switch (action.kind) {
      case 'add-cash':
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Cash')
        candidate = { ...state, dyson: { ...state.dyson, money: addGameDecimals(state.dyson.money, action.amount) } }
        break
      case 'add-bots':
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Bot')
        candidate = { ...state, dyson: { ...state.dyson, bots: addGameDecimals(state.dyson.bots, floorGameDecimal(action.amount)) } }
        break
      case 'add-skill-points':
        if (action.amount < 0n) return invalidDevelopmentAmount('Skill point')
        candidate = { ...state, skills: { ...state.skills, points: clampDevelopmentBigInt(state.skills.points + action.amount) } }
        break
      case 'add-infinity-points':
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Infinity point')
        candidate = { ...state, infinity: { ...state.infinity, availablePoints: addGameDecimals(state.infinity.availablePoints, floorGameDecimal(action.amount)) } }
        break
      case 'add-quantum-shards': {
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Quantum shard')
        const amount = floorGameDecimal(action.amount)
        candidate = { ...state, quantum: { ...state.quantum, availableShards: addGameDecimals(state.quantum.availableShards, amount), lifetimeEarnedShards: addGameDecimals(state.quantum.lifetimeEarnedShards, amount) } }
        break
      }
      case 'add-influence':
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Influence')
        candidate = { ...state, reality: { ...state.reality, influence: addGameDecimals(state.reality.influence, floorGameDecimal(action.amount)) } }
        break
      case 'add-strange-matter':
        if (!isGameDecimal(action.amount)) return invalidDevelopmentAmount('Strange Matter')
        candidate = { ...state, dream: { ...state.dream, strangeMatter: addGameDecimals(state.dream.strangeMatter, floorGameDecimal(action.amount)) } }
        break
      case 'set-tinker-interval':
        candidate = { ...state, dyson: { ...state.dyson, manualCreationIntervalSeconds: action.seconds } }
        break
      case 'recalculate-skill-points': {
        const result = recalculateCanonicalSkillPointsV2(state)
        if (!result.accepted) {
          return developmentRejected(
            'V2-DEVELOPMENT-SKILL-RECALCULATION-REJECTED',
            result.reason,
          )
        }
        candidate = result.state
        break
      }
      case 'reset-secret-progress':
        candidate = { ...state, secretProgress: { completed: false, step: 0 } }
        break
    }
    const publication = this.#replaceState(source, candidate)
    this.#adopt(publication)
    await this.requestCheckpoint()
    return developmentApplied(publication.revision, this.#durableRevision)
  }

  async #simulateDevelopmentOfflineTime(seconds: number): Promise<UiRuntimeDevelopmentActionResult> {
    if (!Number.isFinite(seconds) || seconds < 0) return invalidDevelopmentAmount('Offline-time')
    const source = this.#requireDevelopmentPublication()
    if ('applied' in source) return source
    const publication = this.#replaceState(source, {
      ...source.state,
      timeline: {
        ...source.state.timeline,
        storedTimeAvailableSeconds: Math.min(source.state.timeline.storedTimeCapacitySeconds, source.state.timeline.storedTimeAvailableSeconds + seconds),
      },
    })
    this.#adopt(publication)
    await this.requestCheckpoint()
    return developmentApplied(publication.revision, this.#durableRevision)
  }

  #requireDevelopmentPublication(allowDisabled = false):
    | Readonly<CanonicalRuntimePublicationV2>
    | Readonly<{ readonly applied: false; readonly code: string; readonly reason: string }> {
    if (this.#publication === null || this.#status.phase !== 'ready') return developmentRejected('V2-DEVELOPMENT-NOT-READY', 'The V2 runtime is not ready.')
    if (!allowDisabled && !this.#platform.debugOptions) return developmentRejected('V2-DEVELOPMENT-NOT-ENABLED', 'Developer Options are not enabled.')
    return this.#publication
  }

  async resetIsolatedSave(): Promise<void> {
    await this.shutdown()
    await this.#repository.cleanup()
    location.reload()
  }

  async requestCheckpoint(): Promise<boolean> {
    await this.#awaitActiveAdvance()
    if (this.#checkpointTimer !== null) {
      clearTimeout(this.#checkpointTimer)
      this.#checkpointTimer = null
    }
    const publication = this.#publication
    if (publication === null) return false
    this.#checkpointTail = this.#checkpointTail.then(async () => {
      const started = performance.now()
      await this.#checkpointPublication(publication)
      const elapsed = performance.now() - started
      this.#maxCheckpointMs = Math.max(this.#maxCheckpointMs, elapsed)
      document.documentElement.dataset.v2LastCheckpointMs = elapsed.toFixed(3)
      document.documentElement.dataset.v2MaxCheckpointMs =
        this.#maxCheckpointMs.toFixed(3)
      if (this.#publication?.revision === publication.revision) {
        this.#durableRevision = publication.revision
        this.#publishSnapshot()
      }
      return true
    }).catch((error) => {
      document.documentElement.dataset.v2LastCheckpointError =
        error instanceof Error ? error.message : String(error)
      return false
    })
    return this.#checkpointTail
  }

  async shutdown(): Promise<void> {
    this.#stopActiveTimer()
    await this.#awaitActiveAdvance()
    this.#unsubscribeLifecycle?.()
    this.#unsubscribeLifecycle = null
    await this.#lifecycleTail
    await this.requestCheckpoint()
    if (this.#storedTimeHost !== null && this.#publication !== null) {
      this.#storedTimeHost.adoptExternalPublication(this.#publication, this.#platform)
      const paused = await this.#storedTimeHost.pauseForLifecycle('host-suspending')
      if (paused.status === 'paused') {
        this.#publication = paused.publication
        this.#durableRevision = paused.publication.revision
      }
    }
    if (this.#writerStarted) {
      await this.#afterShutdown()
      this.#writerStarted = false
    }
    this.#setStatus(Object.freeze({ phase: 'stopped' }))
  }

  #routeCommand(
    source: Readonly<CanonicalRuntimePublicationV2>,
    command: CanonicalPlayerCommand,
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    switch (command.kind) {
      case 'dyson.purchase-basic-facility': {
        const quote = quoteV2DysonFacilityPurchase(
          source.state, source.revision, command.facilityId,
        )
        const result = commitV2DysonFacilityPurchase(quote, source.state, source.revision)
        return result.accepted && result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : result.accepted ? source : null
      }
      case 'dyson.purchase-mega-structure': {
        const quote = quoteV2DysonFacilityPurchase(
          source.state, source.revision, command.facilityId,
        )
        const result = commitV2DysonFacilityPurchase(quote, source.state, source.revision)
        return result.accepted && result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : result.accepted ? source : null
      }
      case 'dyson.run-automation': {
        const result = runV2DysonAutomationTick(
          source.state,
          source.revision,
          command.policy === 'force-buy-max' ? 'force-buy-max' : 'preserve-configured-mode',
        )
        return result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : source
      }
      case 'research.purchase': {
        const quote = quoteV2ResearchPurchase(
          source.state,
          source.runtime,
          source.revision,
          command.researchId as Parameters<typeof quoteV2ResearchPurchase>[3],
        )
        const result = commitV2ResearchPurchase(
          quote, source.state, source.runtime, source.revision,
        )
        return result.accepted && result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : result.accepted ? source : null
      }
      case 'research.run-automation': {
        const result = runV2ResearchAutomationTick(
          source.state, source.runtime, source.revision,
        )
        return result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : source
      }
      case 'skill.purchase':
        return this.#skillResult(source, purchaseCanonicalSkillV2(source.state, command.skillId))
      case 'skill.refund':
        return this.#skillResult(source, refundCanonicalSkillV2(source.state, command.skillId))
      case 'skill.reset':
        return this.#skillResult(source, resetCanonicalSkillsV2(source.state))
      case 'skill.run-auto-assignment':
        return this.#skillResult(source, runCanonicalSkillAutoAssignmentV2(source.state))
      case 'skill.set-auto-assignment':
        return this.#setSkillPresetQueue(source, source.state.skills.selectedPreset, command.skillIds, true)
      case 'skill.set-preset-assignment':
        return this.#setSkillPresetQueue(source, command.slot, command.skillIds, false)
      case 'skill.set-preset-bot-distribution':
        return this.#setSkillPresetDistribution(source, command.slot, command.distribution)
      case 'skill.rename-preset':
        return this.#replaceSkillPreset(source, command.slot, {
          ...source.state.skills.presets[command.slot - 1], name: command.name,
        })
      case 'skill.set-preset-color':
        return this.#replaceSkillPreset(source, command.slot, {
          ...source.state.skills.presets[command.slot - 1], colorId: command.colorId,
        })
      case 'skill.select-preset':
        return this.#selectSkillPreset(source, command.slot)
      case 'skill.add-to-current-preset':
      case 'skill.remove-from-current-preset': {
        const slot = source.state.skills.selectedPreset
        const preview = command.kind === 'skill.add-to-current-preset'
          ? previewAddCanonicalSkillToPresetV2(source.state, slot, command.skillId)
          : previewRemoveCanonicalSkillFromPresetV2(source.state, slot, command.skillId)
        return preview.accepted
          ? this.#setSkillPresetQueue(source, slot, preview.nextSkillIds, true)
          : null
      }
      case 'skill.import-preset': {
        const parsed = parseCanonicalSkillPreset(command.serialized)
        if (!parsed.accepted) return null
        let imported = this.#stateWithSkillPreset(source.state, command.slot, {
          name: parsed.payload.presetName,
          botDistribution: parsed.payload.botDistribution,
          skillIds: parsed.payload.skillIds,
          colorId: parsed.payload.colorId ?? defaultSkillPresetColorId(command.slot),
        })
        if (source.state.skills.selectedPreset !== command.slot) {
          return this.#replaceState(source, imported)
        }
        imported = this.#loadSelectedSkillPreset(imported, command.slot, false)
        return this.#replaceState(source, imported)
      }
      case 'skill.set-tab-preset-automation': {
        const configured = cloneCanonicalGameStateV2({
          ...source.state,
          skills: {
            ...source.state.skills,
            tabPresetAutomation: {
              ...source.state.skills.tabPresetAutomation,
              [command.tab]: command.slot,
            },
          },
        })
        if (command.slot === 0 || command.slot === configured.skills.selectedPreset) {
          return this.#replaceState(source, configured)
        }
        return this.#replaceState(source, this.#loadSelectedSkillPreset(configured, command.slot))
      }
      case 'skill.apply-tab-preset-automation': {
        const slot = source.state.skills.tabPresetAutomation[command.tab]
        return slot === 0 || slot === source.state.skills.selectedPreset
          ? source
          : this.#selectSkillPreset(source, slot)
      }
      case 'skill.set-auto-assign-non-refundable':
        return this.#replaceState(source, {
          ...source.state,
          skills: { ...source.state.skills, autoAssignNonRefundable: command.enabled },
        })
      case 'infinity.purchase-shop-item': {
        const quote = quoteInfinityShopPurchaseV2(source.state, source.revision, command.itemId)
        const result = commitInfinityShopPurchaseV2(quote, source.state, source.revision)
        return result.accepted
          ? this.#publicationWithState(source, result.state, result.revision)
          : null
      }
      case 'infinity.set-break-target':
        if (
          !source.state.quantum.unlocks.breakTheLoop ||
          command.target < 1n ||
          command.target > 2_147_483_647n
        ) return null
        return this.#replaceState(source, {
          ...source.state,
          infinity: {
            ...source.state.infinity,
            breakTarget: gameDecimalFromBigInt(command.target),
          },
        })
      case 'dream.purchase-foundational': {
        const request = command.purchase === 'hunters' || command.purchase === 'gatherers'
          ? Object.freeze({
              kind: 'influence-purchase' as const,
              purchaseId: command.purchase,
              mode: source.state.dyson.automation.buyMode,
            })
          : Object.freeze({
              kind: 'boost' as const,
              boostId: command.purchase === 'community-boost' ? 'community' as const : 'factories' as const,
            })
        return this.#commitDream(source, request)
      }
      case 'dream.purchase-space-age':
        return this.#commitDream(source, Object.freeze({
          kind: 'influence-purchase' as const,
          purchaseId: command.purchase,
          mode: command.quantity === undefined
            ? source.state.dyson.automation.buyMode
            : command.quantity === 1 ? 'buy-1' as const
              : command.quantity === 10 ? 'buy-10' as const
                : command.quantity === 50 ? 'buy-50' as const
                  : command.quantity === 100 ? 'buy-100' as const
                    : 'buy-max' as const,
        }))
      case 'dream.purchase-upgrade':
        return this.#commitDream(source, Object.freeze({
          kind: 'dream-upgrade' as const,
          upgradeId: command.upgradeId as Extract<
            Parameters<typeof quoteDreamCommandV2>[1],
            { readonly kind: 'dream-upgrade' }
          >['upgradeId'],
        }) as Parameters<typeof quoteDreamCommandV2>[1])
      case 'dream.start-education':
        return this.#commitDream(source, Object.freeze({
          kind: 'education-start' as const,
          educationId: command.educationId,
        }))
      case 'reality.purchase-upgrade':
        return this.#commitDream(source, Object.freeze({
          kind: 'reality-upgrade' as const,
          upgradeId: command.upgradeId,
        }))
      case 'reality.gather-influence': {
        const result = gatherRealityInfluenceV2(source.state)
        return result.accepted && result.changed
          ? this.#publicationWithState(source, result.state, source.revision + 1)
          : result.accepted ? source : null
      }
      case 'dream.request-reset':
        return this.#commitDreamReset(source, 'automatic')
      case 'dream.request-black-hole-reset':
        return this.#commitDreamReset(source, 'black-hole')
      case 'quantum.purchase-upgrade': {
        const quote = quoteQuantumUpgradeV2(
          source.state,
          source.revision,
          command.upgradeId as Parameters<typeof quoteQuantumUpgradeV2>[2],
          command.quantity === undefined ? 'buy-1' : command.quantity === 'max' ? 'buy-max' : `buy-${command.quantity}` as Parameters<typeof quoteQuantumUpgradeV2>[3],
        )
        const result = commitQuantumUpgradeV2(quote, source.state, source.revision)
        return result.accepted && result.changed
          ? this.#publicationWithState(source, result.state, result.revision)
          : result.accepted ? source : null
      }
      case 'quantum.request-leap': {
        const quote = quoteCanonicalQuantumResetV2(source, Object.freeze({ kind: 'quantum-action' }))
        const result = commitCanonicalQuantumResetV2(quote, source)
        return result.accepted && result.publication !== null ? result.publication : null
      }
      case 'avocado.feed': {
        const account = command.source === 'strange-matter'
          ? registerAvocadoStrangeMatterAccountV2ForOwner(
              source.revision,
              source.state.dream.strangeMatter,
            )
          : null
        const quote = quoteAvocadoCommandV2(source, Object.freeze({
          kind: 'feed-all',
          source: command.source,
        }), account)
        const result = commitAvocadoCommandV2(quote, source)
        return result.accepted && result.publication !== null ? result.publication : null
      }
      case 'avocado.complete-meditation-step': {
        const quote = quoteAvocadoCommandV2(source, Object.freeze({
          kind: 'meditation-step',
          stepIndex: command.requiredStepIndex,
        }))
        const result = commitAvocadoCommandV2(quote, source)
        return result.accepted && result.publication !== null ? result.publication : null
      }
      case 'dyson.set-buy-mode':
        return this.#replaceState(source, {
          ...source.state,
          dyson: { ...source.state.dyson, automation: { ...source.state.dyson.automation, buyMode: command.buyMode } },
        })
      case 'dyson.set-rounded-bulk-buy':
        return this.#replaceState(source, {
          ...source.state,
          dyson: { ...source.state.dyson, automation: { ...source.state.dyson.automation, roundedBulkBuy: command.enabled } },
        })
      case 'dyson.set-facility-automation':
        return this.#replaceState(source, {
          ...source.state,
          dyson: { ...source.state.dyson, automation: { ...source.state.dyson.automation, enabledFacilities: { ...source.state.dyson.automation.enabledFacilities, [command.facilityId]: command.enabled } } },
        })
      case 'dyson.set-bot-distribution': {
        if (source.state.quantum.unlocks.botMultitasking ||
          !Number.isFinite(command.distribution)) return null
        const distribution = normalizeBotDistribution(command.distribution)
        const allocation = allocateV2Bots(source.state, distribution)
        const slot = source.state.skills.selectedPreset
        const presets = [...source.state.skills.presets]
        presets[slot - 1] = Object.freeze({
          ...presets[slot - 1]!, botDistribution: distribution,
        })
        return this.#replaceState(source, {
          ...source.state,
          dyson: {
            ...source.state.dyson,
            botDistribution: distribution,
            ...allocation,
          },
          skills: { ...source.state.skills, presets: presets as unknown as CanonicalGameStateV2['skills']['presets'] },
        })
      }
      case 'research.set-buy-mode':
        return this.#replaceState(source, {
          ...source.state,
          research: { ...source.state.research, automation: { ...source.state.research.automation, buyMode: command.buyMode } },
        })
      case 'research.set-rounded-bulk-buy':
        return this.#replaceState(source, {
          ...source.state,
          research: { ...source.state.research, automation: { ...source.state.research.automation, roundedBulkBuy: command.enabled } },
        })
      case 'research.set-automation':
        return this.#replaceState(source, {
          ...source.state,
          research: { ...source.state.research, automation: { ...source.state.research.automation, enabledById: { ...source.state.research.automation.enabledById, [command.researchId]: command.enabled } } },
        })
      case 'time.set-double-time-rate':
        return this.#replaceState(source, {
          ...source.state,
          timeline: setV2DoubleTimeRate(source.state.timeline, command.rate),
        })
      case 'time.upgrade-stored-capacity': {
        if (this.#platform.cheater) return null
        const result = upgradeV2StoredTimeCapacity(source.state.timeline)
        return result.upgraded
          ? this.#replaceState(source, { ...source.state, timeline: result.timeline })
          : null
      }
      case 'settings.set-navigation-item-visible':
        return this.#replaceState(source, {
          ...source.state,
          meta: {
            ...source.state.meta,
            navigationVisibility: {
              ...source.state.meta.navigationVisibility,
              [command.item]: command.visible,
            },
          },
        })
      case 'tinker.start': {
        const result = startCanonicalTinkerV2(
          source.state,
          this.#tinker,
          this.#tinkerStatsV2(source),
          command.repeat,
        )
        this.#tinker = result.runtime
        if (result.state !== source.state) return this.#publicationWithState(source, result.state, source.revision + 1)
        this.#publishSnapshot()
        return source
      }
      case 'tinker.set-repeat': {
        const result = setCanonicalTinkerRepeatV2(
          source.state,
          this.#tinker,
          command.enabled,
        )
        this.#tinker = result.runtime
        this.#publishSnapshot()
        return source
      }
      default:
        return null
    }
  }

  #skillResult(
    source: Readonly<CanonicalRuntimePublicationV2>,
    result: ReturnType<typeof purchaseCanonicalSkillV2>,
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    if (!result.accepted) return null
    return result.changed
      ? this.#publicationWithState(source, result.state, source.revision + 1)
      : source
  }

  #setSkillPresetQueue(
    source: Readonly<CanonicalRuntimePublicationV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
    skillIds: readonly string[],
    synchronizeActive: boolean,
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    const current = source.state.skills.presets[slot - 1]
    const parsed = parseCanonicalSkillPreset(JSON.stringify({
      version: 1,
      presetName: current.name,
      botDistribution: current.botDistribution,
      skillIds,
      colorId: current.colorId,
    }))
    if (!parsed.accepted) return null
    const state = this.#stateWithSkillPreset(source.state, slot, {
      ...current,
      skillIds: parsed.payload.skillIds,
    })
    return this.#replaceState(source, synchronizeActive
      ? {
          ...state,
          skills: { ...state.skills, activeAutoAssignment: parsed.payload.skillIds },
        }
      : state)
  }

  #setSkillPresetDistribution(
    source: Readonly<CanonicalRuntimePublicationV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
    distribution: number,
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    if (!Number.isFinite(distribution)) return null
    return this.#replaceSkillPreset(source, slot, {
      ...source.state.skills.presets[slot - 1],
      botDistribution: normalizeBotDistribution(distribution),
    })
  }

  #replaceSkillPreset(
    source: Readonly<CanonicalRuntimePublicationV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
    preset: CanonicalGameStateV2['skills']['presets'][number],
  ): Readonly<CanonicalRuntimePublicationV2> {
    return this.#replaceState(source, this.#stateWithSkillPreset(source.state, slot, preset))
  }

  #stateWithSkillPreset(
    state: Readonly<CanonicalGameStateV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
    preset: CanonicalGameStateV2['skills']['presets'][number],
  ): CanonicalGameStateV2 {
    const presets = [...state.skills.presets]
    presets[slot - 1] = Object.freeze({ ...preset, skillIds: Object.freeze([...preset.skillIds]) })
    return cloneCanonicalGameStateV2({
      ...state,
      skills: { ...state.skills, presets: presets as unknown as CanonicalGameStateV2['skills']['presets'] },
    })
  }

  #selectSkillPreset(
    source: Readonly<CanonicalRuntimePublicationV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    return this.#replaceState(source, this.#loadSelectedSkillPreset(source.state, slot))
  }

  #loadSelectedSkillPreset(
    state: Readonly<CanonicalGameStateV2>,
    slot: CanonicalGameStateV2['skills']['selectedPreset'],
    saveCurrent = true,
  ): CanonicalGameStateV2 {
    const current = state.skills.selectedPreset
    const saved = saveCurrent
      ? this.#stateWithSkillPreset(state, current, {
          ...state.skills.presets[current - 1],
          skillIds: state.skills.activeAutoAssignment,
          botDistribution: state.dyson.botDistribution,
        })
      : state
    const target = saved.skills.presets[slot - 1]
    const reset = resetCanonicalSkillsV2(saved)
    if (!reset.accepted) throw new Error(reset.reason)
    const loaded = cloneCanonicalGameStateV2({
      ...reset.state,
      dyson: {
        ...reset.state.dyson,
        botDistribution: target.botDistribution,
        ...allocateV2Bots(reset.state, target.botDistribution),
      },
      skills: {
        ...reset.state.skills,
        selectedPreset: slot,
        activeAutoAssignment: [...target.skillIds],
      },
    })
    const assigned = runCanonicalSkillAutoAssignmentV2(loaded)
    if (!assigned.accepted) throw new Error(assigned.reason)
    return cloneCanonicalGameStateV2({
      ...assigned.state,
      dyson: {
        ...assigned.state.dyson,
        ...allocateV2Bots(assigned.state, target.botDistribution),
      },
    })
  }

  #commitDream(
    source: Readonly<CanonicalRuntimePublicationV2>,
    request: Parameters<typeof quoteDreamCommandV2>[1],
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    const quote = quoteDreamCommandV2(source, request)
    const result = commitDreamCommandV2(quote, source)
    return result.accepted && result.publication !== null
      ? result.publication
      : null
  }

  #commitDreamReset(
    source: Readonly<CanonicalRuntimePublicationV2>,
    kind: 'automatic' | 'black-hole',
  ): Readonly<CanonicalRuntimePublicationV2> | null {
    const quote = quoteCanonicalDreamResetV2(source, Object.freeze({ kind }))
    const result = commitCanonicalDreamResetV2(quote, source)
    return result.accepted && result.publication !== null
      ? result.publication
      : null
  }

  #replaceState(
    source: Readonly<CanonicalRuntimePublicationV2>,
    state: Parameters<typeof cloneCanonicalGameStateV2>[0],
  ): Readonly<CanonicalRuntimePublicationV2> {
    return this.#publicationWithState(
      source,
      cloneCanonicalGameStateV2(state),
      source.revision + 1,
    )
  }

  #publicationWithState(
    source: Readonly<CanonicalRuntimePublicationV2>,
    state: Readonly<CanonicalGameStateV2>,
    revision: number,
  ): Readonly<CanonicalRuntimePublicationV2> {
    const derived = deriveDysonV2FromCauses(state, source.runtime)
    return adoptPreparedCanonicalRuntimePublicationV2(
      APPLICATION_AUTHORITY,
      source,
      Object.freeze({
        revision,
        state,
        runtime: Object.freeze({
          dysonEvaluationSnapshot: derived.nextEvaluationSnapshot,
          dysonTuningProfile: source.runtime.dysonTuningProfile,
        }),
      }),
    )
  }

  #adopt(publication: Readonly<CanonicalRuntimePublicationV2>): void {
    this.#publication = publication
    this.#storedTimeHost?.adoptExternalPublication(publication, this.#platform)
    this.#publishSnapshot()
    this.#scheduleCheckpoint()
  }

  async #dispatchStoredTime(
    source: Readonly<CanonicalRuntimePublicationV2>,
    requestedSeconds: number,
    activationRevision: Readonly<{ session: number; state: number }>,
  ): Promise<UiRuntimePlayerCommandResult> {
    if (this.#platform.cheater) {
      return Object.freeze({
        status: 'rejected', kind: 'stored-time', code: 'V2-STORED-TIME-INTEGRITY-COMPROMISED',
        reason: 'Stored Time is disabled because this save is marked as integrity-compromised.',
        stale: false, stateRevision: source.revision, activationRevision,
      })
    }
    const host = this.#storedTimeHost
    if (host === null) {
      return Object.freeze({
        status: 'rejected', kind: 'stored-time', code: 'V2-STORED-TIME-UNAVAILABLE',
        reason: 'Stored Time is unavailable in this runtime.', stale: false,
        stateRevision: source.revision, activationRevision,
      })
    }
    this.#stopActiveTimer()
    await this.#awaitActiveAdvance()
    try {
      const started = await host.startStoredTime(Object.freeze({
        expectedRevision: source.revision,
        requestedDurationSeconds: requestedSeconds,
      }))
      if (started.status !== 'started') {
        return Object.freeze({
          status: 'rejected', kind: 'stored-time', code: `V2-STORED-TIME-${started.status}`,
          reason: started.error ?? `Stored Time ended as ${started.status}.`, stale: false,
          stateRevision: source.revision, activationRevision,
        })
      }
      const terminal = await host.awaitStoredTimeTerminal()
      if (terminal.status !== 'completed' && terminal.status !== 'cancelled' && terminal.status !== 'paused') {
        return Object.freeze({
          status: 'rejected', kind: 'stored-time', code: `V2-STORED-TIME-${terminal.status}`,
          reason: terminal.error ?? `Stored Time ended as ${terminal.status}.`, stale: false,
          stateRevision: source.revision, activationRevision,
        })
      }
      this.#publication = terminal.publication
      this.#durableRevision = terminal.publication.revision
      this.#publishSnapshot()
      const consumed = Math.min(
        requestedSeconds,
        Math.max(0, source.state.timeline.storedTimeAvailableSeconds -
          terminal.publication.state.timeline.storedTimeAvailableSeconds),
      )
      return Object.freeze({
        status: terminal.status === 'completed' ? 'accepted' : 'partial',
        kind: 'stored-time',
        admittedSeconds: requestedSeconds,
        consumedSeconds: consumed,
        remainingSeconds: Math.max(0, requestedSeconds - consumed),
        durableRevision: terminal.publication.revision,
        stateRevision: terminal.publication.revision,
        activationRevision,
      })
    } finally {
      if (this.#lifecycle?.currentPhase() === 'active' || this.#lifecycle === null) {
        this.#startActiveTimer()
      }
    }
  }

  async #advanceActive(): Promise<void> {
    if (this.#advancing || this.#publication === null || this.#status.phase !== 'ready') return
    this.#advancing = true
    const started = performance.now()
    const source = this.#publication
    try {
      const result = await stageCanonicalRuntimeAdvanceV2(source, Object.freeze({
        expectedRevision: source.revision,
        durationSeconds: 0.1,
        mode: 'active' as const,
        context: Object.freeze({
          automationIntervalSeconds: 0.1,
          timerAggregationAuthority: null,
          quantumEpochAuthority: null,
          dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
          catalogLookup: null,
          infinityRewardAuthority: this.#infinityRewardAuthority(),
        }),
        cancelRequested: null,
      }))
      document.documentElement.dataset.v2LastEventAdvanceMs =
        (performance.now() - started).toFixed(3)
      if (result.changed && this.#publication === source) this.#adopt(result.candidate)
      if (this.#publication !== null) this.#advanceTinker(this.#publication, 0.1)
    } finally {
      const elapsed = performance.now() - started
      this.#maxActiveAdvanceMs = Math.max(this.#maxActiveAdvanceMs, elapsed)
      document.documentElement.dataset.v2LastActiveAdvanceMs = elapsed.toFixed(3)
      document.documentElement.dataset.v2MaxActiveAdvanceMs =
        this.#maxActiveAdvanceMs.toFixed(3)
      this.#advancing = false
    }
  }

  #startActiveTimer(): void {
    if (this.#activeTimer !== null || this.#status.phase !== 'ready') return
    this.#activeTimer = setInterval(() => { this.#queueActiveAdvance() }, 100)
  }

  #stopActiveTimer(): void {
    if (this.#activeTimer !== null) clearInterval(this.#activeTimer)
    this.#activeTimer = null
  }

  #queueActiveAdvance(): void {
    if (this.#activeAdvancePromise !== null) return
    const operation = this.#advanceActive()
    this.#activeAdvancePromise = operation
    void operation.then(() => {
      if (this.#activeAdvancePromise === operation) this.#activeAdvancePromise = null
    }, () => {
      if (this.#activeAdvancePromise === operation) this.#activeAdvancePromise = null
    })
  }

  async #awaitActiveAdvance(): Promise<void> {
    await this.#activeAdvancePromise
  }

  async #handleLifecycle(phase: LifecyclePhase): Promise<void> {
    const host = this.#storedTimeHost
    if (host === null || this.#publication === null || this.#status.phase !== 'ready') return
    if (phase !== 'active') {
      this.#stopActiveTimer()
      await this.#awaitActiveAdvance()
      await this.requestCheckpoint()
      host.adoptExternalPublication(this.#publication, this.#platform)
      const paused = await host.pauseForLifecycle(phase)
      if (paused.status === 'paused') {
        this.#publication = paused.publication
        this.#durableRevision = paused.publication.revision
        this.#publishSnapshot()
      }
      return
    }
    const current = host.snapshot()
    if (current.state.timeline.lastSuspendedAtLegacyText !== null) {
      const returned = await host.returnFromSuspension(Object.freeze({
        expectedRevision: current.revision,
        nowUtcMilliseconds: Date.now(),
        savedAtUtc: new Date().toISOString(),
        restartMonotonicSampling: () => undefined,
      }))
      if (returned.status !== 'ready') {
        throw new Error(returned.error ?? `V2 return ended as ${returned.status}.`)
      }
      this.#publication = returned.publication
      this.#durableRevision = returned.publication.revision
      this.#publishSnapshot()
    }
    this.#startActiveTimer()
  }

  #scheduleCheckpoint(): void {
    if (this.#checkpointTimer !== null) return
    this.#checkpointTimer = setTimeout(() => {
      this.#checkpointTimer = null
      void this.requestCheckpoint()
    }, 5_000)
  }

  #publishSnapshot(): void {
    if (this.#publication === null) return
    const started = performance.now()
    this.#snapshot = selectFrontendApplicationSnapshotV2(
      this.#publication,
      Object.freeze({
        session: this.#sessionRevision,
        state: this.#publication.revision,
        durable: this.#durableRevision,
      }),
      this.#publication.revision === this.#durableRevision ? 'clean' : 'dirty',
      this.#previewDemand,
      this.#tinker,
      this.#infinityRewardAuthority(),
      this.#platform.cheater,
    )
    document.documentElement.dataset.v2LastProjectionMs =
      (performance.now() - started).toFixed(3)
    this.#notifySnapshot()
  }

  async #checkpointPublication(publication: Readonly<CanonicalRuntimePublicationV2>): Promise<void> {
    await this.#repository.checkpointPrepared(Object.freeze({
      savedAtUtc: new Date().toISOString(),
      state: publication.state,
      runtime: publication.runtime,
    }), this.#platform, publication.revision)
  }

  async previewImport(request: UiRuntimeImportRequest) {
    try {
      const text = await requestText(request)
      let state: Readonly<CanonicalGameStateV2>
      try {
        state = decodeSchema13WebSave(text).state
      } catch {
        state = migratePreparedSaveToV2(
          prepareImportedSaveText(
            text,
            request.importedAtUtc,
            undefined,
            { kind: 'manual-shared-import', importedAtUtc: request.importedAtUtc },
          ),
          Object.freeze({ kind: 'trusted-same-device' }),
        ).state
      }
      return Object.freeze({
        accepted: true as const,
        preview: Object.freeze({
          infinityPoints: previewIntegerDecimal(addGameDecimals(
            state.infinity.availablePoints,
            state.infinity.allocatedPoints,
          )),
          quantumPoints: previewIntegerDecimal(state.quantum.lifetimeEarnedShards),
          skillPoints: state.skills.points,
        }),
      })
    } catch (error) {
      return Object.freeze({
        accepted: false as const,
        code: 'invalid-save',
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async importSave(request: UiRuntimeImportRequest): Promise<UiRuntimeImportResult> {
    return this.#serializeMutation(() => this.#importSave(request))
  }

  async #importSave(request: UiRuntimeImportRequest): Promise<UiRuntimeImportResult> {
    const resumeActive = this.#activeTimer !== null
    this.#stopActiveTimer()
    await this.#awaitActiveAdvance()
    let committed = false
    try {
      const text = await requestText(request)
      const receiving = this.#requirePublication()
      await this.#checkpointPublication(receiving)
      this.#durableRevision = receiving.revision
      const checkpoint = await this.#repository.importPortable(text, this.#platform)
      const decoded = decodeSchema13WebSave(checkpoint.portableSave)
      const imported = createCanonicalRuntimePublicationV2(Object.freeze({
        revision: checkpoint.revision,
        state: decoded.state,
        runtime: decoded.runtime,
      }))
      committed = true
      this.#storedTimeHost?.adoptExternalPublication(imported, checkpoint.platform)
      this.#publication = imported
      this.#durableRevision = checkpoint.revision
      this.#platform = checkpoint.platform
      this.#recoveryText = await this.#repository.exportRetainedImport()
      this.#sessionRevision += 1
      this.#publishSnapshot()
      return Object.freeze({
        imported: true, sessionRevision: this.#sessionRevision,
        recoveryAvailable: true, lifecycleReset: true,
      })
    } catch (error) {
      return Object.freeze({
        imported: false, committed, code: 'invalid-save',
        reason: error instanceof Error ? error.message : String(error),
        recoveryAvailable: committed,
      })
    } finally {
      if (resumeActive && this.#status.phase === 'ready') this.#startActiveTimer()
    }
  }

  async exportLastRecovery(): Promise<boolean> {
    if (this.#recoveryText === null) return false
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([this.#recoveryText], { type: 'text/plain' }))
    anchor.download = 'idle-dyson-swarm-pre-schema13-recovery.txt'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
    return true
  }

  async copyLastRecovery(): Promise<boolean> {
    if (this.#recoveryText === null) return false
    await navigator.clipboard.writeText(this.#recoveryText)
    return true
  }

  async inspectStorage(): Promise<UiRuntimeStorageStatus> {
    const estimate = await navigator.storage?.estimate?.()
    return Object.freeze({
      persistenceSupported: navigator.storage?.persist !== undefined,
      persistenceRequested: false,
      persisted: await navigator.storage?.persisted?.() ?? false,
      usageBytes: estimate?.usage ?? null,
      quotaBytes: estimate?.quota ?? null,
      remainingBytes: estimate?.quota !== undefined && estimate.usage !== undefined
        ? estimate.quota - estimate.usage : null,
      quotaPressure: false,
    })
  }

  async exportCurrentSave(): Promise<boolean> {
    const publication = this.#publication
    if (publication === null) return false
    const text = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: new Date().toISOString(),
      state: publication.state,
      runtime: publication.runtime,
    }))
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    anchor.download = 'idle-dyson-swarm-v2-schema13.txt'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
    return true
  }

  #subscribeStatus(listener: UiRuntimeStatusListener): () => void {
    this.#statusListeners.add(listener)
    return () => { this.#statusListeners.delete(listener) }
  }

  #subscribeSnapshot(listener: (snapshot: DeepReadonly<FrontendApplicationSnapshot>) => void): () => void {
    this.#snapshotListeners.add(listener)
    return () => { this.#snapshotListeners.delete(listener) }
  }

  #setStatus(status: UiRuntimeFoundationStatus): void {
    this.#status = status
    for (const listener of this.#statusListeners) listener(status)
  }

  #notifySnapshot(): void {
    for (const listener of this.#snapshotListeners) listener(this.#snapshot)
  }

  #requirePublication(): Readonly<CanonicalRuntimePublicationV2> {
    if (this.#publication === null) throw new Error('The V2 game is not ready.')
    return this.#publication
  }

  #tinkerStatsV2(source: Readonly<CanonicalRuntimePublicationV2>) {
    return deriveCanonicalTinkerStatsV2(
      source.state,
      source.runtime.dysonEvaluationSnapshot.managerAssemblyLineProduction,
    )
  }

  #advanceTinker(
    source: Readonly<CanonicalRuntimePublicationV2>,
    seconds: number,
  ): void {
    if (!this.#tinker.running) return
    const advanceStarted = performance.now()
    const result = advanceCanonicalTinkerV2(
      source.state,
      this.#tinker,
      this.#tinkerStatsV2(source),
      seconds,
    )
    document.documentElement.dataset.v2LastTinkerAdvanceMs =
      (performance.now() - advanceStarted).toFixed(3)
    recordMaximumTiming(
      'v2MaxTinkerAdvanceMs',
      performance.now() - advanceStarted,
    )
    this.#tinker = result.runtime
    if (result.completions === 0) {
      this.#publishSnapshot()
      return
    }
    const commitStarted = performance.now()
    const publicationStarted = performance.now()
    const publication = this.#publicationWithState(
      source,
      result.state,
      source.revision + 1,
    )
    document.documentElement.dataset.v2LastTinkerPublicationMs =
      (performance.now() - publicationStarted).toFixed(3)
    const adoptionStarted = performance.now()
    this.#adopt(publication)
    document.documentElement.dataset.v2LastTinkerAdoptionMs =
      (performance.now() - adoptionStarted).toFixed(3)
    document.documentElement.dataset.v2LastTinkerCommitMs =
      (performance.now() - commitStarted).toFixed(3)
  }

  #serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#mutationTail.then(operation, operation)
    this.#mutationTail = result.then(() => undefined, () => undefined)
    return result
  }
}

function normalizeBotDistribution(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100
}

function recordMaximumTiming(key: string, elapsed: number): void {
  const current = Number(document.documentElement.dataset[key] ?? 0)
  document.documentElement.dataset[key] = Math.max(current, elapsed).toFixed(3)
}

function allocateV2Bots(
  state: Readonly<CanonicalGameStateV2>,
  distribution: number,
): Readonly<Pick<CanonicalGameStateV2['dyson'], 'workers' | 'researchers'>> {
  if (state.quantum.unlocks.botMultitasking) {
    return Object.freeze({
      workers: state.dyson.bots,
      researchers: state.dyson.bots,
    })
  }
  const wholeBots = floorGameDecimal(state.dyson.bots)
  const researcherFraction = Math.fround(distribution)
  const workerFraction = Math.fround(Math.fround(1 - researcherFraction) * 100) / 100
  return Object.freeze({
    workers: ceilGameDecimal(multiplyGameDecimals(
      wholeBots,
      gameDecimalFromNumber(workerFraction),
    )),
    researchers: floorGameDecimal(multiplyGameDecimals(
      wholeBots,
      gameDecimalFromNumber(researcherFraction),
    )),
  })
}

function previewIntegerDecimal(value: Parameters<typeof gameDecimalToBigIntChecked>[0]): bigint {
  try {
    const exact = gameDecimalToBigIntChecked(value)
    return exact > DISCRETE_MAXIMUM ? DISCRETE_MAXIMUM : exact
  } catch {
    return DISCRETE_MAXIMUM
  }
}

function developmentRejected(
  code: string,
  reason: string,
): Readonly<{ readonly applied: false; readonly code: string; readonly reason: string }> {
  return Object.freeze({ applied: false as const, code, reason })
}

function invalidDevelopmentAmount(label: string) {
  return developmentRejected(
    'V2-DEVELOPMENT-AMOUNT-INVALID',
    `${label} amount must be non-negative and finite.`,
  )
}

function developmentApplied(
  stateRevision: number,
  durableRevision: number,
): UiRuntimeDevelopmentActionResult {
  return Object.freeze({ applied: true, stateRevision, durableRevision })
}

function clampDevelopmentBigInt(value: bigint): bigint {
  return value > DISCRETE_MAXIMUM ? DISCRETE_MAXIMUM : value
}

async function requestText(request: UiRuntimeImportRequest): Promise<string> {
  if (request.source === 'file') return request.file.text()
  if (request.source === 'drop') {
    const file = request.transfer.files[0]
    return file === undefined ? request.transfer.getData('text/plain') : file.text()
  }
  return request.text
}
