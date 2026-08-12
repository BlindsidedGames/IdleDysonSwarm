import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createCanonicalRuntimePublicationV2 } from '../../application/canonicalRuntimeSessionV2'
import { createDeterministicUnityFirstRunPreparedSave } from '../../application/firstRun/unityFirstRunSave'
import { issueInfinityRewardAuthorityV2ForApplication } from '../../application/infinityRewardAuthorityV2'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import { gameDecimalFromCanonicalString, gameDecimalToCanonicalString } from '../../math/gameDecimal'
import { detectNativeHostBridge } from '../../platform/nativeHostBridge'
import { encodeSchema13WebSave, SCHEMA13_WEB_SAVE_PREFIX } from '../../save/schema13'
import { Stage7V2CertificationPanel } from './Stage7V2CertificationPanel'
import { Stage7V2CertificationHost } from './certificationHost'
import { createStage7V2CertificationUiBinding } from './certificationUiModel'
import { createStage7V2NativeCertificationStorage } from './nativeRootedStorage'
import { Stage7V2CertificationRepository } from './repository'
import { Stage7V2NativeWriterLeaseManager } from './writerLease'
import type { Stage7V2CertificationStorage } from './contracts'
import type { NativeHostBridgeApi } from '../../platform/nativeHostBridge'
import { captureStage7V2DeviceEvidence } from './deviceEvidence'
import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate'
import { getTrustedStoredTimeWorkerIdentityV2 } from '../../workers/storedTimeV2/workerIdentityV2'

declare const __STAGE7_NATIVE_CERTIFICATION__: boolean

const BUILD_SCOPE = 'stage7-device-certification-v1'
const PLATFORM = Object.freeze({
  debugOptions: false,
  debugEverEnabled: false,
  cheater: false,
  unlockAllTabs: false,
})
type PolicyFact = Readonly<{ rawTicks: string; checkpoints: number; maximumChunk: number; maximumAtomic: number }>
interface ScenarioFacts {
  readonly initialRevision: number | null
  readonly saveReadback: boolean
  readonly reloadReadback: boolean
  readonly fast: PolicyFact | null
  readonly balanced: PolicyFact | null
  readonly exact: PolicyFact | null
  readonly lifecycle: boolean
  readonly longOfflineSeconds: number | null
  readonly extremeImported: boolean
  readonly extremeAdvance: boolean
  readonly corruption: boolean
  readonly forwardSchema: boolean
  readonly developerPurchase: boolean
  readonly developerFreeEnable: boolean
  readonly developerShardDebit: string | null
  readonly developerMatterDebit: string | null
  readonly developerLifetimeDelta: string | null
  readonly preAckRecovery: boolean
  readonly postCheckpointRecovery: boolean
  readonly updateIdentityRecovery: boolean
  readonly updateBaseline: Readonly<{
    buildId: string
    revision: number
    storedTimeAvailableSeconds: number
    portableHash: string
  }> | null
  readonly pendingRecovery: 'pre-ack' | 'post-checkpoint' | null
}
const EMPTY_FACTS: ScenarioFacts = Object.freeze({
  initialRevision: null, saveReadback: false, reloadReadback: false,
  fast: null, balanced: null, exact: null, lifecycle: false,
  longOfflineSeconds: null, extremeImported: false, extremeAdvance: false,
  corruption: false, forwardSchema: false, developerPurchase: false,
  developerFreeEnable: false, developerShardDebit: null,
  developerMatterDebit: null, developerLifetimeDelta: null,
  preAckRecovery: false, postCheckpointRecovery: false, pendingRecovery: null,
  updateIdentityRecovery: false,
  updateBaseline: null,
})

export function DeviceCertificationEntry() {
  const [binding, setBinding] = useState<ReturnType<typeof createStage7V2CertificationUiBinding> | null>(null)
  const [host, setHost] = useState<Stage7V2CertificationHost | null>(null)
  const [repository, setRepository] = useState<Stage7V2CertificationRepository | null>(null)
  const [storage, setStorage] = useState<Readonly<Stage7V2CertificationStorage> | null>(null)
  const [bridge, setBridge] = useState<NativeHostBridgeApi | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(410)
  const factsRef = useRef<ScenarioFacts>(EMPTY_FACTS)
  const [status, setStatus] = useState('Idle. No repository or worker has been opened.')

  const start = async (): Promise<void> => {
    if (!__STAGE7_NATIVE_CERTIFICATION__) throw new Error('Certification flag is absent.')
    setStatus('Opening the build-scoped certification repository...')
    const bridge = detectNativeHostBridge()
    if (bridge?.removeCertificationFiles === undefined) {
      setStatus('Native certification bridge unavailable. Production storage was not touched.')
      return
    }
    const nativeStorage = createStage7V2NativeCertificationStorage(
      BUILD_SCOPE,
      bridge as typeof bridge & Required<Pick<typeof bridge, 'removeCertificationFiles'>>,
    )
    const repository = new Stage7V2CertificationRepository({
      buildScope: BUILD_SCOPE,
      storage: nativeStorage,
    })
    factsRef.current = await readScenarioFacts(repository)
    let current = await repository.recoverNewestValid()
    const reopenedDurable = current !== null
    if (current === null) {
      const migrated = migratePreparedSaveToV2(
        createDeterministicUnityFirstRunPreparedSave(),
        Object.freeze({ kind: 'trusted-same-device' }),
      )
      const seededState = cloneCanonicalGameStateV2(Object.freeze({
        ...migrated.state,
        timeline: Object.freeze({
          ...migrated.state.timeline,
          eventClockInitialized: true,
          automationTimeUntilNextEvent: 0.1,
          infinityBoundaryRemaining: 42_000_000,
          storedTimeCapacitySeconds: 42_000_000,
          storedTimeAvailableSeconds: 42_000_000,
        }),
      }))
      await repository.checkpoint(Object.freeze({
        savedAtUtc: new Date().toISOString(),
        state: seededState,
        runtime: migrated.runtime,
      }), PLATFORM, 0)
      current = await repository.recoverNewestValid()
    }
    if (current === null) throw new Error('Certification checkpoint readback failed.')
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: current.revision,
      state: current.save.state,
      runtime: current.save.runtime,
    }))
    const host = new Stage7V2CertificationHost(Object.freeze({
      initialPublication: publication,
      platform: current.platform,
      repository,
      writerLeases: new Stage7V2NativeWriterLeaseManager(BUILD_SCOPE),
      infinityRewardAuthority: issueInfinityRewardAuthorityV2ForApplication(
        Object.freeze({ doubleInfinityPoints: false }),
      ),
      nowUtc: () => new Date().toISOString(),
    }))
    const nextBinding = createStage7V2CertificationUiBinding(host, () => location.reload())
    await nextBinding.loadPolicy()
    setHost(host)
    setRepository(repository)
    setStorage(nativeStorage)
    setBridge(bridge)
    setBinding(nextBinding)
    factsRef.current = await persistFacts(repository, factsRef.current, {
      initialRevision: factsRef.current.initialRevision ?? publication.revision,
      saveReadback: true,
      reloadReadback: factsRef.current.reloadReadback || reopenedDurable,
    })
    setStatus(`Checkpoint/readback passed at durable revision ${publication.revision}. The real host is ready; no Stored Time job was auto-started.`)
  }

  const runStoredTimeSmoke = async (): Promise<void> => {
    if (host === null) return
    setStatus('Starting a bounded authentic Stored Time worker job...')
    const ready = await host.confirmDurableReadmission()
    if (ready.status !== 'ready') throw new Error(`Readmission returned ${ready.status}.`)
    const started = await host.startStoredTime(Object.freeze({
      expectedRevision: host.snapshot().revision,
      requestedDurationSeconds: durationSeconds,
    }))
    if (started.status !== 'started') throw new Error(`Start returned ${started.status}.`)
    const terminal = await host.awaitStoredTimeTerminal()
    const diagnostics = host.diagnosticsSnapshot()
    const policy = await host.readStoredTimePolicy()
    const policyFact = terminal.status === 'completed' && BigInt(diagnostics.computedRawTicks) >= 4_100n
      ? Object.freeze({
          rawTicks: diagnostics.computedRawTicks,
          checkpoints: diagnostics.checkpoints,
          maximumChunk: diagnostics.maximumChunkMilliseconds,
          maximumAtomic: diagnostics.maximumAtomicEventMilliseconds,
        })
      : null
    const money = gameDecimalToCanonicalString(host.snapshot().state.dyson.money)
    const recoveryPatch = factsRef.current.pendingRecovery === 'pre-ack'
      ? { preAckRecovery: terminal.status === 'completed', pendingRecovery: null as null }
      : factsRef.current.pendingRecovery === 'post-checkpoint'
        ? { postCheckpointRecovery: terminal.status === 'completed', pendingRecovery: null as null }
        : {}
    await markFacts({
      ...(policy === 'stored-time-fast-v1' ? { fast: policyFact } : {}),
      ...(policy === 'stored-time-balanced-v1' ? { balanced: policyFact } : {}),
      ...(policy === 'stored-time-exact-v1' ? { exact: policyFact } : {}),
      ...(factsRef.current.extremeImported ? { extremeAdvance: terminal.status === 'completed' && money === '1e1000' } : {}),
      ...recoveryPatch,
    })
    setStatus(`Worker smoke ${terminal.status}; raw ticks ${diagnostics.computedRawTicks}; checkpoints ${diagnostics.checkpoints}; durable revision ${host.snapshot().revision}; money ${money}.`)
  }

  const startInterruptedRecovery = async (afterCheckpoint: boolean): Promise<void> => {
    if (host === null) return
    const ready = await host.confirmDurableReadmission()
    if (ready.status !== 'ready') throw new Error(`Readmission returned ${ready.status}.`)
    const started = await host.startStoredTime(Object.freeze({
      expectedRevision: host.snapshot().revision,
      requestedDurationSeconds: durationSeconds,
    }))
    if (started.status !== 'started') throw new Error(`Start returned ${started.status}.`)
    if (!afterCheckpoint) {
      await markFacts({ pendingRecovery: 'pre-ack' })
      location.reload()
      return
    }
    const checkpointBaseline = host.diagnosticsSnapshot().checkpoints
    const deadline = Date.now() + 60_000
    while (host.diagnosticsSnapshot().checkpoints <= checkpointBaseline) {
      if (Date.now() >= deadline) throw new Error('No durable checkpoint arrived before interruption timeout.')
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    await markFacts({ pendingRecovery: 'post-checkpoint' })
    location.reload()
  }

  const runCorruptionRecoverySmoke = async (): Promise<void> => {
    if (host === null || repository === null || storage === null) return
    const publication = host.snapshot()
    const durable = await repository.loadCurrent()
    if (durable === null) throw new Error('Corruption certification requires a durable checkpoint.')
    await repository.checkpoint(Object.freeze({
      savedAtUtc: new Date().toISOString(),
      state: publication.state,
      runtime: publication.runtime,
    }), durable.platform, publication.revision)
    const expectedBackup = await storage.readText(repository.paths().backups[0])
    await storage.writeText(repository.paths().current, '{')
    const recovered = await repository.recoverNewestValid()
    if (recovered === null) throw new Error('Corrupt-envelope recovery found no verified backup.')
    if (await storage.readText(repository.paths().current) !== expectedBackup) {
      throw new Error('Corrupt-envelope recovery did not restore the exact verified checkpoint.')
    }
    await markFacts({ corruption: true })
    setStatus(`Corrupt envelope rejected; unchanged backup revision ${recovered.revision} restored.`)
  }

  const runForwardSchemaRecoverySmoke = async (): Promise<void> => {
    if (host === null || repository === null || storage === null) return
    const paths = repository.paths()
    const publication = host.snapshot()
    const durable = await repository.loadCurrent()
    if (durable === null) throw new Error('Forward-schema certification requires a durable checkpoint.')
    await repository.checkpoint(Object.freeze({
      savedAtUtc: new Date().toISOString(), state: publication.state, runtime: publication.runtime,
    }), durable.platform, publication.revision)
    const envelopeText = await storage.readText(paths.current)
    const expectedBackup = await storage.readText(paths.backups[0])
    const envelope = JSON.parse(envelopeText) as { portableSave: string }
    const prefix = SCHEMA13_WEB_SAVE_PREFIX
    if (!envelope.portableSave.startsWith(prefix)) throw new Error('Current checkpoint is not schema 13.')
    const decoded = Uint8Array.from(atob(envelope.portableSave.slice(prefix.length)), (character) => character.charCodeAt(0))
    const dto = JSON.parse(strFromU8(gunzipSync(decoded))) as Record<string, unknown>
    dto.schemaVersion = 14
    const compressed = gzipSync(strToU8(JSON.stringify(dto)), { level: 9, mtime: 0 })
    envelope.portableSave = `${prefix}${btoa(String.fromCharCode(...compressed))}`
    await storage.writeText(paths.current, JSON.stringify(envelope))
    const recovered = await repository.recoverNewestValid()
    if (recovered === null) throw new Error('Forward-schema recovery found no verified backup.')
    if (await storage.readText(paths.current) !== expectedBackup) {
      throw new Error('Forward-schema recovery did not restore the exact verified checkpoint.')
    }
    await markFacts({ forwardSchema: true })
    setStatus(`Valid envelope with forward-schema save rejected; unchanged backup revision ${recovered.revision} restored.`)
  }

  const exportEvidence = async (): Promise<void> => {
    if (host === null || bridge === null) return
    const diagnostics = host.diagnosticsSnapshot()
    const facts = factsRef.current
    const identity = await getTrustedStoredTimeWorkerIdentityV2(import.meta.env.VITE_BUILD_ID)
    const metadata = await bridge.metadata()
    const device = captureCertificationDeviceContext(
      await bridge.certificationDeviceContext?.(), bridge.target,
    )
    const policyFacts = [facts.fast, facts.balanced, facts.exact].filter(
      (fact): fact is PolicyFact => fact !== null,
    )
    const complete = facts.fast !== null && facts.balanced !== null && facts.exact !== null &&
      facts.developerPurchase && facts.developerFreeEnable && facts.lifecycle &&
      facts.corruption && facts.forwardSchema && facts.extremeAdvance &&
      facts.preAckRecovery && facts.postCheckpointRecovery && facts.reloadReadback
    const evidence = captureStage7V2DeviceEvidence({
      matrixId: device.matrixId,
      performedAtUtc: new Date().toISOString(), tester: null, deviceModel: device.deviceModel,
      physicalDevice: device.physicalDevice, osApiLevel: device.osApiLevel,
      osVersion: device.osVersion, webViewVersion: navigator.userAgent,
      appVersion: metadata.applicationVersion, buildId: import.meta.env.VITE_BUILD_ID,
      workerBuildId: identity.buildId, workerCatalogHash: identity.catalogHash,
      workerTuningHash: identity.tuningHash, policy: 'Fast+Balanced+Exact',
      schemaBefore: 13, schemaAfter: 13, initialRevision: facts.initialRevision,
      finalRevision: host.snapshot().revision, saveReadback: facts.saveReadback,
      reloadReadback: facts.reloadReadback, corruptionRecovery: facts.corruption,
      lifecyclePauseReturn: facts.lifecycle, forcedReloadRecovery: facts.preAckRecovery || facts.postCheckpointRecovery,
      longOfflineSeconds: facts.longOfflineSeconds, extremeDecimalCanonical: facts.extremeAdvance ? '1e1000' : null,
      updateIdentityRecovery: facts.updateIdentityRecovery, platformStateIsLocal: facts.developerFreeEnable,
      updateBuildAId: facts.updateBaseline?.buildId ?? null,
      updateBuildBId: facts.updateIdentityRecovery ? import.meta.env.VITE_BUILD_ID : null,
      updateBaselineRevision: facts.updateBaseline?.revision ?? null,
      updateBaselineStoredTimeSeconds: facts.updateBaseline?.storedTimeAvailableSeconds ?? null,
      updatePortableHash: facts.updateBaseline?.portableHash ?? null,
      portableSaveExcludesPlatform: facts.developerFreeEnable,
      maximumChunkMilliseconds: Math.max(0, ...policyFacts.map((fact) => fact.maximumChunk)),
      maximumAtomicEventMilliseconds: Math.max(0, ...policyFacts.map((fact) => fact.maximumAtomic)),
      fastRawTicks: facts.fast?.rawTicks ?? null,
      balancedRawTicks: facts.balanced?.rawTicks ?? null,
      exactRawTicks: facts.exact?.rawTicks ?? null,
      fastCompleted: facts.fast !== null, balancedCompleted: facts.balanced !== null,
      exactCompleted: facts.exact !== null,
      developerPurchaseVerified: facts.developerPurchase,
      developerFreeEnableVerified: facts.developerFreeEnable,
      developerShardDebit: facts.developerShardDebit,
      developerStrangeMatterDebit: facts.developerMatterDebit,
      developerLifetimeShardDelta: facts.developerLifetimeDelta,
      preAckRecovery: facts.preAckRecovery,
      postCheckpointRecovery: facts.postCheckpointRecovery,
      forwardSchemaRecovery: facts.forwardSchema,
      extremeAdvanceVerified: facts.extremeAdvance,
      result: complete ? 'PASS' : 'BLOCKED',
      notes: `status=${diagnostics.status}; checkpoints=${policyFacts.reduce((sum, fact) => sum + fact.checkpoints, 0)}; build=${metadata.buildNumber}`,
    })
    const text = JSON.stringify(evidence)
    await bridge.exportDiagnostics(Object.freeze({
      fileName: `stage7-certification-${Date.now()}.json`,
      mimeType: 'application/json',
      text,
    }))
    setStatus('Bounded native diagnostics evidence exported.')
  }

  const recordUpdateBaseline = async (): Promise<void> => {
    if (host === null || repository === null) return
    const portable = await repository.exportPortable()
    if (portable === null) throw new Error('Update baseline requires a durable checkpoint.')
    const baseline = Object.freeze({
      buildId: import.meta.env.VITE_BUILD_ID,
      revision: host.snapshot().revision,
      storedTimeAvailableSeconds: host.snapshot().state.timeline.storedTimeAvailableSeconds,
      portableHash: await sha256Hex(portable),
    })
    await markFacts({ updateBaseline: baseline, updateIdentityRecovery: false })
    setStatus(`Update baseline recorded for ${baseline.buildId} at revision ${baseline.revision}. Install build B without cleaning certification storage.`)
  }

  const verifyUpdateRecovery = async (): Promise<void> => {
    if (host === null || repository === null) return
    const baseline = factsRef.current.updateBaseline
    const portable = await repository.exportPortable()
    if (baseline === null || portable === null) throw new Error('No authentic update baseline is available.')
    if (baseline.buildId === import.meta.env.VITE_BUILD_ID ||
      baseline.revision !== host.snapshot().revision ||
      baseline.storedTimeAvailableSeconds !== host.snapshot().state.timeline.storedTimeAvailableSeconds ||
      baseline.portableHash !== await sha256Hex(portable)) {
      throw new Error('Build B did not preserve the exact build A durable baseline.')
    }
    await markFacts({ updateIdentityRecovery: true })
    setStatus(`Update identity recovery verified: ${baseline.buildId} -> ${import.meta.env.VITE_BUILD_ID}; revision ${baseline.revision} and Stored Time bank unchanged.`)
  }

  const runLifecycleSmoke = async (): Promise<void> => {
    if (host === null) return
    const before = host.snapshot().revision
    const paused = await host.pauseForLifecycle('native-background', 0.25)
    if (paused.status !== 'paused') throw new Error(`Pause returned ${paused.status}.`)
    const offlineSeconds = 42_000_000
    const now = Date.now() + offlineSeconds * 1_000
    const returned = await host.returnFromSuspension(Object.freeze({
      expectedRevision: host.snapshot().revision,
      nowUtcMilliseconds: now,
      savedAtUtc: new Date(now).toISOString(),
      restartMonotonicSampling: () => undefined,
    }))
    if (returned.status === 'ready') await markFacts({ lifecycle: true, longOfflineSeconds: offlineSeconds })
    setStatus(`Long-offline lifecycle ${returned.status}; ${offlineSeconds} seconds; revision ${before} -> ${host.snapshot().revision}.`)
  }

  const runExtremeImportSmoke = async (): Promise<void> => {
    if (host === null) return
    const source = host.snapshot()
    const extremeState = cloneCanonicalGameStateV2(Object.freeze({
      ...source.state,
      dyson: Object.freeze({
        ...source.state.dyson,
        money: gameDecimalFromCanonicalString('1e1000'),
      }),
    }))
    const imported = await host.importPortable(encodeSchema13WebSave(Object.freeze({
      savedAtUtc: new Date().toISOString(),
      state: extremeState,
      runtime: source.runtime,
    })))
    if (imported.status === 'ready') await markFacts({ extremeImported: true })
    setStatus(`Extreme 1e1000 import ${imported.status}; receiver-local platform state retained.`)
  }

  const runDeveloperPurchaseSmoke = async (): Promise<void> => {
    if (host === null || repository === null) return
    const durable = await repository.loadCurrent()
    if (durable === null) throw new Error('Developer certification requires a durable publication.')
    let source = host.snapshot()
    if (!durable.platform.debugEverEnabled) {
      const funded = cloneCanonicalGameStateV2(Object.freeze({
        ...source.state,
        quantum: Object.freeze({
          ...source.state.quantum,
          availableShards: gameDecimalFromCanonicalString('1e5'),
        }),
        dream: Object.freeze({
          ...source.state.dream,
          strangeMatter: gameDecimalFromCanonicalString('5e5'),
        }),
      }))
      const imported = await host.importPortable(encodeSchema13WebSave(Object.freeze({
        savedAtUtc: new Date().toISOString(), state: funded, runtime: source.runtime,
      })))
      if (imported.status !== 'ready') throw new Error(`Developer funding import returned ${imported.status}.`)
      source = host.snapshot()
    }
    const beforeShards = gameDecimalToCanonicalString(source.state.quantum.availableShards)
    const beforeMatter = gameDecimalToCanonicalString(source.state.dream.strangeMatter)
    const beforeLifetime = gameDecimalToCanonicalString(source.state.quantum.lifetimeEarnedShards)
    const result = await host.purchaseOrEnableDeveloperOptions()
    const afterShards = gameDecimalToCanonicalString(result.publication.state.quantum.availableShards)
    const afterMatter = gameDecimalToCanonicalString(result.publication.state.dream.strangeMatter)
    const afterLifetime = gameDecimalToCanonicalString(result.publication.state.quantum.lifetimeEarnedShards)
    if (result.accepted && result.changed) {
      if (!durable.platform.debugEverEnabled) {
        await markFacts({
          developerPurchase: true,
          developerShardDebit: `${beforeShards}->${afterShards}`,
          developerMatterDebit: `${beforeMatter}->${afterMatter}`,
          developerLifetimeDelta: `${beforeLifetime}->${afterLifetime}`,
        })
      } else if (!durable.platform.debugOptions) {
        await markFacts({ developerFreeEnable: true })
      }
    }
    setStatus(`Developer Options ${result.code}; purchased=${result.publication.platform.developerOptionsPurchased}; enabled=${result.publication.platform.developerOptionsEnabled}; shards ${beforeShards}->${afterShards}; matter ${beforeMatter}->${afterMatter}; lifetime ${beforeLifetime}->${afterLifetime}.`)
  }

  async function markFacts(patch: Partial<ScenarioFacts>): Promise<void> {
    if (repository === null) throw new Error('Certification repository is unavailable.')
    const next = captureScenarioFacts({ ...factsRef.current, ...patch })
    await repository.persistEvidenceDraft(JSON.stringify(next))
    factsRef.current = next
  }

  const prepareOwnedDisabledReload = async (): Promise<void> => {
    if (host === null || repository === null) return
    const publication = host.snapshot()
    await repository.checkpoint(Object.freeze({
      savedAtUtc: new Date().toISOString(), state: publication.state, runtime: publication.runtime,
    }), Object.freeze({
      debugOptions: false, debugEverEnabled: true, cheater: false, unlockAllTabs: false,
    }), publication.revision)
    location.reload()
  }

  return <main>
    <h1>Device certification</h1>
    <p>{status}</p>
    {binding === null
      ? <button type="button" onClick={() => void start()}>Run device certification</button>
      : <>
          <div>
            <label>Stored Time duration (seconds)
              <input type="number" min="0.1" max="42000000" step="0.1" value={durationSeconds}
                onChange={(event) => setDurationSeconds(Number(event.currentTarget.value))} />
            </label>
            <button type="button" onClick={() => void runStoredTimeSmoke()}>Start selected policy job</button>
            <button type="button" onClick={() => void startInterruptedRecovery(false)}>Interrupt before first acknowledgement</button>
            <button type="button" onClick={() => void startInterruptedRecovery(true)}>Interrupt after durable checkpoint</button>
            <button type="button" onClick={() => void runLifecycleSmoke()}>Run pause and return smoke</button>
            <button type="button" onClick={() => void runExtremeImportSmoke()}>Run 1e1000 import smoke</button>
            <button type="button" onClick={() => void runCorruptionRecoverySmoke()}>Run corrupt-envelope recovery</button>
            <button type="button" onClick={() => void runForwardSchemaRecoverySmoke().catch((error: unknown) => {
              setStatus(`Forward-schema recovery failed: ${error instanceof Error ? error.message : 'unknown error'}`)
            })}>Run forward-schema recovery</button>
            <button type="button" onClick={() => void runDeveloperPurchaseSmoke().catch((error: unknown) => {
              setStatus(`Developer Options failed: ${error instanceof Error ? error.message : 'unknown error'}`)
            })}>Purchase or enable Developer Options</button>
            <button type="button" onClick={() => void prepareOwnedDisabledReload()}>Prepare owned-disabled reload</button>
            <button type="button" onClick={() => void exportEvidence()}>Export certification evidence</button>
            <button type="button" onClick={() => void recordUpdateBaseline()}>Record optional build A update baseline</button>
            <button type="button" onClick={() => void verifyUpdateRecovery()}>Verify optional build B update observation</button>
            <button type="button" onClick={() => location.reload()}>Force reload from durable state</button>
          </div>
          <Stage7V2CertificationPanel binding={binding} />
        </>}
  </main>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><DeviceCertificationEntry /></StrictMode>,
)

async function readScenarioFacts(repository: Stage7V2CertificationRepository): Promise<ScenarioFacts> {
  const text = await repository.readEvidenceDraft()
  if (text === null) return EMPTY_FACTS
  return captureScenarioFacts(JSON.parse(text) as unknown)
}

async function persistFacts(
  repository: Stage7V2CertificationRepository,
  current: ScenarioFacts,
  patch: Partial<ScenarioFacts>,
): Promise<ScenarioFacts> {
  const next = captureScenarioFacts({ ...current, ...patch })
  await repository.persistEvidenceDraft(JSON.stringify(next))
  return next
}

function captureScenarioFacts(value: unknown): ScenarioFacts {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Certification evidence draft is invalid.')
  const record = value as Record<string, unknown>
  const expected = Object.keys(EMPTY_FACTS)
  if (Reflect.ownKeys(record).length !== expected.length || expected.some((key) => !Object.hasOwn(record, key))) throw new TypeError('Certification evidence draft is invalid.')
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(record))) {
    if (!descriptor.enumerable || !('value' in descriptor)) throw new TypeError('Certification evidence draft is invalid.')
  }
  const booleans = ['saveReadback', 'reloadReadback', 'lifecycle', 'extremeImported', 'extremeAdvance', 'corruption', 'forwardSchema', 'developerPurchase', 'developerFreeEnable', 'preAckRecovery', 'postCheckpointRecovery', 'updateIdentityRecovery']
  if (booleans.some((key) => typeof record[key] !== 'boolean') ||
    ![null, 'pre-ack', 'post-checkpoint'].includes(record.pendingRecovery as never) ||
    !nullableSafeNumber(record.initialRevision) || !nullableSafeNumber(record.longOfflineSeconds) ||
    !nullableString(record.developerShardDebit) || !nullableString(record.developerMatterDebit) || !nullableString(record.developerLifetimeDelta) ||
    !validPolicyFact(record.fast) || !validPolicyFact(record.balanced) || !validPolicyFact(record.exact) ||
    !validUpdateBaseline(record.updateBaseline)) throw new TypeError('Certification evidence draft is invalid.')
  return Object.freeze({ ...record }) as unknown as ScenarioFacts
}

function nullableSafeNumber(value: unknown): boolean { return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) }
function nullableString(value: unknown): boolean { return value === null || typeof value === 'string' }
function validPolicyFact(value: unknown): boolean {
  if (value === null) return true
  if (typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const record = value as Record<string, unknown>
  return Reflect.ownKeys(record).length === 4 && /^(?:0|[1-9][0-9]*)$/u.test(String(record.rawTicks)) &&
    ['checkpoints', 'maximumChunk', 'maximumAtomic'].every((key) => typeof record[key] === 'number' && Number.isFinite(record[key]) && (record[key] as number) >= 0)
}
function validUpdateBaseline(value: unknown): boolean {
  if (value === null) return true
  if (typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const record = value as Record<string, unknown>
  return Reflect.ownKeys(record).length === 4 && typeof record.buildId === 'string' && record.buildId.length > 0 &&
    typeof record.revision === 'number' && Number.isSafeInteger(record.revision) &&
    typeof record.storedTimeAvailableSeconds === 'number' && Number.isFinite(record.storedTimeAvailableSeconds) &&
    typeof record.portableHash === 'string' && /^[a-f0-9]{64}$/u.test(record.portableHash)
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function captureCertificationDeviceContext(
  value: unknown,
  target: NativeHostBridgeApi['target'],
): Readonly<{
  matrixId: 'android-api26-emulator' | 'android-api36-emulator' | 'ios-current-simulator'
  physicalDevice: boolean
  osApiLevel: number | null
  deviceModel: string
  osVersion: string
}> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Authentic certification device context is unavailable.')
  const record = value as Record<string, unknown>
  const keys = ['matrixId', 'physicalDevice', 'osApiLevel', 'deviceModel', 'osVersion', 'applicationVersion', 'buildNumber']
  const descriptors = Object.getOwnPropertyDescriptors(record)
  if (Reflect.ownKeys(descriptors).length !== keys.length || keys.some((key) => {
    const descriptor = descriptors[key]
    return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
  }) || record.physicalDevice !== false ||
    !(record.osApiLevel === null || (typeof record.osApiLevel === 'number' && Number.isSafeInteger(record.osApiLevel))) ||
    ['deviceModel', 'osVersion', 'applicationVersion', 'buildNumber'].some((key) => typeof record[key] !== 'string' || (record[key] as string).length === 0) ||
    typeof record.matrixId !== 'string' ||
    (target === 'android' && !(
      (record.matrixId === 'android-api26-emulator' && record.osApiLevel === 26) ||
      (record.matrixId === 'android-api36-emulator' && record.osApiLevel === 36)
    )) ||
    (target === 'ios' && (record.matrixId !== 'ios-current-simulator' || record.osApiLevel !== null))) throw new Error('Authentic certification device context is unavailable.')
  return Object.freeze(record) as unknown as Readonly<{
    matrixId: 'android-api26-emulator' | 'android-api36-emulator' | 'ios-current-simulator'
    physicalDevice: boolean
    osApiLevel: number | null
    deviceModel: string
    osVersion: string
  }>
}
